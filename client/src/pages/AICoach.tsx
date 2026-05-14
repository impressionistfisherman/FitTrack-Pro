import { Card, CardContent } from "@/components/ui/card";
import DietRecommendation from "@/components/DietRecommendation";
import { Bot } from "lucide-react";

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
      <DietRecommendation />
    </div>
  );
}
