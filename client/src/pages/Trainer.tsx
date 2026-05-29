import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  Dumbbell,
  LogIn,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function userInitial(person?: any) {
  return (person?.name || person?.email || "회원").trim().slice(0, 1).toUpperCase();
}

function PersonAvatar({ person, className = "h-10 w-10" }: { person?: any; className?: string }) {
  return (
    <Avatar className={cn("shrink-0 border border-primary/25 bg-primary/10", className)}>
      {person?.profileImageUrl ? (
        <AvatarImage src={person.profileImageUrl} alt={`${person?.name ?? "회원"} 프로필`} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
        {userInitial(person)}
      </AvatarFallback>
    </Avatar>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function StatCard({ icon: Icon, label, value, tone = "primary" }: {
  icon: any;
  label: string;
  value: string | number;
  tone?: "primary" | "blue" | "orange";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-300",
    orange: "bg-orange-500/10 text-orange-300",
  }[tone];
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClass)}>
          <Icon size={18} />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Trainer() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>({});
  const { data: trainerStatus, isLoading } = trpc.trainer.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const issueTrainerCodeMutation = trpc.trainer.issueCode.useMutation({
    onSuccess: () => {
      toast.success("트레이너 코드를 확인했습니다.");
      utils.trainer.status.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message || "트레이너 코드 확인에 실패했습니다."),
  });

  const reviewClientRequestMutation = trpc.trainer.reviewClientRequest.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "active" ? "회원 연결을 승인했습니다." : "회원 요청을 거절했습니다.");
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "요청 처리에 실패했습니다."),
  });

  const addTrainerFeedbackMutation = trpc.trainer.addFeedback.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("회원에게 피드백을 남겼습니다.");
      setFeedbackDrafts((drafts) => ({ ...drafts, [variables.clientUserId]: "" }));
      utils.trainer.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "피드백 저장에 실패했습니다."),
  });

  if (loading || isLoading) {
    return (
      <div className="page-shell page-shell-wide space-y-4">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 skeleton rounded-xl" />
          <div className="h-24 skeleton rounded-xl" />
          <div className="h-24 skeleton rounded-xl" />
        </div>
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center">
        <ShieldCheck size={40} className="mb-4 text-muted-foreground opacity-30" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">로그인이 필요합니다</h2>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />
          로그인
        </Button>
      </div>
    );
  }

  const appRole = (trainerStatus as any)?.appRole ?? (user as any)?.appRole ?? "user";
  if (appRole !== "trainer") {
    return (
      <div className="page-shell page-shell-narrow">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={22} />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">트레이너 전용 페이지</h1>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              관리자 승인으로 트레이너 권한이 부여된 계정만 회원 요청, 운동 기록 확인, PT 기록, 피드백 관리를 사용할 수 있습니다.
            </p>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link href="/profile">프로필에서 트레이너 신청하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const code = (trainerStatus as any)?.code ?? "";
  const clients = (trainerStatus as any)?.clients ?? [];
  const requests = (trainerStatus as any)?.clientRequests ?? [];
  const activeClientCount = clients.length;
  const totalSessions = clients.reduce((sum: number, client: any) => sum + Number(client.sessionCount ?? 0), 0);
  const clientsWithRecentWorkout = clients.filter((client: any) => client.lastWorkoutAt).length;

  return (
    <div className="page-shell page-shell-wide animate-fade-in">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">트레이너 대시보드</h1>
          <p className="page-description">회원 요청, 운동 기록, PT 기록과 피드백을 한곳에서 관리하세요</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
          disabled={issueTrainerCodeMutation.isPending}
          onClick={() => issueTrainerCodeMutation.mutate()}
        >
          <ShieldCheck size={14} />
          트레이너 코드 확인
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="담당 회원" value={activeClientCount} />
        <StatCard icon={UserCheck} label="승인 요청" value={requests.length} tone="orange" />
        <StatCard icon={Dumbbell} label="확인 가능한 운동 기록" value={totalSessions} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">내 트레이너 코드</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    회원이 이 코드를 등록하면 승인 후 기록 확인과 피드백이 가능합니다.
                  </p>
                </div>
                <Badge className="border border-primary/30 bg-primary/10 text-primary">트레이너</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl bg-background/60 px-4 py-3 font-mono text-xl font-bold text-foreground">
                  {code || "코드 없음"}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 shrink-0 border-border bg-card"
                  disabled={!code}
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    toast.success("코드를 복사했습니다.");
                  }}
                  aria-label="트레이너 코드 복사"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="requests" className="scroll-mt-24 border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserCheck size={16} className="text-primary" />
                  회원 연결 요청
                </div>
                <Badge className="border border-border bg-accent text-muted-foreground">{requests.length}건</Badge>
              </div>
              {requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 p-4 text-sm leading-relaxed text-muted-foreground">
                  대기 중인 요청이 없습니다. 회원이 트레이너 코드를 등록하면 이곳에서 승인할 수 있습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((request: any) => (
                    <div key={request.linkId} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                      <div className="mb-3 flex items-center gap-3">
                        <PersonAvatar person={request.user} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{request.user?.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{request.user?.email}</div>
                        </div>
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
            </CardContent>
          </Card>
        </div>

        <Card id="clients" className="scroll-mt-24 border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Users size={17} className="text-primary" />
                  담당 회원
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  회원별 최근 기록을 확인하고 피드백 또는 PT 기록을 남길 수 있습니다.
                </p>
              </div>
              <Badge className="w-fit border border-border bg-accent text-muted-foreground">
                최근 기록 {clientsWithRecentWorkout}명
              </Badge>
            </div>

            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-accent/20 p-6 text-center">
                <Users size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                <div className="text-sm font-semibold text-foreground">아직 연결된 회원이 없습니다</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  트레이너 코드를 공유하고 회원 요청을 승인하면 기록 확인과 피드백 관리가 가능합니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client: any) => {
                  const clientId = Number(client.user?.id);
                  const draft = feedbackDrafts[clientId] ?? "";
                  return (
                    <div key={client.linkId} className="rounded-2xl border border-border bg-accent/25 p-4">
                      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar person={client.user} className="h-11 w-11" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-foreground">{client.user?.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{client.user?.email}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Dumbbell size={12} />
                                총 {client.sessionCount ?? 0}회
                              </span>
                              {client.lastWorkoutAt ? (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays size={12} />
                                  최근 {formatDate(client.lastWorkoutAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <Button asChild variant="outline" className="shrink-0 border-border bg-background text-foreground">
                          <Link href={`/trainer/clients/${clientId}`}>
                            회원 상세
                            <ArrowRight size={14} />
                          </Link>
                        </Button>
                      </div>
                      <Textarea
                        value={draft}
                        onChange={(event) => setFeedbackDrafts((items) => ({ ...items, [clientId]: event.target.value }))}
                        placeholder="운동 기록을 보고 피드백, 다음 운동 조언, 주의할 점을 남겨주세요."
                        className="min-h-20 resize-none border-border bg-background text-foreground"
                        maxLength={1200}
                      />
                      <div className="mt-2 flex justify-end">
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
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
