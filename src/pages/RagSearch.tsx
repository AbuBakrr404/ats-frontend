import { useState } from "react";
import { Link } from "react-router-dom";
import { ragQuery, ragEmbedAll, type RagResponse } from "../lib/api";

const STAGES = ["", "applied", "screening", "interview", "offer", "rejected"];

const EXAMPLE_QUERIES = [
  "Production planner with ERP experience",
  "Candidates based in Pietermaritzburg",
  "Recent graduates with IT skills",
  "Someone with team leadership experience",
];

export function RagSearch() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RagResponse | null>(null);

  // Re-embed status
  const [embedding, setEmbedding] = useState(false);
  const [embedMessage, setEmbedMessage] = useState("");

  async function handleSearch(e?: React.FormEvent, presetQuery?: string) {
    e?.preventDefault();
    const q = (presetQuery ?? query).trim();
    if (q.length < 2) return;

    setQuery(q);
    setSearching(true);
    setError("");
    setResult(null);

    try {
      const data = await ragQuery({
        query: q,
        stage: stage || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleReembed() {
    if (!confirm("Re-build embeddings for all candidates? This may take a minute.")) return;
    setEmbedding(true);
    setEmbedMessage("");
    try {
      const r = await ragEmbedAll();
      setEmbedMessage(`✓ Embedded ${r.succeeded} of ${r.total} candidates${r.failed > 0 ? ` (${r.failed} failed)` : ""}`);
    } catch (e) {
      setEmbedMessage(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setEmbedding(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-pt-text">AI Search</h1>
        <p className="text-pt-muted">
          Ask in plain English. Claude reads your candidate database and finds the best matches.
        </p>
      </header>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <input
            type="search"
            className="input"
            placeholder="e.g. Senior production planner with manufacturing background"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={searching}
            autoFocus
          />
          <select
            className="input"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            disabled={searching}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s === "" ? "Any stage" : s}</option>
            ))}
          </select>
          <button
            type="submit"
            className="btn-primary"
            disabled={searching || query.trim().length < 2}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Example chips */}
        {!result && !searching && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-pt-muted">Try:</span>
            {EXAMPLE_QUERIES.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => handleSearch(undefined, eq)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-pt-text px-2 py-1 rounded transition-colors"
              >
                {eq}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="card mb-4 border-pt-red">
          <div className="text-pt-red text-sm">{error}</div>
        </div>
      )}

      {/* Loading state */}
      {searching && (
        <div className="card text-center py-8">
          <div className="text-pt-muted">Searching your candidate database...</div>
          <div className="text-xs text-pt-muted mt-1">Embedding query → similarity search → Claude reasoning</div>
        </div>
      )}

      {/* Results */}
      {result && !searching && (
        <ResultView result={result} />
      )}

      {/* Admin: re-embed all */}
      <div className="mt-12 pt-6 border-t border-pt-border">
        <details>
          <summary className="text-sm text-pt-muted cursor-pointer hover:text-pt-text">
            Admin: rebuild search index
          </summary>
          <div className="mt-3 card">
            <p className="text-sm text-pt-muted mb-3">
              Re-embeds every candidate. Use after bulk imports or if search results seem stale.
              Existing candidates are auto-embedded when their CV is parsed — you usually don't need this.
            </p>
            <button
              onClick={handleReembed}
              className="btn-secondary text-sm"
              disabled={embedding}
            >
              {embedding ? "Rebuilding..." : "Rebuild index"}
            </button>
            {embedMessage && (
              <div className="text-sm mt-3 text-pt-text">{embedMessage}</div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

// =========================
// Result rendering
// =========================

function ResultView({ result }: { result: RagResponse }) {
  return (
    <div className="space-y-4">
      {/* The answer */}
      <section className="card border-pt-red">
        <div className="text-xs uppercase tracking-wide text-pt-muted mb-2">Answer</div>
        <p className="text-pt-text">{result.answer}</p>
        {result.reasoning && (
          <p className="text-sm text-pt-muted mt-3 italic">{result.reasoning}</p>
        )}
        <div className="text-xs text-pt-muted mt-4">
          Considered {result.candidates_considered} candidate{result.candidates_considered === 1 ? "" : "s"} ·
          {" "}{result.retrieved_chunk_count} relevant chunks
        </div>
      </section>

      {/* Ranked candidates */}
      {result.candidates.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold text-pt-text mb-3">
            {result.candidates.length === 1 ? "Match" : `Top ${result.candidates.length} matches`}
          </h2>
          <div className="space-y-3">
            {result.candidates.map((c, i) => (
              <Link
                key={c.candidate_id}
                to={`/candidates/${c.candidate_id}`}
                className="card hover:border-pt-red transition-colors flex items-start gap-4 block"
              >
                <RankBadge rank={i + 1} confidence={c.confidence} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-pt-text">{c.name || "Unnamed"}</span>
                    <ConfidencePill confidence={c.confidence} />
                  </div>
                  <p className="text-sm text-pt-muted mt-1">{c.match_reason}</p>
                  {c.sources && c.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.sources.map((s, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-pt-text px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="card text-center py-6">
          <p className="text-pt-muted">No matching candidates.</p>
        </section>
      )}
    </div>
  );
}

function RankBadge({ rank, confidence }: { rank: number; confidence: number }) {
  // Color the rank badge by confidence, similar to ScoreBadge in JobDetail.
  let color = "bg-gray-100 text-gray-800";
  if (confidence >= 0.9) color = "bg-green-100 text-green-800";
  else if (confidence >= 0.75) color = "bg-blue-100 text-blue-800";
  else if (confidence >= 0.5) color = "bg-yellow-100 text-yellow-800";
  else color = "bg-orange-100 text-orange-800";

  return (
    <div className={`shrink-0 w-12 h-12 rounded-lg ${color} flex items-center justify-center font-bold text-lg`}>
      #{rank}
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <span className="text-xs bg-gray-100 text-pt-muted px-2 py-0.5 rounded">
      {pct}% confidence
    </span>
  );
}