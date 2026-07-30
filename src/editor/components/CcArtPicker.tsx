import React, { useState } from "react";

interface CcArtResult {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  artist: string;
  license: string;
}

interface CcArtPickerProps {
  imageUrl?: string;
  imageAttribution?: string;
  onSelectArt: (imageUrl: string, attribution: string) => void;
  onClearArt: () => void;
}

export const CcArtPicker: React.FC<CcArtPickerProps> = ({
  imageUrl,
  imageAttribution,
  onSelectArt,
  onClearArt,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CcArtResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const searchCcArt = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Query Wikimedia Commons API for Creative Commons images
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
        query,
      )}&gsrlimit=16&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&format=json&origin=*`;

      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
      const data = await res.json();

      const pages = data.query?.pages;
      if (!pages) {
        setResults([]);
        setLoading(false);
        return;
      }

      const items: CcArtResult[] = [];
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const info = page.imageinfo?.[0];
        if (!info) continue;

        // Extract metadata cleanly
        const rawTitle = (page.title || "").replace(/^File:/, "");
        const artistRaw = info.extmetadata?.Artist?.value || "Unknown Artist";
        // Strip HTML tags from artist metadata if present
        const artistClean = artistRaw.replace(/<[^>]*>?/gm, "").trim();
        const license = info.extmetadata?.LicenseShortName?.value || "CC / Open Source";

        items.push({
          id: String(page.pageid),
          title: rawTitle,
          thumbUrl: info.thumburl || info.url,
          fullUrl: info.url,
          artist: artistClean,
          license,
        });
      }

      setResults(items);
    } catch (err: any) {
      setError(err.message || "Failed to search Creative Commons media");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchCcArt();
    }
  };

  return (
    <div className="cc-art-picker" style={{ marginBottom: "1rem" }}>
      <label className="editor-label">Room Artwork (Open Source / Creative Commons)</label>

      {imageUrl ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.75rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            marginBottom: "0.5rem",
          }}
        >
          <img
            src={imageUrl}
            alt="Room Artwork"
            style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
          />
          <div style={{ flex: 1, fontSize: "0.85rem", overflow: "hidden" }}>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Selected Artwork
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
              {imageAttribution || "No attribution string"}
            </div>
          </div>
          <button
            type="button"
            className="editor-btn btn-danger"
            onClick={onClearArt}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button
          type="button"
          className="editor-btn"
          onClick={() => setIsOpen(!isOpen)}
          style={{ fontSize: "0.85rem" }}
        >
          {isOpen ? "Close CC Search" : "Search Creative Commons Artwork"}
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            padding: "1rem",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            marginTop: "0.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              className="editor-input"
              placeholder="Search terms (e.g. microbiology, biofilm, laboratory, cell)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="editor-btn editor-btn-primary"
              onClick={searchCcArt}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
              }}
            >
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "0.75rem",
                maxHeight: "320px",
                overflowY: "auto",
                padding: "0.25rem",
              }}
            >
              {results.map((item) => {
                const attrText = `Art: "${item.title}" by ${item.artist} (${item.license}). Source: Wikimedia Commons`;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectArt(item.fullUrl, attrText);
                      setIsOpen(false);
                    }}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      padding: "0.375rem",
                      cursor: "pointer",
                      background: "var(--bg-card)",
                      transition: "transform 0.15s ease",
                    }}
                    title={`${item.title}\n${attrText}`}
                  >
                    <img
                      src={item.thumbUrl}
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "90px",
                        objectFit: "cover",
                        borderRadius: "2px",
                        marginBottom: "0.25rem",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--green)",
                        marginTop: "0.1rem",
                      }}
                    >
                      {item.license}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
