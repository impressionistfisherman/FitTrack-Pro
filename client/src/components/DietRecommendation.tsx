import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Apple, Coffee, Droplets, Flame, Moon, RefreshCw,
  Scale, Sparkles, Sun, Sunset, Utensils, Zap,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useState } from "react";

const mealIcons: Record<string, any> = {
  아침: Sun,
  점심: Utensils,
  저녁: Moon,
  저녀: Moon,
  간식: Apple,
  default: Coffee,
};

const goalLabels: Record<string, string> = {
  hypertrophy: "근비대",
  fat_loss: "다이어트",
  strength: "근력",
  endurance: "지구력",
  flexibility: "유연성",
  general: "일반 건강",
};

// 영양소 비율 원형 차트 (SVG)
function MacroCircle({ protein, carbs, fat, total }: { protein: number; carbs: number; fat: number; total: number }) {
  const pPct = Math.round((protein * 4 / total) * 100);
  const cPct = Math.round((carbs * 4 / total) * 100);
  const fPct = 100 - pPct - cPct;

  const r = 40;
  const circ = 2 * Math.PI * r;

  // 각 영양소 arc 계산
  const pLen = circ * pPct / 100;
  const cLen = circ * cPct / 100;
  const fLen = circ * fPct / 100;

  const pOffset = 0;
  const cOffset = -pLen;
  const fOffset = -(pLen + cLen);

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="14" />
          {/* 단백질 - 초록 */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="14"
            strokeDasharray={`${pLen} ${circ - pLen}`} strokeDashoffset={pOffset} />
          {/* 탄수화물 - 파랑 */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#3b82f6" strokeWidth="14"
            strokeDasharray={`${cLen} ${circ - cLen}`} strokeDashoffset={cOffset} />
          {/* 지방 - 주황 */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f97316" strokeWidth="14"
            strokeDasharray={`${fLen} ${circ - fLen}`} strokeDashoffset={fOffset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] text-muted-foreground">총</div>
          <div className="text-sm font-bold text-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground">kcal</div>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-muted-foreground">단백질</span>
          </div>
          <span className="font-semibold text-foreground">{protein}g <span className="text-muted-foreground font-normal">({pPct}%)</span></span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-muted-foreground">탄수화물</span>
          </div>
          <span className="font-semibold text-foreground">{carbs}g <span className="text-muted-foreground font-normal">({cPct}%)</span></span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
            <span className="text-muted-foreground">지방</span>
          </div>
          <span className="font-semibold text-foreground">{fat}g <span className="text-muted-foreground font-normal">({fPct}%)</span></span>
        </div>
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: any }) {
  const Icon = mealIcons[meal.time] || mealIcons.default;
  const mealColors: Record<string, string> = {
    아침: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    점심: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    저녁: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    저녀: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    간식: "text-green-400 bg-green-400/10 border-green-400/20",
  };
  const colorClass = mealColors[meal.time] || "text-primary bg-primary/10 border-primary/20";

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border", colorClass)}>
              <Icon size={15} />
            </div>
            <span className="font-semibold text-foreground text-sm">{meal.time}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground">{meal.calories} kcal</div>
            <div className="text-[10px] text-muted-foreground">단백질 {meal.protein}g</div>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <div className="space-y-1 mb-3">
          {meal.menu?.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>

        {/* 팁 */}
        {meal.tip && (
          <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
            <Zap size={11} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{meal.tip}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DietRecommendation() {
  const [mealCount, setMealCount] = useState("4");
  const [mealTiming, setMealTiming] = useState("");
  const [preferences, setPreferences] = useState("");
  const [constraints, setConstraints] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState({
    mealCount: 4,
    mealTiming: "",
    preferences: "",
    constraints: "",
  });
  const { data, isLoading, refetch, isFetching } = trpc.ai.dietRecommendation.useQuery(submittedRequest, {
    staleTime: 1000 * 60 * 30, // 30분 캐시
  });
  const applyDietRequest = () => {
    setSubmittedRequest({
      mealCount: Number(mealCount) || 4,
      mealTiming: mealTiming.trim(),
      preferences: preferences.trim(),
      constraints: constraints.trim(),
    });
  };

  if ((isLoading || isFetching) && !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  const diet = data?.diet;
  const goalSummary = (data as any)?.goalSummary
    ?? (data?.goal ? goalLabels[data.goal.goal] || data.goal.goal : "-");
  const nutritionStrategy = (data as any)?.nutritionStrategy;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils size={16} className="text-primary" />
          <span className="font-semibold text-foreground">AI 맞춤 식단 추천</span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:cursor-wait disabled:opacity-60"
          title="새로 추천받기"
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />
        </button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="mb-3">
            <div className="font-semibold text-foreground text-sm">식사 방식 커스텀</div>
            <p className="mt-1 text-xs text-muted-foreground">
              하루 식사 패턴, 먹을 수 있는 방식, 싫어하는 음식 등을 적으면 그 기준으로 다시 추천합니다.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">하루 식사 횟수</Label>
              <div className="flex flex-wrap gap-2">
                {["2", "3", "4", "5", "6"].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMealCount(count)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs transition-colors",
                      mealCount === count
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-accent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {count}끼
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">식사 시간/현재 패턴</Label>
                <Textarea
                  value={mealTiming}
                  onChange={(event) => setMealTiming(event.target.value)}
                  placeholder="예: 아침은 못 먹고, 점심은 회사식당, 운동은 밤 9시"
                  className="min-h-20 resize-none border-border bg-accent text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">선호 음식/가능한 식사</Label>
                <Textarea
                  value={preferences}
                  onChange={(event) => setPreferences(event.target.value)}
                  placeholder="예: 닭가슴살 가능, 편의점 식사 많음, 한식 위주"
                  className="min-h-20 resize-none border-border bg-accent text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">제외 음식/제약</Label>
              <Textarea
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="예: 우유 못 먹음, 생선 싫음, 조리 시간 10분 이하"
                className="min-h-16 resize-none border-border bg-accent text-foreground"
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={applyDietRequest}
                disabled={isFetching}
              >
                <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />
                이 기준으로 추천
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 데이터 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <Scale size={14} className="mx-auto mb-1 text-primary" />
          <div className="text-sm font-bold text-foreground">
            {data?.latestWeight ? `${data.latestWeight}kg` : "-"}
          </div>
          <div className="text-[10px] text-muted-foreground">현재 체중</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <Flame size={14} className="mx-auto mb-1 text-orange-400" />
          <div className="text-sm font-bold text-foreground leading-tight break-keep">
            {goalSummary}
          </div>
          <div className="text-[10px] text-muted-foreground">운동 목표</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <Zap size={14} className="mx-auto mb-1 text-yellow-400" />
          <div className="text-sm font-bold text-foreground">
            {(data as any)?.tdee ? `${(data as any).tdee}` : "-"}
          </div>
          <div className="text-[10px] text-muted-foreground">TDEE (kcal)</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <Sparkles size={14} className="mx-auto mb-1 text-purple-400" />
          <div className="text-sm font-bold text-foreground">
            {(data as any)?.recommendedCalories ? `${(data as any).recommendedCalories}` : "-"}
          </div>
          <div className="text-[10px] text-muted-foreground">권장 칼로리</div>
        </div>
      </div>

      {nutritionStrategy && (
        <Card className="bg-primary/6 border-primary/25">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{nutritionStrategy.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {nutritionStrategy.description}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 self-start sm:self-center">
                단백질 {nutritionStrategy.proteinTarget}g+
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {diet ? (
        <>
          {/* 칼로리 & 영양소 */}
          <Card className="bg-gradient-to-br from-primary/8 to-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Flame size={14} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">하루 권장 영양소</span>
                <span className="ml-auto text-lg font-bold text-primary">{diet.dailyCalories} kcal</span>
              </div>
              <MacroCircle
                protein={diet.macros?.protein || 0}
                carbs={diet.macros?.carbs || 0}
                fat={diet.macros?.fat || 0}
                total={diet.dailyCalories || 2000}
              />
            </CardContent>
          </Card>

          {/* 식사별 메뉴 */}
          {diet.meals?.map((meal: any, i: number) => (
            <MealCard key={i} meal={meal} />
          ))}

          {/* 운동 전/후 식사 */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-yellow-400" />
                <span className="font-semibold text-foreground text-sm">운동 전/후 식사</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-400/5 rounded-xl border border-yellow-400/15">
                  <div className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1">운동 전</div>
                  <p className="text-sm text-foreground">{diet.preworkoutMeal}</p>
                </div>
                <div className="p-3 bg-green-400/5 rounded-xl border border-green-400/15">
                  <div className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">운동 후</div>
                  <p className="text-sm text-foreground">{diet.postworkoutMeal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 수분 & 보충제 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Droplets size={13} className="text-blue-400" />
                  <span className="text-xs font-semibold text-foreground">수분 섭취</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{diet.hydration}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={13} className="text-purple-400" />
                  <span className="text-xs font-semibold text-foreground">보충제</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{diet.supplements}</p>
              </CardContent>
            </Card>
          </div>

          {/* 전반적인 조언 */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">영양사 조언</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{diet.generalAdvice}</p>
            </CardContent>
          </Card>

          {/* 면책 조항 */}
          <p className="text-[10px] text-muted-foreground text-center px-4">
            * AI가 생성한 식단 추천으로 개인 건강 상태에 따라 다를 수 있습니다. 전문 영양사 상담을 권장합니다.
          </p>
        </>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Utensils size={32} className="mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-1">식단 추천을 생성하는 중...</p>
            <p className="text-xs text-muted-foreground">운동 목표와 체중을 설정하면 더 정확한 추천을 받을 수 있습니다.</p>
            <Button
              size="sm"
              className="mt-3 gap-2 bg-primary text-primary-foreground"
              onClick={() => refetch()}
            >
              <RefreshCw size={13} />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
