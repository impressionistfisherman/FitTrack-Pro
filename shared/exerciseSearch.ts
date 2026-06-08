const aliasGroups = [
  ["머신컬", "머신 컬", "머신프리처컬", "머신 프리처 컬", "프리쳐컬", "프리처컬", "preacher curl", "machine curl"],
  ["이너타이", "이너 타이", "어덕트", "어덕터", "내전근", "adductor", "inner thigh"],
  ["아웃타이", "아웃 타이", "어브덕트", "어브덕터", "외전근", "abductor", "outer thigh"],
  ["랫풀다운", "렛풀다운", "랫 풀 다운", "랫 풀다운", "풀다운", "lat pulldown", "lat pull down", "pulldown"],
  ["플레이트풀다운", "플레이트 풀다운", "머신풀다운", "머신 풀다운", "레버리지풀다운", "레버리지 풀다운", "레버풀다운", "레버 풀다운", "lever pulldown", "leverage pulldown", "machine pulldown", "lever front pulldown", "레버리지 프론트 풀다운", "레버리지 원암 와이드 풀다운", "리버스 그립 머신 랫 풀다운"],
  ["체스트프레스", "체스트 프레스", "chest press"],
  ["숄더프레스", "숄더 프레스", "shoulder press"],
  ["레그프레스", "레그 프레스", "leg press"],
  ["레그컬", "레그 컬", "leg curl"],
  ["레그익스텐션", "레그 익스텐션", "leg extension"],
  ["스컬크러셔", "스컬 크러셔", "skullcrusher", "skull crusher"],
  ["바이셉컬", "바이셉 컬", "이두컬", "이두 컬", "bicep curl", "biceps curl"],
  ["트라이셉익스텐션", "트라이셉 익스텐션", "삼두익스텐션", "삼두 익스텐션", "triceps extension"],
];

const synonymGroups = [
  ["원암", "원 암", "한팔", "한 팔", "싱글암", "싱글 암", "one arm", "one-arm", "single arm", "single-arm"],
  ["투암", "투 암", "양팔", "양 팔", "two arm", "two-arm"],
  ["케이블", "cable"],
  ["머신", "machine", "lever", "leverage", "레버", "레버리지", "플레이트", "plate", "plate loaded", "plate-loaded"],
  ["로우", "row", "rows"],
  ["풀다운", "풀 다운", "pulldown", "pull down", "pulldowns", "lat pulldown", "랫풀다운", "렛풀다운", "랫 풀다운"],
  ["트라이셉", "트라이셉스", "삼두", "삼두근", "tricep", "triceps"],
  ["바이셉", "바이셉스", "이두", "이두근", "bicep", "biceps"],
  ["어시스트", "어시스티드", "보조", "보조식", "assisted", "assist"],
  ["익스텐션", "extension", "extensions"],
  ["푸시다운", "pushdown", "pushdowns"],
  ["프레스", "press", "presses"],
  ["컬", "curl", "curls"],
  ["와이드", "wide", "wide grip", "wide-grip"],
  ["리버스", "reverse"],
  ["그립", "grip"],
  ["시티드", "seated"],
  ["스탠딩", "standing"],
  ["벤트오버", "벤트 오버", "bent over", "bent-over"],
  ["하이", "high"],
  ["스트레이트", "straight"],
  ["백", "back"],
  ["V바", "V 바", "v bar", "v-bar"],
  ["랫", "lat", "lats"],
];

const synonymByCompact = new Map<string, Set<string>>();

for (const group of synonymGroups) {
  const normalizedGroup = group.map((item) => normalizeExerciseSearchText(item)).filter(Boolean);
  for (const item of normalizedGroup) {
    const compact = compactSearchText(item);
    const synonyms = synonymByCompact.get(compact) ?? new Set<string>();
    for (const synonym of normalizedGroup) synonyms.add(synonym);
    synonymByCompact.set(compact, synonyms);
  }
}

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

function tokenizeExerciseSearchText(value: string) {
  const normalized = normalizeExerciseSearchText(value);
  if (!normalized) return [];
  return normalized.split(" ").map((token) => compactSearchText(token)).filter((token) => token.length >= 2);
}

function expandToken(token: string) {
  const expanded = synonymByCompact.get(token);
  if (!expanded) return [token];
  return Array.from(expanded).flatMap((item) => tokenizeExerciseSearchText(item));
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

export function getExerciseSearchTokenGroups(query: string) {
  const groups: string[][] = [];
  const seenGroups = new Set<string>();

  for (const token of tokenizeExerciseSearchText(query)) {
    const group = Array.from(new Set([token, ...expandToken(token)])).filter(Boolean);
    const key = group.slice().sort().join("|");
    if (!key || seenGroups.has(key)) continue;
    seenGroups.add(key);
    groups.push(group);
  }

  return groups;
}

export function matchesExerciseSearchText(query: string, ...values: Array<string | null | undefined>) {
  const terms = expandExerciseSearchTerms(query);
  if (!terms.length) return true;

  const haystack = compactSearchText(values.filter(Boolean).join(" "));
  if (!haystack) return false;
  if (terms.some((term) => {
    const compactTerm = compactSearchText(term);
    return haystack.includes(compactTerm) || compactTerm.includes(haystack);
  })) return true;

  const tokenGroups = getExerciseSearchTokenGroups(query);
  if (!tokenGroups.length) return true;
  return tokenGroups.every((group) => group.some((token) => haystack.includes(token)));
}
