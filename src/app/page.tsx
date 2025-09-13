"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false); // modal state

  async function handleOnClick() {
    if (!url) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.text(); // since we return TSV
      setResult(data);
    } catch (err) {
      setResult("error: Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000); // hide after 3 sec
  }

  return (
    <main className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold mb-8">Scraper</h1>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter doctor page URL"
            className="input input-bordered w-full mb-4"
          />

          <button
            className="btn btn-primary mb-6"
            onClick={handleOnClick}
            disabled={loading}
          >
            {loading ? "Scraping..." : "Scrape"}
          </button>

          {result && (
            <div className="grid gap-4">
              <pre className="bg-zinc-200 text-left py-4 px-5 rounded overflow-x-scroll">
                <code>{result}</code>
              </pre>
              <button className="btn btn-secondary" onClick={handleCopy}>
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Modal/Toast */}
      {copied && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow-lg transition-opacity">
          Copied to clipboard ✅
        </div>
      )}
    </main>
  );
}