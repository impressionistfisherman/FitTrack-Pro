import { getPopularExerciseAliases } from "@shared/exerciseSearch";
import { ChevronRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link } from "wouter";

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

type ExerciseResultItemProps = {
  exercise: any;
  href?: string;
  onSelect?: () => void;
  showImage?: boolean;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
};

export function ExerciseResultItem({
  exercise,
  href,
  onSelect,
  showImage = false,
  rightSlot,
  showChevron = true,
}: ExerciseResultItemProps) {
  const [imgError, setImgError] = useState(false);
  const bpColor = bodyPartColors[exercise.bodyPart] || "#10b981";
  const diff = difficultyConfig[exercise.difficulty];
  const aliases = getPopularExerciseAliases(exercise.nameKo, exercise.name);

  const content = (
    <>
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
        {aliases.length > 0 && <div className="exercise-list-aliases">{aliases.join(" · ")}</div>}
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
      {showChevron && <ChevronRight className="exercise-list-chevron" size={18} aria-hidden="true" />}
    </>
  );

  return (
    <article className="exercise-list-item">
      {href ? (
        <Link href={href} className="exercise-list-link" aria-label={`${exercise.nameKo} 상세 보기`}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onSelect} className="exercise-list-link exercise-list-button">
          {content}
        </button>
      )}
      {rightSlot}
    </article>
  );
}
