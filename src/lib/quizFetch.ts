import type { QuizData, QuizManifestItem } from "../player/types.ts";

/**
 * Quiz JSON and the manifest are static files under `public/quizzes/`, fetched
 * relative to the deployed base rather than the current URL -- a route like
 * `/play/microb` would otherwise resolve them against `/play/`.
 */
function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}${path}`;
}

export async function fetchQuiz(quizId: string): Promise<QuizData> {
  const url = assetUrl(`quizzes/${quizId}.json`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load quiz "${quizId}" (${resp.status})`);
  return (await resp.json()) as QuizData;
}

export async function fetchQuizIndex(): Promise<QuizManifestItem[]> {
  try {
    const resp = await fetch(assetUrl("quizzes/index.json"));
    if (!resp.ok) return [];
    return (await resp.json()) as QuizManifestItem[];
  } catch {
    // The picker degrades to whatever quiz is already loaded.
    return [];
  }
}
