import { describe, expect, it } from "vitest";

// ── 휴식 타이머 상태 전이 로직 ──
type TimerStatus = "idle" | "running" | "finished";

function getNextStatus(current: TimerStatus, remaining: number): TimerStatus {
  if (current === "running" && remaining <= 0) return "finished";
  return current;
}

function shouldShowWarning(remaining: number, prevRemaining: number): boolean {
  return prevRemaining > 10 && remaining === 10;
}

function shouldVibrate(status: TimerStatus): boolean {
  return status === "finished";
}

// ── RPE 유효성 검사 ──
function isValidRpe(value: unknown): boolean {
  if (typeof value !== "number") return false;
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function rpeLabel(rpe: number): string {
  if (rpe <= 2) return "매우 쉬움";
  if (rpe <= 4) return "쉬움";
  if (rpe <= 6) return "보통";
  if (rpe <= 8) return "힘듦";
  return "최대 한계";
}

// ── 볼륨 계산 ──
function calcVolume(sets: { reps: number; weightKg: number; completed: boolean }[]): number {
  return sets.filter(s => s.completed).reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

describe("RestTimer - 상태 전이", () => {
  it("running 중 remaining이 0이 되면 finished로 전환", () => {
    expect(getNextStatus("running", 0)).toBe("finished");
    expect(getNextStatus("running", -1)).toBe("finished");
  });

  it("running 중 remaining이 양수이면 running 유지", () => {
    expect(getNextStatus("running", 5)).toBe("running");
    expect(getNextStatus("running", 90)).toBe("running");
  });

  it("idle 상태는 remaining에 관계없이 idle 유지", () => {
    expect(getNextStatus("idle", 0)).toBe("idle");
  });
});

describe("RestTimer - 경고 및 진동", () => {
  it("remaining이 10초가 되는 순간 경고 발생", () => {
    expect(shouldShowWarning(10, 11)).toBe(true);
    expect(shouldShowWarning(10, 10)).toBe(false); // 이미 10초였으면 경고 없음
    expect(shouldShowWarning(9, 11)).toBe(false);
  });

  it("finished 상태에서만 진동 발생", () => {
    expect(shouldVibrate("finished")).toBe(true);
    expect(shouldVibrate("running")).toBe(false);
    expect(shouldVibrate("idle")).toBe(false);
  });
});

describe("RPE 유효성 검사", () => {
  it("1~10 정수만 유효", () => {
    for (let i = 1; i <= 10; i++) expect(isValidRpe(i)).toBe(true);
  });

  it("범위 밖 값은 무효", () => {
    expect(isValidRpe(0)).toBe(false);
    expect(isValidRpe(11)).toBe(false);
    expect(isValidRpe(-1)).toBe(false);
  });

  it("비정수/비숫자는 무효", () => {
    expect(isValidRpe(5.5)).toBe(false);
    expect(isValidRpe("5")).toBe(false);
    expect(isValidRpe(null)).toBe(false);
    expect(isValidRpe(undefined)).toBe(false);
  });
});

describe("RPE 라벨", () => {
  it("강도별 올바른 라벨 반환", () => {
    expect(rpeLabel(1)).toBe("매우 쉬움");
    expect(rpeLabel(5)).toBe("보통");
    expect(rpeLabel(8)).toBe("힘듦");
    expect(rpeLabel(10)).toBe("최대 한계");
  });
});

describe("볼륨 계산", () => {
  it("완료된 세트만 볼륨에 포함", () => {
    const sets = [
      { reps: 10, weightKg: 60, completed: true },
      { reps: 8, weightKg: 65, completed: true },
      { reps: 6, weightKg: 70, completed: false }, // 미완료
    ];
    expect(calcVolume(sets)).toBe(10 * 60 + 8 * 65); // 1120
  });

  it("완료된 세트가 없으면 0", () => {
    const sets = [
      { reps: 10, weightKg: 60, completed: false },
    ];
    expect(calcVolume(sets)).toBe(0);
  });

  it("맨몸 운동(weightKg=0)은 볼륨 0", () => {
    const sets = [{ reps: 20, weightKg: 0, completed: true }];
    expect(calcVolume(sets)).toBe(0);
  });
});
