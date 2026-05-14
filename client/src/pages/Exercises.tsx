import { trpc } from "@/lib/trpc";
import { Filter, Heart, Search, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

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
  chest: "#ef4444", back: "#3b82f6", shoulders: "#eab308",
  arms: "#f97316", legs: "#22c55e", abs: "#a855f7",
  glutes: "#ec4899", cardio: "#06b6d4", stretching: "#14b8a6",
  full_body: "#10b981",
};

const bodyPartLabels: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨", arms: "팔",
  legs: "하체", abs: "복근", glutes: "둔근", cardio: "유산소",
  stretching: "스트레칭", full_body: "전신",
};

const equipmentLabels: Record<string, string> = {
  barbell: "바벨", dumbbell: "덤벨", machine: "머신", cable: "케이블",
  bodyweight: "맨몸", kettlebell: "케틀벨", resistance_band: "밴드", none: "기구 없음",
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: "초급", color: "#22c55e" },
  intermediate: { label: "중급", color: "#eab308" },
  advanced: { label: "고급", color: "#ef4444" },
};

// ── 운동 리스트 아이템 (가로 레이아웃) ──
function ExerciseListItem({ exercise, isFav, onToggleFav }: { exercise: any; isFav?: boolean; onToggleFav?: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [, navigate] = useLocation();
  const bpColor = bodyPartColors[exercise.bodyPart] || "#10b981";
  const diff = difficultyConfig[exercise.difficulty];

  return (
    <div
      onClick={() => navigate(`/exercises/${exercise.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 왼쪽: 썸네일 이미지 (정사각형 고정) */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '10px',
        overflow: 'hidden',
        flexShrink: 0,
        background: bpColor + '20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {exercise.gifUrl && !imgError ? (
          <img
            src={exercise.gifUrl}
            alt={exercise.nameKo}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px' }} fill="none">
            <path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4" stroke={bpColor} strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 오른쪽: 텍스트 정보 */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* 운동명 */}
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '3px',
        }}>
          {exercise.nameKo}
        </div>
        {/* 영문명 */}
        <div style={{
          fontSize: '11px',
          color: 'var(--muted-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '5px',
        }}>
          {exercise.name}
        </div>
        {/* 뱃지 행 */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {/* 부위 */}
          <span style={{
            fontSize: '10px', fontWeight: 600,
            padding: '2px 7px', borderRadius: '999px',
            background: bpColor + '25', color: bpColor,
            border: `1px solid ${bpColor}40`,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
          </span>
          {/* 기구 */}
          <span style={{
            fontSize: '10px', fontWeight: 500,
            padding: '2px 7px', borderRadius: '999px',
            background: 'var(--accent)', color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {equipmentLabels[exercise.equipment] || exercise.equipment}
          </span>
          {/* 난이도 */}
          {diff && (
            <span style={{
              fontSize: '10px', fontWeight: 600,
              padding: '2px 7px', borderRadius: '999px',
              background: diff.color + '20', color: diff.color,
              border: `1px solid ${diff.color}40`,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {diff.label}
            </span>
          )}
        </div>
      </div>

      {/* 오른쪽: 즐겨찾기 + 화살표 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {onToggleFav && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <Heart
              size={18}
              fill={isFav ? '#ef4444' : 'none'}
              color={isFav ? '#ef4444' : 'var(--muted-foreground)'}
            />
          </button>
        )}
        <div style={{ color: 'var(--muted-foreground)', fontSize: '16px' }}>›</div>
      </div>
    </div>
  );
}

// ── 필터 칩 ──
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--card)',
        color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ── 메인 페이지 ──
export default function Exercises() {
  const { isAuthenticated } = useAuth();
  const [bodyPart, setBodyPart] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showFavOnly, setShowFavOnly] = useState(false);

  const utils = trpc.useUtils();
  const { data: exercises, isLoading } = trpc.exercises.list.useQuery({
    bodyPart: bodyPart !== "all" ? bodyPart : undefined,
    equipment: equipment !== "all" ? equipment : undefined,
  });

  const { data: favorites } = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated });
  const favIds = new Set(favorites?.map((f: any) => f.ex.id) || []);

  const toggleFav = trpc.favorites.toggle.useMutation({
    onSuccess: () => utils.favorites.list.invalidate(),
  });

  const filtered = exercises?.filter((ex) => {
    if (showFavOnly && !favIds.has(ex.id)) return false;
    if (difficulty !== "all" && ex.difficulty !== difficulty) return false;
    if (search) {
      const q = search.toLowerCase();
      return ex.nameKo.toLowerCase().includes(q) || ex.name.toLowerCase().includes(q);
    }
    return true;
  });

  const activeFilterCount = [bodyPart !== "all", equipment !== "all", difficulty !== "all"].filter(Boolean).length;

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: '16px', overflowX: 'hidden' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>운동 탐색</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            103개 운동 · 부위별 · 기구별 분류
          </p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowFavOnly(!showFavOnly)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '10px',
              border: showFavOnly ? '1px solid #ef4444' : '1px solid var(--border)',
              background: showFavOnly ? '#ef444420' : 'var(--card)',
              color: showFavOnly ? '#ef4444' : 'var(--muted-foreground)',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Heart size={14} fill={showFavOnly ? '#ef4444' : 'none'} color={showFavOnly ? '#ef4444' : 'var(--muted-foreground)'} />
            즐겨찾기
          </button>
        )}
      </div>

      {/* 검색 + 필터 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search size={15} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--muted-foreground)',
            pointerEvents: 'none',
          }} />
          <input
            placeholder="운동 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: '34px', paddingRight: search ? '34px' : '12px',
              paddingTop: '9px', paddingBottom: '9px',
              borderRadius: '10px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--foreground)', fontSize: '14px', outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                padding: 0, display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '9px 14px', borderRadius: '10px',
            border: showFilters ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: showFilters ? 'var(--primary)' : 'var(--card)',
            color: showFilters ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            flexShrink: 0, position: 'relative', fontSize: '13px',
          }}
        >
          <Filter size={15} />
          {activeFilterCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              width: '17px', height: '17px',
              background: 'var(--primary)', color: 'var(--primary-foreground)',
              borderRadius: '999px', fontSize: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 부위 필터 (가로 스크롤) */}
      <div style={{ overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
          {bodyParts.map((bp) => (
            <FilterChip key={bp.value} label={bp.label} active={bodyPart === bp.value} onClick={() => setBodyPart(bp.value)} />
          ))}
        </div>
      </div>

      {/* 확장 필터 */}
      {showFilters && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '14px', marginBottom: '12px',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>기구</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {equipments.map((eq) => (
                <FilterChip key={eq.value} label={eq.label} active={equipment === eq.value} onClick={() => setEquipment(eq.value)} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>난이도</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {difficulties.map((d) => (
                <FilterChip key={d.value} label={d.label} active={difficulty === d.value} onClick={() => setDifficulty(d.value)} />
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setBodyPart("all"); setEquipment("all"); setDifficulty("all"); }}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
            >
              <X size={12} /> 필터 초기화
            </button>
          )}
        </div>
      )}

      {/* 결과 수 */}
      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '10px' }}>
        {isLoading ? "로딩 중..." : `${filtered?.length || 0}개 운동`}
      </div>

      {/* ── 세로 리스트 ── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: '92px', borderRadius: '12px',
              background: 'var(--accent)',
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {filtered.map((exercise) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              isFav={favIds.has(exercise.id)}
              onToggleFav={isAuthenticated ? () => toggleFav.mutate({ exerciseId: exercise.id }) : undefined}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted-foreground)' }}>
          <p style={{ marginBottom: '8px' }}>검색 결과가 없습니다</p>
          <button
            onClick={() => { setBodyPart("all"); setEquipment("all"); setDifficulty("all"); setSearch(""); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px' }}
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  );
}
