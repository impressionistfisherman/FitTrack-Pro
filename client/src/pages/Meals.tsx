import { useAuth } from "@/_core/hooks/useAuth";
import { AuthRequiredState, PageLoadingState } from "@/components/PageState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CalendarDays, Copy, Heart, Plus, Save, Search, Target, Trash2, TrendingUp, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const mealTypes = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
  { value: "snack", label: "간식" },
  { value: "preworkout", label: "운동 전" },
  { value: "postworkout", label: "운동 후" },
];

function todayKey() {
  const offset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - offset).toISOString().slice(0, 10);
}

function macroPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function targetPercent(value: number, target: number) {
  if (!target) return 0;
  return Math.min(160, Math.round((value / target) * 100));
}

export default function Meals() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [date, setDate] = useState(todayKey());
  const [mealType, setMealType] = useState("breakfast");
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [amount, setAmount] = useState("100");
  const [notes, setNotes] = useState("");
  const [newFoodOpen, setNewFoodOpen] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: "",
    brand: "",
    caloriesPer100: "",
    proteinPer100: "",
    carbsPer100: "",
    fatPer100: "",
    aliases: "",
  });
  const [targetForm, setTargetForm] = useState({
    calories: "2200",
    protein: "140",
    carbs: "250",
    fat: "65",
  });
  const debouncedFoodSearch = useDebouncedValue(foodSearch.trim(), 200);

  const mealsQuery = trpc.meals.byDate.useQuery({ date }, { enabled: isAuthenticated });
  const targetsQuery = trpc.meals.targets.useQuery(undefined, { enabled: isAuthenticated });
  const weeklyReportQuery = trpc.meals.weeklyReport.useQuery({ endDate: date, days: 7 }, { enabled: isAuthenticated });
  const foodsQuery = trpc.meals.foods.useQuery(
    { query: debouncedFoodSearch, limit: 30 },
    { enabled: isAuthenticated },
  );
  const recentFoodsQuery = trpc.meals.recentFoods.useQuery({ limit: 8 }, { enabled: isAuthenticated });
  const frequentFoodsQuery = trpc.meals.frequentFoods.useQuery({ limit: 8 }, { enabled: isAuthenticated });
  const recentMealsQuery = trpc.meals.recentMeals.useQuery({ limit: 5 }, { enabled: isAuthenticated });
  const invalidateMeals = async () => {
    await Promise.all([
      utils.meals.byDate.invalidate({ date }),
      utils.meals.recentFoods.invalidate(),
      utils.meals.frequentFoods.invalidate(),
      utils.meals.recentMeals.invalidate(),
      utils.meals.weeklyReport.invalidate({ endDate: date, days: 7 }),
    ]);
  };
  const saveTargets = trpc.meals.saveTargets.useMutation({
    onSuccess: async () => {
      toast.success("식단 목표를 저장했습니다.");
      await Promise.all([
        utils.meals.targets.invalidate(),
        utils.meals.weeklyReport.invalidate({ endDate: date, days: 7 }),
      ]);
    },
    onError: () => toast.error("목표 저장에 실패했습니다."),
  });
  const createFood = trpc.meals.createFood.useMutation({
    onSuccess: async () => {
      toast.success("음식을 등록했습니다.");
      setNewFoodOpen(false);
      setFoodForm({ name: "", brand: "", caloriesPer100: "", proteinPer100: "", carbsPer100: "", fatPer100: "", aliases: "" });
      await utils.meals.foods.invalidate();
    },
    onError: () => toast.error("음식 등록에 실패했습니다."),
  });
  const createLog = trpc.meals.createLog.useMutation({
    onSuccess: async () => {
      toast.success("식단을 기록했습니다.");
      setSelectedFood(null);
      setFoodSearch("");
      setAmount("100");
      setNotes("");
      await invalidateMeals();
    },
    onError: () => toast.error("식단 기록에 실패했습니다."),
  });
  const deleteLog = trpc.meals.deleteLog.useMutation({
    onSuccess: async () => {
      toast.success("식단 기록을 삭제했습니다.");
      await invalidateMeals();
    },
    onError: () => toast.error("식단 삭제에 실패했습니다."),
  });
  const toggleFavorite = trpc.meals.toggleFoodFavorite.useMutation({
    onSuccess: () => utils.meals.foods.invalidate(),
    onError: () => toast.error("즐겨찾기는 직접 등록한 음식만 가능합니다."),
  });

  const totals = mealsQuery.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 };
  const targets = targetsQuery.data ?? { calories: 2200, protein: 140, carbs: 250, fat: 65 };
  const macroCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const selectedPreview = useMemo(() => {
    if (!selectedFood) return null;
    const grams = Number(amount) || 0;
    const ratio = grams / 100;
    return {
      calories: Math.round(selectedFood.caloriesPer100 * ratio),
      protein: Math.round(selectedFood.proteinPer100 * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100 * ratio * 10) / 10,
      fat: Math.round(selectedFood.fatPer100 * ratio * 10) / 10,
    };
  }, [amount, selectedFood]);

  const selectFood = (food: any, grams?: number) => {
    setSelectedFood(food);
    setFoodSearch(food.name);
    setAmount(String(grams ?? 100));
  };

  useEffect(() => {
    if (!targetsQuery.data) return;
    setTargetForm({
      calories: String(targetsQuery.data.calories ?? 2200),
      protein: String(targetsQuery.data.protein ?? 140),
      carbs: String(targetsQuery.data.carbs ?? 250),
      fat: String(targetsQuery.data.fat ?? 65),
    });
  }, [targetsQuery.data]);

  if (loading) return <PageLoadingState wide />;
  if (!isAuthenticated) {
    return <AuthRequiredState icon={Utensils} description="식단을 기록하고 영양 합계를 확인하려면 로그인하세요." />;
  }

  const saveFood = () => {
    createFood.mutate({
      name: foodForm.name.trim(),
      brand: foodForm.brand.trim() || undefined,
      caloriesPer100: Number(foodForm.caloriesPer100) || 0,
      proteinPer100: Number(foodForm.proteinPer100) || 0,
      carbsPer100: Number(foodForm.carbsPer100) || 0,
      fatPer100: Number(foodForm.fatPer100) || 0,
      aliases: foodForm.aliases.split(",").map((item) => item.trim()).filter(Boolean),
      favorite: true,
    });
  };

  const saveMeal = () => {
    if (!selectedFood) {
      toast.error("음식을 먼저 선택하세요.");
      return;
    }
    createLog.mutate({
      mealDate: new Date(`${date}T12:00:00`),
      mealType: mealType as any,
      notes: notes.trim() || undefined,
      items: [{ foodId: selectedFood.id, amount: Number(amount) || 100, unit: selectedFood.servingUnit ?? "g" }],
    });
  };

  const submitTargets = () => {
    saveTargets.mutate({
      calories: Number(targetForm.calories) || 0,
      protein: Number(targetForm.protein) || 0,
      carbs: Number(targetForm.carbs) || 0,
      fat: Number(targetForm.fat) || 0,
    });
  };

  const copyMeal = (meal: any) => {
    createLog.mutate({
      mealDate: new Date(`${date}T12:00:00`),
      mealType: meal.mealType,
      notes: meal.notes || undefined,
      items: meal.items.map((item: any) => ({
        foodId: item.foodId ?? undefined,
        foodName: item.foodName,
        amount: item.amount,
        unit: item.unit ?? "g",
      })),
    });
  };

  return (
    <div className="page-shell figma-page content-page animate-fade-in">
      <div className="page-content-header">
        <div>
          <h1 className="page-title">식단 기록</h1>
          <p className="page-description">먹은 음식과 중량을 기록하고 하루 영양 합계를 확인하세요</p>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" className="gap-2 border-border" onClick={() => setNewFoodOpen((value) => !value)}>
            <Plus size={16} />
            음식 등록
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays size={17} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">오늘 요약</h2>
              </div>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mb-4 border-border bg-accent text-foreground" />
              <div className="rounded-2xl border border-border bg-background/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-3xl font-black text-foreground">{Math.round(totals.calories).toLocaleString()} kcal</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      목표 {targets.calories.toLocaleString()} kcal · 기록된 식사 {mealsQuery.data?.meals?.length ?? 0}개
                    </div>
                  </div>
                  <Badge className="border border-primary/25 bg-primary/10 text-primary">
                    {targetPercent(totals.calories, targets.calories)}%
                  </Badge>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, targetPercent(totals.calories, targets.calories))}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "단백질", value: totals.protein, target: targets.protein },
                    { label: "탄수화물", value: totals.carbs, target: targets.carbs },
                    { label: "지방", value: totals.fat, target: targets.fat },
                  ].map((macro) => (
                    <div key={macro.label} className="rounded-xl bg-accent/45 p-3">
                      <div className="text-base font-bold text-foreground">{Math.round(macro.value)}g</div>
                      <div className="text-[11px] text-muted-foreground">{macro.label}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, targetPercent(macro.value, macro.target))}%` }} />
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{targetPercent(macro.value, macro.target)}% / {macro.target}g</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">7일 리포트</h2>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  목표 근접 {weeklyReportQuery.data?.hitDays ?? 0}일
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-accent/45 p-3">
                  <div className="text-lg font-black text-foreground">{weeklyReportQuery.data?.average.calories ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground">평균 kcal</div>
                </div>
                <div className="rounded-xl bg-accent/45 p-3">
                  <div className="text-lg font-black text-foreground">{weeklyReportQuery.data?.average.protein ?? 0}g</div>
                  <div className="text-[11px] text-muted-foreground">평균 단백질</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {weeklyReportQuery.data?.days.map((day: any) => (
                  <div key={day.date} className="rounded-xl border border-border bg-background/35 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{day.date.slice(5)}</span>
                      <span className="text-muted-foreground">{day.calories} / {weeklyReportQuery.data.targets.calories} kcal</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-accent">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, targetPercent(day.calories, weeklyReportQuery.data.targets.calories))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Target size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">식단 목표</h2>
                </div>
                <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={submitTargets} disabled={saveTargets.isPending}>
                  <Save size={14} />
                  저장
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["calories", "칼로리", "kcal"],
                  ["protein", "단백질", "g"],
                  ["carbs", "탄수화물", "g"],
                  ["fat", "지방", "g"],
                ].map(([key, label, unit]) => (
                  <label key={key} className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={(targetForm as any)[key]}
                        onChange={(event) => setTargetForm((form) => ({ ...form, [key]: event.target.value }))}
                        className="border-border bg-accent"
                      />
                      <span className="w-8 text-xs text-muted-foreground">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">최근 식사 다시 기록</h2>
                <Badge variant="outline" className="border-border text-muted-foreground">복사</Badge>
              </div>
              <div className="space-y-2">
                {recentMealsQuery.data?.length ? recentMealsQuery.data.map((meal: any) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => copyMeal(meal)}
                    disabled={createLog.isPending}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/45 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border text-[11px] text-muted-foreground">
                          {mealTypes.find((type) => type.value === meal.mealType)?.label ?? meal.mealType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{meal.items.length}개 음식</span>
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-foreground">
                        {meal.items.map((item: any) => item.foodName).join(", ")}
                      </div>
                    </div>
                    <Copy size={15} className="shrink-0 text-primary" />
                  </button>
                )) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    아직 복사할 최근 식사가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {newFoodOpen && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-sm font-semibold text-foreground">내 음식 등록</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>음식명</Label>
                    <Input value={foodForm.name} onChange={(e) => setFoodForm((f) => ({ ...f, name: e.target.value }))} className="border-border bg-card" placeholder="예: 닭가슴살" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>브랜드/메모</Label>
                    <Input value={foodForm.brand} onChange={(e) => setFoodForm((f) => ({ ...f, brand: e.target.value }))} className="border-border bg-card" placeholder="선택" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["caloriesPer100", "kcal/100g"],
                    ["proteinPer100", "단백질"],
                    ["carbsPer100", "탄수"],
                    ["fatPer100", "지방"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input type="number" value={(foodForm as any)[key]} onChange={(e) => setFoodForm((f) => ({ ...f, [key]: e.target.value }))} className="border-border bg-card" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>별칭</Label>
                  <Input value={foodForm.aliases} onChange={(e) => setFoodForm((f) => ({ ...f, aliases: e.target.value }))} className="border-border bg-card" placeholder="닭찌, 훈제닭 처럼 쉼표로 구분" />
                </div>
                <Button className="w-full bg-primary text-primary-foreground" disabled={!foodForm.name.trim() || createFood.isPending} onClick={saveFood}>
                  음식 저장
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">식사 추가</h2>
                <Badge className="border border-primary/25 bg-primary/10 text-primary">수동 기록</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger className="border-border bg-accent text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className="border-border bg-accent pl-9" placeholder="음식 검색..." />
                </label>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/35 p-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">최근 먹은 음식</div>
                  <div className="flex flex-wrap gap-2">
                    {recentFoodsQuery.data?.length ? recentFoodsQuery.data.map((food: any) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectFood(food)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        {food.name}
                      </button>
                    )) : <span className="text-xs text-muted-foreground">기록하면 자동 표시</span>}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/35 p-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">자주 먹는 음식</div>
                  <div className="flex flex-wrap gap-2">
                    {frequentFoodsQuery.data?.length ? frequentFoodsQuery.data.map((food: any) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectFood(food)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        {food.name}
                        {food.useCount ? <span className="ml-1 text-muted-foreground">{food.useCount}</span> : null}
                      </button>
                    )) : <span className="text-xs text-muted-foreground">반복 기록하면 자동 표시</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {foodsQuery.data?.map((food: any) => (
                  <div
                    key={food.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                      selectedFood?.id === food.id ? "border-primary/50 bg-primary/10" : "border-border bg-background/45 hover:border-primary/30",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectFood(food)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-foreground">{food.name}</div>
                        <Badge variant="outline" className="shrink-0 border-border text-[10px] text-muted-foreground">
                          {food.favorite ? "즐겨찾기" : food.source}
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {food.brand || food.source} · 100g {Math.round(food.caloriesPer100)}kcal · P {food.proteinPer100}g
                      </div>
                    </button>
                    {food.userId && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite.mutate({ foodId: food.id });
                        }}
                        className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-primary"
                        aria-label="즐겨찾기"
                      >
                        <Heart size={16} fill={food.favorite ? "currentColor" : "none"} />
                      </button>
                    )}
                  </div>
                ))}
                {!foodsQuery.isLoading && !foodsQuery.data?.length ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    검색 결과가 없습니다. 자주 먹는 음식이면 위의 음식 등록으로 추가하세요.
                  </div>
                ) : null}
              </div>

              {selectedFood && (
                <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{selectedFood.name}</div>
                      <div className="text-xs text-muted-foreground">중량 수정 후 저장</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-28 border-border bg-card text-right" />
                      <span className="text-xs text-muted-foreground">g</span>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {[50, 100, 150, 200].map((grams) => (
                      <button
                        key={grams}
                        type="button"
                        onClick={() => setAmount(String(grams))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          amount === String(grams) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {grams}g
                      </button>
                    ))}
                  </div>
                  {selectedPreview && (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-accent/45 p-2"><b>{selectedPreview.calories}</b><br />kcal</div>
                      <div className="rounded-lg bg-accent/45 p-2"><b>{selectedPreview.protein}g</b><br />단백질</div>
                      <div className="rounded-lg bg-accent/45 p-2"><b>{selectedPreview.carbs}g</b><br />탄수</div>
                      <div className="rounded-lg bg-accent/45 p-2"><b>{selectedPreview.fat}g</b><br />지방</div>
                    </div>
                  )}
                </div>
              )}
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-3 min-h-20 border-border bg-accent" placeholder="메모 선택" />
              <Button className="mt-3 w-full bg-primary text-primary-foreground" disabled={!selectedFood || createLog.isPending} onClick={saveMeal}>
                식단 저장
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">기록 목록</h2>
              <div className="space-y-3">
                {mealsQuery.data?.meals?.length ? mealsQuery.data.meals.map((meal: any) => (
                  <div key={meal.id} className="rounded-xl border border-border bg-background/45 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {mealTypes.find((type) => type.value === meal.mealType)?.label ?? meal.mealType}
                      </Badge>
                      <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteLog.mutate({ id: meal.id })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {meal.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-foreground">{item.foodName} <span className="text-xs text-muted-foreground">{item.amount}{item.unit}</span></span>
                          <span className="shrink-0 font-semibold text-primary">{Math.round(item.calories)} kcal</span>
                        </div>
                      ))}
                    </div>
                    {meal.notes ? <p className="mt-2 text-xs text-muted-foreground">{meal.notes}</p> : null}
                  </div>
                )) : (
                  <div className="empty-state-panel min-h-40">
                    <Utensils size={34} className="mb-2 opacity-40" />
                    아직 식단 기록이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
