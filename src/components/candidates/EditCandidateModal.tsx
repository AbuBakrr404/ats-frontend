import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Candidate } from "../../types/domain";

interface Props {
  candidate: Candidate;
  onClose: () => void;
  onSaved: (updated: Candidate) => void;
}

export function EditCandidateModal({ candidate, onClose, onSaved }: Props) {
  const [first_name, setFirstName] = useState(candidate.first_name ?? "");
  const [surname, setSurname] = useState(candidate.surname ?? "");
  const [residential_area, setLocation] = useState(candidate.residential_area ?? "");
  const [language, setLanguage] = useState(candidate.language ?? "");
  const [drivers_licence, setLicence] = useState(candidate.drivers_licence ?? "");
  const [transport, setTransport] = useState(candidate.transport ?? "");
  const [availability, setAvailability] = useState(candidate.availability ?? "");
  const [current_salary, setCurrent] = useState(candidate.current_salary ?? "");
  const [required_salary, setRequired] = useState(candidate.required_salary ?? "");
  const [skills, setSkills] = useState((candidate.computer_skills ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const updates = {
      first_name: first_name || null,
      surname: surname || null,
      residential_area: residential_area || null,
      language: language || null,
      drivers_licence: drivers_licence || null,
      transport: transport || null,
      availability: availability || null,
      current_salary: current_salary || null,
      required_salary: required_salary || null,
      computer_skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      // Invalidate the cached generated profile since data changed
      profile_storage_path: null,
    };

    const { data, error: updateErr } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidate.id)
      .select()
      .single();

    setSaving(false);
    if (updateErr) {
      setError(updateErr.message);
    } else if (data) {
      onSaved(data as Candidate);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-pt-border flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Edit candidate</h2>
          <button onClick={onClose} className="text-pt-muted hover:text-pt-text text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <input className="input" value={first_name} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Surname">
              <input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} />
            </Field>
          </div>

          <Field label="Residential area">
            <input className="input" value={residential_area} onChange={(e) => setLocation(e.target.value)} />
          </Field>

          <Field label="Language">
            <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Driver's licence">
              <input className="input" value={drivers_licence} onChange={(e) => setLicence(e.target.value)} />
            </Field>
            <Field label="Transport">
              <input className="input" value={transport} onChange={(e) => setTransport(e.target.value)} />
            </Field>
          </div>

          <Field label="Availability">
            <input className="input" value={availability} onChange={(e) => setAvailability(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current salary">
              <input className="input" value={current_salary} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <Field label="Required salary">
              <input className="input" value={required_salary} onChange={(e) => setRequired(e.target.value)} />
            </Field>
          </div>

          <Field label="Skills (comma-separated)">
            <input className="input" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </Field>

          {error && (
            <div className="text-sm text-pt-red bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>

          <p className="text-xs text-pt-muted">
            Note: editing personal details will regenerate the Pro Talent .docx on next download.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
