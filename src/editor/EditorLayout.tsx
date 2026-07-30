import React, { useEffect, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { get, set } from "idb-keyval";
import { QuizSchema } from "../schema/quiz.ts";
import { EditorContextProvider } from "./EditorContext.ts";
import type { EditorContextValue } from "./EditorContext.ts";
import { ValidationPanel } from "./components/ValidationPanel.tsx";
import { PreviewFrame } from "./components/PreviewFrame.tsx";
import { DEFAULT_TEMPLATE, editorReducer } from "./store.ts";
import { useHistoryReducer } from "./useHistory.ts";
import "./editor.css";

const TABS = [
  { to: "/editor/config", label: "config" },
  { to: "/editor/rooms", label: "rooms" },
  { to: "/editor/puzzles", label: "puzzles" },
] as const;

export const EditorLayout: React.FC = () => {
  const [data, dispatch, history] = useHistoryReducer(editorReducer, DEFAULT_TEMPLATE);
  const [saveStatus, setSaveStatus] = useState("Draft Saved");

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

  const value: EditorContextValue = { data, dispatch, history };

  return (
    <EditorContextProvider value={value}>
      <div className="editor-app">
        <header className="editor-header">
          <div className="editor-brand">
            <h1>Authoring studio</h1>
            <span className="editor-status">{saveStatus}</span>
          </div>

          <div className="editor-toolbar">
            <button
              className="editor-btn"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Undo (Ctrl/Cmd+Z)"
            >
              Undo
            </button>

            <button
              className="editor-btn"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Redo (Ctrl/Cmd+Shift+Z)"
            >
              Redo
            </button>

            <button className="editor-btn" onClick={handleNewTemplate}>
              New template
            </button>

            <label className="editor-btn">
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: "none" }}
              />
            </label>

            <button className="editor-btn editor-btn-primary" onClick={handleExport}>
              Export quiz JSON
            </button>

            <Link to="/" className="editor-btn">
              Exit
            </Link>
          </div>
        </header>

        <div className="editor-body">
          <div className="editor-main">
            <ValidationPanel data={data} />

            {/* Tabs are routes now, so a section is linkable and survives reload. */}
            <nav className="editor-tabs">
              {TABS.map((tab) => (
                <Link
                  to={tab.to}
                  key={tab.to}
                  className="editor-tab"
                  activeProps={{ className: "editor-tab editor-tab-active" }}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            <Outlet />
          </div>

          <div className="editor-preview">
            <PreviewFrame data={data} />
          </div>
        </div>
      </div>
    </EditorContextProvider>
  );
};
