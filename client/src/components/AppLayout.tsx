import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { cn } from "@/lib/utils";
import {
  Activity, Bot, Calendar, Dumbbell, Home,
  LogIn, LogOut, Menu, Scale, User, X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import ThemePicker from "./ThemePicker";

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/exercises", icon: Dumbbell, label: "운동" },
  { href: "/routines", icon: Activity, label: "루틴" },
  { href: "/history", icon: Calendar, label: "기록" },
  { href: "/body-weight", icon: Scale, label: "체중" },
  { href: "/ai-coach", icon: Bot, label: "AI 코치" },
];

function NavItem({ href, icon: Icon, label, onClick }: {
  href: string; icon: any; label: string; onClick?: () => void;
}) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link href={href} onClick={onClick} className="block">
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}>
        <Icon size={20} className="flex-shrink-0" />
        <span className="font-medium text-sm">{label}</span>
        {isActive && <span className="ml-auto text-primary text-xs">›</span>}
      </div>
    </Link>
  );
}

function MobileNavItem({ href, icon: Icon, label }: {
  href: string; icon: any; label: string;
}) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link href={href} className="block">
      <div className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        <div className={cn("p-1.5 rounded-lg", isActive ? "bg-primary/20" : "")}>
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = user?.name || user?.email?.split("@")[0] || "사용자";

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
          {navItems.map((item) => <NavItem key={item.href} {...item} />)}
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary" />
                  </div>
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
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer">
                  <User size={14} className="text-primary" />
                </div>
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
          <div className="bg-card border-b border-border p-4 space-y-1 animate-slide-up">
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} onClick={() => setMobileMenuOpen(false)} />
            ))}
            {isAuthenticated && (
              <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground w-full transition-colors">
                <LogOut size={20} />
                <span className="font-medium text-sm">로그아웃</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="app-main">
        <div className={cn("app-main-inner", loading && "pointer-events-none")}>
          {children}
        </div>
      </main>

      {/* ── 모바일 하단 네비게이션 ── */}
      <nav className="app-mobile-nav bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => <MobileNavItem key={item.href} {...item} />)}
        </div>
      </nav>

    </div>
  );
}
