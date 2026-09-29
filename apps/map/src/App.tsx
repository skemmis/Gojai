import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  BBOX, CENTER, EVENTS, HOTSPOTS, TERRITORY_RES, cellOf, cellsToGeoJSON, distanceM, hotspotById,
  hotspotsInRange, localParts, playAreaCells, upcomingEvents, zoned, type EventWindow, type Hotspot, type LngLat,
} from "@gojai/map";
import { buildStyle } from "./mapStyle.ts";
import { NODE_GLYPH, NODE_LABEL, THEMES, type Theme } from "./theme.ts";

type Selection = { kind: "hotspot"; id: string } | { kind: "hex"; cell: string } | { kind: "events" } | { kind: "key" } | null;

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

export default function App() {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? THEMES[1] : THEMES[0],
  );
  const [res, setRes] = useState(TERRITORY_RES);
  const [showHex, setShowHex] = useState(true);
  const [sel, setSel] = useState<Selection>({ kind: "events" });
  const [pretend, setPretend] = useState<Date | null>(null);
  const [tick, setTick] = useState(() => new Date());
  const [you, setYou] = useState<LngLat | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const youMarker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = pretend ?? tick;

  const cells = useMemo(() => playAreaCells(res), [res]);
  const hexes = useMemo(() => cellsToGeoJSON(showHex ? cells : []), [cells, showHex]);
  const windows = useMemo(() => upcomingEvents(now, 10), [now]);
  const live = windows.filter((w) => w.start <= now && w.end > now);
  const active = useMemo(() => {
    const hotspots = [...new Set(live.flatMap((w) => w.event.hotspots))];
    const cellsLit = [
      ...hotspots.map((id) => cellOf(hotspotById(id)!.at, res)),
      ...live.flatMap((w) => (w.event.venues ?? []).map((v) => cellOf(v.at, res))),
    ];
    return { hotspots, cells: cellsLit };
  }, [live.map((w) => w.event.id).join(), res]);

  // Map setup (once).
  useEffect(() => {
    const m = new maplibregl.Map({
      container: mapEl.current!,
      style: buildStyle(theme, hexes, active),
      center: CENTER,
      zoom: window.innerWidth < 760 ? 13.6 : 14.2,
      minZoom: 12,
      maxZoom: 18.5,
      maxBounds: [
        [BBOX[0] - 0.02, BBOX[1] - 0.02],
        [BBOX[2] + 0.02, BBOX[3] + 0.03],
      ],
      attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors, Overture Maps" },
    });
    // Keep downtown clear of the bottom sheet on phones.
    if (window.innerWidth < 760) m.setPadding({ top: 40, bottom: Math.round(window.innerHeight * 0.4), left: 0, right: 0 });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const zoomClass = () => mapEl.current?.classList.toggle("labels", m.getZoom() >= 15.5);
    m.on("zoom", zoomClass);
    zoomClass();
    m.on("click", (e) => {
      const hit = m.queryRenderedFeatures(e.point, { layers: ["hex-fill"] })[0];
      if (hit) setSel({ kind: "hex", cell: String(hit.properties.cell) });
    });
    map.current = m;
    return () => m.remove();
  }, []);

  // Restyle on theme / grid / live-event changes (MapLibre diffs the style).
  useEffect(() => {
    map.current?.setStyle(buildStyle(theme, hexes, active));
    document.documentElement.style.setProperty("--bg", theme.ui.bg);
    document.documentElement.style.setProperty("--fg", theme.ui.fg);
    document.documentElement.style.setProperty("--muted", theme.ui.muted);
    document.documentElement.style.setProperty("--line", theme.ui.line);
    document.documentElement.style.setProperty("--paper", theme.paper);
    document.documentElement.style.setProperty("--boss", theme.event.boss);
  }, [theme, hexes, active]);

  // Selected hex highlight.
  useEffect(() => {
    const m = map.current;
    if (!m || sel?.kind !== "hex") return;
    const apply = () => m.getSource("hexes") && m.setFeatureState({ source: "hexes", id: sel.cell }, { selected: true });
    apply();
    m.on("styledata", apply);
    return () => {
      m.off("styledata", apply);
      if (m.getSource("hexes")) m.setFeatureState({ source: "hexes", id: sel.cell }, { selected: false });
    };
  }, [sel, hexes]);

  // Hotspot markers (DOM, so labels need no font service).
  useEffect(() => {
    const m = map.current!;
    const markers = HOTSPOTS.map((h) => {
      const el = document.createElement("button");
      el.className = "spot" + (active.hotspots.includes(h.id) ? " live" : "");
      el.style.setProperty("--c", theme.node[h.node]);
      el.innerHTML = `<span class="glyph">${NODE_GLYPH[h.node]}</span><span class="label">${h.name.replace(/ \(.*\)/, "")}</span>`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        setSel({ kind: "hotspot", id: h.id });
      };
      return new maplibregl.Marker({ element: el, anchor: "left", offset: [-13, 0] }).setLngLat(h.at).addTo(m);
    });
    const venues = EVENTS.flatMap((e) => (e.venues ?? []).map((v) => ({ e, v }))).map(({ e, v }) => {
      const el = document.createElement("button");
      el.className = "spot venue" + (live.some((w) => w.event.id === e.id) ? " live" : "");
      el.style.setProperty("--c", theme.event[e.kind]);
      el.innerHTML = `<span class="glyph">♛</span><span class="label">${e.name}</span>`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        setSel({ kind: "events" });
      };
      return new maplibregl.Marker({ element: el, anchor: "left", offset: [-13, 0] }).setLngLat(v.at).addTo(m);
    });
    return () => [...markers, ...venues].forEach((mk) => mk.remove());
  }, [theme, active]);

  // "You are here".
  useEffect(() => {
    const m = map.current!;
    youMarker.current?.remove();
    if (!you) return;
    const el = document.createElement("div");
    el.className = "you";
    el.style.setProperty("--c", theme.you);
    youMarker.current = new maplibregl.Marker({ element: el }).setLngLat(you).addTo(m);
  }, [you, theme]);

  const locate = () => {
    if (!navigator.geolocation) return setGeoError("This browser has no location.");
    navigator.geolocation.watchPosition(
      (p) => {
        const ll: LngLat = [p.coords.longitude, p.coords.latitude];
        setGeoError(null);
        setYou((prev) => {
          if (!prev) map.current?.flyTo({ center: ll, zoom: 16 });
          return ll;
        });
      },
      (e) => setGeoError(e.code === 1 ? "Location permission was denied (or this page can't ask for it)." : e.message),
      { enableHighAccuracy: true },
    );
  };

  const flyTo = (at: LngLat, zoom = 16.5) => map.current?.flyTo({ center: at, zoom });

  const nearest = you
    ? HOTSPOTS.map((h) => ({ h, d: distanceM(you, h.at) })).sort((a, b) => a.d - b.d)[0]
    : null;
  const inRange = you ? hotspotsInRange(you) : [];

  return (
    <div className="app">
      <div ref={mapEl} className="map" />

      <header className="bar">
        <strong>Ojai · The Pathless Land</strong>
        <div className="tools">
          <button onClick={() => setShowHex((s) => !s)} className={showHex ? "on" : ""}>Hexes</button>
          <button onClick={() => setRes((r) => (r === 9 ? 10 : 9))}>{res === 9 ? "Hex: big" : "Hex: small"}</button>
          <button onClick={() => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])}>{theme.name}</button>
          <button onClick={locate}>Locate me</button>
        </div>
      </header>

      <aside className="sheet">
        <nav className="tabs">
          <button className={sel?.kind === "events" ? "on" : ""} onClick={() => setSel({ kind: "events" })}>
            Events{live.length ? <span className="dot" /> : null}
          </button>
          <button className={sel?.kind === "hotspot" ? "on" : ""} onClick={() => setSel({ kind: "hotspot", id: sel?.kind === "hotspot" ? sel.id : HOTSPOTS[0].id })}>
            Spots
          </button>
          <button className={sel?.kind === "key" ? "on" : ""} onClick={() => setSel({ kind: "key" })}>Key</button>
          <button className={sel === null ? "on" : ""} onClick={() => setSel(null)}>Hide</button>
        </nav>

        {you && (
          <p className="you-line">
            {inRange.length
              ? <>In range of <b>{inRange.map((h) => h.name).join(", ")}</b>.</>
              : nearest && <>Nearest spot: <b>{nearest.h.name}</b>, {fmtDist(nearest.d)} away.</>}
          </p>
        )}
        {geoError && <p className="you-line warn">{geoError}</p>}

        {sel?.kind === "events" && (
          <EventsPanel windows={windows} now={now} pretend={pretend} setPretend={setPretend} theme={theme} onPick={(w) => {
            const first = w.event.hotspots[0] ? hotspotById(w.event.hotspots[0])!.at : w.event.venues?.[0]?.at;
            if (first) flyTo(first, 15.5);
          }} />
        )}
        {sel?.kind === "hotspot" && (
          <HotspotPanel h={hotspotById(sel.id)!} windows={windows} now={now} res={res} theme={theme} onPick={(h) => {
            setSel({ kind: "hotspot", id: h.id });
            flyTo(h.at);
          }} />
        )}
        {sel?.kind === "key" && <KeyPanel theme={theme} />}
        {sel?.kind === "hex" && <HexPanel cell={sel.cell} res={res} onPick={(h) => { setSel({ kind: "hotspot", id: h.id }); flyTo(h.at); }} />}
      </aside>
    </div>
  );
}

function EventsPanel(p: {
  windows: EventWindow[];
  now: Date;
  pretend: Date | null;
  setPretend: (d: Date | null) => void;
  theme: Theme;
  onPick: (w: EventWindow) => void;
}) {
  const live = p.windows.filter((w) => w.start <= p.now && w.end > p.now);
  const liveIds = new Set(live.map((w) => w.event.id));
  const next = p.windows.filter((w) => w.start > p.now && !liveIds.has(w.event.id));
  // One row per event: its next window.
  const seen = new Set<string>();
  const nextByEvent = next.filter((w) => !seen.has(w.event.id) && seen.add(w.event.id));
  const tbd = EVENTS.filter((e) => e.rule.kind === "tbd");
  const row = (w: EventWindow, isLive: boolean) => (
    <li key={w.event.id + w.start.toISOString()} onClick={() => p.onPick(w)} className={isLive ? "live" : ""}>
      <span className="chip" style={{ background: p.theme.event[w.event.kind] }}>{w.event.kind}</span>
      <div>
        <b>{w.event.name}</b>
        <small>{isLive ? `On now, until ${clockFmt.format(w.end)}` : when(w)}</small>
      </div>
    </li>
  );
  return (
    <section>
      <label className="pretend">
        Pretend it's
        <input
          type="datetime-local"
          value={toInput(p.now)}
          onChange={(e) => p.setPretend(e.target.value ? fromInput(e.target.value) : null)}
        />
        {p.pretend && <button onClick={() => p.setPretend(null)}>Now</button>}
      </label>
      <p className="muted">Times are Ojai time.</p>
      {live.length > 0 && <ul className="list">{live.map((w) => row(w, true))}</ul>}
      <ul className="list">{nextByEvent.map((w) => row(w, false))}</ul>
      {tbd.length > 0 && <p className="muted">Dates to confirm: {tbd.map((e) => `${e.name} (${e.rule.kind === "tbd" ? e.rule.when : ""})`).join(", ")}.</p>}
    </section>
  );
}

function HotspotPanel(p: { h: Hotspot; windows: EventWindow[]; now: Date; res: number; theme: Theme; onPick: (h: Hotspot) => void }) {
  const { h } = p;
  const here = p.windows.filter((w) => w.event.hotspots.includes(h.id) && w.end > p.now);
  const seen = new Set<string>();
  const nextHere = here.filter((w) => !seen.has(w.event.id) && seen.add(w.event.id));
  return (
    <section>
      <select className="picker" value={h.id} onChange={(e) => p.onPick(hotspotById(e.target.value)!)}>
        {HOTSPOTS.map((x) => (
          <option key={x.id} value={x.id}>{NODE_GLYPH[x.node]} {x.name}</option>
        ))}
      </select>
      <h2>
        <span className="chip" style={{ background: p.theme.node[h.node] }}>{NODE_LABEL[h.node]}</span> {h.name}
      </h2>
      <p>{h.note}</p>
      {h.verify && <p className="warn">To check: {h.verify}</p>}
      <p className="muted">Range {h.radiusM} m · hex {cellOf(h.at, p.res)}</p>
      {nextHere.length > 0 && (
        <>
          <h3>Events here</h3>
          <ul className="list">
            {nextHere.map((w) => (
              <li key={w.event.id} className={w.start <= p.now ? "live" : ""}>
                <span className="chip" style={{ background: p.theme.event[w.event.kind] }}>{w.event.kind}</span>
                <div>
                  <b>{w.event.name}</b>
                  <small>{w.start <= p.now ? `On now, until ${clockFmt.format(w.end)}` : when(w)}</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function HexPanel(p: { cell: string; res: number; onPick: (h: Hotspot) => void }) {
  const inside = HOTSPOTS.filter((h) => cellOf(h.at, p.res) === p.cell);
  return (
    <section>
      <h2>Hex {p.cell}</h2>
      <p className="muted">Territory cell (H3 res {p.res}). Clans will claim these; nobody holds it yet.</p>
      {inside.length ? (
        <ul className="list">
          {inside.map((h) => (
            <li key={h.id} onClick={() => p.onPick(h)}>
              <span className="glyph-sm">{NODE_GLYPH[h.node]}</span>
              <div><b>{h.name}</b><small>{NODE_LABEL[h.node]}</small></div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No hotspot in this hex.</p>
      )}
    </section>
  );
}

function KeyPanel({ theme }: { theme: Theme }) {
  const nodes = Object.keys(NODE_LABEL) as (keyof typeof NODE_LABEL)[];
  return (
    <section>
      <ul className="list key">
        {nodes.map((n) => (
          <li key={n}>
            <span className="glyph-sm dot-lg" style={{ background: theme.node[n] }}>{NODE_GLYPH[n]}</span>
            <div><b>{NODE_LABEL[n]}</b><small>{HOTSPOTS.filter((h) => h.node === n).length} spots</small></div>
          </li>
        ))}
        <li>
          <span className="glyph-sm dot-lg sq" style={{ background: theme.event.market }}>♛</span>
          <div><b>Event venue</b><small>Timed events that aren't at a standing spot</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch" style={{ background: theme.school, borderColor: theme.event.raid }} />
          <div><b>School grounds</b><small>No-go: nothing is ever placed here</small></div>
        </li>
        <li>
          <span className="glyph-sm swatch" style={{ background: theme.park }} />
          <div><b>Parks and preserves</b></div>
        </li>
      </ul>
      <p className="muted">
        Hexes are territory cells clans will claim. Dashed outlines are the City of Ojai and a hand-drawn Meiners Oaks.
        A spot pulses while an event is on there. Zoom in for names.
      </p>
    </section>
  );
}
