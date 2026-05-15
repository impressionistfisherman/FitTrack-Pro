import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { ConfettiAnimation } from "./ConfettiAnimation";
import { AchievementBadge } from "./AchievementBadge";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const weekdayLabelsKo = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function getProgressColor(progress: number): string {
  if (progress >= 100) return "bg-emerald-500";
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-yellow-500";
  if (progress >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function getProgressTextColor(progress: number): string {
  if (progress >= 100) return "text-emerald-400";
  if (progress >= 75) return "text-green-400";
  if (progress >= 50) return "text-yellow-400";
  if (progress >= 25) return "text-orange-400";
  return "text-red-400";
}

export function WeeklyGoalDashboard() {
  const { data: weeklyStats, isLoading } = trpc.weeklyGoals.get.useQuery(undefined, { retry: false });
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownToday, setHasShownToday] = useState(false);

  // 로컬 스토리지에서 오늘 이미 표시했는지 확인
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem("weeklyGoalCelebrationDate");
    if (lastShown === today) {
      setHasShownToday(true);
    }
  }, []);

  // 목표 달성 감지 및 애니메이션 표시
  useEffect(() => {
    if (weeklyStats && weeklyStats.progress === 100 && !hasShownToday) {
      setShowCelebration(true);
      const today = new Date().toDateString();
      localStorage.setItem("weeklyGoalCelebrationDate", today);
      setHasShownToday(true);
    }
  }, [weeklyStats, hasShownToday]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="flex gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded flex-1"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weeklyStats) return null;

  const handleCelebrationEnd = () => {
    setShowCelebration(false);
  };

  const { weeklyTarget, completedDays, progress, totalVolume, totalDuration, workoutsByDay } = weeklyStats;

  return (
    <>
      <ConfettiAnimation isActive={showCelebration} />
      <AchievementBadge isVisible={showCelebration} onAnimationEnd={handleCelebrationEnd} />
      <Card className="bg-card border-border h-full">
      <CardContent className="p-4 lg:p-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">이번 주 운동 목표</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {completedDays}/{weeklyTarget}일 완료
            </p>
          </div>
          <div className={`text-xl font-bold ${getProgressTextColor(progress)}`}>
            {progress}%
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="mb-4">
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(progress)} transition-all duration-500 rounded-full`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 요일별 체크리스트 */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">요일별 운동 완료</p>
          <div className="grid grid-cols-7 gap-1.5">
            {weekdayLabels.map((label, dayOfWeek) => {
              const isCompleted = workoutsByDay[dayOfWeek];
              const isToday = new Date().getDay() === dayOfWeek;

              return (
                <div
                  key={dayOfWeek}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                    isToday ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">{label}</div>
                  {isCompleted ? (
                    <CheckCircle2 size={17} className="text-emerald-400" />
                  ) : (
                    <Circle size={17} className="text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">총 볼륨</p>
            <p className="text-base font-semibold text-foreground">
              {(totalVolume / 1000).toFixed(1)}
              <span className="text-xs text-muted-foreground ml-1">톤</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">총 시간</p>
            <p className="text-base font-semibold text-foreground">
              {totalDuration}
              <span className="text-xs text-muted-foreground ml-1">분</span>
            </p>
          </div>
        </div>

        {/* 진행 상황 메시지 */}
        {completedDays >= weeklyTarget && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-emerald-400 font-medium">이번 주 목표를 달성했습니다!</p>
          </div>
        )}
        {completedDays > 0 && completedDays < weeklyTarget && (
          <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400 font-medium">
              {weeklyTarget - completedDays}일 더 운동하면 목표 달성입니다!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
