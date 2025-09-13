"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);

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

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Failed to fetch data" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold mb-8">Scraper</h1>

          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter doctor page URL"
            className="input input-bordered w-full mb-4"
          />

          <button className="btn btn-primary mb-6" onClick={handleOnClick} disabled={loading}>
            {loading ? "Scraping..." : "Scrape Doctor Info"}
          </button>

          {result && (
            <div className="grid">
              <pre className="bg-zinc-200 text-left py-4 px-5 rounded overflow-x-scroll">
                <code>{JSON.stringify(result, undefined, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
