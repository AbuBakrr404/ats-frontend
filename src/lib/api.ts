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

  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const cd = r.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="(.+?)"/);
  a.download = match ? match[1] : "profile.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface MatchResult {
  candidate_id: string;
  candidate_name: string;
  score: number;
  reasoning: string;
}

export interface MatchResponse {
  job_id: string;
  results: MatchResult[];
  message?: string;
}

export async function matchJob(jobId: string): Promise<MatchResponse> {
  const r = await fetch(`${BASE}/jobs/${jobId}/match`, {
    method: "POST",
    headers: await authHeader(),
  });
  if (!r.ok) throw new Error(`Match failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// =========================
// RAG search
// =========================

export interface RagCandidateMatch {
  candidate_id: string;
  name: string;
  match_reason: string;
  confidence: number;
  sources: string[];
}

export interface RagResponse {
  query: string;
  retrieved_chunk_count: number;
  candidates_considered: number;
  answer: string;
  candidates: RagCandidateMatch[];
  reasoning: string;
}

export interface RagQueryParams {
  query: string;
  top_k?: number;
  threshold?: number;
  chunk_type?: string;
  stage?: string;
}

export async function ragQuery(params: RagQueryParams): Promise<RagResponse> {
  const r = await fetch(`${BASE}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`RAG query failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function ragEmbedAll(): Promise<{ total: number; succeeded: number; failed: number }> {
  const r = await fetch(`${BASE}/rag/embed/all`, {
    method: "POST",
    headers: await authHeader(),
  });
  if (!r.ok) throw new Error(`Embed all failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function ragEmbedOne(candidateId: string): Promise<{ status: string; chunks: number }> {
  const r = await fetch(`${BASE}/rag/embed/${candidateId}`, {
    method: "POST",
    headers: await authHeader(),
  });
  if (!r.ok) throw new Error(`Embed failed: ${r.status} ${await r.text()}`);
  return r.json();
}
