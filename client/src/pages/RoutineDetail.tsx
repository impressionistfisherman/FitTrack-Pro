import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Dumbbell, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const bodyPartLabels: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨", arms: "팔",
  legs: "하체", abs: "복근", glutes: "둔근", cardio: "유산소",
  stretching: "스트레칭", full_body: "전신",
};

const bodyPartColors: Record<string, string> = {
  chest: "text-red-400 bg-red-400/10 border-red-400/20",
  back: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  shoulders: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  arms: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  legs: "text-green-400 bg-green-400/10 border-green-400/20",
  abs: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  glutes: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  cardio: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  stretching: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  full_body: "text-primary bg-primary/10 border-primary/20",
};

function AddExerciseDialog({ routineId, currentCount, onAdded }: { routineId: number; currentCount: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("all");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [rest, setRest] = useState("90");
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [setDetails, setSetDetails] = useState<Array<{setNumber: number; weightKg?: number; reps?: number}>>([]);

  const { data: exercises } = trpc.exercises.list.useQuery({
    bodyPart: selectedBodyPart !== "all" ? selectedBodyPart : undefined,
  }, { enabled: open });

  const addExercise = trpc.routines.addExercise.useMutation({
    onSuccess: () => {
      toast.success("운동이 추가되었습니다!");
      setOpen(false);
      setSelectedExercise(null);
      onAdded();
    },
    onError: () => toast.error("운동 추가에 실패했습니다."),
  });

  const filtered = exercises?.filter((ex) => {
    if (search) {
      const q = search.toLowerCase();
      return ex.nameKo.toLowerCase().includes(q) || ex.name.toLowerCase().includes(q);
    }
    return true;
  });

  const bodyParts = ["all", "chest", "back", "shoulders", "arms", "legs", "abs", "glutes", "cardio", "stretching"];
  const bodyPartKo: Record<string, string> = { all: "전체", ...bodyPartLabels };

  return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-w-[7.5rem] gap-2 whitespace-nowrap bg-primary px-4 text-primary-foreground hover:bg-primary/90">
          <Plus size={16} />운동 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">운동 추가</DialogTitle>
        </DialogHeader>

        {!selectedExercise ? (
          <div className="flex flex-col gap-3 overflow-hidden">
            <Input
              placeholder="운동 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-accent border-border text-foreground"
            />
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {bodyParts.map((bp) => (
                <button
                  key={bp}
                  onClick={() => setSelectedBodyPart(bp)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition-all",
                    selectedBodyPart === bp
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {bodyPartKo[bp] || bp}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 space-y-1.5 max-h-80">
              {filtered?.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    // 운동 선택 시 기본 세트(3)에 맞게 setDetails 자동 초기화
                    const defaultSets = parseInt(sets) || 3;
                    setSetDetails(Array.from({length: defaultSets}, (_, i) => ({
                      setNumber: i + 1,
                      weightKg: undefined,
                      reps: parseInt(reps) || 10,
                    })));
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent border border-transparent hover:border-primary/30 text-left transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{ex.nameKo}</div>
                    <div className="text-xs text-muted-foreground truncate">{ex.name}</div>
                  </div>
                  <Badge className={cn("text-[10px] border flex-shrink-0", bodyPartColors[ex.bodyPart])}>
                    {bodyPartLabels[ex.bodyPart] || ex.bodyPart}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-xl border border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dumbbell size={18} className="text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{selectedExercise.nameKo}</div>
                <div className="text-xs text-muted-foreground">{selectedExercise.name}</div>
              </div>
              <button onClick={() => setSelectedExercise(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">변경</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">세트 수</Label>
                <Input 
                  type="number" 
                  value={sets} 
                  onChange={(e) => {
                    const newSets = parseInt(e.target.value) || 1;
                    setSets(String(newSets));
                    const newDetails = Array.from({length: newSets}, (_, i) => ({
                      setNumber: i + 1,
                      weightKg: setDetails[i]?.weightKg,
                      reps: setDetails[i]?.reps || parseInt(reps)
                    }));
                    setSetDetails(newDetails);
                  }} 
                  className="bg-accent border-border text-foreground text-center" 
                  min="1" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">기본 반복 횟수</Label>
                <Input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-accent border-border text-foreground text-center" min="1" max="100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">휴식 (초)</Label>
                <Input type="number" value={rest} onChange={(e) => setRest(e.target.value)} className="bg-accent border-border text-foreground text-center" min="0" max="600" />
              </div>
            </div>

            {/* 세트별 상세 설정 */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              <Label className="text-xs text-muted-foreground block">세트별 무게 및 횟수</Label>
              {setDetails.map((detail, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 p-2.5 bg-accent/50 rounded-lg border border-border">
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">세트 {detail.setNumber}</Label>
                    <div className="text-xs font-semibold text-foreground text-center py-1.5 bg-accent rounded border border-border">
                      {detail.setNumber}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">무게 (kg)</Label>
                    <Input 
                      type="number" 
                      placeholder="무게"
                      value={detail.weightKg || ""}
                      onChange={(e) => {
                        const newDetails = [...setDetails];
                        newDetails[idx].weightKg = e.target.value ? parseFloat(e.target.value) : undefined;
                        setSetDetails(newDetails);
                      }}
                      className="bg-accent border-border text-foreground text-center text-xs h-8"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">횟수</Label>
                    <Input 
                      type="number" 
                      placeholder="횟수"
                      value={detail.reps || ""}
                      onChange={(e) => {
                        const newDetails = [...setDetails];
                        newDetails[idx].reps = e.target.value ? parseInt(e.target.value) : undefined;
                        setSetDetails(newDetails);
                      }}
                      className="bg-accent border-border text-foreground text-center text-xs h-8"
                      min="1"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => addExercise.mutate({
                routineId,
                exerciseId: selectedExercise.id,
                order: currentCount + 1,
                sets: parseInt(sets),
                reps: parseInt(reps),
                restSeconds: parseInt(rest),
                setDetails: setDetails,
              })}
              disabled={addExercise.isPending}
            >
              {addExercise.isPending ? "추가 중..." : "운동 추가"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RoutineDetail() {
  const { id } = useParams<{ id: string }>();
  const routineId = parseInt(id || "0");
  const utils = trpc.useUtils();

  const { data: routine, isLoading } = trpc.routines.detail.useQuery({ id: routineId });
  const [editingName, setEditingName] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const updateRoutine = trpc.routines.update.useMutation({
    onSuccess: () => {
      toast.success("루틴 이름을 변경했습니다.");
      setEditingName(false);
      utils.routines.detail.invalidate({ id: routineId });
      utils.routines.list.invalidate();
    },
    onError: () => toast.error("이름 변경에 실패했습니다."),
  });
  const removeExercise = trpc.routines.removeExercise.useMutation({
    onSuccess: () => { toast.success("운동이 제거되었습니다."); utils.routines.detail.invalidate({ id: routineId }); },
    onError: () => toast.error("제거에 실패했습니다."),
  });
  const startSession = trpc.workout.startSession.useMutation();

  if (isLoading) {
    return (
      <div className="page-shell page-shell-narrow">
        <div className="h-8 w-32 skeleton rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="page-shell page-shell-narrow empty-state-panel">
        <p className="text-muted-foreground">루틴을 찾을 수 없습니다.</p>
        <Link href="/routines"><Button variant="ghost" className="mt-2">돌아가기</Button></Link>
      </div>
    );
  }

  const handleStart = async () => {
    const result = await startSession.mutateAsync({ routineId: routine.id, name: routine.name });
    window.location.href = `/workout/${result.sessionId}`;
  };

  const beginNameEdit = () => {
    setRoutineName(routine.name || "");
    setEditingName(true);
  };

  const saveName = () => {
    const nextName = routineName.trim();
    if (!nextName || nextName === routine.name) {
      setEditingName(false);
      return;
    }
    updateRoutine.mutate({ id: routine.id, name: nextName });
  };

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <Link href="/routines">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground mb-4 -ml-2">
          <ArrowLeft size={16} />루틴 목록
        </Button>
      </Link>

      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex max-w-xl items-center gap-2">
              <Input
                value={routineName}
                onChange={(event) => setRoutineName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveName();
                  if (event.key === "Escape") setEditingName(false);
                }}
                className="h-10 border-border bg-accent text-xl font-bold text-foreground"
                autoFocus
              />
              <Button size="icon" className="h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90" onClick={saveName} disabled={updateRoutine.isPending}>
                <Check size={16} />
              </Button>
              <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 border-border" onClick={() => setEditingName(false)}>
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-foreground">{routine.name}</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={beginNameEdit}>
                <Pencil size={15} />
              </Button>
            </div>
          )}
          {routine.description && <p className="text-sm text-muted-foreground mt-1">{routine.description}</p>}
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">주 {routine.daysPerWeek}회</Badge>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">{routine.exercises?.length || 0}개 운동</Badge>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <AddExerciseDialog
            routineId={routineId}
            currentCount={routine.exercises?.length || 0}
            onAdded={() => utils.routines.detail.invalidate({ id: routineId })}
          />
          <Button
            className="min-w-[7.5rem] gap-2 whitespace-nowrap bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            onClick={handleStart}
            disabled={startSession.isPending || !routine.exercises?.length}
          >
            운동 시작
          </Button>
        </div>
      </div>

      {routine.exercises && routine.exercises.length > 0 ? (
        <div className="space-y-3">
          {routine.exercises.map((item: any, index: number) => (
            <Card key={item.re.id} className="bg-card border-border hover:border-primary/20 transition-colors group">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <GripVertical size={16} className="text-muted-foreground/40" />
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-sm">{item.ex.nameKo}</span>
                      <Badge className={cn("text-[10px] border", bodyPartColors[item.ex.bodyPart])}>
                        {bodyPartLabels[item.ex.bodyPart] || item.ex.bodyPart}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{item.re.sets}세트</span>
                      <span>×</span>
                      <span>{item.re.reps}회</span>
                      <span>·</span>
                      <span>휴식 {item.re.restSeconds}초</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExercise.mutate({ id: item.re.id })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Dumbbell size={36} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">아직 운동이 없습니다</p>
          <p className="text-xs text-muted-foreground mt-1">운동을 추가하여 루틴을 완성하세요</p>
        </div>
      )}
    </div>
  );
}
