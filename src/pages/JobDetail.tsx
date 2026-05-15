import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { matchJob, type MatchResult } from "../lib/api";
import type { Job } from "../types/domain";

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setJob(data as Job);
        setLoading(false);
      });
  }, [id]);

  // Load cached match results if any exist
  useEffect(() => {
    if (!id) return;
    supabase
      .from("match_results")
      .select("candidate_id, score, reasoning, candidates(first_name, surname)")
      .eq("job_id", id)
      .order("score", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setResults(
            data.map((r: any) => ({
              candidate_id: r.candidate_id,
              candidate_name: `${r.candidates?.first_name ?? ""} ${r.candidates?.surname ?? ""}`.trim(),
              score: r.score,
              reasoning: r.reasoning,
            }))
          );
        }
      });
  }, [id]);

  async function toggleOpen() {
    if (!job) return;
    const next = !job.is_open;
    setJob({ ...job, is_open: next });
    await supabase.from("jobs").update({ is_open: next }).eq("id", job.id);
  }

  async function runMatch() {
    if (!job) return;
    setMatching(true);
    setMatchError("");
    setResults(null);
    try {
      const data = await matchJob(job.id);
      setResults(data.results);
      if (data.results.length === 0) {
        setMatchError(data.message || "No matching candidates found");
      }
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Match failed");
    } finally {
      setMatching(false);
    }
  }

  if (loading) return <div className="p-8 text-pt-muted">Loading...</div>;
  if (error || !job) return <div className="p-8 text-pt-red">{error || "Not found"}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/jobs" className="text-sm text-pt-muted hover:text-pt-text mb-4 inline-block">
        ← Back to jobs
      </Link>

      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-pt-text">{job.title}</h1>
          <p className="text-pt-muted">
            {[job.company, job.location].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <button onClick={toggleOpen} className="btn-secondary text-sm">
          {job.is_open ? "Mark closed" : "Mark open"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <h2 className="font-semibold mb-3">Description</h2>
            <p className="text-pt-text whitespace-pre-wrap">{job.description}</p>
          </section>

          {job.required_skills?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold mb-3">Required skills</h2>
              <div className="flex flex-wrap gap-1">
                {job.required_skills.map((s, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-pt-text px-2 py-1 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <section className="card sticky top-8">
            <h2 className="font-semibold mb-2">AI Candidate matching</h2>
            <p className="text-sm text-pt-muted mb-4">
              Scores all your candidates against this job using Claude. Takes ~30 seconds.
            </p>
            <button
              onClick={runMatch}
              className="btn-primary w-full"
              disabled={matching}
            >
              {matching ? "Scoring..." : results ? "Re-run matching" : "Find candidates"}
            </button>
            {matchError && (
              <div className="text-sm text-pt-red mt-3">{matchError}</div>
            )}
          </section>
        </div>
      </div>

      {results && results.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4">Ranked candidates</h2>
          <div className="space-y-3">
            {results.map((r) => (
              <Link
                to={`/candidates/${r.candidate_id}`}
                key={r.candidate_id}
                className="card hover:border-pt-red transition-colors flex items-start gap-4 block"
              >
                <ScoreBadge score={r.score} />
                <div className="flex-1">
                  <div className="font-semibold text-pt-text">{r.candidate_name || "Unnamed"}</div>
                  <p className="text-sm text-pt-muted mt-1">{r.reasoning}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-100 text-gray-800";
  if (score >= 90) color = "bg-green-100 text-green-800";
  else if (score >= 70) color = "bg-blue-100 text-blue-800";
  else if (score >= 50) color = "bg-yellow-100 text-yellow-800";
  else if (score >= 30) color = "bg-orange-100 text-orange-800";
  else color = "bg-red-100 text-red-800";

  return (
    <div
      className={`shrink-0 w-14 h-14 rounded-lg ${color} flex items-center justify-center font-bold text-lg`}
    >
      {score}
    </div>
  );
}
