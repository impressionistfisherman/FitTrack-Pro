import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity, Bot, Calendar, CheckSquare, Dumbbell, Home,
  LogIn, LogOut, Menu, MessageSquare, Scale, ShieldCheck, UserCheck, Users, X,
} from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ThemePicker from "./ThemePicker";

type SidebarNavItem = {
  id: string;
  href: string;
  icon: any;
  label: string;
  badge?: number;
};

const userNavItems: SidebarNavItem[] = [
  { id: "user-home", href: "/", icon: Home, label: "홈" },
  { id: "user-exercises", href: "/exercises", icon: Dumbbell, label: "운동" },
  { id: "user-routines", href: "/routines", icon: Activity, label: "루틴" },
  { id: "user-history", href: "/history", icon: Calendar, label: "기록" },
  { id: "user-body-weight", href: "/body-weight", icon: Scale, label: "체중" },
  { id: "user-coaching", href: "/coaching", icon: MessageSquare, label: "코칭" },
  { id: "user-ai-coach", href: "/ai-coach", icon: Bot, label: "AI 코치" },
];

function getVisibleNavItems({
  location,
  isTrainer,
  isAdmin,
  adminBadge,
  coachingBadge,
}: {
  location: string;
  isTrainer: boolean;
  isAdmin: boolean;
  adminBadge: number;
  coachingBadge: number;
}): SidebarNavItem[] {
  if (isAdmin && location.startsWith("/admin")) {
    return [
      { id: "admin-home", href: "/admin", icon: ShieldCheck, label: "관리자 홈" },
      { id: "admin-applications", href: "/admin#applications", icon: UserCheck, label: "신청 관리", badge: adminBadge },
      { id: "admin-trainers", href: "/admin#trainers", icon: Users, label: "승인 트레이너" },
    ];
  }

  if (isTrainer && location.startsWith("/trainer")) {
    const trainerClientPath = location.split("#")[0];
    if (location.startsWith("/trainer/clients/")) {
      return [
        { id: "trainer-home", href: "/trainer", icon: Users, label: "트레이너 홈" },
        { id: "trainer-client-timeline", href: `${trainerClientPath}#timeline`, icon: Calendar, label: "코칭 타임라인" },
        { id: "trainer-client-tasks", href: `${trainerClientPath}#tasks`, icon: CheckSquare, label: "회원 과제" },
        { id: "trainer-client-notes", href: `${trainerClientPath}#notes`, icon: MessageSquare, label: "비공개 메모" },
        { id: "trainer-client-report", href: `${trainerClientPath}#report`, icon: Activity, label: "진행 리포트" },
        { id: "trainer-client-ai-helper", href: `${trainerClientPath}#ai-helper`, icon: Bot, label: "AI 코칭 보조" },
        { id: "trainer-client-pt-sessions", href: `${trainerClientPath}#pt-sessions`, icon: Dumbbell, label: "PT 기록" },
      ];
    }
    return [
      { id: "trainer-dashboard", href: "/trainer", icon: Users, label: "트레이너 홈" },
      { id: "trainer-requests", href: "/trainer#requests", icon: UserCheck, label: "회원 요청" },
      { id: "trainer-clients", href: "/trainer#clients", icon: MessageSquare, label: "담당 회원" },
    ];
  }

  return userNavItems.map((item) => item.href === "/coaching"
    ? { ...item, badge: coachingBadge }
    : item);
}

function AppContentSkeleton() {
  return (
    <div className="page-shell page-shell-wide space-y-4" aria-label="앱 정보를 불러오는 중">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-24 skeleton rounded" />
          <div className="h-8 w-44 skeleton rounded-lg" />
          <div className="h-6 w-28 skeleton rounded-full" />
        </div>
        <div className="h-10 w-24 skeleton rounded-xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="h-56 skeleton rounded-2xl" />
        <div className="h-56 skeleton rounded-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function splitHref(href: string) {
  const [path, hash] = href.split("#");
  return { path: path || "/", hash: hash ? `#${hash}` : "" };
}

function getBrowserRouteState(fallbackLocation = "/") {
  if (typeof window === "undefined") {
    const fallback = splitHref(fallbackLocation);
    return { path: fallback.path, hash: fallback.hash };
  }
  return {
    path: window.location.pathname || "/",
    hash: window.location.hash || "",
  };
}

function emitRouteStateChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("hashchange"));
  window.dispatchEvent(new Event("fittrack:routechange"));
}

function scrollToHash(hash: string) {
  if (!hash || typeof document === "undefined") return;
  const target = document.getElementById(hash.slice(1));
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useRouteState(location: string) {
  const [route, setRoute] = useState(() => getBrowserRouteState(location));

  useEffect(() => {
    setRoute(getBrowserRouteState(location));
  }, [location]);

  useEffect(() => {
    const updateRoute = () => setRoute(getBrowserRouteState(location));
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    window.addEventListener("fittrack:routechange", updateRoute);
    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
      window.removeEventListener("fittrack:routechange", updateRoute);
    };
  }, [location]);

  return route;
}

function handleInternalNavigation({
  event,
  href,
  navigate,
  onClick,
}: {
  event: MouseEvent<HTMLAnchorElement>;
  href: string;
  navigate: (to: string) => void;
  onClick?: () => void;
}) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
  onClick?.();
  event.preventDefault();

  const { path: itemPath, hash: itemHash } = splitHref(href);
  const currentPath = getBrowserRouteState().path;

  if (!itemHash) {
    navigate(itemPath);
    window.setTimeout(() => {
      window.history.replaceState(null, "", itemPath);
      emitRouteStateChange();
    }, 0);
    return;
  }

  if (currentPath !== itemPath) {
    navigate(itemPath);
    window.setTimeout(() => {
      window.history.replaceState(null, "", `${itemPath}${itemHash}`);
      emitRouteStateChange();
      scrollToHash(itemHash);
    }, 0);
    return;
  }

  window.history.pushState(null, "", `${itemPath}${itemHash}`);
  emitRouteStateChange();
  scrollToHash(itemHash);
}

function NavItem({ href, icon: Icon, label, badge, onClick }: {
  href: string; icon: any; label: string; badge?: number; onClick?: () => void;
}) {
  const [location, navigate] = useLocation();
  const { path: currentPath, hash: currentHash } = useRouteState(location);
  const { path: itemPath, hash: itemHash } = splitHref(href);
  const isRootItem = itemPath === "/" || itemPath === "/trainer" || itemPath === "/admin";
  const isActive = itemHash
    ? currentPath === itemPath && currentHash === itemHash
    : isRootItem ? currentPath === itemPath && currentHash === "" : currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    handleInternalNavigation({ event, href, navigate, onClick });
  };
  return (
    <a href={href} onClick={handleClick} className="block">
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}>
        <Icon size={20} className="flex-shrink-0" />
        <span className="font-medium text-sm">{label}</span>
        {badge ? (
          <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
        {isActive && <span className={cn("text-primary text-xs", !badge && "ml-auto")}>›</span>}
      </div>
    </a>
  );
}

function RoleModeSwitch({ badge, showTrainer, showAdmin }: { badge: number; showTrainer: boolean; showAdmin: boolean }) {
  const [location, navigate] = useLocation();
  const { path: currentPath } = useRouteState(location);
  const isAdminView = currentPath.startsWith("/admin");
  const isTrainerView = currentPath.startsWith("/trainer");
  const isUserView = !isAdminView && !isTrainerView;

  return (
    <div className="mt-14 border-b border-border/70 bg-background/80 px-3 py-2 backdrop-blur-sm sm:px-6 xl:mt-0 xl:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-center overflow-hidden">
        <div
          className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/80 p-1 shadow-sm"
          aria-label={showAdmin ? "사용자, 트레이너, 관리자 홈 전환" : "사용자, 트레이너 홈 전환"}
        >
          <a href="/" onClick={(event) => handleInternalNavigation({ event, href: "/", navigate })}>
            <Button
              size="sm"
              variant={isUserView ? "default" : "ghost"}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap",
                isUserView && "bg-primary text-primary-foreground hover:bg-primary/90",
                !isUserView && "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              )}
            >
              <Home size={14} />
              사용자 홈
            </Button>
          </a>
          {showTrainer ? (
            <a href="/trainer" onClick={(event) => handleInternalNavigation({ event, href: "/trainer", navigate })}>
              <Button
                size="sm"
                variant={isTrainerView ? "default" : "ghost"}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap",
                  isTrainerView && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isTrainerView && "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                )}
              >
                <Users size={14} />
                트레이너 홈
              </Button>
            </a>
          ) : null}
          {showAdmin ? (
            <a href="/admin" onClick={(event) => handleInternalNavigation({ event, href: "/admin", navigate })}>
              <Button
                size="sm"
                variant={isAdminView ? "default" : "ghost"}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap",
                  isAdminView && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isAdminView && "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                )}
              >
                <ShieldCheck size={14} />
                관리자 홈
                {badge > 0 && (
                  <span className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isAdminView ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Button>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function userInitial(name?: string | null, email?: string | null) {
  return (name || email || "사용자").trim().slice(0, 1).toUpperCase();
}

function UserAvatar({ user, className = "h-8 w-8" }: { user?: any; className?: string }) {
  return (
    <Avatar className={cn("shrink-0 border border-primary/30 bg-primary/10", className)}>
      {user?.profileImageUrl ? (
        <AvatarImage src={user.profileImageUrl} alt={`${user?.name ?? "사용자"} 프로필`} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
        {userInitial(user?.name, user?.email)}
      </AvatarFallback>
    </Avatar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: pendingApplications } = trpc.admin.trainerApplications.useQuery(
    { status: "pending" },
    { enabled: user?.role === "admin" }
  );
  const { data: coachingNotifications } = trpc.trainer.notifications.useQuery(undefined, {
    enabled: Boolean(user?.id),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
  const displayName = user?.name || user?.email?.split("@")[0] || "사용자";
  const adminBadge = pendingApplications?.length ?? 0;
  const coachingBadge = coachingNotifications?.unreadCount ?? 0;
  const isTrainer = (user as any)?.appRole === "trainer";
  const isAdmin = user?.role === "admin";
  const showRoleSwitch = !loading && (isTrainer || isAdmin);
  const visibleNavItems = loading ? [] : getVisibleNavItems({ location, isTrainer, isAdmin, adminBadge, coachingBadge });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="app-layout-root">

      {/* ── 데스크톱 사이드바 ── */}
      <aside className="app-sidebar bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/" className="block">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Dumbbell size={18} className="text-primary" />
              </div>
              <div>
                <div className="font-display text-xl text-foreground tracking-wide">FITTRACK</div>
                <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Pro</div>
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 px-1 py-1" aria-label="메뉴를 불러오는 중">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-11 skeleton rounded-xl" />
              ))}
            </div>
          ) : (
            visibleNavItems.map((item) => <NavItem key={item.id} {...item} />)
          )}
        </nav>
        <div className="px-4 pb-2">
          <ThemePicker sidebar />
        </div>
        <div className="p-4 border-t border-sidebar-border">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
              <div className="h-8 w-8 skeleton rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3 w-24 skeleton rounded" />
                <div className="h-2.5 w-16 skeleton rounded" />
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div className="space-y-3">
              <Link href="/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent cursor-pointer">
                  <UserAvatar user={user} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email || ""}</div>
                  </div>
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                <LogOut size={14} />로그아웃
              </Button>
            </div>
          ) : (
            <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => startLogin()}>
              <LogIn size={16} />로그인
            </Button>
          )}
        </div>
      </aside>

      {/* ── 모바일 헤더 ── */}
      <header className="app-mobile-header bg-card/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="block">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Dumbbell size={14} className="text-primary" />
              </div>
              <span className="font-display text-lg tracking-wide">FITTRACK</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemePicker sidebar={false} />
            {loading ? (
              <div className="h-8 w-8 skeleton rounded-full" />
            ) : isAuthenticated ? (
              <Link href="/profile" className="block">
                <UserAvatar user={user} className="h-8 w-8 cursor-pointer" />
              </Link>
            ) : (
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground text-xs"
                onClick={() => startLogin()}>
                <LogIn size={12} />로그인
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
            <button
              type="button"
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              aria-label="메뉴 닫기"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative ml-auto flex h-[calc(100dvh-3.5rem)] w-[min(20rem,86vw)] flex-col border-l border-border bg-sidebar shadow-2xl animate-slide-left">
              <div className="border-b border-sidebar-border p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} className="h-9 w-9" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{isAuthenticated ? displayName : "로그인이 필요합니다"}</div>
                    <div className="truncate text-xs text-muted-foreground">{isAuthenticated ? user?.email || "" : "로그인 후 기록을 관리하세요"}</div>
                  </div>
                </div>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="space-y-2" aria-label="메뉴를 불러오는 중">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-11 skeleton rounded-xl" />
                    ))}
                  </div>
                ) : (
                  visibleNavItems.map((item) => (
                    <NavItem key={item.id} {...item} onClick={() => setMobileMenuOpen(false)} />
                  ))
                )}
              </nav>
              <div className="border-t border-sidebar-border p-4">
                {isAuthenticated && (
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <LogOut size={20} />
                    <span className="text-sm font-medium">로그아웃</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="app-main">
        {showRoleSwitch ? (
          <RoleModeSwitch badge={adminBadge} showTrainer={isTrainer} showAdmin={isAdmin} />
        ) : null}
        <div className={cn("app-main-inner", showRoleSwitch && "pt-0")} aria-busy={loading}>
          {loading ? <AppContentSkeleton /> : children}
        </div>
      </main>
    </div>
  );
}
