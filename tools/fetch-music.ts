/**
 * Vendors the default background music track into public/audio/ so the game
 * needs no network at all, same rationale as tools/fetch-fonts.ts.
 *
 * Track: "Apprehension" by Kevin MacLeod (incompetech.com), 2005.
 * License: Creative Commons Attribution 3.0 (creativecommons.org/licenses/by/3.0).
 * Mirrored from the Internet Archive's "Incompetech royalty-free music" item
 * (archive.org/details/Incompetech), whose declared licenseurl is CC BY 3.0 --
 * more reliably fetchable over plain HTTP than incompetech.com's own site.
 *
 * Run manually (needs network) only if public/audio/ needs to be regenerated:
 *   pnpm fetch-music
 *
 * The generated file is committed; the normal build never calls this.
 */
import fs from "node:fs";
import path from "node:path";

const TRACK_URL =
  "https://ia801901.us.archive.org/29/items/Incompetech/mp3-royaltyfree/Apprehension.mp3";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const outDir = path.resolve("public/audio");
const outFile = path.join(outDir, "apprehension.mp3");

async function main() {
  const resp = await fetch(TRACK_URL, { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`Failed to fetch ${TRACK_URL}: ${resp.status}`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(await resp.arrayBuffer()));

  console.log(`✅ Vendored background music track into ${outFile}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
