import { useState } from "react";
import { neighborhoodById, visit, type SpotOpened, type Visits } from "@gojai/map";
import { MapScreen } from "./MapScreen.tsx";
import { FIND_GLYPH, FIND_LABEL } from "./theme.ts";

/**
 * The standalone map page: MapScreen plus a stand-in for the game. Opening a
 * spot here only reports what it rolled; in the game it starts the fight,
 * rest or shop.
 */
export default function App() {
  const [visits, setVisits] = useState<Visits>({});
  const [anywhere, setAnywhere] = useState(false);
  const [opened, setOpened] = useState<SpotOpened | null>(null);
  return (
    <div className="app">
      <MapScreen
        visits={visits}
        anywhere={anywhere}
        onOpen={(o) => {
          setVisits((v) => visit(v, o.spot, o.at));
          setOpened(o);
        }}
        tools={
          <button className={"test" + (anywhere ? " on" : "")} onClick={() => setAnywhere((a) => !a)} aria-pressed={anywhere} title="Test mode: open any spot from anywhere">
            Test
          </button>
        }
      />
      {opened && (
        <div className="opened" role="dialog" aria-label="Spot opened">
          <small>{opened.spot.name}</small>
          <b>
            {FIND_GLYPH[opened.find]} {FIND_LABEL[opened.find]}
          </b>
          <p>
            In the game this starts the {FIND_LABEL[opened.find].toLowerCase()}
            {opened.neighborhoodId ? `, set in ${neighborhoodById(opened.neighborhoodId)?.name}` : ""}
            {opened.liveEvents.length ? ` during ${opened.liveEvents.join(", ")}` : ""}. The spot now rests until its next roll.
          </p>
          <button onClick={() => setOpened(null)}>Back to the map</button>
        </div>
      )}
    </div>
  );
}
