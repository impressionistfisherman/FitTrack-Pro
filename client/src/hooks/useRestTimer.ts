import { useCallback, useEffect, useRef, useState } from "react";

export type RestTimerStatus = "idle" | "running" | "finished";

interface UseRestTimerReturn {
  status: RestTimerStatus;
  remaining: number;       // 남은 초
  progress: number;        // 0~1 (완료 비율)
  totalSeconds: number;    // 설정된 전체 시간
  start: (seconds: number) => void;
  stop: () => void;
  reset: () => void;
}

/**
 * 세트 간 휴식 타이머 훅
 * - 카운트다운 후 Web Audio API 알림음 + Vibration API 진동
 * - 10초 전 경고음 포함
 */
export function useRestTimer(): UseRestTimerReturn {
  const [status, setStatus] = useState<RestTimerStatus>("idle");
  const [remaining, setRemaining] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio Context 초기화 (lazy)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {}
    }
    return audioCtxRef.current;
  }, []);

  /**
   * 비프음 재생
   * @param freq 주파수 (Hz)
   * @param duration 길이 (초)
   * @param volume 볼륨 0~1
   */
  const playBeep = useCallback((freq: number, duration: number, volume = 0.4) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      // AudioContext가 suspended 상태면 resume
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [getAudioCtx]);

  /** 완료 알림: 3번 상승 비프 */
  const playFinishSound = useCallback(() => {
    playBeep(440, 0.15);
    setTimeout(() => playBeep(550, 0.15), 180);
    setTimeout(() => playBeep(660, 0.3), 360);
  }, [playBeep]);

  /** 경고 알림: 짧은 단일 비프 */
  const playWarningSound = useCallback(() => {
    playBeep(880, 0.1, 0.25);
  }, [playBeep]);

  /** 진동 (Vibration API) */
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if ("vibrate" in navigator) navigator.vibrate(pattern);
    } catch {}
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((seconds: number) => {
    clearTimer();
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setStatus("running");

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;

        if (next === 10) {
          // 10초 전 경고
          playWarningSound();
          vibrate(100);
        }

        if (next <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setStatus("finished");
          playFinishSound();
          vibrate([200, 100, 200, 100, 400]);
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [clearTimer, playWarningSound, playFinishSound, vibrate]);

  const stop = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setRemaining(0);
    setStatus("idle");
  }, [clearTimer]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearTimer();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [clearTimer]);

  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

  return { status, remaining, progress, totalSeconds, start, stop, reset };
}
