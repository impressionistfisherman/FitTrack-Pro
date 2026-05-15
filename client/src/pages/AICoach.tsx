import { Card, CardContent } from "@/components/ui/card";
import DietRecommendation from "@/components/DietRecommendation";
import { trpc } from "@/lib/trpc";
import { Bot, Dumbbell, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const equipmentOptions = [
  { value: "bodyweight", label: "맨몸" },
  { value: "dumbbell", label: "덤벨" },
  { value: "barbell", label: "바벨" },
  { value: "machine", label: "머신" },
  { value: "cable", label: "케이블" },
  { value: "resistance_band", label: "밴드" },
];

function ProgramRecommendation() {
  const [location, setLocation] = useState<"gym" | "home" | "outdoor">("gym");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [equipment, setEquipment] = useState<string[]>(["dumbbell", "barbell", "machine", "cable"]);
  const programMutation = trpc.ai.programRecommendation.useMutation();
  const program = programMutation.data?.program;

  const toggleEquipment = (value: string) => {
    setEquipment((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const requestProgram = () => {
    programMutation.mutate({
      location,
      equipment: location === "gym" ? equipment : location === "home" ? equipment : ["bodyweight"],
      sessionDuration: Number(sessionDuration),
    });
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
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="mb-1.5 text-xs text-muted-foreground">가능 시간</div>
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
        </CardContent>
      </Card>

      {programMutation.error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 text-sm text-destructive">운동 추천 생성에 실패했습니다. 잠시 후 다시 시도하세요.</CardContent>
        </Card>
      )}

      {program && (
        <div className="space-y-3">
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

export default function AICoach() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI 코치</h1>
        <p className="text-sm text-muted-foreground mt-0.5">운동 기록과 목표를 바탕으로 추천을 확인하세요</p>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot size={20} className="text-primary" />
          </div>
          <div>
            <div className="font-semibold text-foreground">맞춤 추천</div>
            <div className="text-xs text-muted-foreground">운동 상세 페이지에서 운동별 무게 추천도 볼 수 있습니다.</div>
          </div>
        </CardContent>
      </Card>
      <ProgramRecommendation />
      <DietRecommendation />
    </div>
  );
}
