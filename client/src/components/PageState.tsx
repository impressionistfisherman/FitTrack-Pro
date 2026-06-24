import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { LogIn, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageLoadingState({
  wide = false,
  cards = 2,
}: {
  wide?: boolean;
  cards?: number;
}) {
  return (
    <div
      className={`page-shell ${wide ? "page-shell-wide" : "page-shell-narrow"} space-y-4`}
      aria-label="페이지 로딩 중"
      aria-busy="true"
    >
      <div className="h-16 skeleton rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="h-48 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AuthRequiredState({
  icon: Icon,
  description = "이 기능을 사용하려면 로그인하세요.",
}: {
  icon: LucideIcon;
  description?: string;
}) {
  return (
    <div className="page-shell page-shell-narrow flex min-h-[calc(100dvh-9rem)] items-center">
      <div className="empty-state-panel w-full">
        <Icon size={40} className="mb-3 text-muted-foreground opacity-40" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">로그인이 필요합니다</h1>
        <p className="mt-1 text-sm">{description}</p>
        <Button className="mt-5 min-h-11 gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />
          로그인
        </Button>
      </div>
    </div>
  );
}

export function PageEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state-panel">
      <Icon size={36} className="mb-3 opacity-40" aria-hidden="true" />
      <h2 className="font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
