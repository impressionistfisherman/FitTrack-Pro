import { cn } from "@/lib/utils";
import { Calculator, X } from "lucide-react";
import { useState } from "react";

/**
 * 1RM 계산기 - Epley 공식 사용
 * 1RM = weight × (1 + reps / 30)
 *
 * 팝업 형태로 세트 기록 옆에 표시
 */

function calcOneRM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// 1RM 기반 각 %별 무게 계산
const RM_PERCENTAGES = [
  { pct: 100, reps: 1, label: "1RM" },
  { pct: 95, reps: 2, label: "2RM" },
  { pct: 90, reps: 4, label: "4RM" },
  { pct: 85, reps: 6, label: "6RM" },
  { pct: 80, reps: 8, label: "8RM" },
  { pct: 75, reps: 10, label: "10RM" },
  { pct: 70, reps: 12, label: "12RM" },
  { pct: 65, reps: 15, label: "15RM" },
];

interface OneRMCalculatorProps {
  initialWeight?: number;
  initialReps?: number;
  onClose: () => void;
}

export default function OneRMCalculator({ initialWeight = 0, initialReps = 10, onClose }: OneRMCalculatorProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);

  const oneRM = weight > 0 && reps > 0 ? calcOneRM(weight, reps) : 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'oklch(0 0 0 / 0.6)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--card)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          padding: '20px', paddingBottom: '32px',
          boxSizing: 'border-box',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={16} color="var(--primary-foreground)" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>1RM 계산기</div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Epley 공식 기반</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              무게 (kg)
            </label>
            <input
              type="number"
              value={weight || ''}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--accent)', color: 'var(--foreground)',
                fontSize: '18px', fontWeight: 700, textAlign: 'center', outline: 'none',
              }}
              step="2.5"
              min="0"
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              반복 횟수
            </label>
            <input
              type="number"
              value={reps || ''}
              onChange={(e) => setReps(parseInt(e.target.value) || 0)}
              placeholder="0"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                borderRadius: '10px', border: '1px solid var(--border)',
                background: 'var(--accent)', color: 'var(--foreground)',
                fontSize: '18px', fontWeight: 700, textAlign: 'center', outline: 'none',
              }}
              min="1"
            />
          </div>
        </div>

        {/* 1RM 결과 */}
        {oneRM > 0 && (
          <>
            <div style={{
              background: 'var(--primary)', borderRadius: '12px',
              padding: '14px', textAlign: 'center', marginBottom: '14px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--primary-foreground)', opacity: 0.8, marginBottom: '2px' }}>추정 1RM</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary-foreground)' }}>
                {oneRM} <span style={{ fontSize: '16px' }}>kg</span>
              </div>
            </div>

            {/* RM 표 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {RM_PERCENTAGES.map(({ pct, reps: r, label }) => {
                const w = Math.round(oneRM * pct / 100 * 4) / 4; // 0.25kg 단위
                return (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: '8px',
                    background: pct === 100 ? 'var(--primary)' : 'var(--accent)',
                    border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: pct === 100 ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}>
                      {label} ({pct}%)
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: pct === 100 ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
                      {w}kg
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
