import fs from "node:fs";
import path from "node:path";

export interface QuizManifestItem {
  id: string;
  pageTitle: string;
  titleLogo: string;
  titleSub: string;
  version?: string;
  path: string;
}

export function generateQuizManifest(): QuizManifestItem[] {
  const quizzesDir = path.resolve("public/quizzes");
  if (!fs.existsSync(quizzesDir)) {
    return [];
  }

  const files = fs.readdirSync(quizzesDir);
  const manifest: QuizManifestItem[] = [];

  for (const file of files) {
    if (file === "index.json" || !file.endsWith(".json")) continue;

    const id = path.basename(file, ".json");
    const filePath = path.join(quizzesDir, file);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const config = content.config ?? {};
      manifest.push({
        id,
        pageTitle: config.pageTitle ?? id,
        titleLogo: config.titleLogo ?? id,
        titleSub: config.titleSub ?? "",
        version: config.version,
        path: `quizzes/${file}`,
      });
    } catch (err) {
      console.error(`Warning: Failed to parse ${filePath} for manifest:`, err);
    }
  }

  const manifestPath = path.join(quizzesDir, "index.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✅ Generated quiz manifest at ${manifestPath}`);
  return manifest;
}

if (process.argv[1] && process.argv[1].endsWith("gen-manifest.ts")) {
  generateQuizManifest();
}
