import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  BBOX, CENTER, EVENTS, NEIGHBORHOODS, REFRESH_MIN, SPOTS, distanceM, findAt, labelPoint, localParts, neighborhoodById,
  neighborhoodOf, spotById, spotOdds, spotsInRange, upcomingEvents, zoned,
  type EventWindow, type Find, type LngLat, type Neighborhood, type Spot,
} from "@gojai/map";
import { buildStyle, drawImage } from "./mapStyle.ts";
import { FIND_GLYPH, FIND_LABEL, THEME as theme } from "./theme.ts";

type Selection =
  | { kind: "spot"; id: string }
  | { kind: "hood"; id: string }
  | { kind: "events" }
  | { kind: "key" }
  | null;

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const clockFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
const when = (w: EventWindow) => `${timeFmt.format(w.start)} – ${clockFmt.format(w.end)}`;
const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const FINDS = Object.keys(FIND_LABEL) as Find[];

/** "Pretend it's…" input value ↔ Date, in Ojai time whatever the device's zone. */
const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => {
  const p = localParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};
const fromInput = (v: string) => {
  const [date, time] = v.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return zoned(y, mo, d, h, mi);
};

/** Below this zoom the map is "far": event pins shrink and small neighborhoods drop their names. */
const FAR_ZOOM = 14.6;
const MINOR_HOOD_KM2 = 0.5;
/** Spots within this walk of you are highlighted. */
const NEAR_M = 250;

/** Rough area of a neighborhood, for deciding whose name fits when zoomed out. */
function areaKm2(n: Neighborhood) {
  const kx = 111.32 * Math.cos((34.45 * Math.PI) / 180);
  let a = 0;
  for (const poly of n.polygons) {
    const r = poly[0];
    for (let i = 0; i < r.length - 1; i++) a += (r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]) * kx * 111.32;
  }
  return Math.abs(a) / 2;
}

/** A stand-in player, so the page can show what "you" would find at a spot. */
const DEMO_PLAYER = "demo";

export default function App() {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [sel, setSel] = useState<Selection>({ kind: "events" });
  const [pretend, setPretend] = useState<Date | null>(null);
  const [tick, setTick] = useState(() => new Date());
  const [you, setYou] = useState<LngLat | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const youMarker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = pretend ?? tick;

  const windows = useMemo(() => upcomingEvents(now, 10), [now]);
  const live = windows.filter((w) => w.start <= now && w.end > now);
  const liveKey = live.map((w) => w.event.id).join();
  const active = useMemo(() => ({ spots: [...new Set(live.flatMap((w) => w.event.spots))] }), [liveKey]);

  // Map setup (once).
  useEffect(() => {
    const phone = window.innerWidth < 760;
    const m = new maplibregl.Map({
      container: mapEl.current!,
      style: buildStyle(theme, active),
      center: CENTER,
      zoom: phone ? 13.6 : 14.2,
      minZoom: 12,
      maxZoom: 18.5,
      maxBounds: [
        [BBOX[0] - 0.02, BBOX[1] - 0.02],
        [BBOX[2] + 0.02, BBOX[3] + 0.03],
      ],
      attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors, Overture Maps" },
    });
    // Keep downtown clear of the bottom sheet on phones.
    if (phone) m.setPadding({ top: 40, bottom: Math.round(window.innerHeight * 0.4), left: 0, right: 0 });
    m.on("styleimagemissing", (e) => {
      const img = drawImage(theme, e.id);
      if (img && !m.hasImage(e.id)) m.addImage(e.id, img, { pixelRatio: 2 });
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const zoomClass = () => {
      mapEl.current?.classList.toggle("labels", m.getZoom() >= 15.5);
      mapEl.current?.classList.toggle("far", m.getZoom() < FAR_ZOOM);
    };
    m.on("zoom", zoomClass);
    zoomClass();
    m.on("click", (e) => {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 10, e.point.y - 10],
        [e.point.x + 10, e.point.y + 10],
      ];
      const layers = ["near-cards", "spots", "spot-dots"].filter((id) => m.getLayer(id));
      const spot = m.queryRenderedFeatures(box, { layers })[0];
      if (spot) return setSel({ kind: "spot", id: String(spot.properties.id) });
      const hit = m.queryRenderedFeatures(e.point, { layers: ["hood-fill"] })[0];
      if (hit) setSel({ kind: "hood", id: String(hit.properties.id) });
    });
    for (const id of ["near-cards", "spots", "spot-dots"]) {
      m.on("mouseenter", id, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", id, () => (m.getCanvas().style.cursor = ""));
    }
    map.current = m;
    return () => m.remove();
  }, []);

  // Restyle on live-event changes (MapLibre diffs the style).
  const styled = useRef(active);
  useEffect(() => {
    if (styled.current === active) return; // the map was built with this style
    styled.current = active;
    map.current?.setStyle(buildStyle(theme, active));
  }, [active]);

  // Selected neighborhood highlight.
  const selHood = sel?.kind === "hood" ? sel.id : sel?.kind === "spot" ? neighborhoodOf(spotById(sel.id)!.at)?.id : undefined;
  useEffect(() => {
    const m = map.current;
    if (!m || !selHood) return;
    const apply = () => m.getSource("hoods") && m.setFeatureState({ source: "hoods", id: selHood }, { selected: true });
    apply();
    m.on("styledata", apply);
    return () => {
      m.off("styledata", apply);
      if (m.getSource("hoods")) m.setFeatureState({ source: "hoods", id: selHood }, { selected: false });
    };
  }, [selHood]);

  // Selected plain-spot highlight.
  const selSpot = sel?.kind === "spot" ? sel.id : undefined;
  useEffect(() => {
    const m = map.current;
    if (!m || !selSpot || spotById(selSpot)?.kind !== "spot") return;
    const apply = () => m.getSource("spots") && m.setFeatureState({ source: "spots", id: selSpot }, { selected: true });
    apply();
    m.on("styledata", apply);
    return () => {
      m.off("styledata", apply);
      if (m.getSource("spots")) m.setFeatureState({ source: "spots", id: selSpot }, { selected: false });
    };
  }, [selSpot]);

  // Event-spot markers and neighborhood names (DOM, so labels need no font service).
  useEffect(() => {
    const m = map.current!;
    const spots = SPOTS.filter((s) => s.kind === "event").map((s) => {
      const el = document.createElement("button");
      el.className = `spot ${s.kind}` + (active.spots.includes(s.id) ? " live" : "");
      el.setAttribute("aria-label", s.name);
      el.innerHTML = `<span class="glyph">♛</span><span class="label">${s.name.replace(/ \(.*\)/, "")}</span>`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        setSel({ kind: "spot", id: s.id });
      };
      return new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat(s.at).addTo(m);
    });
    const names = NEIGHBORHOODS.filter((n) => n.id !== "trail").map((n) => {
      const el = document.createElement("div");
      el.className = "hood-name" + (areaKm2(n) < MINOR_HOOD_KM2 ? " minor" : "");
      el.textContent = n.name;
      return new maplibregl.Marker({ element: el }).setLngLat(labelPoint(n)).addTo(m);
    });
    return () => [...spots, ...names].forEach((mk) => mk.remove());
  }, [active]);

  // "You are here".
  useEffect(() => {
    const m = map.current!;
    youMarker.current?.remove();
    if (!you) return;
    const el = document.createElement("div");
    el.className = "you";
    youMarker.current = new maplibregl.Marker({ element: el }).setLngLat(you).addTo(m);
  }, [you]);

  // Spots within walking reach of you show as blue cards at every zoom.
  const near = useMemo(
    () => (you ? SPOTS.filter((s) => s.kind === "spot" && distanceM(you, s.at) <= NEAR_M) : []),
    [you],
  );
  useEffect(() => {
    const m = map.current!;
    const data = {
      type: "FeatureCollection" as const,
      features: near.map((s) => ({ type: "Feature" as const, properties: { id: s.id }, geometry: { type: "Point" as const, coordinates: s.at } })),
    };
    const apply = () => (m.getSource("near") as maplibregl.GeoJSONSource | undefined)?.setData(data);
    apply();
    m.on("styledata", apply);
    return () => void m.off("styledata", apply);
  }, [near]);

  // Outside Ojai (or without location), pretend the player stands at the Arcade.
  const pretendHere = (why: string) => {
    const at = spotById("arcade")!.at;
    setDemo(why);
    setYou((prev) => {
      if (!prev) map.current?.flyTo({ center: at, zoom: 15.5 });
      return at;
    });
  };
  const locate = () => {
    if (!navigator.geolocation) return pretendHere("This browser has no location");
    navigator.geolocation.watchPosition(
      (p) => {
        const ll: LngLat = [p.coords.longitude, p.coords.latitude];
        setGeoError(null);
        if (!neighborhoodOf(ll)) return pretendHere("You're not in Ojai");
        setDemo(null);
        setYou((prev) => {
          if (!prev) map.current?.flyTo({ center: ll, zoom: 16 });
          return ll;
        });
      },
      (e) => pretendHere(e.code === 1 ? "Location permission was denied" : "Location isn't available"),
      { enableHighAccuracy: true },
    );
  };

  const flyTo = (at: LngLat, zoom = 16.5) => map.current?.flyTo({ center: at, zoom });
  const pickSpot = (s: Spot) => {
    setSel({ kind: "spot", id: s.id });
    flyTo(s.at);
  };

  const nearest = you ? SPOTS.map((s) => ({ s, d: distanceM(you, s.at) })).sort((a, b) => a.d - b.d)[0] : null;
  const inRange = you ? spotsInRange(you) : [];
  const youHood = you ? neighborhoodOf(you) : undefined;

  return (
    <div className="app">
      <div ref={mapEl} className="map" />

      <header className="bar">
        <h1>The Pathless Land</h1>
        <div className="tools">
          <button onClick={locate}>Locate me</button>
        </div>
      </header>
      {live.length > 0 && (
        <button
          className="live-band"
          onClick={() => {
            const first = spotById(live[0].event.spots[0]);
            setSel({ kind: "events" });
            if (first) flyTo(first.at, 15.5);
          }}
        >
          <span>
            <small>Happening now</small>
            <b>{live.map((w) => w.event.name).join(" · ")}</b>
          </span>
          <span className="t">until {clockFmt.format(live[0].end)}</span>
        </button>
      )}

      <aside className="sheet">
        <nav className="tabs">
          <button className={sel?.kind === "events" ? "on" : ""} onClick={() => setSel({ kind: "events" })}>
            Events{live.length ? <span className="dot" /> : null}
          </button>
          <button
            className={sel?.kind === "spot" ? "on" : ""}
            onClick={() => setSel({ kind: "spot", id: sel?.kind === "spot" ? sel.id : SPOTS[0].id })}
          >
            Spots
          </button>
          <button
            className={sel?.kind === "hood" ? "on" : ""}
            onClick={() => setSel({ kind: "hood", id: sel?.kind === "hood" ? sel.id : "arcade" })}
          >
            Areas
          </button>
          <button className={sel?.kind === "key" ? "on" : ""} onClick={() => setSel({ kind: "key" })}>Key</button>
          <button className={sel === null ? "on" : ""} onClick={() => setSel(null)}>Hide</button>
        </nav>

        {you && (
          <p className="you-line">
            {youHood ? <>You're in <b>{youHood.name}</b>. </> : <>You're outside the play area. </>}
            {inRange.length
              ? <>In range of <b>{inRange.map((s) => s.name).join(", ")}</b>.</>
              : nearest && <>Nearest spot: <b>{nearest.s.name}</b>, {fmtDist(nearest.d)} away.</>}
          </p>
        )}
        {geoError && <p className="you-line warn">{geoError}</p>}
        {demo && <p className="you-line muted">{demo}, so the map pretends you're at the Arcade.</p>}

        {sel?.kind === "events" && (
          <EventsPanel
            windows={windows}
            now={now}
            pretend={pretend}
            setPretend={setPretend}
            onPick={(w) => {
              const first = w.event.spots[0] && spotById(w.event.spots[0]);
              if (first) flyTo(first.at, 15.5);
            }}
          />
        )}
        {sel?.kind === "spot" && <SpotPanel s={spotById(sel.id)!} windows={windows} now={now} onPick={pickSpot} />}
        {sel?.kind === "hood" && (
          <HoodPanel
            n={neighborhoodById(sel.id)!}
            windows={windows}
            now={now}
            onPick={pickSpot}
            onPickHood={(n) => {
              setSel({ kind: "hood", id: n.id });
              flyTo(labelPoint(n), 15);
            }}
          />
        )}
        {sel?.kind === "key" && <KeyPanel />}
      </aside>
    </div>
  );
}

function WindowRow({ w, now, onClick }: { w: EventWindow; now: Date; onClick?: () => void }) {
  const isLive = w.start <= now && w.end > now;
  return (
    <li onClick={onClick} className={isLive ? "live" : ""}>
      <span className={"chip" + (isLive ? " live" : "")}>{w.event.kind}</span>
      <div>
        <b>{w.event.name}</b>
        <small>{isLive ? `On now, until ${clockFmt.format(w.end)}` : when(w)}</small>
      </div>
    </li>
  );
}

/** One row per event: its live window if on, else its next one. */
function nextPerEvent(windows: EventWindow[], now: Date) {
  const seen = new Set<string>();
  return windows.filter((w) => w.end > now && !seen.has(w.event.id) && seen.add(w.event.id));
}

function EventsPanel(p: {
  windows: EventWindow[];
  now: Date;
  pretend: Date | null;
  setPretend: (d: Date | null) => void;
  onPick: (w: EventWindow) => void;
}) {
  const rows = nextPerEvent(p.windows, p.now);
  const tbd = EVENTS.filter((e) => e.rule.kind === "tbd");
  return (
    <section>
      <label className="pretend" htmlFor="pretend">
        Pretend it's
        <input
          id="pretend"
          type="datetime-local"
          value={toInput(p.now)}
          onChange={(e) => p.setPretend(e.target.value ? fromInput(e.target.value) : null)}
        />
        {p.pretend && <button onClick={() => p.setPretend(null)}>Now</button>}
      </label>
      <p className="muted">Times are Ojai time. Events happen at event spots (♛).</p>
      <ul className="list">
        {rows.map((w) => (
          <WindowRow key={w.event.id} w={w} now={p.now} onClick={() => p.onPick(w)} />
        ))}
      </ul>
      {tbd.length > 0 && (
        <p className="muted">
          Dates to confirm: {tbd.map((e) => `${e.name} (${e.rule.kind === "tbd" ? e.rule.when : ""})`).join(", ")}.
        </p>
      )}
    </section>
  );
}

function SpotPanel(p: { s: Spot; windows: EventWindow[]; now: Date; onPick: (s: Spot) => void }) {
  const { s } = p;
  const odds = spotOdds(s);
  const found = findAt(s, DEMO_PLAYER, p.now);
  const hood = neighborhoodOf(s.at);
  const here = nextPerEvent(p.windows.filter((w) => w.event.spots.includes(s.id)), p.now);
  return (
    <section>
      <label htmlFor="spot-picker" className="visually-hidden">Spot</label>
      <select id="spot-picker" className="picker" value={s.id} onChange={(e) => p.onPick(spotById(e.target.value)!)}>
        {NEIGHBORHOODS.map((n) => (
          <optgroup key={n.id} label={n.name}>
            {SPOTS.filter((x) => neighborhoodOf(x.at)?.id === n.id).map((x) => (
              <option key={x.id} value={x.id}>
                {x.kind === "event" ? "♛ " : "• "}
                {x.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <h2>
        <small className="kicker">{s.kind === "event" ? "Event spot" : "Spot"}</small>
        {s.name}
      </h2>
      <p>{s.note}</p>
      {s.verify && <p className="warn">To check: {s.verify}</p>}
      <p className="find">
        Right now you'd find: <b style={{ color: theme.find[found] }}>{FIND_GLYPH[found]} {FIND_LABEL[found]}</b>
        <small className="muted"> (rerolls every {REFRESH_MIN} min, differs per player)</small>
      </p>
      <div className="odds" aria-label="What turns up here">
        {FINDS.map((f) => (
          <div key={f} className="odds-row">
            <span>{FIND_GLYPH[f]} {FIND_LABEL[f]}</span>
            <span className="meter"><i style={{ width: `${odds[f] * 100}%`, background: theme.find[f] }} /></span>
            <span className="num">{Math.round(odds[f] * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="muted">{hood ? hood.name : "Outside the play area"} · range {s.radiusM} m</p>
      {here.length > 0 && (
        <>
          <h3>Events here</h3>
          <ul className="list">
            {here.map((w) => <WindowRow key={w.event.id} w={w} now={p.now} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function HoodPanel(p: {
  n: Neighborhood;
  windows: EventWindow[];
  now: Date;
  onPick: (s: Spot) => void;
  onPickHood: (n: Neighborhood) => void;
}) {
  const spots = SPOTS.filter((s) => neighborhoodOf(s.at)?.id === p.n.id);
  const ids = new Set(spots.map((s) => s.id));
  const here = nextPerEvent(p.windows.filter((w) => w.event.spots.some((id) => ids.has(id))), p.now);
  return (
    <section>
      <label htmlFor="hood-picker" className="visually-hidden">Neighborhood</label>
      <select id="hood-picker" className="picker" value={p.n.id} onChange={(e) => p.onPickHood(neighborhoodById(e.target.value)!)}>
        {NEIGHBORHOODS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>
      <h2>{p.n.name}</h2>
      <p>{p.n.note}</p>
      <p className="muted">Territory. Factions will hold neighborhoods; nobody holds this one yet.</p>
      <ul className="list">
        {spots.map((s) => (
          <li key={s.id} onClick={() => p.onPick(s)}>
            <span className="glyph-sm">{s.kind === "event" ? "♛" : "•"}</span>
            <div><b>{s.name}</b><small>{s.kind === "event" ? "Event spot" : "Spot"}</small></div>
          </li>
        ))}
      </ul>
      {here.length > 0 && (
        <>
          <h3>Events here</h3>
          <ul className="list">
            {here.map((w) => <WindowRow key={w.event.id} w={w} now={p.now} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function KeyPanel() {
  const nSpots = SPOTS.filter((s) => s.kind === "spot").length;
  return (
    <section>
      <ul className="list key">
        <li>
          <span className="glyph-sm"><span className="pin" /></span>
          <div><b>Spot</b><small>{nSpots} of them: a dot when zoomed out, a card up close. Walk up to see what's there: usually a fight, sometimes rest, an elite, a shop or a mystery.</small></div>
        </li>
        <li>
          <span className="glyph-sm"><span className="pin near" /></span>
          <div><b>Near you</b><small>Spots within a short walk turn blue.</small></div>
        </li>
        <li>
          <span className="glyph-sm"><span className="pin big">♛</span></span>
          <div><b>Event spot</b><small>Like a gym. Timed events and bosses happen here.</small></div>
        </li>
        <li>
          <span className="glyph-sm"><span className="pin big live">♛</span></span>
          <div><b>Live now</b><small>Pink means an event is on right now, and nothing else on the map is pink.</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch dashed" />
          <div><b>Neighborhood</b><small>Territory, bordered by real streets. Tap one to see its spots.</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch deep" />
          <div><b>The Ojai Valley Trail</b><small>Its own territory: the main walking artery, with a spot every 200 m.</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch hatch" />
          <div><b>School grounds</b><small>No-go: nothing is ever placed here.</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch stipple" />
          <div><b>Parks and preserves</b></div>
        </li>
      </ul>
      <p className="muted">Zoom in for spot names.</p>
    </section>
  );
}
