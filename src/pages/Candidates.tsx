import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UploadDropzone } from "../components/candidates/UploadDropzone";
import type { Candidate } from "../types/domain";

export function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setCandidates((data ?? []) as Candidate[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-pt-text">Candidates</h1>
        <p className="text-pt-muted">Upload a CV — the AI extracts and structures it.</p>
      </header>

      <div className="mb-8">
        <UploadDropzone onDone={(c) => setCandidates((prev) => [c, ...prev])} />
      </div>

      {loading ? (
        <div className="text-pt-muted">Loading...</div>
      ) : candidates.length === 0 ? (
        <div className="text-center text-pt-muted py-12">
          No candidates yet. Upload a CV to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <Link to={`/candidates/${c.id}`} key={c.id} className="card hover:border-pt-red transition-colors block">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-pt-text">
                    {c.first_name} {c.surname}
                  </div>
                  <div className="text-sm text-pt-muted">{c.residential_area}</div>
                </div>
                <StageBadge stage={c.stage} />
              </div>
              {c.ai_summary && (
                <p className="text-sm text-pt-muted line-clamp-3 mt-2">{c.ai_summary}</p>
              )}
              {c.computer_skills && c.computer_skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.computer_skills.slice(0, 4).map((s, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-pt-text px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                  {c.computer_skills.length > 4 && (
                    <span className="text-xs text-pt-muted px-2 py-1">
                      +{c.computer_skills.length - 4}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    applied:    "bg-blue-100 text-blue-800",
    screening:  "bg-yellow-100 text-yellow-800",
    interview:  "bg-purple-100 text-purple-800",
    offer:      "bg-green-100 text-green-800",
    rejected:   "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[stage] ?? colors.applied}`}>
      {stage}
    </span>
  );
}
