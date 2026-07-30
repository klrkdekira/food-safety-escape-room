import React from "react";
import { createLazyRoute } from "@tanstack/react-router";
import { useEditor } from "../EditorContext.ts";
import { ConfigEditor } from "../components/ConfigEditor.tsx";

function ConfigTab() {
  const { data, dispatch } = useEditor();
  return (
    <ConfigEditor
      data={data}
      onChange={(field, value) => dispatch({ type: "UPDATE_CONFIG", field, value })}
    />
  );
}

export const Route = createLazyRoute("/editor/config")({ component: ConfigTab });
