import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Calculator, ChevronDown, ChevronUp, Clock, Dumbbell, MessageSquare,
  Flame, Minus, MonitorOff, MonitorUp, Plus, RefreshCw, Save, X, CheckCircle, Timer, Trophy
} from "lucide-react";
import OneRMCalculator from "@/components/OneRMCalculator";
import WorkoutShareCard from "@/components/WorkoutShareCard";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useWakeLock } from "@/hooks/useWakeLock";
import RestTimerOverlay from "@/components/RestTimerOverlay";

interface SetLog {
  setNumber: number;
  reps: number;
  weightKg: number;
  isWarmup: boolean;
  completed: boolean;
  rpe?: number;
  memo?: string;
  logId?: number;
}

interface ExerciseEntry {
  exerciseId: number;
  nameKo: string;
  name: string;
  restSeconds: number;
  sets: SetLog[];
  expanded: boolean;
}

function estimateCalories(durationMinutes: number, completedSets: number) {
  return Math.max(0, Math.round(durationMinutes * 5.5 + completedSets * 2));
}

function TimerDisplay({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono text-primary font-bold">
      {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

// RPE 색상
function rpeColor(rpe: number) {
  if (rpe <= 3) return "text-green-400 bg-green-400/15 border-green-400/30";
  if (rpe <= 6) return "text-yellow-400 bg-yellow-400/15 border-yellow-400/30";
  if (rpe <= 8) return "text-orange-400 bg-orange-400/15 border-orange-400/30";
  return "text-red-400 bg-red-400/15 border-red-400/30";
}

function RPESelector({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? undefined : n)}
          className={cn(
            "w-7 h-7 rounded-lg text-xs font-bold border transition-all",
            value === n
              ? rpeColor(n)
              : "bg-accent border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function AddExerciseModal({ onAdd }: { onAdd: (exercise: any, restSecs: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState("all");
  const [restSecs, setRestSecs] = useState(90);

  const { data: exercises } = trpc.exercises.list.useQuery(
    { bodyPart: bodyPart !== "all" ? bodyPart : undefined },
    { enabled: open }
  );

  const filtered = exercises?.filter(ex => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ex.nameKo.toLowerCase().includes(q) || ex.name.toLowerCase().includes(q);
  });

  const bodyParts = ["all", "chest", "back", "shoulders", "arms", "legs", "abs", "glutes", "cardio", "stretching"];
  const bpKo: Record<string, string> = {
    all: "전체", chest: "가슴", back: "등", shoulders: "어깨", arms: "팔",
    legs: "하체", abs: "복근", glutes: "둔근", cardio: "유산소", stretching: "스트레칭",
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 w-full h-12"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} />운동 추가
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>운동 선택</DialogTitle></DialogHeader>
          <Input placeholder="운동 검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-accent border-border text-foreground" />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {bodyParts.map(bp => (
              <button key={bp} onClick={() => setBodyPart(bp)}
                className={cn("px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition-all",
                  bodyPart === bp ? "bg-primary text-primary-foreground border-primary" : "bg-accent border-border text-muted-foreground")}>
                {bpKo[bp]}
              </button>
            ))}
          </div>
          {/* 휴식 시간 설정 */}
          <div className="flex items-center gap-3 px-1 py-2 bg-accent/50 rounded-xl border border-border">
            <Timer size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">세트 간 휴식</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setRestSecs(s => Math.max(15, s - 15))}
                className="w-6 h-6 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Minus size={10} />
              </button>
              <span className="text-sm font-semibold text-foreground w-12 text-center">{restSecs}초</span>
              <button onClick={() => setRestSecs(s => Math.min(300, s + 15))}
                className="w-6 h-6 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Plus size={10} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 space-y-1.5">
            {filtered?.map(ex => (
              <button key={ex.id} onClick={() => { onAdd(ex, restSecs); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent border border-transparent hover:border-primary/30 text-left transition-all">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{ex.nameKo}</div>
                  <div className="text-xs text-muted-foreground">{ex.name}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExerciseBlock({ entry, sessionId, onUpdate, onRemove, onSetComplete, routineAlternatives = [] }:
  {
    entry: ExerciseEntry;
    sessionId: number;
    onUpdate: (e: ExerciseEntry) => void;
    onRemove: () => void;
    onSetComplete: (restSecs: number) => void;
    routineAlternatives?: { id: number; nameKo: string; name: string; restSeconds?: number }[];
  }) {

  const addLog = trpc.workout.addLog.useMutation();
  const deleteLog = trpc.workout.deleteLog.useMutation();
  const [showMemoIdx, setShowMemoIdx] = useState<number | null>(null);

  const toggleExpand = () => onUpdate({ ...entry, expanded: !entry.expanded });

  const updateSet = (idx: number, field: keyof SetLog, value: any) => {
    const sets = [...entry.sets];
    sets[idx] = { ...sets[idx], [field]: value };
    onUpdate({ ...entry, sets });
  };

  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1];
    onUpdate({
      ...entry,
      sets: [...entry.sets, {
        setNumber: entry.sets.length + 1,
        reps: last?.reps || 10,
        weightKg: last?.weightKg || 0,
        isWarmup: false,
        completed: false,
      }],
    });
  };

  const removeSet = (idx: number) => {
    if (entry.sets.length <= 1) return;
    onUpdate({ ...entry, sets: entry.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })) });
  };

  const completeSet = async (idx: number) => {
    const set = entry.sets[idx];
    if (set.completed) {
      if (set.logId) { try { await deleteLog.mutateAsync({ logId: set.logId }); } catch {} }
      updateSet(idx, "completed", false);
      return;
    }
    try {
      const result = await addLog.mutateAsync({
        sessionId,
        exerciseId: entry.exerciseId,
        setNumber: set.setNumber,
        reps: set.reps,
        weightKg: set.weightKg,
        isWarmup: set.isWarmup,
        rpe: set.rpe,
        memo: set.memo,
      });
      const sets = [...entry.sets];
      sets[idx] = { ...set, completed: true, logId: result.logId ?? undefined };
      onUpdate({ ...entry, sets });
      toast.success(`세트 ${set.setNumber} 완료!`);
      // 마지막 세트가 아니면 휴식 타이머 시작
      if (idx < entry.sets.length - 1) {
        onSetComplete(entry.restSeconds);
      }
    } catch {
      toast.error("기록 저장에 실패했습니다.");
    }
  };

  const completedCount = entry.sets.filter(s => s.completed).length;
  const canChangeExercise = routineAlternatives.length > 1 && completedCount === 0;

  const changeExercise = (exercise: { id: number; nameKo: string; name: string; restSeconds?: number }) => {
    if (!canChangeExercise) return;
    onUpdate({
      ...entry,
      exerciseId: exercise.id,
      nameKo: exercise.nameKo,
      name: exercise.name,
      restSeconds: exercise.restSeconds ?? entry.restSeconds,
    });
    toast.success(`${exercise.nameKo}로 변경했습니다.`);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Dumbbell size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground text-sm">{entry.nameKo}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{completedCount}/{entry.sets.length} 세트</span>
              <span>·</span>
              <Timer size={10} />
              <span>{entry.restSeconds}초 휴식</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {routineAlternatives.length > 1 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    disabled={!canChangeExercise}
                    title={completedCount > 0 ? "완료한 세트가 있는 운동은 변경할 수 없습니다." : "루틴 내 운동으로 변경"}
                  >
                    <RefreshCw size={13} />
                    <span className="hidden sm:inline">변경</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground max-w-md">
                  <DialogHeader><DialogTitle>루틴 내 운동으로 변경</DialogTitle></DialogHeader>
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                    {routineAlternatives.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => changeExercise(exercise)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          exercise.id === entry.exerciseId
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-accent/50 text-foreground hover:border-primary/30"
                        )}
                      >
                        <Dumbbell size={14} className="flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{exercise.nameKo}</div>
                          <div className="truncate text-xs text-muted-foreground">{exercise.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <button onClick={toggleExpand} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
              {entry.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-1 bg-accent rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${entry.sets.length > 0 ? (completedCount / entry.sets.length) * 100 : 0}%` }} />
        </div>

        {entry.expanded && (
          <div className="space-y-2">
            {/* 헤더 */}
            <div className="grid grid-cols-12 gap-1 text-[10px] text-muted-foreground px-1">
              <div className="col-span-1 text-center">세트</div>
              <div className="col-span-4 text-center">무게(kg)</div>
              <div className="col-span-4 text-center">횟수</div>
              <div className="col-span-2 text-center">완료</div>
              <div className="col-span-1" />
            </div>

            {entry.sets.map((set, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className={cn(
                  "grid grid-cols-12 gap-1 items-center p-2 rounded-xl transition-all",
                  set.completed ? "bg-primary/10 border border-primary/20" : "bg-accent/40"
                )}>
                  <div className="col-span-1 text-xs font-bold text-center text-muted-foreground">
                    {set.isWarmup ? "W" : set.setNumber}
                  </div>
                  {/* 무게 */}
                  <div className="col-span-4 flex items-center gap-0.5">
                    <button onClick={() => updateSet(idx, "weightKg", Math.max(0, set.weightKg - 2.5))}
                      className="w-5 h-5 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Minus size={9} />
                    </button>
                    <Input type="number" value={set.weightKg}
                      onChange={e => updateSet(idx, "weightKg", parseFloat(e.target.value) || 0)}
                      className="h-6 text-center text-xs bg-card border-border text-foreground p-0.5" step="2.5" min="0" />
                    <button onClick={() => updateSet(idx, "weightKg", set.weightKg + 2.5)}
                      className="w-5 h-5 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Plus size={9} />
                    </button>
                  </div>
                  {/* 횟수 */}
                  <div className="col-span-4 flex items-center gap-0.5">
                    <button onClick={() => updateSet(idx, "reps", Math.max(1, set.reps - 1))}
                      className="w-5 h-5 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Minus size={9} />
                    </button>
                    <Input type="number" value={set.reps}
                      onChange={e => updateSet(idx, "reps", parseInt(e.target.value) || 0)}
                      className="h-6 text-center text-xs bg-card border-border text-foreground p-0.5" min="1" />
                    <button onClick={() => updateSet(idx, "reps", set.reps + 1)}
                      className="w-5 h-5 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Plus size={9} />
                    </button>
                  </div>
                  {/* 완료 */}
                  <div className="col-span-2 flex justify-center">
                    <button onClick={() => completeSet(idx)}
                      className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        set.completed ? "bg-primary text-primary-foreground" : "bg-accent border border-border text-muted-foreground hover:border-primary/40")}
                      disabled={addLog.isPending}>
                      <CheckCircle size={14} />
                    </button>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeSet(idx)} className="text-muted-foreground/40 hover:text-muted-foreground">
                      <X size={11} />
                    </button>
                  </div>
                </div>

                {/* RPE + 메모 확장 영역 */}
                <div className="flex items-center gap-2 px-1">
                  {/* RPE 표시/토글 */}
                  {set.rpe ? (
                    <button onClick={() => setShowMemoIdx(showMemoIdx === idx ? null : idx)}
                      className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", rpeColor(set.rpe))}>
                      RPE {set.rpe}
                    </button>
                  ) : (
                    <button onClick={() => setShowMemoIdx(showMemoIdx === idx ? null : idx)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Plus size={9} />RPE/메모
                    </button>
                  )}
                  {set.memo && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      "{set.memo}"
                    </span>
                  )}
                </div>

                {/* RPE + 메모 입력 패널 */}
                {showMemoIdx === idx && (
                  <div className="px-1 py-2 bg-accent/30 rounded-xl border border-border space-y-2 animate-slide-up">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">
                        체감 강도 (RPE) — 1: 매우 쉬움 · 10: 최대 한계
                      </div>
                      <RPESelector value={set.rpe} onChange={v => updateSet(idx, "rpe", v)} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1 font-medium flex items-center gap-1">
                        <MessageSquare size={9} />메모 (선택)
                      </div>
                      <Input
                        placeholder="이 세트에 대한 메모..."
                        value={set.memo || ""}
                        onChange={e => updateSet(idx, "memo", e.target.value)}
                        className="h-7 text-xs bg-card border-border text-foreground"
                        maxLength={200}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="ghost" size="sm"
              className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40"
              onClick={addSet}>
              <Plus size={12} />세트 추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkoutSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = parseInt(sessionId || "0");
  const startTime = useRef(new Date());
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [showFinish, setShowFinish] = useState(false);
  const [notes, setNotes] = useState("");
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [showOneRM, setShowOneRM] = useState(false);
  const [oneRMWeight, setOneRMWeight] = useState(0);
  const [oneRMReps, setOneRMReps] = useState(10);
  const [showShareCard, setShowShareCard] = useState(false);
  const [prs, setPrs] = useState<Array<{ exerciseName: string; newMax: number; prevMax: number }>>([]);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [checkPREnabled, setCheckPREnabled] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [saveAsRoutine, setSaveAsRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [finishedDuration, setFinishedDuration] = useState(0);
  const { data: prCheckResult } = trpc.pr.check.useQuery({ sessionId: sid }, { enabled: checkPREnabled, retry: false });

  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock(true);
  const { data: session } = trpc.workout.getSession.useQuery({ sessionId: sid });
  const completeSession = trpc.workout.completeSession.useMutation({
    onSuccess: () => {
      // PR 확인을 위해 쉼리 스스템 단계로 전환
      setSessionCompleted(true);
      setCheckPREnabled(true);
      toast.success("운동이 완료되었습니다! 🎉");
    },
    onError: () => toast.error("완료 처리에 실패했습니다."),
  });
  const deleteSession = trpc.workout.deleteSession.useMutation({
    onSuccess: () => {
      toast.info("완료한 세트가 없어 운동 기록을 저장하지 않았습니다.");
      window.location.href = "/history";
    },
    onError: () => toast.error("세션 종료에 실패했습니다."),
  });

  // PR 데이터 도착 시 다이얼로그 열기
  useEffect(() => {
    if (prCheckResult && prCheckResult.length > 0) {
      setPrs(prCheckResult);
      setShowPRDialog(true);
    }
  }, [prCheckResult, checkPREnabled]);

  const saveSessionAsRoutine = trpc.workout.saveSessionAsRoutine.useMutation({
    onSuccess: () => toast.success("오늘 진행한 내용으로 루틴을 저장했습니다."),
    onError: () => toast.error("루틴 저장에 실패했습니다."),
  });

  // 루틴 운동 목록 로드 (루틴 시작 시 자동 로드)
  const { data: routineExercises } = trpc.routines.detail.useQuery(
    { id: session?.routineId! },
    { enabled: !!session?.routineId && exercises.length === 0 }
  );

  useEffect(() => {
    if (!session || exercises.length > 0) return;

    // 루틴에서 시작한 경우: 루틴 운동 목록 자동 로드
    if (routineExercises?.exercises && routineExercises.exercises.length > 0 && session.logs?.length === 0) {
      setExercises(routineExercises.exercises.map((item: any) => {
        // setDetails가 있으면 사용, 없으면 기본값 사용
        const setDetails = item.re.setDetails && Array.isArray(item.re.setDetails) && item.re.setDetails.length > 0
          ? item.re.setDetails
          : null;

        const sets = setDetails
          ? setDetails.map((detail: any) => ({
              setNumber: detail.setNumber,
              reps: detail.reps ?? item.re.reps ?? 10,
              weightKg: detail.weightKg ?? 0,
              isWarmup: false,
              completed: false,
            }))
          : Array.from({ length: item.re.sets || 3 }, (_, i) => ({
              setNumber: i + 1,
              reps: item.re.reps || 10,
              weightKg: 0,
              isWarmup: false,
              completed: false,
            }));

        return {
          exerciseId: item.ex.id,
          nameKo: item.ex.nameKo,
          name: item.ex.name,
          restSeconds: item.re.restSeconds || 90,
          sets,
          expanded: true,
        };
      }));
      return;
    }

    // 기존 로그 복원
    if (session.logs && session.logs.length > 0) {
      const grouped: Record<number, any> = {};
      for (const item of session.logs) {
        const exId = item.log.exerciseId;
        if (!grouped[exId]) grouped[exId] = { exercise: item.exercise, sets: [] };
        grouped[exId].sets.push({
          setNumber: item.log.setNumber,
          reps: item.log.reps || 10,
          weightKg: item.log.weightKg || 0,
          isWarmup: item.log.isWarmup,
          rpe: item.log.rpe,
          memo: item.log.memo,
          completed: true,
          logId: item.log.id,
        });
      }
      setExercises(Object.entries(grouped).map(([exId, data]) => ({
        exerciseId: parseInt(exId),
        nameKo: data.exercise.nameKo,
        name: data.exercise.name,
        restSeconds: 90,
        sets: data.sets,
        expanded: true,
      })));
    }
  }, [session, routineExercises]);

  const addExercise = (ex: any, restSecs: number) => {
    setExercises(prev => [...prev, {
      exerciseId: ex.id,
      nameKo: ex.nameKo,
      name: ex.name,
      restSeconds: restSecs,
      sets: [{ setNumber: 1, reps: 10, weightKg: 0, isWarmup: false, completed: false }],
      expanded: true,
    }]);
  };

  const totalSets = exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const completedSets = exercises.reduce((s, ex) => s + ex.sets.filter(set => set.completed).length, 0);
  const totalVolume = exercises.reduce((s, ex) =>
    s + ex.sets.filter(set => set.completed).reduce((s2, set) => s2 + set.reps * set.weightKg, 0), 0);
  const currentDurationMinutes = Math.max(1, Math.floor((Date.now() - startTime.current.getTime()) / 60000));
  const displayDurationMinutes = finishedDuration || currentDurationMinutes;
  const estimatedCalories = estimateCalories(displayDurationMinutes, completedSets);
  const routineAlternatives = routineExercises?.exercises?.map((item: any) => ({
    id: item.ex.id,
    nameKo: item.ex.nameKo,
    name: item.ex.name,
    restSeconds: item.re.restSeconds || 90,
  })) ?? [];

  const handleFinish = async () => {
    const durationMinutes = Math.max(1, Math.floor((Date.now() - startTime.current.getTime()) / 60000));
    setFinishedDuration(durationMinutes);
    if (completedSets === 0) {
      deleteSession.mutate({ sessionId: sid });
      return;
    }
    if (saveAsRoutine) {
      await saveSessionAsRoutine.mutateAsync({
        sessionId: sid,
        name: newRoutineName.trim() || `${new Date().toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} 진행 루틴`,
        description: `${completedSets}세트 · ${Math.round(totalVolume).toLocaleString()}kg · 예상 ${estimateCalories(durationMinutes, completedSets)}kcal`,
      });
    }
    completeSession.mutate({ sessionId: sid, durationMinutes, notes });
  };

  const handlePRClose = () => {
    setShowPRDialog(false);
  };

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      {/* 헤더 */}
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{session?.name || "운동 세션"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock size={12} className="text-muted-foreground" />
            <TimerDisplay startTime={startTime.current} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
          {wakeLockSupported && (
            <button onClick={toggleWakeLock}
              title={wakeLockActive ? "화면 꺼짐 방지 해제" : "화면 꺼짐 방지 켜기"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                wakeLockActive
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-accent border-border text-muted-foreground hover:text-foreground"
              )}>
              {wakeLockActive ? <MonitorUp size={13} /> : <MonitorOff size={13} />}
              <span className="hidden sm:inline">{wakeLockActive ? "화면 유지 중" : "화면 꺼짐 방지"}</span>
            </button>
          )}
          <Button
            variant="outline"
            className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
            onClick={() => {
              const lastCompleted = exercises.flatMap(e => e.sets).filter(s => s.completed).slice(-1)[0];
              setOneRMWeight(lastCompleted?.weightKg || 0);
              setOneRMReps(lastCompleted?.reps || 10);
              setShowOneRM(true);
            }}
          >
            <Calculator size={15} />
            <span className="hidden sm:inline">1RM</span>
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowFinish(true)}>
            <Save size={16} />종료
          </Button>
        </div>
      </div>

      {/* 미지원 안내 */}
      {!wakeLockSupported && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
          <MonitorOff size={13} className="flex-shrink-0" />
          <span>현재 브라우저에서는 화면 꺼짐 방지가 지원되지 않습니다. Chrome 또는 Edge를 사용하면 이용 가능합니다.</span>
        </div>
      )}

      {/* 진행 요약 */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-primary">{completedSets}</div>
              <div className="text-xs text-muted-foreground">완료 세트</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{totalSets}</div>
              <div className="text-xs text-muted-foreground">전체 세트</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{Math.round(totalVolume).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">볼륨 (kg)</div>
            </div>
          </div>
          {totalSets > 0 && (
            <div className="mt-3 h-1.5 bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedSets / totalSets) * 100}%` }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 운동 블록 */}
      <div className="space-y-3 mb-4">
        {exercises.map((entry, idx) => (
          <ExerciseBlock
            key={`${entry.exerciseId}-${idx}`}
            entry={entry}
            sessionId={sid}
            onUpdate={updated => setExercises(prev => prev.map((e, i) => i === idx ? updated : e))}
            onRemove={() => setExercises(prev => prev.filter((_, i) => i !== idx))}
            onSetComplete={secs => { setRestSeconds(secs); setShowRestTimer(true); }}
            routineAlternatives={session?.routineId ? routineAlternatives : []}
          />
        ))}
      </div>

      {session?.routineId ? (
        <div className="rounded-xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">
          루틴 운동 중에는 운동 추가 대신 각 운동의 변경 버튼으로 루틴 내 운동을 교체할 수 있습니다.
        </div>
      ) : (
        <AddExerciseModal onAdd={addExercise} />
      )}

      {/* 공유 카드 */}
      {showShareCard && (
        <WorkoutShareCard
          sessionName={session?.name || "운동 세션"}
          date={new Date()}
          durationMinutes={finishedDuration || Math.max(1, Math.floor((Date.now() - startTime.current.getTime()) / 60000))}
          completedSets={completedSets}
          totalVolume={totalVolume}
          exercises={Array.from(new Set(exercises.map(e => e.nameKo)))}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* 1RM 계산기 */}
      {showOneRM && (
        <OneRMCalculator
          initialWeight={oneRMWeight}
          initialReps={oneRMReps}
          onClose={() => setShowOneRM(false)}
        />
      )}

      {/* 휴식 타이머 오버레이 */}
      {showRestTimer && (
        <RestTimerOverlay
          defaultSeconds={restSeconds}
          onClose={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}

      {/* 완료 다이얼로그 */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader><DialogTitle>{sessionCompleted ? "운동 결과" : completedSets === 0 ? "운동 종료" : "운동 완료"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-primary/10 rounded-xl">
                <div className="text-2xl font-bold text-primary">{completedSets}</div>
                <div className="text-xs text-muted-foreground">총 세트 수</div>
              </div>
              <div className="text-center p-3 bg-accent rounded-xl">
                <div className="text-2xl font-bold text-foreground">{Math.round(totalVolume).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">총 중량 (kg)</div>
              </div>
              <div className="text-center p-3 bg-orange-400/10 rounded-xl">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-400">
                  <Flame size={18} />
                  {estimatedCalories}
                </div>
                <div className="text-xs text-muted-foreground">예상 소모 kcal</div>
              </div>
              <div className="text-center p-3 bg-blue-400/10 rounded-xl">
                <div className="text-2xl font-bold text-blue-400">{displayDurationMinutes}</div>
                <div className="text-xs text-muted-foreground">운동 시간 (분)</div>
              </div>
            </div>

            {!sessionCompleted ? (
              <div className="space-y-3">
                {completedSets === 0 && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    완료한 세트가 없습니다. 종료하면 이 세션은 기록에 저장되지 않습니다.
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">메모 (선택)</label>
                  <Input placeholder="오늘 운동 메모..." value={notes} onChange={e => setNotes(e.target.value)}
                    className="bg-accent border-border text-foreground" />
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-border bg-accent/40 p-3">
                  <input
                    type="checkbox"
                    checked={saveAsRoutine}
                    onChange={(e) => setSaveAsRoutine(e.target.checked)}
                    disabled={completedSets === 0}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">오늘 진행한 내용으로 루틴 저장</div>
                    <div className="text-xs text-muted-foreground">완료한 세트의 무게와 횟수를 새 루틴에 반영합니다.</div>
                  </div>
                </label>
                {saveAsRoutine && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">새 루틴 이름</label>
                    <Input
                      placeholder="예: 오늘의 상체 루틴"
                      value={newRoutineName}
                      onChange={e => setNewRoutineName(e.target.value)}
                      className="bg-accent border-border text-foreground"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-border" onClick={() => setShowFinish(false)}>계속하기</Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleFinish}
                    disabled={completeSession.isPending || saveSessionAsRoutine.isPending || deleteSession.isPending}
                  >
                    {completeSession.isPending || saveSessionAsRoutine.isPending || deleteSession.isPending
                      ? "처리 중..."
                      : completedSets === 0
                        ? "저장 없이 종료"
                        : "운동 종료"}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-border text-muted-foreground hover:text-foreground"
                  onClick={() => { setShowFinish(false); setShowShareCard(true); }}
                >
                  공유 카드 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { window.location.href = "/history"; }}>
                  기록 보러가기
                </Button>
                <Button variant="outline" className="w-full gap-2 border-border" onClick={() => setShowShareCard(true)}>
                  공유 카드 만들기
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PR 알림 다이얼로그 */}
      <Dialog open={showPRDialog} onOpenChange={setShowPRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Trophy size={24} className="text-yellow-400" />
              <span>새로운 개인 기록!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {prs.map((pr: any, idx: number) => (
              <Card key={idx} className="bg-gradient-to-br from-yellow-400/10 to-orange-400/10 border-yellow-400/30">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="font-semibold text-foreground mb-2">{pr.exerciseName}</div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{pr.prevMax}kg</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-2xl font-bold text-yellow-400">{pr.newMax}kg</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +{(pr.newMax - pr.prevMax).toFixed(1)}kg 신기록!
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handlePRClose}
            >
              축하해주세요! 🎉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
