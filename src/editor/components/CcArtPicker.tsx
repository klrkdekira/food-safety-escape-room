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
    <div className="cc-art-picker">
      <label className="editor-label">Room Artwork (Open Source / Creative Commons)</label>

      {imageUrl ? (
        <div className="cc-art-preview">
          <img src={imageUrl} alt="Room Artwork" className="cc-art-preview-img" />
          <div className="cc-art-preview-meta">
            <div className="cc-art-preview-title">Selected Artwork</div>
            <div className="cc-art-preview-attr">{imageAttribution || "No attribution string"}</div>
          </div>
          <button
            type="button"
            className="editor-btn btn-danger editor-shrink"
            onClick={onClearArt}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="editor-row">
        <button type="button" className="editor-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "Close CC Search" : "Search Creative Commons Artwork"}
        </button>
      </div>

      {isOpen && (
        <div className="cc-art-search-box">
          <div className="editor-row">
            <input
              type="text"
              className="editor-input editor-row-input"
              placeholder="Search terms (e.g. microbiology, biofilm, laboratory, cell)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="editor-btn editor-btn-primary editor-shrink"
              onClick={searchCcArt}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {error && (
            <div className="editor-note" style={{ color: "var(--red)" }}>
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="cc-art-grid">
              {results.map((item) => {
                const attrText = `Art: "${item.title}" by ${item.artist} (${item.license}). Source: Wikimedia Commons`;

                return (
                  <div
                    key={item.id}
                    className="cc-art-card"
                    onClick={() => {
                      onSelectArt(item.fullUrl, attrText);
                      setIsOpen(false);
                    }}
                    title={`${item.title}\n${attrText}`}
                  >
                    <img src={item.thumbUrl} alt={item.title} className="cc-art-card-img" />
                    <div className="cc-art-card-title">{item.title}</div>
                    <div className="cc-art-card-license">{item.license}</div>
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
