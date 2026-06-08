import { describe, expect, it } from "vitest";
import { expandExerciseSearchTerms, matchesExerciseSearchText } from "../shared/exerciseSearch";

describe("exercise search aliases", () => {
  it("matches machine curl aliases to preacher curl names", () => {
    expect(matchesExerciseSearchText("머신컬", "머신 프리처 컬", "Machine Preacher Curl")).toBe(true);
    expect(expandExerciseSearchTerms("머신컬")).toContain("머신 프리처 컬");
  });

  it("matches inner and outer thigh machine aliases", () => {
    expect(matchesExerciseSearchText("이너타이", "어덕터 머신", "Adductor Machine")).toBe(true);
    expect(matchesExerciseSearchText("아웃타이", "어브덕터 머신", "Abductor Machine")).toBe(true);
  });

  it("matches compact Korean spacing variants", () => {
    expect(matchesExerciseSearchText("랫풀다운", "V 바 풀다운", "V-Bar Pulldown")).toBe(true);
    expect(matchesExerciseSearchText("레그익스텐션", "레그 익스텐션", "Leg Extension")).toBe(true);
  });
});
