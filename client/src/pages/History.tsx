import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import BodyWeightTracker from "@/components/BodyWeightTracker";
import FreeWorkoutDialog from "@/components/FreeWorkoutDialog";
import { cn } from "@/lib/utils";
import { Activity, Calendar, ChevronLeft, ChevronRight, Clock, Dumbbell, LogIn, TrendingUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { toast } from "sonner";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function WorkoutCalendar({ year, month, sessions }: { year: number; month: number; sessions: any[] }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutDays = new Set(
    sessions.map((s) => new Date(s.startedAt).getDate())
  );
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
          const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
          const hasWorkout = workoutDays.has(day);
          return (
            <div
              key={day}
              className={cn(
                "aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all relative",
                hasWorkout
                  ? "bg-primary text-primary-foreground font-bold"
                  : isToday
                  ? "bg-accent border border-primary/30 text-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {day}
              {hasWorkout && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
              )}
            </div>
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
  const totalVolume = strengthLogs.reduce((sum: number, l: any) =>
    sum + (l.log.reps ?? 0) * (l.log.weightKg ?? 0), 0);
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
  const { isAuthenticated } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [chartExerciseId, setChartExerciseId] = useState<number | null>(null);
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
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 lg:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Calendar size={40} className="text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />로그인
        </Button>
      </div>
    );
  }

  // Prepare chart data
  const volumeChartData = recentWorkouts
    ?.slice(0, 10)
    .reverse()
    .map((s: any) => ({
      date: new Date(s.startedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
      볼륨: Math.round(s.logs.reduce((sum: number, l: any) => sum + (l.log.reps ?? 0) * (l.log.weightKg ?? 0), 0)),
      세트: s.logs.length,
    }));

  const progressChartData = exerciseProgress
    ?.slice()
    .reverse()
    .map((h: any) => ({
      date: h.date ? new Date(h.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "?",
      최대무게: h.maxWeight,
      볼륨: Math.round(h.totalVolume),
    }));

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <FreeWorkoutDialog
        open={freeWorkoutOpen}
        onOpenChange={setFreeWorkoutOpen}
        onComplete={handleFreeWorkoutComplete}
      />

      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">운동 기록</h1>
            <p className="text-sm text-muted-foreground mt-0.5">달력과 차트로 운동 진행 상황을 확인하세요</p>
          </div>
          <Button
            onClick={() => setFreeWorkoutOpen(true)}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <Plus size={16} />
            자유 운동 기록
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
              <WorkoutCalendar year={year} month={month} sessions={sessions || []} />
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  운동한 날 ({sessions?.length || 0}회)
                </div>
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
                <span className="font-semibold text-foreground text-sm">운동별 무게 진행</span>
              </div>
              <Select
                value={chartExerciseId ? chartExerciseId.toString() : ""}
                onValueChange={(v) => v && setChartExerciseId(parseInt(v))}
              >
                <SelectTrigger className="bg-accent border-border text-foreground text-sm mb-3">
                  <SelectValue placeholder="운동 선택..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {exercises?.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id.toString()} className="text-foreground text-sm">
                      {ex.nameKo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
