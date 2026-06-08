const aliasGroups = [
  ["머신컬", "머신 컬", "머신프리처컬", "머신 프리처 컬", "프리쳐컬", "프리처컬", "preacher curl", "machine curl"],
  ["이너타이", "이너 타이", "어덕트", "어덕터", "내전근", "adductor", "inner thigh"],
  ["아웃타이", "아웃 타이", "어브덕트", "어브덕터", "외전근", "abductor", "outer thigh"],
  ["랫풀다운", "렛풀다운", "랫 풀 다운", "랫 풀다운", "풀다운", "lat pulldown", "lat pull down", "pulldown"],
  ["체스트프레스", "체스트 프레스", "chest press"],
  ["숄더프레스", "숄더 프레스", "shoulder press"],
  ["레그프레스", "레그 프레스", "leg press"],
  ["레그컬", "레그 컬", "leg curl"],
  ["레그익스텐션", "레그 익스텐션", "leg extension"],
  ["스컬크러셔", "스컬 크러셔", "skullcrusher", "skull crusher"],
  ["바이셉컬", "바이셉 컬", "이두컬", "이두 컬", "bicep curl", "biceps curl"],
  ["트라이셉익스텐션", "트라이셉 익스텐션", "삼두익스텐션", "삼두 익스텐션", "triceps extension"],
];

export function normalizeExerciseSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[·ㆍ,._\-_/\\|:;'"`~!@#$%^&*+=?<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: string) {
  return normalizeExerciseSearchText(value).replace(/\s+/g, "");
}

export function expandExerciseSearchTerms(query: string) {
  const normalized = normalizeExerciseSearchText(query);
  if (!normalized) return [];

  const terms = new Set<string>([normalized]);
  const raw = query.trim().toLowerCase();
  if (raw) terms.add(raw);
  const compactQuery = compactSearchText(query);

  for (const group of aliasGroups) {
    if (group.some((alias) => compactSearchText(alias).includes(compactQuery) || compactQuery.includes(compactSearchText(alias)))) {
      for (const alias of group) terms.add(normalizeExerciseSearchText(alias));
    }
  }

  return Array.from(terms).filter(Boolean);
}

export function matchesExerciseSearchText(query: string, ...values: Array<string | null | undefined>) {
  const terms = expandExerciseSearchTerms(query);
  if (!terms.length) return true;
  const haystack = compactSearchText(values.filter(Boolean).join(" "));
  return terms.some((term) => {
    const compactTerm = compactSearchText(term);
    return haystack.includes(compactTerm) || compactTerm.includes(haystack);
  });
}
