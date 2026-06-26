import { describe, expect, it } from "vitest";
import { expandExerciseSearchTerms, getPopularExerciseAliases, matchesExerciseSearchText, scoreExerciseSearchMatch } from "../shared/exerciseSearch";

describe("exercise search aliases", () => {
  it("matches machine curl aliases to preacher curl names", () => {
    expect(matchesExerciseSearchText("머신컬", "머신 프리처 컬", "Machine Preacher Curl")).toBe(true);
    expect(expandExerciseSearchTerms("머신컬")).toContain("머신 프리처 컬");
  });

  it("matches inner and outer thigh machine aliases", () => {
    expect(matchesExerciseSearchText("이너타이", "어덕터 머신", "Adductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("이너싸이", "어덕터 머신", "Adductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("어덕트머신", "어덕터 머신", "Adductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("힙 어덕션", "어덕터 머신", "Adductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("아웃타이", "어브덕터 머신", "Abductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("아웃싸이", "어브덕터 머신", "Abductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("앱덕션", "어브덕터 머신", "Abductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("아웃싸이머신", "어브덕터 머신", "Abductor Machine")).toBe(true);
  });

  it("matches compact Korean spacing variants", () => {
    expect(matchesExerciseSearchText("랫풀다운", "V 바 풀다운", "V-Bar Pulldown")).toBe(true);
    expect(matchesExerciseSearchText("레그익스텐션", "레그 익스텐션", "Leg Extension")).toBe(true);
  });

  it("matches reordered one-arm cable row and triceps aliases", () => {
    expect(matchesExerciseSearchText("원암 케이블 로우", "케이블 원암 벤트 오버 로우", "Cable One Arm Bent Over Row")).toBe(true);
    expect(matchesExerciseSearchText("케이블원암로우", "케이블 원암 벤트 오버 로우", "Cable One Arm Bent Over Row")).toBe(true);
    expect(matchesExerciseSearchText("트라이셉스 원암", "케이블 스탠딩 원암 트라이셉스 익스텐션", "Cable Standing One Arm Triceps Extension")).toBe(true);
    expect(matchesExerciseSearchText("트라이셉스원암", "케이블 스탠딩 원암 트라이셉스 익스텐션", "Cable Standing One Arm Triceps Extension")).toBe(true);
    expect(matchesExerciseSearchText("삼두 한팔", "케이블 원암 트라이셉 푸시다운", "Cable One Arm Tricep Pushdown")).toBe(true);
    expect(matchesExerciseSearchText("one arm cable row", "케이블 원암 벤트 오버 로우", "Cable One Arm Bent Over Row")).toBe(true);
  });

  it("maps plate pulldown wording to leverage and machine pulldown names", () => {
    expect(matchesExerciseSearchText("플레이트 풀다운", "레버리지 프론트 풀다운", "Lever Front Pulldown")).toBe(true);
    expect(matchesExerciseSearchText("플레이트 풀다운", "리버스 그립 머신 랫 풀다운", "Reverse Grip Machine Lat Pulldown")).toBe(true);
    expect(matchesExerciseSearchText("machine pulldown", "레버리지 프론트 풀다운", "Lever Front Pulldown")).toBe(true);
  });

  it("matches assisted exercise wording in Korean and English", () => {
    expect(matchesExerciseSearchText("어시스트 풀업", "어시스트 풀업", "Assisted Pull-up")).toBe(true);
    expect(matchesExerciseSearchText("보조 풀업", "어시스트 풀업", "Assisted Pull-up")).toBe(true);
  });

  it("generates display aliases from movement terms", () => {
    expect(getPopularExerciseAliases("어덕터 머신", "Adductor Machine")).toEqual(
      expect.arrayContaining(["이너싸이", "어덕터 머신"])
    );
    expect(getPopularExerciseAliases("어브덕터 머신", "Abductor Machine")).toEqual(
      expect.arrayContaining(["아웃싸이", "어브덕터 머신"])
    );
    expect(getPopularExerciseAliases("레버리지 시티드 힙 어덕션", "Lever Seated Hip Adduction")).toEqual(
      expect.arrayContaining(["이너싸이", "내전근"])
    );
  });

  it("scores exact exercise name matches above partial matches", () => {
    const exact = scoreExerciseSearchMatch("바벨 로우", "바벨 로우", "Bent Over Barbell Row");
    const partial = scoreExerciseSearchMatch("바벨 로우", "덤벨 로우", "Bent Over Two-Dumbbell Row");
    expect(exact).toBeGreaterThan(partial);
  });
});
