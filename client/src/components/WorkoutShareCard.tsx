import { cn } from "@/lib/utils";
import { Download, Share2, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { Button } from "./ui/button";

interface WorkoutShareCardProps {
  sessionName: string;
  date: Date;
  durationMinutes: number;
  completedSets: number;
  totalVolume: number;
  exercises: string[];
  onClose: () => void;
}

export default function WorkoutShareCard({
  sessionName,
  date,
  durationMinutes,
  completedSets,
  totalVolume,
  exercises,
  onClose,
}: WorkoutShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 500;
    canvas.width = W;
    canvas.height = H;

    // 배경 그라디언트
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0d1117");
    bg.addColorStop(1, "#0f2318");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 배경 패턴 (원)
    ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W - 80, H / 2, 80 + i * 60, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 상단 브랜드
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.fillText("FITTRACK PRO", 48, 56);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText("운동 완료", 48, 80);

    // 날짜
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }), W - 48, 56);
    ctx.textAlign = "left";

    // 구분선
    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, 100);
    ctx.lineTo(W - 48, 100);
    ctx.stroke();

    // 운동 이름 (크게)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'Inter', sans-serif";
    const displayName = sessionName.length > 20 ? sessionName.substring(0, 20) + "..." : sessionName;
    ctx.fillText(displayName, 48, 155);

    // 통계 카드들
    const stats = [
      { label: "완료 세트", value: `${completedSets}`, unit: "세트" },
      { label: "총 볼륨", value: `${Math.round(totalVolume).toLocaleString()}`, unit: "kg" },
      { label: "운동 시간", value: `${durationMinutes}`, unit: "분" },
    ];

    stats.forEach((stat, i) => {
      const x = 48 + i * 230;
      const y = 195;

      // 카드 배경
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(x, y, 200, 90, 12);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, 200, 90, 12);
      ctx.stroke();

      // 값
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.fillText(stat.value, x + 16, y + 48);

      // 단위
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "13px 'Inter', sans-serif";
      ctx.fillText(stat.unit, x + 16, y + 72);

      // 라벨
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText(stat.label, x + 16, y + 20);
    });

    // 운동 목록
    if (exercises.length > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText("운동 목록", 48, 320);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "14px 'Inter', sans-serif";
      const exList = exercises.slice(0, 5).join("  ·  ");
      const displayEx = exList.length > 60 ? exList.substring(0, 60) + "..." : exList;
      ctx.fillText(displayEx, 48, 345);
    }

    // 하단 구분선
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, 380);
    ctx.lineTo(W - 48, 380);
    ctx.stroke();

    // 하단 태그
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillText("#FitTrackPro  #운동기록  #헬스", 48, 410);

    // 하단 URL
    ctx.fillStyle = "rgba(16, 185, 129, 0.6)";
    ctx.textAlign = "right";
    ctx.fillText("fittrackpro-hfvcchhc.manus.space", W - 48, 410);
    ctx.textAlign = "left";

  }, [sessionName, date, durationMinutes, completedSets, totalVolume, exercises]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `fittrack-${date.toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "workout.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "FitTrack Pro - 운동 완료!",
              text: `${sessionName} 완료 🎉 ${completedSets}세트 · ${Math.round(totalVolume)}kg 볼륨`,
              files: [file],
            });
            return;
          } catch {}
        }
      }
      // fallback: download
      handleDownload();
    }, "image/png");
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '16px' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '520px', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={16} color="var(--primary)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>운동 공유 카드</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        {/* 캔버스 미리보기 */}
        <div style={{ padding: '16px', background: 'var(--accent)' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', borderRadius: '10px', display: 'block' }}
          />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 20px' }}>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-border text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
          >
            <Download size={15} />
            저장
          </Button>
          <Button
            className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleShare}
          >
            <Share2 size={15} />
            공유
          </Button>
        </div>
      </div>
    </div>
  );
}
