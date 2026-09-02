"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type JourneyStage = {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string | null;
  description_en: string | null;
  icon: string | null;
  position: number;
};

type JourneyStep = {
  id: string;
  stage_id: string;
  title_pt: string;
  title_en: string;
  body_pt: string | null;
  body_en: string | null;
  is_pro: boolean;
  position: number;
};

type StageFields = {
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  icon: string;
  position: string;
};

type StepFields = {
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
  is_pro: boolean;
  position: string;
};

const EMPTY_STAGE: StageFields = {
  slug: "",
  title_pt: "",
  title_en: "",
  description_pt: "",
  description_en: "",
  icon: "",
  position: "1",
};

const EMPTY_STEP: StepFields = {
  title_pt: "",
  title_en: "",
  body_pt: "",
  body_en: "",
  is_pro: false,
  position: "1",
};

export function JourneyAdmin() {
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Stage dialog state
  const [stageDialog, setStageDialog] = useState<
    { mode: "create" } | { mode: "edit"; stage: JourneyStage } | null
  >(null);

  // Step dialog state
  const [stepDialog, setStepDialog] = useState<
    { mode: "create"; stageId: string } | { mode: "edit"; step: JourneyStep } | null
  >(null);

  const load = useCallback(async () => {
    const { data: s, error: se } = await supabase
      .from("journey_stages")
      .select("*")
      .order("position", { ascending: true });
    const { data: p, error: pe } = await supabase
      .from("journey_steps")
      .select("*")
      .order("position", { ascending: true });
    if (se) toast.error(se.message);
    if (pe) toast.error(pe.message);
    setStages(s ?? []);
    setSteps(p ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stepsFor = (stageId: string) =>
    steps.filter((s) => s.stage_id === stageId).sort((a, b) => a.position - b.position);

  const toggleExpand = (stageId: string) =>
    setExpanded((prev) => ({ ...prev, [stageId]: !prev[stageId] }));

  const deleteStage = async (stage: JourneyStage) => {
    if (!confirm(`Delete stage "${stage.title_en}" and all of its steps?`)) return;
    const { error: stepErr } = await supabase
      .from("journey_steps")
      .delete()
      .eq("stage_id", stage.id);
    if (stepErr) return toast.error(stepErr.message);
    const { error } = await supabase.from("journey_stages").delete().eq("id", stage.id);
    if (error) return toast.error(error.message);
    toast.success("Stage deleted");
    load();
  };

  const deleteStep = async (step: JourneyStep) => {
    if (!confirm(`Delete step "${step.title_en}"?`)) return;
    const { error } = await supabase.from("journey_steps").delete().eq("id", step.id);
    if (error) return toast.error(error.message);
    toast.success("Step deleted");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading journey...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Content</p>
        <h2 className="text-xl font-bold">Journey (stages and steps)</h2>
        <p className="text-sm text-muted-foreground">
          The gamified career checklist is built from stages, each containing ordered steps.
          Steps within a stage are ordered by position and grouped on the public /journey page.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setStageDialog({ mode: "create" })}
          className="gradient-go text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> Add stage
        </Button>
      </div>

      {stages.length === 0 && <p className="text-sm text-muted-foreground">No stages yet.</p>}

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const stageSteps = stepsFor(stage.id);
          const isOpen = !!expanded[stage.id];
          return (
            <div key={stage.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(stage.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    </button>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {stage.position}
                    </span>
                    <h3 className="truncate font-semibold">{stage.title_en}</h3>
                    <span className="text-xs text-muted-foreground">/ {stage.title_pt}</span>
                  </div>
                  {stage.icon && <p className="mt-1 text-xs text-muted-foreground">icon: {stage.icon}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(idx + 1) + " of " + stages.length} · {stageSteps.length} steps
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setStageDialog({ mode: "edit", stage })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteStage(stage)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStepDialog({ mode: "create", stageId: stage.id })}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Add step
                    </Button>
                  </div>
                  {stageSteps.length === 0 && (
                    <p className="text-sm text-muted-foreground">No steps in this stage yet.</p>
                  )}
                  {stageSteps.map((step) => (
                    <div key={step.id} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                              {step.position}
                            </span>
                            <span className="truncate text-sm font-medium">{step.title_en}</span>
                            <span className="text-xs text-muted-foreground">/ {step.title_pt}</span>
                            {step.is_pro && (
                              <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold">
                                PRO
                              </span>
                            )}
                          </div>
                          {step.body_en && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{step.body_en}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setStepDialog({ mode: "edit", step })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteStep(step)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(stageDialog || stepDialog) && (
        <div className="h-0">
          {stageDialog?.mode === "create" && (
            <StageDialog
              key="create-stage"
              mode="create"
              stagesCount={stages.length}
              onClose={() => setStageDialog(null)}
              onSaved={() => {
                setStageDialog(null);
                load();
              }}
            />
          )}
          {stageDialog?.mode === "edit" && (
            <StageDialog
              key={`edit-stage-${stageDialog.stage.id}`}
              mode="edit"
              stage={stageDialog.stage}
              stagesCount={stages.length}
              onClose={() => setStageDialog(null)}
              onSaved={() => {
                setStageDialog(null);
                load();
              }}
            />
          )}
          {stepDialog?.mode === "create" && (
            <StepDialog
              key={`create-step-${stepDialog.stageId}`}
              mode="create"
              stageId={stepDialog.stageId}
              stepsCount={stepsFor(stepDialog.stageId).length}
              onClose={() => setStepDialog(null)}
              onSaved={() => {
                setStepDialog(null);
                load();
              }}
            />
          )}
          {stepDialog?.mode === "edit" && (
            <StepDialog
              key={`edit-step-${stepDialog.step.id}`}
              mode="edit"
              step={stepDialog.step}
              stepsCount={stepsFor(stepDialog.step.stage_id).length}
              onClose={() => setStepDialog(null)}
              onSaved={() => {
                setStepDialog(null);
                load();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage dialog (create + edit)
// ---------------------------------------------------------------------------

function StageDialog({
  mode,
  stage,
  stagesCount,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  stage?: JourneyStage;
  stagesCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StageFields>(
    stage
      ? {
          slug: stage.slug,
          title_pt: stage.title_pt,
          title_en: stage.title_en,
          description_pt: stage.description_pt ?? "",
          description_en: stage.description_en ?? "",
          icon: stage.icon ?? "",
          position: String(stage.position),
        }
      : { ...EMPTY_STAGE, position: String(stagesCount + 1) },
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof StageFields, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const record = {
    slug: form.slug.trim(),
    title_pt: form.title_pt.trim(),
    title_en: form.title_en.trim(),
    description_pt: form.description_pt.trim() || null,
    description_en: form.description_en.trim() || null,
    icon: form.icon.trim() || null,
    position: Number(form.position) || 1,
  };

  const canSave =
    record.slug && record.title_pt && record.title_en && !Number.isNaN(Number(form.position));

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    let error: { message: string } | null = null;
    if (mode === "create") {
      const res = await supabase.from("journey_stages").insert(record);
      error = res.error;
      if (res.error) toast.error(res.error.message);
      else toast.success("Stage created");
    } else {
      const res = await supabase.from("journey_stages").update(record).eq("id", stage!.id);
      error = res.error;
      if (res.error) toast.error(res.error.message);
      else toast.success("Stage updated");
    }
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add stage" : "Edit stage"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="interview-stage" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title (en)</Label>
              <Input value={form.title_en} onChange={(e) => set("title_en", e.target.value)} placeholder="Interviews" />
            </div>
            <div className="space-y-1.5">
              <Label>Title (pt)</Label>
              <Input value={form.title_pt} onChange={(e) => set("title_pt", e.target.value)} placeholder="Entrevistas" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Description (en)</Label>
              <Textarea value={form.description_en} onChange={(e) => set("description_en", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (pt)</Label>
              <Textarea value={form.description_pt} onChange={(e) => set("description_pt", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="target" />
            </div>
            <div className="space-y-1.5">
              <Label>Position (order)</Label>
              <Input type="number" min={1} value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canSave || saving} className="gradient-go text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create stage" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step dialog (create + edit)
// ---------------------------------------------------------------------------

function StepDialog({
  mode,
  stageId,
  step,
  stepsCount,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  stageId?: string;
  step?: JourneyStep;
  stepsCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StepFields>(
    step
      ? {
          title_pt: step.title_pt,
          title_en: step.title_en,
          body_pt: step.body_pt ?? "",
          body_en: step.body_en ?? "",
          is_pro: step.is_pro,
          position: String(step.position),
        }
      : { ...EMPTY_STEP, position: String(stepsCount + 1) },
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof StepFields>(k: K, v: StepFields[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const record = {
    title_pt: form.title_pt.trim(),
    title_en: form.title_en.trim(),
    body_pt: form.body_pt.trim() || null,
    body_en: form.body_en.trim() || null,
    is_pro: form.is_pro,
    position: Number(form.position) || 1,
  };

  const canSave = record.title_pt && record.title_en && !Number.isNaN(Number(form.position));

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    let error: { message: string } | null = null;
    if (mode === "create") {
      const res = await supabase
        .from("journey_steps")
        .insert({ ...record, stage_id: stageId! });
      error = res.error;
      if (res.error) toast.error(res.error.message);
      else toast.success("Step created");
    } else {
      const res = await supabase.from("journey_steps").update(record).eq("id", step!.id);
      error = res.error;
      if (res.error) toast.error(res.error.message);
      else toast.success("Step updated");
    }
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add step" : "Edit step"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title (en)</Label>
              <Input value={form.title_en} onChange={(e) => set("title_en", e.target.value)} placeholder="Build a portfolio" />
            </div>
            <div className="space-y-1.5">
              <Label>Title (pt)</Label>
              <Input value={form.title_pt} onChange={(e) => set("title_pt", e.target.value)} placeholder="Monte um portfólio" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Body (en)</Label>
              <Textarea value={form.body_en} onChange={(e) => set("body_en", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Body (pt)</Label>
              <Textarea value={form.body_pt} onChange={(e) => set("body_pt", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Position (order)</Label>
              <Input type="number" min={1} value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div className="flex items-end pb-1 space-x-2">
              <Label>Pro-only</Label>
              <Switch checked={form.is_pro} onCheckedChange={(v) => set("is_pro", v)} />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canSave || saving} className="gradient-go text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create step" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
