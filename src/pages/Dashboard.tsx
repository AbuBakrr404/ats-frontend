import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Candidate, Job, Stage } from "../types/domain";

const STAGE_ORDER: Stage[] = ["applied", "screening", "interview", "offer", "rejected"];

const STAGE_COLORS: Record<Stage, string> = {
  applied:   "bg-blue-500",
  screening: "bg-yellow-500",
  interview: "bg-purple-500",
  offer:     "bg-green-500",
  rejected:  "bg-gray-400",
};

interface JobWithCount extends Job {
  candidate_count?: number;
}

export function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [candRes, jobRes] = await Promise.all([
        supabase.from("candidates").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("*").eq("is_open", true).order("created_at", { ascending: false }),
      ]);
      setCandidates((candRes.data ?? []) as Candidate[]);
      setJobs((jobRes.data ?? []) as JobWithCount[]);
      setLoading(false);
    }
    load();
  }, []);

  // === Funnel data ===
  const funnel = useMemo(() => {
    const counts: Record<Stage, number> = {
      applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0,
    };
    candidates.forEach((c) => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; });
    return counts;
  }, [candidates]);

  // === Stat cards ===
  const totalCandidates = candidates.length;
  const openJobs = jobs.length;
  const activeCandidates = candidates.filter((c) =>
    c.stage !== "rejected" && c.stage !== "offer"
  ).length;

  // === Stale candidates (no stage change in 14+ days, not in final stages) ===
  const stale = useMemo(() => {
    const now = Date.now();
    const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
    return candidates
      .filter((c) => c.stage !== "rejected" && c.stage !== "offer")
      .filter((c) => now - new Date(c.stage_changed_at).getTime() > TWO_WEEKS)
      .slice(0, 5);
  }, [candidates]);

  // === Recent activity (last 5 added) ===
  const recent = useMemo(() => candidates.slice(0, 5), [candidates]);

  if (loading) {
    return <div className="p-8 text-pt-muted">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-pt-text">Dashboard</h1>
        <p className="text-pt-muted">An overview of what's moving and what needs your attention.</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total candidates"
          value={totalCandidates}
          accent="border-l-pt-red"
          to="/candidates"
        />
        <StatCard
          label="Active pipeline"
          value={activeCandidates}
          accent="border-l-blue-500"
          to="/pipeline"
          sub={`${totalCandidates - activeCandidates} closed`}
        />
        <StatCard
          label="Open jobs"
          value={openJobs}
          accent="border-l-green-500"
          to="/jobs"
        />
        <StatCard
          label="Needs attention"
          value={stale.length}
          accent={stale.length > 0 ? "border-l-orange-500" : "border-l-gray-300"}
          sub="stuck 14+ days"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel (spans 2 cols) */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pipeline funnel</h2>
            <Link to="/pipeline" className="text-sm text-pt-red hover:underline">
              View kanban →
            </Link>
          </div>
          <Funnel counts={funnel} />
        </section>

        {/* Stale candidates */}
        <section className="card">
          <h2 className="font-semibold mb-3">Stuck candidates</h2>
          <p className="text-xs text-pt-muted mb-3">No stage change in 14+ days.</p>
          {stale.length === 0 ? (
            <div className="text-sm text-pt-muted py-4 text-center">
              ✓ Nothing's stuck. Good work.
            </div>
          ) : (
            <ul className="space-y-2">
              {stale.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/candidates/${c.id}`}
                    className="block hover:bg-orange-50 rounded p-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-pt-text">
                          {c.first_name} {c.surname}
                        </div>
                        <div className="text-xs text-pt-muted capitalize">
                          {c.stage} · {daysAgo(c.stage_changed_at)} days
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recently added</h2>
            <Link to="/candidates" className="text-sm text-pt-red hover:underline">
              All candidates →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-pt-muted py-6 text-center">
              No candidates yet.{" "}
              <Link to="/candidates" className="text-pt-red hover:underline">
                Upload one →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-pt-border">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/candidates/${c.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-pt-text">
                        {c.first_name} {c.surname}
                      </div>
                      <div className="text-xs text-pt-muted">
                        {c.residential_area || "—"} · {daysAgo(c.created_at)} days ago
                      </div>
                    </div>
                    <StageBadge stage={c.stage} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top open jobs */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Open jobs</h2>
            <Link to="/jobs" className="text-sm text-pt-red hover:underline">
              All jobs →
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="text-sm text-pt-muted py-6 text-center">
              No open jobs.{" "}
              <Link to="/jobs" className="text-pt-red hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id}>
                  <Link
                    to={`/jobs/${j.id}`}
                    className="block hover:bg-gray-50 rounded p-2 -mx-2 transition-colors"
                  >
                    <div className="text-sm font-medium text-pt-text truncate">{j.title}</div>
                    <div className="text-xs text-pt-muted truncate">
                      {[j.company, j.location].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// === Sub-components ===

function StatCard({
  label, value, accent, sub, to,
}: {
  label: string;
  value: number;
  accent: string;
  sub?: string;
  to?: string;
}) {
  const body = (
    <div className={`card border-l-4 ${accent} ${to ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <div className="text-sm text-pt-muted">{label}</div>
      <div className="text-3xl font-bold text-pt-text mt-1">{value}</div>
      {sub && <div className="text-xs text-pt-muted mt-1">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Funnel({ counts }: { counts: Record<Stage, number> }) {
  const max = Math.max(1, ...STAGE_ORDER.map((s) => counts[s]));
  return (
    <div className="space-y-3">
      {STAGE_ORDER.map((stage) => {
        const count = counts[stage] ?? 0;
        const width = (count / max) * 100;
        return (
          <Link
            key={stage}
            to={count > 0 ? `/pipeline` : "/pipeline"}
            className="block group"
          >
            <div className="flex items-center gap-3">
              <div className="text-sm capitalize w-20 text-pt-text">{stage}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                <div
                  className={`h-full ${STAGE_COLORS[stage]} rounded-full transition-all group-hover:opacity-90`}
                  style={{ width: `${Math.max(2, width)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-3 text-sm font-medium text-pt-text">
                  {count}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    applied:   "bg-blue-100 text-blue-800",
    screening: "bg-yellow-100 text-yellow-800",
    interview: "bg-purple-100 text-purple-800",
    offer:     "bg-green-100 text-green-800",
    rejected:  "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${colors[stage] ?? colors.applied}`}>
      {stage}
    </span>
  );
}

function daysAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}
