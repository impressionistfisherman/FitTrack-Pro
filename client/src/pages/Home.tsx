import { useAuth } from "@/_core/hooks/useAuth";
import { getAppPath, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { WeeklyGoalDashboard } from "@/components/WeeklyGoalDashboard";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  Github,
  LogIn,
  Play,
  Plus,
  Search,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lazy, Suspense, useMemo } from "react";

const HomeMonthlyChart = lazy(() => import("@/components/HomeMonthlyChart").then((module) => ({ default: module.HomeMonthlyChart })));

const goalLabels: Record<string, string> = {
  hypertrophy: "근비대",
  fat_loss: "다이어트",
  strength: "근력",
  endurance: "지구력",
  flexibility: "유연성",
  general: "일반 건강",
};

const goalColors: Record<string, string> = {
  hypertrophy: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  fat_loss: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  strength: "text-red-400 bg-red-400/10 border-red-400/20",
  endurance: "text-green-400 bg-green-400/10 border-green-400/20",
  flexibility: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  general: "text-primary bg-primary/10 border-primary/20",
};

const bodyPartLabels: Record<string, string> = {
  chest: "가슴",
  back: "등",
  shoulders: "어깨",
  arms: "팔",
  biceps: "이두",
  triceps: "삼두",
  legs: "하체",
  glutes: "둔근",
  abs: "복근",
  cardio: "유산소",
  stretching: "스트레칭",
  full_body: "전신",
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-foreground leading-tight">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStartCard({ routines, isLoading }: { routines?: any[]; isLoading: boolean }) {
  const startSession = trpc.workout.startSession.useMutation();

  const handleQuickStart = async (routineId?: number) => {
    const result = await startSession.mutateAsync({
      routineId,
      name: routineId ? undefined : "자유 운동",
    });
    window.location.href = getAppPath(`/workout/${result.sessionId}`);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-semibold text-foreground">빠른 시작</h3>
          <Link href="/routines">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              전체 보기 <ChevronRight size={12} />
            </Button>
          </Link>
        </div>

        <div className="space-y-1.5">
          <Button
            className="w-full justify-start gap-3 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 h-9"
            variant="outline"
            onClick={() => handleQuickStart()}
            disabled={startSession.isPending}
          >
            <Play size={16} className="fill-primary" />
            자유 운동 시작
          </Button>

          {isLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-9 skeleton rounded-lg" />
              ))}
            </div>
          ) : routines?.slice(0, 3).map((routine) => (
            <Button
              key={routine.id}
              className="w-full justify-start gap-3 bg-accent/50 border border-border text-foreground hover:bg-accent h-9"
              variant="outline"
              onClick={() => handleQuickStart(routine.id)}
              disabled={startSession.isPending}
            >
              <Dumbbell size={16} className="text-muted-foreground" />
              <span className="flex-1 text-left truncate">{routine.name}</span>
              <Badge className={cn("text-[10px] border", goalColors[routine.goal] || goalColors.general)}>
                {goalLabels[routine.goal] || routine.goal}
              </Badge>
            </Button>
          ))}

          {!isLoading && (!routines || routines.length === 0) && (
            <Link href="/routines">
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed border-border text-muted-foreground hover:text-foreground h-9"
              >
                <Plus size={16} />
                첫 루틴 만들기
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StreakCard({ streak, isLoading }: { streak?: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streak) return null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center flex-shrink-0">
            <Flame size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">현재 스트릭</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-orange-400">{streak.current}</span>
              <span className="text-xs text-muted-foreground">일</span>
              <span className="text-[11px] text-muted-foreground">최장 {streak.longest}일</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BodyWeightSummaryCard({ weights, goal, isLoading }: { weights?: any[]; goal?: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-8 bg-muted rounded w-20"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latest = weights?.[0];
  const previous = weights?.[1];
  const diff = latest && previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : null;
  const targetWeight = (goal as any)?.targetWeight;
  const targetDiff = latest && targetWeight ? Math.round((latest.weightKg - targetWeight) * 10) / 10 : null;

  return (
    <Link href="/body-weight">
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground text-sm">체중 추적</h3>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>

          {latest ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xl font-bold text-foreground">
                    {latest.weightKg}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">kg</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(latest.recordedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  </div>
                </div>
                {diff !== null && (
                  <Badge className={cn(
                    "border text-xs",
                    diff < 0 ? "border-green-400/20 bg-green-400/10 text-green-400"
                      : diff > 0 ? "border-orange-400/20 bg-orange-400/10 text-orange-400"
                        : "border-border bg-accent text-muted-foreground"
                  )}>
                    {diff < 0 ? <TrendingDown size={11} className="mr-1" /> : <TrendingUp size={11} className="mr-1" />}
                    {diff > 0 ? "+" : ""}{diff}kg
                  </Badge>
                )}
              </div>

              {targetWeight ? (
                <div className="rounded-xl bg-accent/35 p-2">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">목표 체중</span>
                    <span className="font-semibold text-foreground">{targetWeight}kg</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {targetDiff === 0 ? "목표 달성" : targetDiff && targetDiff > 0 ? `${targetDiff}kg 감량 필요` : `${Math.abs(targetDiff ?? 0)}kg 목표보다 낮음`}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-accent/35 p-2 text-xs text-muted-foreground">
                  목표 체중을 설정하면 진행 상황이 표시됩니다.
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center">
              <Scale size={28} className="mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">체중 기록이 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">오늘 체중을 기록해보세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function MonthlyStatsCard({ stats, isLoading }: { stats?: any[]; isLoading: boolean }) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">월별 요약</h3>
          <div className="text-center py-3 text-muted-foreground">
            <p className="text-sm">아직 운동 기록이 없습니다.</p>
            <p className="text-xs mt-2">운동을 시작하면 월별 통계가 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentStats = stats.slice(-6);
  const maxVolume = Math.max(1, ...recentStats.map((item) => Number(item.totalVolume) || 0));
  const maxCount = Math.max(1, ...recentStats.map((item) => Number(item.count) || 0));

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-3">월별 요약</h3>
        {isMobile ? (
          <div className="space-y-2">
            {recentStats.slice(-4).map((item) => (
              <div key={item.month} className="rounded-xl border border-border bg-accent/25 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{item.month}</span>
                  <span className="text-muted-foreground">{Number(item.count) || 0}회 · {Math.round(Number(item.totalVolume) || 0).toLocaleString()}kg</span>
                </div>
                <div className="grid gap-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, ((Number(item.count) || 0) / maxCount) * 100)}%` }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.max(8, ((Number(item.totalVolume) || 0) / maxVolume) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Suspense fallback={<div className="h-[150px] skeleton rounded-xl" />}>
            <HomeMonthlyChart stats={stats} />
          </Suspense>
        )}
      </CardContent>
    </Card>
  );
}

function formatDelta(value: number, unit = "") {
  if (value === 0) return `변화 없음`;
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}${unit}`;
}

function ProgressReportCard({ monthlyStats, weeklyStats, isLoading }: { monthlyStats?: any[]; weeklyStats?: any; isLoading: boolean }) {
  const current = monthlyStats?.[monthlyStats.length - 1];
  const previous = monthlyStats?.[monthlyStats.length - 2];
  const volumeDelta = Math.round((current?.totalVolume ?? 0) - (previous?.totalVolume ?? 0));
  const countDelta = (current?.count ?? 0) - (previous?.count ?? 0);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-primary" />
            <h3 className="font-semibold text-foreground">주간·월간 리포트</h3>
          </div>
          {current ? <Badge className="border border-border bg-accent text-muted-foreground">{current.month}</Badge> : null}
        </div>
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-accent/25 p-3">
              <div className="text-xs text-muted-foreground">이번 달 운동</div>
              <div className="mt-1 text-xl font-bold text-foreground">{current?.count ?? 0}회</div>
              <div className={cn("mt-1 text-[11px]", countDelta >= 0 ? "text-primary" : "text-orange-400")}>
                전월 대비 {formatDelta(countDelta, "회")}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-accent/25 p-3">
              <div className="text-xs text-muted-foreground">이번 달 볼륨</div>
              <div className="mt-1 text-xl font-bold text-foreground">{Math.round(current?.totalVolume ?? 0).toLocaleString()}kg</div>
              <div className={cn("mt-1 text-[11px]", volumeDelta >= 0 ? "text-primary" : "text-orange-400")}>
                전월 대비 {formatDelta(volumeDelta, "kg")}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-accent/25 p-3">
              <div className="text-xs text-muted-foreground">주간 목표</div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {weeklyStats?.completedDays ?? 0}/{weeklyStats?.weeklyTarget ?? 0}일
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {Math.round(weeklyStats?.totalDuration ?? 0)}분 · {Math.round(weeklyStats?.totalVolume ?? 0).toLocaleString()}kg
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkoutQualityCard({ sessions, isLoading }: { sessions?: any[]; isLoading: boolean }) {
  const quality = useMemo(() => {
    const issueItems: { key: string; title: string; detail: string }[] = [];
    let zeroVolumeSessions = 0;
    let missingLogs = 0;
    for (const session of (sessions ?? []).slice(0, 8)) {
      const logs = session.logs ?? [];
      const computedVolume = logs.reduce((sum: number, item: any) => {
        const log = item.log ?? {};
        return sum + (Number(log.weightKg) || 0) * (Number(log.reps) || 0);
      }, 0);
      const weightedLogs = logs.filter((item: any) => {
        const exercise = item.exercise ?? {};
        const log = item.log ?? {};
        const isTimed = Number(log.durationSeconds) > 0;
        const isBodyweight = exercise.equipment === "bodyweight" || exercise.bodyPart === "abs";
        const isBodyControl = ["cardio", "stretching"].includes(exercise.bodyPart) || ["cardio", "flexibility"].includes(exercise.category);
        return !isTimed && !isBodyweight && !isBodyControl;
      });
      const sessionDate = new Date(session.workoutDate ?? session.startedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
      if (weightedLogs.length > 0 && Math.max(computedVolume, Number(session.totalVolume) || 0) === 0) {
        zeroVolumeSessions += 1;
        issueItems.push({
          key: `zero-${session.id}`,
          title: `${session.name || "운동 세션"} · ${sessionDate}`,
          detail: "중량 운동이 있지만 세션 볼륨이 0kg입니다.",
        });
      }
      const missingItems = logs.filter((item: any) => {
        const exercise = item.exercise ?? {};
        const log = item.log ?? {};
        const isTimed = Number(log.durationSeconds) > 0;
        const isBodyweight = exercise.equipment === "bodyweight" || exercise.bodyPart === "abs";
        const isBodyControl = ["cardio", "stretching"].includes(exercise.bodyPart) || ["cardio", "flexibility"].includes(exercise.category);
        const missingWeight = !isTimed && !isBodyweight && !isBodyControl && (Number(log.weightKg) || 0) === 0;
        const missingReps = !isTimed && (Number(log.reps) || 0) === 0;
        return missingWeight || missingReps;
      });
      missingLogs += missingItems.length;
      for (const item of missingItems.slice(0, 2)) {
        const exercise = item.exercise ?? {};
        const log = item.log ?? {};
        const missingParts = [
          (Number(log.weightKg) || 0) === 0 && exercise.equipment !== "bodyweight" && exercise.bodyPart !== "abs" ? "무게" : "",
          (Number(log.reps) || 0) === 0 ? "횟수" : "",
        ].filter(Boolean).join("/");
        issueItems.push({
          key: `log-${session.id}-${log.id ?? `${exercise.id}-${log.setNumber}`}`,
          title: `${session.name || "운동 세션"} · ${sessionDate}`,
          detail: `${exercise.nameKo ?? exercise.name ?? "운동"} ${log.setNumber ?? "-"}세트 ${missingParts} 확인`,
        });
      }
    }
    return { issueItems, zeroVolumeSessions, missingLogs };
  }, [sessions]);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {quality.issueItems.length ? <AlertTriangle size={17} className="text-orange-400" /> : <CheckCircle2 size={17} className="text-primary" />}
          <h3 className="font-semibold text-foreground">운동 기록 품질</h3>
        </div>
        {isLoading ? (
          <div className="h-16 skeleton rounded-xl" />
        ) : quality.issueItems.length ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {quality.zeroVolumeSessions > 0 && <Badge className="border border-orange-400/30 bg-orange-400/10 text-orange-200">볼륨 0 세션 {quality.zeroVolumeSessions}건</Badge>}
              {quality.missingLogs > 0 && <Badge className="border border-orange-400/30 bg-orange-400/10 text-orange-200">입력 확인 세트 {quality.missingLogs}개</Badge>}
            </div>
            {quality.issueItems.slice(0, 4).map((issue) => (
              <div key={issue.key} className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2">
                <div className="text-sm font-semibold text-orange-100">{issue.title}</div>
                <div className="mt-0.5 text-xs text-orange-200/90">{issue.detail}</div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">맨몸·복근·유산소·스트레칭은 무게 0kg이어도 정상으로 처리합니다.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary">
            최근 기록의 볼륨 계산 상태가 정상입니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentWorkouts({ sessions, isLoading }: { sessions?: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-20 skeleton rounded" />
            <div className="h-7 w-16 skeleton rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 skeleton rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentSessions = (sessions ?? []).slice(0, 3);

  if (recentSessions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">최근 운동 기록이 없습니다</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">최근 운동</h3>
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              전체 보기 <ChevronRight size={12} />
            </Button>
          </Link>
        </div>

        <div className="grid gap-3">
          {recentSessions.map((session) => {
            const exerciseNames = Array.from(
              new Map((session.logs || []).map((item: any) => [
                item.log?.exerciseId ?? item.exercise?.id ?? item.exercise?.nameKo,
                item.exercise?.nameKo ?? item.exercise?.name,
              ])).values()
            ).filter(Boolean) as string[];
            const exerciseSummary = exerciseNames.length
              ? `${exerciseNames.slice(0, 2).join(", ")}${exerciseNames.length > 2 ? ` 외 ${exerciseNames.length - 2}개` : ""}`
              : "운동 상세 없음";
            const computedVolume = (session.logs || []).reduce((sum: number, log: any) => (
              sum + ((Number(log.log?.weightKg) || 0) * (Number(log.log?.reps) || 0))
            ), 0);
            const totalVolume = Math.max(computedVolume, Number(session.totalVolume) || 0);
            return (
              <Link key={session.id} href={`/history/${session.id}`}>
                <div className="min-h-[76px] rounded-xl border border-border bg-accent/30 p-3 transition-colors hover:border-primary/25 hover:bg-accent/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm">{session.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(session.workoutDate ?? session.startedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}
                      </div>
                      <div className="mt-1 max-w-[15rem] truncate text-xs text-muted-foreground/80">
                        {exerciseSummary}
                      </div>
                    </div>
                    {totalVolume > 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-primary">{Math.round(totalVolume).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">kg 볼륨</div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BodyPartBalanceCard({ sessions, isLoading }: { sessions?: any[]; isLoading: boolean }) {
  const balance = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number; volume: number }>();
    for (const session of sessions ?? []) {
      for (const item of session.logs ?? []) {
        const exercise = (item as any).exercise;
        const log = (item as any).log;
        const key = exercise?.bodyPart;
        if (!key) continue;
        const current = buckets.get(key) ?? { label: bodyPartLabels[key] ?? key, count: 0, volume: 0 };
        current.count += 1;
        current.volume += (Number(log?.weightKg) || 0) * (Number(log?.reps) || 0);
        buckets.set(key, current);
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count || b.volume - a.volume)
      .slice(0, 6);
  }, [sessions]);
  const maxCount = Math.max(1, ...balance.map((item) => item.count));

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground">최근 부위 분포</h3>
          <span className="text-xs text-muted-foreground">최근 20회</span>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-7 skeleton rounded-lg" />)}
          </div>
        ) : balance.length ? (
          <div className="space-y-2">
            {balance.map((item) => (
              <div key={item.label} className="grid grid-cols-[56px_minmax(0,1fr)_36px] items-center gap-2 text-xs">
                <span className="truncate text-muted-foreground">{item.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(12, (item.count / maxCount) * 100)}%` }} />
                </div>
                <span className="text-right font-semibold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            운동을 기록하면 부위별 분포가 표시됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureCards() {
  const features = [
    { href: "/exercises", icon: Dumbbell, label: "운동 탐색", desc: "구기종목 포함 운동 DB", color: "text-primary bg-primary/10" },
    { href: "/routines", icon: Activity, label: "루틴 관리", desc: "맞춤 루틴 생성", color: "text-blue-400 bg-blue-400/10" },
    { href: "/history", icon: Calendar, label: "운동 기록", desc: "달력 & 차트 분석", color: "text-orange-400 bg-orange-400/10" },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {features.map((f) => (
        <Link key={f.href} href={f.href} className="block">
          <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", f.color)}>
                <f.icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{f.label}</div>
                <div className="truncate text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: homeSummary, isLoading: homeSummaryLoading } = trpc.home.summary.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  if (loading) {
    return (
      <div className="page-shell page-shell-wide space-y-4 animate-fade-in">
        <div className="h-12 skeleton rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="h-48 skeleton rounded-2xl" />
          <div className="h-48 skeleton rounded-2xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell page-shell-wide animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <div>
              <img src="/brand-mark.png" alt="" className="mb-5 h-16 w-16 object-contain" />
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">FITTRACK PRO</p>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight text-foreground sm:text-5xl">
                운동 탐색부터 기록 분석까지 한 흐름으로 관리하세요
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                2,000개 이상 운동을 먼저 둘러보고, 로그인 후 루틴·운동 기록·AI 추천을 이어서 사용할 수 있습니다.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => startLogin("google")}
                >
                  <LogIn size={18} />
                  Google로 시작
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-h-12 gap-2 border-border bg-background/60 text-foreground hover:bg-accent"
                  onClick={() => startLogin("github")}
                >
                  <Github size={18} />
                  GitHub로 시작
                </Button>
                <Button asChild size="lg" variant="ghost" className="min-h-12 gap-2 text-primary">
                  <Link href="/exercises">
                    로그인 없이 운동 보기 <ArrowRight size={17} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Search, title: "1. 운동 찾기", desc: "부위·기구·난이도로 빠르게 탐색", href: "/exercises" },
                { icon: Play, title: "2. 루틴 실행", desc: "자유 운동 또는 저장한 루틴 시작", href: "/routines" },
                { icon: BarChart3, title: "3. 변화 확인", desc: "운동량·체중·수행 기록 분석", href: "/history" },
              ].map((item) => (
                <Link key={item.title} href={item.href} className="group block">
                  <Card className="border-border bg-background/60 transition-colors group-hover:border-primary/40">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">{item.title}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <ChevronRight size={17} className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                AI 코치·루틴 저장·기록 분석은 개인 운동 데이터 보호를 위해 로그인 후 제공됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "안녕하세요";
    return "수고하셨어요";
  };
  const displayName = user?.name || user?.email?.split("@")[0] || "사용자";
  const activeGoals = homeSummary?.goals?.length ? homeSummary.goals : homeSummary?.goal ? [homeSummary.goal] : [];
  const profileLoading = homeSummaryLoading;
  const experienceLabel = homeSummary?.preferences?.experienceLevel === "advanced"
    ? "헬창"
    : homeSummary?.preferences?.experienceLevel === "intermediate"
      ? "운동러"
      : "헬린이";

  const weeklyCompleted = homeSummary?.weeklyStats?.completedDays ?? 0;
  const weeklyTarget = homeSummary?.weeklyStats?.weeklyTarget ?? 0;
  const weeklyPercent = weeklyTarget > 0 ? Math.min(100, Math.round((weeklyCompleted / weeklyTarget) * 100)) : 0;

  return (
    <div className="page-shell page-shell-wide figma-page space-y-4 animate-fade-in">
      <section className="figma-home-intro">
        <div>
          <p className="text-xs text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-bold text-foreground">{displayName} 님</h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
            {profileLoading ? (
              <>
                <div className="h-6 w-14 skeleton rounded-full" />
                <div className="h-6 w-20 skeleton rounded-full" />
              </>
            ) : (
              <>
                <Badge className="text-xs border border-primary/20 bg-primary/10 text-primary">
                  {experienceLabel}
                </Badge>
                {activeGoals.map((item: any) => (
                  <Badge key={item.id ?? item.goal} className={cn("text-xs border", goalColors[item.goal] || goalColors.general)}>
                    <Target size={10} className="mr-1" />
                    {goalLabels[item.goal] || item.goal}
                  </Badge>
                ))}
              </>
            )}
        </div>
      </section>

      <section className="figma-overall-progress" aria-label="주간 운동 진행률">
        <div className="flex items-end justify-between">
          <div>
            <span>전체 진행률</span>
            <strong>{weeklyCompleted}/{weeklyTarget || "-"}일 완료</strong>
          </div>
          <b>{weeklyPercent}%</b>
        </div>
        <div className="figma-card-progress"><span style={{ width: `${weeklyPercent}%` }} /></div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="min-w-0 space-y-4">
          <div className="figma-section-heading">
            <div><span>오늘의 운동</span><h2>다음 운동</h2></div>
          </div>
          <QuickStartCard routines={homeSummary?.routines} isLoading={homeSummaryLoading} />

          <div className="grid grid-cols-2 gap-3">
            <Button asChild className="figma-primary-action">
              <Link href="/routines"><Plus size={16} /> 새 플랜</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-12 border-border">
              <Link href="/history"><BarChart3 size={16} /> 지표 보기</Link>
            </Button>
          </div>

          <div className="figma-section-heading">
            <div><span>최근 활동</span><h2>마지막 운동</h2></div>
          </div>
          <RecentWorkouts sessions={homeSummary?.recentWorkouts} isLoading={homeSummaryLoading} />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="figma-section-heading">
            <div><span>상세 지표</span><h2>이번 주 요약</h2></div>
          </div>
          <WeeklyGoalDashboard weeklyStats={homeSummary?.weeklyStats} isLoading={homeSummaryLoading} />
          {homeSummaryLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[70px] skeleton rounded-xl" />)}
            </div>
          ) : homeSummary?.stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
              <StatCard icon={Trophy} label="총 운동" value={`${homeSummary.stats.totalSessions}회`} color="bg-primary/10 text-primary" />
              <StatCard icon={Flame} label="이번 주" value={`${homeSummary.stats.recentSessionCount}회`} color="bg-orange-400/10 text-orange-400" />
              <StatCard icon={TrendingUp} label="총 볼륨" value={`${(homeSummary.stats.totalVolume / 1000).toFixed(1)}t`} color="bg-blue-400/10 text-blue-400" />
              <StatCard icon={Calendar} label="운동 시간" value={`${Math.round(homeSummary.stats.totalDurationMinutes / 60)}h`} color="bg-purple-400/10 text-purple-400" />
            </div>
          )}
          <ProgressReportCard monthlyStats={homeSummary?.monthlyStats} weeklyStats={homeSummary?.weeklyStats} isLoading={homeSummaryLoading} />
          <MonthlyStatsCard stats={homeSummary?.monthlyStats} isLoading={homeSummaryLoading} />
          <WorkoutQualityCard sessions={homeSummary?.recentWorkouts} isLoading={homeSummaryLoading} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StreakCard streak={homeSummary?.streak} isLoading={homeSummaryLoading} />
            <BodyWeightSummaryCard weights={homeSummary?.bodyWeights} goal={homeSummary?.goal} isLoading={homeSummaryLoading} />
          </div>
          <BodyPartBalanceCard sessions={homeSummary?.recentWorkouts} isLoading={homeSummaryLoading} />
          <FeatureCards />
          <Link href="/ai-coach">
            <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20 cursor-pointer hover:border-primary/40 transition-all duration-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">AI 코치에게 물어보세요</div>
                    <div className="text-xs text-muted-foreground mt-0.5">운동 분석 · 무게 추천 · 맞춤 프로그램</div>
                  </div>
                  <ArrowRight size={18} className="text-primary flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
