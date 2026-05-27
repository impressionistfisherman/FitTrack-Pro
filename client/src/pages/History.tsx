import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import BodyWeightTracker from "@/components/BodyWeightTracker";
import FreeWorkoutDialog from "@/components/FreeWorkoutDialog";
import { cn } from "@/lib/utils";
import { Activity, Calendar, ChevronLeft, ChevronRight, Clock, Dumbbell, LogIn, TrendingUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { toast } from "sonner";

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

function SessionCard({ session, onDelete }: { session: any; onDelete: (sessionId: number) => void }) {
  const exerciseCount = new Set(session.logs.map((l: any) => l.log.exerciseId)).size;
  const strengthLogs = session.logs.filter((l: any) => l.log.reps || l.log.weightKg);
  const timedLogs = session.logs.filter((l: any) => l.log.durationSeconds);
  const computedVolume = strengthLogs.reduce((sum: number, l: any) =>
    sum + (Number(l.log.reps) || 0) * (Number(l.log.weightKg) || 0), 0);
  const totalVolume = Math.max(computedVolume, Number(session.totalVolume) || 0);
  const totalDurationSeconds = timedLogs.reduce((sum: number, l: any) => sum + (l.log.durationSeconds ?? 0), 0);
  const totalDistanceM = timedLogs.reduce((sum: number, l: any) => sum + (l.log.distanceM ?? 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60) || session.durationMinutes || 0;
  const distanceText = totalDistanceM > 0 ? `${(totalDistanceM / 1000).toFixed(totalDistanceM >= 10000 ? 0 : 1)}km` : "-";
  const hasTimedOnly = strengthLogs.length === 0 && (timedLogs.length > 0 || totalMinutes > 0);
  const uniqueExerciseIds = Array.from(new Set(session.logs.map((l: any) => l.log.exerciseId)));
  // 훅 규칙 위반 방지: map() 내부에서 useQuery 호출 금지
  // goalData는 null로 처리하여 ExerciseProgressItem이 목표 없이 렌더링하도록 함

  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold text-foreground text-sm">{session.name || "운동 세션"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(session.startedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              <Clock size={9} className="mr-1" />
              {session.durationMinutes}분
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(session.id)}
              title="운동 기록 삭제"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-accent/50 rounded-lg">
            <div className="text-sm font-bold text-foreground">{exerciseCount}</div>
            <div className="text-[10px] text-muted-foreground">운동 종류</div>
          </div>
          <div className="p-2 bg-accent/50 rounded-lg">
            <div className="text-sm font-bold text-foreground">{hasTimedOnly ? totalMinutes : strengthLogs.length}</div>
            <div className="text-[10px] text-muted-foreground">{hasTimedOnly ? "총 시간(분)" : "총 세트"}</div>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <div className="text-sm font-bold text-primary">
              {hasTimedOnly ? distanceText : Math.round(totalVolume).toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{hasTimedOnly ? "거리" : "볼륨 (kg)"}</div>
          </div>
        </div>

        {/* Exercise list */}
        {session.logs.length > 0 && (
          <div className="mt-3 space-y-2">
            {Array.from(new Map(session.logs.map((l: any) => [l.log.exerciseId, l.exercise])).values()).map((ex: any, idx: number) => {
              const exerciseLogs = session.logs.filter((l: any) => l.log.exerciseId === ex.id);
              const strengthExerciseLogs = exerciseLogs.filter((l: any) => l.log.reps || l.log.weightKg);
              const maxWeight = strengthExerciseLogs.length ? Math.max(...strengthExerciseLogs.map((l: any) => l.log.weightKg || 0)) : 0;
              const maxReps = strengthExerciseLogs.length ? Math.max(...strengthExerciseLogs.map((l: any) => l.log.reps || 0)) : 0;
              const fallbackDurationMinutes = uniqueExerciseIds.length === 1 && strengthExerciseLogs.length === 0 ? totalMinutes : 0;
              return (
                <ExerciseProgressItem 
                  key={ex.id}
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [chartExerciseId, setChartExerciseId] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [freeWorkoutOpen, setFreeWorkoutOpen] = useState(false);

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

  const selectedChartExercise = useMemo(() => {
    return exercises?.find((exercise: any) => exercise.id === chartExerciseId) ?? null;
  }, [exercises, chartExerciseId]);

  const filteredExerciseOptions = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    const source = exercises ?? [];
    const filtered = query
      ? source.filter((exercise: any) => {
          const haystack = `${exercise.nameKo ?? ""} ${exercise.name ?? ""}`.toLowerCase();
          return haystack.includes(query);
        })
      : source;
    return filtered.slice(0, 12);
  }, [exercises, exerciseSearch]);

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

  if (loading) {
    return (
      <div className="page-shell space-y-4">
        <div className="h-12 skeleton rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 skeleton rounded-xl" />
          <div className="h-72 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center">
        <Calendar size={40} className="text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />로그인
        </Button>
      </div>
    );
  }

  const progressChartData = exerciseProgress
    ?.slice()
    .reverse()
    .map((h: any) => ({
      date: h.date ? new Date(h.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "?",
      최대무게: h.maxWeight,
      볼륨: Math.round(h.totalVolume),
    }));

  return (
    <div className="page-shell animate-fade-in">
      <FreeWorkoutDialog
        open={freeWorkoutOpen}
        onOpenChange={setFreeWorkoutOpen}
        onComplete={handleFreeWorkoutComplete}
      />

      <div className="page-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">운동 기록</h1>
            <p className="page-description">달력과 차트로 운동 진행 상황을 확인하세요</p>
          </div>
          <Button
            onClick={() => setFreeWorkoutOpen(true)}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Plus size={16} />
            운동 기록 추가
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendar */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
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
                      <SessionCard key={session.id} session={session} onDelete={handleDeleteSession} />
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
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">운동별 무게 추이</span>
              </div>
              <div className="mb-3 space-y-2">
                <input
                  value={exerciseSearch}
                  onChange={(event) => setExerciseSearch(event.target.value)}
                  placeholder={selectedChartExercise ? selectedChartExercise.nameKo : "운동 이름 검색..."}
                  className="h-10 w-full rounded-lg border border-border bg-accent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
                />
                <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background/40 p-1">
                  {filteredExerciseOptions.length > 0 ? filteredExerciseOptions.map((ex: any) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setChartExerciseId(ex.id);
                        setExerciseSearch(ex.nameKo);
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
              </div>

              {progressChartData && progressChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={progressChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="최대무게" fill="oklch(0.72 0.18 160)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  {chartExerciseId ? "기록이 없습니다" : "운동을 선택하세요"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Body Weight Tracker */}
          <BodyWeightTracker />

          {/* Recent Sessions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell size={16} className="text-primary" />
              <span className="font-semibold text-foreground text-sm">최근 운동 기록</span>
            </div>
            <div className="space-y-3">
              {recentWorkouts && recentWorkouts.length > 0 ? (
                recentWorkouts.slice(0, 5).map((session: any) => (
                  <SessionCard key={session.id} session={session} onDelete={handleDeleteSession} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">아직 운동 기록이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
