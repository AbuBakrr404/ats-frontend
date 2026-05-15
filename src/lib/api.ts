import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

export async function parseCv(storage_path: string, original_name: string) {
  const r = await fetch(`${BASE}/cv/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ storage_path, original_name }),
  });
  if (!r.ok) throw new Error(`Parse failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function downloadProfile(candidateId: string) {
  const r = await fetch(`${BASE}/cv/${candidateId}/profile`, {
    method: "GET",
    headers: await authHeader(),
  });
  if (!r.ok) throw new Error(`Profile download failed: ${r.status}`);

  // Trigger browser download
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Get filename from Content-Disposition header if present
  const cd = r.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="(.+?)"/);
  a.download = match ? match[1] : "profile.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function matchJob(jobId: string) {
  const r = await fetch(`${BASE}/jobs/${jobId}/match`, {
    method: "POST",
    headers: await authHeader(),
  });
  if (!r.ok) throw new Error(`Match failed: ${r.status}`);
  return r.json();
}
