import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity, Calendar, Camera, Copy, Dumbbell, Flame, LogIn, LogOut, MapPin, MessageSquare, Ruler, Scale, Settings, ShieldCheck, Target, Trash2, TrendingDown, TrendingUp, Trophy, User, Users
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line, Legend
} from "recharts";
import BodyWeightTracker from "@/components/BodyWeightTracker";

const goalOptions = [
  { value: "hypertrophy", label: "근비대", desc: "근육량 증가", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "fat_loss", label: "다이어트", desc: "체지방 감소", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { value: "strength", label: "근력", desc: "최대 근력 향상", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { value: "endurance", label: "지구력", desc: "근지구력 향상", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { value: "flexibility", label: "유연성", desc: "가동성 향상", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { value: "general", label: "일반 건강", desc: "전반적 건강", color: "text-primary bg-primary/10 border-primary/20" },
];

const experienceOptions = [
  { value: "beginner", label: "헬린이", desc: "운동을 막 시작했어요" },
  { value: "intermediate", label: "운동러", desc: "기본 루틴은 익숙해요" },
  { value: "advanced", label: "헬창", desc: "고강도 훈련도 가능해요" },
] as const;

const gymLocationOptions = [
  { value: "gym", label: "헬스장" },
  { value: "home", label: "집" },
  { value: "outdoor", label: "야외" },
] as const;

const equipmentOptions = [
  { value: "bodyweight", label: "맨몸" },
  { value: "dumbbell", label: "덤벨" },
  { value: "barbell", label: "바벨" },
  { value: "machine", label: "머신" },
  { value: "cable", label: "케이블" },
  { value: "resistance_band", label: "밴드" },
  { value: "kettlebell", label: "케틀벨" },
] as const;

const trainerSpecialtyOptions = [
  "초보자",
  "근비대",
  "다이어트",
  "근력",
  "체형교정",
  "재활/통증관리",
  "보디빌딩",
  "여성 트레이닝",
] as const;

type EquipmentValue = (typeof equipmentOptions)[number]["value"] | "none";

const MAX_PROFILE_IMAGE_BYTES = 850_000;

function getUserInitial(name?: string | null, email?: string | null) {
  const source = (name || email || "사용자").trim();
  return source.slice(0, 1).toUpperCase();
}

function PersonAvatar({ person, className = "h-10 w-10" }: { person?: any; className?: string }) {
  return (
    <Avatar className={cn("shrink-0 border border-primary/25 bg-primary/10", className)}>
      {person?.profileImageUrl ? (
        <AvatarImage src={person.profileImageUrl} alt={`${person?.name ?? "사용자"} 프로필`} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
        {getUserInitial(person?.name, person?.email)}
      </AvatarFallback>
    </Avatar>
  );
}

async function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 등록할 수 있습니다.");
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
      img.src = imageUrl;
    });
    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리할 수 없습니다.");
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length > MAX_PROFILE_IMAGE_BYTES) {
      throw new Error("이미지 용량이 큽니다. 더 작은 이미지를 선택해주세요.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const { data: stats } = trpc.history.stats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: goal } = trpc.goals.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: goals } = trpc.goals.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: preferences } = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: trainerStatus } = trpc.trainer.status.useQuery(undefined, { enabled: isAuthenticated });
  const { data: weights } = trpc.bodyWeight.list.useQuery({ limit: 30 }, { enabled: isAuthenticated });
  const goalInfo = goal as any | null | undefined;
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [weeklyWorkouts, setWeeklyWorkouts] = useState("3");
  const [targetWeight, setTargetWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("male");
  const [birthYear, setBirthYear] = useState("");
  const [gymName, setGymName] = useState("");
  const [gymLocation, setGymLocation] = useState<"gym" | "home" | "outdoor">("gym");
  const [gymEquipment, setGymEquipment] = useState<EquipmentValue[]>(["dumbbell", "barbell", "machine", "cable"]);
  const [gymEquipmentDetails, setGymEquipmentDetails] = useState<string[]>([]);
  const [gymEquipmentInput, setGymEquipmentInput] = useState("");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [avoidExercises, setAvoidExercises] = useState("");
  const [preferredExercises, setPreferredExercises] = useState("");
  const [availableWorkoutTimes, setAvailableWorkoutTimes] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [trainerCodeInput, setTrainerCodeInput] = useState("");
  const [trainerFeedbackDrafts, setTrainerFeedbackDrafts] = useState<Record<number, string>>({});
  const [trainerApplyBio, setTrainerApplyBio] = useState("");
  const [trainerApplyExperience, setTrainerApplyExperience] = useState("");
  const [trainerApplyContact, setTrainerApplyContact] = useState("");
  const [trainerApplySpecialties, setTrainerApplySpecialties] = useState<string[]>(["초보자"]);

  // goal 데이터 로드 시 폼 초기화
  const [initialized, setInitialized] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  const trainerApplication = (trainerStatus as any)?.application;
  
  useEffect(() => {
    if ((goal || goals || preferences) && !initialized) {
      setInitialized(true);
      const activeGoals = goals?.length ? goals.map((item: any) => item.goal) : goal?.goal ? [goal.goal] : [];
      if (activeGoals.length) {
        setSelectedGoals(activeGoals);
        setSelectedGoal(activeGoals[0]);
      }
      if (goal?.weeklyWorkouts) setWeeklyWorkouts(String(goal.weeklyWorkouts));
      if (goal?.targetWeight) setTargetWeight(String(goal.targetWeight));
      if (goalInfo?.heightCm) setHeightCm(String(goalInfo.heightCm));
      if (goalInfo?.gender) setGender(goalInfo.gender);
      if (goalInfo?.birthYear) setBirthYear(String(goalInfo.birthYear));
      if ((preferences as any)?.experienceLevel) setExperienceLevel((preferences as any).experienceLevel);
      if ((preferences as any)?.gymName !== undefined) setGymName((preferences as any).gymName || "");
      if ((preferences as any)?.gymLocation) setGymLocation((preferences as any).gymLocation);
      if ((preferences as any)?.gymEquipment?.length) setGymEquipment((preferences as any).gymEquipment);
      if ((preferences as any)?.gymEquipmentDetails?.length) setGymEquipmentDetails((preferences as any).gymEquipmentDetails);
      if ((preferences as any)?.injuryNotes !== undefined) setInjuryNotes((preferences as any).injuryNotes || "");
      if ((preferences as any)?.avoidExercises !== undefined) setAvoidExercises((preferences as any).avoidExercises || "");
      if ((preferences as any)?.preferredExercises !== undefined) setPreferredExercises((preferences as any).preferredExercises || "");
      if ((preferences as any)?.availableWorkoutTimes !== undefined) setAvailableWorkoutTimes((preferences as any).availableWorkoutTimes || "");
    }
  }, [goal, goalInfo, goals, preferences, initialized]);

  useEffect(() => {
    if (user && !nameInitialized) {
      const savedDisplayName = (preferences as any)?.displayName;
      setDisplayNameInput(savedDisplayName || user.name || user.email?.split("@")[0] || "");
      setNameInitialized(true);
    }
  }, [nameInitialized, preferences, user]);

  useEffect(() => {
    if (user) {
      setProfileImagePreview((user as any).profileImageUrl ?? null);
    }
  }, [user]);

  useEffect(() => {
    if (!trainerApplication) return;
    setTrainerApplyBio(trainerApplication.bio || "");
    setTrainerApplyExperience(trainerApplication.experience || "");
    setTrainerApplyContact(trainerApplication.contact || "");
    if (Array.isArray(trainerApplication.specialties) && trainerApplication.specialties.length) {
      setTrainerApplySpecialties(trainerApplication.specialties);
    }
  }, [trainerApplication]);

  const setGoalMutation = trpc.goals.set.useMutation({
    onSuccess: () => {
      toast.success("프로필 설정을 저장했습니다.");
      utils.goals.get.invalidate();
      utils.goals.list.invalidate();
      utils.preferences.get.invalidate();
      utils.ai.dietRecommendation.invalidate();
    },
    onError: () => toast.error("목표 설정에 실패했습니다."),
  });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("표시 이름을 저장했습니다.");
      utils.auth.me.invalidate();
      utils.preferences.get.invalidate();
    },
    onError: () => toast.error("이름 저장에 실패했습니다."),
  });
  const updateProfileImageMutation = trpc.auth.updateProfileImage.useMutation({
    onSuccess: (data) => {
      toast.success(data.profileImageUrl ? "프로필 이미지를 저장했습니다." : "프로필 이미지를 삭제했습니다.");
      utils.auth.me.invalidate();
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "프로필 이미지 저장에 실패했습니다."),
  });
  const issueTrainerCodeMutation = trpc.trainer.issueCode.useMutation({
    onSuccess: () => {
      toast.success("트레이너 코드가 발급되었습니다.");
      utils.trainer.status.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message || "트레이너 코드 발급에 실패했습니다."),
  });
  const applyTrainerMutation = trpc.trainer.applyForTrainer.useMutation({
    onSuccess: () => {
      toast.success("트레이너 신청을 보냈습니다. 관리자 승인 후 코드가 발급됩니다.");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "트레이너 신청에 실패했습니다."),
  });
  const registerTrainerMutation = trpc.trainer.registerTrainer.useMutation({
    onSuccess: () => {
      toast.success("트레이너에게 연결 요청을 보냈습니다.");
      setTrainerCodeInput("");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "트레이너 등록에 실패했습니다."),
  });
  const reviewClientRequestMutation = trpc.trainer.reviewClientRequest.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "active" ? "회원 연결을 승인했습니다." : "회원 요청을 거절했습니다.");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "요청 처리에 실패했습니다."),
  });
  const removeTrainerMutation = trpc.trainer.removeTrainer.useMutation({
    onSuccess: () => {
      toast.success("트레이너 연결을 해제했습니다.");
      utils.trainer.status.invalidate();
    },
    onError: () => toast.error("트레이너 연결 해제에 실패했습니다."),
  });
  const addTrainerFeedbackMutation = trpc.trainer.addFeedback.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("회원에게 피드백을 남겼습니다.");
      setTrainerFeedbackDrafts((drafts) => ({ ...drafts, [variables.clientUserId]: "" }));
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "피드백 저장에 실패했습니다."),
  });

  const saveProfileSettings = () => {
    const name = displayNameInput.replace(/\s+/g, " ").trim();
    if (!name) {
      toast.error("표시 이름을 입력해주세요.");
      return;
    }
    updateProfileMutation.mutate({ name });
    if (selectedGoals.length === 0) {
      toast.info("운동 목표를 선택하면 신체 정보와 AI 설정도 함께 저장됩니다.");
      return;
    }
    setGoalMutation.mutate({
      goal: (selectedGoals[0] || selectedGoal) as any,
      goals: selectedGoals as any,
      weeklyWorkouts: parseInt(weeklyWorkouts),
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      gender: gender || undefined,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      experienceLevel,
      gymName,
      gymLocation,
      gymEquipment: gymLocation === "outdoor" ? ["bodyweight"] : gymEquipment,
      gymEquipmentDetails: gymLocation === "outdoor" ? [] : gymEquipmentDetails,
      injuryNotes,
      avoidExercises,
      preferredExercises,
      availableWorkoutTimes,
    });
  };

  const handleProfileImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeProfileImage(file);
      setProfileImagePreview(dataUrl);
      updateProfileImageMutation.mutate({ profileImageUrl: dataUrl });
    } catch (error: any) {
      toast.error(error?.message || "프로필 이미지를 처리하지 못했습니다.");
    }
  };

  const removeProfileImage = () => {
    setProfileImagePreview(null);
    updateProfileImageMutation.mutate({ profileImageUrl: null });
  };

  if (loading) {
    return (
      <div className="page-shell page-shell-narrow space-y-4">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-72 skeleton rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center">
        <User size={40} className="text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />로그인
        </Button>
      </div>
    );
  }

  const currentGoalConfig = goal ? goalOptions.find((g) => g.value === goal.goal) : null;
  const displayName = displayNameInput.trim() || user?.name || user?.email?.split("@")[0] || "사용자";
  const toggleGoal = (value: string) => {
    setSelectedGoals((items) => {
      const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
      if (next.length > 0) setSelectedGoal(next[0]);
      return next;
    });
  };
  const toggleGymEquipment = (value: EquipmentValue) => {
    setGymEquipment((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };
  const addGymEquipmentDetail = () => {
    const value = gymEquipmentInput.replace(/\s+/g, " ").trim();
    if (!value) return;
    setGymEquipmentDetails((items) => {
      if (items.some((item) => item.toLowerCase() === value.toLowerCase())) return items;
      return [...items, value].slice(0, 40);
    });
    setGymEquipmentInput("");
  };
  const removeGymEquipmentDetail = (value: string) => {
    setGymEquipmentDetails((items) => items.filter((item) => item !== value));
  };
  const trainerClients = (trainerStatus as any)?.clients ?? [];
  const linkedTrainers = (trainerStatus as any)?.trainers ?? [];
  const pendingTrainers = (trainerStatus as any)?.pendingTrainers ?? [];
  const clientRequests = (trainerStatus as any)?.clientRequests ?? [];
  const trainerFeedback = (trainerStatus as any)?.feedback ?? [];
  const appRole = (trainerStatus as any)?.appRole ?? (user as any)?.appRole ?? "user";
  const activeTrainerCode = (trainerStatus as any)?.code ?? "";
  const applicationStatus = trainerApplication?.status ?? "";
  const toggleTrainerSpecialty = (value: string) => {
    setTrainerApplySpecialties((items) => {
      const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
      return next.length ? next : items;
    });
  };
  const submitTrainerApply = () => {
    applyTrainerMutation.mutate({
      displayName: displayName,
      bio: trainerApplyBio,
      experience: trainerApplyExperience,
      specialties: trainerApplySpecialties,
      contact: trainerApplyContact,
    });
  };

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">프로필</h1>
        <p className="page-description">목표, 숙련도, 신체 정보를 관리하세요</p>
      </div>

      {/* User Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleProfileImageFile}
            />
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 rounded-2xl border border-primary/30 bg-primary/10">
                {profileImagePreview ? (
                  <AvatarImage src={profileImagePreview} alt="내 프로필 이미지" className="rounded-2xl object-cover" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                  {getUserInitial(displayName, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2 sm:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-border bg-background text-foreground"
                  disabled={updateProfileImageMutation.isPending}
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
                    className="h-8 text-muted-foreground hover:text-destructive"
                    disabled={updateProfileImageMutation.isPending}
                    onClick={removeProfileImage}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
              {currentGoalConfig && (
                <Badge className={cn("mt-2 text-xs border", currentGoalConfig.color)}>
                  <Target size={10} className="mr-1" />
                  {currentGoalConfig.label}
                </Badge>
              )}
            </div>
            <div className="w-full sm:max-w-xs">
              <Label className="mb-1.5 block text-xs text-muted-foreground">표시 이름</Label>
              <Input
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder="앱에서 사용할 이름"
                className="bg-accent border-border text-foreground"
                maxLength={40}
              />
              <div className="mt-2 hidden gap-2 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-border bg-background text-foreground"
                  disabled={updateProfileImageMutation.isPending}
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
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    disabled={updateProfileImageMutation.isPending}
                    onClick={removeProfileImage}
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

      <Card className="bg-card border-border mb-6">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <span className="font-semibold text-foreground">트레이너 연결</span>
              <Badge className={cn(
                "border text-xs",
                appRole === "trainer"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-accent text-muted-foreground"
              )}>
                {appRole === "trainer" ? "트레이너" : "사용자"}
              </Badge>
            </div>
            {appRole === "trainer" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                  disabled={issueTrainerCodeMutation.isPending}
                  onClick={() => issueTrainerCodeMutation.mutate()}
                >
                  <ShieldCheck size={14} />
                  트레이너 코드 확인
                </Button>
                <Button asChild type="button" className="bg-primary text-primary-foreground">
                  <Link href="/trainer">전용 페이지 열기</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              {activeTrainerCode && (
                <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
                  <div className="mb-1 text-xs text-primary">내 트레이너 코드</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-background/50 px-3 py-2 font-mono text-lg font-bold text-foreground">
                      {activeTrainerCode}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-border bg-card"
                      onClick={() => {
                        navigator.clipboard?.writeText(activeTrainerCode);
                        toast.success("코드를 복사했습니다.");
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    회원이 이 코드를 등록하면 회원의 운동 기록을 확인하고 피드백을 남길 수 있습니다.
                  </p>
                </div>
              )}

              {appRole !== "trainer" && (
                <div className="rounded-xl border border-border bg-accent/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">트레이너 신청</div>
                      <div className="text-xs text-muted-foreground">
                        관리자 승인 후 트레이너 코드가 발급됩니다.
                      </div>
                    </div>
                    {applicationStatus && (
                      <Badge className={cn(
                        "border text-xs",
                        applicationStatus === "pending"
                          ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                          : applicationStatus === "rejected"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-primary/30 bg-primary/10 text-primary"
                      )}>
                        {applicationStatus === "pending" ? "검토 중" : applicationStatus === "rejected" ? "거절됨" : "승인됨"}
                      </Badge>
                    )}
                  </div>

                  {applicationStatus === "pending" ? (
                    <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-200">
                      트레이너 신청이 관리자 검토 중입니다. 승인되면 이 화면에 코드가 표시됩니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {applicationStatus === "rejected" && trainerApplication?.reviewNote && (
                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                          거절 사유: {trainerApplication.reviewNote}
                        </p>
                      )}
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">소개</Label>
                        <Textarea
                          value={trainerApplyBio}
                          onChange={(event) => setTrainerApplyBio(event.target.value)}
                          placeholder="어떤 회원을 어떻게 도울 수 있는지 적어주세요."
                          className="min-h-20 resize-none bg-background border-border text-foreground"
                          maxLength={800}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">경력 / 자격 / 운영 방식</Label>
                        <Textarea
                          value={trainerApplyExperience}
                          onChange={(event) => setTrainerApplyExperience(event.target.value)}
                          placeholder="운동 경력, 자격, 피드백 방식, 가능한 관리 범위를 적어주세요."
                          className="min-h-20 resize-none bg-background border-border text-foreground"
                          maxLength={800}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">전문 분야</Label>
                        <div className="flex flex-wrap gap-2">
                          {trainerSpecialtyOptions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleTrainerSpecialty(item)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                                trainerApplySpecialties.includes(item)
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">연락처 / 참고 링크 선택</Label>
                        <Input
                          value={trainerApplyContact}
                          onChange={(event) => setTrainerApplyContact(event.target.value)}
                          placeholder="예: 인스타그램, 포트폴리오, 연락 가능 채널"
                          className="bg-background border-border text-foreground"
                          maxLength={200}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full bg-primary text-primary-foreground"
                        disabled={
                          applyTrainerMutation.isPending ||
                          trainerApplyBio.trim().length < 10 ||
                          trainerApplyExperience.trim().length < 5
                        }
                        onClick={submitTrainerApply}
                      >
                        트레이너 신청하기
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border bg-accent/30 p-3">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  {appRole === "trainer" ? "상위 트레이너 등록" : "내 트레이너 등록"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={trainerCodeInput}
                    onChange={(event) => setTrainerCodeInput(event.target.value.toUpperCase())}
                    placeholder="예: FT-ABCDEFGH"
                    className="bg-background border-border text-foreground"
                    maxLength={32}
                  />
                  <Button
                    type="button"
                    className="shrink-0 bg-primary text-primary-foreground"
                    disabled={!trainerCodeInput.trim() || registerTrainerMutation.isPending}
                    onClick={() => registerTrainerMutation.mutate({ code: trainerCodeInput })}
                  >
                    등록
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  등록한 트레이너는 내 운동 기록과 진행 추이를 확인하고 피드백을 남길 수 있습니다.
                  {appRole === "trainer" ? " 트레이너도 상위 코치에게 코칭을 받을 수 있습니다." : ""}
                </p>
              </div>

              {linkedTrainers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">등록한 트레이너</div>
                  {linkedTrainers.map((item: any) => (
                    <div key={item.linkId} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-accent/30 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <PersonAvatar person={item.trainer} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{item.trainer?.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{item.trainer?.email}</div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={removeTrainerMutation.isPending}
                        onClick={() => removeTrainerMutation.mutate({ trainerUserId: Number(item.trainer?.id) })}
                      >
                        해제
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {pendingTrainers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">승인 대기 중인 트레이너 요청</div>
                  {pendingTrainers.map((item: any) => (
                    <div key={item.linkId} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <PersonAvatar person={item.trainer} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{item.trainer?.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{item.trainer?.email}</div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-yellow-200">
                        트레이너가 승인하면 운동 기록과 피드백이 공유됩니다.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users size={15} className="text-primary" />
                담당 회원
              </div>
              {clientRequests.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">회원 연결 요청</div>
                  {clientRequests.map((request: any) => (
                    <div key={request.linkId} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar person={request.user} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{request.user?.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{request.user?.email}</div>
                          </div>
                        </div>
                        <Badge className="w-fit border border-yellow-400/30 bg-yellow-400/10 text-yellow-200">
                          승인 대기
                        </Badge>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-border bg-background text-muted-foreground"
                          disabled={reviewClientRequestMutation.isPending}
                          onClick={() => reviewClientRequestMutation.mutate({ linkId: Number(request.linkId), status: "removed" })}
                        >
                          거절
                        </Button>
                        <Button
                          type="button"
                          className="bg-primary text-primary-foreground"
                          disabled={reviewClientRequestMutation.isPending}
                          onClick={() => reviewClientRequestMutation.mutate({ linkId: Number(request.linkId), status: "active" })}
                        >
                          승인
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {trainerClients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-4 text-sm text-muted-foreground">
                  아직 연결된 회원이 없습니다. 트레이너 코드를 공유하면 이곳에서 회원 기록과 피드백을 관리할 수 있습니다.
                </div>
              ) : (
                trainerClients.map((client: any) => {
                  const clientId = Number(client.user?.id);
                  const draft = trainerFeedbackDrafts[clientId] ?? "";
                  return (
                    <div key={client.linkId} className="rounded-xl border border-border bg-accent/30 p-3">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar person={client.user} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{client.user?.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{client.user?.email}</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          총 {client.sessionCount ?? 0}회
                          {client.lastWorkoutAt ? ` · 최근 ${new Date(client.lastWorkoutAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}` : ""}
                        </div>
                      </div>
                      <Textarea
                        value={draft}
                        onChange={(event) => setTrainerFeedbackDrafts((drafts) => ({ ...drafts, [clientId]: event.target.value }))}
                        placeholder="오늘 기록에 대한 피드백, 다음 운동 조언, 주의할 점을 남겨주세요."
                        className="min-h-20 resize-none bg-background border-border text-foreground"
                        maxLength={1200}
                      />
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          asChild
                          variant="outline"
                          className="border-border bg-background text-foreground"
                        >
                          <Link href={`/trainer/clients/${clientId}`}>기록 보기</Link>
                        </Button>
                        <Button
                          type="button"
                          className="bg-primary text-primary-foreground"
                          disabled={!draft.trim() || addTrainerFeedbackMutation.isPending}
                          onClick={() => addTrainerFeedbackMutation.mutate({ clientUserId: clientId, message: draft })}
                        >
                          <MessageSquare size={14} />
                          피드백 남기기
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}

              {trainerFeedback.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">받은 피드백</div>
                  {trainerFeedback.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-border bg-accent/30 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-2">
                          <PersonAvatar person={item.trainer} className="h-8 w-8" />
                          <span className="truncate">{item.trainer?.name}</span>
                        </div>
                        <span className="shrink-0">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Trophy, label: "총 운동", value: `${stats.totalSessions}회`, color: "text-primary bg-primary/10" },
            { icon: Flame, label: "이번 주", value: `${stats.recentSessionCount}회`, color: "text-orange-400 bg-orange-400/10" },
            { icon: TrendingUp, label: "총 볼륨", value: `${(stats.totalVolume / 1000).toFixed(1)}t`, color: "text-blue-400 bg-blue-400/10" },
            { icon: Calendar, label: "운동 시간", value: `${Math.round(stats.totalDurationMinutes / 60)}h`, color: "text-purple-400 bg-purple-400/10" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2", s.color)}>
                  <s.icon size={16} />
                </div>
                <div className="text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── 체중 기록 (BodyWeightTracker) ── */}
      <BodyWeightTracker />

      {/* ── 신체 정보 대시보드 ── */}
      {(() => {
        const h = goalInfo?.heightCm;
        const g = goalInfo?.gender;
        const by = goalInfo?.birthYear;
        const age = by ? new Date().getFullYear() - by : null;
        const latestW = weights?.[0]?.weightKg;
        const bmi = h && latestW ? Math.round((latestW / ((h / 100) ** 2)) * 10) / 10 : null;
        const bmiCategory = bmi
          ? bmi < 18.5 ? { label: "저체중", color: "text-blue-400" }
          : bmi < 23 ? { label: "정상", color: "text-green-400" }
          : bmi < 25 ? { label: "과체중", color: "text-yellow-400" }
          : { label: "비만", color: "text-red-400" }
          : null;
        const targetW = goalInfo?.targetWeight;
        const weightDiff = latestW && targetW ? Math.round((latestW - targetW) * 10) / 10 : null;

        // 체중 차트 데이터 (오래된 순)
        const chartData = [...(weights || [])].reverse().map(w => ({
          date: new Date(w.recordedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
          체중: w.weightKg,
          체지방: w.bodyFatPct ?? undefined,
        }));

        const hasBodyInfo = h || g || by || latestW;
        if (!hasBodyInfo) return null;

        return (
          <div className="mb-6 space-y-4">
            {/* 신체 정보 요약 카드 */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler size={16} className="text-primary" />
                  <span className="font-semibold text-foreground">신체 정보</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {h && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Ruler size={14} className="mx-auto mb-1 text-blue-400" />
                      <div className="text-lg font-bold text-foreground">{h}<span className="text-xs text-muted-foreground">cm</span></div>
                      <div className="text-[10px] text-muted-foreground">신장</div>
                    </div>
                  )}
                  {age && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <User size={14} className="mx-auto mb-1 text-purple-400" />
                      <div className="text-lg font-bold text-foreground">{age}<span className="text-xs text-muted-foreground">세</span></div>
                      <div className="text-[10px] text-muted-foreground">{g === "female" ? "여성" : "남성"}</div>
                    </div>
                  )}
                  {latestW && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Scale size={14} className="mx-auto mb-1 text-green-400" />
                      <div className="text-lg font-bold text-foreground">{latestW}<span className="text-xs text-muted-foreground">kg</span></div>
                      <div className="text-[10px] text-muted-foreground">현재 체중</div>
                    </div>
                  )}
                  {bmi && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Activity size={14} className={cn("mx-auto mb-1", bmiCategory?.color || "text-primary")} />
                      <div className={cn("text-lg font-bold", bmiCategory?.color || "text-foreground")}>{bmi}</div>
                      <div className="text-[10px] text-muted-foreground">BMI ({bmiCategory?.label})</div>
                    </div>
                  )}
                  {targetW && (
                    <div className="p-3 bg-accent/40 rounded-xl text-center">
                      <Target size={14} className="mx-auto mb-1 text-primary" />
                      <div className="text-lg font-bold text-foreground">{targetW}<span className="text-xs text-muted-foreground">kg</span></div>
                      <div className="text-[10px] text-muted-foreground">목표 체중</div>
                    </div>
                  )}
                </div>

                {/* 목표 체중 달성률 */}
                {latestW && targetW && (
                  <div className="mt-4 p-3 bg-accent/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Target size={13} className="text-primary" />
                        <span className="text-xs font-semibold text-foreground">목표 체중 달성률</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {weightDiff !== null && weightDiff > 0 ? (
                          <><TrendingDown size={12} className="text-orange-400" /><span className="text-orange-400 font-semibold">{weightDiff}kg 남음</span></>
                        ) : weightDiff !== null && weightDiff < 0 ? (
                          <><TrendingUp size={12} className="text-blue-400" /><span className="text-blue-400 font-semibold">{Math.abs(weightDiff)}kg 초과</span></>
                        ) : (
                          <span className="text-green-400 font-semibold">목표 달성!</span>
                        )}
                      </div>
                    </div>
                    {/* 프로그레스 바 */}
                    {(() => {
                      const startW = weights?.[weights.length - 1]?.weightKg || latestW;
                      const totalDiff = Math.abs(startW - targetW);
                      const doneDiff = Math.abs(startW - latestW);
                      const pct = totalDiff > 0 ? Math.min(100, Math.round((doneDiff / totalDiff) * 100)) : 100;
                      return (
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>시작 {startW}kg</span>
                            <span className="font-semibold text-primary">{pct}%</span>
                            <span>목표 {targetW}kg</span>
                          </div>
                          <div className="h-2 bg-accent rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 체중 변화 그래프 */}
            {chartData.length >= 2 && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" />
                      <span className="font-semibold text-foreground">체중 변화 추이</span>
                    </div>
                    <div className="text-xs text-muted-foreground">최근 {chartData.length}회 기록</div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGradProfile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="oklch(0.74 0.18 160)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fatGradProfile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 260)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="weight"
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}kg`}
                      />
                      {chartData.some(d => d.체지방 !== undefined) && (
                        <YAxis
                          yAxisId="fat"
                          orientation="right"
                          domain={[0, 50]}
                          tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                          color: "var(--foreground)",
                        }}
                        formatter={(value: any, name: string) => [
                          name === "체중" ? `${value}kg` : `${value}%`,
                          name,
                        ]}
                      />
                      {targetW && (
                        <ReferenceLine
                          yAxisId="weight"
                          y={targetW}
                          stroke="oklch(0.74 0.18 160)"
                          strokeDasharray="6 3"
                          strokeWidth={1.5}
                          label={{ value: `목표 ${targetW}kg`, position: "insideTopRight", fontSize: 10, fill: "oklch(0.74 0.18 160)" }}
                        />
                      )}
                      <Area
                        yAxisId="weight"
                        type="monotone"
                        dataKey="체중"
                        stroke="oklch(0.74 0.18 160)"
                        fill="url(#weightGradProfile)"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: "oklch(0.74 0.18 160)", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                      {chartData.some(d => d.체지방 !== undefined) && (
                        <Area
                          yAxisId="fat"
                          type="monotone"
                          dataKey="체지방"
                          stroke="#f97316"
                          fill="url(#fatGradProfile)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* 범례 */}
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-0.5 rounded bg-emerald-400" />
                      체중
                    </div>
                    {chartData.some(d => d.체지방 !== undefined) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-0.5 rounded bg-orange-400" />
                        체지방률
                      </div>
                    )}
                    {targetW && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-0.5 rounded bg-emerald-400 opacity-50" style={{ borderTop: '1px dashed' }} />
                        목표 체중
                      </div>
                    )}
                  </div>

                  {/* 변화 요약 */}
                  {chartData.length >= 2 && (() => {
                    const first = chartData[0].체중;
                    const last = chartData[chartData.length - 1].체중;
                    const diff = Math.round((last - first) * 10) / 10;
                    return (
                      <div className="mt-3 flex items-center justify-center gap-6 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">시작</div>
                          <div className="font-semibold text-foreground">{first}kg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">변화량</div>
                          <div className={cn("font-bold", diff > 0 ? "text-orange-400" : diff < 0 ? "text-green-400" : "text-muted-foreground")}>
                            {diff > 0 ? "+" : ""}{diff}kg
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">현재</div>
                          <div className="font-semibold text-foreground">{last}kg</div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Goal Setting */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-primary" />
            <span className="font-semibold text-foreground">운동 목표 설정</span>
          </div>

            {(goals?.length || goal) && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl mb-4">
                <Target size={14} className="text-primary" />
                <span className="text-sm text-primary font-medium">
                  현재: {(goals?.length ? goals : goal ? [goal] : [])
                    .map((item: any) => goalOptions.find((g) => g.value === item.goal)?.label || item.goal)
                    .join(" + ")} · 주 {goal?.weeklyWorkouts ?? 3}회
                </span>
              </div>
            )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {goalOptions.map((g) => (
              <button
                key={g.value}
                onClick={() => toggleGoal(g.value)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  selectedGoals.includes(g.value)
                    ? g.color
                    : "bg-accent border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                <div className="text-sm font-semibold">{g.label}</div>
                <div className="text-xs opacity-70">{g.desc}</div>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">운동 숙련도</Label>
            <div className="grid grid-cols-3 gap-2">
              {experienceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExperienceLevel(option.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    experienceLevel === option.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-accent text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="text-[11px] opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">내 운동 환경 <span className="text-xs text-muted-foreground font-normal">(AI 추천 기본값)</span></span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">헬스장 / 장소 이름</Label>
                <Input
                  placeholder="예: 집 근처 헬스장, 회사 헬스장"
                  value={gymName}
                  onChange={(event) => setGymName(event.target.value)}
                  className="bg-accent border-border text-foreground"
                  maxLength={80}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">기본 운동 장소</Label>
                <Select value={gymLocation} onValueChange={(value) => setGymLocation(value as any)}>
                  <SelectTrigger className="bg-accent border-border text-foreground w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {gymLocationOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="text-foreground">{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {gymLocation !== "outdoor" && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">기구 종류</Label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleGymEquipment(item.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        gymEquipment.includes(item.value)
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-accent text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">실제 보유 기구</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="예: 스미스 머신, 레그프레스, 랫풀다운"
                      value={gymEquipmentInput}
                      onChange={(event) => setGymEquipmentInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addGymEquipmentDetail();
                        }
                      }}
                      className="bg-accent border-border text-foreground"
                      maxLength={50}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-border bg-accent text-foreground"
                      onClick={addGymEquipmentDetail}
                      disabled={!gymEquipmentInput.trim() || gymEquipmentDetails.length >= 40}
                    >
                      추가
                    </Button>
                  </div>
                  {gymEquipmentDetails.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {gymEquipmentDetails.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeGymEquipmentDetail(item)}
                          className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          title="클릭하면 삭제됩니다"
                        >
                          {item} ×
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      실제 기구명을 등록하면 AI가 해당 기구를 우선해서 루틴을 추천합니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">AI 개인화 조건</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">부상/통증/주의 부위</Label>
                <Textarea
                  value={injuryNotes}
                  onChange={(event) => setInjuryNotes(event.target.value)}
                  placeholder="예: 허리 부담 적게, 오른쪽 무릎 통증"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">피하고 싶은 운동</Label>
                <Textarea
                  value={avoidExercises}
                  onChange={(event) => setAvoidExercises(event.target.value)}
                  placeholder="예: 백스쿼트 제외, 오버헤드 프레스 부담"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">선호 운동</Label>
                <Textarea
                  value={preferredExercises}
                  onChange={(event) => setPreferredExercises(event.target.value)}
                  placeholder="예: 케이블 위주, 머신 선호, 덤벨 로우 좋아함"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={500}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">운동 가능 시간대/요일</Label>
                <Textarea
                  value={availableWorkoutTimes}
                  onChange={(event) => setAvailableWorkoutTimes(event.target.value)}
                  placeholder="예: 평일 저녁 90분, 주말 오전만 가능"
                  className="min-h-20 resize-none bg-accent border-border text-foreground"
                  maxLength={300}
                />
              </div>
            </div>
          </div>

          {/* 주 운동 횟수 */}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">주 운동 횟수</Label>
            <Select value={weeklyWorkouts} onValueChange={setWeeklyWorkouts}>
              <SelectTrigger className="bg-accent border-border text-foreground w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {[1,2,3,4,5,6,7].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-foreground">주 {d}회</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 신체 정보 섹션 */}
          <div className="border-t border-border pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Ruler size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">신체 정보 <span className="text-xs text-muted-foreground font-normal">(AI 운동/식단 추천 정확도 향상)</span></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 신장 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">신장 (cm)</Label>
                <Input
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={100} max={250}
                />
              </div>
              {/* 나이 (출생년도) */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">출생년도</Label>
                <Input
                  type="number"
                  placeholder="1995"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={1920} max={2010}
                />
              </div>
              {/* 성별 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">성별</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                  <SelectTrigger className="bg-accent border-border text-foreground w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male" className="text-foreground">남성</SelectItem>
                    <SelectItem value="female" className="text-foreground">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 목표 체중 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">목표 체중 (kg)</Label>
                <Input
                  type="number"
                  placeholder="65"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="bg-accent border-border text-foreground"
                  min={30} max={200} step={0.5}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={setGoalMutation.isPending || updateProfileMutation.isPending}
            onClick={saveProfileSettings}
          >
            {setGoalMutation.isPending || updateProfileMutation.isPending ? "저장 중..." : "프로필 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={logout}
      >
        <LogOut size={16} />
        로그아웃
      </Button>
    </div>
  );
}
