import { Card, CardContent } from "@/components/ui/card";
import DietRecommendation from "@/components/DietRecommendation";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Dumbbell, RefreshCw, Save, Sparkles, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const equipmentOptions = [
  { value: "bodyweight", label: "맨몸" },
  { value: "dumbbell", label: "덤벨" },
  { value: "barbell", label: "바벨" },
  { value: "machine", label: "머신" },
  { value: "cable", label: "케이블" },
  { value: "resistance_band", label: "밴드" },
];

const splitOptions = [
  { value: "auto", label: "AI 자동" },
  { value: "custom_day_targets", label: "사용자 선택" },
  { value: "full_body", label: "전신" },
  { value: "upper_lower", label: "상/하체" },
  { value: "push_pull_legs", label: "PPL" },
  { value: "body_part", label: "부위 분할" },
  { value: "hybrid", label: "혼합" },
];

const bodyPartOptions = [
  { value: "chest", label: "가슴" },
  { value: "back", label: "등" },
  { value: "shoulders", label: "어깨" },
  { value: "arms", label: "팔" },
  { value: "legs", label: "하체" },
  { value: "glutes", label: "둔근" },
  { value: "abs", label: "복근" },
  { value: "cardio", label: "유산소" },
];

const targetBodyPartOptions = bodyPartOptions.filter((item) => item.value !== "cardio");
const routineDayTargetOptions = bodyPartOptions;

const minuteOptions = [0, 5, 10, 15, 20, 30, 40];
const cardioMinuteOptions = [0, 10, 15, 20, 25, 30, 40, 60];

function formatDayFocusNotes(dayTargets: string[][]) {
  return dayTargets
    .map((targets, index) => {
      const labels = targets
        .map((value) => bodyPartOptions.find((item) => item.value === value)?.label ?? value)
        .join("/");
      return labels ? `${index + 1}일차 ${labels}` : null;
    })
    .filter(Boolean)
    .join(", ");
}

function ProgramRecommendation() {
  const [location, setLocation] = useState<"gym" | "home" | "outdoor">("gym");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "barbell", "machine", "cable"]);
  const [splitPreference, setSplitPreference] = useState("auto");
  const [excludedBodyParts, setExcludedBodyParts] = useState<string[]>([]);
  const [includeCardio, setIncludeCardio] = useState(true);
  const [avoidCardioOnLegDay, setAvoidCardioOnLegDay] = useState(true);
  const [includeCore, setIncludeCore] = useState(true);
  const [warmupStretchMinutes, setWarmupStretchMinutes] = useState("20");
  const [cooldownStretchMinutes, setCooldownStretchMinutes] = useState("20");
  const [cardioMinutes, setCardioMinutes] = useState("20");
  const [dayTargets, setDayTargets] = useState<string[][]>(Array.from({ length: Number(daysPerWeek) }, () => []));
  const [customRequest, setCustomRequest] = useState("");
  const utils = trpc.useUtils();
  const programMutation = trpc.ai.programRecommendation.useMutation();
  const saveProgram = trpc.ai.saveProgramAsRoutines.useMutation({
    onSuccess: (result) => {
      const totalExercises = result.created.reduce((sum: number, item: any) => sum + item.addedCount, 0);
      toast.success(`${result.created.length}개 루틴을 저장했습니다.`, {
        description: totalExercises > 0 ? `스트레칭 포함 ${totalExercises}개 항목이 루틴에 연결되었습니다.` : "운동명 매칭이 안 된 항목은 비워둔 루틴으로 저장되었습니다.",
      });
      utils.routines.list.invalidate();
    },
    onError: () => toast.error("루틴 저장에 실패했습니다."),
  });
  const program = programMutation.data?.program;

  useEffect(() => {
    const count = Number(daysPerWeek);
    setDayTargets((current) => Array.from({ length: count }, (_, index) => current[index] ?? []));
  }, [daysPerWeek]);

  const toggleEquipment = (value: string) => {
    setEquipment((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const toggleExcludedBodyPart = (value: string) => {
    setExcludedBodyParts((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const toggleDayTarget = (dayIndex: number, value: string) => {
    setDayTargets((days) => days.map((targets, index) => {
      if (index !== dayIndex) return targets;
      return targets.includes(value)
        ? targets.filter((item) => item !== value)
        : [...targets, value];
    }));
  };

  const requestProgram = () => {
    if (location !== "outdoor" && equipment.length === 0) {
      toast.error("사용 가능한 기구를 하나 이상 선택하세요.");
      return;
    }
    const isCustomSplit = splitPreference === "custom_day_targets";
    const selectedDayParts = dayTargets.flat();
    programMutation.mutate({
      location,
      equipment: location === "gym" ? equipment : location === "home" ? equipment : ["bodyweight"],
      sessionDuration: Number(sessionDuration),
      daysPerWeek: Number(daysPerWeek),
      splitPreference,
      excludedBodyParts,
      includeCardio: isCustomSplit ? selectedDayParts.includes("cardio") : includeCardio,
      avoidCardioOnLegDay: isCustomSplit ? false : avoidCardioOnLegDay,
      includeCore: isCustomSplit ? selectedDayParts.includes("abs") : includeCore,
      warmupStretchMinutes: Number(warmupStretchMinutes),
      cooldownStretchMinutes: Number(cooldownStretchMinutes),
      cardioMinutes: Number(cardioMinutes),
      dayFocusNotes: isCustomSplit ? formatDayFocusNotes(dayTargets) || undefined : undefined,
      customRequest: customRequest.trim() || undefined,
    });
  };

  const saveAsRoutines = () => {
    if (!program) return;
    saveProgram.mutate({ program, daysPerWeek: Number(daysPerWeek) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} className="text-primary" />
          <span className="font-semibold text-foreground">AI 맞춤 운동 추천</span>
        </div>
        <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={requestProgram} disabled={programMutation.isPending}>
          <RefreshCw size={13} />
          {programMutation.isPending ? "생성 중" : "추천 받기"}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 장소</div>
              <Select value={location} onValueChange={(value) => setLocation(value as any)}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="gym">헬스장</SelectItem>
                  <SelectItem value="home">집</SelectItem>
                  <SelectItem value="outdoor">야외</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 시간</div>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {[30, 45, 60, 75, 90, 120].map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">주당 운동 일 수</div>
              <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <SelectItem key={days} value={String(days)}>{days}일</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {location !== "outdoor" && (
            <div className="border-t border-border/60 pt-4">
              <div className="mb-1.5 text-xs text-muted-foreground">사용 가능 기구</div>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleEquipment(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${equipment.includes(item.value) ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`grid gap-3 border-t border-border/60 pt-4 ${splitPreference === "custom_day_targets" ? "" : "lg:grid-cols-2"}`}>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">분할 방식</div>
              <Select value={splitPreference} onValueChange={setSplitPreference}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {splitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {splitPreference !== "custom_day_targets" && (
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">추가 구성</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeCardio((value) => !value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${includeCardio ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                >
                  유산소 포함
                </button>
                {includeCardio && (
                  <button
                    type="button"
                    onClick={() => setAvoidCardioOnLegDay((value) => !value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${avoidCardioOnLegDay ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                  >
                    하체일 유산소 분리
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIncludeCore((value) => !value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${includeCore ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                >
                  복근 포함
                </button>
              </div>
            </div>
            )}
          </div>

          <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 전 스트레칭</div>
              <Select value={warmupStretchMinutes} onValueChange={setWarmupStretchMinutes}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {minuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 후 스트레칭</div>
              <Select value={cooldownStretchMinutes} onValueChange={setCooldownStretchMinutes}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {minuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">유산소 시간</div>
              <Select value={cardioMinutes} onValueChange={setCardioMinutes} disabled={!includeCardio}>
                <SelectTrigger className="h-11 w-full bg-accent border-border text-foreground disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {cardioMinuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <div className="mb-1.5 text-xs text-muted-foreground">추천에서 뺄 부위</div>
            <div className="flex flex-wrap gap-2">
              {bodyPartOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleExcludedBodyPart(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${excludedBodyParts.includes(item.value) ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-accent text-muted-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {splitPreference === "custom_day_targets" && (
            <div className="border-t border-border/60 pt-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">일차별 운동 부위</div>
                  <div className="text-xs text-muted-foreground/80">비워둔 일차는 AI가 목표와 회복을 보고 채웁니다.</div>
                </div>
                {formatDayFocusNotes(dayTargets) && (
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                    {formatDayFocusNotes(dayTargets)}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {dayTargets.map((targets, dayIndex) => (
                  <div key={dayIndex} className="grid gap-2 rounded-lg bg-accent/35 p-3 sm:grid-cols-[72px_1fr] sm:items-center">
                    <div className="text-xs font-semibold text-foreground">{dayIndex + 1}일차</div>
                    <div className="flex flex-wrap gap-2">
                      {routineDayTargetOptions.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => toggleDayTarget(dayIndex, item.value)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${targets.includes(item.value) ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background/70 text-muted-foreground"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border/60 pt-4">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">원하는 요청사항</div>
              <Textarea
                value={customRequest}
                onChange={(event) => setCustomRequest(event.target.value)}
                placeholder="예: 무릎 부담 적게, 벤치프레스 늘리고 싶음, 러닝은 20분 이하."
                className="min-h-20 resize-none bg-accent border-border text-foreground"
                maxLength={500}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {programMutation.error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 text-sm text-destructive">운동 추천 생성에 실패했습니다. 잠시 후 다시 시도하세요.</CardContent>
        </Card>
      )}

      {program && (
        <div className="space-y-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-foreground">추천 루틴 저장</div>
                  <div className="text-xs text-muted-foreground">운동 전/후 스트레칭까지 포함해 주간 순번 루틴으로 저장합니다.</div>
                </div>
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground"
                onClick={saveAsRoutines}
                disabled={saveProgram.isPending}
              >
                <Save size={13} />
                {saveProgram.isPending ? "저장 중" : "루틴으로 저장"}
              </Button>
            </CardContent>
          </Card>
          {program.weeklyPlan?.map((day: any, index: number) => (
            <Card key={`${day.day}-${index}`} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">{day.day}</div>
                    <div className="text-xs text-primary">{day.focus}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{day.duration}</div>
                </div>
                {(day.warmupStretch?.length || day.cooldownStretch?.length) && (
                  <div className="mb-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Sparkles size={12} />
                        운동 전 스트레칭 {warmupStretchMinutes}분
                      </div>
                      <div className="space-y-1">
                        {day.warmupStretch?.map((stretch: string, i: number) => (
                          <div key={i} className="rounded-lg bg-background/35 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">{stretch}</div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                        <Sparkles size={12} />
                        운동 후 스트레칭 {cooldownStretchMinutes}분
                      </div>
                      <div className="space-y-1">
                        {day.cooldownStretch?.map((stretch: string, i: number) => (
                          <div key={i} className="rounded-lg bg-background/35 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">{stretch}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {day.exercises?.map((exercise: string, i: number) => (
                    <div key={i} className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-foreground">{exercise}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
              <p>{program.generalAdvice}</p>
              <p>{program.recoveryTip}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DailyWorkoutRecommendation() {
  const [location, setLocation] = useState<"gym" | "home" | "outdoor">("gym");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "machine", "cable"]);
  const [targetBodyParts, setTargetBodyParts] = useState<string[]>(["back"]);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [includeCore, setIncludeCore] = useState(true);
  const [warmupStretchMinutes, setWarmupStretchMinutes] = useState("10");
  const [cooldownStretchMinutes, setCooldownStretchMinutes] = useState("10");
  const [cardioMinutes, setCardioMinutes] = useState("20");
  const [intensity, setIntensity] = useState<"light" | "normal" | "hard">("normal");
  const [customRequest, setCustomRequest] = useState("");
  const dailyMutation = trpc.ai.dailyWorkoutRecommendation.useMutation();
  const workout = dailyMutation.data?.workout;

  const toggleEquipment = (value: string) => {
    setEquipment((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const toggleTargetBodyPart = (value: string) => {
    setTargetBodyParts((items) => {
      if (items.includes(value)) return items.filter((item) => item !== value);
      return items.length >= 5 ? items : [...items, value];
    });
  };

  const requestDailyWorkout = () => {
    if (targetBodyParts.length === 0) {
      toast.error("오늘 운동할 부위를 하나 이상 선택하세요.");
      return;
    }
    if (location !== "outdoor" && equipment.length === 0) {
      toast.error("사용 가능한 기구를 하나 이상 선택하세요.");
      return;
    }
    dailyMutation.mutate({
      location,
      equipment: location === "outdoor" ? ["bodyweight"] : equipment,
      sessionDuration: Number(sessionDuration),
      targetBodyParts: targetBodyParts as any,
      includeCardio,
      includeCore,
      warmupStretchMinutes: Number(warmupStretchMinutes),
      cooldownStretchMinutes: Number(cooldownStretchMinutes),
      cardioMinutes: Number(cardioMinutes),
      intensity,
      customRequest: customRequest.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary" />
          <span className="font-semibold text-foreground">AI 오늘 운동 추천</span>
        </div>
        <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={requestDailyWorkout} disabled={dailyMutation.isPending}>
          <RefreshCw size={13} />
          {dailyMutation.isPending ? "생성 중" : "오늘 추천"}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 장소</div>
              <Select value={location} onValueChange={(value) => setLocation(value as any)}>
                <SelectTrigger className="bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="gym">헬스장</SelectItem>
                  <SelectItem value="home">집</SelectItem>
                  <SelectItem value="outdoor">야외</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 시간</div>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger className="bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {[30, 45, 60, 75, 90, 120].map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">오늘 강도</div>
              <Select value={intensity} onValueChange={(value) => setIntensity(value as any)}>
                <SelectTrigger className="bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="light">가볍게</SelectItem>
                  <SelectItem value="normal">보통</SelectItem>
                  <SelectItem value="hard">강하게</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">오늘 타겟 부위</div>
            <div className="flex flex-wrap gap-2">
              {targetBodyPartOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleTargetBodyPart(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${targetBodyParts.includes(item.value) ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {location !== "outdoor" && (
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">사용 가능 기구</div>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleEquipment(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${equipment.includes(item.value) ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 전 스트레칭</div>
              <Select value={warmupStretchMinutes} onValueChange={setWarmupStretchMinutes}>
                <SelectTrigger className="bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {minuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">운동 후 스트레칭</div>
              <Select value={cooldownStretchMinutes} onValueChange={setCooldownStretchMinutes}>
                <SelectTrigger className="bg-accent border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {minuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">유산소 시간</div>
              <Select value={cardioMinutes} onValueChange={setCardioMinutes} disabled={!includeCardio}>
                <SelectTrigger className="bg-accent border-border text-foreground disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {cardioMinuteOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>{minutes}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIncludeCardio((value) => !value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${includeCardio ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
            >
              유산소 포함
            </button>
            <button
              type="button"
              onClick={() => setIncludeCore((value) => !value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${includeCore ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-accent text-muted-foreground"}`}
            >
              복근 포함
            </button>
          </div>

          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">오늘 컨디션/요청사항</div>
            <Textarea
              value={customRequest}
              onChange={(event) => setCustomRequest(event.target.value)}
              placeholder="예: 어제 하체해서 다리 피로함, 허리 부담 적게, 등 위주로 강하게."
              className="min-h-20 resize-none bg-accent border-border text-foreground"
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {dailyMutation.error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 text-sm text-destructive">오늘 운동 추천 생성에 실패했습니다. 잠시 후 다시 시도하세요.</CardContent>
        </Card>
      )}

      {workout && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground">오늘 추천 운동</div>
                <div className="text-xs text-primary">{workout.focus}</div>
              </div>
              <div className="text-xs text-muted-foreground">{workout.duration}</div>
            </div>
            {(workout.warmupStretch?.length || workout.cooldownStretch?.length) && (
              <div className="mb-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles size={12} />
                    운동 전 스트레칭 {warmupStretchMinutes}분
                  </div>
                  <div className="space-y-1">
                    {workout.warmupStretch?.map((stretch: string, index: number) => (
                      <div key={index} className="rounded-lg bg-background/35 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">{stretch}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                    <Sparkles size={12} />
                    운동 후 스트레칭 {cooldownStretchMinutes}분
                  </div>
                  <div className="space-y-1">
                    {workout.cooldownStretch?.map((stretch: string, index: number) => (
                      <div key={index} className="rounded-lg bg-background/35 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">{stretch}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {workout.exercises?.map((exercise: string, index: number) => (
                <div key={index} className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-foreground">{exercise}</div>
              ))}
            </div>
            {(dailyMutation.data?.reason || dailyMutation.data?.caution) && (
              <div className="mt-3 rounded-xl border border-border bg-accent/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {dailyMutation.data?.reason && <p>{dailyMutation.data.reason}</p>}
                {dailyMutation.data?.caution && <p className="mt-1">{dailyMutation.data.caution}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AICoach() {
  return (
    <div className="page-shell space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">AI 코치</h1>
        <p className="page-description">운동 기록과 목표를 바탕으로 추천을 확인하세요</p>
      </div>
      <Tabs defaultValue="program" className="space-y-4">
        <TabsList className="grid h-11 w-full grid-cols-3 gap-1 rounded-xl border border-border bg-accent/30 p-1">
          <TabsTrigger
            value="program"
            className="h-full gap-2 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground data-[state=active]:!border-primary/60 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_8px_24px_hsl(var(--primary)/0.18)] sm:text-sm"
          >
            <Dumbbell size={14} />
            루틴 추천
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="h-full gap-2 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground data-[state=active]:!border-primary/60 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_8px_24px_hsl(var(--primary)/0.18)] sm:text-sm"
          >
            <CalendarDays size={14} />
            오늘의 운동
          </TabsTrigger>
          <TabsTrigger
            value="diet"
            className="h-full gap-2 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground data-[state=active]:!border-primary/60 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_8px_24px_hsl(var(--primary)/0.18)] sm:text-sm"
          >
            <Utensils size={14} />
            맞춤 식단 추천
          </TabsTrigger>
        </TabsList>
        <TabsContent value="program" className="space-y-4">
          <ProgramRecommendation />
        </TabsContent>
        <TabsContent value="daily" className="space-y-4">
          <DailyWorkoutRecommendation />
        </TabsContent>
        <TabsContent value="diet" className="space-y-4">
          <DietRecommendation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
