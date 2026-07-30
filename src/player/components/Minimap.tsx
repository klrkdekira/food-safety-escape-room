import React from "react";
import { useGame } from "../GameContext.ts";

export const Minimap: React.FC = () => {
  const { state, dispatch, ctx } = useGame();
  const { config } = ctx.quiz;

  return (
    <div className="minimap-container" id="minimap">
      <div className="minimap-title" id="minimap-title">
        {config.minimapTitle}
      </div>
      {config.minimapRooms.map((text, i) => {
        const roomNum = i + 1;
        const status =
          roomNum === state.currentRoom
            ? "active-room"
            : state.roomCompleted[String(roomNum)]
              ? "solved"
              : "locked";
        // A real <button>: these were click-only <div>s, unreachable by keyboard.
        return (
          <button
            type="button"
            className={`minimap-room ${status}`}
            key={roomNum}
            onClick={() => dispatch({ type: "GO_TO_ROOM", roomNum })}
          >
            <div className="minimap-dot"></div>
            <span className="minimap-room-text">{text}</span>
          </button>
        );
      })}
    </div>
  );
};
