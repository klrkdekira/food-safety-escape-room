import React, { useState } from "react";
import type { QuizData } from "../../schema/quiz.ts";

interface RoomEditorProps {
  data: QuizData;
  onUpdateRoom: (roomKey: string, field: string, value: any) => void;
  onUpdateCode: (roomKey: string, code: string) => void;
  onAddRoom: (roomKey: string) => void;
  onRemoveRoom: (roomKey: string) => void;
}

export const RoomEditor: React.FC<RoomEditorProps> = ({
  data,
  onUpdateRoom,
  onUpdateCode,
  onAddRoom,
  onRemoveRoom,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>("1");

  const roomKeys = Object.keys(data.roomData);
  const currentRoom = data.roomData[selectedRoom];
  const currentCode = data.roomCodes[selectedRoom] ?? "";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#1a2538",
    border: "1px solid #233148",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "14px",
    marginBottom: "12px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const handleAdd = () => {
    const nextKey = (Math.max(...roomKeys.map(Number), 0) + 1).toString();
    onAddRoom(nextKey);
    setSelectedRoom(nextKey);
  };

  return (
    <div
      style={{
        backgroundColor: "#141c2b",
        padding: "16px",
        borderRadius: "6px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ fontSize: "15px", color: "#00ff88" }}>Rooms & Passcodes</h3>
        <button
          onClick={handleAdd}
          style={{
            padding: "6px 12px",
            backgroundColor: "#00ff88",
            border: "none",
            borderRadius: "4px",
            color: "#0a0e17",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          + Add Room
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {roomKeys.map((key) => (
          <button
            key={key}
            onClick={() => setSelectedRoom(key)}
            style={{
              padding: "6px 14px",
              backgroundColor: selectedRoom === key ? "#00ff88" : "#1a2538",
              color: selectedRoom === key ? "#0a0e17" : "#e2e8f0",
              border: "1px solid #233148",
              borderRadius: "4px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Room {key}
          </button>
        ))}
      </div>

      {currentRoom && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Room Title</label>
              <input
                style={inputStyle}
                value={currentRoom.title}
                onChange={(e) => onUpdateRoom(selectedRoom, "title", e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Passcode (A-Z only)</label>
              <input
                style={inputStyle}
                value={currentCode}
                onChange={(e) => onUpdateCode(selectedRoom, e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Subtitle</label>
            <input
              style={inputStyle}
              value={currentRoom.subtitle}
              onChange={(e) => onUpdateRoom(selectedRoom, "subtitle", e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Room Narrative</label>
            <textarea
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
              value={currentRoom.narrative}
              onChange={(e) => onUpdateRoom(selectedRoom, "narrative", e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Room Artwork (inline SVG markup, optional)</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: "70px",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
              placeholder='<svg width="100" height="100">...</svg>'
              value={currentRoom.svg ?? ""}
              onChange={(e) => onUpdateRoom(selectedRoom, "svg", e.target.value)}
            />
            <p
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginTop: "-8px",
                marginBottom: "12px",
              }}
            >
              Scripts and event handlers are stripped when the game renders this.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Code Hint Text</label>
            <input
              style={inputStyle}
              value={currentRoom.codeHint ?? ""}
              onChange={(e) => onUpdateRoom(selectedRoom, "codeHint", e.target.value)}
            />
          </div>

          {roomKeys.length > 1 && (
            <button
              onClick={() => {
                onRemoveRoom(selectedRoom);
                setSelectedRoom(roomKeys.find((k) => k !== selectedRoom) ?? "1");
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid #ff4d67",
                color: "#ff4d67",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                marginTop: "8px",
              }}
            >
              Delete Room {selectedRoom}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
