import React, { useState } from "react";
import type { QuizData } from "../../schema/quiz.ts";
import { CcArtPicker } from "./CcArtPicker.tsx";

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

  const handleAdd = () => {
    const nextKey = (Math.max(...roomKeys.map(Number), 0) + 1).toString();
    onAddRoom(nextKey);
    setSelectedRoom(nextKey);
  };

  return (
    <div className="editor-card">
      <h3>Rooms & Passcodes</h3>

      <div className="editor-selector-bar">
        {roomKeys.map((key) => (
          <button
            key={key}
            onClick={() => setSelectedRoom(key)}
            className={selectedRoom === key ? "editor-btn editor-btn-primary" : "editor-btn"}
          >
            Room {key}
          </button>
        ))}
        <button onClick={handleAdd} className="editor-btn editor-btn-add">
          + Add Room
        </button>
      </div>

      {currentRoom && (
        <div className="editor-subcard">
          <div className="editor-grid-2">
            <div>
              <label className="editor-label">Room Title</label>
              <input
                className="editor-input"
                value={currentRoom.title}
                onChange={(e) => onUpdateRoom(selectedRoom, "title", e.target.value)}
              />
            </div>

            <div>
              <label className="editor-label">Passcode (A-Z only)</label>
              <input
                className="editor-input"
                value={currentCode}
                onChange={(e) => onUpdateCode(selectedRoom, e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="editor-label">Subtitle</label>
            <input
              className="editor-input"
              value={currentRoom.subtitle}
              onChange={(e) => onUpdateRoom(selectedRoom, "subtitle", e.target.value)}
            />
          </div>

          <div>
            <label className="editor-label">Room Narrative</label>
            <textarea
              className="editor-input"
              value={currentRoom.narrative}
              onChange={(e) => onUpdateRoom(selectedRoom, "narrative", e.target.value)}
            />
          </div>

          <CcArtPicker
            imageUrl={currentRoom.imageUrl}
            imageAttribution={currentRoom.imageAttribution}
            onSelectArt={(imgUrl, attr) => {
              onUpdateRoom(selectedRoom, "imageUrl", imgUrl);
              onUpdateRoom(selectedRoom, "imageAttribution", attr);
            }}
            onClearArt={() => {
              onUpdateRoom(selectedRoom, "imageUrl", undefined);
              onUpdateRoom(selectedRoom, "imageAttribution", undefined);
            }}
          />

          <div>
            <label className="editor-label">Code Hint Text</label>
            <input
              className="editor-input"
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
              className="editor-btn btn-danger"
            >
              Delete Room {selectedRoom}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
