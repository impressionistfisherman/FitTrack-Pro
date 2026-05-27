import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronDown, Dumbbell, ImagePlus, Loader2, Minus, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type SetEntry = {
  setNumber: number;
  weightKg: string;
  reps: string;
};

type SelectedExercise = {
  exercise: any;
  sets: SetEntry[];
  durationMinutes: string;
  distanceKm: string;
  intensity: "low" | "moderate" | "high";
};

type ExerciseAiFeedback = {
  title: string;
  fit: string;
  orderTip: string;
  volumeTip: string;
  caution: string;
  source?: "ai" | "fallback";
};

const intensityLabels = {
  low: "낮음",
  moderate: "보통",
  high: "높음",
};

const intensityMultiplier = {
  low: 0.8,
  moderate: 1,
  high: 1.2,
};

const captureInputId = "free-workout-capture-input";

const sportsNames = new Set(["농구", "축구", "배드민턴", "테니스", "탁구", "배구"]);

function getExerciseInputMode(exercise: any): "strength" | "cardio" | "duration" {
  if (exercise.category === "cardio" || exercise.bodyPart === "cardio" || sportsNames.has(exercise.nameKo)) return "cardio";
  if (exercise.category === "flexibility" || exercise.bodyPart === "stretching") return "duration";
  return "strength";
}

function getMet(exercise: any) {
  const name = `${exercise.nameKo ?? ""} ${exercise.name ?? ""}`.toLowerCase();
  if (name.includes("농구") || name.includes("basketball")) return 6.5;
  if (name.includes("축구") || name.includes("soccer")) return 7;
  if (name.includes("배드민턴") || name.includes("badminton")) return 5.5;
  if (name.includes("테니스") || name.includes("tennis")) return 7;
  if (name.includes("탁구") || name.includes("table tennis")) return 4;
  if (name.includes("배구") || name.includes("volleyball")) return 4.5;
  if (name.includes("running") || name.includes("러닝")) return 8;
  if (name.includes("cycling") || name.includes("자전거")) return 6.8;
  if (name.includes("rowing") || name.includes("로잉")) return 7;
  if (getExerciseInputMode(exercise) === "duration") return 2.5;
  return 4.5;
}

function getStrengthMet(item: SelectedExercise) {
  const filledSets = item.sets.filter((set) => set.reps.trim() || set.weightKg.trim());
  const volume = filledSets.reduce((sum, set) => sum + (Number(set.weightKg) || 0) * (Number(set.reps) || 0), 0);
  if (filledSets.length >= 18 || volume >= 18000) return 4.2;
  if (filledSets.length >= 10 || volume >= 9000) return 3.9;
  return 3.6;
}

function estimateExerciseCalories(item: SelectedExercise, bodyWeightKg = 70, durationOverride?: number) {
  const mode = getExerciseInputMode(item.exercise);
  const minutes = durationOverride ?? estimateExerciseDuration(item);
  if (!minutes) return 0;

  if (mode === "strength") {
    const filledSets = item.sets.filter((set) => set.reps.trim() || set.weightKg.trim());
    const volume = filledSets.reduce((sum, set) => sum + (Number(set.weightKg) || 0) * (Number(set.reps) || 0), 0);
    const metCalories = (getStrengthMet(item) * 3.5 * bodyWeightKg / 200) * minutes;
    const volumeBonus = Math.min(80, volume * 0.002);
    return Math.round(metCalories * intensityMultiplier[item.intensity] + volumeBonus);
  }

  const met = getMet(item.exercise) * intensityMultiplier[item.intensity];
  return Math.round((met * 3.5 * bodyWeightKg / 200) * minutes);
}

function estimateExerciseDuration(item: SelectedExercise) {
  const mode = getExerciseInputMode(item.exercise);
  if (mode === "strength") {
    return Math.ceil(item.sets.filter((set) => set.reps.trim() || set.weightKg.trim()).length * 4);
  }
  return Number(item.durationMinutes) || 0;
}

function hasExerciseInput(item: SelectedExercise) {
  const mode = getExerciseInputMode(item.exercise);
  if (mode === "strength") return item.sets.some((set) => set.reps.trim() || set.weightKg.trim());
  return Number(item.durationMinutes) > 0;
}

function todayInputValue() {
  const date = new Date();
  return toDateInputValue(date);
}

function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateInputValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDateLabel(value: string) {
  return parseDateInputValue(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function makeSets(count: number, existing: SetEntry[] = []) {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weightKg: existing[index]?.weightKg ?? "",
    reps: existing[index]?.reps ?? "",
  }));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
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
  const [workoutDurationMinutes, setWorkoutDurationMinutes] = useState("");
  const [search, setSearch] = useState("");
  const [exerciseSearchOpen, setExerciseSearchOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [captureMessage, setCaptureMessage] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState<ExerciseAiFeedback | null>(null);
  const exerciseSearchRef = useRef<HTMLDivElement | null>(null);
  const shouldShowExerciseList = exerciseSearchOpen || search.trim().length > 0;

  const { data: exercises, isLoading: exercisesLoading, isFetching: exercisesFetching } = trpc.exercises.list.useQuery(
    { search: search || undefined },
    { enabled: open && shouldShowExerciseList, staleTime: 1000 * 60 * 5 }
  );
  const { data: weights } = trpc.bodyWeight.list.useQuery(
    { limit: 1 },
    { enabled: open, staleTime: 1000 * 60 * 5 }
  );
  const startSession = trpc.workout.startSession.useMutation();
  const addLog = trpc.workout.addLog.useMutation();
  const completeSession = trpc.workout.completeSession.useMutation();
  const parseWorkoutCapture = trpc.ai.parseWorkoutCapture.useMutation();
  const exerciseSelectionFeedback = trpc.ai.exerciseSelectionFeedback.useMutation({
    onSuccess: (data) => setExerciseFeedback(data as ExerciseAiFeedback),
    onError: () => toast.error("AI 운동 피드백을 불러오지 못했습니다."),
  });

  const filteredExercises = useMemo(() => {
    const selectedIds = new Set(selected.map((item) => item.exercise.id));
    return (exercises ?? []).filter((exercise) => !selectedIds.has(exercise.id)).slice(0, 20);
  }, [exercises, selected]);

  const closeExerciseSearchIfLeaving = (nextFocus: EventTarget | null) => {
    if (nextFocus instanceof Node && exerciseSearchRef.current?.contains(nextFocus)) return;
    setExerciseSearchOpen(false);
  };

  const addExercise = (exercise: any) => {
    if (selected.some((item) => item.exercise.id === exercise.id)) {
      toast.info("이미 추가된 운동입니다.");
      return;
    }
    const mode = getExerciseInputMode(exercise);
    setSelected((items) => [...items, {
      exercise,
      sets: mode === "strength" ? makeSets(3) : makeSets(1),
      durationMinutes: mode === "strength" ? "" : "30",
      distanceKm: "",
      intensity: "moderate",
    }]);
    setSearch("");
    setExerciseSearchOpen(true);
    toast.success(`${exercise.nameKo}을(를) 기록 목록에 추가했습니다.`);
    setExerciseFeedback({
      title: `${exercise.nameKo} 추가 피드백`,
      fit: "AI가 현재 운동 구성과 목표를 보고 피드백을 준비하고 있습니다.",
      orderTip: "잠시만 기다리면 배치 순서 조언이 표시됩니다.",
      volumeTip: "세트와 횟수를 입력하면 볼륨 판단이 더 정확해집니다.",
      caution: "통증이 있으면 중량보다 자세를 우선하세요.",
      source: "fallback",
    });
    exerciseSelectionFeedback.mutate({
      exerciseId: exercise.id,
      selectedExerciseIds: [...selected.map((item) => item.exercise.id), exercise.id],
    });
  };

  const updateSetCount = (exerciseId: number, count: number) => {
    if (!Number.isFinite(count) || count < 1) return;
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId ? { ...item, sets: makeSets(count, item.sets) } : item
    )));
  };

  const addSetToExercise = (exerciseId: number) => {
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId ? { ...item, sets: makeSets(item.sets.length + 1, item.sets) } : item
    )));
  };

  const removeSetFromExercise = (exerciseId: number) => {
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId && item.sets.length > 1
        ? { ...item, sets: makeSets(item.sets.length - 1, item.sets) }
        : item
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

  const updateExerciseField = (exerciseId: number, field: "durationMinutes" | "distanceKm" | "intensity", value: string) => {
    setSelected((items) => items.map((item) => (
      item.exercise.id === exerciseId ? { ...item, [field]: value } : item
    )));
  };

  const removeExercise = (exerciseId: number) => {
    setSelected((items) => {
      const removed = items.find((item) => item.exercise.id === exerciseId);
      if (removed) toast.info(`${removed.exercise.nameKo}을(를) 기록 목록에서 제거했습니다.`);
      if (removed && exerciseFeedback?.title?.includes(removed.exercise.nameKo)) setExerciseFeedback(null);
      return items.filter((item) => item.exercise.id !== exerciseId);
    });
  };

  const reset = () => {
    setWorkoutDate(todayInputValue());
    setWorkoutDurationMinutes("");
    setSearch("");
    setExerciseSearchOpen(false);
    setSelected([]);
    setCaptureMessage("");
    setExerciseFeedback(null);
  };

  const handleCaptureUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("운동 기록 캡처 이미지만 업로드해주세요.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("이미지는 4MB 이하로 올려주세요.");
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const result = await parseWorkoutCapture.mutateAsync({ imageDataUrl });
      const parsedItems: SelectedExercise[] = result.exercises.map((item: any) => {
        const mode = getExerciseInputMode(item.exercise);
        const parsedSets = Array.isArray(item.sets) && item.sets.length
          ? item.sets
          : [{ setNumber: 1, weightKg: 0, reps: 0 }];

        return {
          exercise: item.exercise,
          sets: mode === "strength"
            ? makeSets(parsedSets.length).map((set, index) => ({
                ...set,
                weightKg: parsedSets[index]?.weightKg ? String(parsedSets[index].weightKg) : "",
                reps: parsedSets[index]?.reps ? String(parsedSets[index].reps) : "",
              }))
            : makeSets(1),
          durationMinutes: mode === "strength"
            ? ""
            : String(item.durationMinutes || parsedSets[0]?.durationMinutes || 30),
          distanceKm: item.distanceKm ? String(item.distanceKm) : "",
          intensity: item.intensity ?? "moderate",
        };
      });

      if (result.workoutDate) setWorkoutDate(result.workoutDate);
      setSelected((items) => {
        const existingIds = new Set(items.map((item) => item.exercise.id));
        return [...items, ...parsedItems.filter((item) => !existingIds.has(item.exercise.id))];
      });
      const parsedDuration = parsedItems.reduce((sum, item) => sum + estimateExerciseDuration(item), 0);
      if (parsedDuration > 0 && !workoutDurationMinutes.trim()) {
        setWorkoutDurationMinutes(String(parsedDuration));
      }

      const feedbackTarget = parsedItems.find((item) => item.exercise?.id);
      if (feedbackTarget) {
        setExerciseFeedback({
          title: `${feedbackTarget.exercise.nameKo} 추가 피드백`,
          fit: "캡처로 불러온 운동 구성을 AI가 확인하고 있습니다.",
          orderTip: "잠시만 기다리면 순서와 구성 조언이 표시됩니다.",
          volumeTip: "운동 시간을 실제 진행 시간으로 수정하면 칼로리 판단이 더 정확해집니다.",
          caution: "캡처 인식값은 저장 전에 무게와 횟수를 한 번 확인하세요.",
          source: "fallback",
        });
        exerciseSelectionFeedback.mutate({
          exerciseId: feedbackTarget.exercise.id,
          selectedExerciseIds: [
            ...selected.map((item) => item.exercise.id),
            ...parsedItems.map((item) => item.exercise.id),
          ],
        });
      }

      const addedCount = parsedItems.filter((item: SelectedExercise) => item.exercise?.id).length;
      const reviewNotes = [
        result.confidence ? `정확도 ${Math.round(result.confidence * 100)}%` : "분석 완료",
        result.unmatched.length ? `미매칭 ${result.unmatched.length}개` : null,
        "저장 전 무게/횟수 확인",
      ].filter(Boolean).join(" · ");
      setCaptureMessage(`${addedCount}개 운동 추가됨 · ${reviewNotes}`);
      toast.success(`이미지에서 운동 ${addedCount}개를 추가했습니다.`);
    } catch (error) {
      console.error(error);
      toast.error("캡처 분석에 실패했습니다. 더 선명한 이미지로 다시 시도해주세요.");
    }
  };

  const handleComplete = async () => {
    const validEntries = selected.filter(hasExerciseInput);

    if (!selected.length || !validEntries.length) {
      toast.error("운동 기록을 입력해주세요.");
      return;
    }

    try {
      const date = new Date(`${workoutDate}T12:00:00`);
      const session = await startSession.mutateAsync({
        name: "자유 운동 세션",
        workoutDate: date,
      });

      for (const item of selected) {
        const mode = getExerciseInputMode(item.exercise);
        if (mode === "strength") {
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
          continue;
        }

        if (Number(item.durationMinutes) > 0) {
          await addLog.mutateAsync({
            sessionId: session.sessionId,
            exerciseId: item.exercise.id,
            setNumber: 1,
            durationSeconds: Math.round(Number(item.durationMinutes) * 60),
            distanceM: item.distanceKm.trim() ? Number(item.distanceKm) * 1000 : undefined,
            notes: `강도: ${intensityLabels[item.intensity]}`,
          });
        }
      }

      await completeSession.mutateAsync({
        sessionId: session.sessionId,
        durationMinutes: Math.max(0, enteredWorkoutDuration || selected.reduce((sum, item) => sum + estimateExerciseDuration(item), 0)),
        notes: `예상 소모 칼로리: ${totalCalories}kcal`,
      });

      toast.success("운동 기록을 저장했습니다.");
      onComplete?.();
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("운동 기록 저장에 실패했습니다.");
    }
  };

  const isSaving = startSession.isPending || addLog.isPending || completeSession.isPending;
  const isParsingCapture = parseWorkoutCapture.isPending;
  const bodyWeightKg = weights?.[0]?.weightKg ?? 70;
  const enteredWorkoutDuration = Math.max(0, Number(workoutDurationMinutes) || 0);
  const estimatedDuration = selected.reduce((sum, item) => sum + estimateExerciseDuration(item), 0);
  const totalDuration = enteredWorkoutDuration || estimatedDuration;
  const timedDuration = selected.reduce((sum, item) => (
    getExerciseInputMode(item.exercise) === "strength" ? sum : sum + estimateExerciseDuration(item)
  ), 0);
  const estimatedStrengthDuration = selected.reduce((sum, item) => (
    getExerciseInputMode(item.exercise) === "strength" ? sum + estimateExerciseDuration(item) : sum
  ), 0);
  const actualStrengthDuration = enteredWorkoutDuration
    ? Math.max(0, enteredWorkoutDuration - timedDuration)
    : estimatedStrengthDuration;
  const getAllocatedDuration = (item: SelectedExercise) => {
    if (getExerciseInputMode(item.exercise) !== "strength") return estimateExerciseDuration(item);
    if (!actualStrengthDuration || !estimatedStrengthDuration) return estimateExerciseDuration(item);
    return Math.max(1, Math.round(actualStrengthDuration * (estimateExerciseDuration(item) / estimatedStrengthDuration)));
  };
  const totalCalories = selected.reduce((sum, item) => sum + estimateExerciseCalories(item, bodyWeightKg, getAllocatedDuration(item)), 0);
  const totalStrengthSets = selected.reduce((sum, item) => {
    if (getExerciseInputMode(item.exercise) !== "strength") return sum;
    return sum + item.sets.filter((set) => set.reps.trim() || set.weightKg.trim()).length;
  }, 0);
  const totalVolume = selected.reduce((sum, item) => {
    if (getExerciseInputMode(item.exercise) !== "strength") return sum;
    return sum + item.sets.reduce((inner, set) => inner + (Number(set.weightKg) || 0) * (Number(set.reps) || 0), 0);
  }, 0);
  const selectedWorkoutDate = parseDateInputValue(workoutDate);
  const canSave = selected.some(hasExerciseInput);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex max-h-[90dvh] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-border bg-card p-0 text-foreground",
        selected.length > 0 ? "sm:max-w-[min(100vw-2rem,54rem)]" : "sm:max-w-[26rem]"
      )}>
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-foreground">운동 기록 추가</DialogTitle>
        </DialogHeader>

        <div className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4",
          selected.length > 0 && "lg:grid-cols-[300px_minmax(0,1fr)] lg:items-stretch"
        )}>
          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">운동 날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between border-border bg-accent px-3 font-normal text-foreground hover:bg-accent/80 hover:text-foreground"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CalendarDays size={15} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{formatDateLabel(workoutDate)}</span>
                    </span>
                    <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border-border bg-popover p-0 text-popover-foreground">
                  <Calendar
                    mode="single"
                    selected={selectedWorkoutDate}
                    onSelect={(date) => {
                      if (date) setWorkoutDate(toDateInputValue(date));
                    }}
                    disabled={(date) => date > new Date()}
                    buttonVariant="ghost"
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">실제 운동 시간</Label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={workoutDurationMinutes}
                  onChange={(event) => setWorkoutDurationMinutes(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={estimatedDuration > 0 ? `${estimatedDuration}` : "예: 90"}
                  className="bg-accent border-border pr-12 text-foreground"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  분
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                입력하면 칼로리와 저장 시간이 이 값 기준으로 계산됩니다.
              </p>
            </div>

            <label
              htmlFor={captureInputId}
              className={cn(
                "block rounded-lg border p-3 transition-colors",
                isSaving || isParsingCapture
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
                captureMessage
                  ? "border-primary/25 bg-primary/5"
                  : "border-dashed border-border bg-accent/20"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {isParsingCapture ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {isParsingCapture ? "이미지 분석 중" : captureMessage ? "이미지 다시 추가" : "이미지로 추가"}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    운동 기록 화면을 올리면 AI가 운동, 세트, 무게, 횟수를 채워줍니다.
                  </div>
                  {captureMessage && (
                    <div className="mt-2 rounded-md bg-background/40 px-2 py-1.5 text-xs leading-relaxed text-primary">
                      {captureMessage}
                    </div>
                  )}
                </div>
                <input
                  id={captureInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isSaving || isParsingCapture}
                  onChange={(event) => {
                    void handleCaptureUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </label>

            <div
              ref={exerciseSearchRef}
              onBlur={(event) => closeExerciseSearchIfLeaving(event.relatedTarget)}
              className="space-y-1.5"
            >
              <Label className="text-xs text-muted-foreground">운동 검색</Label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onFocus={() => setExerciseSearchOpen(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setExerciseSearchOpen(true);
                  }}
                  placeholder="벤치, 스쿼트..."
                  className="bg-accent border-border text-foreground pl-9"
                />
              </div>

              {shouldShowExerciseList && (
                <ScrollArea className="h-56 rounded-lg border border-border lg:h-[224px]">
                  <div className="p-2 space-y-1">
                    {exercisesLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-2 rounded-md p-2">
                          <div className="h-4 w-4 skeleton rounded" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3.5 w-2/3 skeleton rounded" />
                            <div className="h-3 w-1/2 skeleton rounded" />
                          </div>
                        </div>
                      ))
                    ) : filteredExercises.length > 0 ? filteredExercises.map((exercise) => (
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
                    )) : (
                      <div className="flex h-28 items-center justify-center rounded-md text-center text-sm text-muted-foreground">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
            {shouldShowExerciseList && exercisesFetching && !exercisesLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                목록 업데이트 중
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="min-h-0 min-w-0 rounded-xl border border-border bg-accent/10 p-3 lg:min-h-[360px] lg:max-h-[calc(90dvh-11rem)] lg:overflow-y-auto">
              <div className="space-y-3">
                {(exerciseSelectionFeedback.isPending || exerciseFeedback) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-primary">
                      <span className="flex items-center gap-2">
                        <Sparkles size={14} />
                        AI 운동 추가 피드백
                      </span>
                      {exerciseSelectionFeedback.isPending && (
                        <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          <Loader2 size={10} className="animate-spin" />
                          AI 분석 중
                        </span>
                      )}
                    </div>
                    {exerciseFeedback ? (
                      <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                        <p className="font-semibold text-foreground">{exerciseFeedback.title}</p>
                        <p>{exerciseFeedback.fit}</p>
                        <p><span className="font-semibold text-foreground">순서:</span> {exerciseFeedback.orderTip}</p>
                        <p><span className="font-semibold text-foreground">볼륨:</span> {exerciseFeedback.volumeTip}</p>
                        <p><span className="font-semibold text-foreground">주의:</span> {exerciseFeedback.caution}</p>
                      </div>
                    ) : exerciseSelectionFeedback.isPending ? (
                      <div className="text-xs text-muted-foreground">운동 구성 피드백을 준비하고 있습니다.</div>
                    ) : null}
                  </div>
                )}
                {selected.map((item) => (
                  <div key={item.exercise.id} className="min-w-0 rounded-lg border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{item.exercise.nameKo}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.exercise.name}</div>
                      </div>
                      <div className="ml-auto shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">
                        {getExerciseInputMode(item.exercise) === "strength" ? "세트 기록" : getExerciseInputMode(item.exercise) === "cardio" ? "시간/거리" : "시간 기록"}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExercise(item.exercise.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>

                    {getExerciseInputMode(item.exercise) === "strength" ? (
                      <>
                        <div className="mb-3 grid grid-cols-[44px_auto_1fr] items-center gap-2">
                          <Label className="shrink-0 text-xs text-muted-foreground">세트 수</Label>
                          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => removeSetFromExercise(item.exercise.id)}
                              disabled={item.sets.length <= 1}
                            >
                              <Minus size={13} />
                            </Button>
                            <Input
                              inputMode="numeric"
                              value={String(item.sets.length)}
                              onChange={(event) => updateSetCount(item.exercise.id, Number(event.target.value))}
                              className="h-7 w-14 border-0 bg-transparent p-0 text-center text-sm font-semibold text-foreground focus-visible:ring-0"
                              aria-label="세트 수"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() => addSetToExercise(item.exercise.id)}
                            >
                              <Plus size={13} />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 justify-self-start gap-1 border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => addSetToExercise(item.exercise.id)}
                          >
                            <Plus size={12} />
                            세트 추가
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {item.sets.map((set) => (
                            <div key={set.setNumber} className="grid min-w-0 grid-cols-[44px_minmax(72px,1fr)_minmax(72px,1fr)] items-center gap-2 sm:grid-cols-[52px_minmax(100px,1fr)_minmax(100px,1fr)]">
                              <div className="text-xs text-muted-foreground sm:whitespace-nowrap">{set.setNumber}세트</div>
                              <Input
                                inputMode="decimal"
                                placeholder="kg"
                                value={set.weightKg}
                                onChange={(event) => updateSet(item.exercise.id, set.setNumber, "weightKg", event.target.value)}
                                className="h-8 min-w-0 rounded-lg bg-card border-border px-2 text-center text-foreground"
                              />
                              <Input
                                inputMode="numeric"
                                placeholder="회"
                                value={set.reps}
                                onChange={(event) => updateSet(item.exercise.id, set.setNumber, "reps", event.target.value)}
                                className="h-8 min-w-0 rounded-lg bg-card border-border px-2 text-center text-foreground"
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">시간 (분)</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="30"
                            value={item.durationMinutes}
                            onChange={(event) => updateExerciseField(item.exercise.id, "durationMinutes", event.target.value)}
                            className="h-9 bg-card border-border text-center text-foreground"
                          />
                        </div>
                        {getExerciseInputMode(item.exercise) === "cardio" && (
                          <div>
                            <Label className="mb-1 block text-xs text-muted-foreground">거리 (km)</Label>
                            <Input
                              inputMode="decimal"
                              placeholder="선택"
                              value={item.distanceKm}
                              onChange={(event) => updateExerciseField(item.exercise.id, "distanceKm", event.target.value)}
                              className="h-9 bg-card border-border text-center text-foreground"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">강도</Label>
                          <Select
                            value={item.intensity}
                            onValueChange={(value) => updateExerciseField(item.exercise.id, "intensity", value)}
                          >
                            <SelectTrigger className="h-9 bg-card border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="low">낮음</SelectItem>
                              <SelectItem value="moderate">보통</SelectItem>
                              <SelectItem value="high">높음</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 rounded-lg bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                      예상 소모: <span className="font-semibold text-primary">{estimateExerciseCalories(item, bodyWeightKg, getAllocatedDuration(item))} kcal</span>
                      <span className="mx-2">·</span>
                      계산 시간: <span className="font-semibold text-foreground">{getAllocatedDuration(item)}분</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid shrink-0 gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:flex sm:items-center sm:justify-between">
          {selected.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-[30rem] sm:grid-cols-4">
              <div className="flex h-12 flex-col items-center justify-center rounded-lg border border-border bg-accent/40 px-3">
                <div className="text-base font-bold text-foreground">{selected.length}</div>
                <div className="text-muted-foreground">운동 종류</div>
              </div>
              <div className="flex h-12 flex-col items-center justify-center rounded-lg border border-border bg-accent/40 px-3">
                <div className="text-base font-bold text-foreground">{totalStrengthSets}</div>
                <div className="text-muted-foreground">근력 세트</div>
              </div>
              <div className="flex h-12 flex-col items-center justify-center rounded-lg border border-border bg-accent/40 px-3">
                <div className="text-base font-bold text-primary">{totalCalories}</div>
                <div className="text-muted-foreground">예상 kcal</div>
              </div>
              <div className="flex h-12 flex-col items-center justify-center rounded-lg border border-border bg-accent/40 px-3">
                <div className="text-base font-bold text-foreground">{totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalDuration}분`}</div>
                <div className="text-muted-foreground">{totalVolume > 0 ? "총 볼륨" : "예상 시간"}</div>
              </div>
            </div>
          ) : <div />}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isParsingCapture} className="h-10 min-w-0">
              취소
            </Button>
            <Button onClick={handleComplete} disabled={isSaving || isParsingCapture || !canSave} className="h-10 min-w-0">
              {isSaving ? "저장 중..." : "운동 기록 저장"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
