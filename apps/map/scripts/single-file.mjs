// Inline the built JS and CSS into one HTML file (dist/pathless-land-map.html)
// so the map can be shared as a single page with no server.
import fs from "node:fs";
import path from "node:path";

const dist = path.join(import.meta.dirname, "../dist");
let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/, (_, f) =>
  `<style>${fs.readFileSync(path.join(dist, f), "utf8")}</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/, (_, f) =>
  `<script type="module">${fs.readFileSync(path.join(dist, f), "utf8").replaceAll("</script", "<\\/script")}</script>`);
const out = path.join(dist, "pathless-land-map.html");
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
