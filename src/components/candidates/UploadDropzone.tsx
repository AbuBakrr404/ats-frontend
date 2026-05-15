import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { parseCv } from "../../lib/api";
import type { Candidate } from "../../types/domain";

type Status = "idle" | "uploading" | "parsing" | "error";

interface Props {
  onDone: (candidate: Candidate) => void;
}

export function UploadDropzone({ onDone }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleFile(file: File) {
    setError("");
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("Please upload a PDF or DOCX file");
      setStatus("error");
      return;
    }

    setStatus("uploading");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setStatus("error");
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("cvs").upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setStatus("error");
      return;
    }

    setStatus("parsing");
    try {
      const candidate = await parseCv(path, file.name);
      onDone(candidate);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  const isBusy = status === "uploading" || status === "parsing";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!isBusy) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (isBusy) return;
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        isDragOver
          ? "border-pt-red bg-red-50"
          : isBusy
          ? "border-pt-border bg-gray-50"
          : "border-pt-border hover:border-pt-red hover:bg-red-50"
      }`}
    >
      {status === "idle" && (
        <>
          <div className="text-pt-text font-medium mb-2">Drop a CV here</div>
          <div className="text-sm text-pt-muted mb-4">PDF or DOCX, up to 10 MB</div>
          <label className="btn-primary cursor-pointer inline-block">
            <input
              type="file"
              accept=".pdf,.docx"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            Browse files
          </label>
        </>
      )}
      {status === "uploading" && (
        <div className="text-pt-text">Uploading file...</div>
      )}
      {status === "parsing" && (
        <div>
          <div className="text-pt-text font-medium">Parsing with AI...</div>
          <div className="text-sm text-pt-muted mt-1">This takes 10–20 seconds</div>
        </div>
      )}
      {status === "error" && (
        <div>
          <div className="text-pt-red font-medium">{error}</div>
          <button
            onClick={() => { setStatus("idle"); setError(""); }}
            className="text-sm text-pt-muted hover:text-pt-text mt-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
