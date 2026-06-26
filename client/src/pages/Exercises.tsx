import { useAuth } from "@/_core/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { trpc } from "@/lib/trpc";
import { matchesExerciseSearchText } from "@shared/exerciseSearch";
import { ChevronLeft, ChevronRight, Filter, Heart, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 24;

const bodyParts = [
  { value: "all", label: "전체" },
  { value: "chest", label: "가슴" },
  { value: "back", label: "등" },
  { value: "shoulders", label: "어깨" },
  { value: "arms", label: "팔" },
  { value: "legs", label: "하체" },
  { value: "abs", label: "복근" },
  { value: "glutes", label: "둔근" },
  { value: "cardio", label: "유산소" },
  { value: "stretching", label: "스트레칭" },
  { value: "full_body", label: "전신" },
];

const equipments = [
  { value: "all", label: "전체" },
  { value: "barbell", label: "바벨" },
  { value: "dumbbell", label: "덤벨" },
  { value: "machine", label: "머신" },
  { value: "cable", label: "케이블" },
  { value: "bodyweight", label: "맨몸" },
  { value: "kettlebell", label: "케틀벨" },
  { value: "resistance_band", label: "밴드" },
  { value: "none", label: "기구 없음" },
];

const difficulties = [
  { value: "all", label: "전체" },
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
];

const bodyPartColors: Record<string, string> = {
  chest: "#ef4444",
  back: "#3b82f6",
  shoulders: "#eab308",
  arms: "#f97316",
  legs: "#22c55e",
  abs: "#a855f7",
  glutes: "#ec4899",
  cardio: "#06b6d4",
  stretching: "#14b8a6",
  full_body: "#10b981",
};

const bodyPartLabels: Record<string, string> = {
  chest: "가슴",
  back: "등",
  shoulders: "어깨",
  arms: "팔",
  legs: "하체",
  abs: "복근",
  glutes: "둔근",
  cardio: "유산소",
  stretching: "스트레칭",
  full_body: "전신",
};

const equipmentLabels: Record<string, string> = {
  barbell: "바벨",
  dumbbell: "덤벨",
  machine: "머신",
  cable: "케이블",
  bodyweight: "맨몸",
  kettlebell: "케틀벨",
  resistance_band: "밴드",
  none: "기구 없음",
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: "초급", color: "#22c55e" },
  intermediate: { label: "중급", color: "#eab308" },
  advanced: { label: "고급", color: "#ef4444" },
};

function getInitialFilters() {
  if (typeof window === "undefined") {
    return { bodyPart: "all", equipment: "all", difficulty: "all", search: "", favorites: false, page: 1 };
  }

  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("page"));
  return {
    bodyPart: params.get("bodyPart") || "all",
    equipment: params.get("equipment") || "all",
    difficulty: params.get("difficulty") || "all",
    search: params.get("q") || "",
    favorites: params.get("favorites") === "1",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function ExerciseListItem({
  exercise,
  isFav,
  onToggleFav,
  showImage,
}: {
  exercise: any;
  isFav?: boolean;
  onToggleFav?: () => void;
  showImage?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const bpColor = bodyPartColors[exercise.bodyPart] || "#10b981";
  const diff = difficultyConfig[exercise.difficulty];

  return (
    <article className="exercise-list-item">
      <Link
        href={`/exercises/${exercise.id}`}
        className="exercise-list-link"
        aria-label={`${exercise.nameKo} 상세 보기`}
      >
        <div className="exercise-list-thumbnail" style={{ background: `${bpColor}20` }}>
          {showImage && exercise.gifUrl && !imgError ? (
            <img
              src={exercise.gifUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <path
                d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4"
                stroke={bpColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <div className="exercise-list-copy">
          <div className="exercise-list-title">{exercise.nameKo}</div>
          <div className="exercise-list-subtitle">{exercise.name}</div>
          <div className="exercise-list-badges">
            <span
              className="exercise-list-badge"
              style={{ background: `${bpColor}25`, color: bpColor, borderColor: `${bpColor}40` }}
            >
              {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
            </span>
            <span className="exercise-list-badge exercise-list-badge-muted">
              {equipmentLabels[exercise.equipment] || exercise.equipment}
            </span>
            {diff && (
              <span
                className="exercise-list-badge"
                style={{ background: `${diff.color}20`, color: diff.color, borderColor: `${diff.color}40` }}
              >
                {diff.label}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="exercise-list-chevron" size={18} aria-hidden="true" />
      </Link>

      {onToggleFav && (
        <button
          type="button"
          className="exercise-favorite-button"
          onClick={onToggleFav}
          aria-label={isFav ? `${exercise.nameKo} 즐겨찾기 해제` : `${exercise.nameKo} 즐겨찾기 추가`}
          aria-pressed={isFav}
        >
          <Heart size={18} fill={isFav ? "#ef4444" : "none"} color={isFav ? "#ef4444" : "currentColor"} />
        </button>
      )}
    </article>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-chip${active ? " filter-chip-active" : ""}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function Exercises() {
  const { isAuthenticated } = useAuth();
  const initial = useMemo(getInitialFilters, []);
  const [bodyPart, setBodyPart] = useState(initial.bodyPart);
  const [equipment, setEquipment] = useState(initial.equipment);
  const [difficulty, setDifficulty] = useState(initial.difficulty);
  const [search, setSearch] = useState(initial.search);
  const [page, setPage] = useState(initial.page);
  const [showFilters, setShowFilters] = useState(false);
  const [showFavOnly, setShowFavOnly] = useState(initial.favorites);
  const [showImages, setShowImages] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const utils = trpc.useUtils();
  const { data: exercises, isLoading, isFetching } = trpc.exercises.list.useQuery(
    {
      bodyPart: bodyPart !== "all" ? bodyPart : undefined,
      equipment: equipment !== "all" ? equipment : undefined,
    },
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: favorites } = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated });
  const favIds = useMemo(() => new Set(favorites?.map((favorite: any) => favorite.ex.id) || []), [favorites]);

  const toggleFav = trpc.favorites.toggle.useMutation({
    onSuccess: () => utils.favorites.list.invalidate(),
  });

  const filtered = useMemo(
    () =>
      exercises?.filter((exercise) => {
        if (showFavOnly && !favIds.has(exercise.id)) return false;
        if (difficulty !== "all" && exercise.difficulty !== difficulty) return false;
        return !debouncedSearch || matchesExerciseSearchText(debouncedSearch, exercise.nameKo, exercise.name);
      }) ?? [],
    [debouncedSearch, difficulty, exercises, favIds, showFavOnly]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleExercises = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilterCount = [bodyPart !== "all", equipment !== "all", difficulty !== "all"].filter(Boolean).length;

  useEffect(() => {
    setPage(1);
  }, [bodyPart, equipment, difficulty, debouncedSearch, showFavOnly]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (bodyPart !== "all") params.set("bodyPart", bodyPart);
    if (equipment !== "all") params.set("equipment", equipment);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (showFavOnly) params.set("favorites", "1");
    if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [bodyPart, currentPage, debouncedSearch, difficulty, equipment, showFavOnly]);

  const resetFilters = () => {
    setBodyPart("all");
    setEquipment("all");
    setDifficulty("all");
    setSearch("");
    setShowFavOnly(false);
  };

  const movePage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-shell figma-page animate-fade-in overflow-x-hidden">
      <header className="page-content-header">
        <div>
          <h1 className="page-title">운동 탐색</h1>
          <p className="page-description">부위·기구·난이도로 원하는 운동을 찾으세요</p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setShowFavOnly((current) => !current)}
            className={`exercise-toolbar-button${showFavOnly ? " exercise-toolbar-button-favorite" : ""}`}
            aria-pressed={showFavOnly}
          >
            <Heart size={16} fill={showFavOnly ? "#ef4444" : "none"} />
            즐겨찾기
          </button>
        )}
      </header>

      <section className="exercise-control-panel" aria-label="운동 검색과 필터">
        <div className="exercise-control-row">
          <label className="exercise-search">
            <span className="sr-only">운동 이름 검색</span>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="운동 이름 검색..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="검색어 초기화">
                <X size={16} />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`exercise-filter-button${showFilters ? " exercise-filter-button-active" : ""}`}
            aria-expanded={showFilters}
            aria-controls="exercise-extra-filters"
            aria-label="상세 필터"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">필터</span>
            {activeFilterCount > 0 && <span className="exercise-filter-count">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="exercise-filter-scroll" aria-label="운동 부위 필터">
          {bodyParts.map((bodyPartOption) => (
            <FilterChip
              key={bodyPartOption.value}
              label={bodyPartOption.label}
              active={bodyPart === bodyPartOption.value}
              onClick={() => setBodyPart(bodyPartOption.value)}
            />
          ))}
        </div>
      </section>

      {showFilters && (
        <section id="exercise-extra-filters" className="exercise-extra-filters" aria-label="상세 운동 필터">
          <div>
            <h2>기구</h2>
            <div className="flex flex-wrap gap-2">
              {equipments.map((equipmentOption) => (
                <FilterChip
                  key={equipmentOption.value}
                  label={equipmentOption.label}
                  active={equipment === equipmentOption.value}
                  onClick={() => setEquipment(equipmentOption.value)}
                />
              ))}
            </div>
          </div>
          <div>
            <h2>난이도</h2>
            <div className="flex flex-wrap gap-2">
              {difficulties.map((difficultyOption) => (
                <FilterChip
                  key={difficultyOption.value}
                  label={difficultyOption.label}
                  active={difficulty === difficultyOption.value}
                  onClick={() => setDifficulty(difficultyOption.value)}
                />
              ))}
            </div>
          </div>
          {(activeFilterCount > 0 || search || showFavOnly) && (
            <button type="button" onClick={resetFilters} className="exercise-reset-button">
              <X size={14} /> 전체 초기화
            </button>
          )}
        </section>
      )}

      <div className="exercise-result-summary" aria-live="polite">
        <div>
          <span>{isLoading && !exercises ? "로딩 중..." : `${filtered.length}개 운동`}</span>
          {filtered.length > PAGE_SIZE && <span> · {currentPage}/{totalPages} 페이지</span>}
          {isFetching && exercises && <span className="text-primary"> · 업데이트 중</span>}
        </div>
        <button
          type="button"
          className={`exercise-image-toggle${showImages ? " exercise-image-toggle-active" : ""}`}
          onClick={() => setShowImages((current) => !current)}
          aria-pressed={showImages}
        >
          {showImages ? "이미지 켜짐" : "빠른 목록"}
        </button>
      </div>

      {isLoading && !exercises ? (
        <div className="space-y-2" aria-label="운동 목록 로딩 중" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[94px] skeleton rounded-xl" />
          ))}
        </div>
      ) : visibleExercises.length > 0 ? (
        <>
          <div className="space-y-2">
            {visibleExercises.map((exercise) => (
              <ExerciseListItem
                key={exercise.id}
                exercise={exercise}
                isFav={favIds.has(exercise.id)}
                showImage={showImages}
                onToggleFav={
                  isAuthenticated ? () => toggleFav.mutate({ exerciseId: exercise.id }) : undefined
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="exercise-pagination" aria-label="운동 목록 페이지">
              <button
                type="button"
                onClick={() => movePage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="이전 페이지"
              >
                <ChevronLeft size={18} /> 이전
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => movePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="다음 페이지"
              >
                다음 <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="empty-state-panel">
          <p className="font-medium text-foreground">검색 결과가 없습니다</p>
          <p className="mt-1 text-sm">검색어나 필터를 바꿔보세요.</p>
          <button type="button" onClick={resetFilters} className="mt-4 min-h-11 text-sm font-semibold text-primary">
            전체 초기화
          </button>
        </div>
      )}
    </div>
  );
}
