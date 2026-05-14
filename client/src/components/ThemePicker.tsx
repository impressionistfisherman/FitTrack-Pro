import { useTheme, THEMES, type AppTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

function ThemePreviewDot({ color }: { color: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

interface ThemePickerProps {
  /** 사이드바 모드: 라벨 텍스트 표시 */
  sidebar?: boolean;
}

export default function ThemePicker({ sidebar = false }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const currentConfig = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {sidebar ? (
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all duration-200 text-muted-foreground hover:bg-accent hover:text-foreground group">
            <Palette size={20} className="flex-shrink-0 group-hover:text-foreground transition-colors" />
            <span className="font-medium text-sm flex-1">테마</span>
            <div className="flex gap-1">
              {currentConfig.previewColors.map((c, i) => (
                <ThemePreviewDot key={i} color={c} />
              ))}
            </div>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            title="테마 변경"
          >
            <Palette size={16} />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-3 bg-popover border-border shadow-2xl"
        side={sidebar ? "right" : "top"}
        align={sidebar ? "start" : "end"}
        sideOffset={8}
      >
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">테마 선택</p>
          <p className="text-xs text-muted-foreground mt-0.5">원하는 색상 테마를 선택하세요</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id as AppTheme); setOpen(false); }}
                className={cn(
                  "relative flex flex-col gap-2 p-3 rounded-xl border text-left transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                {/* 색상 팔레트 미리보기 */}
                <div className="flex gap-1.5 items-center">
                  {t.previewColors.map((color, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full flex-shrink-0",
                        i === 0 ? "w-6 h-6" : "w-4 h-4"
                      )}
                      style={{ background: color }}
                    />
                  ))}
                  {isActive && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* 테마 이름 */}
                <div>
                  <div className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {t.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 현재 테마 표시 */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <div className="flex gap-1">
            {currentConfig.previewColors.map((c, i) => (
              <ThemePreviewDot key={i} color={c} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            현재: <span className="text-foreground font-medium">{currentConfig.label}</span>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
