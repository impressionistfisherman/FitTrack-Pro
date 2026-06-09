import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CalendarDays, CheckSquare, Dumbbell, Eye, LogIn, MessageSquare, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function initial(person?: any) {
  return (person?.name || person?.email || "사용자").trim().slice(0, 1).toUpperCase();
}

function PersonAvatar({ person, className = "h-10 w-10" }: { person?: any; className?: string }) {
  return (
    <Avatar className={cn("shrink-0 border border-primary/25 bg-primary/10", className)}>
      {person?.profileImageUrl ? (
        <AvatarImage src={person.profileImageUrl} alt={`${person?.name ?? "사용자"} 프로필`} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
        {initial(person)}
      </AvatarFallback>
    </Avatar>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });
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
            {exerciseLogs.map((entry: any, index: number) => (
              <div
                key={entry.log?.id ?? `${exercise?.id ?? "exercise"}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/45 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{entry.log?.setNumber ?? index + 1}세트</span>
                <span className="font-medium text-foreground">{formatWorkoutLogValue(entry.log ?? {})}</span>
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
                {formatDate(session.workoutDate ?? session.createdAt)}
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
            {session.trainer ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-accent/25 p-3 text-sm text-muted-foreground">
                <PersonAvatar person={session.trainer} className="h-8 w-8" />
                <span>{session.trainer.name ?? "트레이너"}가 기록한 PT 세션</span>
              </div>
            ) : null}
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

export default function Coaching() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [trainerCodeInput, setTrainerCodeInput] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [selectedPtSession, setSelectedPtSession] = useState<any | null>(null);
  const { data: trainerStatus, isLoading } = trpc.trainer.status.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications } = trpc.trainer.notifications.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
  const markedReadRef = useRef(false);
  const markReadMutation = trpc.trainer.markCoachingRead.useMutation({
    onMutate: () => {
      utils.trainer.notifications.setData(undefined, (current: any) => current ? {
        ...current,
        feedback: 0,
        ptSessions: 0,
        comments: 0,
        tasks: 0,
        coachingUnreadCount: 0,
        unreadCount: Number(current.trainerUnreadCount ?? 0),
      } : current);
    },
    onSuccess: (summary: any) => {
      utils.trainer.notifications.setData(undefined, (current: any) => {
        const next = summary ?? current;
        if (!next && !current) return current;
        return {
          ...(current ?? {}),
          ...(next ?? {}),
          feedback: 0,
          ptSessions: 0,
          comments: 0,
          tasks: 0,
          coachingUnreadCount: 0,
          unreadCount: Number((next ?? current)?.trainerUnreadCount ?? 0),
        };
      });
      utils.trainer.status.invalidate();
    },
  });
  const registerTrainerMutation = trpc.trainer.registerTrainer.useMutation({
    onSuccess: () => {
      toast.success("트레이너에게 연결 요청을 보냈습니다.");
      setTrainerCodeInput("");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "트레이너 등록에 실패했습니다."),
  });
  const removeTrainerMutation = trpc.trainer.removeTrainer.useMutation({
    onSuccess: () => {
      toast.success("트레이너 연결을 해제했습니다.");
      utils.trainer.status.invalidate();
    },
    onError: () => toast.error("트레이너 연결 해제에 실패했습니다."),
  });
  const addCommentMutation = trpc.trainer.addComment.useMutation({
    onSuccess: () => {
      toast.success("트레이너에게 메시지를 남겼습니다.");
      setCommentDraft("");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "메시지 저장에 실패했습니다."),
  });
  const updateTaskStatusMutation = trpc.trainer.updateTaskStatus.useMutation({
    onSuccess: () => {
      toast.success("과제 상태를 업데이트했습니다.");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "과제 상태 변경에 실패했습니다."),
  });

  const coachingUnreadCount = Number((notifications as any)?.coachingUnreadCount ?? 0);

  useEffect(() => {
    if (!isAuthenticated || loading || markedReadRef.current || markReadMutation.isPending) return;
    markedReadRef.current = true;
    markReadMutation.mutate();
  }, [isAuthenticated, loading, markReadMutation]);

  if (loading || isLoading) {
    return (
      <div className="page-shell page-shell-wide space-y-4">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="h-72 skeleton rounded-2xl" />
          <div className="h-72 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center">
        <MessageSquare size={40} className="mb-4 text-muted-foreground opacity-30" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />
          로그인
        </Button>
      </div>
    );
  }

  const linkedTrainers = (trainerStatus as any)?.trainers ?? [];
  const pendingTrainers = (trainerStatus as any)?.pendingTrainers ?? [];
  const feedback = (trainerStatus as any)?.feedback ?? [];
  const ptSessions = (trainerStatus as any)?.ptSessions ?? [];
  const comments = (trainerStatus as any)?.comments ?? [];
  const tasks = (trainerStatus as any)?.tasks ?? [];
  const appRole = (trainerStatus as any)?.appRole ?? (user as any)?.appRole ?? "user";
  const trainerLabel = appRole === "trainer" ? "상위 트레이너" : "트레이너";
  const primaryTrainer = linkedTrainers[0]?.trainer;
  const timeline = [
    ...feedback.map((item: any) => ({ type: "피드백", title: item.message, date: item.createdAt, person: item.trainer })),
    ...ptSessions.map((item: any) => ({ type: "PT", title: item.title || item.sessionName || "PT 기록", date: item.createdAt, person: item.trainer })),
    ...comments.map((item: any) => ({ type: "답글", title: item.message, date: item.createdAt, person: item.author })),
    ...tasks.map((item: any) => ({ type: item.status === "done" ? "완료 과제" : "과제", title: item.title, date: item.updatedAt ?? item.createdAt, person: null })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 12);

  return (
    <div className="page-shell page-shell-wide animate-fade-in">
      <PtSessionDetailDialog
        session={selectedPtSession}
        open={Boolean(selectedPtSession)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedPtSession(null);
        }}
      />
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">코칭 공간</h1>
          <p className="page-description">회원과 트레이너가 공유하는 피드백, PT 기록, 연결 상태를 확인하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {coachingUnreadCount > 0 ? (
            <Badge className="border border-primary/30 bg-primary/10 text-primary">
              새 코칭 {coachingUnreadCount}건 확인됨
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Users size={17} className="text-primary" />
                  내 {trainerLabel}
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">
                  연결 {linkedTrainers.length}명
                </Badge>
              </div>

              <div className="mb-4 rounded-xl border border-border bg-accent/30 p-3">
                <div className="mb-2 text-sm font-semibold text-foreground">{trainerLabel} 코드 등록</div>
                <div className="flex gap-2">
                  <Input
                    value={trainerCodeInput}
                    onChange={(event) => setTrainerCodeInput(event.target.value.toUpperCase())}
                    placeholder="예: FT-ABCDEFGH"
                    className="border-border bg-background text-foreground"
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
                  승인 후 {trainerLabel}가 내 운동 기록을 확인하고 피드백을 남길 수 있습니다.
                  {appRole === "trainer" ? " 트레이너도 상위 트레이너에게 코칭을 받을 수 있습니다." : ""}
                </p>
              </div>

              <div className="space-y-2">
                {linkedTrainers.map((item: any) => (
                  <div key={item.linkId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/25 p-3">
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

                {pendingTrainers.map((item: any) => (
                  <div key={item.linkId} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                    <div className="flex items-center gap-3">
                      <PersonAvatar person={item.trainer} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{item.trainer?.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.trainer?.email}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-yellow-200">트레이너 승인 대기 중입니다.</p>
                  </div>
                ))}

                {!linkedTrainers.length && !pendingTrainers.length ? (
                  <div className="rounded-xl border border-dashed border-border bg-accent/20 p-5 text-center text-sm leading-relaxed text-muted-foreground">
                    아직 연결된 {trainerLabel}가 없습니다. {trainerLabel} 코드를 등록하면 이곳에서 피드백과 PT 기록을 확인할 수 있습니다.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {linkedTrainers.length > 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                  <MessageSquare size={17} className="text-primary" />
                  {trainerLabel}에게 남기기
                </div>
                <Input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="컨디션, 통증, 수행 어려움, 요청사항을 남겨주세요."
                  className="border-border bg-background text-foreground"
                  maxLength={1200}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground"
                    disabled={!commentDraft.trim() || addCommentMutation.isPending || !primaryTrainer?.id}
                    onClick={() => addCommentMutation.mutate({
                      trainerUserId: Number(primaryTrainer.id),
                      clientUserId: Number(user?.id),
                      message: commentDraft,
                      targetType: "general",
                    })}
                  >
                    답글 남기기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <CalendarDays size={17} className="text-primary" />
                  코칭 타임라인
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">{timeline.length}개</Badge>
              </div>
              {timeline.length ? (
                <div className="space-y-2">
                  {timeline.map((item: any, index: number) => (
                    <div key={`${item.type}-${index}`} className="rounded-xl border border-border bg-accent/25 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge className="border border-primary/25 bg-primary/10 text-primary">{item.type}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-relaxed text-foreground">{item.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-5 text-center text-sm text-muted-foreground">
                  아직 코칭 타임라인이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <CheckSquare size={17} className="text-primary" />
                  트레이너 과제
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">{tasks.filter((task: any) => task.status !== "done").length}개 진행 중</Badge>
              </div>
              {tasks.length ? (
                <div className="space-y-2">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="rounded-xl border border-border bg-accent/25 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{task.title}</div>
                          {task.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p> : null}
                          {task.dueDate ? <p className="mt-1 text-xs text-muted-foreground">마감 {formatDate(task.dueDate)}</p> : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={task.status === "done" ? "outline" : "default"}
                          className={task.status === "done" ? "border-border bg-background" : "bg-primary text-primary-foreground"}
                          disabled={updateTaskStatusMutation.isPending}
                          onClick={() => updateTaskStatusMutation.mutate({ taskId: Number(task.id), status: task.status === "done" ? "open" : "done" })}
                        >
                          {task.status === "done" ? "완료됨" : "완료"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-5 text-center text-sm text-muted-foreground">
                  아직 받은 과제가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <MessageSquare size={17} className="text-primary" />
                  받은 피드백
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">{feedback.length}개</Badge>
              </div>
              {feedback.length ? (
                <div className="space-y-3">
                  {feedback.map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-border bg-accent/25 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar person={item.trainer} className="h-9 w-9" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{item.trainer?.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{item.trainer?.email}</div>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-5 text-center text-sm text-muted-foreground">
                  아직 받은 피드백이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Dumbbell size={17} className="text-primary" />
                  PT 진행 기록
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">{ptSessions.length}건</Badge>
              </div>
              {ptSessions.length ? (
                <div className="space-y-3">
                  {ptSessions.map((item: any) => (
                    <button
                      type="button"
                      key={item.id}
                      className="w-full rounded-xl border border-border bg-accent/25 p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
                      onClick={() => setSelectedPtSession(item)}
                    >
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{item.title || item.sessionName || "PT 운동 기록"}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatDate(item.workoutDate ?? item.createdAt)}
                            </span>
                            {item.durationMinutes ? <span>{item.durationMinutes}분</span> : null}
                            {item.totalVolume ? <span>{Math.round(item.totalVolume).toLocaleString()}kg</span> : null}
                          </div>
                        </div>
                        {item.trainer ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <PersonAvatar person={item.trainer} className="h-7 w-7" />
                            <span className="max-w-28 truncate">{item.trainer.name}</span>
                          </div>
                        ) : null}
                      </div>
                      {item.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.notes}</p> : null}
                      {item.logs?.length ? (
                        <div className="mt-3 space-y-2">
                          {item.logs.slice(0, 6).map((entry: any, index: number) => {
                            const exercise = entry.exercise ?? {};
                            const log = entry.log ?? {};
                            return (
                              <div key={`${item.id}-${log.id ?? index}`} className="rounded-lg border border-border/70 bg-background/45 px-3 py-2">
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">{exercise.nameKo ?? exercise.name ?? "운동"}</span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatWorkoutLogValue(log)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {item.logs.length > 6 ? (
                            <div className="text-xs text-muted-foreground">외 {item.logs.length - 6}개 세트</div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                        <Eye size={12} />
                        상세 보기
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-5 text-center text-sm text-muted-foreground">
                  아직 트레이너가 남긴 PT 진행 기록이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
