import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Job } from "../types/domain";

export function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setJobs((data ?? []) as Job[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pt-text">Jobs</h1>
          <p className="text-pt-muted">Open positions you're recruiting for.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New job
        </button>
      </header>

      {showForm && (
        <JobForm
          onCancel={() => setShowForm(false)}
          onCreated={(job) => {
            setJobs((prev) => [job, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {loading ? (
        <div className="text-pt-muted">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-pt-muted py-12">
          No jobs yet. Click "+ New job" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link
              to={`/jobs/${j.id}`}
              key={j.id}
              className="card hover:border-pt-red transition-colors block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-pt-text">{j.title}</div>
                  <div className="text-sm text-pt-muted">
                    {[j.company, j.location].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    j.is_open
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {j.is_open ? "Open" : "Closed"}
                </span>
              </div>
              {j.required_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {j.required_skills.slice(0, 6).map((s, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-pt-text px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                  {j.required_skills.length > 6 && (
                    <span className="text-xs text-pt-muted px-2 py-1">
                      +{j.required_skills.length - 6}
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

function JobForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (job: Job) => void;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setSaving(false);
      return;
    }

    const requiredSkills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error: insertErr } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title,
        company: company || null,
        location: location || null,
        description,
        required_skills: requiredSkills,
        is_open: true,
      })
      .select()
      .single();

    setSaving(false);
    if (insertErr) {
      setError(insertErr.message);
    } else {
      onCreated(data as Job);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6">
      <h2 className="font-semibold mb-4">New job</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Senior Marketing Manager"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input
              type="text"
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Pro Talent client"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sandton, JHB"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            className="input"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Paste the full job description here. The AI uses this when matching candidates."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Required skills (comma-separated)
          </label>
          <input
            type="text"
            className="input"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. SAP, Pastel, MS Excel - Advanced"
          />
          <p className="text-xs text-pt-muted mt-1">
            Used to prefilter candidates. Be specific.
          </p>
        </div>

        {error && (
          <div className="text-sm text-pt-red bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Creating..." : "Create job"}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
