import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  Eye,
  ImagePlus,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";

function clientInitial(client?: any) {
  return (client?.name || client?.email || "회원")
    .trim()
    .slice(0, 1)
    .toUpperCase();
}

type PtSet = {
  setNumber: number;
  weightKg: string;
  reps: string;
};

type PtExercise = {
  exercise: any;
  sets: PtSet[];
  durationMinutes: string;
  distanceKm: string;
};

type PtLogInput = {
  exerciseId: number;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceM?: number;
};

function todayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = parseDateInputValue(value);
  if (!date) return "날짜 선택";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatShortDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function groupWorkoutLogs(logs: any[] = []) {
  const groups = new Map<number, { exercise: any; logs: any[] }>();
  for (const item of logs) {
    const exerciseId = Number(item.log?.exerciseId ?? item.exercise?.id);
    if (!exerciseId) continue;
    if (!groups.has(exerciseId)) groups.set(exerciseId, { exercise: item.exercise, logs: [] });
    groups.get(exerciseId)!.logs.push(item);
  }
  return Array.from(groups.values());
}

function formatWorkoutLogValue(log: any) {
  if (log.durationSeconds) {
    const minutes = Math.round(Number(log.durationSeconds) / 60);
    const distance = Number(log.distanceM) > 0
      ? ` · ${(Number(log.distanceM) / 1000).toFixed(Number(log.distanceM) >= 10000 ? 0 : 1)}km`
      : "";
    return `${minutes}분${distance}`;
  }
  return `${Number(log.weightKg) || 0}kg × ${Number(log.reps) || 0}회`;
}

function WorkoutLogDetailList({ logs }: { logs: any[] }) {
  const exerciseGroups = useMemo(() => groupWorkoutLogs(logs), [logs]);
  if (!exerciseGroups.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-accent/20 p-4 text-center text-sm text-muted-foreground">
        기록된 운동 세트가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exerciseGroups.map(({ exercise, logs: exerciseLogs }, groupIndex) => (
        <div key={exercise?.id ?? groupIndex} className="rounded-xl border border-border bg-accent/25 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {exercise?.nameKo ?? exercise?.name ?? "운동"}
              </div>
              {exercise?.name ? (
                <div className="truncate text-xs text-muted-foreground">{exercise.name}</div>
              ) : null}
            </div>
            <Badge variant="outline" className="shrink-0 border-border text-muted-foreground">
              {exerciseLogs.length}세트
            </Badge>
          </div>
          <div className="space-y-1.5">
            {exerciseLogs.map((item: any, index: number) => (
              <div
                key={item.log?.id ?? `${exercise?.id ?? "exercise"}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/45 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{item.log?.setNumber ?? index + 1}세트</span>
                <span className="font-medium text-foreground">{formatWorkoutLogValue(item.log ?? {})}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PtSessionDetailDialog({
  session,
  open,
  onOpenChange,
}: {
  session: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const logs = session?.logs ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card p-0 text-foreground sm:max-w-2xl">
        {session ? (
          <div className="p-5">
            <DialogHeader>
              <DialogTitle>{session.title || session.sessionName || "PT 운동 기록"}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                {formatShortDate(session.workoutDate ?? session.createdAt)}
              </div>
            </DialogHeader>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-accent/50 p-3">
                <div className="text-base font-bold text-foreground">{Number(session.durationMinutes) || 0}</div>
                <div className="text-[11px] text-muted-foreground">진행 시간(분)</div>
              </div>
              <div className="rounded-lg bg-accent/50 p-3">
                <div className="text-base font-bold text-foreground">{logs.length}</div>
                <div className="text-[11px] text-muted-foreground">기록 세트</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-base font-bold text-primary">{Math.round(Number(session.totalVolume) || 0).toLocaleString()}</div>
                <div className="text-[11px] text-muted-foreground">볼륨 kg</div>
              </div>
            </div>
            {session.notes ? (
              <div className="mt-4 rounded-xl border border-border bg-accent/25 p-3">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">트레이너 메모</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{session.notes}</p>
              </div>
            ) : null}
            <div className="mt-4">
              <WorkoutLogDetailList logs={logs} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function makeSets(count: number, existing: PtSet[] = []) {
  const lastExisting = existing[existing.length - 1];
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weightKg: existing[index]?.weightKg ?? lastExisting?.weightKg ?? "",
    reps: existing[index]?.reps ?? lastExisting?.reps ?? "",
  }));
}

function inputMode(exercise: any) {
  if (exercise?.category === "cardio" || exercise?.bodyPart === "cardio")
    return "cardio";
  if (
    exercise?.category === "flexibility" ||
    exercise?.bodyPart === "stretching"
  )
    return "duration";
  return "strength";
}

function estimatePtExerciseDuration(item: PtExercise) {
  const mode = inputMode(item.exercise);
  if (mode === "strength") {
    return Math.ceil(item.sets.filter(set => set.weightKg.trim() || set.reps.trim()).length * 4);
  }
  return Number(item.durationMinutes) || 0;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = dataUrl;
  });
}

async function prepareImageDataUrl(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

type TrainerClientView =
  | "workouts"
  | "timeline"
  | "tasks"
  | "notes"
  | "report"
  | "ai-helper"
  | "pt-sessions";

const viewCopy: Record<
  TrainerClientView,
  { title: string; description: string }
> = {
  workouts: {
    title: "회원 운동 기록",
    description: "연결된 회원의 운동 기록을 확인하고 세션별 피드백을 남기세요",
  },
  timeline: {
    title: "코칭 타임라인",
    description:
      "회원과 주고받은 피드백, 답글, 과제, PT 기록 흐름을 확인하세요",
  },
  tasks: {
    title: "회원 과제",
    description: "회원에게 수행 과제를 등록하고 완료 상태를 관리하세요",
  },
  notes: {
    title: "비공개 메모",
    description:
      "통증, 자세 습관, 상담 내용처럼 트레이너만 보는 메모를 관리하세요",
  },
  report: {
    title: "진행 리포트",
    description: "최근 4주 운동량과 미완료 과제 상태를 요약해서 확인하세요",
  },
  "ai-helper": {
    title: "AI 코칭 보조",
    description: "최근 운동, 과제, 메모를 바탕으로 피드백 초안을 만드세요",
  },
  "pt-sessions": {
    title: "PT 기록",
    description: "트레이너가 남긴 PT 진행 기록과 피드백 기록을 확인하세요",
  },
};

function normalizeTrainerClientView(value?: string): TrainerClientView | null {
  if (
    value === "timeline" ||
    value === "tasks" ||
    value === "notes" ||
    value === "report" ||
    value === "ai-helper" ||
    value === "pt-sessions"
  ) {
    return value;
  }
  return null;
}

function readTrainerClientView(pathView?: string, location = ""): TrainerClientView {
  const routeView = normalizeTrainerClientView(pathView);
  if (routeView) return routeView;
  if (typeof window === "undefined") return "workouts";
  const hash = window.location.hash.replace(/^#/, "");
  const hashView = normalizeTrainerClientView(hash);
  if (hashView) return hashView;
  const pathViewFromLocation = location.split("#")[0].split("/").filter(Boolean).at(-1);
  const locationView = normalizeTrainerClientView(pathViewFromLocation);
  if (locationView) return locationView;
  return "workouts";
}

export default function TrainerClientDetail() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [, detailParams] = useRoute("/trainer/clients/:id/:view");
  const [, baseParams] = useRoute("/trainer/clients/:id");
  const params = detailParams ?? baseParams;
  const clientUserId = Number(params?.id ?? 0);
  const activeView = readTrainerClientView((detailParams as any)?.view, location);
  const activeViewCopy = viewCopy[activeView];
  const utils = trpc.useUtils();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ptOpen, setPtOpen] = useState(false);
  const [ptTitle, setPtTitle] = useState("PT 운동 기록");
  const [ptDate, setPtDate] = useState(todayValue());
  const [ptDatePickerOpen, setPtDatePickerOpen] = useState(false);
  const [ptDuration, setPtDuration] = useState("60");
  const [ptNotes, setPtNotes] = useState("");
  const [ptFeedback, setPtFeedback] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<PtExercise[]>([]);
  const [selectedPtSession, setSelectedPtSession] = useState<any | null>(null);
  const [captureMessage, setCaptureMessage] = useState("");
  const { data, isLoading } = trpc.trainer.clientDetail.useQuery(
    { clientUserId, limit: 20 },
    { enabled: Number.isFinite(clientUserId) && clientUserId > 0 }
  );
  const { data: exercises, isFetching: exercisesFetching } =
    trpc.exercises.list.useQuery(
      { search: exerciseSearch || undefined },
      { enabled: ptOpen, staleTime: 1000 * 60 * 5 }
    );
  const parseWorkoutCapture = trpc.ai.parseWorkoutCapture.useMutation();
  const createPtRecord = trpc.trainer.createPtRecord.useMutation({
    onSuccess: () => {
      toast.success("회원 PT 기록을 저장했습니다.");
      setPtOpen(false);
      setSelectedExercises([]);
      setPtNotes("");
      setPtFeedback("");
      setCaptureMessage("");
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
      utils.trainer.status.invalidate();
    },
    onError: error =>
      toast.error(error.message || "PT 기록 저장에 실패했습니다."),
  });
  const feedbackMutation = trpc.trainer.addFeedback.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("피드백을 남겼습니다.");
      setDrafts(items => ({
        ...items,
        [variables.sessionId ? `s-${variables.sessionId}` : "general"]: "",
      }));
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: error =>
      toast.error(error.message || "피드백 저장에 실패했습니다."),
  });
  const addCommentMutation = trpc.trainer.addComment.useMutation({
    onSuccess: () => {
      toast.success("코칭 답글을 남겼습니다.");
      setCommentDraft("");
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: error => toast.error(error.message || "답글 저장에 실패했습니다."),
  });
  const addTaskMutation = trpc.trainer.addTask.useMutation({
    onSuccess: () => {
      toast.success("회원 과제를 등록했습니다.");
      setTaskTitle("");
      setTaskDescription("");
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: error => toast.error(error.message || "과제 등록에 실패했습니다."),
  });
  const updateTaskStatusMutation = trpc.trainer.updateTaskStatus.useMutation({
    onSuccess: () => {
      toast.success("과제 상태를 변경했습니다.");
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: error =>
      toast.error(error.message || "과제 상태 변경에 실패했습니다."),
  });
  const savePrivateNoteMutation = trpc.trainer.savePrivateNote.useMutation({
    onSuccess: () => {
      toast.success("회원 메모를 저장했습니다.");
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: error =>
      toast.error(error.message || "회원 메모 저장에 실패했습니다."),
  });
  const aiFeedbackDraftMutation = trpc.trainer.aiFeedbackDraft.useMutation({
    onSuccess: result => {
      setDrafts(items => ({ ...items, general: result.draft || "" }));
      toast.success("AI 피드백 초안을 만들었습니다.");
    },
    onError: error =>
      toast.error(error.message || "AI 초안 생성에 실패했습니다."),
  });

  const addFeedback = (key: string, sessionId?: number) => {
    const message = drafts[key]?.trim();
    if (!message) return;
    feedbackMutation.mutate({ clientUserId, sessionId, message });
  };

  const availableExercises = useMemo(() => {
    const selectedIds = new Set(
      selectedExercises.map(item => item.exercise.id)
    );
    return (exercises ?? [])
      .filter((exercise: any) => !selectedIds.has(exercise.id))
      .slice(0, 12);
  }, [exercises, selectedExercises]);

  useEffect(() => {
    setPrivateNote(data?.privateNote?.note ?? "");
  }, [data?.privateNote?.note]);

  useEffect(() => {
    if (activeView !== "workouts" && activeView !== "pt-sessions") {
      setPtOpen(false);
    }
  }, [activeView]);

  const timeline = useMemo(() => {
    const feedback = (data?.feedback ?? []).map((item: any) => ({
      type: "피드백",
      date: item.createdAt,
      title: item.message,
    }));
    const ptSessions = (data?.ptSessions ?? []).map((item: any) => ({
      type: "PT",
      date: item.createdAt,
      title: item.title || item.sessionName || "PT 기록",
      source: item,
    }));
    const comments = (data?.comments ?? []).map((item: any) => ({
      type: item.authorUserId === clientUserId ? "회원 답글" : "트레이너 답글",
      date: item.createdAt,
      title: item.message,
    }));
    const tasks = (data?.tasks ?? []).map((item: any) => ({
      type: item.status === "done" ? "완료 과제" : "과제",
      date: item.updatedAt ?? item.createdAt,
      title: item.title,
    }));
    return [...feedback, ...ptSessions, ...comments, ...tasks]
      .sort(
        (a, b) =>
          new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      )
      .slice(0, 20);
  }, [clientUserId, data]);

  const addPtExercise = (exercise: any, seed?: Partial<PtExercise>) => {
    setSelectedExercises(items => {
      if (items.some(item => item.exercise.id === exercise.id)) return items;
      const mode = inputMode(exercise);
      return [
        ...items,
        {
          exercise,
          sets: seed?.sets?.length
            ? seed.sets
            : mode === "strength"
              ? makeSets(3)
              : makeSets(1),
          durationMinutes:
            seed?.durationMinutes ?? (mode === "strength" ? "" : "20"),
          distanceKm: seed?.distanceKm ?? "",
        },
      ];
    });
    setExerciseSearch("");
  };

  const updatePtSet = (
    exerciseId: number,
    setNumber: number,
    field: "weightKg" | "reps",
    value: string
  ) => {
    setSelectedExercises(items =>
      items.map(item =>
        item.exercise.id === exerciseId
          ? {
              ...item,
              sets: item.sets.map(set =>
                set.setNumber >= setNumber ? { ...set, [field]: value } : set
              ),
            }
          : item
      )
    );
  };

  const updatePtSetCount = (exerciseId: number, count: number) => {
    if (count < 1) return;
    setSelectedExercises(items =>
      items.map(item =>
        item.exercise.id === exerciseId
          ? { ...item, sets: makeSets(count, item.sets) }
          : item
      )
    );
  };

  const removePtExercise = (exerciseId: number) => {
    setSelectedExercises(items =>
      items.filter(item => item.exercise.id !== exerciseId)
    );
  };

  const handleCaptureUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드해주세요.");
      return;
    }
    try {
      setCaptureMessage("이미지를 분석 중입니다.");
      const imageDataUrl = await prepareImageDataUrl(file);
      const result = await parseWorkoutCapture.mutateAsync({ imageDataUrl });
      if (result.workoutDate) setPtDate(result.workoutDate);
      const parsedItems = result.exercises.map((item: any) => {
        const mode = inputMode(item.exercise);
        const sets =
          Array.isArray(item.sets) && item.sets.length
            ? item.sets
            : [{ setNumber: 1 }];
        return {
          exercise: item.exercise,
          sets:
            mode === "strength"
              ? makeSets(sets.length).map((set, index) => ({
                  ...set,
                  weightKg: sets[index]?.weightKg
                    ? String(sets[index].weightKg)
                    : "",
                  reps: sets[index]?.reps ? String(sets[index].reps) : "",
                }))
              : makeSets(1),
          durationMinutes:
            mode === "strength"
              ? ""
              : String(item.durationMinutes || sets[0]?.durationMinutes || 20),
          distanceKm: item.distanceKm ? String(item.distanceKm) : "",
        };
      });
      setSelectedExercises(items => {
        const existingIds = new Set(items.map(item => item.exercise.id));
        return [
          ...items,
          ...parsedItems.filter(
            (item: PtExercise) => !existingIds.has(item.exercise.id)
          ),
        ];
      });
      const added = parsedItems.length;
      setCaptureMessage(
        `이미지에서 ${added}개 운동을 불러왔습니다. 저장 전 값만 확인해주세요.`
      );
      toast.success(`이미지에서 ${added}개 운동을 추가했습니다.`);
    } catch (error: any) {
      setCaptureMessage(
        "이미지 분석에 실패했습니다. 더 선명한 캡처로 다시 시도해주세요."
      );
      toast.error(error?.message || "이미지 분석에 실패했습니다.");
    }
  };

  const savePtRecord = () => {
    const logs: PtLogInput[] = selectedExercises.flatMap(
      (item): PtLogInput[] => {
        const mode = inputMode(item.exercise);
        if (mode === "strength") {
          return item.sets
            .filter(set => set.weightKg.trim() || set.reps.trim())
            .map(set => ({
              exerciseId: Number(item.exercise.id),
              setNumber: set.setNumber,
              weightKg: set.weightKg.trim() ? Number(set.weightKg) : undefined,
              reps: set.reps.trim() ? Number(set.reps) : undefined,
            }));
        }
        const minutes = Number(item.durationMinutes) || 0;
        if (!minutes) return [];
        return [
          {
            exerciseId: Number(item.exercise.id),
            setNumber: 1,
            durationSeconds: Math.round(minutes * 60),
            distanceM: item.distanceKm.trim()
              ? Number(item.distanceKm) * 1000
              : undefined,
          },
        ];
      }
    );
    if (!logs.length) {
      toast.error("저장할 운동 기록을 입력해주세요.");
      return;
    }
    const estimatedDuration = selectedExercises.reduce(
      (sum, item) => sum + estimatePtExerciseDuration(item),
      0
    );
    createPtRecord.mutate({
      clientUserId,
      title: ptTitle.trim() || "PT 운동 기록",
      workoutDate: new Date(`${ptDate}T12:00:00`),
      durationMinutes: Math.max(0, Number(ptDuration) || 0, estimatedDuration),
      notes: ptNotes,
      feedbackMessage: ptFeedback,
      logs,
    });
  };

  return (
    <div className="page-shell page-shell-narrow max-w-full animate-fade-in">
      <PtSessionDetailDialog
        session={selectedPtSession}
        open={Boolean(selectedPtSession)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedPtSession(null);
        }}
      />
      <div className="page-header">
        <Link
          href="/profile"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} />
          프로필로 돌아가기
        </Link>
        <h1 className="page-title">{activeViewCopy.title}</h1>
        <p className="page-description">{activeViewCopy.description}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="min-w-0 space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0 border border-primary/30 bg-primary/10">
                  {data?.client?.profileImageUrl ? (
                    <AvatarImage
                      src={data.client.profileImageUrl}
                      alt={`${data.client.name ?? "회원"} 프로필`}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {clientInitial(data?.client)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <User size={15} className="shrink-0 text-primary" />
                    <h2 className="truncate text-lg font-bold text-foreground">
                      {data?.client?.name ?? "회원"}
                    </h2>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {data?.client?.email ?? ""}
                  </p>
                </div>
              </div>
              {(activeView === "workouts" || activeView === "pt-sessions") && (
                <Button
                  className="w-full bg-primary text-primary-foreground sm:ml-auto sm:w-auto sm:shrink-0"
                  onClick={() => setPtOpen(open => !open)}
                >
                  <Plus size={14} />
                  PT 기록 추가
                  <ChevronDown
                    size={14}
                    className={
                      ptOpen
                        ? "rotate-180 transition-transform"
                        : "transition-transform"
                    }
                  />
                </Button>
              )}
            </CardContent>
          </Card>

          {ptOpen && (activeView === "workouts" || activeView === "pt-sessions") && (
            <Card className="border-primary/20 bg-card">
              <CardContent className="space-y-4 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      PT 제목
                    </Label>
                    <Input
                      value={ptTitle}
                      onChange={event => setPtTitle(event.target.value)}
                      className="border-border bg-accent text-foreground"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      진행 날짜
                    </Label>
                    <Popover
                      open={ptDatePickerOpen}
                      onOpenChange={setPtDatePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between border-border bg-accent px-3 font-normal text-foreground hover:bg-accent/80 hover:text-foreground"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">
                              {formatDateLabel(ptDate)}
                            </span>
                          </span>
                          <ChevronDown
                            size={15}
                            className="shrink-0 text-muted-foreground"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto border-border bg-popover p-0 text-popover-foreground"
                      >
                        <Calendar
                          mode="single"
                          selected={parseDateInputValue(ptDate)}
                          onSelect={date => {
                            if (!date) return;
                            setPtDate(toDateInputValue(date));
                            setPtDatePickerOpen(false);
                          }}
                          buttonVariant="ghost"
                          className="rounded-md"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      진행 시간
                    </Label>
                    <Input
                      type="number"
                      value={ptDuration}
                      onChange={event => setPtDuration(event.target.value)}
                      className="border-border bg-accent text-foreground"
                      min={0}
                      max={1440}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-accent/30 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 sm:flex-row sm:p-4">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    {parseWorkoutCapture.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ImagePlus size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">
                      이미지로 운동 기록 불러오기
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      회원이 보낸 운동 기록 캡처나 PT 중 기록한 화면을 올리면
                      운동, 세트, 무게, 횟수를 채웁니다.
                    </p>
                    {captureMessage ? (
                      <p className="mt-2 text-sm text-primary">
                        {captureMessage}
                      </p>
                    ) : null}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={parseWorkoutCapture.isPending}
                    onChange={event => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      handleCaptureUpload(file);
                    }}
                  />
                </label>

                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      운동 검색
                    </Label>
                    <div className="relative">
                      <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        value={exerciseSearch}
                        onChange={event =>
                          setExerciseSearch(event.target.value)
                        }
                        placeholder="운동 이름 검색..."
                        className="border-border bg-accent pl-9 text-foreground"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background sm:max-h-72">
                      {exercisesFetching ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          운동을 불러오는 중...
                        </div>
                      ) : availableExercises.length ? (
                        availableExercises.map((exercise: any) => (
                          <button
                            key={exercise.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent"
                            onClick={() => addPtExercise(exercise)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {exercise.nameKo}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {exercise.name}
                              </span>
                            </span>
                            <Plus size={15} className="shrink-0 text-primary" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3">
                    {selectedExercises.length ? (
                      selectedExercises.map(item => {
                        const mode = inputMode(item.exercise);
                        return (
                          <div
                            key={item.exercise.id}
                            className="min-w-0 rounded-xl border border-border bg-accent/25 p-3"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">
                                  {item.exercise.nameKo}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.exercise.name}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  removePtExercise(item.exercise.id)
                                }
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                            {mode === "strength" ? (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">
                                    세트 수
                                  </Label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-border bg-background"
                                    onClick={() =>
                                      updatePtSetCount(
                                        item.exercise.id,
                                        item.sets.length - 1
                                      )
                                    }
                                  >
                                    -
                                  </Button>
                                  <span className="w-10 text-center text-sm font-semibold">
                                    {item.sets.length}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-border bg-background text-primary"
                                    onClick={() =>
                                      updatePtSetCount(
                                        item.exercise.id,
                                        item.sets.length + 1
                                      )
                                    }
                                  >
                                    +
                                  </Button>
                                </div>
                                {item.sets.map(set => (
                                  <div
                                    key={set.setNumber}
                                    className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2"
                                  >
                                    <span className="text-xs text-muted-foreground">
                                      {set.setNumber}세트
                                    </span>
                                    <Input
                                      inputMode="decimal"
                                      value={set.weightKg}
                                      onChange={event =>
                                        updatePtSet(
                                          item.exercise.id,
                                          set.setNumber,
                                          "weightKg",
                                          event.target.value
                                        )
                                      }
                                      placeholder="kg"
                                      className="h-9 min-w-0 border-border bg-background text-center text-foreground"
                                    />
                                    <Input
                                      inputMode="numeric"
                                      value={set.reps}
                                      onChange={event =>
                                        updatePtSet(
                                          item.exercise.id,
                                          set.setNumber,
                                          "reps",
                                          event.target.value
                                        )
                                      }
                                      placeholder="회"
                                      className="h-9 min-w-0 border-border bg-background text-center text-foreground"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">
                                    시간
                                  </Label>
                                  <Input
                                    inputMode="numeric"
                                    value={item.durationMinutes}
                                    onChange={event =>
                                      setSelectedExercises(items =>
                                        items.map(entry =>
                                          entry.exercise.id === item.exercise.id
                                            ? {
                                                ...entry,
                                                durationMinutes:
                                                  event.target.value,
                                              }
                                            : entry
                                        )
                                      )
                                    }
                                    placeholder="분"
                                    className="border-border bg-background text-foreground"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">
                                    거리 선택
                                  </Label>
                                  <Input
                                    inputMode="decimal"
                                    value={item.distanceKm}
                                    onChange={event =>
                                      setSelectedExercises(items =>
                                        items.map(entry =>
                                          entry.exercise.id === item.exercise.id
                                            ? {
                                                ...entry,
                                                distanceKm: event.target.value,
                                              }
                                            : entry
                                        )
                                      )
                                    }
                                    placeholder="km"
                                    className="border-border bg-background text-foreground"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-border bg-accent/20 p-6 text-center text-sm text-muted-foreground">
                        이미지로 불러오거나 왼쪽에서 운동을 추가하세요.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      PT 메모
                    </Label>
                    <Textarea
                      value={ptNotes}
                      onChange={event => setPtNotes(event.target.value)}
                      placeholder="진행한 PT 내용, 컨디션, 다음 회차 참고사항"
                      className="min-h-24 resize-none border-border bg-accent text-foreground"
                      maxLength={800}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      회원에게 남길 피드백
                    </Label>
                    <Textarea
                      value={ptFeedback}
                      onChange={event => setPtFeedback(event.target.value)}
                      placeholder="회원에게 보일 피드백을 함께 남길 수 있습니다."
                      className="min-h-24 resize-none border-border bg-accent text-foreground"
                      maxLength={1200}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-border bg-background sm:w-auto"
                    onClick={() => setPtOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    className="w-full bg-primary text-primary-foreground sm:w-auto"
                    disabled={
                      createPtRecord.isPending || parseWorkoutCapture.isPending
                    }
                    onClick={savePtRecord}
                  >
                    {createPtRecord.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    회원 PT 기록 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === "workouts" &&
            (!data?.sessions?.length ? (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  아직 확인할 운동 기록이 없습니다.
                </CardContent>
              </Card>
            ) : (
              data.sessions.map((session: any) => {
                const key = `s-${session.id}`;
                const logs = session.logs ?? [];
                const volume = logs.reduce(
                  (sum: number, item: any) =>
                    sum +
                    (Number(item.log?.weightKg) || 0) *
                      (Number(item.log?.reps) || 0),
                  0
                );
                return (
                  <Card key={session.id} className="border-border bg-card">
                    <CardContent className="p-3 sm:p-4">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="font-semibold text-foreground">
                            {session.name || "운동 세션"}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              session.workoutDate ?? session.startedAt
                            ).toLocaleDateString("ko-KR")}{" "}
                            · {logs.length}세트 ·{" "}
                            {Math.round(volume).toLocaleString()}kg
                          </p>
                        </div>
                        {session.durationMinutes ? (
                          <span className="text-xs text-muted-foreground">
                            {session.durationMinutes}분
                          </span>
                        ) : null}
                      </div>
                      <div className="mb-3 space-y-1.5">
                        {logs.slice(0, 8).map((item: any) => (
                          <div
                            key={item.log.id}
                            className="rounded-lg bg-accent/40 px-3 py-2 text-sm text-foreground"
                          >
                            {item.exercise?.nameKo} ·{" "}
                            {item.log.weightKg ? `${item.log.weightKg}kg ` : ""}
                            {item.log.reps
                              ? `${item.log.reps}회`
                              : item.log.durationSeconds
                                ? `${Math.round(item.log.durationSeconds / 60)}분`
                                : ""}
                          </div>
                        ))}
                      </div>
                      <Textarea
                        value={drafts[key] ?? ""}
                        onChange={event =>
                          setDrafts(items => ({
                            ...items,
                            [key]: event.target.value,
                          }))
                        }
                        placeholder="이 세션에 대한 피드백을 남겨주세요."
                        className="min-h-20 resize-none border-border bg-accent text-foreground"
                        maxLength={1200}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          className="w-full bg-primary text-primary-foreground sm:w-auto"
                          disabled={
                            !drafts[key]?.trim() || feedbackMutation.isPending
                          }
                          onClick={() => addFeedback(key, session.id)}
                        >
                          <MessageSquare size={14} />
                          세션 피드백
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ))}

          {activeView === "timeline" && (
            <Card
              id="timeline"
              className="h-fit scroll-mt-24 border-border bg-card"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <CalendarDays size={16} className="text-primary" />
                  코칭 타임라인
                </h2>
                {timeline.length ? (
                  <div className="space-y-2">
                    {timeline.map((item: any, index: number) => {
                      const content = (
                        <>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {item.type}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(item.date).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">
                            {item.title}
                          </p>
                          {item.source?.logs?.length ? (
                            <div className="mt-2 space-y-1">
                              {item.source.logs.slice(0, 3).map((entry: any, logIndex: number) => (
                                <div key={entry.log?.id ?? logIndex} className="flex items-center justify-between gap-2 rounded-md bg-background/45 px-2 py-1 text-xs">
                                  <span className="truncate text-muted-foreground">{entry.exercise?.nameKo ?? entry.exercise?.name ?? "운동"}</span>
                                  <span className="shrink-0 text-foreground">{formatWorkoutLogValue(entry.log ?? {})}</span>
                                </div>
                              ))}
                              {item.source.logs.length > 3 ? (
                                <div className="text-xs text-muted-foreground">외 {item.source.logs.length - 3}개 세트</div>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      );

                      return item.source ? (
                        <button
                          type="button"
                          key={`${item.type}-${index}`}
                          className="w-full rounded-lg border border-border bg-accent/30 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
                          onClick={() => setSelectedPtSession(item.source)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={`${item.type}-${index}`}
                          className="rounded-lg border border-border bg-accent/30 p-3"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-accent/20 p-3 text-sm text-muted-foreground">
                    아직 코칭 타임라인이 없습니다.
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={commentDraft}
                    onChange={event => setCommentDraft(event.target.value)}
                    placeholder="회원에게 남길 짧은 답글이나 확인 메시지"
                    className="min-h-20 resize-none border-border bg-accent text-foreground"
                    maxLength={1200}
                  />
                  <Button
                    type="button"
                    className="w-full bg-primary text-primary-foreground"
                    disabled={
                      !commentDraft.trim() ||
                      addCommentMutation.isPending ||
                      !user?.id
                    }
                    onClick={() =>
                      addCommentMutation.mutate({
                        trainerUserId: Number(user?.id),
                        clientUserId,
                        targetType: "general",
                        message: commentDraft,
                      })
                    }
                  >
                    <MessageSquare size={14} />
                    답글 남기기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === "tasks" && (
            <Card
              id="tasks"
              className="h-fit scroll-mt-24 border-border bg-card"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <CheckSquare size={16} className="text-primary" />
                  회원 과제
                </h2>
                <div className="space-y-2">
                  <Input
                    value={taskTitle}
                    onChange={event => setTaskTitle(event.target.value)}
                    placeholder="예: 이번 주 유산소 2회"
                    className="border-border bg-accent text-foreground"
                    maxLength={200}
                  />
                  <Textarea
                    value={taskDescription}
                    onChange={event => setTaskDescription(event.target.value)}
                    placeholder="과제 설명, 수행 기준, 주의사항"
                    className="min-h-20 resize-none border-border bg-accent text-foreground"
                    maxLength={1000}
                  />
                  <Button
                    type="button"
                    className="w-full bg-primary text-primary-foreground"
                    disabled={!taskTitle.trim() || addTaskMutation.isPending}
                    onClick={() =>
                      addTaskMutation.mutate({
                        clientUserId,
                        title: taskTitle,
                        description: taskDescription,
                      })
                    }
                  >
                    <Plus size={14} />
                    과제 등록
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {data?.tasks?.length ? (
                    data.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border bg-accent/30 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">
                              {task.title}
                            </div>
                            {task.description ? (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {task.description}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 border-border bg-background text-xs"
                            disabled={updateTaskStatusMutation.isPending}
                            onClick={() =>
                              updateTaskStatusMutation.mutate({
                                taskId: Number(task.id),
                                status:
                                  task.status === "done" ? "open" : "done",
                              })
                            }
                          >
                            {task.status === "done" ? "완료됨" : "완료"}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-accent/20 p-3 text-sm text-muted-foreground">
                      아직 등록한 과제가 없습니다.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === "notes" && (
            <Card
              id="notes"
              className="h-fit scroll-mt-24 border-border bg-card"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <FileText size={16} className="text-primary" />
                  트레이너 비공개 메모
                </h2>
                <Textarea
                  value={privateNote}
                  onChange={event => setPrivateNote(event.target.value)}
                  placeholder="통증, 자세 습관, 선호 운동, 상담 내용 등 트레이너만 보는 메모"
                  className="min-h-28 resize-none border-border bg-accent text-foreground"
                  maxLength={2000}
                />
                <Button
                  type="button"
                  className="mt-2 w-full bg-primary text-primary-foreground"
                  disabled={savePrivateNoteMutation.isPending}
                  onClick={() =>
                    savePrivateNoteMutation.mutate({
                      clientUserId,
                      note: privateNote,
                    })
                  }
                >
                  메모 저장
                </Button>
              </CardContent>
            </Card>
          )}

          {activeView === "report" && (
            <Card
              id="report"
              className="h-fit scroll-mt-24 border-border bg-card"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-3 font-semibold text-foreground">
                  회원 진행 리포트
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-accent/40 p-3">
                    <div className="text-lg font-bold text-foreground">
                      {data?.report?.sessionCount ?? 0}회
                    </div>
                    <div className="text-xs text-muted-foreground">
                      최근 4주 운동
                    </div>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-3">
                    <div className="text-lg font-bold text-primary">
                      {Math.round(
                        data?.report?.totalVolume ?? 0
                      ).toLocaleString()}
                      kg
                    </div>
                    <div className="text-xs text-muted-foreground">
                      최근 4주 볼륨
                    </div>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-3">
                    <div className="text-lg font-bold text-foreground">
                      {data?.report?.totalDurationMinutes ?? 0}분
                    </div>
                    <div className="text-xs text-muted-foreground">
                      운동 시간
                    </div>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-3">
                    <div className="text-lg font-bold text-orange-300">
                      {data?.report?.openTasks ?? 0}개
                    </div>
                    <div className="text-xs text-muted-foreground">
                      미완료 과제
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === "ai-helper" && (
            <Card
              id="ai-helper"
              className="h-fit scroll-mt-24 border-primary/20 bg-primary/5"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Bot size={16} className="text-primary" />
                  AI 코칭 보조
                </h2>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  최근 운동, 과제, 메모를 바탕으로 회원에게 보낼 피드백 초안을
                  만듭니다.
                </p>
                <Button
                  type="button"
                  className="w-full bg-primary text-primary-foreground"
                  disabled={aiFeedbackDraftMutation.isPending}
                  onClick={() =>
                    aiFeedbackDraftMutation.mutate({
                      clientUserId,
                      context: privateNote,
                    })
                  }
                >
                  {aiFeedbackDraftMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Bot size={14} />
                  )}
                  피드백 초안 생성
                </Button>
                <Textarea
                  value={drafts.general ?? ""}
                  onChange={event =>
                    setDrafts(items => ({
                      ...items,
                      general: event.target.value,
                    }))
                  }
                  placeholder="AI 초안 또는 일반 피드백을 작성하세요."
                  className="mt-3 min-h-28 resize-none border-border bg-background text-foreground"
                  maxLength={1200}
                />
                <Button
                  className="mt-2 w-full bg-primary text-primary-foreground"
                  disabled={
                    !drafts.general?.trim() || feedbackMutation.isPending
                  }
                  onClick={() => addFeedback("general")}
                >
                  <MessageSquare size={14} />
                  일반 피드백 저장
                </Button>
              </CardContent>
            </Card>
          )}

          {activeView === "pt-sessions" && (
            <Card
              id="pt-sessions"
              className="h-fit scroll-mt-24 border-border bg-card"
            >
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-3 font-semibold text-foreground">
                  PT 진행 기록
                </h2>
                {data?.ptSessions?.length ? (
                  <div className="mb-5 space-y-2">
                    {data.ptSessions.map((item: any) => (
                      <button
                        type="button"
                        key={item.id}
                        className="w-full rounded-lg border border-border bg-accent/30 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
                        onClick={() => setSelectedPtSession(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {item.title || item.sessionName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                item.workoutDate ?? item.createdAt
                              ).toLocaleDateString("ko-KR")}
                              {item.durationMinutes
                                ? ` · ${item.durationMinutes}분`
                                : ""}
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs text-primary">
                            {Math.round(item.totalVolume ?? 0).toLocaleString()}
                            kg
                          </div>
                        </div>
                        {item.notes ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}
                        {item.logs?.length ? (
                          <div className="mt-3 space-y-1.5">
                            {item.logs.slice(0, 4).map((entry: any, logIndex: number) => (
                              <div key={entry.log?.id ?? logIndex} className="flex items-center justify-between gap-2 rounded-md bg-background/45 px-2.5 py-1.5 text-xs">
                                <span className="truncate text-muted-foreground">{entry.exercise?.nameKo ?? entry.exercise?.name ?? "운동"}</span>
                                <span className="shrink-0 text-foreground">{formatWorkoutLogValue(entry.log ?? {})}</span>
                              </div>
                            ))}
                            {item.logs.length > 4 ? (
                              <div className="text-xs text-muted-foreground">외 {item.logs.length - 4}개 세트</div>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                          <Eye size={12} />
                          상세 보기
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mb-5 rounded-lg border border-dashed border-border bg-accent/20 p-3 text-sm text-muted-foreground">
                    아직 트레이너가 남긴 PT 기록이 없습니다.
                  </p>
                )}
                <h2 className="mb-3 font-semibold text-foreground">
                  피드백 기록
                </h2>
                {data?.feedback?.length ? (
                  <div className="space-y-2">
                    {data.feedback.map((item: any) => (
                      <div
                        key={item.id}
                        className="rounded-lg bg-accent/40 p-3"
                      >
                        <div className="mb-1 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("ko-KR")}
                          {item.sessionId ? ` · 세션 #${item.sessionId}` : ""}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    아직 남긴 피드백이 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
