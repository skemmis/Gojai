import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { color, font } from "../../../packages/art/src/theme";
import "./styles.css";

// Design tokens come from the shared theme (packages/art/src/theme.ts); CSS reads them as variables.
const root = document.documentElement.style;
for (const [k, v] of Object.entries(color)) root.setProperty(`--${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`, v);
root.setProperty("--display", font.display);
root.setProperty("--ui", font.ui);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
