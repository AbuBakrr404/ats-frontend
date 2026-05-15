import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Note } from "../../types/domain";

export function NotesPanel({ candidateId }: { candidateId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [candidateId]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, candidate_id: candidateId, body: body.trim() })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev]);
      setBody("");
    }
  }

  async function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  }

  return (
    <section className="card">
      <h2 className="font-semibold mb-3">Notes</h2>

      <form onSubmit={addNote} className="mb-4">
        <textarea
          className="input mb-2"
          rows={3}
          placeholder="Add a note — phone call notes, client feedback, follow-up reminders…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary text-sm" disabled={saving || !body.trim()}>
          {saving ? "Saving..." : "Add note"}
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-pt-muted">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-sm text-pt-muted">No notes yet.</div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-pt-border pl-3 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-pt-text whitespace-pre-wrap flex-1">{n.body}</p>
                <button
                  onClick={() => {
                    if (confirm("Delete this note?")) deleteNote(n.id);
                  }}
                  className="text-xs text-pt-muted hover:text-pt-red opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-pt-muted mt-1">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
