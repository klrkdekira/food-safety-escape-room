function renderPuzzlePanel(id) {
  const p = Game.puzzleData[id];
  let html = `<div class="puzzle-panel" id="p${id}" data-puzzle="${id}">
    <div class="puzzle-label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:-3px;margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      PUZZLE ${id} - ${p.title}
    </div>
    <div class="puzzle-question">${p.question}</div>`;

  if (p.type === 'mcq') {
    html += `<div class="mcq-options" id="puzzle-${id}-options">` +
      [...p.options].sort(() => Math.random() - 0.5).map((opt, i) => `<div class="mcq-option" onclick="selectMCQ(${id},'${opt.key}',this)" tabindex="0" role="button"><span class="marker">${String.fromCharCode(65 + i)}</span><span>${opt.text}</span></div>`).join('') +
      `</div>`;
  } else if (p.type === 'multiselect') {
    html += `<div class="multi-select-options" id="puzzle-${id}-options">` +
      [...p.options].sort(() => Math.random() - 0.5).map(opt => `<div class="multi-option" onclick="toggleMultiSelect(${id},'${opt.key}',this)" tabindex="0" role="button"><span class="checkbox"></span><span>${opt.text}</span></div>`).join('') +
      `</div>`;
  } else if (p.type === 'order') {
    html += `<div class="order-note">Use the arrows or drag the items to reorder.</div>
      <div class="order-list" id="puzzle-${id}-list">` +
      [...p.items].sort(() => Math.random() - 0.5).map(item => `<div class="order-item" draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="drop(event)" data-id="${item.id}">
        <span class="drag-handle">&#9789;</span><span class="order-text">${item.text}</span><span class="order-number">?</span>
        <span class="order-item-controls">
          <button type="button" class="order-step-btn" onclick="moveOrderItem(this.closest('.order-item'),-1)" aria-label="Move ${item.text} up">^</button>
          <button type="button" class="order-step-btn" onclick="moveOrderItem(this.closest('.order-item'),1)" aria-label="Move ${item.text} down">v</button>
        </span>
      </div>`).join('') +
      `</div>`;
  } else if (p.type === 'match') {
    html += `<div class="match-wrapper">
      <div class="match-col" id="puzzle-${id}-left">
        <div class="match-col-header">ITEM</div>` +
      p.leftItems.map(item => `<div class="match-item" data-id="${item.id}" onclick="selectMatchLeft(${id},'${item.id}',this)">
          <span class="match-text">${item.text}</span>
          <span class="match-assigned"></span>
        </div>`).join('') +
      `</div>
      <div class="match-col" id="puzzle-${id}-right">
        <div class="match-col-header">MATCHES WITH</div>` +
      p.rightItems.map(item => `<div class="match-item" data-id="${item.id}" onclick="selectMatchRight(${id},'${item.id}',this)">
          <span class="match-text">${item.text}</span>
        </div>`).join('') +
      `</div>
    </div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Click an item on the left, then click its match on the right.</div>`;
  }

  return html + `<div class="puzzle-input-area">
      <button class="btn-primary" style="margin-top:10px" onclick="checkPuzzle(${id})">SUBMIT</button>
      <div class="puzzle-result" id="result-${id}" style="display:none"></div>
    </div>
  </div>`;
}

function renderRoom(roomNum) {
  const rData = Game.roomData[roomNum];
  if (!rData) return;
  const pIds = getRoomPuzzleIds(roomNum);

  const roomHtml = `<div id="room${roomNum}" class="screen">
    <div class="room-header">
      <div class="room-number">${rData.number}</div>
      <div class="room-title">${rData.title}</div>
      <div class="room-subtitle">${rData.subtitle}</div>
    </div>
    ${rData.svg}
    <div class="narrative-box">${rData.narrative}</div>
    <div id="room${roomNum}-puzzles">
      ${pIds.map(renderPuzzlePanel).join('')}
      <button class="request-hint-btn" onclick="requestHint(${pIds[0]})" id="hint-btn-${roomNum}" style="display:none">HINT (-10 pts)</button>
      <div id="hint-${roomNum}" aria-live="polite" style="display:none"></div>
      <div class="code-entry" id="code-entry-${roomNum}" style="display:none">
        <div class="code-hint" style="margin-bottom: 15px; color: var(--green); text-align: center; font-size: 14px; opacity: 0.9;">${rData.codeHint ?? ''}</div>
        <div class="code-display" id="code-display-${roomNum}"></div>
        <div class="code-buttons" id="code-buttons-${roomNum}"></div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;width:100%;max-width:420px">
          <button class="btn-secondary" style="flex:1;min-width:0" onclick="backspaceCode(${roomNum})">BACK</button>
          <button class="btn-secondary" style="flex:1;min-width:0" onclick="clearCode(${roomNum})">CLEAR</button>
          <button class="btn-primary" style="flex:1;min-width:0" onclick="submitCode(${roomNum})">ENTER</button>
        </div>
      </div>
    </div>
  </div>`;

  document.getElementById('rooms-container')?.insertAdjacentHTML('beforeend', roomHtml);
}

function renderFinalCode() {
  const container = document.getElementById('final-code-content');
  if (!container) return;
  container.innerHTML = `
    <div class="code-slots" id="code-slots"></div>
    <div class="code-display" id="final-code-display" style="margin-top:30px"></div>
    <div class="code-buttons" id="final-code-buttons" style="margin-top:30px"></div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;width:100%;max-width:420px">
      <button class="btn-secondary" style="flex:1;min-width:0" onclick="finalBackspace()">BACK</button>
      <button class="btn-secondary" style="flex:1;min-width:0" onclick="finalClear()">CLEAR</button>
      <button class="btn-primary" style="flex:1;min-width:0" onclick="finalSubmit()">ENTER</button>
    </div>
  `;
}

let Game = null;
let ROOM_PUZZLE_MAP = {};
let TOTAL_PUZZLES = 0;
let selectedMCQ = {}, selectedMulti = {}, selectedMatch = {}, codeInput = {};

function initPuzzleState() { Game.state.puzzleSolved = {}; Game.state.puzzleAttempts = {}; Object.keys(Game.puzzleData).forEach(id => { Game.state.puzzleSolved[id] = false; Game.state.puzzleAttempts[id] = 0; }); }
function getRoomPuzzleIds(roomNum) { return ROOM_PUZZLE_MAP[roomNum] ?? []; }
function getPuzzleRoom(puzzleId) { return Number(Object.keys(ROOM_PUZZLE_MAP).find(rn => ROOM_PUZZLE_MAP[rn].includes(puzzleId)) ?? 0); }
function getRoomActivePuzzle(roomNum) { const rp = getRoomPuzzleIds(roomNum); const s = Game.state.activePuzzles?.[roomNum]; if (s && rp.includes(s) && !Game.state.puzzleSolved[s]) return s; return rp.find(id => !Game.state.puzzleSolved[id]) ?? rp[0]; }
function showRoomPuzzle(roomNum, puzzleId) { const rp = getRoomPuzzleIds(roomNum); Game.state.activePuzzles ??= {}; Game.state.activePuzzles[roomNum] = puzzleId; rp.forEach((id, idx) => { const p = document.getElementById('p'+id); if (p) { const a = id === puzzleId; p.classList.toggle('active-page', a); p.style.display = a ? 'block' : 'none'; if (a) { const lbl = p.querySelector('.puzzle-label'); if (lbl?.lastChild) lbl.lastChild.textContent = ` PUZZLE ${idx+1} OF ${rp.length} - ${lbl.lastChild.textContent.trim().split(' - ').slice(1).join(' - ')}`; } } }); const hb = document.getElementById('hint-btn-'+roomNum); if (hb) { hb.style.display = 'inline-block'; hb.disabled = Game.state.hintsUsed >= 3; hb.onclick = () => requestHint(puzzleId); } const he = document.getElementById('hint-'+roomNum); if (he) { he.style.display = 'none'; he.innerHTML = ''; } updateOrderNumbers(); if (typeof gsap !== 'undefined') { const panel = document.getElementById('p'+puzzleId); if (panel) gsap.fromTo(panel, {opacity:0, y:12}, {opacity:1, y:0, duration:0.35, ease:'power2.out'}); } window.scrollTo(0,0); }
function showRoomCompletion(roomNum) { getRoomPuzzleIds(roomNum).forEach(id => { const p = document.getElementById('p'+id); if (p) { p.classList.remove('active-page'); p.style.display = 'none'; } }); const hb = document.getElementById('hint-btn-'+roomNum); if (hb) hb.style.display = 'none'; const he = document.getElementById('hint-'+roomNum); if (he) { he.style.display = 'none'; he.innerHTML = ''; } const ce = document.getElementById('code-entry-'+roomNum); if (ce) { ce.style.display = 'flex'; setupCodeEntry(roomNum); } }
function startGame() { const saved = localStorage.getItem('escapeRoomState'); let usedSave = false; if (saved) { try { Object.assign(Game.state, JSON.parse(saved)); usedSave = true; } catch(e) {} } if (!usedSave) initPuzzleState(); else { const validIds = new Set(Object.keys(Game.puzzleData)); Object.keys(Game.state.puzzleSolved ?? {}).forEach(k => { if (!validIds.has(k)) delete Game.state.puzzleSolved[k]; }); Object.keys(Game.puzzleData).forEach(id => { Game.state.puzzleSolved[id] ??= false; Game.state.puzzleAttempts[id] ??= 0; }); } document.getElementById('title-screen').classList.remove('active'); document.getElementById('title-screen').style.display = 'none'; document.getElementById('game-container').style.display = 'block'; document.getElementById('hud').classList.add('visible'); const sb = document.getElementById('btn-sound'); if (sb) sb.textContent = Game.state.soundEnabled ? 'SOUND ON' : 'SOUND OFF'; startTimer(); window.scrollTo(0,0); goToRoom(Game.state.currentRoom || 1); updateHUD(); initParticles(); }
function startTimer() { if (Game.state.timerInterval) clearInterval(Game.state.timerInterval); Game.state.timeElapsed = 0; Game.state.timerInterval = setInterval(() => { Game.state.timeElapsed++; updateTimerDisplay(); }, 1000); }
function updateTimerDisplay() { const m = Math.floor(Game.state.timeElapsed / 60).toString().padStart(2, '0'); const s = (Game.state.timeElapsed % 60).toString().padStart(2, '0'); document.getElementById('hud-time').textContent = `${m}:${s}`; }
function goToRoom(roomNum) { window.scrollTo(0,0); Game.state.currentRoom = roomNum; const totalRooms = Object.keys(Game.roomCodes).length; const roomIds = []; for(let i=1; i<=totalRooms; i++) roomIds.push(`room${i}`); roomIds.push('final-code-panel', 'victory-screen'); roomIds.forEach(id => { const el = document.getElementById(id); if (el) { el.classList.remove('active'); el.style.display = 'none'; } }); const targetId = roomNum <= totalRooms ? `room${roomNum}` : (roomNum === totalRooms + 1 ? 'final-code-panel' : 'victory-screen'); const targetEl = document.getElementById(targetId); if (targetEl) { targetEl.style.display = 'block'; targetEl.classList.add('active'); if (typeof gsap !== 'undefined') gsap.fromTo(targetEl, {opacity:0, y:20}, {opacity:1, y:0, duration:0.5, ease:'power2.out'}); } if (roomNum <= totalRooms) { if (Game.state.roomCompleted[roomNum]) showRoomCompletion(roomNum); else showRoomPuzzle(roomNum, getRoomActivePuzzle(roomNum)); } updateHUD(); updateMinimap(); }
function showVictory() { window.scrollTo(0,0); if (Game.state.timerInterval) clearInterval(Game.state.timerInterval); document.getElementById('game-container').style.display = 'none'; document.getElementById('hud').classList.remove('visible'); const v = document.getElementById('victory-screen'); v.style.display = 'flex'; v.classList.add('active'); const score = Game.state.score; const rank = score >= 1200 ? 'S' : score >= 900 ? 'A' : score >= 650 ? 'B' : score >= 400 ? 'C' : 'D'; const rc = rank.toLowerCase(); const rEl = document.getElementById('victory-rank'); rEl.textContent = rank; rEl.className = `victory-rank ${rc}`; const timeStr = `${Math.floor(Game.state.timeElapsed / 60).toString().padStart(2, '0')}:${(Game.state.timeElapsed % 60).toString().padStart(2, '0')}`; if (typeof gsap !== 'undefined') { gsap.fromTo(v, {opacity:0, scale:0.9}, {opacity:1, scale:1, duration:0.8, ease:'power2.out'}); gsap.fromTo(rEl, {opacity:0, y:20}, {opacity:1, y:0, delay:0.3, duration:0.5, ease:'power2.out'}); } document.getElementById('victory-score').textContent = score; document.getElementById('victory-time').textContent = timeStr; document.getElementById('victory-puzzles').textContent = `${Game.state.puzzlesCompleted}/${TOTAL_PUZZLES}`; const prev = JSON.parse(localStorage.getItem('escapeRoomBest') || '{}'); if (!prev.score || score > prev.score || !prev.time) localStorage.setItem('escapeRoomBest', JSON.stringify({score, time: timeStr})); }
function selectMCQ(pid, val, el) { document.getElementById(`puzzle-${pid}-options`).querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); selectedMCQ[pid] = val; }
function dragStart(e) { e.dataTransfer.setData('text/plain', e.target.closest('.order-item').dataset.id); }
function dragOver(e) { e.preventDefault(); }
function moveOrderItem(item, direction) { const list = item?.parentNode; if (!list) return; const items = Array.from(list.children); const index = items.indexOf(item); const targetIndex = index + direction; if (targetIndex < 0 || targetIndex >= items.length) return; const target = items[targetIndex]; if (direction < 0) list.insertBefore(item, target); else list.insertBefore(target, item); updateOrderNumbers(); }
function drop(e) { e.preventDefault(); const tgt = e.target.closest('.order-item'); const did = e.dataTransfer.getData('text/plain'); const drag = document.querySelector(`.order-item[data-id="${did}"]`); if (!tgt || !drag || tgt === drag) return; const par = tgt.parentNode; const sib = Array.from(par.children); const ti = sib.indexOf(tgt); const di = sib.indexOf(drag); if (di < ti) par.insertBefore(drag, tgt); else par.insertBefore(drag, tgt.nextSibling); updateOrderNumbers(); }
function toggleMultiSelect(pid, val, el) { el.classList.toggle('selected'); selectedMulti[pid] ??= new Set(); if (selectedMulti[pid].has(val)) selectedMulti[pid].delete(val); else selectedMulti[pid].add(val); }
function selectMatchLeft(pid, leftId, el) { selectedMatch[pid] ??= { activeLeft: null, pairs: {} }; const col = document.getElementById(`puzzle-${pid}-left`); col.querySelectorAll('.match-item').forEach(i => i.classList.remove('match-active')); if (selectedMatch[pid].activeLeft === leftId) { selectedMatch[pid].activeLeft = null; } else { el.classList.add('match-active'); selectedMatch[pid].activeLeft = leftId; } }
function selectMatchRight(pid, rightId, el) { selectedMatch[pid] ??= { activeLeft: null, pairs: {} }; const activeLeft = selectedMatch[pid].activeLeft; if (!activeLeft) return; Object.keys(selectedMatch[pid].pairs).forEach(l => { if (selectedMatch[pid].pairs[l] === rightId) delete selectedMatch[pid].pairs[l]; }); selectedMatch[pid].pairs[activeLeft] = rightId; selectedMatch[pid].activeLeft = null; updateMatchDisplay(pid); }
function updateMatchDisplay(pid) { const puzzle = Game.puzzleData[pid]; if (!puzzle || puzzle.type !== 'match') return; const pairs = selectedMatch[pid]?.pairs ?? {}; const usedRight = new Set(Object.values(pairs)); puzzle.leftItems.forEach(item => { const el = document.querySelector(`#puzzle-${pid}-left [data-id="${item.id}"]`); if (!el) return; el.classList.remove('match-active', 'match-paired'); const rightId = pairs[item.id]; const assigned = el.querySelector('.match-assigned'); if (rightId) { el.classList.add('match-paired'); const rightItem = puzzle.rightItems.find(r => r.id === rightId); if (assigned) assigned.textContent = rightItem ? `→ ${rightItem.text}` : ''; } else { if (assigned) assigned.textContent = ''; } }); puzzle.rightItems.forEach(item => { const el = document.querySelector(`#puzzle-${pid}-right [data-id="${item.id}"]`); if (!el) return; el.classList.toggle('match-right-used', usedRight.has(item.id)); }); }
function updateOrderNumbers() { document.querySelectorAll('.order-list').forEach(list => { const items = Array.from(list.querySelectorAll('.order-item')); items.forEach((item, idx) => { const n = item.querySelector('.order-number'); if (n) n.textContent = (idx + 1).toString(); const up = item.querySelector('.order-step-btn[aria-label$="up"]'); if (up) up.disabled = idx === 0; const down = item.querySelector('.order-step-btn[aria-label$="down"]'); if (down) down.disabled = idx === items.length - 1; }); }); }
function checkPuzzle(id) { const puzzle = Game.puzzleData[id]; if (!puzzle || Game.state.puzzleSolved[id]) return; Game.state.puzzleAttempts[id]++; let correct = false; if (puzzle.type === 'mcq') correct = selectedMCQ[id] === puzzle.correct; else if (puzzle.type === 'order') { const order = Array.from(document.querySelectorAll(`#puzzle-${id}-list .order-item`)).map(i => i.dataset.id); correct = JSON.stringify(order) === JSON.stringify(puzzle.correctOrder); } else if (puzzle.type === 'multiselect') { const sel = Array.from(selectedMulti[id] ?? []).sort(); correct = JSON.stringify(sel) === JSON.stringify([...puzzle.correct].sort()); } else if (puzzle.type === 'match') { const pairs = selectedMatch[id]?.pairs ?? {}; const correctKeys = Object.keys(puzzle.correct); correct = correctKeys.length === Object.keys(pairs).length && correctKeys.every(l => pairs[l] === puzzle.correct[l]); } const rEl = document.getElementById(`result-${id}`); const pEl = document.getElementById(`p${id}`); if (correct) { const pts = Game.state.puzzleAttempts[id] === 1 ? puzzle.points : Math.floor(puzzle.points * 0.5); Game.state.score += pts; Game.state.puzzleSolved[id] = true; Game.state.puzzlesCompleted++; pEl.classList.add('correct'); rEl.style.display = 'block'; rEl.className = 'puzzle-result correct'; rEl.innerHTML = `CORRECT! +${pts} points${puzzle.explanation ? `<div style="margin-top:8px;font-size:12px;font-weight:400;color:var(--green);opacity:.85">${puzzle.explanation}</div>` : ''}`; playSound('correct'); const st = pEl.querySelector('.puzzle-status'); if (st) { st.classList.remove('locked'); st.classList.add('solved'); st.innerHTML = '<path d="M4,9 L7,12 L14,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'; } const roomNum = getPuzzleRoom(id); updateOrderNumbers(); const roomPuzzles = getRoomPuzzleIds(roomNum); const nextPuzzleId = roomPuzzles[roomPuzzles.indexOf(id) + 1]; const delay = puzzle.explanation ? 4000 : 800; if (roomPuzzles.every(p => Game.state.puzzleSolved[p])) setTimeout(() => completeRoom(roomNum), delay); else { const next = nextPuzzleId ?? roomPuzzles.find(p => !Game.state.puzzleSolved[p]); if (next != null) setTimeout(() => showRoomPuzzle(roomNum, next), delay); } } else { const penalty = 10; Game.state.score = Math.max(0, Game.state.score - penalty); pEl.classList.add('incorrect'); rEl.style.display = 'block'; rEl.className = 'puzzle-result incorrect'; rEl.innerHTML = `WRONG - Try again (-${penalty} pts)`; playSound('incorrect'); setTimeout(() => pEl.classList.remove('incorrect'), 500); } updateHUD(); }
function completeRoom(roomNum) { Game.state.roomCompleted[roomNum] = true; showRoomCompletion(roomNum); }
function debugNext() { const rn = Game.state.currentRoom; const totalRooms = Object.keys(Game.roomCodes).length; if (rn <= totalRooms) { const ce = document.getElementById('code-entry-'+rn); if (ce && ce.style.display !== 'none' && ce.style.display !== '') { Game.state.roomCompleted[rn] = true; Game.state.codes[rn] = true; if (rn === totalRooms) { goToRoom(totalRooms + 1); setupFinalCode(); } else { goToRoom(rn + 1); } } else { const rp = getRoomPuzzleIds(rn); const currPuz = Game.state.activePuzzles?.[rn] || rp[0]; const idx = rp.indexOf(currPuz); if (idx < rp.length - 1) { showRoomPuzzle(rn, rp[idx + 1]); } else { showRoomCompletion(rn); } } } else if (rn === totalRooms + 1) { showVictory(); } }
function setupCodeEntry(roomNum) { const code = Game.roomCodes[roomNum]; codeInput[roomNum] = ''; updateCodeDisplay(roomNum, code); const btns = document.getElementById(`code-buttons-${roomNum}`); btns.innerHTML = ''; for (let i = 0; i < 26; i++) { const btn = document.createElement('button'); btn.className = 'code-btn'; btn.textContent = String.fromCharCode(65 + i); btn.onclick = () => { if (codeInput[roomNum].length < code.length) { codeInput[roomNum] += String.fromCharCode(65 + i); updateCodeDisplay(roomNum, code); } }; btns.appendChild(btn); } }
function updateCodeDisplay(roomNum, code) { const d = document.getElementById(`code-display-${roomNum}`); const input = codeInput[roomNum] ?? ''; let html = ''; for (let i = 0; i < code.length; i++) { if (i < input.length) html += `<span class="char entered">${input[i]}</span> `; else if (i === input.length) html += `<span class="char current">_</span> `; else html += `<span class="char">_</span> `; } d.innerHTML = html; }
function backspaceCode(rn) { if (codeInput[rn]?.length > 0) { codeInput[rn] = codeInput[rn].slice(0, -1); updateCodeDisplay(rn, Game.roomCodes[rn]); } }
function clearCode(rn) { codeInput[rn] = ''; updateCodeDisplay(rn, Game.roomCodes[rn]); }
function submitCode(rn) { const input = codeInput[rn] ?? ''; const totalRooms = Object.keys(Game.roomCodes).length; const roomIdx = Number(rn); if (input === Game.roomCodes[rn]) { Game.state.codes[rn] = true; const el = document.getElementById(`code-entry-${rn}`); if (el) el.style.display = 'none'; if (roomIdx < totalRooms) setTimeout(() => goToRoom(roomIdx + 1), 500); else setTimeout(() => { goToRoom(totalRooms + 1); setupFinalCode(); }, 500); } else { const d = document.getElementById(`code-display-${rn}`); d.style.color = 'var(--red)'; d.textContent = 'WRONG CODE - Try again'; setTimeout(() => { d.style.color = ''; updateCodeDisplay(rn, Game.roomCodes[rn]); }, 1500); } }
function setupFinalCode() { const finalCode = Game.config.finalCode; const slots = document.getElementById('code-slots'); slots.innerHTML = ''; Object.entries(Game.roomCodes).forEach(([rn, code]) => { const solved = Game.state.codes[rn]; const el = document.createElement('div'); el.className = 'code-slot'; el.innerHTML = `<span class="code-slot-label">Zone ${rn}</span><span class="code-slot-value ${solved ? 'solved' : 'locked'}">${solved ? code : '???'}</span>`; slots.appendChild(el); }); codeInput.final = ''; updateFinalDisplay(); const btns = document.getElementById('final-code-buttons'); if (btns) { btns.innerHTML = ''; for (let i = 0; i < 26; i++) { const ch = String.fromCharCode(65 + i); const btn = document.createElement('button'); btn.className = 'code-btn'; btn.textContent = ch; btn.onclick = () => { if ((codeInput.final ?? '').length < finalCode.length) { codeInput.final = (codeInput.final ?? '') + ch; updateFinalDisplay(); } }; btns.appendChild(btn); } } }
function updateFinalDisplay() { const finalCode = Game.config.finalCode; const d = document.getElementById('final-code-display'); const input = codeInput.final ?? ''; let html = ''; for (let i = 0; i < finalCode.length; i++) { if (i < input.length) html += `<span class="char entered">${input[i]}</span> `; else if (i === input.length) html += `<span class="char current">_</span> `; else html += `<span class="char">_</span> `; } d.innerHTML = html; }
function finalBackspace() { if (codeInput.final?.length > 0) { codeInput.final = codeInput.final.slice(0, -1); updateFinalDisplay(); } }
function finalClear() { codeInput.final = ''; updateFinalDisplay(); }
function finalSubmit() { const input = codeInput.final ?? ''; const correct = Game.config.finalCode; if (input === correct) { document.getElementById('final-code-display').style.color = 'var(--green)'; setTimeout(() => showVictory(), 1500); } else { document.getElementById('final-code-display').style.color = 'var(--red)'; setTimeout(() => { document.getElementById('final-code-display').style.color = ''; updateFinalDisplay(); }, 1500); } }
function requestHint(puzzleId) { if (Game.state.hintsUsed >= 3) return; Game.state.hintsUsed++; Game.state.score = Math.max(0, Game.state.score - 10); const puzzle = Game.puzzleData[puzzleId]; const roomNum = getPuzzleRoom(puzzleId); const hEl = document.getElementById(`hint-${roomNum}`); if (hEl) { hEl.style.display = 'block'; hEl.innerHTML = `<div class="hint-panel"><div class="hint-label">HINT ${Game.state.hintsUsed}/3</div>${puzzle?.hint ?? 'No hint available.'}</div>`; } const btn = document.getElementById(`hint-btn-${roomNum}`); if (btn) btn.disabled = true; updateHUD(); }
function updateHUD() { document.getElementById('hud-score').textContent = Game.state.score; document.getElementById('hud-room').textContent = Game.state.currentRoom; document.getElementById('hud-puzzles').textContent = `${Game.state.puzzlesCompleted}/${TOTAL_PUZZLES}`; const pct = Math.floor((Game.state.puzzlesCompleted / TOTAL_PUZZLES) * 100); document.getElementById('progress-bar').style.width = `${pct}%`; updateTimerDisplay(); }
function updateMinimap() { document.querySelectorAll('.minimap-room').forEach(room => { const r = parseInt(room.dataset.room); room.classList.remove('active-room', 'solved', 'locked'); if (r === Game.state.currentRoom) room.classList.add('active-room'); else if (Game.state.roomCompleted[r]) room.classList.add('solved'); else room.classList.add('locked'); }); }
function minimapClick(rn) { if (rn <= Game.state.currentRoom || Game.state.roomCompleted[rn - 1] || rn === 1) goToRoom(rn); }
function toggleHint(e) { const btn = e?.currentTarget ?? document.getElementById('btn-hint'); if (btn) { btn.classList.add('solving'); setTimeout(() => btn.classList.remove('solving'), 1000); } }
function toggleSound(e) { Game.state.soundEnabled = !Game.state.soundEnabled; const btn = document.getElementById('btn-sound'); if (btn) btn.textContent = Game.state.soundEnabled ? 'SOUND ON' : 'SOUND OFF'; }
function saveGame() { localStorage.setItem('escapeRoomState', JSON.stringify(Game.state)); const btn = document.getElementById('btn-save'); if (btn) { const orig = btn.textContent; btn.textContent = 'SAVED'; setTimeout(() => btn.textContent = orig, 1500); } }
function clearSave() { localStorage.removeItem('escapeRoomState'); localStorage.removeItem('escapeRoomBest'); const btn = document.getElementById('btn-clear-save'); if (btn) { btn.textContent = 'CLEARED'; btn.disabled = true; } setTimeout(() => location.reload(), 800); }
function playSound(type) { if (!Game.state.soundEnabled) return; try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const osc = ac.createOscillator(); const gain = ac.createGain(); osc.connect(gain); gain.connect(ac.destination); if (type === 'correct') { osc.frequency.value = 880; gain.gain.setValueAtTime(0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2); osc.start(); osc.stop(ac.currentTime + 0.2); } else { osc.frequency.value = 220; gain.gain.setValueAtTime(0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3); osc.start(); osc.stop(ac.currentTime + 0.3); } } catch(e) {} }
function initParticles() { const canvas = document.getElementById('particle-canvas'); if (!canvas) return; const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; const particles = Array.from({length: 70}, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 3.5 + 1.5, speedX: (Math.random() - 0.5) * 0.3, speedY: -Math.random() * 0.3 - 0.1, opacity: Math.random() * 0.5 + 0.35 })); function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.x += p.speedX; p.y += p.speedY; if (p.y < 0) p.y = canvas.height; if (p.x < 0 || p.x > canvas.width) p.x = Math.random() * canvas.width; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,122,94,${p.opacity})`; ctx.fill(); }); requestAnimationFrame(animate); } animate(); window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }); }

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const resp = await fetch('data.json');
    Game = await resp.json();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1' || urlParams.get('debug') === 'true') {
      const dbgBtn = document.getElementById('btn-debug');
      if (dbgBtn) dbgBtn.style.display = 'inline-block';
    }
    document.title = Game.config.pageTitle;
    document.getElementById('title-logo').textContent = Game.config.titleLogo;
    document.getElementById('title-sub').textContent = Game.config.titleSub;
    if (Game.config.version && document.getElementById('version-display')) {
      document.getElementById('version-display').textContent = Game.config.version;
    }

    const minimap = document.getElementById('minimap');
    const minimapRoomsHtml = Game.config.minimapRooms.map((text, i) =>
      `<div class="minimap-room" data-room="${i+1}" onclick="minimapClick(${i+1})"><div class="minimap-dot"></div><span class="minimap-room-text">${text}</span></div>`
    ).join('');
    minimap.innerHTML = `<div class="minimap-title" id="minimap-title">${Game.config.minimapTitle}</div>` + minimapRoomsHtml;

    document.getElementById('title-instructions').innerHTML = `<strong>${Game.config.missionBriefingTitle}</strong>${Game.config.missionBriefingText}`;
    document.getElementById('final-escape-title').textContent = Game.config.finalEscapeTerminalTitle;
    document.getElementById('final-escape-text').innerHTML = Game.config.finalEscapeTerminalText;
    document.getElementById('victory-title').textContent = Game.config.victoryTitle;
    document.getElementById('victory-subtitle').textContent = Game.config.victorySubtitle;
    document.getElementById('victory-text').innerHTML = Game.config.victoryText;

    for (const [id, p] of Object.entries(Game.puzzleData)) { (ROOM_PUZZLE_MAP[p.room] ??= []).push(Number(id)); }
    TOTAL_PUZZLES = Object.keys(Game.puzzleData).length;

    for (let i = 1; i <= Object.keys(Game.roomCodes).length; i++) renderRoom(i);
    renderFinalCode();

    const best = JSON.parse(localStorage.getItem('escapeRoomBest') || '{}');
    const hasSave = !!localStorage.getItem('escapeRoomState') || !!best.score;
    if (best.score) { const bd = document.getElementById('best-score-display'); if (bd) { bd.style.display = 'block'; document.getElementById('best-score-val').textContent = best.score; document.getElementById('best-time-val').textContent = best.time || '--:--'; } }
    const clrBtn = document.getElementById('btn-clear-save'); if (clrBtn) clrBtn.style.display = hasSave ? 'inline-block' : 'none';

    document.addEventListener('keydown', e => {
      const active = document.querySelector('.puzzle-panel.active-page');
      if (!active) return;
      if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused?.classList.contains('mcq-option') || focused?.classList.contains('multi-option')) {
          focused.click(); e.preventDefault();
        }
      }
    });

    document.querySelectorAll('.code-entry').forEach(ce => {
      const rn = ce.id.replace('code-entry-', '');
      ce.addEventListener('keydown', e => {
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (rn === 'final') {
            if (codeInput.final) codeInput.final = codeInput.final.slice(0, -1);
            updateFinalDisplay();
          } else {
            if (codeInput[rn]) codeInput[rn] = codeInput[rn].slice(0, -1);
            if (Game.roomCodes[rn]) updateCodeDisplay(rn, Game.roomCodes[rn]);
          }
        }
        if (e.key === 'Enter') { rn === 'final' ? finalSubmit() : submitCode(rn); }
      });
    });

    document.querySelectorAll('.mcq-option,.multi-option').forEach(el => {
      if (!el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); }
    });
  } catch (error) {
    console.error("Error loading data.json:", error);
  }
});
