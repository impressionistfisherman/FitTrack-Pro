import React, { createContext, useContext, useEffect, useState } from "react";

export type AppTheme =
  | "dark"       // 기존 다크 (Emerald)
  | "light"      // 밝고 깔끔한 라이트
  | "midnight"   // 딥 블루 미드나잇
  | "ocean"      // 청록 오션
  | "sunset"     // 따뜻한 선셋
  | "forest";    // 자연 포레스트

export interface ThemeConfig {
  id: AppTheme;
  label: string;
  description: string;
  previewColors: string[]; // 미리보기용 색상 3개
  isDark: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "dark",
    label: "Helios 3D",
    description: "Figma 기반 오렌지 3D 다크",
    previewColors: ["#121416", "#ff8a3d", "#2b3036"],
    isDark: true,
  },
  {
    id: "light",
    label: "라이트",
    description: "밝고 깔끔한 화이트 테마",
    previewColors: ["#ffffff", "#10b981", "#f3f4f6"],
    isDark: false,
  },
  {
    id: "midnight",
    label: "미드나잇",
    description: "딥 블루 계열의 야간 테마",
    previewColors: ["#0a0f1e", "#6366f1", "#111827"],
    isDark: true,
  },
  {
    id: "ocean",
    label: "오션",
    description: "시원한 청록빛 바다 테마",
    previewColors: ["#0c1a2e", "#06b6d4", "#0f2744"],
    isDark: true,
  },
  {
    id: "sunset",
    label: "선셋",
    description: "따뜻한 오렌지-핑크 노을 테마",
    previewColors: ["#1a0f0a", "#f97316", "#2d1a0e"],
    isDark: true,
  },
  {
    id: "forest",
    label: "포레스트",
    description: "자연에서 영감받은 그린 테마",
    previewColors: ["#0a1a0f", "#22c55e", "#0f2318"],
    isDark: true,
  },
];

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
  // legacy compat
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "fittrack-theme";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;

  // Remove all theme classes
  THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));

  // Add current theme class
  root.classList.add(`theme-${theme}`);

  // dark/light class for shadcn compatibility
  const config = THEMES.find((t) => t.id === theme);
  if (config?.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
      if (stored && THEMES.find((t) => t.id === stored)) return stored;
    } catch {}
    return defaultTheme;
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
  };

  const themeConfig = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig,
        setTheme,
        toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
        switchable: true,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
