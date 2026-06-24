import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Camera, Target, Trash2 } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

type GoalConfig = {
  label: string;
  color: string;
};

function getUserInitial(name?: string | null, email?: string | null) {
  const source = (name || email || "사용자").trim();
  return source.slice(0, 1).toUpperCase();
}

export function ProfileSummaryCard({
  displayName,
  email,
  displayNameInput,
  onDisplayNameChange,
  profileImagePreview,
  profileImageInputRef,
  onProfileImageFile,
  onRemoveProfileImage,
  imagePending,
  currentGoal,
}: {
  displayName: string;
  email?: string | null;
  displayNameInput: string;
  onDisplayNameChange: (value: string) => void;
  profileImagePreview: string | null;
  profileImageInputRef: RefObject<HTMLInputElement | null>;
  onProfileImageFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfileImage: () => void;
  imagePending: boolean;
  currentGoal: GoalConfig | null | undefined;
}) {
  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/10 to-card">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            ref={profileImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onProfileImageFile}
          />
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 rounded-2xl border border-primary/30 bg-primary/10">
              {profileImagePreview ? (
                <AvatarImage src={profileImagePreview} alt="내 프로필 이미지" className="rounded-2xl object-cover" />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                {getUserInitial(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2 sm:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 border-border bg-background text-foreground"
                disabled={imagePending}
                onClick={() => profileImageInputRef.current?.click()}
              >
                <Camera size={14} />
                변경
              </Button>
              {profileImagePreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-muted-foreground hover:text-destructive"
                  disabled={imagePending}
                  onClick={onRemoveProfileImage}
                >
                  삭제
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{email || ""}</p>
            {currentGoal && (
              <Badge className={cn("mt-2 border text-xs", currentGoal.color)}>
                <Target size={10} className="mr-1" />
                {currentGoal.label}
              </Badge>
            )}
          </div>
          <div className="w-full sm:max-w-xs">
            <Label className="mb-1.5 block text-xs text-muted-foreground">표시 이름</Label>
            <Input
              value={displayNameInput}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder="앱에서 사용할 이름"
              className="border-border bg-accent text-foreground"
              maxLength={40}
            />
            <div className="mt-2 hidden gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 border-border bg-background text-foreground"
                disabled={imagePending}
                onClick={() => profileImageInputRef.current?.click()}
              >
                <Camera size={14} />
                프로필 이미지 변경
              </Button>
              {profileImagePreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 px-3 text-muted-foreground hover:text-destructive"
                  disabled={imagePending}
                  onClick={onRemoveProfileImage}
                  aria-label="프로필 이미지 삭제"
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
