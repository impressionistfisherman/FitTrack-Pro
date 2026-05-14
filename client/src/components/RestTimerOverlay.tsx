import { cn } from "@/lib/utils";
import { Minus, Play, Plus, SkipForward, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRestTimer } from "@/hooks/useRestTimer";
import { Button } from "./ui/button";

interface RestTimerOverlayProps {
  defaultSeconds?: number;
  onClose: () => void;
  onSkip: () => void;
}

function CircularProgress({ progress, remaining, status }: {
  progress: number;
  remaining: number;
  status: string;
}) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        {/* 배경 트랙 */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="oklch(0.28 0.014 260)" strokeWidth="8" />
        {/* 진행 원 */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={status === "finished" ? "oklch(0.74 0.18 160)" : "oklch(0.74 0.18 160)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="text-center z-10">
        {status === "finished" ? (
          <div className="text-2xl font-bold text-primary animate-pulse">GO!</div>
        ) : (
          <>
            <div className="text-3xl font-bold font-mono text-foreground leading-none">
              {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : String(remaining)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {minutes > 0 ? "남음" : "초"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RestTimerOverlay({ defaultSeconds = 90, onClose, onSkip }: RestTimerOverlayProps) {
  const { status, remaining, progress, start, stop, reset } = useRestTimer();
  const [restSeconds, setRestSeconds] = useState(defaultSeconds);

  // 마운트 시 자동 시작
  useEffect(() => {
    start(restSeconds);
    return () => reset();
  }, []);

  // 완료 시 2초 후 자동 닫기
  useEffect(() => {
    if (status === "finished") {
      const t = setTimeout(() => onSkip(), 2500);
      return () => clearTimeout(t);
    }
  }, [status, onSkip]);

  const adjustTime = (delta: number) => {
    const newSecs = Math.max(10, Math.min(300, restSeconds + delta));
    setRestSeconds(newSecs);
    if (status === "running") {
      reset();
      setTimeout(() => start(newSecs), 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* 타이머 카드 */}
      <div className={cn(
        "relative w-full sm:w-80 bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up",
        status === "finished" && "border-primary/40"
      )}>
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Timer size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {status === "finished" ? "휴식 완료! 💪" : "휴식 타이머"}
            </div>
            <div className="text-xs text-muted-foreground">
              {status === "finished" ? "다음 세트를 시작하세요" : "세트 간 휴식 중"}
            </div>
          </div>
        </div>

        {/* 원형 타이머 */}
        <div className="flex justify-center mb-5">
          <CircularProgress progress={progress} remaining={remaining} status={status} />
        </div>

        {/* 시간 조절 */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            onClick={() => adjustTime(-15)}
            className="w-9 h-9 rounded-full bg-accent border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Minus size={14} />
          </button>
          <div className="text-sm text-muted-foreground">
            설정: <span className="text-foreground font-semibold">{restSeconds}초</span>
          </div>
          <button
            onClick={() => adjustTime(15)}
            className="w-9 h-9 rounded-full bg-accent border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {status === "running" ? (
            <Button
              variant="outline"
              className="flex-1 gap-2 border-border text-muted-foreground hover:text-foreground"
              onClick={() => { stop(); }}
            >
              일시정지
            </Button>
          ) : status === "idle" ? (
            <Button
              className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => start(restSeconds)}
            >
              <Play size={14} className="fill-primary-foreground" />
              시작
            </Button>
          ) : null}

          <Button
            className={cn(
              "gap-2",
              status === "finished"
                ? "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            variant={status === "finished" ? "default" : "outline"}
            onClick={onSkip}
          >
            <SkipForward size={14} />
            {status === "finished" ? "다음 세트 시작" : "건너뛰기"}
          </Button>
        </div>

        {/* 진행 바 */}
        <div className="mt-4 h-1 bg-accent rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
