import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { supabase } from "../lib/supabase";
import type { Candidate, Stage } from "../types/domain";

const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "applied",   label: "Applied",   color: "border-t-blue-500" },
  { id: "screening", label: "Screening", color: "border-t-yellow-500" },
  { id: "interview", label: "Interview", color: "border-t-purple-500" },
  { id: "offer",     label: "Offer",     color: "border-t-green-500" },
  { id: "rejected",  label: "Rejected",  color: "border-t-gray-500" },
];

export function Pipeline() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const candidateId = active.id as string;
    const newStage = over.id as Stage;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand || cand.stage === newStage) return;

    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c))
    );

    const { error } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", candidateId);

    if (error) {
      // Revert on failure
      console.error(error);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, stage: cand.stage } : c))
      );
    }
  }

  if (loading) {
    return <div className="p-8 text-pt-muted">Loading...</div>;
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-pt-text">Pipeline</h1>
        <p className="text-pt-muted">Drag candidates between stages to update their status.</p>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4 min-w-[1000px]">
          {STAGES.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              candidates={candidates.filter((c) => c.stage === stage.id)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  stage,
  candidates,
}: {
  stage: { id: Stage; label: string; color: string };
  candidates: Candidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border-t-4 ${stage.color} border border-pt-border flex flex-col ${
        isOver ? "bg-red-50" : ""
      }`}
    >
      <div className="p-4 border-b border-pt-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-pt-text">{stage.label}</h2>
          <span className="text-sm text-pt-muted bg-gray-100 px-2 py-0.5 rounded-full">
            {candidates.length}
          </span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[200px] flex-1">
        {candidates.map((c) => (
          <KanbanCard key={c.id} candidate={c} />
        ))}
        {candidates.length === 0 && (
          <div className="text-xs text-pt-muted text-center py-8 px-2">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-pt-border rounded-md p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="font-medium text-pt-text text-sm">
        {candidate.first_name} {candidate.surname}
      </div>
      {candidate.residential_area && (
        <div className="text-xs text-pt-muted mt-0.5">{candidate.residential_area}</div>
      )}
      {candidate.computer_skills && candidate.computer_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {candidate.computer_skills.slice(0, 2).map((s, i) => (
            <span key={i} className="text-[10px] bg-gray-100 text-pt-text px-1.5 py-0.5 rounded">
              {s}
            </span>
          ))}
          {candidate.computer_skills.length > 2 && (
            <span className="text-[10px] text-pt-muted">
              +{candidate.computer_skills.length - 2}
            </span>
          )}
        </div>
      )}
      <Link
        to={`/candidates/${candidate.id}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-xs text-pt-red hover:underline mt-2 inline-block"
      >
        View profile →
      </Link>
    </div>
  );
}
