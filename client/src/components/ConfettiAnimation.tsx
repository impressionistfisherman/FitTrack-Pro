import { useEffect, useRef } from "react";

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
}

export function ConfettiAnimation({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettisRef = useRef<Confetti[]>([]);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 크기 설정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 색상 팔레트 (축하 분위기)
    const colors = [
      "#FFD700", // 금색
      "#FF6B6B", // 빨강
      "#4ECDC4", // 청록
      "#45B7D1", // 파랑
      "#FFA07A", // 연어색
      "#98D8C8", // 민트
      "#F7DC6F", // 노랑
      "#BB8FCE", // 보라
    ];

    // 컨페티 생성
    const createConfetti = () => {
      const confetti: Confetti[] = [];
      const particleCount = 80;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const velocity = 5 + Math.random() * 10;

        confetti.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 5, // 위로 향하도록
          life: 0,
          maxLife: 120 + Math.random() * 80, // 2~2.7초
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          size: 5 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      return confetti;
    };

    confettisRef.current = createConfetti();

    // 애니메이션 루프
    const animate = () => {
      // 배경 투명하게 지우기
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const confettis = confettisRef.current;

      // 컨페티 업데이트 및 그리기
      for (let i = confettis.length - 1; i >= 0; i--) {
        const c = confettis[i];

        // 생명 증가
        c.life++;

        // 투명도 계산 (끝나갈 때 페이드 아웃)
        const lifeRatio = c.life / c.maxLife;
        const opacity = Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);

        // 물리 적용
        c.vy += 0.2; // 중력
        c.vx *= 0.98; // 공기 저항
        c.vy *= 0.98;

        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.rotationSpeed;

        // 회전된 사각형 그리기
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();

        // 생명이 다하면 제거
        if (c.life >= c.maxLife) {
          confettis.splice(i, 1);
        }
      }

      // 아직 컨페티가 남아있으면 계속 애니메이션
      if (confettis.length > 0) {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);

    // 윈도우 리사이즈 처리
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ background: "transparent" }}
    />
  );
}
