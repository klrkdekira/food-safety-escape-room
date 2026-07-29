import type { QuizData } from "../schema/quiz.ts";
import { getPuzzleHandler } from "./puzzles/index.ts";
import type { EngineConfig, EngineState } from "./types.ts";
import { sanitizeArtwork } from "./utils/artwork.ts";
import { fadeIn } from "./utils/animate.ts";
import { esc } from "./utils/esc.ts";

declare global {
  interface Window {
    Game: Omit<QuizData, "state"> & { state: EngineState };
    webkitAudioContext?: typeof AudioContext;

    // Interactive functions
    startGame: () => void;
    checkPuzzle: (id: number) => void;
    dragStart: (e: DragEvent) => void;
    dragOver: (e: DragEvent) => void;
    drop: (e: DragEvent) => void;
    moveOrderItem: (item: HTMLElement | null, direction: number) => void;
    requestHint: (puzzleId: number) => void;
    setupCodeEntry: (roomNum: number) => void;
    submitCode: (rn: number) => void;
    backspaceCode: (rn: number) => void;
    clearCode: (rn: number) => void;
    setupFinalCode: () => void;
    finalSubmit: () => void;
    finalBackspace: () => void;
    finalClear: () => void;
    minimapClick: (rn: number) => void;
    saveGame: () => void;
    clearSave: () => void;
    toggleSound: () => void;
    toggleHint: () => void;
    debugNext: () => void;
    exportResult: () => void;
    switchQuiz: (quizId: string) => void;
  }
}

let GameData: QuizData | null = null;
let state: EngineState;
let quizId = "microb";
const DEFAULT_ABSOLUTE_RANKS = [
  { min: 1800, rank: "S" },
  { min: 1500, rank: "A" },
  { min: 1200, rank: "B" },
  { min: 900, rank: "C" },
  { min: 600, rank: "D" },
];

const DEFAULT_PERCENT_RANKS = [
  { min: 95, rank: "S" },
  { min: 85, rank: "A" },
  { min: 70, rank: "B" },
  { min: 60, rank: "C" },
  { min: 50, rank: "D" },
];

let engineConfig: EngineConfig = {
  wrongPenalty: 0,
  rankMode: "absolute",
  roomLabel: "Room",
  absoluteRanks: DEFAULT_ABSOLUTE_RANKS,
  percentRanks: DEFAULT_PERCENT_RANKS,
};

const DEFAULT_MAX_HINTS = 3;
const HINT_COST = 10;
const RETRY_CREDIT = 0.5;

let ROOM_PUZZLE_MAP: Record<number, number[]> = {};
let TOTAL_PUZZLES = 0;
const codeInput: Record<string, string> = {};

/**
 * Push a message into the single always-present live region in index.html.
 * Result panels are painted with innerHTML and are not focused, so without this
 * a screen reader user gets no feedback that an answer was accepted.
 */
function announce(message: string) {
  const region = document.getElementById("live-region");
  if (!region) return;
  // Re-setting identical text is not re-announced; clear first.
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

function readEngineConfig(data: QuizData): EngineConfig {
  return {
    wrongPenalty: data.config.wrongPenalty ?? 0,
    rankMode: data.config.rankMode ?? "absolute",
    roomLabel: data.config.roomLabel ?? "Room",
    absoluteRanks: data.config.absoluteRanks ?? DEFAULT_ABSOLUTE_RANKS,
    percentRanks: data.config.percentRanks ?? DEFAULT_PERCENT_RANKS,
  };
}

function getStorageKeys() {
  return {
    stateKey: `escape-room:${quizId}:state`,
    bestKey: `escape-room:${quizId}:best`,
  };
}

function initPuzzleState() {
  state.puzzleSolved = {};
  state.puzzleAttempts = {};
  if (GameData) {
    Object.keys(GameData.puzzleData).forEach((id) => {
      state.puzzleSolved[Number(id)] = false;
      state.puzzleAttempts[Number(id)] = 0;
    });
  }
}

function getRoomPuzzleIds(roomNum: number): number[] {
  return ROOM_PUZZLE_MAP[roomNum] ?? [];
}

function getPuzzleRoom(puzzleId: number): number {
  const room = Object.keys(ROOM_PUZZLE_MAP).find((rn) =>
    ROOM_PUZZLE_MAP[Number(rn)].includes(puzzleId),
  );
  return Number(room ?? 0);
}

function getRoomActivePuzzle(roomNum: number): number {
  const rp = getRoomPuzzleIds(roomNum);
  const s = state.activePuzzles?.[roomNum];
  if (s && rp.includes(s) && !state.puzzleSolved[s]) return s;
  return rp.find((id) => !state.puzzleSolved[id]) ?? rp[0];
}

function updateOrderNumbers() {
  document.querySelectorAll(".order-list").forEach((list) => {
    const items = Array.from(list.querySelectorAll<HTMLElement>(".order-item"));
    items.forEach((item, idx) => {
      const n = item.querySelector(".order-number");
      if (n) n.textContent = (idx + 1).toString();
      const up = item.querySelector<HTMLButtonElement>('.order-step-btn[aria-label$="up"]');
      if (up) {
        up.setAttribute("aria-disabled", idx === 0 ? "true" : "false");
        up.style.opacity = idx === 0 ? "0.4" : "1";
      }
      const down = item.querySelector<HTMLButtonElement>('.order-step-btn[aria-label$="down"]');
      if (down) {
        down.setAttribute("aria-disabled", idx === items.length - 1 ? "true" : "false");
        down.style.opacity = idx === items.length - 1 ? "0.4" : "1";
      }
    });
  });
}

function renderPuzzlePanel(id: number): string {
  if (!GameData) return "";
  const p = GameData.puzzleData[id];
  let html = `<div class="puzzle-panel" id="p${id}" data-puzzle="${id}">
    <div class="puzzle-label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:-3px;margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      PUZZLE ${id} - ${esc(p.title)}
    </div>
    <div class="puzzle-question">${esc(p.question)}</div>`;

  const handler = getPuzzleHandler(p.type);
  if (handler) {
    html += handler.render(id, p);
  }

  return (
    html +
    `<div class="puzzle-input-area">
      <button class="btn-primary" style="margin-top:10px" data-action="check" data-puzzle="${id}">SUBMIT</button>
      <div class="puzzle-result" id="result-${id}" style="display:none"></div>
    </div>
  </div>`
  );
}

function renderRoom(roomNum: number) {
  if (!GameData) return;
  const rData = GameData.roomData[roomNum];
  if (!rData) return;
  const pIds = getRoomPuzzleIds(roomNum);

  const roomHtml = `<div id="room${roomNum}" class="screen">
    <div class="room-header">
      <div class="room-number">${esc(rData.number)}</div>
      <div class="room-title">${esc(rData.title)}</div>
      <div class="room-subtitle">${esc(rData.subtitle)}</div>
    </div>
    ${sanitizeArtwork(rData.svg)}
    <div class="narrative-box">${esc(rData.narrative)}</div>
    <div id="room${roomNum}-puzzles">
      ${pIds.map(renderPuzzlePanel).join("")}
      <button class="request-hint-btn" data-action="hint" data-puzzle="${pIds[0]}" id="hint-btn-${roomNum}" style="display:none">HINT (-${HINT_COST} pts)</button>
      <div id="hint-${roomNum}" aria-live="polite" style="display:none"></div>
      <div class="code-entry" id="code-entry-${roomNum}" style="display:none">
        <div class="code-hint" style="margin-bottom: 15px; color: var(--green); text-align: center; font-size: 14px; opacity: 0.9;">${esc(rData.codeHint ?? "")}</div>
        <div class="code-display" id="code-display-${roomNum}"></div>
        <div class="code-buttons" id="code-buttons-${roomNum}"></div>
        <div id="code-actions-${roomNum}" style="display:flex;gap:10px;justify-content:center;margin-top:20px;width:100%;max-width:420px">
          <button class="btn-secondary" style="flex:1;min-width:0" data-action="code-back" data-room="${roomNum}">BACK</button>
          <button class="btn-secondary" style="flex:1;min-width:0" data-action="code-clear" data-room="${roomNum}">CLEAR</button>
          <button class="btn-primary" style="flex:1;min-width:0" data-action="code-enter" data-room="${roomNum}">ENTER</button>
        </div>
      </div>
    </div>
  </div>`;

  document.getElementById("rooms-container")?.insertAdjacentHTML("beforeend", roomHtml);
}

function renderFinalCode() {
  const container = document.getElementById("final-code-content");
  if (!container) return;
  container.innerHTML = `
    <div class="code-slots" id="code-slots"></div>
    <div class="code-display" id="final-code-display" style="margin-top:30px"></div>
    <div class="code-buttons" id="final-code-buttons" style="margin-top:30px"></div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;width:100%;max-width:420px">
      <button class="btn-secondary" style="flex:1;min-width:0" data-action="final-back">BACK</button>
      <button class="btn-secondary" style="flex:1;min-width:0" data-action="final-clear">CLEAR</button>
      <button class="btn-primary" style="flex:1;min-width:0" data-action="final-enter">ENTER</button>
    </div>
  `;
}

function updateTimerDisplay() {
  const m = Math.floor(state.timeElapsed / 60)
    .toString()
    .padStart(2, "0");
  const s = (state.timeElapsed % 60).toString().padStart(2, "0");
  const el = document.getElementById("hud-time");
  if (el) el.textContent = `${m}:${s}`;
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  // Do NOT reset timeElapsed here -- this runs on resume too, and zeroing it
  // discarded the saved elapsed time. New games reset it in startGame().
  state.timeElapsed ??= 0;
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timeElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function updateHUD() {
  const sEl = document.getElementById("hud-score");
  if (sEl) sEl.textContent = state.score.toString();

  const rEl = document.getElementById("hud-room");
  if (rEl) rEl.textContent = state.currentRoom.toString();

  const pEl = document.getElementById("hud-puzzles");
  if (pEl) pEl.textContent = `${state.puzzlesCompleted}/${TOTAL_PUZZLES}`;

  const pct = Math.floor((state.puzzlesCompleted / TOTAL_PUZZLES) * 100);
  const pb = document.getElementById("progress-bar");
  if (pb) pb.style.width = `${pct}%`;

  updateTimerDisplay();
}

function updateMinimap() {
  document.querySelectorAll<HTMLElement>(".minimap-room").forEach((room) => {
    const r = parseInt(room.dataset.room ?? "0", 10);
    room.classList.remove("active-room", "solved", "locked");
    if (r === state.currentRoom) room.classList.add("active-room");
    else if (state.roomCompleted[r]) room.classList.add("solved");
    else room.classList.add("locked");
  });
}

function showRoomPuzzle(roomNum: number, puzzleId: number) {
  const rp = getRoomPuzzleIds(roomNum);
  state.activePuzzles ??= {};
  state.activePuzzles[roomNum] = puzzleId;

  rp.forEach((id, idx) => {
    const p = document.getElementById("p" + id);
    if (p) {
      const a = id === puzzleId;
      p.classList.toggle("active-page", a);
      p.style.display = a ? "block" : "none";
      if (a) {
        const lbl = p.querySelector(".puzzle-label");
        if (lbl?.lastChild) {
          lbl.lastChild.textContent = ` PUZZLE ${idx + 1} OF ${rp.length} - ${(
            lbl.lastChild.textContent ?? ""
          )
            .trim()
            .split(" - ")
            .slice(1)
            .join(" - ")}`;
        }
      }
    }
  });

  const hb = document.getElementById("hint-btn-" + roomNum) as HTMLButtonElement | null;
  if (hb) {
    hb.style.display = "inline-block";
    hb.disabled = state.hintsUsed >= state.maxHints;
    hb.onclick = () => window.requestHint(puzzleId);
  }

  const he = document.getElementById("hint-" + roomNum);
  if (he) {
    he.style.display = "none";
    he.innerHTML = "";
  }

  updateOrderNumbers();

  fadeIn(document.getElementById("p" + puzzleId), { y: 12, durationMs: 350 });

  window.scrollTo(0, 0);
}

function showRoomCompletion(roomNum: number) {
  getRoomPuzzleIds(roomNum).forEach((id) => {
    const p = document.getElementById("p" + id);
    if (p) {
      p.classList.remove("active-page");
      p.style.display = "none";
    }
  });
  const hb = document.getElementById("hint-btn-" + roomNum);
  if (hb) hb.style.display = "none";
  const he = document.getElementById("hint-" + roomNum);
  if (he) {
    he.style.display = "none";
    he.innerHTML = "";
  }
  const ce = document.getElementById("code-entry-" + roomNum);
  if (!ce) return;
  ce.style.display = "flex";

  const keypad = document.getElementById(`code-buttons-${roomNum}`);
  const actions = document.getElementById(`code-actions-${roomNum}`);
  const display = document.getElementById(`code-display-${roomNum}`);

  if (state.codes[roomNum]) {
    // Revisiting a room whose code was already accepted (typically via the
    // minimap). Show the code rather than asking the player to re-enter it.
    if (keypad) keypad.style.display = "none";
    if (actions) actions.style.display = "none";
    if (display) {
      display.textContent = GameData?.roomCodes[roomNum] ?? "";
      display.classList.add("solved");
    }
    return;
  }

  if (keypad) keypad.style.display = "";
  if (actions) actions.style.display = "flex";
  if (display) display.classList.remove("solved");
  window.setupCodeEntry(roomNum);
}

function goToRoom(roomNum: number) {
  if (!GameData) return;
  window.scrollTo(0, 0);
  state.currentRoom = roomNum;
  const totalRooms = Object.keys(GameData.roomCodes).length;
  const roomIds: string[] = [];
  for (let i = 1; i <= totalRooms; i++) roomIds.push(`room${i}`);
  roomIds.push("final-code-panel", "victory-screen");

  roomIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("active");
      el.style.display = "none";
    }
  });

  const targetId =
    roomNum <= totalRooms
      ? `room${roomNum}`
      : roomNum === totalRooms + 1
        ? "final-code-panel"
        : "victory-screen";

  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    targetEl.style.display = "block";
    targetEl.classList.add("active");
    fadeIn(targetEl, { y: 20, durationMs: 500 });
  }

  if (roomNum <= totalRooms) {
    if (state.roomCompleted[roomNum]) showRoomCompletion(roomNum);
    else showRoomPuzzle(roomNum, getRoomActivePuzzle(roomNum));
  }

  updateHUD();
  updateMinimap();
}

function playSound(type: "correct" | "incorrect") {
  if (!state.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ac = new AudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    if (type === "correct") {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2);
      osc.start();
      osc.stop(ac.currentTime + 0.2);
    } else {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
      osc.start();
      osc.stop(ac.currentTime + 0.3);
    }
  } catch {
    // Audio fail safe
  }
}

function showVictory() {
  if (!GameData) return;
  window.scrollTo(0, 0);
  if (state.timerInterval) clearInterval(state.timerInterval);

  const gc = document.getElementById("game-container");
  if (gc) gc.style.display = "none";

  const hud = document.getElementById("hud");
  if (hud) hud.classList.remove("visible");

  const v = document.getElementById("victory-screen");
  if (!v) return;
  v.style.display = "flex";
  v.classList.add("active");

  const score = state.score;
  const maxScore = Object.values(GameData.puzzleData).reduce((sum, p) => sum + p.points, 0);

  const thresholds =
    engineConfig.rankMode === "percent" ? engineConfig.percentRanks : engineConfig.absoluteRanks;
  const value =
    engineConfig.rankMode === "percent" ? (maxScore > 0 ? (score / maxScore) * 100 : 0) : score;
  const rank = thresholds.find((t) => value >= t.min)?.rank ?? "E";

  const rc = rank.toLowerCase();
  const rEl = document.getElementById("victory-rank");
  if (rEl) {
    rEl.textContent = rank;
    rEl.className = `victory-rank ${rc}`;
  }

  const timeStr = `${Math.floor(state.timeElapsed / 60)
    .toString()
    .padStart(2, "0")}:${(state.timeElapsed % 60).toString().padStart(2, "0")}`;

  fadeIn(v, { scale: 0.9, durationMs: 800 });
  fadeIn(rEl, { y: 20, durationMs: 500, delayMs: 300 });

  const vScore = document.getElementById("victory-score");
  if (vScore) vScore.textContent = score.toString();

  const vTime = document.getElementById("victory-time");
  if (vTime) vTime.textContent = timeStr;

  const vPuzzles = document.getElementById("victory-puzzles");
  if (vPuzzles) vPuzzles.textContent = `${state.puzzlesCompleted}/${TOTAL_PUZZLES}`;

  const keys = getStorageKeys();
  const prev = JSON.parse(localStorage.getItem(keys.bestKey) || "{}");
  if (!prev.score || score > prev.score || !prev.time) {
    localStorage.setItem(keys.bestKey, JSON.stringify({ score, time: timeStr }));
  }
}

window.exportResult = function () {
  const result = {
    quizId,
    title: GameData?.config.pageTitle,
    score: state.score,
    timeElapsed: state.timeElapsed,
    puzzlesCompleted: state.puzzlesCompleted,
    totalPuzzles: TOTAL_PUZZLES,
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `result-${quizId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

function initParticles() {
  const canvas = document.getElementById("particle-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3.5 + 1.5,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: -Math.random() * 0.3 - 0.1,
    opacity: Math.random() * 0.5 + 0.35,
  }));

  function animate() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < 0) p.y = canvas.height;
      if (p.x < 0 || p.x > canvas.width) p.x = Math.random() * canvas.width;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,122,94,${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Attach functions to global window for DOM handlers
window.startGame = function () {
  if (!GameData) return;
  const keys = getStorageKeys();
  const saved = localStorage.getItem(keys.stateKey);
  let usedSave = false;
  if (saved) {
    try {
      Object.assign(state, JSON.parse(saved));
      usedSave = true;
    } catch {
      // Invalid save file
    }
  }

  if (!usedSave) {
    state.timeElapsed = 0;
    initPuzzleState();
  } else {
    const validIds = new Set(Object.keys(GameData.puzzleData));
    Object.keys(state.puzzleSolved ?? {}).forEach((k) => {
      if (!validIds.has(k)) delete state.puzzleSolved[Number(k)];
    });
    Object.keys(GameData.puzzleData).forEach((id) => {
      state.puzzleSolved[Number(id)] ??= false;
      state.puzzleAttempts[Number(id)] ??= 0;
    });
  }

  const ts = document.getElementById("title-screen");
  if (ts) {
    ts.classList.remove("active");
    ts.style.display = "none";
  }

  const gc = document.getElementById("game-container");
  if (gc) gc.style.display = "block";

  const hud = document.getElementById("hud");
  if (hud) hud.classList.add("visible");

  const sb = document.getElementById("btn-sound");
  if (sb) sb.textContent = state.soundEnabled ? "SOUND ON" : "SOUND OFF";

  startTimer();
  window.scrollTo(0, 0);
  goToRoom(state.currentRoom || 1);
  updateHUD();
  initParticles();
};

window.checkPuzzle = function (id: number) {
  if (!GameData) return;
  const puzzle = GameData.puzzleData[id];
  if (!puzzle || state.puzzleSolved[id]) return;

  state.puzzleAttempts[id]++;
  let correct = false;
  const handler = getPuzzleHandler(puzzle.type);
  if (handler) {
    correct = handler.check(id, puzzle);
  }

  const rEl = document.getElementById(`result-${id}`);
  const pEl = document.getElementById(`p${id}`);

  if (correct) {
    const pts =
      state.puzzleAttempts[id] === 1 ? puzzle.points : Math.floor(puzzle.points * RETRY_CREDIT);
    state.score += pts;
    state.puzzleSolved[id] = true;
    state.puzzlesCompleted++;

    if (pEl) pEl.classList.add("correct");
    if (rEl) {
      rEl.style.display = "block";
      rEl.className = "puzzle-result correct";
      rEl.innerHTML = `CORRECT! +${pts} points${
        puzzle.explanation
          ? `<div style="margin-top:8px;font-size:12px;font-weight:400;color:var(--green);opacity:.85">${esc(puzzle.explanation)}</div>`
          : ""
      }`;
    }

    announce(`Correct. Plus ${pts} points.${puzzle.explanation ? ` ${puzzle.explanation}` : ""}`);
    playSound("correct");

    const roomNum = getPuzzleRoom(id);
    updateOrderNumbers();

    const roomPuzzles = getRoomPuzzleIds(roomNum);
    const nextPuzzleId = roomPuzzles[roomPuzzles.indexOf(id) + 1];
    const delay = puzzle.explanation ? 4000 : 800;

    if (roomPuzzles.every((p) => state.puzzleSolved[p])) {
      setTimeout(() => completeRoom(roomNum), delay);
    } else {
      const next = nextPuzzleId ?? roomPuzzles.find((p) => !state.puzzleSolved[p]);
      if (next != null) setTimeout(() => showRoomPuzzle(roomNum, next), delay);
    }
  } else {
    const penalty = engineConfig.wrongPenalty;
    state.score = Math.max(0, state.score - penalty);
    if (pEl) pEl.classList.add("incorrect");
    if (rEl) {
      rEl.style.display = "block";
      rEl.className = "puzzle-result incorrect";
      rEl.innerHTML = penalty > 0 ? `WRONG - Try again (-${penalty} pts)` : "WRONG - Try again";
    }
    announce(penalty > 0 ? `Wrong. Try again. Minus ${penalty} points.` : "Wrong. Try again.");
    playSound("incorrect");
    setTimeout(() => pEl?.classList.remove("incorrect"), 500);
  }

  updateHUD();
};

function completeRoom(roomNum: number) {
  state.roomCompleted[roomNum] = true;
  showRoomCompletion(roomNum);
}

window.dragStart = function (e: DragEvent) {
  const target = (e.target as HTMLElement)?.closest(".order-item") as HTMLElement | null;
  if (target?.dataset.id && e.dataTransfer) {
    e.dataTransfer.setData("text/plain", target.dataset.id);
  }
};

window.dragOver = function (e: DragEvent) {
  e.preventDefault();
};

window.moveOrderItem = function (item: HTMLElement | null, direction: number) {
  const list = item?.parentNode as any;
  if (!list || !item) return;
  const items = Array.from(list.children) as HTMLElement[];
  const index = items.indexOf(item);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return;
  const target = items[targetIndex];

  if (direction < 0) {
    (list.moveBefore ?? list.insertBefore).call(list, item, target);
  } else {
    (list.moveBefore ?? list.insertBefore).call(list, target, item);
  }
  updateOrderNumbers();
};

window.drop = function (e: DragEvent) {
  e.preventDefault();
  const tgt = (e.target as HTMLElement)?.closest(".order-item") as HTMLElement | null;
  const did = e.dataTransfer?.getData("text/plain");
  const drag = document.querySelector(`.order-item[data-id="${did}"]`) as HTMLElement | null;
  if (!tgt || !drag || tgt === drag) return;
  const par = tgt.parentNode as HTMLElement | null;
  if (!par) return;
  const sib = Array.from(par.children);
  const ti = sib.indexOf(tgt);
  const di = sib.indexOf(drag);
  if (di < ti) par.insertBefore(drag, tgt);
  else par.insertBefore(drag, tgt.nextSibling);
  updateOrderNumbers();
};

window.requestHint = function (puzzleId: number) {
  if (!GameData) return;
  if (state.hintsUsed >= state.maxHints) return;
  state.hintsUsed++;
  state.score = Math.max(0, state.score - HINT_COST);
  const puzzle = GameData.puzzleData[puzzleId];
  const roomNum = getPuzzleRoom(puzzleId);
  const hEl = document.getElementById(`hint-${roomNum}`);
  if (hEl) {
    hEl.style.display = "block";
    hEl.innerHTML = `<div class="hint-panel"><div class="hint-label">HINT ${state.hintsUsed}/${state.maxHints}</div>${esc(
      puzzle?.hint ?? "No hint available.",
    )}</div>`;
  }
  announce(`Hint ${state.hintsUsed} of ${state.maxHints}. ${puzzle?.hint ?? "No hint available."}`);
  const btn = document.getElementById(`hint-btn-${roomNum}`) as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
  updateHUD();
};

window.setupCodeEntry = function (roomNum: number) {
  if (!GameData) return;
  const code = GameData.roomCodes[roomNum];
  codeInput[roomNum] = "";
  updateCodeDisplay(roomNum, code);
  const btns = document.getElementById(`code-buttons-${roomNum}`);
  if (!btns) return;
  btns.innerHTML = "";
  for (let i = 0; i < 26; i++) {
    const btn = document.createElement("button");
    btn.className = "code-btn";
    btn.textContent = String.fromCharCode(65 + i);
    btn.onclick = () => {
      if ((codeInput[roomNum] ?? "").length < code.length) {
        codeInput[roomNum] = (codeInput[roomNum] ?? "") + String.fromCharCode(65 + i);
        updateCodeDisplay(roomNum, code);
      }
    };
    btns.appendChild(btn);
  }
};

function updateCodeDisplay(roomNum: number, code: string) {
  const d = document.getElementById(`code-display-${roomNum}`);
  if (!d) return;
  const input = codeInput[roomNum] ?? "";
  let html = "";
  for (let i = 0; i < code.length; i++) {
    if (i < input.length) html += `<span class="char entered">${input[i]}</span> `;
    else if (i === input.length) html += `<span class="char current">_</span> `;
    else html += `<span class="char">_</span> `;
  }
  d.innerHTML = html;
}

window.backspaceCode = function (rn: number) {
  if (!GameData) return;
  if (codeInput[rn]?.length > 0) {
    codeInput[rn] = codeInput[rn].slice(0, -1);
    updateCodeDisplay(rn, GameData.roomCodes[rn]);
  }
};

window.clearCode = function (rn: number) {
  if (!GameData) return;
  codeInput[rn] = "";
  updateCodeDisplay(rn, GameData.roomCodes[rn]);
};

window.submitCode = function (rn: number) {
  if (!GameData) return;
  const input = codeInput[rn] ?? "";
  const totalRooms = Object.keys(GameData.roomCodes).length;
  const roomIdx = Number(rn);
  if (input === GameData.roomCodes[rn]) {
    state.codes[rn] = true;
    const el = document.getElementById(`code-entry-${rn}`);
    if (el) el.style.display = "none";
    if (roomIdx < totalRooms) setTimeout(() => goToRoom(roomIdx + 1), 500);
    else {
      setTimeout(() => {
        goToRoom(totalRooms + 1);
        window.setupFinalCode();
      }, 500);
    }
  } else {
    const d = document.getElementById(`code-display-${rn}`);
    if (d) {
      d.style.color = "var(--red)";
      d.textContent = "WRONG CODE - Try again";
      announce("Wrong code. Try again.");
      setTimeout(() => {
        d.style.color = "";
        updateCodeDisplay(rn, GameData?.roomCodes[rn] ?? "");
      }, 1500);
    }
  }
};

window.setupFinalCode = function () {
  if (!GameData) return;
  const finalCode = GameData.config.finalCode ?? "";
  const slots = document.getElementById("code-slots");
  if (slots) {
    slots.innerHTML = "";
    Object.entries(GameData.roomCodes).forEach(([rn, code]) => {
      const solved = state.codes[rn];
      const el = document.createElement("div");
      el.className = "code-slot";
      el.innerHTML = `<span class="code-slot-label">${esc(engineConfig.roomLabel)} ${esc(rn)}</span><span class="code-slot-value ${
        solved ? "solved" : "locked"
      }">${solved ? esc(code) : "???"}</span>`;
      slots.appendChild(el);
    });
  }

  codeInput.final = "";
  updateFinalDisplay();

  const btns = document.getElementById("final-code-buttons");
  if (btns) {
    btns.innerHTML = "";
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(65 + i);
      const btn = document.createElement("button");
      btn.className = "code-btn";
      btn.textContent = ch;
      btn.onclick = () => {
        if ((codeInput.final ?? "").length < finalCode.length) {
          codeInput.final = (codeInput.final ?? "") + ch;
          updateFinalDisplay();
        }
      };
      btns.appendChild(btn);
    }
  }
};

function updateFinalDisplay() {
  if (!GameData) return;
  const finalCode = GameData.config.finalCode ?? "";
  const d = document.getElementById("final-code-display");
  if (!d) return;
  const input = codeInput.final ?? "";
  let html = "";
  for (let i = 0; i < finalCode.length; i++) {
    if (i < input.length) html += `<span class="char entered">${input[i]}</span> `;
    else if (i === input.length) html += `<span class="char current">_</span> `;
    else html += `<span class="char">_</span> `;
  }
  d.innerHTML = html;
}

window.finalBackspace = function () {
  if (codeInput.final?.length > 0) {
    codeInput.final = codeInput.final.slice(0, -1);
    updateFinalDisplay();
  }
};

window.finalClear = function () {
  codeInput.final = "";
  updateFinalDisplay();
};

window.finalSubmit = function () {
  if (!GameData) return;
  const input = codeInput.final ?? "";
  const correct = GameData.config.finalCode ?? "";
  const d = document.getElementById("final-code-display");
  if (input === correct) {
    if (d) d.style.color = "var(--green)";
    setTimeout(() => showVictory(), 1500);
  } else {
    if (d) d.style.color = "var(--red)";
    setTimeout(() => {
      if (d) d.style.color = "";
      updateFinalDisplay();
    }, 1500);
  }
};

window.minimapClick = function (rn: number) {
  if (rn <= state.currentRoom || state.roomCompleted[rn - 1] || rn === 1) {
    goToRoom(rn);
  }
};

window.toggleHint = function () {
  const btn = document.getElementById("btn-hint");
  if (btn) {
    btn.classList.add("solving");
    setTimeout(() => btn.classList.remove("solving"), 1000);
  }
  // Previously this only flashed a CSS class. Route it to the room's active
  // puzzle so the HUD control does what its label says.
  const active = getRoomActivePuzzle(state.currentRoom);
  if (active != null) window.requestHint(active);
};

window.toggleSound = function () {
  state.soundEnabled = !state.soundEnabled;
  const btn = document.getElementById("btn-sound");
  if (btn) btn.textContent = state.soundEnabled ? "SOUND ON" : "SOUND OFF";
};

window.saveGame = function () {
  const keys = getStorageKeys();
  // timerInterval is a live handle -- serialising it writes a meaningless value
  // that would then be passed to clearInterval() on the next resume.
  const { timerInterval: _omit, ...persisted } = state;
  localStorage.setItem(keys.stateKey, JSON.stringify(persisted));
  announce("Progress saved.");
  const btn = document.getElementById("btn-save");
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "SAVED";
    setTimeout(() => (btn.textContent = orig), 1500);
  }
};

window.clearSave = function () {
  const keys = getStorageKeys();
  localStorage.removeItem(keys.stateKey);
  localStorage.removeItem(keys.bestKey);
  const btn = document.getElementById("btn-clear-save") as HTMLButtonElement | null;
  if (btn) {
    btn.textContent = "CLEARED";
    btn.disabled = true;
  }
  setTimeout(() => location.reload(), 800);
};

window.debugNext = function () {
  if (!GameData) return;
  const rn = state.currentRoom;
  const totalRooms = Object.keys(GameData.roomCodes).length;
  if (rn <= totalRooms) {
    const ce = document.getElementById("code-entry-" + rn);
    if (ce && ce.style.display !== "none" && ce.style.display !== "") {
      state.roomCompleted[rn] = true;
      state.codes[rn] = true;
      if (rn === totalRooms) {
        goToRoom(totalRooms + 1);
        window.setupFinalCode();
      } else {
        goToRoom(rn + 1);
      }
    } else {
      const rp = getRoomPuzzleIds(rn);
      const currPuz = state.activePuzzles?.[rn] || rp[0];
      const idx = rp.indexOf(currPuz);
      if (idx < rp.length - 1) {
        showRoomPuzzle(rn, rp[idx + 1]);
      } else {
        showRoomCompletion(rn);
      }
    }
  } else if (rn === totalRooms + 1) {
    showVictory();
  }
};

window.switchQuiz = function (newQuizId: string) {
  if (newQuizId === quizId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("quiz", newQuizId);
  window.location.href = url.toString();
};

async function loadQuizManifest(cleanBaseUrl: string) {
  try {
    const manifestResp = await fetch(`${cleanBaseUrl}quizzes/index.json`);
    if (manifestResp.ok) {
      const manifest = (await manifestResp.json()) as any[];
      const container = document.getElementById("quiz-selector-list");
      if (container && manifest.length > 0) {
        container.innerHTML = manifest
          .map(
            (item) => `
          <button
            type="button"
            data-action="switch-quiz" data-quiz="${esc(item.id)}"
            class="hud-btn"
            style="padding:8px 14px;border:1px solid ${item.id === quizId ? "var(--green)" : "var(--border-color)"};background:${item.id === quizId ? "var(--green-glow)" : "var(--bg-card)"};color:${item.id === quizId ? "var(--green)" : "var(--text-secondary)"};font-weight:700;cursor:pointer;border-radius:4px;"
          >
            ${esc(item.titleLogo || item.pageTitle)}
          </button>`,
          )
          .join("");
      }
    }
  } catch {
    // Ignore manifest fetch error
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    quizId = urlParams.get("quiz") || "microb";

    const inlineData = (window as any).INLINE_QUIZ_DATA;
    if (inlineData) {
      GameData = inlineData as QuizData;
    } else {
      const baseUrl = import.meta.env.BASE_URL ?? "./";
      const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      const fetchPath = `${cleanBaseUrl}quizzes/${quizId}.json`;

      loadQuizManifest(cleanBaseUrl);
      const resp = await fetch(fetchPath);
      if (!resp.ok) {
        throw new Error(`Failed to fetch quiz data from ${fetchPath}: ${resp.statusText}`);
      }

      GameData = (await resp.json()) as QuizData;
    }

    state = (GameData.state ?? {}) as unknown as EngineState;
    state.maxHints ??= DEFAULT_MAX_HINTS;
    window.Game = { ...GameData, state };

    // Read engine config from quiz data
    engineConfig = readEngineConfig(GameData);

    if (urlParams.get("debug") === "1" || urlParams.get("debug") === "true") {
      const dbgBtn = document.getElementById("btn-debug");
      if (dbgBtn) dbgBtn.style.display = "inline-block";
    }

    if (urlParams.get("instructor") === "1") {
      console.group("Instructor Mode - Answer Key");
      Object.entries(GameData.puzzleData).forEach(([id, puzzle]) => {
        const answer =
          "correct" in puzzle
            ? puzzle.correct
            : "correctOrder" in puzzle
              ? puzzle.correctOrder
              : "N/A";
        console.log(`[${id}] (${puzzle.type}) ${puzzle.title} =>`, answer);
      });
      console.groupEnd();
    }

    // Everything that paints GameData onto the DOM lives here so the author
    // studio's live preview can re-run it wholesale on every edit.
    function applyQuizData() {
      if (!GameData) return;
      document.documentElement.setAttribute("data-theme", GameData.config.theme || "cyberpunk");

      document.title = GameData.config.pageTitle;

      const titleLogo = document.getElementById("title-logo");
      if (titleLogo) titleLogo.textContent = GameData.config.titleLogo;

      const titleSub = document.getElementById("title-sub");
      if (titleSub) titleSub.textContent = GameData.config.titleSub;

      if (GameData.config.version && document.getElementById("version-display")) {
        const vd = document.getElementById("version-display");
        if (vd) vd.textContent = GameData.config.version;
      }

      const minimap = document.getElementById("minimap");
      if (minimap) {
        const minimapRoomsHtml = GameData.config.minimapRooms
          .map(
            (text, i) =>
              `<div class="minimap-room" data-action="minimap" data-room="${i + 1}"><div class="minimap-dot"></div><span class="minimap-room-text">${esc(text)}</span></div>`,
          )
          .join("");
        minimap.innerHTML =
          `<div class="minimap-title" id="minimap-title">${esc(GameData.config.minimapTitle)}</div>` +
          minimapRoomsHtml;
      }

      const titleInst = document.getElementById("title-instructions");
      if (titleInst) {
        titleInst.innerHTML = `<strong>${esc(GameData.config.missionBriefingTitle)}</strong>${esc(GameData.config.missionBriefingText)}`;
      }

      const feTitle = document.getElementById("final-escape-title");
      if (feTitle && GameData.config.finalEscapeTerminalTitle) {
        feTitle.textContent = GameData.config.finalEscapeTerminalTitle;
      }

      const feText = document.getElementById("final-escape-text");
      if (feText && GameData.config.finalEscapeTerminalText) {
        feText.textContent = GameData.config.finalEscapeTerminalText;
      }

      const vTitle = document.getElementById("victory-title");
      if (vTitle && GameData.config.victoryTitle) {
        vTitle.textContent = GameData.config.victoryTitle;
      }

      const vSub = document.getElementById("victory-subtitle");
      if (vSub && GameData.config.victorySubtitle) {
        vSub.textContent = GameData.config.victorySubtitle;
      }

      const vText = document.getElementById("victory-text");
      if (vText && GameData.config.victoryText) {
        vText.textContent = GameData.config.victoryText;
      }

      ROOM_PUZZLE_MAP = {};
      for (const [id, p] of Object.entries(GameData.puzzleData)) {
        (ROOM_PUZZLE_MAP[p.room] ??= []).push(Number(id));
      }
      TOTAL_PUZZLES = Object.keys(GameData.puzzleData).length;

      // renderRoom appends, so clear first or a preview refresh duplicates rooms.
      const roomsContainer = document.getElementById("rooms-container");
      if (roomsContainer) roomsContainer.innerHTML = "";
      for (let i = 1; i <= Object.keys(GameData.roomCodes).length; i++) renderRoom(i);
      renderFinalCode();
    }

    applyQuizData();

    window.addEventListener("message", (e) => {
      // Live preview only: accept updates from the author studio that framed us.
      // Without this check any page that opens or embeds the player could push
      // arbitrary quiz data into it.
      if (e.origin !== window.location.origin) return;
      if (e.source !== window.parent || window.parent === window) return;
      if (e.data?.type === "UPDATE_QUIZ_DATA" && e.data.data) {
        GameData = e.data.data as QuizData;
        engineConfig = readEngineConfig(GameData);
        applyQuizData();
      }
    });

    const keys = getStorageKeys();
    const best = JSON.parse(localStorage.getItem(keys.bestKey) || "{}");
    const hasSave = !!localStorage.getItem(keys.stateKey) || !!best.score;

    if (best.score) {
      const bd = document.getElementById("best-score-display");
      if (bd) {
        bd.style.display = "block";
        const bVal = document.getElementById("best-score-val");
        if (bVal) bVal.textContent = best.score;
        const bTime = document.getElementById("best-time-val");
        if (bTime) bTime.textContent = best.time || "--:--";
      }
    }

    const clrBtn = document.getElementById("btn-clear-save");
    if (clrBtn) clrBtn.style.display = hasSave ? "inline-block" : "none";

    // No keyboard shim for mcq/multiselect: the options are real radios and
    // checkboxes now, so the browser handles Space, arrows, and Enter natively.

    document.querySelectorAll(".code-entry").forEach((ce) => {
      const rn = ce.id.replace("code-entry-", "");
      ce.addEventListener("keydown", (e) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === "Backspace") {
          keyEvent.preventDefault();
          if (rn === "final") {
            window.finalBackspace();
          } else {
            window.backspaceCode(Number(rn));
          }
        }
        if (keyEvent.key === "Enter") {
          if (rn === "final") window.finalSubmit();
          else window.submitCode(Number(rn));
        }
      });
    });

    // The native radio/checkbox inside each label carries the semantics and the
    // focus. Do not stamp role="button"/tabindex here -- that overrode the radio
    // group and dropped aria-checked and position-in-set announcements.

    // Single delegated click handler. Behaviour used to be attached with inline
    // onclick attributes, which forced 'unsafe-inline' in the CSP; markup now
    // declares intent via data-action and this dispatches it.
    document.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
      if (!el) return;
      const { action, puzzle, room, quiz, dir } = el.dataset;
      switch (action) {
        case "start":
          window.startGame();
          break;
        case "clear-save":
          window.clearSave();
          break;
        case "check":
          window.checkPuzzle(Number(puzzle));
          break;
        case "hint":
          window.requestHint(Number(puzzle));
          break;
        case "code-back":
          window.backspaceCode(Number(room));
          break;
        case "code-clear":
          window.clearCode(Number(room));
          break;
        case "code-enter":
          window.submitCode(Number(room));
          break;
        case "final-back":
          window.finalBackspace();
          break;
        case "final-clear":
          window.finalClear();
          break;
        case "final-enter":
          window.finalSubmit();
          break;
        case "switch-quiz":
          if (quiz) window.switchQuiz(quiz);
          break;
        case "minimap":
          window.minimapClick(Number(room));
          break;
        case "order-move":
          window.moveOrderItem(el.closest<HTMLElement>(".order-item"), Number(dir));
          break;
        case "hud-hint":
          window.toggleHint();
          break;
        case "hud-sound":
          window.toggleSound();
          break;
        case "hud-save":
          window.saveGame();
          break;
        case "debug-next":
          window.debugNext();
          break;
        case "export-result":
          window.exportResult();
          break;
        case "play-again":
          location.reload();
          break;
      }
    });

    // Drag-and-drop for order puzzles, delegated for the same reason.
    document.addEventListener("dragstart", (e) => {
      if ((e.target as HTMLElement | null)?.closest(".order-item")) window.dragStart(e);
    });
    document.addEventListener("dragover", (e) => {
      if ((e.target as HTMLElement | null)?.closest(".order-item")) window.dragOver(e);
    });
    document.addEventListener("drop", (e) => {
      if ((e.target as HTMLElement | null)?.closest(".order-item")) window.drop(e);
    });
  } catch (error) {
    console.error("Error initializing escape room engine:", error);
  }
});
