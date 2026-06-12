import { useAuth } from "@/_core/hooks/useAuth";
import { getAppPath, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { WeeklyGoalDashboard } from "@/components/WeeklyGoalDashboard";
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  ChevronRight,
  Dumbbell,
  Flame,
  Github,
  LogIn,
  Play,
  Plus,
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

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

function QuickStartCard() {
  const { data: routines, isLoading } = trpc.routines.list.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
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

function StreakCard() {
  const { data: streak, isLoading } = trpc.streak.get.useQuery(undefined, { retry: false });

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

function BodyWeightSummaryCard() {
  const { data: weights, isLoading } = trpc.bodyWeight.list.useQuery({ limit: 8 }, { retry: false });
  const { data: goal } = trpc.goals.get.useQuery(undefined, { retry: false });

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

function MonthlyStatsCard() {
  const { data: stats, isLoading } = trpc.monthlyStats.get.useQuery({ months: 6 }, { retry: false });
  const volumeKey = "볼륨(kg)";

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

  // 최근 6개월 데이터 (역순 정렬)
  const chartData = stats.slice(-6).map((item) => ({
    month: item.month,
    운동횟수: item.count,
    [volumeKey]: Math.round(item.totalVolume),
  }));

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-3">월별 요약</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="count" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
            <YAxis
              yAxisId="volume"
              orientation="right"
              width={48}
              stroke="var(--color-blue-400)"
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => Number(value).toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "var(--color-foreground)" }}
              formatter={(value, name) => {
                const numericValue = Number(value) || 0;
                return name === volumeKey
                  ? [`${numericValue.toLocaleString()}kg`, "볼륨"]
                  : [`${numericValue.toLocaleString()}회`, "운동횟수"];
              }}
            />
            <Legend />
            <Bar yAxisId="count" dataKey="운동횟수" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="volume" dataKey={volumeKey} name="볼륨" fill="var(--color-blue-400)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RecentWorkouts() {
  const { data: sessions, isLoading } = trpc.history.recentWorkouts.useQuery(
    { limit: 3 },
    { retry: false, staleTime: 1000 * 60 * 2 }
  );

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

  if (!sessions || sessions.length === 0) {
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
          {sessions.map((session) => {
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

function BodyPartBalanceCard() {
  const { data: sessions, isLoading } = trpc.history.recentWorkouts.useQuery({ limit: 20 }, { retry: false });
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
  const { data: stats, isLoading: statsLoading } = trpc.history.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
  const { data: goal, isLoading: goalLoading } = trpc.goals.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const { data: goals, isLoading: goalsLoading } = trpc.goals.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const { data: preferences, isLoading: preferencesLoading } = trpc.preferences.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
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
      <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="text-center max-w-md relative z-10 animate-slide-up">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <img src="/brand-mark.png" alt="FitTrack" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-4xl font-display tracking-wider text-foreground mb-2">FITTRACK PRO</h1>
          <p className="text-muted-foreground mb-2 text-sm font-medium">스마트 운동 관리 플랫폼</p>
          <p className="text-muted-foreground/70 text-xs mb-8 leading-relaxed">
            구기종목 포함 운동 데이터베이스 · AI 맞춤 추천<br />
            루틴 관리 · 운동 기록 · 진행 분석
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: Dumbbell, label: "운동 DB" },
              { icon: Bot, label: "AI 추천" },
              { icon: TrendingUp, label: "진행 분석" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border">
                <item.icon size={20} className="text-primary" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
              onClick={() => startLogin("google")}
            >
              <LogIn size={18} />
              Google
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-border bg-card text-foreground hover:bg-accent h-12 text-base font-semibold"
              onClick={() => startLogin("github")}
            >
              <Github size={18} />
              GitHub
            </Button>
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
  const activeGoals = goals?.length ? goals : goal ? [goal] : [];
  const profileLoading = preferencesLoading || goalLoading || goalsLoading;
  const experienceLabel = preferences?.experienceLevel === "advanced"
    ? "헬창"
    : preferences?.experienceLevel === "intermediate"
      ? "운동러"
      : "헬린이";

  return (
    <div className="page-shell page-shell-wide space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{greeting()},</p>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{displayName} 님 👋</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/ai-coach">
            <Button className="gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20" variant="outline">
              <Zap size={16} />
              <span className="hidden sm:inline">AI 추천</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-3">
          <WeeklyGoalDashboard />
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[70px] skeleton rounded-xl" />)}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
              <StatCard icon={Trophy} label="총 운동" value={`${stats.totalSessions}회`} color="bg-primary/10 text-primary" />
              <StatCard icon={Flame} label="이번 주" value={`${stats.recentSessionCount}회`} color="bg-orange-400/10 text-orange-400" />
              <StatCard icon={TrendingUp} label="총 볼륨" value={`${(stats.totalVolume / 1000).toFixed(1)}t`} color="bg-blue-400/10 text-blue-400" />
              <StatCard icon={Calendar} label="운동 시간" value={`${Math.round(stats.totalDurationMinutes / 60)}h`} color="bg-purple-400/10 text-purple-400" />
            </div>
          )}
          <MonthlyStatsCard />
          <RecentWorkouts />
        </div>

        <div className="min-w-0 space-y-3">
          <QuickStartCard />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StreakCard />
            <BodyWeightSummaryCard />
          </div>
          <BodyPartBalanceCard />
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
