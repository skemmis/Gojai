/**
 * The living style guide: every part of the design library (./index.tsx) in
 * each of its states, on the night table and on paper, drawn by the real
 * components so it can never drift from the game. Open the play page with
 * ?styleguide, or publish the build with window.STYLE_GUIDE = true.
 */
import { useState, type ReactNode } from "react";
import { GUIDES, type Card } from "@gojai/core";
import { color, size, space, suit, suitOnNight } from "../../../../packages/art/src/theme";
import {
  ArchCard,
  Back,
  Choice,
  Drops,
  Emblem,
  GameCard,
  Gold,
  GuideCard,
  InkLink,
  Line,
  LiveTag,
  Medallion,
  Moon,
  Note,
  Price,
  Rope,
  RunStatus,
  SCENES,
  ScrollButton,
  Seal,
  Sheet,
  ShieldMark,
  Switch,
  Title,
} from ".";
import "./styleguide.css";

const card = (uid: number, value: number, s: Card["suit"], def = "plain"): Card => ({ uid, def, value, suit: s });
const guide = GUIDES[0];
const rare = GUIDES.find((g) => g.rarity === "rare") ?? GUIDES[1];

/** One part: its name, the one job it does, and its states side by side. */
function Part({ name, job, night = true, paper, children }: { name: string; job: string; night?: boolean; paper?: boolean; children: ReactNode }) {
  return (
    <article className="sg-part">
      <header>
        <h3 className="k-name">{name}</h3>
        <p>{job}</p>
      </header>
      <div className={`sg-stage ${paper ? "paper" : night ? "night" : ""}`}>{children}</div>
    </article>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="sg-state">
      <div>{children}</div>
      <figcaption className="k-label">{label}</figcaption>
    </figure>
  );
}

const SCREENS = ["join", "map", "spot", "fight-start", "reward", "rest", "shop", "event", "deck", "clan", "boards", "profile", "over"];

export function StyleGuide() {
  const [tab, setTab] = useState<"all" | "spades">("all");
  return (
    <main className="sg">
      <section className="sg-hero">
        <img src={SCENES["ojai-valley-trail"]} alt="" />
        <div>
          <Title>The Pathless Land</Title>
          <h1 className="k-name">Design library</h1>
          <p>
            Every screen is built from these parts and nothing else. Each is an inked piece from the art pipeline, used for exactly one job, so a thing
            looks the same wherever it appears. The illustrations carry the mood; the parts stay out of their way.
          </p>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="k-name">Rules</h2>
        <ol className="sg-rules">
          <li>
            <b>One part per job.</b> A title is always the ribbon, the main action is always the scroll, a list is always ledger lines. Renders are inspiration;
            the library wins.
          </li>
          <li>
            <b>No art drawn in code.</b> Every ornament is an inked piece (Gemini, keyed and locked to the sepia ramp) or a game-icons.net glyph.
          </li>
          <li>
            <b>Three spot inks, one meaning each.</b> Blood is damage, gilt is reward, pink is a live event and nothing else.
          </li>
          <li>
            <b>Text sits on the calm part of a piece.</b> Each piece's printable area is measured, and labels are centred by their capitals. The UI check proves it
            to 1.5px.
          </li>
          <li>
            <b>Night table, paper parts.</b> Screens are a place (a night plate) with paper laid on it. The map is the one paper screen.
          </li>
          <li>
            <b>Readable at arm's length.</b> Nothing under 12px; the numbers that decide a turn are big and heavy.
          </li>
        </ol>
      </section>

      <section className="sg-section">
        <h2 className="k-name">Inks</h2>
        <div className="sg-inks">
          {(
            [
              ["paper", "Paper: every sheet, card and the map"],
              ["ink", "Ink: the same sepia as the illustrations"],
              ["inkSoft", "Soft ink: secondary text on paper"],
              ["night", "Night: the table every screen sits on"],
              ["onNight", "Type set straight on the night"],
              ["blood", "Blood: damage and danger only"],
              ["gilt", "Gilt: reward, gold, rares"],
              ["giltText", "Gilt as text on paper"],
              ["pink", "Pink Moment: live events only"],
            ] as const
          ).map(([k, what]) => (
            <div key={k} className="sg-ink">
              <span className="chip" style={{ background: color[k] }} />
              <b>{k}</b>
              <code>{color[k]}</code>
              <span>{what}</span>
            </div>
          ))}
        </div>
        <h3 className="k-label sg-sub">Suits, always with their glyph</h3>
        <div className="sg-inks">
          {(["spades", "hearts", "diamonds", "clubs"] as const).map((k) => (
            <div key={k} className="sg-ink">
              <span className="chip split" style={{ background: `linear-gradient(90deg, ${suit[k]} 50%, ${suitOnNight[k]} 50%)` }} />
              <b>{k}</b>
              <code>
                {suit[k]} / {suitOnNight[k]}
              </code>
              <span>{{ spades: "Strike", hearts: "Guard", diamonds: "Draw", clubs: "Recall" }[k]}: paper / night</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-section">
        <h2 className="k-name">Type and space</h2>
        <div className="sg-type">
          <div>
            <p className="sg-display">IM Fell English SC</p>
            <p>Names and titles only: places, enemies, cards, Guides, screen titles. Never under 16px.</p>
          </div>
          <div>
            <p className="sg-ui">Libre Franklin 1234567890</p>
            <p>Every other word and every number. Labels are 12px bold capitals with wide tracking.</p>
          </div>
        </div>
        <div className="sg-scale">
          {Object.entries(size).map(([k, v]) => (
            <div key={k}>
              <span style={{ fontSize: v, fontFamily: k === "name" || k === "title" ? "var(--display)" : undefined, fontWeight: k === "num" || k === "key" ? 800 : undefined }}>
                {k === "num" || k === "key" ? "40" : k}
              </span>
              <small>
                {k} · {v}px
              </small>
            </div>
          ))}
        </div>
        <div className="sg-space">
          {Object.entries(space).map(([k, v]) => (
            <div key={k}>
              <i style={{ width: v, height: v }} />
              <small>
                {k} · {v}px
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-section">
        <h2 className="k-name">Parts</h2>
        <div className="sg-parts">
          <Part name="Title" job="The screen's name, once, at the top, in title case. Keep it to a few words; the detail goes under it.">
            <Title>Victory</Title>
            <Title>Harvest Moon</Title>
          </Part>
          <Part name="Scroll button" job="The one main action on a screen: Enter, Continue, Begin, End turn.">
            <State label="rest">
              <ScrollButton>Enter</ScrollButton>
            </State>
            <State label="ready">
              <ScrollButton ready>Continue</ScrollButton>
            </State>
            <State label="small">
              <ScrollButton small>Leave</ScrollButton>
            </State>
            <State label="disabled">
              <ScrollButton disabled>Begin</ScrollButton>
            </State>
          </Part>
          <Part name="Ink link and Back" job="Quieter actions printed on the page; the pointing hand goes back.">
            <State label="link">
              <InkLink>Walk on</InkLink>
            </State>
            <State label="disabled">
              <InkLink disabled>Change portrait</InkLink>
            </State>
            <State label="back">
              <Back onClick={() => {}} />
            </State>
          </Part>
          <Part name="Seal" job="The map's navigation, pressed in wax.">
            <Seal>Deck</Seal>
            <Seal>Clan</Seal>
            <Seal>Boards</Seal>
            <Seal>You</Seal>
          </Part>
          <Part name="Choice" job="A choice that needs a line of explanation: rest, events, removing a card.">
            <div className="sg-col">
              <Choice title="Heal" detail="+12 HP" />
              <Choice title="Upgrade" detail="A card gains +2" selected />
              <Choice title="Heal" detail="Already at full HP" off />
            </div>
          </Part>
          <Part name="Sheet and ledger" job="A torn sheet for any panel; lists are always ledger lines with dotted leaders.">
            <div className="sg-col">
              <Sheet nail>
                <Line k="Spots walked" v={31} />
                <Line k="Deepest descent" v={7} />
                <Line
                  k={
                    <>
                      <Emblem faction="order" /> Libbey Park
                    </>
                  }
                  v="+1.2"
                />
              </Sheet>
              <RunStatus hp={34} max={40} gold={120} floor="Floor 4" />
            </div>
          </Part>
          <Part name="Switch" job="Tabs and filters: ink words, the chosen one underlined. One style everywhere.">
            <div className="sg-col">
              <Switch
                options={[
                  { id: "all", label: "Walkers" },
                  { id: "spades", label: "Deepest" },
                ]}
                value={tab}
                onChange={setTab}
              />
              <Switch
                options={[
                  { id: "all", label: "Everyone" },
                  { id: "spades", label: "Your faction" },
                ]}
                value={tab}
                onChange={setTab}
              />
            </div>
          </Part>
          <Part name="Note and live tag" job="A paper note for status; pink only while an event is live.">
            <Note>Test mode · open anywhere</Note>
            <LiveTag>
              <b>Pink Moment</b> until 6:52 PM
            </LiveTag>
          </Part>
          <Part name="Gold, price and status" job="Gilt is reward, so gold is gilt. A tag prices wares; struck through when you can't afford it.">
            <Gold n={50} />
            <Gold n={18} big />
            <State label="price">
              <Price n={38} />
            </State>
            <State label="short">
              <Price n={152} short />
            </State>
            <State label="sold">
              <Price n={0} sold />
            </State>
            <RunStatus hp={28} max={40} gold={120} />
          </Part>
          <Part name="Blood, moons and block" job="From the fight: HP as ten drops, actions as gibbous moons, block as the shield.">
            <div className="sg-col">
              <Drops hp={30} max={40} loss={6} who="you" />
              <div className="sg-row">
                <Moon lit />
                <Moon lit />
                <Moon lit={false} />
                <ShieldMark n={7} />
              </div>
            </div>
          </Part>
          <Part name="Factions" job="Told apart by shape: the Order's star, the Pathless acorn. Influence is a tug of war.">
            <div className="sg-col">
              <div className="sg-row">
                <Emblem faction="order" big />
                <Emblem faction="pathless" big />
              </div>
              <Rope order={13} pathless={44} />
            </div>
          </Part>
          <Part name="People" job="Medallions in lists and on the map; the tarot arch for a portrait that matters.">
            <Medallion seed={13} size="s" />
            <Medallion seed={14} />
            <Medallion seed={15} size="l" on />
            <ArchCard seed={16} name="The Birdwatcher" />
          </Part>
          <Part name="Cards and Guides" job="The card art is the card; the value rides on a wax seal. Guides are narrow paper cards.">
            <GameCard card={card(1, 1, "spades")} />
            <GameCard card={card(2, 7, "hearts")} />
            <GameCard card={card(3, 4, "diamonds")} off />
            <GuideCard name={guide.name} title={guide.title} text={guide.text} />
            <GuideCard name={rare.name} title={rare.title} text={rare.text} rare />
          </Part>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="k-name">Screens</h2>
        <p className="sg-lede">Every screen at phone size, as the UI check renders it.</p>
        <div className="sg-screens">
          {SCREENS.map((s) => (
            <figure key={s}>
              <img src={`shots/${s}.png`} alt={s} loading="lazy" />
              <figcaption className="k-label">{s.replace("-", " ")}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
