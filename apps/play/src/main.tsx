import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { color, font, suit, suitOnNight } from "../../../packages/art/src/theme";
import "./styles.css";

// Design tokens come from the shared theme (packages/art/src/theme.ts); CSS reads them as variables.
const root = document.documentElement.style;
for (const [k, v] of Object.entries(color)) root.setProperty(`--${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`, v);
for (const [k, v] of Object.entries(suit)) root.setProperty(`--suit-${k}`, v);
for (const [k, v] of Object.entries(suitOnNight)) root.setProperty(`--suit-${k}-night`, v);
root.setProperty("--display", font.display);
root.setProperty("--ui", font.ui);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
