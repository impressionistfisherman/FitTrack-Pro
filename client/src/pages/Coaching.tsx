import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CalendarDays, CheckCircle2, CheckSquare, Dumbbell, LogIn, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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

export default function Coaching() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [trainerCodeInput, setTrainerCodeInput] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const { data: trainerStatus, isLoading } = trpc.trainer.status.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications } = trpc.trainer.notifications.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
  const markedReadRef = useRef(false);
  const markReadMutation = trpc.trainer.markCoachingRead.useMutation({
    onSuccess: () => utils.trainer.notifications.invalidate(),
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

  useEffect(() => {
    if (!isAuthenticated || loading || isLoading || markedReadRef.current) return;
    markedReadRef.current = true;
    markReadMutation.mutate();
  }, [isAuthenticated, isLoading, loading, markReadMutation]);

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

  const appRole = (trainerStatus as any)?.appRole ?? (user as any)?.appRole ?? "user";
  const linkedTrainers = (trainerStatus as any)?.trainers ?? [];
  const pendingTrainers = (trainerStatus as any)?.pendingTrainers ?? [];
  const feedback = (trainerStatus as any)?.feedback ?? [];
  const ptSessions = (trainerStatus as any)?.ptSessions ?? [];
  const comments = (trainerStatus as any)?.comments ?? [];
  const tasks = (trainerStatus as any)?.tasks ?? [];
  const clients = (trainerStatus as any)?.clients ?? [];
  const primaryTrainer = linkedTrainers[0]?.trainer;
  const timeline = [
    ...feedback.map((item: any) => ({ type: "피드백", title: item.message, date: item.createdAt, person: item.trainer })),
    ...ptSessions.map((item: any) => ({ type: "PT", title: item.title || item.sessionName || "PT 기록", date: item.createdAt, person: item.trainer })),
    ...comments.map((item: any) => ({ type: "답글", title: item.message, date: item.createdAt, person: item.author })),
    ...tasks.map((item: any) => ({ type: item.status === "done" ? "완료 과제" : "과제", title: item.title, date: item.updatedAt ?? item.createdAt, person: null })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 12);

  return (
    <div className="page-shell page-shell-wide animate-fade-in">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">코칭 공간</h1>
          <p className="page-description">회원과 트레이너가 공유하는 피드백, PT 기록, 연결 상태를 확인하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {notifications?.unreadCount ? (
            <Badge className="border border-primary/30 bg-primary/10 text-primary">
              새 코칭 {notifications.unreadCount}건 확인됨
            </Badge>
          ) : null}
          {appRole === "trainer" ? (
            <Button asChild className="w-fit bg-primary text-primary-foreground">
              <Link href="/trainer">
                <Users size={15} />
                트레이너 대시보드
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {appRole === "trainer" ? (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldCheck size={18} className="text-primary" />
                트레이너 계정
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                회원별 공유 화면은 담당 회원 상세에서 확인합니다. 회원은 이 코칭 공간에서 피드백과 PT 기록을 확인합니다.
              </p>
            </div>
            <Badge className="w-fit border border-primary/30 bg-primary/10 text-primary">담당 회원 {clients.length}명</Badge>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Users size={17} className="text-primary" />
                  내 트레이너
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">
                  연결 {linkedTrainers.length}명
                </Badge>
              </div>

              {appRole !== "trainer" ? (
                <div className="mb-4 rounded-xl border border-border bg-accent/30 p-3">
                  <div className="mb-2 text-sm font-semibold text-foreground">트레이너 코드 등록</div>
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
                    승인 후 트레이너가 운동 기록을 확인하고 피드백을 남길 수 있습니다.
                  </p>
                </div>
              ) : null}

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
                    {appRole !== "trainer" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={removeTrainerMutation.isPending}
                        onClick={() => removeTrainerMutation.mutate({ trainerUserId: Number(item.trainer?.id) })}
                      >
                        해제
                      </Button>
                    ) : null}
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
                    아직 연결된 트레이너가 없습니다. 트레이너 코드를 등록하면 이곳에서 피드백과 PT 기록을 확인할 수 있습니다.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {appRole !== "trainer" && linkedTrainers.length > 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                  <MessageSquare size={17} className="text-primary" />
                  트레이너에게 남기기
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
                    <div key={item.id} className="rounded-xl border border-border bg-accent/25 p-4">
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
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                        <CheckCircle2 size={12} />
                        트레이너가 기록한 PT 세션
                      </div>
                    </div>
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
