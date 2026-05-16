import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Candidate, Stage } from "../types/domain";

const STAGES: (Stage | "all")[] = ["all", "applied", "screening", "interview", "offer", "rejected"];

export function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [skillFilter, setSkillFilter] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setCandidates((data ?? []) as Candidate[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // All unique skills across candidates (for the filter dropdown)
  const allSkills = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => c.computer_skills?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      // Stage
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;

      // Skill
      if (skillFilter && !(c.computer_skills ?? []).includes(skillFilter)) return false;

      // Search across name, location, summary, skills
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          c.first_name, c.surname, c.residential_area, c.ai_summary,
          ...(c.computer_skills ?? []),
          ...(c.employment_history ?? []).flatMap((j) => [j.company, j.position]),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [candidates, search, stageFilter, skillFilter]);

  function handleNew(c: Candidate) {
    setCandidates((prev) => [c, ...prev]);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-pt-text">Candidates</h1>
        <p className="text-pt-muted">Drop CVs to parse — multiple files at once is fine.</p>
      </header>

      <div className="mb-8">
        <BulkUpload onCandidateParsed={handleNew} />
      </div>

      {/* Filters */}
      <div className="card mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="search"
          className="input"
          placeholder="Search name, location, skill, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All stages" : s}</option>
          ))}
        </select>
        <select
          className="input"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
        >
          <option value="">All skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="text-sm text-pt-muted mb-4">
        Showing {filtered.length} of {candidates.length}
      </div>

      {loading ? (
        <div className="text-pt-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-pt-muted py-12">
          {candidates.length === 0 ? "No candidates yet. Upload a CV to get started." : "No candidates match the filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link to={`/candidates/${c.id}`} key={c.id} className="card hover:border-pt-red transition-colors block">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-pt-text">{c.first_name} {c.surname}</div>
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
                    <span key={i} className="text-xs bg-gray-100 text-pt-text px-2 py-1 rounded">{s}</span>
                  ))}
                  {c.computer_skills.length > 4 && (
                    <span className="text-xs text-pt-muted px-2 py-1">+{c.computer_skills.length - 4}</span>
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
    applied:   "bg-blue-100 text-blue-800",
    screening: "bg-yellow-100 text-yellow-800",
    interview: "bg-purple-100 text-purple-800",
    offer:     "bg-green-100 text-green-800",
    rejected:  "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[stage] ?? colors.applied}`}>
      {stage}
    </span>
  );
}

// =========================
// Bulk upload (wraps UploadDropzone, runs files sequentially)
// =========================

interface BulkUploadProps {
  onCandidateParsed: (c: Candidate) => void;
}

function BulkUpload({ onCandidateParsed }: BulkUploadProps) {
  const [queue, setQueue] = useState<{ name: string; status: "pending" | "uploading" | "parsing" | "done" | "error"; error?: string }[]>([]);
  const [processing, setProcessing] = useState(false);

  async function processFiles(files: File[]) {
    if (files.length === 0 || processing) return;

    const valid = files.filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (valid.length === 0) return;

    setProcessing(true);
    setQueue(valid.map((f) => ({ name: f.name, status: "pending" })));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setQueue([]);
      setProcessing(false);
      return;
    }

    const { parseCv } = await import("../lib/api");

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];

      setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "uploading" } : q));

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file);
      if (upErr) {
        setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "error", error: upErr.message } : q));
        continue;
      }

      setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "parsing" } : q));

      try {
        const candidate = await parseCv(path, file.name);
        onCandidateParsed(candidate);
        setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "done" } : q));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Parse failed";
        setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "error", error: msg } : q));
      }
    }

    setProcessing(false);
  }

  return (
    <>
      <UploadDropzoneMulti onFiles={processFiles} disabled={processing} />
      {queue.length > 0 && (
        <div className="mt-4 card">
          <h3 className="font-semibold text-sm mb-2">Upload queue</h3>
          <ul className="space-y-1 text-sm">
            {queue.map((q, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-pt-text truncate flex-1">{q.name}</span>
                <StatusLabel status={q.status} error={q.error} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function StatusLabel({ status, error }: { status: string; error?: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    pending:   { text: "Waiting",       color: "text-pt-muted" },
    uploading: { text: "Uploading…",    color: "text-blue-600" },
    parsing:   { text: "Parsing (AI)…", color: "text-pt-red" },
    done:      { text: "✓ Done",        color: "text-green-700" },
    error:     { text: `✗ ${error}`,    color: "text-pt-red" },
  };
  const l = labels[status] ?? labels.pending;
  return <span className={`text-xs ${l.color}`}>{l.text}</span>;
}

// Multi-file dropzone (different shape from the single UploadDropzone)
function UploadDropzoneMulti({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled: boolean }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
        isDragOver ? "border-pt-red bg-red-50"
                   : disabled ? "border-pt-border bg-gray-50"
                              : "border-pt-border hover:border-pt-red hover:bg-red-50"
      }`}
    >
      <div className="text-pt-text font-medium mb-1">Drop CVs here</div>
      <div className="text-sm text-pt-muted mb-3">PDF or DOCX — drop multiple files at once</div>
      <label className={`btn-primary inline-block ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="file"
          accept=".pdf,.docx"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => { if (e.target.files) onFiles(Array.from(e.target.files)); e.target.value = ""; }}
        />
        {disabled ? "Processing..." : "Browse files"}
      </label>
    </div>
  );
}
