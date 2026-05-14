import { Trophy, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  isVisible: boolean;
  onAnimationEnd?: () => void;
}

export function AchievementBadge({ isVisible, onAnimationEnd }: AchievementBadgeProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
      onAnimationEnd={onAnimationEnd}
    >
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        style={{
          animation: "fadeIn 0.3s ease-out forwards",
        }}
      />

      {/* 중앙 배지 */}
      <div
        className="relative z-10 flex flex-col items-center gap-4"
        style={{
          animation: "scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        {/* 배경 원 */}
        <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-primary/30 to-blue-500/30 rounded-full blur-2xl" />

        {/* 배지 카드 */}
        <div className="relative bg-gradient-to-br from-primary/20 to-blue-500/20 border-2 border-primary/50 rounded-full w-32 h-32 flex items-center justify-center shadow-2xl">
          {/* 빛나는 효과 */}
          <div
            className="absolute inset-0 rounded-full opacity-0"
            style={{
              animation: "pulse 2s ease-in-out infinite",
              background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
            }}
          />

          {/* 트로피 아이콘 */}
          <div className="relative z-10 text-primary">
            <Trophy size={64} className="drop-shadow-lg" />
          </div>

          {/* 별 장식 */}
          <div className="absolute top-2 left-2 text-yellow-400 animate-bounce" style={{ animationDelay: "0s" }}>
            <Star size={20} fill="currentColor" />
          </div>
          <div className="absolute top-2 right-2 text-yellow-400 animate-bounce" style={{ animationDelay: "0.2s" }}>
            <Star size={20} fill="currentColor" />
          </div>
          <div className="absolute bottom-2 left-2 text-yellow-400 animate-bounce" style={{ animationDelay: "0.4s" }}>
            <Star size={20} fill="currentColor" />
          </div>
          <div className="absolute bottom-2 right-2 text-yellow-400 animate-bounce" style={{ animationDelay: "0.6s" }}>
            <Star size={20} fill="currentColor" />
          </div>
        </div>

        {/* 텍스트 */}
        <div className="relative text-center space-y-1">
          <div className="text-2xl font-bold text-foreground flex items-center gap-2 justify-center">
            주간 목표 달성!
            <Zap size={24} className="text-yellow-400 fill-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">이번 주 운동 목표를 모두 완료했습니다!</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.3) rotateZ(-10deg);
            opacity: 0;
          }
          to {
            transform: scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
