import { useCallback, useEffect, useRef, useState } from "react";

export type WakeLockStatus =
  | "unsupported" // 브라우저가 Wake Lock API를 지원하지 않음
  | "idle"        // 지원하지만 현재 비활성 상태
  | "active"      // 화면 꺼짐 방지 활성 중
  | "error";      // 획득 실패 (권한 거부 등)

interface UseWakeLockReturn {
  /** 현재 Wake Lock 상태 */
  status: WakeLockStatus;
  /** 화면 꺼짐 방지 활성화 여부 */
  isActive: boolean;
  /** 브라우저 지원 여부 */
  isSupported: boolean;
  /** 수동으로 Wake Lock 요청 */
  acquire: () => Promise<void>;
  /** 수동으로 Wake Lock 해제 */
  release: () => Promise<void>;
  /** 토글 */
  toggle: () => Promise<void>;
}

/**
 * Screen Wake Lock API를 활용해 화면 자동 꺼짐을 방지하는 커스텀 훅.
 *
 * - 컴포넌트 마운트 시 자동으로 Wake Lock을 획득합니다 (autoAcquire=true).
 * - 탭이 백그라운드로 전환됐다가 다시 포그라운드로 돌아오면 자동으로 재획득합니다.
 * - 컴포넌트 언마운트 시 자동으로 해제합니다.
 * - Wake Lock API를 지원하지 않는 브라우저에서는 graceful하게 처리합니다.
 */
export function useWakeLock(autoAcquire = true): UseWakeLockReturn {
  const isSupported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  const [status, setStatus] = useState<WakeLockStatus>(
    isSupported ? "idle" : "unsupported"
  );

  // WakeLockSentinel 참조 보관
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!isSupported) return;

    // 이미 활성 상태면 중복 획득 방지
    if (sentinelRef.current && !sentinelRef.current.released) return;

    try {
      const sentinel = await (navigator as any).wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setStatus("active");

      // sentinel이 외부 요인(배터리 절약 모드 등)으로 해제되면 상태 업데이트
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
        setStatus("idle");
      });
    } catch (err: any) {
      // NotAllowedError: 사용자 권한 거부 또는 문서가 포커스를 잃은 경우
      console.warn("[WakeLock] 획득 실패:", err.message);
      setStatus("error");
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (!sentinelRef.current || sentinelRef.current.released) return;
    try {
      await sentinelRef.current.release();
      sentinelRef.current = null;
      setStatus("idle");
    } catch (err) {
      console.warn("[WakeLock] 해제 실패:", err);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (status === "active") {
      await release();
    } else {
      await acquire();
    }
  }, [status, acquire, release]);

  // 탭이 다시 포그라운드로 돌아올 때 자동 재획득
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && autoAcquire) {
        // 이전에 active 상태였거나 자동 획득 모드이면 재획득 시도
        if (!sentinelRef.current || sentinelRef.current.released) {
          await acquire();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, autoAcquire, acquire]);

  // 마운트 시 자동 획득
  useEffect(() => {
    if (autoAcquire && isSupported) {
      acquire();
    }
    // 언마운트 시 자동 해제
    return () => {
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [autoAcquire, isSupported, acquire]);

  return {
    status,
    isActive: status === "active",
    isSupported,
    acquire,
    release,
    toggle,
  };
}
