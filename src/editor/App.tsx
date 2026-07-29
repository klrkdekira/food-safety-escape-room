import React, { useEffect, useState, useTransition } from "react";
import { useHistoryReducer } from "./useHistory.ts";
import { get, set } from "idb-keyval";
import { QuizSchema } from "../schema/quiz.ts";
import { editorReducer, DEFAULT_TEMPLATE } from "./store.ts";
import { ValidationPanel } from "./components/ValidationPanel.tsx";
import { ConfigEditor } from "./components/ConfigEditor.tsx";
import { RoomEditor } from "./components/RoomEditor.tsx";
import { PuzzleEditor } from "./components/PuzzleEditor.tsx";
import { PreviewFrame } from "./components/PreviewFrame.tsx";

import { exportOfflineGame } from "./utils/exportOffline.ts";

export const App: React.FC = () => {
  const [data, dispatch, history] = useHistoryReducer(editorReducer, DEFAULT_TEMPLATE);
  const [activeTab, setActiveTab] = useState<"config" | "rooms" | "puzzles">("config");
  const [saveStatus, setSaveStatus] = useState<string>("Draft Saved");
  const [, startTransition] = useTransition();

  // Load draft from IndexedDB on initial mount
  useEffect(() => {
    get("escape-room:draft:current").then((saved) => {
      if (saved) {
        try {
          dispatch({ type: "LOAD_DATA", data: JSON.parse(saved) });
        } catch {
          // Fallback to template
        }
      }
    });
  }, [dispatch]);

  // Debounced autosave to IndexedDB
  useEffect(() => {
    const timer = setTimeout(() => {
      set("escape-room:draft:current", JSON.stringify(data));
      setSaveStatus("Draft Saved");
    }, 800);

    return () => clearTimeout(timer);
  }, [data]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, the shortcuts authors will reach for first.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history]);

  const handleExport = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.config.pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "quiz"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.target?.result as string);
      } catch {
        alert("Invalid JSON file format.");
        return;
      }
      // Imported files arrive by email and are not trusted. Validate before
      // loading so a malformed quiz fails here instead of at render time.
      const result = QuizSchema.safeParse(parsed);
      if (!result.success) {
        const summary = result.error.issues
          .slice(0, 5)
          .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
        const more =
          result.error.issues.length > 5 ? `\n...and ${result.error.issues.length - 5} more.` : "";
        alert(`This file is not a valid quiz:\n\n${summary}${more}`);
        return;
      }
      dispatch({ type: "LOAD_DATA", data: result.data });
    };
    reader.readAsText(file);
    // Allow re-importing the same filename after a failed attempt.
    e.target.value = "";
  };

  const handleNewTemplate = () => {
    if (confirm("Create a new quiz from template? Any unsaved changes will be overwritten.")) {
      dispatch({ type: "LOAD_DATA", data: DEFAULT_TEMPLATE });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      {/* Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          backgroundColor: "#141c2b",
          borderBottom: "1px solid #233148",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "18px", color: "#00ff88", fontFamily: "Orbitron, sans-serif" }}>
            ESCAPE ROOM AUTHOR
          </h1>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{saveStatus}</span>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            title="Undo (Ctrl/Cmd+Z)"
            style={{
              padding: "8px 14px",
              backgroundColor: "#1a2538",
              border: "1px solid #233148",
              color: history.canUndo ? "#e2e8f0" : "#4b5563",
              borderRadius: "4px",
              cursor: history.canUndo ? "pointer" : "not-allowed",
              fontSize: "13px",
            }}
          >
            Undo
          </button>

          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            style={{
              padding: "8px 14px",
              backgroundColor: "#1a2538",
              border: "1px solid #233148",
              color: history.canRedo ? "#e2e8f0" : "#4b5563",
              borderRadius: "4px",
              cursor: history.canRedo ? "pointer" : "not-allowed",
              fontSize: "13px",
            }}
          >
            Redo
          </button>

          <button
            onClick={handleNewTemplate}
            style={{
              padding: "8px 14px",
              backgroundColor: "#1a2538",
              border: "1px solid #233148",
              color: "#e2e8f0",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            New Template
          </button>

          <label
            style={{
              padding: "8px 14px",
              backgroundColor: "#1a2538",
              border: "1px solid #233148",
              color: "#e2e8f0",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>

          <button
            onClick={handleExport}
            style={{
              padding: "8px 14px",
              backgroundColor: "#1a2538",
              border: "1px solid #233148",
              color: "#e2e8f0",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Export Quiz JSON
          </button>

          <button
            onClick={() => exportOfflineGame(data)}
            style={{
              padding: "8px 18px",
              backgroundColor: "#00ff88",
              border: "none",
              color: "#0a0e17",
              fontWeight: 700,
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Download Standalone Game (.html)
          </button>
        </div>
      </header>

      {/* Main Content Split View */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Side: Forms & Editors */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <ValidationPanel data={data} />

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {(["config", "rooms", "puzzles"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => startTransition(() => setActiveTab(tab))}
                style={{
                  padding: "8px 18px",
                  backgroundColor: activeTab === tab ? "#00ff88" : "#1a2538",
                  color: activeTab === tab ? "#0a0e17" : "#e2e8f0",
                  border: "1px solid #233148",
                  borderRadius: "4px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontSize: "12px",
                  letterSpacing: "0.05em",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          {activeTab === "config" && (
            <ConfigEditor
              data={data}
              onChange={(field, value) => dispatch({ type: "UPDATE_CONFIG", field, value })}
            />
          )}

          {activeTab === "rooms" && (
            <RoomEditor
              data={data}
              onUpdateRoom={(roomKey, field, value) =>
                dispatch({ type: "UPDATE_ROOM", roomKey, field, value })
              }
              onUpdateCode={(roomKey, code) =>
                dispatch({ type: "UPDATE_ROOM_CODE", roomKey, code })
              }
              onAddRoom={(roomKey) => dispatch({ type: "ADD_ROOM", roomKey })}
              onRemoveRoom={(roomKey) => dispatch({ type: "REMOVE_ROOM", roomKey })}
            />
          )}

          {activeTab === "puzzles" && (
            <PuzzleEditor
              data={data}
              onUpdatePuzzle={(puzzleId, puzzle) =>
                dispatch({ type: "UPDATE_PUZZLE", puzzleId, puzzle })
              }
              onAddPuzzle={(puzzleId, puzzle) => dispatch({ type: "ADD_PUZZLE", puzzleId, puzzle })}
              onRemovePuzzle={(puzzleId) => dispatch({ type: "REMOVE_PUZZLE", puzzleId })}
            />
          )}
        </div>

        {/* Right Side: Live Preview Panel */}
        <div style={{ flex: 1 }}>
          <PreviewFrame data={data} />
        </div>
      </div>
    </div>
  );
};
