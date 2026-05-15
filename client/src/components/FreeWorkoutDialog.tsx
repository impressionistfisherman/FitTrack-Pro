import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SetEntry = {
  setNumber: number;
  weightKg: string;
  reps: string;
};

type SelectedExercise = {
  exercise: any;
  sets: SetEntry[];
};

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function makeSets(count: number, existing: SetEntry[] = []) {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weightKg: existing[index]?.weightKg ?? "",
    reps: existing[index]?.reps ?? "",
  }));
}

export default function FreeWorkoutDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const [workoutDate, setWorkoutDate] = useState(todayInputValue());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedExercise[]>([]);

  const { data: exercises } = trpc.exercises.list.useQuery({ search: search || undefined }, { enabled: open });
  const startSession = trpc.workout.startSession.useMutation();
  const addLog = trpc.workout.addLog.useMutation();
  const completeSession = trpc.workout.completeSession.useMutation();

  const filteredExercises = useMemo(() => {
    const selectedIds = new Set(selected.map((item) => item.exercise.id));
    return (exercises ?? []).filter((exercise) => !selectedIds.has(exercise.id)).slice(0, 20);
  }, [exercises, selected]);

  const addExercise = (exercise: any) => {
    setSelected((items) => [...items, { exercise, sets: makeSets(3) }]);
    setSearch("");
  };

  const updateSetCount = (exerciseId: number, count: number) => {
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId ? { ...item, sets: makeSets(count, item.sets) } : item
    )));
  };

  const updateSet = (exerciseId: number, setNumber: number, field: "weightKg" | "reps", value: string) => {
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId
        ? {
            ...item,
            sets: item.sets.map((set) => set.setNumber === setNumber ? { ...set, [field]: value } : set),
          }
        : item
    )));
  };

  const removeExercise = (exerciseId: number) => {
    setSelected((items) => items.filter((item) => item.exercise.id !== exerciseId));
  };

  const reset = () => {
    setWorkoutDate(todayInputValue());
    setSearch("");
    setSelected([]);
  };

  const handleComplete = async () => {
    const validSets = selected.flatMap((item) => item.sets.map((set) => ({ item, set })))
      .filter(({ set }) => set.reps.trim() || set.weightKg.trim());

    if (!selected.length || !validSets.length) {
      toast.error("운동과 세트 기록을 입력해주세요.");
      return;
    }

    try {
      const date = new Date(`${workoutDate}T12:00:00`);
      const session = await startSession.mutateAsync({
        name: "자유 운동 세션",
        workoutDate: date,
      });

      for (const item of selected) {
        for (const set of item.sets) {
          if (!set.reps.trim() && !set.weightKg.trim()) continue;
          await addLog.mutateAsync({
            sessionId: session.sessionId,
            exerciseId: item.exercise.id,
            setNumber: set.setNumber,
            reps: set.reps.trim() ? Number(set.reps) : undefined,
            weightKg: set.weightKg.trim() ? Number(set.weightKg) : undefined,
          });
        }
      }

      await completeSession.mutateAsync({
        sessionId: session.sessionId,
        durationMinutes: 0,
      });

      toast.success("자유 운동 기록을 저장했습니다.");
      onComplete?.();
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("운동 기록 저장에 실패했습니다.");
    }
  };

  const isSaving = startSession.isPending || addLog.isPending || completeSession.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] max-w-4xl max-h-[92vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-foreground">자유 운동 기록</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 xl:grid-cols-[280px_minmax(320px,1fr)]">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">운동 날짜</Label>
              <Input
                type="date"
                value={workoutDate}
                onChange={(event) => setWorkoutDate(event.target.value)}
                className="bg-accent border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">운동 검색</Label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="벤치, 스쿼트..."
                  className="bg-accent border-border text-foreground pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-44 rounded-lg border border-border sm:h-60 xl:h-[360px]">
              <div className="p-2 space-y-1">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExercise(exercise)}
                    className="w-full flex items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
                  >
                    <Dumbbell size={15} className="text-primary shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{exercise.nameKo}</span>
                      <span className="block text-xs text-muted-foreground truncate">{exercise.name}</span>
                    </span>
                    <Plus size={14} className="ml-auto text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <ScrollArea className="min-w-0 h-[40vh] pr-2 sm:h-[44vh] xl:h-[470px] xl:pr-3">
            <div className="min-w-0 space-y-3">
              {selected.length === 0 ? (
                <div className="h-36 rounded-lg border border-dashed border-border flex items-center justify-center px-4 text-center text-sm text-muted-foreground sm:h-48">
                  왼쪽에서 운동을 추가하세요
                </div>
              ) : (
                selected.map((item) => (
                  <div key={item.exercise.id} className="min-w-0 rounded-lg border border-border bg-accent/30 p-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{item.exercise.nameKo}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.exercise.name}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExercise(item.exercise.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Label className="w-12 shrink-0 text-xs text-muted-foreground">세트 수</Label>
                      <Select
                        value={String(item.sets.length)}
                        onValueChange={(value) => updateSetCount(item.exercise.id, Number(value))}
                      >
                        <SelectTrigger className="h-8 w-24 bg-card border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {[1, 2, 3, 4, 5].map((count) => (
                            <SelectItem key={count} value={String(count)}>{count}세트</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {item.sets.map((set) => (
                        <div key={set.setNumber} className="grid min-w-0 grid-cols-[40px_minmax(48px,1fr)_minmax(48px,1fr)] items-center gap-2 sm:grid-cols-[48px_minmax(72px,1fr)_minmax(72px,1fr)]">
                          <div className="text-xs text-muted-foreground sm:whitespace-nowrap">{set.setNumber}세트</div>
                          <Input
                            inputMode="decimal"
                            placeholder="kg"
                            value={set.weightKg}
                            onChange={(event) => updateSet(item.exercise.id, set.setNumber, "weightKg", event.target.value)}
                            className="h-8 min-w-0 bg-card border-border px-2 text-center text-foreground"
                          />
                          <Input
                            inputMode="numeric"
                            placeholder="회"
                            value={set.reps}
                            onChange={(event) => updateSet(item.exercise.id, set.setNumber, "reps", event.target.value)}
                            className="h-8 min-w-0 bg-card border-border px-2 text-center text-foreground"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="min-w-0">
            취소
          </Button>
          <Button onClick={handleComplete} disabled={isSaving || selected.length === 0} className="min-w-0">
            {isSaving ? "저장 중..." : "세션 완료"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
