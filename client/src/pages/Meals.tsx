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
import { CalendarDays, Camera, ChevronDown, Copy, Heart, Plus, Save, Search, Target, Trash2, TrendingUp, Utensils, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

function formatMealItemAmount(item: any) {
  const grams = Math.round(Number(item.amount) || 0);
  const unit = String(item.unit ?? "g").trim();
  if (!unit || unit === "g") return `${grams}g`;
  return `${unit} · ${grams}g`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = dataUrl;
  });
}

async function prepareMealImageDataUrl(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export default function Meals() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const mealImageInputRef = useRef<HTMLInputElement | null>(null);
  const [date, setDate] = useState(todayKey());
  const [mealType, setMealType] = useState("breakfast");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [amount, setAmount] = useState("100");
  const [portionAmount, setPortionAmount] = useState("1");
  const [portionUnit, setPortionUnit] = useState("인분");
  const [notes, setNotes] = useState("");
  const [newFoodOpen, setNewFoodOpen] = useState(false);
  const [isWeeklyReportCollapsed, setIsWeeklyReportCollapsed] = useState(true);
  const [imageItems, setImageItems] = useState<Array<{
    foodName: string;
    amount: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    confidence: number;
    notes: string;
  }>>([]);
  const [imageNotes, setImageNotes] = useState("");
  const [foodForm, setFoodForm] = useState({
    name: "",
    brand: "",
    caloriesPer100: "",
    proteinPer100: "",
    carbsPer100: "",
    fatPer100: "",
    servingUnit: "인분",
    servingSizeGrams: "100",
    aliases: "",
  });
  const [targetForm, setTargetForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const debouncedFoodSearch = useDebouncedValue(foodSearch.trim(), 200);

  const mealsQuery = trpc.meals.byDate.useQuery({ date }, { enabled: isAuthenticated });
  const targetsQuery = trpc.meals.targets.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5 * 60_000 });
  const hasSavedMealTargets = Boolean(targetsQuery.data?.saved);
  const recommendedTargetsQuery = trpc.meals.recommendedTargets.useQuery(undefined, {
    enabled: isAuthenticated && targetsQuery.isSuccess && !hasSavedMealTargets,
  });
  const weeklyReportQuery = trpc.meals.weeklyReport.useQuery(
    { endDate: date, days: 7 },
    {
      enabled: isAuthenticated && !isWeeklyReportCollapsed,
      staleTime: 60_000,
    },
  );
  const foodsQuery = trpc.meals.foods.useQuery(
    { query: debouncedFoodSearch, limit: 30 },
    {
      enabled: isAuthenticated && Boolean(debouncedFoodSearch),
      staleTime: 5 * 60_000,
    },
  );
  const recentFoodsQuery = trpc.meals.recentFoods.useQuery(
    { limit: 8 },
    { enabled: isAuthenticated, staleTime: 60_000 },
  );
  const frequentFoodsQuery = trpc.meals.frequentFoods.useQuery(
    { limit: 8 },
    { enabled: isAuthenticated, staleTime: 60_000 },
  );
  const recentMealsQuery = trpc.meals.recentMeals.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated, staleTime: 60_000 },
  );
  const invalidateMeals = async () => {
    const invalidations = [
      utils.meals.byDate.invalidate({ date }),
      utils.meals.recentFoods.invalidate(),
      utils.meals.frequentFoods.invalidate(),
      utils.meals.recentMeals.invalidate(),
    ];
    if (!isWeeklyReportCollapsed) {
      invalidations.push(utils.meals.weeklyReport.invalidate({ endDate: date, days: 7 }));
    }
    await Promise.all(invalidations);
  };
  const saveTargets = trpc.meals.saveTargets.useMutation({
    onSuccess: async (savedTargets) => {
      toast.success("식단 목표를 저장했습니다.");
      utils.meals.targets.setData(undefined, { ...savedTargets, saved: true });
      setTargetForm({
        calories: String(savedTargets.calories || ""),
        protein: String(savedTargets.protein || ""),
        carbs: String(savedTargets.carbs || ""),
        fat: String(savedTargets.fat || ""),
      });
      const invalidations = [
        utils.meals.recommendedTargets.invalidate(),
      ];
      if (!isWeeklyReportCollapsed) {
        invalidations.push(utils.meals.weeklyReport.invalidate({ endDate: date, days: 7 }));
      }
      await Promise.all(invalidations);
    },
    onError: () => toast.error("목표 저장에 실패했습니다."),
  });
  const createFood = trpc.meals.createFood.useMutation({
    onSuccess: async () => {
      toast.success("음식을 등록했습니다.");
      setNewFoodOpen(false);
      setFoodForm({ name: "", brand: "", caloriesPer100: "", proteinPer100: "", carbsPer100: "", fatPer100: "", servingUnit: "인분", servingSizeGrams: "100", aliases: "" });
      await utils.meals.foods.invalidate();
    },
    onError: () => toast.error("음식 등록에 실패했습니다."),
  });
  const deleteFood = trpc.meals.deleteFood.useMutation({
    onSuccess: async () => {
      toast.success("내 음식을 삭제했습니다.");
      if (selectedFood?.userId) {
        setSelectedFood(null);
        setFoodSearch("");
        setFoodSearchOpen(false);
        setAmount("100");
        setPortionAmount("1");
        setPortionUnit("인분");
      }
      await Promise.all([
        utils.meals.foods.invalidate(),
        utils.meals.recentFoods.invalidate(),
        utils.meals.frequentFoods.invalidate(),
      ]);
    },
    onError: () => toast.error("직접 등록한 음식만 삭제할 수 있습니다."),
  });
  const createLog = trpc.meals.createLog.useMutation({
    onSuccess: async () => {
      toast.success("식단을 기록했습니다.");
      setSelectedFood(null);
      setFoodSearch("");
      setFoodSearchOpen(false);
      setAmount("100");
      setPortionAmount("1");
      setPortionUnit("인분");
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
  const parseMealImage = trpc.meals.parseMealImage.useMutation({
    onSuccess: (result) => {
      setImageNotes(result.notes || "");
      setImageItems(result.items.map((item: any) => ({
        foodName: item.foodName,
        amount: String(Math.round(item.amount || 100)),
        calories: String(Math.round(item.calories || 0)),
        protein: String(Math.round((item.protein || 0) * 10) / 10),
        carbs: String(Math.round((item.carbs || 0) * 10) / 10),
        fat: String(Math.round((item.fat || 0) * 10) / 10),
        confidence: item.confidence ?? 0,
        notes: item.notes ?? "",
      })));
      if (result.items.length) toast.success("이미지에서 음식을 찾았습니다. 확인 후 저장하세요.");
      else toast.warning("음식을 찾지 못했습니다. 더 선명한 사진을 사용하세요.");
    },
    onError: () => toast.error("식단 이미지를 분석하지 못했습니다."),
  });

  const totals = mealsQuery.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 };
  const targets = targetsQuery.data ?? { calories: 2200, protein: 140, carbs: 250, fat: 65 };
  const macroCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const hasFoodSearch = Boolean(foodSearch.trim());
  const showFoodSearchDropdown = foodSearchOpen && hasFoodSearch;
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

  const getServingSizeGrams = (food: any) => Math.max(1, Math.round(Number(food?.servingSizeGrams) || 100));

  const calculateMealAmountGrams = (quantity: string, unit: string, food: any) => {
    const numericQuantity = Math.max(0, Number(quantity) || 0);
    if (unit === "g") return Math.round(numericQuantity);
    return Math.round(numericQuantity * getServingSizeGrams(food));
  };

  const updatePortionAmount = (quantity: string) => {
    setPortionAmount(quantity);
    setAmount(String(calculateMealAmountGrams(quantity, portionUnit, selectedFood)));
  };

  const updatePortionUnit = (unit: string) => {
    const currentGrams = Math.max(0, Number(amount) || calculateMealAmountGrams(portionAmount, portionUnit, selectedFood));
    const nextQuantity = unit === "g"
      ? String(Math.round(currentGrams))
      : String(Math.round((currentGrams / getServingSizeGrams(selectedFood)) * 10) / 10 || 1);
    setPortionUnit(unit);
    setPortionAmount(nextQuantity);
    setAmount(String(calculateMealAmountGrams(nextQuantity, unit, selectedFood)));
  };

  const selectFood = (food: any, grams?: number) => {
    const servingSizeGrams = getServingSizeGrams(food);
    const nextGrams = grams ?? servingSizeGrams;
    setSelectedFood(food);
    setFoodSearch(food.name);
    setFoodSearchOpen(false);
    setAmount(String(nextGrams));
    setPortionAmount(grams ? String(nextGrams) : "1");
    setPortionUnit(grams ? "g" : "인분");
  };

  useEffect(() => {
    if (!targetsQuery.data) return;
    if (!targetsQuery.data.saved && recommendedTargetsQuery.data?.targets) {
      setTargetForm({
        calories: String(recommendedTargetsQuery.data.targets.calories),
        protein: String(recommendedTargetsQuery.data.targets.protein),
        carbs: String(recommendedTargetsQuery.data.targets.carbs),
        fat: String(recommendedTargetsQuery.data.targets.fat),
      });
      return;
    }
    setTargetForm({
      calories: String(targetsQuery.data.calories ?? 2200),
      protein: String(targetsQuery.data.protein ?? 140),
      carbs: String(targetsQuery.data.carbs ?? 250),
      fat: String(targetsQuery.data.fat ?? 65),
    });
  }, [recommendedTargetsQuery.data?.targets, targetsQuery.data]);

  if (loading) return <PageLoadingState wide />;
  if (!isAuthenticated) {
    return <AuthRequiredState icon={Utensils} description="식단을 기록하고 영양 합계를 확인하려면 로그인하세요." />;
  }

  const saveFood = () => {
    createFood.mutate({
      name: foodForm.name.trim(),
      brand: foodForm.brand.trim() || undefined,
      servingUnit: foodForm.servingUnit.trim() || "인분",
      servingSizeGrams: Number(foodForm.servingSizeGrams) || 100,
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
      items: [{
        foodId: selectedFood.id,
        amount: Number(amount) || 100,
        unit: portionUnit === "g"
          ? `${Number(portionAmount) || 0}g`
          : `${Number(portionAmount) || 1}인분`,
      }],
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

  const applyRecommendedTargets = () => {
    const recommended = recommendedTargetsQuery.data?.targets;
    if (!recommended) return;
    setTargetForm({
      calories: String(recommended.calories),
      protein: String(recommended.protein),
      carbs: String(recommended.carbs),
      fat: String(recommended.fat),
    });
    saveTargets.mutate(recommended);
  };

  const renderFoodSearchResults = () => (
    <div className="mobile-search-results mobile-food-search-results space-y-2 overflow-y-auto overscroll-contain">
      {foodsQuery.isLoading ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          음식 데이터를 검색하는 중입니다.
        </div>
      ) : null}
      {foodsQuery.isError ? (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive">
          음식 검색 API 응답을 받지 못했습니다. 잠시 후 다시 입력하거나 직접 음식 등록을 사용하세요.
        </div>
      ) : null}
      {hasFoodSearch && !debouncedFoodSearch ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          검색어 입력을 확인하는 중입니다.
        </div>
      ) : null}
      {foodsQuery.data?.map((food: any) => (
        <div
          key={food.id}
          className={cn(
            "food-search-option",
            selectedFood?.id === food.id ? "food-search-option-selected" : "food-search-option-default",
          )}
        >
          <button
            type="button"
            onClick={() => selectFood(food)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="food-search-option-header">
              <div className="food-search-option-title">{food.name}</div>
              <Badge variant="outline" className="food-search-option-badge">
                {food.favorite ? "즐겨찾기" : food.source}
              </Badge>
            </div>
            <div className="food-search-option-meta">
              <span>{food.brand || food.source}</span>
              <span>100g {Math.round(food.caloriesPer100)}kcal</span>
              <span>P {food.proteinPer100}g</span>
            </div>
          </button>
          {food.userId && (
            <div className="flex shrink-0 items-center gap-1">
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
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!window.confirm("직접 등록한 음식을 삭제할까요? 기존 식단 기록은 유지됩니다.")) return;
                  deleteFood.mutate({ foodId: food.id });
                }}
                disabled={deleteFood.isPending}
                className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="음식 삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ))}
      {!foodsQuery.isLoading && !foodsQuery.isError && debouncedFoodSearch && !foodsQuery.data?.length ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다. 표기가 다르면 예: 육개장, 컵라면처럼 다시 검색하거나 음식 등록으로 추가하세요.
        </div>
      ) : null}
    </div>
  );

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
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        sodium: item.sodium ?? undefined,
      })),
    });
  };

  const handleMealImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("이미지는 12MB 이하로 올려주세요.");
      return;
    }
    try {
      const imageDataUrl = await prepareMealImageDataUrl(file);
      await parseMealImage.mutateAsync({ imageDataUrl });
    } finally {
      if (mealImageInputRef.current) mealImageInputRef.current.value = "";
    }
  };

  const saveImageMeal = () => {
    const items = imageItems
      .filter((item) => item.foodName.trim())
      .map((item) => ({
        foodName: item.foodName.trim(),
        amount: Number(item.amount) || 100,
        unit: "g",
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
      }));
    if (!items.length) {
      toast.error("저장할 음식 후보가 없습니다.");
      return;
    }
    createLog.mutate({
      mealDate: new Date(`${date}T12:00:00`),
      mealType: mealType as any,
      notes: imageNotes ? `AI 이미지 인식: ${imageNotes}` : "AI 이미지 인식",
      items,
    }, {
      onSuccess: () => {
        setImageItems([]);
        setImageNotes("");
      },
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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Camera size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">이미지로 식단 인식</h2>
                </div>
                <Badge className="border border-primary/25 bg-primary/10 text-primary">AI 확인 필요</Badge>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                사진 분석 결과는 추정값입니다. 음식명과 중량을 확인한 뒤 저장하세요.
              </p>
              <input
                ref={mealImageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleMealImage(event.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="w-full gap-2 border-border"
                onClick={() => mealImageInputRef.current?.click()}
                disabled={parseMealImage.isPending}
              >
                <Camera size={16} />
                {parseMealImage.isPending ? "이미지 분석 중..." : "사진 업로드 / 촬영"}
              </Button>

              {imageItems.length ? (
                <div className="mt-4 space-y-3">
                  {imageNotes ? <div className="rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">{imageNotes}</div> : null}
                  {imageItems.map((item, index) => (
                    <div key={`${item.foodName}-${index}`} className="rounded-xl border border-border bg-background/45 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          신뢰도 {Math.round(item.confidence * 100)}%
                        </Badge>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setImageItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                          aria-label="후보 삭제"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px]">
                        <Input
                          value={item.foodName}
                          onChange={(event) => setImageItems((items) => items.map((next, itemIndex) => itemIndex === index ? { ...next, foodName: event.target.value } : next))}
                          className="border-border bg-card"
                          placeholder="음식명"
                        />
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(event) => setImageItems((items) => items.map((next, itemIndex) => itemIndex === index ? { ...next, amount: event.target.value } : next))}
                          className="border-border bg-card text-right"
                          placeholder="g"
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {[
                          ["calories", "kcal"],
                          ["protein", "단백"],
                          ["carbs", "탄수"],
                          ["fat", "지방"],
                        ].map(([key, label]) => (
                          <label key={key} className="space-y-1">
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <Input
                              type="number"
                              value={(item as any)[key]}
                              onChange={(event) => setImageItems((items) => items.map((next, itemIndex) => itemIndex === index ? { ...next, [key]: event.target.value } : next))}
                              className="h-9 border-border bg-card text-right text-xs"
                            />
                          </label>
                        ))}
                      </div>
                      {item.notes ? <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p> : null}
                    </div>
                  ))}
                  <Button className="w-full bg-primary text-primary-foreground" onClick={saveImageMeal} disabled={createLog.isPending}>
                    확인한 이미지 식단 저장
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

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
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 text-left",
                  !isWeeklyReportCollapsed && "mb-4",
                )}
                aria-expanded={!isWeeklyReportCollapsed}
                onClick={() => setIsWeeklyReportCollapsed((value) => !value)}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">7일 리포트</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    목표 근접 {weeklyReportQuery.data?.hitDays ?? 0}일
                  </Badge>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "text-muted-foreground transition-transform",
                      isWeeklyReportCollapsed && "-rotate-90",
                    )}
                  />
                </div>
              </button>
              {!isWeeklyReportCollapsed ? (
                <>
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
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Target size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">식단 목표</h2>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground">수정 가능</Badge>
              </div>
              <div className="mb-4 rounded-xl border border-border bg-background/35 p-3 text-xs text-muted-foreground">
                {hasSavedMealTargets
                  ? "저장된 식단 목표를 사용 중입니다. 필요하면 값을 수정해 다시 저장하세요."
                  : "운동 목표와 체중 기반 추천값을 적용하거나 직접 입력해 저장하세요."}
                {recommendedTargetsQuery.data?.basis ? (
                  <div className="mt-2 space-y-1 text-foreground">
                    <div>운동 목표: {recommendedTargetsQuery.data.basis.goalSummary} · 주 {recommendedTargetsQuery.data.basis.weeklyWorkouts}회 · 추천 전략: {recommendedTargetsQuery.data.basis.label}</div>
                    <div className="text-muted-foreground">
                      계산 기준: 체중 {recommendedTargetsQuery.data.basis.latestWeight}kg · BMR {recommendedTargetsQuery.data.basis.bmr}kcal · TDEE {recommendedTargetsQuery.data.basis.tdee}kcal
                    </div>
                  </div>
                ) : null}
              </div>
              {recommendedTargetsQuery.data?.targets ? (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">칼로리 자동 계산</div>
                      <div className="text-xs text-muted-foreground">{recommendedTargetsQuery.data.basis.description}</div>
                    </div>
                    <Button size="sm" variant="outline" className="border-border" onClick={applyRecommendedTargets} disabled={saveTargets.isPending}>
                      계산값 적용
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-background/45 p-2"><b>{recommendedTargetsQuery.data.targets.calories}</b><br />kcal</div>
                    <div className="rounded-lg bg-background/45 p-2"><b>{recommendedTargetsQuery.data.targets.protein}g</b><br />단백</div>
                    <div className="rounded-lg bg-background/45 p-2"><b>{recommendedTargetsQuery.data.targets.carbs}g</b><br />탄수</div>
                    <div className="rounded-lg bg-background/45 p-2"><b>{recommendedTargetsQuery.data.targets.fat}g</b><br />지방</div>
                  </div>
                </div>
              ) : recommendedTargetsQuery.isLoading ? (
                <div className="mb-4 rounded-xl border border-border bg-background/35 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">칼로리 자동 계산</div>
                      <div className="text-xs text-muted-foreground">운동 목표와 최근 체중 기반 계산값을 불러오는 중입니다.</div>
                    </div>
                    <Badge variant="outline" className="border-border text-muted-foreground">계산 중</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {["kcal", "단백", "탄수", "지방"].map((label) => (
                      <div key={label} className="rounded-lg bg-background/45 p-2 text-muted-foreground">
                        --<br />{label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : hasSavedMealTargets ? (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/35 p-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">저장된 목표 사용 중</div>
                    <div className="text-xs text-muted-foreground">자동 계산값은 필요할 때만 다시 불러옵니다.</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-border"
                    onClick={() => recommendedTargetsQuery.refetch()}
                    disabled={recommendedTargetsQuery.isFetching}
                  >
                    {recommendedTargetsQuery.isFetching ? "계산 중" : "계산값 불러오기"}
                  </Button>
                </div>
              ) : null}
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
                        disabled={targetsQuery.isLoading}
                        className="border-border bg-accent"
                      />
                      <span className="w-8 text-xs text-muted-foreground">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <Button className="mt-4 w-full gap-2 bg-primary text-primary-foreground" onClick={submitTargets} disabled={saveTargets.isPending || targetsQuery.isLoading}>
                <Save size={14} />
                {targetsQuery.isLoading ? "목표 불러오는 중" : "목표 저장"}
              </Button>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>기본 섭취 단위</Label>
                    <Input
                      value={foodForm.servingUnit}
                      onChange={(e) => setFoodForm((f) => ({ ...f, servingUnit: e.target.value }))}
                      className="border-border bg-card"
                      placeholder="예: 인분, 개, 봉, 팩"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>1단위 중량(g)</Label>
                    <Input
                      type="number"
                      value={foodForm.servingSizeGrams}
                      onChange={(e) => setFoodForm((f) => ({ ...f, servingSizeGrams: e.target.value }))}
                      className="border-border bg-card"
                      placeholder="예: 210"
                    />
                  </div>
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
                <div
                  className="food-search-anchor"
                  onBlur={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setFoodSearchOpen(false);
                  }}
                >
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={foodSearch}
                    onFocus={() => {
                      if (foodSearch.trim()) setFoodSearchOpen(true);
                    }}
                    onChange={(event) => {
                      setFoodSearch(event.target.value);
                      setFoodSearchOpen(Boolean(event.target.value.trim()));
                    }}
                    className="border-border bg-accent pl-9"
                    placeholder="음식 검색..."
                  />
                  {showFoodSearchDropdown ? (
                    <div className="food-search-dropdown">
                      {renderFoodSearchResults()}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background/35 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">이전 기록 참조</div>
                  <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">현재 날짜로 저장</Badge>
                </div>
                <div className="space-y-2">
                  {recentMealsQuery.data?.length ? recentMealsQuery.data.map((meal: any) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => copyMeal(meal)}
                      disabled={createLog.isPending}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                            {mealTypes.find((type) => type.value === meal.mealType)?.label ?? meal.mealType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{meal.items.length}개</span>
                        </div>
                        <div className="mt-1 truncate text-xs font-semibold text-foreground">
                          {meal.items.map((item: any) => item.foodName).join(", ")}
                        </div>
                      </div>
                      <Copy size={14} className="shrink-0 text-primary" />
                    </button>
                  )) : (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      식단을 기록하면 이전 기록이 여기에 표시됩니다.
                    </div>
                  )}
                </div>
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
                        className="min-h-10 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
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
                        className="min-h-10 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        {food.name}
                        {food.useCount ? <span className="ml-1 text-muted-foreground">{food.useCount}</span> : null}
                      </button>
                    )) : <span className="text-xs text-muted-foreground">반복 기록하면 자동 표시</span>}
                  </div>
                </div>
              </div>
              {selectedFood && (
                <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{selectedFood.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {portionUnit === "g" ? "그램 기준으로 기록" : `1인분 ${getServingSizeGrams(selectedFood)}g 기준`}
                      </div>
                    </div>
                    <div className="meal-amount-controls">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">수량</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={portionAmount}
                          onChange={(e) => updatePortionAmount(e.target.value)}
                          className="h-10 border-border bg-card text-right tabular-nums"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">단위</Label>
                        <Select value={portionUnit} onValueChange={updatePortionUnit}>
                          <SelectTrigger className="h-10 border-border bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="g">그램</SelectItem>
                            <SelectItem value="인분">인분</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {Array.from(new Set([Number(selectedFood.servingSizeGrams) || 100, 50, 100, 150, 200].map((value) => Math.round(value)))).map((grams) => (
                      <button
                        key={grams}
                        type="button"
                        onClick={() => {
                          setAmount(String(grams));
                          setPortionAmount(String(grams));
                          setPortionUnit("g");
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          amount === String(grams) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {grams === Math.round(Number(selectedFood.servingSizeGrams) || 100) ? `기본 ${grams}g` : `${grams}g`}
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
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteLog.mutate({ id: meal.id })}
                        aria-label="식단 기록 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {meal.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-foreground">{item.foodName} <span className="text-xs text-muted-foreground">{formatMealItemAmount(item)}</span></span>
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
