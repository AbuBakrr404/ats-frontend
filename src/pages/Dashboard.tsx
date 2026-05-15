import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

export function Dashboard() {
  const [counts, setCounts] = useState({ candidates: 0, jobs: 0, applied: 0, interview: 0 });

  useEffect(() => {
    async function load() {
      const [c, j, a, i] = await Promise.all([
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("stage", "applied"),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("stage", "interview"),
      ]);
      setCounts({
        candidates: c.count ?? 0,
        jobs: j.count ?? 0,
        applied: a.count ?? 0,
        interview: i.count ?? 0,
      });
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-pt-muted mb-8">Welcome back — here's what's happening.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total candidates" value={counts.candidates} />
        <StatCard label="Open jobs" value={counts.jobs} />
        <StatCard label="In applied" value={counts.applied} />
        <StatCard label="In interview" value={counts.interview} />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Quick actions</h2>
        <div className="flex gap-3">
          <Link to="/candidates" className="btn-primary">Upload a CV</Link>
          <Link to="/jobs" className="btn-secondary">Create a job</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-sm text-pt-muted">{label}</div>
      <div className="text-3xl font-bold text-pt-text mt-1">{value}</div>
    </div>
  );
}
