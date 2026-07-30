import React from "react";
import { createLazyRoute } from "@tanstack/react-router";
import { useEditor } from "../EditorContext.ts";
import { RoomEditor } from "../components/RoomEditor.tsx";

function RoomsTab() {
  const { data, dispatch } = useEditor();
  return (
    <RoomEditor
      data={data}
      onUpdateRoom={(roomKey, field, value) =>
        dispatch({ type: "UPDATE_ROOM", roomKey, field, value })
      }
      onUpdateCode={(roomKey, code) => dispatch({ type: "UPDATE_ROOM_CODE", roomKey, code })}
      onAddRoom={(roomKey) => dispatch({ type: "ADD_ROOM", roomKey })}
      onRemoveRoom={(roomKey) => dispatch({ type: "REMOVE_ROOM", roomKey })}
    />
  );
}

export const Route = createLazyRoute("/editor/rooms")({ component: RoomsTab });
