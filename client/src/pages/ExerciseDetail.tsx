import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Bot, ChevronLeft, ChevronRight, Dumbbell,
  ImageOff, Info, Lightbulb, Play, Target, Zap, CheckCircle2,
  AlertTriangle, Wind
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bodyPartLabels: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨", arms: "팔",
  legs: "하체", abs: "복근", glutes: "둔근", cardio: "유산소",
  stretching: "스트레칭", full_body: "전신",
};
const bodyPartColors: Record<string, string> = {
  chest: "text-red-400 bg-red-400/10 border-red-400/20",
  back: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  shoulders: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  arms: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  legs: "text-green-400 bg-green-400/10 border-green-400/20",
  abs: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  glutes: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  cardio: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  stretching: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  full_body: "text-primary bg-primary/10 border-primary/20",
};
const equipmentLabels: Record<string, string> = {
  barbell: "바벨", dumbbell: "덤벨", machine: "머신", cable: "케이블",
  bodyweight: "맨몸", kettlebell: "케틀벨", resistance_band: "밴드", none: "기구 없음",
};
const categoryLabels: Record<string, string> = {
  strength: "근력", hypertrophy: "근비대", endurance: "지구력",
  flexibility: "유연성", cardio: "유산소",
};
const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: "초급", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  intermediate: { label: "중급", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  advanced: { label: "고급", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

// 근육 SVG 다이어그램
function MuscleBodySVG({ bodyPart }: { bodyPart: string }) {
  const primaryColor = "oklch(0.74 0.18 160)";
  const secondaryColor = "oklch(0.65 0.18 240)";
  const inactiveColor = "oklch(0.28 0.014 260)";
  const isActive = (part: string) => bodyPart === part || bodyPart === "full_body";
  return (
    <div className="flex gap-6 justify-center py-2">
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">정면</div>
        <svg viewBox="0 0 100 140" className="w-20 h-28" fill="none">
          <circle cx="50" cy="11" r="9" fill={inactiveColor} />
          <rect x="46" y="20" width="8" height="5" rx="2" fill={inactiveColor} />
          <rect x="33" y="25" width="34" height="28" rx="4"
            fill={isActive("chest") || isActive("abs") ? primaryColor : inactiveColor} opacity="0.85" />
          <ellipse cx="27" cy="31" rx="9" ry="7"
            fill={isActive("shoulders") ? primaryColor : inactiveColor} opacity="0.85" />
          <ellipse cx="73" cy="31" rx="9" ry="7"
            fill={isActive("shoulders") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="15" y="35" width="12" height="26" rx="5"
            fill={isActive("arms") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="73" y="35" width="12" height="26" rx="5"
            fill={isActive("arms") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="33" y="53" width="34" height="14" rx="3"
            fill={isActive("abs") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="33" y="67" width="34" height="12" rx="3"
            fill={isActive("glutes") ? secondaryColor : inactiveColor} opacity="0.6" />
          <rect x="33" y="79" width="15" height="38" rx="6"
            fill={isActive("legs") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="52" y="79" width="15" height="38" rx="6"
            fill={isActive("legs") ? primaryColor : inactiveColor} opacity="0.85" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">후면</div>
        <svg viewBox="0 0 100 140" className="w-20 h-28" fill="none">
          <circle cx="50" cy="11" r="9" fill={inactiveColor} />
          <rect x="46" y="20" width="8" height="5" rx="2" fill={inactiveColor} />
          <rect x="33" y="25" width="34" height="28" rx="4"
            fill={isActive("back") ? primaryColor : inactiveColor} opacity="0.85" />
          <ellipse cx="27" cy="31" rx="9" ry="7"
            fill={isActive("shoulders") ? primaryColor : inactiveColor} opacity="0.85" />
          <ellipse cx="73" cy="31" rx="9" ry="7"
            fill={isActive("shoulders") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="15" y="35" width="12" height="26" rx="5"
            fill={isActive("arms") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="73" y="35" width="12" height="26" rx="5"
            fill={isActive("arms") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="33" y="53" width="34" height="14" rx="3"
            fill={isActive("back") ? secondaryColor : inactiveColor} opacity="0.7" />
          <rect x="33" y="67" width="34" height="12" rx="3"
            fill={isActive("glutes") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="33" y="79" width="15" height="38" rx="6"
            fill={isActive("legs") ? primaryColor : inactiveColor} opacity="0.85" />
          <rect x="52" y="79" width="15" height="38" rx="6"
            fill={isActive("legs") ? primaryColor : inactiveColor} opacity="0.85" />
        </svg>
      </div>
    </div>
  );
}

// 이미지 갤러리 (before/after 포즈)
function ExerciseImageGallery({ gifUrl, secondaryImages, nameKo }: {
  gifUrl?: string | null;
  secondaryImages?: string[];
  nameKo: string;
}) {
  const allImages = [gifUrl, ...(secondaryImages || [])].filter(Boolean) as string[];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  if (allImages.length === 0) {
    return (
      <div className="w-full h-56 flex flex-col items-center justify-center bg-accent/30 rounded-xl border border-border">
        <ImageOff size={32} className="text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">이미지 없음</p>
      </div>
    );
  }

  const currentImg = allImages[currentIdx];
  const hasError = imgErrors[currentIdx];

  return (
    <div className="space-y-2">
      {/* 메인 이미지 */}
      <div className="relative w-full h-64 bg-gradient-to-br from-accent/40 to-card rounded-xl overflow-hidden border border-border">
        {!hasError ? (
          <img
            src={currentImg}
            alt={`${nameKo} - 동작 ${currentIdx + 1}`}
            className="w-full h-full object-contain"
            onError={() => setImgErrors(prev => ({ ...prev, [currentIdx]: true }))}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageOff size={32} className="text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">이미지를 불러올 수 없습니다</p>
          </div>
        )}

        {/* 이미지 네비게이션 */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentIdx(i => Math.min(allImages.length - 1, i + 1))}
              disabled={currentIdx === allImages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronRight size={14} />
            </button>
            {/* 인디케이터 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentIdx ? "bg-primary w-4" : "bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* 이미지 라벨 */}
        {allImages.length > 1 && (
          <div className="absolute top-2 left-2">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              currentIdx === 0
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-card/80 text-muted-foreground border-border"
            )}>
              {currentIdx === 0 ? "시작 자세" : `동작 ${currentIdx}`}
            </span>
          </div>
        )}
      </div>

      {/* 썸네일 */}
      {allImages.length > 1 && (
        <div className="flex gap-2">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                i === currentIdx ? "border-primary" : "border-border opacity-60 hover:opacity-100"
              )}
            >
              {!imgErrors[i] ? (
                <img
                  src={img}
                  alt={`썸네일 ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => setImgErrors(prev => ({ ...prev, [i]: true }))}
                />
              ) : (
                <div className="w-full h-full bg-accent flex items-center justify-center">
                  <ImageOff size={12} className="text-muted-foreground/40" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const exerciseId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();

  const { data: exercise, isLoading } = trpc.exercises.detail.useQuery({ id: exerciseId });
  const { data: aiTips, isLoading: tipsLoading } = trpc.ai.quickTip.useQuery(
    { exerciseId },
    { enabled: isAuthenticated && !!exercise }
  );
  const { data: weightRec, isLoading: recLoading } = trpc.ai.weightRecommendation.useQuery(
    { exerciseId },
    { enabled: isAuthenticated && !!exercise }
  );
  const startSession = trpc.workout.startSession.useMutation();
  const utils = trpc.useUtils();

  // instructionsKo 파싱 헬퍼 (훅 이후, early return 이전에 정의)
  const safeParseArray = (val: unknown): string[] | null => {
    if (Array.isArray(val) && val.length > 0) return val as string[];
    if (typeof val === 'string') {
      try { const p = JSON.parse(val); return Array.isArray(p) && p.length > 0 ? p : null; } catch { return null; }
    }
    return null;
  };

  // 캐시 무효화 - 항상 훅 순서 유지 (early return 이전)
  useEffect(() => {
    utils.exercises.detail.invalidate({ id: exerciseId });
  }, [exerciseId]);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-32 skeleton rounded" />
        <div className="h-72 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-4 lg:p-8 text-center">
        <p className="text-muted-foreground">운동을 찾을 수 없습니다.</p>
        <Link href="/exercises"><Button variant="ghost" className="mt-2">돌아가기</Button></Link>
      </div>
    );
  }

  const rawInstructionsKo = (exercise as any).instructionsKo;
  const instructionsKo = safeParseArray(rawInstructionsKo);
  const rawInstructions = exercise.instructions;
  const instructionsEn: string[] = safeParseArray(rawInstructions) ?? [];
  const instructions = instructionsKo ?? instructionsEn;
  const secondaryImages = (exercise as any).secondaryImages as string[] | undefined;

  const handleStartWorkout = async () => {
    const result = await startSession.mutateAsync({ name: exercise.nameKo });
    window.location.href = `/workout/${result.sessionId}`;
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* 뒤로가기 */}
      <Link href="/exercises">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground mb-4 -ml-2">
          <ArrowLeft size={16} />운동 목록
        </Button>
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── 왼쪽: 이미지 + 기본 정보 ── */}
        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{exercise.nameKo}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{exercise.name}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={cn("border text-xs", difficultyConfig[exercise.difficulty]?.color)}>
                {difficultyConfig[exercise.difficulty]?.label}
              </Badge>
              <Badge className={cn("border text-xs", bodyPartColors[exercise.bodyPart])}>
                <Target size={9} className="mr-1" />
                {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                <Dumbbell size={9} className="mr-1" />
                {equipmentLabels[exercise.equipment] || exercise.equipment}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                {categoryLabels[exercise.category] || exercise.category}
              </Badge>
            </div>
          </div>

          {/* 이미지 갤러리 */}
          <ExerciseImageGallery
            gifUrl={exercise.gifUrl}
            secondaryImages={secondaryImages}
            nameKo={exercise.nameKo}
          />

          {/* 근육 지도 */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">자극 부위</span>
              </div>
              <MuscleBodySVG bodyPart={exercise.bodyPart} />
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground font-medium">주동근: </span>
                    <span className="text-foreground">{(exercise.primaryMuscles as string[]).join(", ")}</span>
                  </div>
                </div>
                {(exercise.secondaryMuscles as string[]).length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-muted-foreground font-medium">협력근: </span>
                      <span className="text-foreground">{(exercise.secondaryMuscles as string[]).join(", ")}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 운동 시작 버튼 */}
          {isAuthenticated && (
            <Button
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
              onClick={handleStartWorkout}
              disabled={startSession.isPending}
            >
              <Play size={18} className="fill-primary-foreground" />
              이 운동으로 시작하기
            </Button>
          )}
        </div>

        {/* ── 오른쪽: 상세 정보 탭 ── */}
        <div>
          <Tabs defaultValue="how-to">
            <TabsList className="w-full bg-card border border-border mb-4">
              <TabsTrigger value="how-to" className="flex-1 text-xs gap-1">
                <CheckCircle2 size={12} />수행 방법
              </TabsTrigger>
              <TabsTrigger value="ai-tips" className="flex-1 text-xs gap-1">
                <Bot size={12} />AI 팁
              </TabsTrigger>
              {isAuthenticated && (
                <TabsTrigger value="my-record" className="flex-1 text-xs gap-1">
                  <Target size={12} />내 기록
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── 수행 방법 탭 ── */}
            <TabsContent value="how-to" className="space-y-4">
              {/* 운동 설명 */}
              {exercise.descriptionKo && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">운동 개요</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{exercise.descriptionKo}</p>
                  </CardContent>
                </Card>
              )}

              {/* 단계별 수행 방법 */}
              {instructions.length > 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">단계별 수행 방법</span>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground ml-auto">
                        {instructions.length}단계
                      </Badge>
                    </div>
                    <ol className="space-y-3">
                      {instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed flex-1">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">수행 방법</span>
                    </div>
                    <p className="text-sm text-muted-foreground">AI 팁 탭에서 자세한 수행 방법을 확인하세요.</p>
                  </CardContent>
                </Card>
              )}

              {/* 주의사항 카드 */}
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-sm font-semibold text-foreground">운동 시 주의사항</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-amber-400 flex-shrink-0">•</span>
                      워밍업 세트를 반드시 포함하여 부상을 예방하세요.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400 flex-shrink-0">•</span>
                      무게보다 올바른 자세를 우선시하세요.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400 flex-shrink-0">•</span>
                      통증이 느껴지면 즉시 중단하고 전문가와 상담하세요.
                    </li>
                    {exercise.difficulty === "advanced" && (
                      <li className="flex gap-2">
                        <span className="text-red-400 flex-shrink-0">•</span>
                        <span className="text-red-400">고급 운동입니다. 충분한 기초 체력 후 시도하세요.</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* 호흡법 카드 */}
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind size={14} className="text-blue-400" />
                    <span className="text-sm font-semibold text-foreground">호흡법</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exercise.category === "flexibility" || exercise.bodyPart === "stretching"
                      ? "깊고 천천히 호흡하며 스트레칭 자세를 유지하세요. 내쉬는 숨에 더 깊이 늘려줍니다."
                      : "힘을 쓰는 동작(수축)에서 내쉬고, 돌아오는 동작(이완)에서 들이마십니다. 절대 숨을 참지 마세요."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── AI 팁 탭 ── */}
            <TabsContent value="ai-tips" className="space-y-3">
              {!isAuthenticated ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-6 text-center">
                    <Bot size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">로그인 후 AI 팁을 확인하세요</p>
                  </CardContent>
                </Card>
              ) : tipsLoading ? (
                <div className="space-y-3">
                  <div className="h-28 skeleton rounded-xl" />
                  <div className="h-20 skeleton rounded-xl" />
                  <div className="h-20 skeleton rounded-xl" />
                </div>
              ) : aiTips ? (
                <>
                  <Card className="bg-gradient-to-br from-primary/8 to-card border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={14} className="text-primary" />
                        <span className="text-sm font-semibold text-foreground">핵심 수행 팁</span>
                      </div>
                      <ul className="space-y-2.5">
                        {aiTips.tips.map((tip: string, i: number) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                              {i + 1}
                            </div>
                            <span className="text-foreground leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-sm font-semibold text-foreground">흔한 실수</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{aiTips.commonMistakes}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind size={14} className="text-blue-400" />
                        <span className="text-sm font-semibold text-foreground">호흡 가이드</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{aiTips.breathingTip}</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-6 text-center">
                    <Bot size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">AI 팁을 불러오는 중...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── 내 기록 탭 ── */}
            {isAuthenticated && (
              <TabsContent value="my-record" className="space-y-3">
                {recLoading ? (
                  <div className="space-y-3">
                    <div className="h-32 skeleton rounded-xl" />
                    <div className="h-24 skeleton rounded-xl" />
                  </div>
                ) : weightRec ? (
                  <>
                    {weightRec.recommendation && (
                      <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Bot size={14} className="text-primary" />
                            <span className="text-sm font-semibold text-foreground">AI 다음 운동 추천</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-primary/15 rounded-xl">
                              <div className="text-2xl font-bold text-primary">{weightRec.recommendation.recommendedWeight}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">kg</div>
                            </div>
                            <div className="text-center p-3 bg-accent rounded-xl">
                              <div className="text-2xl font-bold text-foreground">{weightRec.recommendation.recommendedSets}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">세트</div>
                            </div>
                            <div className="text-center p-3 bg-accent rounded-xl">
                              <div className="text-2xl font-bold text-foreground">{weightRec.recommendation.recommendedReps}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">회</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="p-3 bg-card/50 rounded-xl">
                              <p className="text-xs text-foreground leading-relaxed">{weightRec.recommendation.progressFeedback}</p>
                            </div>
                            <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                                <Zap size={10} />팁
                              </div>
                              <p className="text-xs text-muted-foreground">{weightRec.recommendation.tip}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {weightRec.history && weightRec.history.length > 0 ? (
                      <Card className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="text-sm font-semibold text-foreground mb-3">이전 기록</div>
                          <div className="space-y-2">
                            {weightRec.history.slice(0, 5).map((h: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2.5 bg-accent/40 rounded-lg text-xs">
                                <span className="text-muted-foreground">
                                  {h.date ? new Date(h.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "날짜 미상"}
                                </span>
                                <div className="flex gap-3">
                                  <span className="text-foreground">최대 <strong className="text-primary">{h.maxWeight}kg</strong></span>
                                  <span className="text-muted-foreground">볼륨 {Math.round(h.totalVolume)}kg</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-card border-border">
                        <CardContent className="p-6 text-center">
                          <Target size={28} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                          <p className="text-sm text-muted-foreground">{weightRec.message || "아직 기록이 없습니다"}</p>
                          <p className="text-xs text-muted-foreground mt-1">첫 운동을 기록해보세요!</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : null}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
