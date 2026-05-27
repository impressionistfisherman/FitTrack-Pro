import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity, Calendar, Dumbbell, Flame, LogIn, LogOut, MapPin, Ruler, Scale, Settings, Target, TrendingDown, TrendingUp, Trophy, User
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line, Legend
} from "recharts";
import BodyWeightTracker from "@/components/BodyWeightTracker";

const goalOptions = [
  { value: "hypertrophy", label: "근비대", desc: "근육량 증가", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "fat_loss", label: "다이어트", desc: "체지방 감소", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { value: "strength", label: "근력", desc: "최대 근력 향상", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { value: "endurance", label: "지구력", desc: "근지구력 향상", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { value: "flexibility", label: "유연성", desc: "가동성 향상", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { value: "general", label: "일반 건강", desc: "전반적 건강", color: "text-primary bg-primary/10 border-primary/20" },
];

const experienceOptions = [
  { value: "beginner", label: "헬린이", desc: "운동을 막 시작했어요" },
  { value: "intermediate", label: "운동러", desc: "기본 루틴은 익숙해요" },
  { value: "advanced", label: "헬창", desc: "고강도 훈련도 가능해요" },
] as const;

const gymLocationOptions = [
  { value: "gym", label: "헬스장" },
  { value: "home", label: "집" },
  { value: "outdoor", label: "야외" },
] as const;

const equipmentOptions = [
  { value: "bodyweight", label: "맨몸" },
  { value: "dumbbell", label: "덤벨" },
  { value: "barbell", label: "바벨" },
  { value: "machine", label: "머신" },
  { value: "cable", label: "케이블" },
  { value: "resistance_band", label: "밴드" },
  { value: "kettlebell", label: "케틀벨" },
] as const;

type EquipmentValue = (typeof equipmentOptions)[number]["value"] | "none";

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const { data: stats } = trpc.history.stats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: goal } = trpc.goals.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: goals } = trpc.goals.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: preferences } = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: weights } = trpc.bodyWeight.list.useQuery({ limit: 30 }, { enabled: isAuthenticated });
  const goalInfo = goal as any | null | undefined;
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [weeklyWorkouts, setWeeklyWorkouts] = useState("3");
  const [targetWeight, setTargetWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("male");
  const [birthYear, setBirthYear] = useState("");
  const [gymName, setGymName] = useState("");
  const [gymLocation, setGymLocation] = useState<"gym" | "home" | "outdoor">("gym");
  const [gymEquipment, setGymEquipment] = useState<EquipmentValue[]>(["dumbbell", "barbell", "machine", "cable"]);
  const [gymEquipmentDetails, setGymEquipmentDetails] = useState<string[]>([]);
  const [gymEquipmentInput, setGymEquipmentInput] = useState("");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [avoidExercises, setAvoidExercises] = useState("");
  const [preferredExercises, setPreferredExercises] = useState("");
  const [availableWorkoutTimes, setAvailableWorkoutTimes] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");

  // goal 데이터 로드 시 폼 초기화
  const [initialized, setInitialized] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  
  useEffect(() => {
    if ((goal || goals || preferences) && !initialized) {
      setInitialized(true);
      const activeGoals = goals?.length ? goals.map((item: any) => item.goal) : goal?.goal ? [goal.goal] : [];
      if (activeGoals.length) {
        setSelectedGoals(activeGoals);
        setSelectedGoal(activeGoals[0]);
      }
      if (goal?.weeklyWorkouts) setWeeklyWorkouts(String(goal.weeklyWorkouts));
      if (goal?.targetWeight) setTargetWeight(String(goal.targetWeight));
      if (goalInfo?.heightCm) setHeightCm(String(goalInfo.heightCm));
      if (goalInfo?.gender) setGender(goalInfo.gender);
      if (goalInfo?.birthYear) setBirthYear(String(goalInfo.birthYear));
      if ((preferences as any)?.experienceLevel) setExperienceLevel((preferences as any).experienceLevel);
      if ((preferences as any)?.gymName !== undefined) setGymName((preferences as any).gymName || "");
      if ((preferences as any)?.gymLocation) setGymLocation((preferences as any).gymLocation);
      if ((preferences as any)?.gymEquipment?.length) setGymEquipment((preferences as any).gymEquipment);
      if ((preferences as any)?.gymEquipmentDetails?.length) setGymEquipmentDetails((preferences as any).gymEquipmentDetails);
      if ((preferences as any)?.injuryNotes !== undefined) setInjuryNotes((preferences as any).injuryNotes || "");
      if ((preferences as any)?.avoidExercises !== undefined) setAvoidExercises((preferences as any).avoidExercises || "");
      if ((preferences as any)?.preferredExercises !== undefined) setPreferredExercises((preferences as any).preferredExercises || "");
      if ((preferences as any)?.availableWorkoutTimes !== undefined) setAvailableWorkoutTimes((preferences as any).availableWorkoutTimes || "");
    }
  }, [goal, goalInfo, goals, preferences, initialized]);

  useEffect(() => {
    if (user && !nameInitialized) {
      const savedDisplayName = (preferences as any)?.displayName;
      setDisplayNameInput(savedDisplayName || user.name || user.email?.split("@")[0] || "");
      setNameInitialized(true);
    }
  }, [nameInitialized, preferences, user]);

  const setGoalMutation = trpc.goals.set.useMutation({
    onSuccess: () => {
      toast.success("프로필 설정을 저장했습니다.");
      utils.goals.get.invalidate();
      utils.goals.list.invalidate();
      utils.preferences.get.invalidate();
      utils.ai.dietRecommendation.invalidate();
    },
    onError: () => toast.error("목표 설정에 실패했습니다."),
  });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("표시 이름을 저장했습니다.");
      utils.auth.me.invalidate();
      utils.preferences.get.invalidate();
    },
    onError: () => toast.error("이름 저장에 실패했습니다."),
  });

  const saveProfileSettings = () => {
    const name = displayNameInput.replace(/\s+/g, " ").trim();
    if (!name) {
      toast.error("표시 이름을 입력해주세요.");
      return;
    }
    updateProfileMutation.mutate({ name });
    if (selectedGoals.length === 0) {
      toast.info("운동 목표를 선택하면 신체 정보와 AI 설정도 함께 저장됩니다.");
      return;
    }
    setGoalMutation.mutate({
      goal: (selectedGoals[0] || selectedGoal) as any,
      goals: selectedGoals as any,
      weeklyWorkouts: parseInt(weeklyWorkouts),
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      gender: gender || undefined,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      experienceLevel,
      gymName,
      gymLocation,
      gymEquipment: gymLocation === "outdoor" ? ["bodyweight"] : gymEquipment,
      gymEquipmentDetails: gymLocation === "outdoor" ? [] : gymEquipmentDetails,
      injuryNotes,
      avoidExercises,
      preferredExercises,
      availableWorkoutTimes,
    });
  };

  if (loading) {
    return (
      <div className="page-shell page-shell-narrow space-y-4">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-72 skeleton rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center">
        <User size={40} className="text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />로그인
        </Button>
      </div>
    );
  }

  const currentGoalConfig = goal ? goalOptions.find((g) => g.value === goal.goal) : null;
  const displayName = displayNameInput.trim() || user?.name || user?.email?.split("@")[0] || "사용자";
  const toggleGoal = (value: string) => {
    setSelectedGoals((items) => {
      const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
      if (next.length > 0) setSelectedGoal(next[0]);
      return next;
    });
  };
  const toggleGymEquipment = (value: EquipmentValue) => {
    setGymEquipment((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };
  const addGymEquipmentDetail = () => {
    const value = gymEquipmentInput.replace(/\s+/g, " ").trim();
    if (!value) return;
    setGymEquipmentDetails((items) => {
      if (items.some((item) => item.toLowerCase() === value.toLowerCase())) return items;
      return [...items, value].slice(0, 40);
    });
    setGymEquipmentInput("");
  };
  const removeGymEquipmentDetail = (value: string) => {
    setGymEquipmentDetails((items) => items.filter((item) => item !== value));
  };

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">프로필</h1>
        <p className="page-description">목표, 숙련도, 신체 정보를 관리하세요</p>
      </div>

      {/* User Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
              {currentGoalConfig && (
                <Badge className={cn("mt-2 text-xs border", currentGoalConfig.color)}>
                  <Target size={10} className="mr-1" />
                  {currentGoalConfig.label}
                </Badge>
              )}
            </div>
            <div className="w-full sm:max-w-xs">
              <Label className="mb-1.5 block text-xs text-muted-foreground">표시 이름</Label>
              <Input
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder="앱에서 사용할 이름"
                className="bg-accent border-border text-foreground"
                maxLength={40}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Trophy, label: "총 운동", value: `${stats.totalSessions}회`, color: "text-primary bg-primary/10" },
            { icon: Flame, label: "이번 주", value: `${stats.recentSessionCount}회`, color: "text-orange-400 bg-orange-400/10" },
            { icon: TrendingUp, label: "총 볼륨", value: `${(stats.totalVolume / 1000).toFixed(1)}t`, color: "text-blue-400 bg-blue-400/10" },
            { icon: Calendar, label: "운동 시간", value: `${Math.round(stats.totalDurationMinutes / 60)}h`, color: "text-purple-400 bg-purple-400/10" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2", s.color)}>
                  <s.icon size={16} />
                </div>
                <div className="text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── 체중 기록 (BodyWeightTracker) ── */}
      <BodyWeightTracker />

      {/* ── 신체 정보 대시보드 ── */}
      {(() => {
        const h = goalInfo?.heightCm;
        const g = goalInfo?.gender;
        const by = goalInfo?.birthYear;
        const age = by ? new Date().getFullYear() - by : null;
        const latestW = weights?.[0]?.weightKg;
        const bmi = h && latestW ? Math.round((latestW / ((h / 100) ** 2)) * 10) / 10 : null;
        const bmiCategory = bmi
          ? bmi < 18.5 ? { label: "저체중", color: "text-blue-400" }
          : bmi < 23 ? { label: "정상", color: "text-green-400" }
          : bmi < 25 ? { label: "과체중", color: "text-yellow-400" }
          : { label: "비만", color: "text-red-400" }
          : null;
        const targetW = goalInfo?.targetWeight;
        const weightDiff = latestW && targetW ? Math.round((latestW - targetW) * 10) / 10 : null;

        // 체중 차트 데이터 (오래된 순)
        const chartData = [...(weights || [])].reverse().map(w => ({
          date: new Date(w.recordedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
          체중: w.weightKg,
          체지방: w.bodyFatPct ?? undefined,
        }));

        const hasBodyInfo = h || g || by || latestW;
        if (!hasBodyInfo) return null;

        return (
          <div className="mb-6 space-y-4">
            {/* 신체 정보 요약 카드 */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler size={16} className="text-primary" />
                  <span className="font-semibold text-foreground">신체 정보</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {h && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Ruler size={14} className="mx-auto mb-1 text-blue-400" />
                      <div className="text-lg font-bold text-foreground">{h}<span className="text-xs text-muted-foreground">cm</span></div>
                      <div className="text-[10px] text-muted-foreground">신장</div>
                    </div>
                  )}
                  {age && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <User size={14} className="mx-auto mb-1 text-purple-400" />
                      <div className="text-lg font-bold text-foreground">{age}<span className="text-xs text-muted-foreground">세</span></div>
                      <div className="text-[10px] text-muted-foreground">{g === "female" ? "여성" : "남성"}</div>
                    </div>
                  )}
                  {latestW && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Scale size={14} className="mx-auto mb-1 text-green-400" />
                      <div className="text-lg font-bold text-foreground">{latestW}<span className="text-xs text-muted-foreground">kg</span></div>
                      <div className="text-[10px] text-muted-foreground">현재 체중</div>
                    </div>
                  )}
                  {bmi && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Activity size={14} className={cn("mx-auto mb-1", bmiCategory?.color || "text-primary")} />
                      <div className={cn("text-lg font-bold", bmiCategory?.color || "text-foreground")}>{bmi}</div>
                      <div className="text-[10px] text-muted-foreground">BMI ({bmiCategory?.label})</div>
                    </div>
                  )}
                  {targetW && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Target size={14} className="mx-auto mb-1 text-primary" />
                      <div className="text-lg font-bold text-foreground">{targetW}<span className="text-xs text-muted-foreground">kg</span></div>
                      <div className="text-[10px] text-muted-foreground">목표 체중</div>
                    </div>
                  )}
                </div>

                {/* 목표 체중 달성률 */}
                {latestW && targetW && (
                  <div className="mt-4 p-3 bg-accent/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Target size={13} className="text-primary" />
                        <span className="text-xs font-semibold text-foreground">목표 체중 달성률</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {weightDiff !== null && weightDiff > 0 ? (
                          <><TrendingDown size={12} className="text-orange-400" /><span className="text-orange-400 font-semibold">{weightDiff}kg 남음</span></>
                        ) : weightDiff !== null && weightDiff < 0 ? (
                          <><TrendingUp size={12} className="text-blue-400" /><span className="text-blue-400 font-semibold">{Math.abs(weightDiff)}kg 초과</span></>
                        ) : (
                          <span className="text-green-400 font-semibold">목표 달성!</span>
                        )}
                      </div>
                    </div>
                    {/* 프로그레스 바 */}
                    {(() => {
                      const startW = weights?.[weights.length - 1]?.weightKg || latestW;
                      const totalDiff = Math.abs(startW - targetW);
                      const doneDiff = Math.abs(startW - latestW);
                      const pct = totalDiff > 0 ? Math.min(100, Math.round((doneDiff / totalDiff) * 100)) : 100;
                      return (
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>시작 {startW}kg</span>
                            <span className="font-semibold text-primary">{pct}%</span>
                            <span>목표 {targetW}kg</span>
                          </div>
                          <div className="h-2 bg-accent rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 체중 변화 그래프 */}
            {chartData.length >= 2 && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" />
                      <span className="font-semibold text-foreground">체중 변화 추이</span>
                    </div>
                    <div className="text-xs text-muted-foreground">최근 {chartData.length}회 기록</div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGradProfile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fatGradProfile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 260)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="weight"
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}kg`}
                      />
                      {chartData.some(d => d.체지방 !== undefined) && (
                        <YAxis
                          yAxisId="fat"
                          orientation="right"
                          domain={[0, 50]}
                          tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                          color: "var(--foreground)",
                        }}
                        formatter={(value: any, name: string) => [
                          name === "체중" ? `${value}kg` : `${value}%`,
                          name,
                        ]}
                      />
                      {targetW && (
                        <ReferenceLine
                          yAxisId="weight"
                          y={targetW}
                          stroke="oklch(0.74 0.18 160)"
                          strokeDasharray="6 3"
                          strokeWidth={1.5}
                          label={{ value: `목표 ${targetW}kg`, position: "insideTopRight", fontSize: 10, fill: "oklch(0.74 0.18 160)" }}
                        />
                      )}
                      <Area
                        yAxisId="weight"
                        type="monotone"
                        dataKey="체중"
                        stroke="oklch(0.74 0.18 160)"
                        fill="url(#weightGradProfile)"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: "oklch(0.74 0.18 160)", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                      {chartData.some(d => d.체지방 !== undefined) && (
                        <Area
                          yAxisId="fat"
                          type="monotone"
                          dataKey="체지방"
                          stroke="#f97316"
                          fill="url(#fatGradProfile)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* 범례 */}
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-0.5 rounded bg-emerald-400" />
                      체중
                    </div>
                    {chartData.some(d => d.체지방 !== undefined) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-0.5 rounded bg-orange-400" />
                        체지방률
                      </div>
                    )}
                    {targetW && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-0.5 rounded bg-emerald-400 opacity-50" style={{ borderTop: '1px dashed' }} />
                        목표 체중
                      </div>
                    )}
                  </div>

                  {/* 변화 요약 */}
                  {chartData.length >= 2 && (() => {
                    const first = chartData[0].체중;
                    const last = chartData[chartData.length - 1].체중;
                    const diff = Math.round((last - first) * 10) / 10;
                    return (
                      <div className="mt-3 flex items-center justify-center gap-6 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">시작</div>
                          <div className="font-semibold text-foreground">{first}kg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">변화량</div>
                          <div className={cn("font-bold", diff > 0 ? "text-orange-400" : diff < 0 ? "text-green-400" : "text-muted-foreground")}>
                            {diff > 0 ? "+" : ""}{diff}kg
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">현재</div>
                          <div className="font-semibold text-foreground">{last}kg</div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Goal Setting */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-primary" />
            <span className="font-semibold text-foreground">운동 목표 설정</span>
          </div>

            {(goals?.length || goal) && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl mb-4">
                <Target size={14} className="text-primary" />
                <span className="text-sm text-primary font-medium">
                  현재: {(goals?.length ? goals : goal ? [goal] : [])
                    .map((item: any) => goalOptions.find((g) => g.value === item.goal)?.label || item.goal)
                    .join(" + ")} · 주 {goal?.weeklyWorkouts ?? 3}회
                </span>
              </div>
            )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {goalOptions.map((g) => (
              <button
                key={g.value}
                onClick={() => toggleGoal(g.value)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  selectedGoals.includes(g.value)
                    ? g.color
                    : "bg-accent border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                <div className="text-sm font-semibold">{g.label}</div>
                <div className="text-xs opacity-70">{g.desc}</div>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">운동 숙련도</Label>
            <div className="grid grid-cols-3 gap-2">
              {experienceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExperienceLevel(option.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    experienceLevel === option.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-accent text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="text-[11px] opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">내 운동 환경 <span className="text-xs text-muted-foreground font-normal">(AI 추천 기본값)</span></span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">헬스장 / 장소 이름</Label>
                <Input
                  placeholder="예: 집 근처 헬스장, 회사 헬스장"
                  value={gymName}
                  onChange={(event) => setGymName(event.target.value)}
                  className="bg-accent border-border text-foreground"
                  maxLength={80}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">기본 운동 장소</Label>
                <Select value={gymLocation} onValueChange={(value) => setGymLocation(value as any)}>
                  <SelectTrigger className="bg-accent border-border text-foreground w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {gymLocationOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="text-foreground">{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {gymLocation !== "outdoor" && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">기구 종류</Label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleGymEquipment(item.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        gymEquipment.includes(item.value)
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-accent text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">실제 보유 기구</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="예: 스미스 머신, 레그프레스, 랫풀다운"
                      value={gymEquipmentInput}
                      onChange={(event) => setGymEquipmentInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addGymEquipmentDetail();
                        }
                      }}
                      className="bg-accent border-border text-foreground"
                      maxLength={50}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-border bg-accent text-foreground"
                      onClick={addGymEquipmentDetail}
                      disabled={!gymEquipmentInput.trim() || gymEquipmentDetails.length >= 40}
                    >
                      추가
                    </Button>
                  </div>
                  {gymEquipmentDetails.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {gymEquipmentDetails.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeGymEquipmentDetail(item)}
                          className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          title="클릭하면 삭제됩니다"
                        >
                          {item} ×
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      실제 기구명을 등록하면 AI가 해당 기구를 우선해서 루틴을 추천합니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">AI 개인화 조건</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">부상/통증/주의 부위</Label>
                <Textarea
                  value={injuryNotes}
                  onChange={(event) => setInjuryNotes(event.target.value)}
                  placeholder="예: 허리 부담 적게, 오른쪽 무릎 통증"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">피하고 싶은 운동</Label>
                <Textarea
                  value={avoidExercises}
                  onChange={(event) => setAvoidExercises(event.target.value)}
                  placeholder="예: 백스쿼트 제외, 오버헤드 프레스 부담"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">선호 운동</Label>
                <Textarea
                  value={preferredExercises}
                  onChange={(event) => setPreferredExercises(event.target.value)}
                  placeholder="예: 케이블 위주, 머신 선호, 덤벨 로우 좋아함"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">운동 가능 시간대/요일</Label>
                <Textarea
                  value={availableWorkoutTimes}
                  onChange={(event) => setAvailableWorkoutTimes(event.target.value)}
                  placeholder="예: 평일 저녁 90분, 주말 오전만 가능"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={300}
                />
              </div>
            </div>
          </div>

          {/* 주 운동 횟수 */}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">주 운동 횟수</Label>
            <Select value={weeklyWorkouts} onValueChange={setWeeklyWorkouts}>
              <SelectTrigger className="bg-accent border-border text-foreground w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {[1,2,3,4,5,6,7].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-foreground">주 {d}회</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 신체 정보 섹션 */}
          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Ruler size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">신체 정보 <span className="text-xs text-muted-foreground font-normal">(AI 운동/식단 추천 정확도 향상)</span></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 신장 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">신장 (cm)</Label>
                <Input
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={100} max={250}
                />
              </div>
              {/* 나이 (출생년도) */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">출생년도</Label>
                <Input
                  type="number"
                  placeholder="1995"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={1920} max={2010}
                />
              </div>
              {/* 성별 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">성별</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                  <SelectTrigger className="bg-accent border-border text-foreground w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male" className="text-foreground">남성</SelectItem>
                    <SelectItem value="female" className="text-foreground">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 목표 체중 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">목표 체중 (kg)</Label>
                <Input
                  type="number"
                  placeholder="65"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={30} max={200} step={0.5}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={setGoalMutation.isPending || updateProfileMutation.isPending}
            onClick={saveProfileSettings}
          >
            {setGoalMutation.isPending || updateProfileMutation.isPending ? "저장 중..." : "프로필 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={logout}
      >
        <LogOut size={16} />
        로그아웃
      </Button>
    </div>
  );
}
