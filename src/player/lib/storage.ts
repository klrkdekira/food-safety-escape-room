import { PERSISTED_KEYS } from "../types.ts";
import type { BestScore, GameState, PersistedState } from "../types.ts";

/**
 * Keys are namespaced per quiz. A single shared key collided across quizzes, so
 * finishing one wiped progress in another -- do not collapse these.
 */
export function storageKeys(quizId: string) {
  return {
    stateKey: `escape-room:${quizId}:state`,
    bestKey: `escape-room:${quizId}:best`,
  };
}

export function loadSavedState(quizId: string): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(storageKeys(quizId).stateKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    // A corrupt save should start a fresh game, not break the title screen.
    return null;
  }
}

/**
 * Writes only the fields the previous vanilla engine wrote, so a save round-trips
 * between builds. In particular the old `timerInterval` handle is gone: it was a
 * live interval id that serialised to a meaningless number and was then handed
 * to clearInterval() on resume.
 */
export function saveState(quizId: string, state: GameState): void {
  const persisted = {} as Record<string, unknown>;
  for (const key of PERSISTED_KEYS) persisted[key] = state[key];
  try {
    localStorage.setItem(storageKeys(quizId).stateKey, JSON.stringify(persisted));
  } catch {
    // Private browsing or a full quota; progress just is not saved.
  }
}

export function hasSavedState(quizId: string): boolean {
  try {
    return localStorage.getItem(storageKeys(quizId).stateKey) !== null;
  } catch {
    return false;
  }
}

export function loadBestScore(quizId: string): BestScore {
  try {
    const raw = localStorage.getItem(storageKeys(quizId).bestKey);
    if (!raw) return {};
    return JSON.parse(raw) as BestScore;
  } catch {
    return {};
  }
}

export function recordBestScore(quizId: string, score: number, time: string): void {
  try {
    const prev = loadBestScore(quizId);
    if (!prev.score || score > prev.score || !prev.time) {
      localStorage.setItem(storageKeys(quizId).bestKey, JSON.stringify({ score, time }));
    }
  } catch {
    // Non-fatal.
  }
}

export function clearSavedState(quizId: string): void {
  try {
    const keys = storageKeys(quizId);
    localStorage.removeItem(keys.stateKey);
    localStorage.removeItem(keys.bestKey);
  } catch {
    // Non-fatal.
  }
}

/**
 * A student's name is who they are, not a fact about any one quiz -- shared
 * across every quiz on this browser rather than namespaced like state/best.
 */
const STUDENT_NAME_KEY = "escape-room:studentName";

export function loadStudentName(): string {
  try {
    return localStorage.getItem(STUDENT_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveStudentName(name: string): void {
  try {
    localStorage.setItem(STUDENT_NAME_KEY, name);
  } catch {
    // Non-fatal.
  }
}
