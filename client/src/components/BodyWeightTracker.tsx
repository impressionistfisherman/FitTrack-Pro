import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, Minus, Plus, Scale, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl">
        <div className="text-muted-foreground mb-1">{label}</div>
        <div className="text-foreground font-bold">{payload[0]?.value}kg</div>
      </div>
    );
  }
  return null;
};

function todayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
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

async function prepareInBodyImageDataUrl(file: File) {
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
  return canvas.toDataURL("image/jpeg", 0.88);
}

function formatMetric(value: unknown, suffix: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return `${Math.round(number * 10) / 10}${suffix}`;
}

function AddWeightDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [recordedAt, setRecordedAt] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const addWeight = trpc.bodyWeight.add.useMutation({
    onSuccess: () => {
      toast.success("체중이 기록되었습니다!");
      setOpen(false);
      setWeight(""); setBodyFat(""); setMuscleMass(""); setRecordedAt(todayInputValue()); setNotes("");
      onAdded();
    },
    onError: () => toast.error("기록에 실패했습니다."),
  });
  const parseInBodyCapture = trpc.ai.parseInBodyCapture.useMutation();

  const handleInBodyImage = async (file: File | null) => {
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
      const imageDataUrl = await prepareInBodyImageDataUrl(file);
      const result = await parseInBodyCapture.mutateAsync({ imageDataUrl });
      if (result.weightKg > 0) setWeight(String(result.weightKg));
      if (result.bodyFatPct > 0) setBodyFat(String(result.bodyFatPct));
      if (result.muscleMassKg > 0) setMuscleMass(String(result.muscleMassKg));
      if (result.measuredAt) setRecordedAt(result.measuredAt);
      const parsedNotes = result.notes ? `인바디 이미지 인식: ${result.notes}` : "인바디 이미지 인식";
      setNotes(parsedNotes.slice(0, 200));
      if (result.weightKg > 0 || result.bodyFatPct > 0 || result.muscleMassKg > 0) {
        toast.success("인바디 이미지에서 체성분 값을 불러왔습니다.");
      } else {
        toast.warning("값을 찾지 못했습니다. 이미지가 선명한지 확인해주세요.");
      }
    } catch (error) {
      console.error(error);
      toast.error("인바디 이미지를 분석하지 못했습니다.");
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
          <Plus size={13} />체중 기록
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            체중 기록
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-foreground">인바디 이미지 인식</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">체중, 체지방률, 골격근량을 자동 입력합니다.</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-border bg-card text-xs"
                disabled={parseInBodyCapture.isPending}
                onClick={() => imageInputRef.current?.click()}
              >
                {parseInBodyCapture.isPending ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                {parseInBodyCapture.isPending ? "분석 중" : "이미지"}
              </Button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleInBodyImage(event.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">측정 날짜</Label>
            <Input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="bg-accent border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">체중 (kg) *</Label>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeight(w => String(Math.max(0, parseFloat(w || "0") - 0.5)))}
                className="w-9 h-9 rounded-xl bg-accent border border-border flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                <Minus size={14} />
              </button>
              <Input
                type="number"
                placeholder="70.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-accent border-border text-foreground text-center text-xl font-bold h-11"
                step="0.1"
              />
              <button onClick={() => setWeight(w => String(Math.round((parseFloat(w || "0") + 0.5) * 10) / 10))}
                className="w-9 h-9 rounded-xl bg-accent border border-border flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">체지방률 (%) — 선택</Label>
            <Input
              type="number"
              placeholder="20.0"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="bg-accent border-border text-foreground"
              step="0.1"
              min="0"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">골격근량 (kg) — 선택</Label>
            <Input
              type="number"
              placeholder="35.0"
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
              className="bg-accent border-border text-foreground"
              step="0.1"
              min="0"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">메모 — 선택</Label>
            <Input
              placeholder="오늘 컨디션..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-accent border-border text-foreground"
              maxLength={200}
            />
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!weight || addWeight.isPending || parseInBodyCapture.isPending}
            onClick={() => addWeight.mutate({
              weightKg: parseFloat(weight),
              bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
              muscleMassPct: muscleMass ? parseFloat(muscleMass) : undefined,
              recordedAt: recordedAt ? new Date(`${recordedAt}T12:00:00`) : undefined,
              notes: notes || undefined,
            })}
          >
            {addWeight.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BodyWeightTracker() {
  const utils = trpc.useUtils();
  const { data: weights, isLoading, isFetching } = trpc.bodyWeight.list.useQuery(
    { limit: 30 },
    { staleTime: 1000 * 60 * 5 }
  );
  const invalidateWeightData = () => {
    utils.bodyWeight.list.invalidate();
    utils.ai.dietRecommendation.invalidate();
  };
  const deleteWeight = trpc.bodyWeight.delete.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); invalidateWeightData(); },
  });

  if (isLoading && !weights) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="space-y-4 p-4">
          <div className="h-9 skeleton rounded-lg" />
          <div className="h-20 skeleton rounded-xl" />
          <div className="h-32 skeleton rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // 차트 데이터 (오래된 순)
  const chartData = [...(weights || [])].reverse().map(w => ({
    date: new Date(w.recordedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
    체중: w.weightKg,
    체지방: w.bodyFatPct,
  }));

  // 통계
  const latest = weights?.[0];
  const prev = weights?.[1];
  const diff = latest && prev ? Math.round((latest.weightKg - prev.weightKg) * 10) / 10 : null;
  const minWeight = weights?.length ? Math.min(...weights.map(w => w.weightKg)) : 0;
  const maxWeight = weights?.length ? Math.max(...weights.map(w => w.weightKg)) : 0;

  return (
    <Card className="body-weight-panel bg-card border-border">
      <CardContent className="p-5">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            <span className="font-semibold text-foreground text-sm">체중 트래킹</span>
            {isFetching && (
              <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">
                업데이트 중
              </span>
            )}
          </div>
          <AddWeightDialog onAdded={invalidateWeightData} />
        </div>

        {weights && weights.length > 0 ? (
          <>
            {/* 현재 체중 */}
            <div className="body-weight-summary mb-5">
              <div>
                <div className="text-2xl font-bold text-foreground">{latest?.weightKg}kg</div>
                <div className="text-xs text-muted-foreground">
                  {latest ? new Date(latest.recordedAt).toLocaleDateString("ko-KR") : ""}
                </div>
                {(formatMetric(latest?.bodyFatPct, "%") || formatMetric(latest?.muscleMassPct, "kg")) && (
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {formatMetric(latest?.bodyFatPct, "%") && <span>체지방 {formatMetric(latest?.bodyFatPct, "%")}</span>}
                    {formatMetric(latest?.muscleMassPct, "kg") && <span>골격근 {formatMetric(latest?.muscleMassPct, "kg")}</span>}
                  </div>
                )}
              </div>
              {diff !== null && (
                <div className={cn("flex items-center gap-1 text-sm font-semibold", diff > 0 ? "text-red-400" : diff < 0 ? "text-green-400" : "text-muted-foreground")}>
                  {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : null}
                  {diff > 0 ? "+" : ""}{diff}kg
                </div>
              )}
              <div className="ml-auto min-w-[6rem] text-right">
                <div className="text-xs text-muted-foreground">최저 / 최고</div>
                <div className="text-xs font-semibold text-foreground">{minWeight} / {maxWeight}kg</div>
              </div>
            </div>

            {/* 차트 */}
            {chartData.length > 1 && (
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 260)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="체중" stroke="oklch(0.74 0.18 160)" fill="url(#weightGrad)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.74 0.18 160)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 최근 기록 목록 */}
            <div className="body-weight-list">
              {weights.slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center justify-between p-2.5 bg-accent/30 rounded-lg group">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{w.weightKg}kg</span>
                    {formatMetric(w.bodyFatPct, "%") && (
                      <span className="text-xs text-muted-foreground ml-2">체지방 {formatMetric(w.bodyFatPct, "%")}</span>
                    )}
                    {formatMetric(w.muscleMassPct, "kg") && (
                      <span className="text-xs text-muted-foreground ml-2">골격근 {formatMetric(w.muscleMassPct, "kg")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(w.recordedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={() => deleteWeight.mutate({ id: w.id })}
                      className="p-1 rounded text-muted-foreground transition-all hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Scale size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">체중 기록이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">오늘의 체중을 기록해보세요!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
