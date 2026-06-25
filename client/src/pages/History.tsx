import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import BodyWeightTracker from "@/components/BodyWeightTracker";
import FreeWorkoutDialog from "@/components/FreeWorkoutDialog";
import { AuthRequiredState, PageLoadingState } from "@/components/PageState";
import { cn } from "@/lib/utils";
import { Activity, Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Dumbbell, Eye, Loader2, LogIn, TrendingUp, Plus, RefreshCw, Sparkles, Trash2, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { matchesExerciseSearchText, scoreExerciseSearchMatch } from "@shared/exerciseSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getSessionDate(session: any) {
  return new Date(session.workoutDate ?? session.startedAt ?? session.completedAt);
}

function getSessionDateKey(session: any) {
  return toDateKey(getSessionDate(session));
}

function getMonthDateKey(year: number, month: number, day: number) {
  return toDateKey(new Date(year, month - 1, day, 12, 0, 0));
}

function formatChartDateLabel(value: unknown, fallbackIndex: number) {
  if (!value) return `${fallbackIndex + 1}회`;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return `${fallbackIndex + 1}회`;
  return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function WorkoutCalendar({
  year,
  month,
  sessions,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  sessions: any[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutDays = new Set(sessions.map((session) => getSessionDate(session).getDate()));
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d, i) => (
          <div key={d} className={cn(
            "text-center text-xs font-medium py-1",
            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
          )}>
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateKey = getMonthDateKey(year, month, day);
          const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
          const hasWorkout = workoutDays.has(day);
          const isSelected = selectedDate === dateKey;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                hasWorkout
                  ? "bg-primary text-primary-foreground font-bold"
                  : isToday
                  ? "bg-accent border border-primary/30 text-foreground"
                  : "text-muted-foreground",
                isSelected && "ring-2 ring-primary/70 ring-offset-2 ring-offset-card",
                hasWorkout ? "hover:bg-primary/90" : "hover:bg-accent/70"
              )}
              title={`${dateKey}${hasWorkout ? " 운동 기록 보기" : " 기록 없음"}`}
            >
              {day}
              {hasWorkout && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl">
        <div className="text-muted-foreground mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-foreground font-medium">{p.value?.toLocaleString()}</span>
            <span className="text-muted-foreground">{p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ExerciseProgressItem({ exercise, maxWeight, maxReps, goalData }: any) {
  const logs = exercise.logs ?? [];
  const durationSeconds = logs.reduce((sum: number, item: any) => sum + (item.log.durationSeconds ?? 0), 0);
  const distanceM = logs.reduce((sum: number, item: any) => sum + (item.log.distanceM ?? 0), 0);
  const hasStrengthRecord = logs.some((item: any) => item.log.reps || item.log.weightKg);
  const minutes = Math.round(durationSeconds / 60) || exercise.fallbackDurationMinutes || 0;
  const distanceKm = distanceM > 0 ? (distanceM / 1000).toFixed(distanceM >= 10000 ? 0 : 1) : null;

  if (!hasStrengthRecord) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 text-xs mb-1">
          <span className="font-medium text-foreground">{exercise.nameKo}</span>
          <span className="text-[10px] text-muted-foreground">
            {minutes > 0 ? `${minutes}분` : "시간 기록"}
            {distanceKm && ` · ${distanceKm}km`}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/70"
            style={{ width: `${Math.min(100, Math.max(12, minutes))}%` }}
          />
        </div>
      </div>
    );
  }

  if (!goalData) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{exercise.nameKo}</span>
          <span className="text-[10px] text-muted-foreground">{maxWeight}kg × {maxReps}회</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-muted-foreground/30 w-full rounded-full" />
        </div>
      </div>
    );
  }

  const weightPercent = goalData.targetWeightKg ? Math.min(100, (maxWeight / goalData.targetWeightKg) * 100) : 0;
  const repsPercent = goalData.targetReps ? Math.min(100, (maxReps / goalData.targetReps) * 100) : 0;
  const overallPercent = goalData.overallProgress || Math.max(weightPercent, repsPercent);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-green-500";
    if (percent >= 75) return "bg-emerald-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-foreground">{exercise.nameKo}</span>
        <span className="text-[10px] text-muted-foreground">
          {maxWeight}kg × {maxReps}회 
          {goalData.targetWeightKg && ` / 목표 ${goalData.targetWeightKg}kg`}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor(overallPercent)} rounded-full transition-all`}
          style={{ width: `${Math.min(100, overallPercent)}%` }}
        />
      </div>
      <div className="text-[9px] text-muted-foreground mt-0.5">
        달성도: {Math.round(overallPercent)}%
      </div>
    </div>
  );
}

function groupSessionLogs(logs: any[] = []) {
  const groups = new Map<number, { exercise: any; logs: any[] }>();
  for (const item of logs) {
    const exerciseId = Number(item.log?.exerciseId ?? item.exercise?.id);
    if (!exerciseId) continue;
    if (!groups.has(exerciseId)) groups.set(exerciseId, { exercise: item.exercise, logs: [] });
    groups.get(exerciseId)!.logs.push(item);
  }
  return Array.from(groups.values());
}

function formatWorkoutLogValue(log: any) {
  if (log.durationSeconds) {
    const minutes = Math.round(Number(log.durationSeconds) / 60);
    const distance = Number(log.distanceM) > 0
      ? ` · ${(Number(log.distanceM) / 1000).toFixed(Number(log.distanceM) >= 10000 ? 0 : 1)}km`
      : "";
    return `${minutes}분${distance}`;
  }
  const weight = Number(log.weightKg) || 0;
  const reps = Number(log.reps) || 0;
  return `${weight}kg × ${reps}회`;
}

function WorkoutLogDetailList({ logs }: { logs: any[] }) {
  const exerciseGroups = useMemo(() => groupSessionLogs(logs), [logs]);
  if (!exerciseGroups.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-accent/20 p-4 text-center text-sm text-muted-foreground">
        기록된 운동 세트가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exerciseGroups.map(({ exercise, logs: exerciseLogs }, groupIndex) => (
        <div key={exercise?.id ?? groupIndex} className="rounded-xl border border-border bg-accent/25 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {exercise?.nameKo ?? exercise?.name ?? "운동"}
              </div>
              {exercise?.name ? (
                <div className="truncate text-xs text-muted-foreground">{exercise.name}</div>
              ) : null}
            </div>
            <Badge variant="outline" className="shrink-0 border-border text-muted-foreground">
              {exerciseLogs.length}세트
            </Badge>
          </div>
          <div className="space-y-1.5">
            {exerciseLogs.map((item: any, index: number) => (
              <div
                key={item.log?.id ?? `${exercise?.id ?? "exercise"}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/45 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{item.log?.setNumber ?? index + 1}세트</span>
                <span className="font-medium text-foreground">{formatWorkoutLogValue(item.log ?? {})}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionDetailDialog({
  session,
  open,
  onOpenChange,
  onEdit,
}: {
  session: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (session: any) => void;
}) {
  const [feedbackBySession, setFeedbackBySession] = useState<Record<number, any>>({});
  const autoRequestedFeedbackRef = useRef<Set<number>>(new Set());
  const aiSessionSummary = trpc.workout.aiSessionSummary.useMutation({
    onSuccess: (data, variables) => {
      setFeedbackBySession((current) => ({ ...current, [variables.sessionId]: data }));
    },
    onError: () => toast.error("AI 운동 피드백을 불러오지 못했습니다."),
  });
  const logs = session?.logs ?? [];
  const strengthLogs = logs.filter((item: any) => item.log?.reps || item.log?.weightKg);
  const timedLogs = logs.filter((item: any) => item.log?.durationSeconds);
  const computedVolume = strengthLogs.reduce((sum: number, item: any) => (
    sum + (Number(item.log?.reps) || 0) * (Number(item.log?.weightKg) || 0)
  ), 0);
  const totalVolume = Math.max(computedVolume, Number(session?.totalVolume) || 0);
  const durationMinutes = Number(session?.durationMinutes) || Math.round(timedLogs.reduce((sum: number, item: any) => sum + (Number(item.log?.durationSeconds) || 0), 0) / 60) || 0;
  const sessionFeedback = session?.id ? feedbackBySession[session.id] : null;

  useEffect(() => {
    if (!open || !session?.id || feedbackBySession[session.id] || autoRequestedFeedbackRef.current.has(session.id)) return;
    autoRequestedFeedbackRef.current.add(session.id);
    aiSessionSummary.mutate({ sessionId: session.id });
  }, [open, session?.id, feedbackBySession]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card p-0 text-foreground sm:max-w-2xl">
        {session ? (
          <div className="p-5">
            <DialogHeader>
              <DialogTitle>{session.name || "운동 기록 상세"}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                {getSessionDate(session).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
              </div>
            </DialogHeader>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-accent/50 p-3">
                <div className="text-base font-bold text-foreground">{durationMinutes}</div>
                <div className="text-[11px] text-muted-foreground">운동 시간(분)</div>
              </div>
              <div className="rounded-lg bg-accent/50 p-3">
                <div className="text-base font-bold text-foreground">{strengthLogs.length || logs.length}</div>
                <div className="text-[11px] text-muted-foreground">기록 세트</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-base font-bold text-primary">{Math.round(totalVolume).toLocaleString()}</div>
                <div className="text-[11px] text-muted-foreground">볼륨 kg</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles size={16} />
                  AI 운동 피드백
                </div>
                {sessionFeedback ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground sm:h-9"
                    onClick={() => aiSessionSummary.mutate({ sessionId: session.id })}
                    disabled={aiSessionSummary.isPending}
                  >
                    {aiSessionSummary.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    다시 분석
                  </Button>
                ) : null}
              </div>

              {aiSessionSummary.isPending && !sessionFeedback ? (
                <div className="mt-4 flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  기록을 분석하고 있습니다.
                </div>
              ) : sessionFeedback ? (
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">{sessionFeedback.summary}</p>
                  {Array.isArray(sessionFeedback.highlights) && sessionFeedback.highlights.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sessionFeedback.highlights.map((item: string, index: number) => (
                        <div key={`${item}-${index}`} className="rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-xs">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p><span className="font-semibold text-foreground">다음 팁:</span> {sessionFeedback.advice}</p>
                    <p><span className="font-semibold text-foreground">다음 방향:</span> {sessionFeedback.nextFocus}</p>
                    <p><span className="font-semibold text-foreground">주의:</span> {sessionFeedback.caution}</p>
                  </div>
                  {sessionFeedback.source === "fallback" ? (
                    <p className="text-[11px] text-muted-foreground/80">기본 분석 결과입니다. 다시 분석하면 AI 응답을 재시도합니다.</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 flex min-h-24 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-muted-foreground">피드백을 불러오지 못했습니다.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2"
                    onClick={() => aiSessionSummary.mutate({ sessionId: session.id })}
                  >
                    <RefreshCw size={14} />
                    다시 시도
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4">
              <WorkoutLogDetailList logs={logs} />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                className="gap-2 bg-primary text-primary-foreground"
                onClick={() => onEdit(session)}
              >
                <Pencil size={14} />
                수정
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SessionCard({
  session,
  onDelete,
  onEdit,
  onView,
}: {
  session: any;
  onDelete: (sessionId: number) => void;
  onEdit: (session: any) => void;
  onView: (session: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const logs = session.logs ?? [];
  const exerciseGroups = useMemo(() => groupSessionLogs(logs), [logs]);
  const exerciseCount = exerciseGroups.length;
  const strengthLogs = logs.filter((l: any) => l.log.reps || l.log.weightKg);
  const timedLogs = logs.filter((l: any) => l.log.durationSeconds);
  const computedVolume = strengthLogs.reduce((sum: number, l: any) =>
    sum + (Number(l.log.reps) || 0) * (Number(l.log.weightKg) || 0), 0);
  const totalVolume = Math.max(computedVolume, Number(session.totalVolume) || 0);
  const totalDurationSeconds = timedLogs.reduce((sum: number, l: any) => sum + (l.log.durationSeconds ?? 0), 0);
  const totalDistanceM = timedLogs.reduce((sum: number, l: any) => sum + (l.log.distanceM ?? 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60) || session.durationMinutes || 0;
  const distanceText = totalDistanceM > 0 ? `${(totalDistanceM / 1000).toFixed(totalDistanceM >= 10000 ? 0 : 1)}km` : "-";
  const hasTimedOnly = strengthLogs.length === 0 && (timedLogs.length > 0 || totalMinutes > 0);
  const uniqueExerciseIds = exerciseGroups.map((group) => group.exercise?.id).filter(Boolean);
  // 훅 규칙 위반 방지: map() 내부에서 useQuery 호출 금지
  // goalData는 null로 처리하여 ExerciseProgressItem이 목표 없이 렌더링하도록 함

  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 space-y-2 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:space-y-0">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onView(session)}
              aria-label="운동 기록 상세 보기"
            >
              <div className="truncate text-sm font-semibold text-foreground">{session.name || "운동 세션"}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                <span className="sm:hidden">
                  {getSessionDate(session).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" })}
                </span>
                <span className="hidden sm:inline">
                  {getSessionDate(session).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
              aria-label={expanded ? "운동 기록 접기" : "운동 기록 자세히 보기"}
            >
              <ChevronDown
                size={16}
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-accent/25 p-1 sm:border-0 sm:bg-transparent sm:p-0">
            <Badge variant="outline" className="h-7 shrink-0 border-border px-2 text-[11px] text-muted-foreground">
              <Clock size={9} className="mr-1" />
              {session.durationMinutes}분
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8"
              onClick={(event) => {
                event.stopPropagation();
                onView(session);
              }}
              title="운동 기록 상세 보기"
            >
              <Eye size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary sm:h-8 sm:w-8"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(session);
              }}
              title="운동 기록 수정"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(session.id);
              }}
              title="운동 기록 삭제"
            >
              <Trash2 size={14} />
            </Button>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="hidden rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground sm:block"
              aria-label={expanded ? "운동 기록 접기" : "운동 기록 자세히 보기"}
            >
              <ChevronDown
                size={16}
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
          <div className="min-w-0 rounded-lg bg-accent/50 p-2">
            <div className="text-sm font-bold text-foreground">{exerciseCount}</div>
            <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">운동 종류</div>
          </div>
          <div className="min-w-0 rounded-lg bg-accent/50 p-2">
            <div className="text-sm font-bold text-foreground">{hasTimedOnly ? totalMinutes : strengthLogs.length}</div>
            <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">{hasTimedOnly ? "총 시간" : "총 세트"}</div>
          </div>
          <div className="min-w-0 rounded-lg bg-primary/10 p-2">
            <div className="truncate text-sm font-bold text-primary">
              {hasTimedOnly ? distanceText : Math.round(totalVolume).toLocaleString()}
            </div>
            <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">{hasTimedOnly ? "거리" : "볼륨"}</div>
          </div>
        </div>

        {exerciseGroups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exerciseGroups.slice(0, expanded ? exerciseGroups.length : 4).map(({ exercise, logs: exerciseLogs }, index) => (
              <Badge key={exercise?.id ?? `${exercise?.nameKo ?? "exercise"}-${index}`} variant="outline" className="border-border text-[10px] text-muted-foreground">
                {exercise?.nameKo ?? "운동"} {exerciseLogs.length}세트
              </Badge>
            ))}
            {!expanded && exerciseGroups.length > 4 && (
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                +{exerciseGroups.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Exercise detail list */}
        {expanded && exerciseGroups.length > 0 && (
          <div className="mt-3 space-y-2">
            {exerciseGroups.map(({ exercise: ex, logs: exerciseLogs }, index) => {
              const strengthExerciseLogs = exerciseLogs.filter((l: any) => l.log.reps || l.log.weightKg);
              const maxWeight = strengthExerciseLogs.length ? Math.max(...strengthExerciseLogs.map((l: any) => l.log.weightKg || 0)) : 0;
              const maxReps = strengthExerciseLogs.length ? Math.max(...strengthExerciseLogs.map((l: any) => l.log.reps || 0)) : 0;
              const fallbackDurationMinutes = uniqueExerciseIds.length === 1 && strengthExerciseLogs.length === 0 ? totalMinutes : 0;
              return (
                <ExerciseProgressItem 
                  key={ex?.id ?? `${ex?.nameKo ?? "exercise"}-${index}`}
                  exercise={{ ...ex, logs: exerciseLogs, fallbackDurationMinutes }}
                  maxWeight={maxWeight}
                  maxReps={maxReps}
                  goalData={null}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function History() {
  const { isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [chartExerciseId, setChartExerciseId] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseSearchOpen, setExerciseSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [freeWorkoutOpen, setFreeWorkoutOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [viewingSession, setViewingSession] = useState<any | null>(null);
  const dismissedRouteSessionIdRef = useRef<number | null>(null);
  const routeSessionId = useMemo(() => {
    const match = location.match(/^\/history\/(\d+)$/);
    return match ? Number(match[1]) : null;
  }, [location]);
  const exerciseSearchBoxRef = useRef<HTMLDivElement | null>(null);

  const { data: sessions } = trpc.history.calendar.useQuery({ year, month }, { enabled: isAuthenticated });
  const { data: recentWorkouts } = trpc.history.recentWorkouts.useQuery({ limit: 10 }, { enabled: isAuthenticated });
  const { data: exercises } = trpc.exercises.list.useQuery({}, { enabled: isAuthenticated });
  const { data: exerciseProgress } = trpc.history.exerciseProgress.useQuery(
    { exerciseId: chartExerciseId!, limit: 10 },
    { enabled: isAuthenticated && !!chartExerciseId }
  );
  const utils = trpc.useUtils();
  const deleteSession = trpc.workout.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("운동 기록을 삭제했습니다.");
      utils.history.recentWorkouts.invalidate();
      utils.history.calendar.invalidate();
      utils.weeklyGoals.get.invalidate();
    },
    onError: () => toast.error("운동 기록 삭제에 실패했습니다."),
  });

  const handleDeleteSession = (sessionId: number) => {
    if (!window.confirm("이 운동 기록을 삭제할까요? 삭제하면 세트 기록과 주간 목표 반영도 함께 사라집니다.")) return;
    deleteSession.mutate({ sessionId });
  };

  const handleFreeWorkoutComplete = () => {
    utils.history.recentWorkouts.invalidate();
    utils.history.calendar.invalidate();
    utils.weeklyGoals.get.invalidate();
  };

  const openEditWorkout = (session: any) => {
    setEditingSession(session);
    setFreeWorkoutOpen(true);
  };

  const closeSessionDetail = () => {
    if (routeSessionId) dismissedRouteSessionIdRef.current = routeSessionId;
    setViewingSession(null);
    if (routeSessionId) navigate("/history", { replace: true });
  };

  const openEditFromDetail = (session: any) => {
    closeSessionDetail();
    openEditWorkout(session);
  };

  const prevMonth = () => {
    const nextYear = month === 1 ? year - 1 : year;
    const nextMonthValue = month === 1 ? 12 : month - 1;
    setYear(nextYear);
    setMonth(nextMonthValue);
    setSelectedDate(getMonthDateKey(nextYear, nextMonthValue, 1));
  };
  const nextMonth = () => {
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthValue = month === 12 ? 1 : month + 1;
    setYear(nextYear);
    setMonth(nextMonthValue);
    setSelectedDate(getMonthDateKey(nextYear, nextMonthValue, 1));
  };

  const selectedDateSessions = useMemo(() => {
    return (sessions ?? [])
      .filter((session: any) => getSessionDateKey(session) === selectedDate)
      .sort((a: any, b: any) => getSessionDate(b).getTime() - getSessionDate(a).getTime());
  }, [sessions, selectedDate]);

  useEffect(() => {
    if (!routeSessionId) {
      dismissedRouteSessionIdRef.current = null;
      return;
    }
    if (dismissedRouteSessionIdRef.current === routeSessionId || viewingSession) return;
    const target = [...(sessions ?? []), ...(recentWorkouts ?? [])].find((session: any) => Number(session.id) === routeSessionId);
    if (!target) return;
    setSelectedDate(getSessionDateKey(target));
    setYear(getSessionDate(target).getFullYear());
    setMonth(getSessionDate(target).getMonth() + 1);
    setViewingSession(target);
  }, [recentWorkouts, routeSessionId, sessions, viewingSession]);

  const selectedChartExercise = useMemo(() => {
    return exercises?.find((exercise: any) => exercise.id === chartExerciseId) ?? null;
  }, [exercises, chartExerciseId]);

  const filteredExerciseOptions = useMemo(() => {
    const query = exerciseSearch.trim();
    const source = exercises ?? [];
    const filtered = query
      ? source
        .map((exercise: any) => ({
          exercise,
          score: scoreExerciseSearchMatch(query, exercise.nameKo, exercise.name),
        }))
        .filter((item) => item.score > 0 || matchesExerciseSearchText(query, item.exercise.nameKo, item.exercise.name))
        .sort((a, b) => (
          b.score - a.score
          || String(a.exercise.nameKo ?? "").localeCompare(String(b.exercise.nameKo ?? ""), "ko-KR")
          || String(a.exercise.name ?? "").localeCompare(String(b.exercise.name ?? ""), "en")
        ))
        .map((item) => item.exercise)
      : source;
    return filtered.slice(0, 12);
  }, [exercises, exerciseSearch]);
  const hasExerciseSearch = exerciseSearch.trim().length > 0;
  const shouldShowExerciseOptions = exerciseSearchOpen && hasExerciseSearch;

  const closeExerciseSearchIfLeaving = (nextFocus: EventTarget | null) => {
    if (nextFocus instanceof Node && exerciseSearchBoxRef.current?.contains(nextFocus)) return;
    setExerciseSearchOpen(false);
    if (!chartExerciseId) setExerciseSearch("");
  };

  const volumeChartData = useMemo(() => {
    const buckets = new Map<string, { date: string; sortKey: string; 볼륨: number; 세트: number }>();
    for (const session of recentWorkouts ?? []) {
      const sortKey = getSessionDateKey(session);
      const current = buckets.get(sortKey) ?? {
        sortKey,
        date: getSessionDate(session).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
        볼륨: 0,
        세트: 0,
      };
      const strengthLogs = session.logs.filter((item: any) => item.log.reps || item.log.weightKg);
      const computedVolume = strengthLogs.reduce((sum: number, item: any) => (
        sum + (Number(item.log.reps) || 0) * (Number(item.log.weightKg) || 0)
      ), 0);
      current.볼륨 += Math.max(computedVolume, Number(session.totalVolume) || 0);
      current.세트 += strengthLogs.length;
      buckets.set(sortKey, current);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-10)
      .map((item) => ({ ...item, 볼륨: Math.round(item.볼륨) }));
  }, [recentWorkouts]);

  if (loading) return <PageLoadingState wide />;
  if (!isAuthenticated) {
    return <AuthRequiredState icon={Calendar} description="운동 기록과 변화 추이를 확인하려면 로그인하세요." />;
  }

  const progressChartData = exerciseProgress
    ?.slice()
    .reverse()
    .map((h: any, index: number) => ({
      date: formatChartDateLabel(h.date, index),
      평균무게: h.averageWeight ?? h.maxWeight,
      최대무게: h.maxWeight,
      세트: h.setCount ?? h.logs?.length ?? 0,
      볼륨: Math.round(h.totalVolume),
    }));
  const latestProgressPoint = progressChartData?.[progressChartData.length - 1] ?? null;
  const previousProgressPoint = progressChartData && progressChartData.length > 1
    ? progressChartData[progressChartData.length - 2]
    : null;
  const averageWeightDiff = latestProgressPoint && previousProgressPoint
    ? Math.round((Number(latestProgressPoint.평균무게) - Number(previousProgressPoint.평균무게)) * 10) / 10
    : null;

  return (
    <div className="page-shell figma-page animate-fade-in">
      <FreeWorkoutDialog
        open={freeWorkoutOpen}
        onOpenChange={(nextOpen) => {
          setFreeWorkoutOpen(nextOpen);
          if (!nextOpen) setEditingSession(null);
        }}
        onComplete={handleFreeWorkoutComplete}
        initialDate={selectedDate}
        editSession={editingSession}
      />
      <SessionDetailDialog
        session={viewingSession}
        open={Boolean(viewingSession)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeSessionDetail();
        }}
        onEdit={openEditFromDetail}
      />

      <div className="figma-centered-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">운동 기록</h1>
            <p className="page-description">완료한 운동을 시간순으로 확인하세요</p>
          </div>
          <Button
            onClick={() => {
              setEditingSession(null);
              setFreeWorkoutOpen(true);
            }}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Plus size={16} />
            운동 기록 추가
          </Button>
        </div>
      </div>

      <div className="figma-section-heading">
        <div>
          <span>상세 분석</span>
          <h2>달력과 지표</h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendar */}
        <div className="space-y-4">
          <Card id="history-calendar" className="scroll-mt-24 bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                  <ChevronLeft size={18} />
                </button>
                <div className="font-semibold text-foreground">{year}년 {MONTHS[month - 1]}</div>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                  <ChevronRight size={18} />
                </button>
              </div>
              <WorkoutCalendar
                year={year}
                month={month}
                sessions={sessions || []}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  운동한 날 ({sessions?.length || 0}회)
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-accent/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                    </div>
                    <div className="text-xs text-muted-foreground">선택한 날짜 운동 기록</div>
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {selectedDateSessions.length}개
                  </Badge>
                </div>
                {selectedDateSessions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDateSessions.map((session: any) => (
                      <SessionCard key={session.id} session={session} onDelete={handleDeleteSession} onEdit={openEditWorkout} onView={setViewingSession} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                    이 날짜에는 운동 기록이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Volume Chart */}
          {volumeChartData && volumeChartData.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">볼륨 추이</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={volumeChartData}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.72 0.18 160)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.72 0.18 160)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="볼륨" stroke="oklch(0.72 0.18 160)" fill="url(#volumeGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Exercise Progress Chart */}
          <Card id="history-progress" className="scroll-mt-24 bg-card border-border">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">운동별 무게 추이</span>
              </div>
              <div
                ref={exerciseSearchBoxRef}
                onBlur={(event) => closeExerciseSearchIfLeaving(event.relatedTarget)}
                className={cn("space-y-2", (shouldShowExerciseOptions || chartExerciseId) && "mb-4")}
              >
                <input
                  value={exerciseSearch}
                  onFocus={() => setExerciseSearchOpen(true)}
                  onChange={(event) => {
                    setExerciseSearch(event.target.value);
                    setExerciseSearchOpen(true);
                  }}
                  placeholder={selectedChartExercise ? selectedChartExercise.nameKo : "운동 이름 검색..."}
                  className="h-11 w-full rounded-xl border border-border bg-accent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/70"
                />
                {shouldShowExerciseOptions && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background/95 p-1 shadow-lg">
                    {filteredExerciseOptions.length > 0 ? filteredExerciseOptions.map((ex: any) => (
                      <button
                        key={ex.id}
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          setChartExerciseId(ex.id);
                          setExerciseSearch(ex.nameKo);
                          setExerciseSearchOpen(false);
                        }}
                        className={cn(
                          "flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                          chartExerciseId === ex.id && "bg-primary/10 text-primary"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{ex.nameKo}</span>
                          <span className="block truncate text-xs text-muted-foreground">{ex.name}</span>
                        </span>
                      </button>
                    )) : (
                      <div className="px-3 py-5 text-center text-sm text-muted-foreground">검색 결과가 없습니다</div>
                    )}
                  </div>
                )}
              </div>

              {chartExerciseId && progressChartData && progressChartData.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent/25 px-3 py-2 text-xs">
                    <span className="font-semibold text-foreground">{selectedChartExercise?.nameKo ?? "선택 운동"}</span>
                    {latestProgressPoint ? (
                      <span className="text-muted-foreground">최근 평균 {latestProgressPoint.평균무게}kg</span>
                    ) : null}
                    {averageWeightDiff !== null ? (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        averageWeightDiff > 0 ? "bg-primary/15 text-primary" : averageWeightDiff < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      )}>
                        {averageWeightDiff > 0 ? "+" : ""}{averageWeightDiff}kg
                      </span>
                    ) : null}
                  </div>
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={progressChartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="평균무게"
                        stroke="oklch(0.72 0.18 160)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "oklch(0.72 0.18 160)", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : chartExerciseId ? (
                <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                  기록이 없습니다
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Body Weight Tracker */}
          <div id="history-weight" className="scroll-mt-24">
            <BodyWeightTracker />
          </div>

        </div>
      </div>

      <details id="history-log" className="content-disclosure scroll-mt-24 mt-5">
        <summary>
          <span>운동 로그</span>
          <small>최근 운동 {recentWorkouts?.length ?? 0}개 · 눌러서 펼치기</small>
        </summary>
        <div className="space-y-3 pt-3">
          {recentWorkouts && recentWorkouts.length > 0 ? (
            recentWorkouts.slice(0, 10).map((session: any) => (
              <SessionCard
                key={`history-log-${session.id}`}
                session={session}
                onDelete={handleDeleteSession}
                onEdit={openEditWorkout}
                onView={setViewingSession}
              />
            ))
          ) : (
            <div className="empty-state-panel">아직 완료한 운동이 없습니다.</div>
          )}
        </div>
      </details>
    </div>
  );
}
