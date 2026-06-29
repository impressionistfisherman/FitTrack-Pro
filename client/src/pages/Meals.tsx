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
import { CalendarDays, Heart, Plus, Search, Trash2, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
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
  const debouncedFoodSearch = useDebouncedValue(foodSearch.trim(), 200);

  const mealsQuery = trpc.meals.byDate.useQuery({ date }, { enabled: isAuthenticated });
  const foodsQuery = trpc.meals.foods.useQuery(
    { query: debouncedFoodSearch, limit: 30 },
    { enabled: isAuthenticated },
  );
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
      await utils.meals.byDate.invalidate({ date });
    },
    onError: () => toast.error("식단 기록에 실패했습니다."),
  });
  const deleteLog = trpc.meals.deleteLog.useMutation({
    onSuccess: async () => {
      toast.success("식단 기록을 삭제했습니다.");
      await utils.meals.byDate.invalidate({ date });
    },
    onError: () => toast.error("식단 삭제에 실패했습니다."),
  });
  const toggleFavorite = trpc.meals.toggleFoodFavorite.useMutation({
    onSuccess: () => utils.meals.foods.invalidate(),
    onError: () => toast.error("즐겨찾기는 직접 등록한 음식만 가능합니다."),
  });

  const totals = mealsQuery.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 };
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
                <div className="text-3xl font-black text-foreground">{Math.round(totals.calories).toLocaleString()} kcal</div>
                <div className="mt-1 text-xs text-muted-foreground">기록된 식사 {mealsQuery.data?.meals?.length ?? 0}개</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["단백질", `${Math.round(totals.protein)}g`, macroPercent(totals.protein * 4, macroCalories)],
                    ["탄수화물", `${Math.round(totals.carbs)}g`, macroPercent(totals.carbs * 4, macroCalories)],
                    ["지방", `${Math.round(totals.fat)}g`, macroPercent(totals.fat * 9, macroCalories)],
                  ].map(([label, value, percent]) => (
                    <div key={label} className="rounded-xl bg-accent/45 p-3">
                      <div className="text-base font-bold text-foreground">{value}</div>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
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
                      onClick={() => {
                        setSelectedFood(food);
                        setFoodSearch(food.name);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-semibold text-foreground">{food.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {food.brand || "내 음식"} · 100g {Math.round(food.caloriesPer100)}kcal · P {food.proteinPer100}g
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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{selectedFood.name}</div>
                      <div className="text-xs text-muted-foreground">중량 수정 후 저장</div>
                    </div>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-28 border-border bg-card text-right" />
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
