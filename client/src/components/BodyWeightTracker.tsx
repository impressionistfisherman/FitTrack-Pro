import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Minus, Plus, Scale, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
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

function AddWeightDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  const addWeight = trpc.bodyWeight.add.useMutation({
    onSuccess: () => {
      toast.success("체중이 기록되었습니다!");
      setOpen(false);
      setWeight(""); setBodyFat(""); setNotes("");
      onAdded();
    },
    onError: () => toast.error("기록에 실패했습니다."),
  });

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
            <Label className="text-xs text-muted-foreground mb-1.5 block">메모 — 선택</Label>
            <Input
              placeholder="오늘 컨디션..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-accent border-border text-foreground"
              maxLength={100}
            />
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!weight || addWeight.isPending}
            onClick={() => addWeight.mutate({
              weightKg: parseFloat(weight),
              bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
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
    <Card className="bg-card border-border">
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
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-accent/40 p-3">
              <div>
                <div className="text-2xl font-bold text-foreground">{latest?.weightKg}kg</div>
                <div className="text-xs text-muted-foreground">
                  {latest ? new Date(latest.recordedAt).toLocaleDateString("ko-KR") : ""}
                </div>
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
                <ResponsiveContainer width="100%" height={140}>
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
            <div className="space-y-2">
              {weights.slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center justify-between p-2.5 bg-accent/30 rounded-lg group">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{w.weightKg}kg</span>
                    {w.bodyFatPct && <span className="text-xs text-muted-foreground ml-2">체지방 {w.bodyFatPct}%</span>}
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
