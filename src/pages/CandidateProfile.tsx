import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { downloadProfile } from "../lib/api";
import { NotesPanel } from "../components/candidates/NotesPanel";
import { EditCandidateModal } from "../components/candidates/EditCandidateModal";
import type { Candidate, Stage } from "../types/domain";

const STAGES: Stage[] = ["applied", "screening", "interview", "offer", "rejected"];

export function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCandidate(data as Candidate);
        setLoading(false);
      });
  }, [id]);

  async function updateStage(stage: Stage) {
    if (!candidate) return;
    setCandidate({ ...candidate, stage });
    await supabase.from("candidates").update({ stage }).eq("id", candidate.id);
  }

  async function handleDownload() {
    if (!candidate) return;
    setDownloading(true);
    try {
      await downloadProfile(candidate.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!candidate) return;
    if (!confirm(`Delete ${candidate.first_name} ${candidate.surname}? This cannot be undone.`)) return;

    // Delete the CV file from storage (cascade deletes notes, match_results via FK)
    if (candidate.storage_path) {
      await supabase.storage.from("cvs").remove([candidate.storage_path]);
    }
    if (candidate.profile_storage_path) {
      await supabase.storage.from("profiles").remove([candidate.profile_storage_path]);
    }

    const { error } = await supabase.from("candidates").delete().eq("id", candidate.id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    navigate("/candidates");
  }

  if (loading) return <div className="p-8 text-pt-muted">Loading...</div>;
  if (error || !candidate) return <div className="p-8 text-pt-red">{error || "Not found"}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/candidates" className="text-sm text-pt-muted hover:text-pt-text mb-4 inline-block">
        ← Back to candidates
      </Link>

      <header className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-pt-text">
            {candidate.first_name} {candidate.surname}
          </h1>
          <p className="text-pt-muted">{candidate.residential_area}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
            Edit
          </button>
          <button onClick={handleDelete} className="btn-secondary text-sm text-pt-red border-red-200 hover:bg-red-50">
            Delete
          </button>
          <button onClick={handleDownload} className="btn-primary text-sm" disabled={downloading}>
            {downloading ? "Generating..." : "Download profile"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {candidate.ai_summary && (
            <section className="card">
              <h2 className="font-semibold mb-2">Summary</h2>
              <p className="text-pt-text">{candidate.ai_summary}</p>
            </section>
          )}

          {(candidate.ai_strengths?.length > 0 || candidate.ai_weaknesses?.length > 0) && (
            <section className="card">
              <h2 className="font-semibold mb-3">AI Assessment</h2>
              {candidate.ai_strengths?.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-green-700 mb-2">Strengths</div>
                  <ul className="space-y-1 text-sm">
                    {candidate.ai_strengths.map((s, i) => (
                      <li key={i} className="text-pt-text">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {candidate.ai_weaknesses?.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-orange-700 mb-2">Gaps to probe</div>
                  <ul className="space-y-1 text-sm">
                    {candidate.ai_weaknesses.map((w, i) => (
                      <li key={i} className="text-pt-text">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {candidate.employment_history?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold mb-3">Employment history</h2>
              <div className="space-y-4">
                {candidate.employment_history.map((job, i) => (
                  <div key={i} className="border-l-2 border-pt-red pl-4">
                    <div className="font-medium text-pt-text">{job.position}</div>
                    <div className="text-sm text-pt-muted">{job.company} · {job.period}</div>
                    {job.duties?.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-pt-text">
                        {job.duties.map((d, j) => (
                          <li key={j}>• {d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {candidate.education?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold mb-3">Education</h2>
              <div className="space-y-3">
                {candidate.education.map((edu, i) => (
                  <div key={i}>
                    <div className="font-medium">{edu.qualification}</div>
                    <div className="text-sm text-pt-muted">{edu.institution} · {edu.date}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card">
            <h2 className="font-semibold mb-3">Pipeline stage</h2>
            <select
              value={candidate.stage}
              onChange={(e) => updateStage(e.target.value as Stage)}
              className="input"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </section>

          <NotesPanel candidateId={candidate.id} />

          <section className="card">
            <h2 className="font-semibold mb-3">Personal details</h2>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Equity" value={candidate.equity} />
              <DetailRow label="Language" value={candidate.language} />
              <DetailRow label="Transport" value={candidate.transport} />
              <DetailRow label="Driver's licence" value={candidate.drivers_licence} />
              <DetailRow label="Availability" value={candidate.availability} />
              <DetailRow label="Current salary" value={candidate.current_salary} />
              <DetailRow label="Required salary" value={candidate.required_salary} />
            </dl>
          </section>

          {candidate.computer_skills?.length > 0 && (
            <section className="card">
              <h2 className="font-semibold mb-3">Skills</h2>
              <div className="flex flex-wrap gap-1">
                {candidate.computer_skills.map((s, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-pt-text px-2 py-1 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {editing && (
        <EditCandidateModal
          candidate={candidate}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { setCandidate(updated); setEditing(false); }}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-pt-muted">{label}</dt>
      <dd className="text-pt-text text-right">{value || "—"}</dd>
    </div>
  );
}
