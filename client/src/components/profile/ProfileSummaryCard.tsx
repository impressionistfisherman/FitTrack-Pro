import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Camera, Flame, Target, Trash2 } from "lucide-react";
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
    <Card className="figma-profile-hero mb-6 overflow-hidden border-border">
      <div className="figma-profile-cover" />
      <CardContent className="relative px-5 pb-5 pt-0">
        <div className="flex flex-col items-center">
          <input
            ref={profileImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onProfileImageFile}
          />
          <div className="-mt-10 flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20 rounded-full border-4 border-background bg-primary/10 shadow-xl">
              {profileImagePreview ? (
                <AvatarImage src={profileImagePreview} alt="내 프로필 이미지" className="rounded-full object-cover" />
              ) : null}
              <AvatarFallback className="rounded-full bg-primary/10 text-xl font-bold text-primary">
                {getUserInitial(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 border-border bg-background text-foreground"
                disabled={imagePending}
                onClick={() => profileImageInputRef.current?.click()}
              >
                <Camera size={14} />
                사진 변경
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
                  <Trash2 size={14} />
                  삭제
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 text-center">
            <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{email || ""}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge className="border border-primary/30 bg-primary/10 text-primary">
                <Flame size={11} className="mr-1" /> 꾸준한 운동
              </Badge>
              {currentGoal && <Badge className={cn("border text-xs", currentGoal.color)}>
                <Target size={10} className="mr-1" />
                {currentGoal.label}
              </Badge>}
            </div>
          </div>
          <div className="mt-5 w-full max-w-sm">
            <Label className="mb-1.5 block text-xs text-muted-foreground">표시 이름</Label>
            <Input
              value={displayNameInput}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder="앱에서 사용할 이름"
              className="border-border bg-accent text-foreground"
              maxLength={40}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
