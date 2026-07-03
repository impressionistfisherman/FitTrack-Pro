import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { AlertTriangle, Database, Megaphone, Save, Search, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

const feedbackCategoryLabels: Record<string, string> = {
  bug: "오류 제보",
  idea: "기능 제안",
  ux: "사용성 의견",
  data: "운동 데이터",
  other: "기타",
};

const feedbackStatusLabels: Record<string, string> = {
  open: "접수",
  reviewing: "검토 중",
  resolved: "완료",
  closed: "보류",
};

const roleLabels: Record<string, string> = {
  user: "일반",
  admin: "관리자",
};

const appRoleLabels: Record<string, string> = {
  member: "회원",
  trainer: "트레이너",
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function useHashView() {
  const [hash, setHash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash));

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    window.addEventListener("fittrack:routechange", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
      window.removeEventListener("fittrack:routechange", updateHash);
    };
  }, []);

  return hash;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const hashView = useHashView();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [feedbackStatus, setFeedbackStatus] = useState<"open" | "reviewing" | "resolved" | "closed" | "all">("open");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRole, setMemberRole] = useState<"user" | "admin" | "all">("all");
  const [memberAppRole, setMemberAppRole] = useState<"member" | "trainer" | "all">("all");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<number, string>>({});
  const [feedbackStatuses, setFeedbackStatuses] = useState<Record<number, "open" | "reviewing" | "resolved" | "closed">>({});
  const [memberNames, setMemberNames] = useState<Record<number, string>>({});
  const [memberRoles, setMemberRoles] = useState<Record<number, "user" | "admin">>({});
  const debouncedMemberSearch = useDebouncedValue(memberSearch.trim(), 220);
  const { data: applications, isLoading } = trpc.admin.trainerApplications.useQuery(
    { status },
    { enabled: user?.role === "admin" }
  );
  const { data: approvedTrainers, isLoading: approvedTrainersLoading } = trpc.admin.approvedTrainers.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  const { data: memberSummary } = trpc.admin.memberSummary.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  const { data: dataDiagnostics } = trpc.admin.dataDiagnostics.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  const { data: members, isLoading: membersLoading } = trpc.admin.members.useQuery(
    { search: debouncedMemberSearch, role: memberRole, appRole: memberAppRole },
    { enabled: user?.role === "admin" }
  );
  const { data: userFeedback, isLoading: userFeedbackLoading } = trpc.admin.userFeedback.useQuery(
    { status: feedbackStatus },
    { enabled: user?.role === "admin" }
  );
  const reviewMutation = trpc.admin.reviewTrainerApplication.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "approved" ? "트레이너 신청을 승인했습니다." : "트레이너 신청을 거절했습니다.");
      utils.admin.trainerApplications.invalidate();
      utils.admin.approvedTrainers.invalidate();
    },
    onError: (error) => toast.error(error.message || "처리에 실패했습니다."),
  });
  const feedbackMutation = trpc.admin.updateUserFeedback.useMutation({
    onSuccess: () => {
      toast.success("의견 상태를 저장했습니다.");
      utils.admin.userFeedback.invalidate();
    },
    onError: (error) => toast.error(error.message || "의견 상태 저장에 실패했습니다."),
  });
  const memberMutation = trpc.admin.updateMember.useMutation({
    onSuccess: () => {
      toast.success("회원 정보를 저장했습니다.");
      utils.admin.members.invalidate();
      utils.admin.memberSummary.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message || "회원 정보 저장에 실패했습니다."),
  });
  const view = hashView === "#applications"
    ? "applications"
    : hashView === "#trainers"
      ? "trainers"
      : hashView === "#members"
        ? "members"
        : hashView === "#feedback"
          ? "feedback"
          : "dashboard";
  const pageMeta = {
    dashboard: {
      title: "관리자",
      description: "트레이너 신청과 승인 상태를 관리하세요",
    },
    applications: {
      title: "신청 관리",
      description: "트레이너 신청을 검토하고 승인 또는 거절하세요",
    },
    trainers: {
      title: "승인 트레이너",
      description: "승인된 트레이너와 발급된 코드를 확인하세요",
    },
    members: {
      title: "회원 관리",
      description: "가입 회원, 권한, 활동 요약과 연결 상태를 관리하세요",
    },
    feedback: {
      title: "사용자 의견",
      description: "사용자가 남긴 오류 제보와 개선 의견을 확인하세요",
    },
  }[view];

  if (loading) {
    return (
      <div className="page-shell page-shell-narrow space-y-4">
        <div className="h-16 skeleton rounded-xl" />
        <div className="h-72 skeleton rounded-xl" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="page-shell page-shell-narrow">
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="mx-auto mb-3 text-muted-foreground" size={32} />
            <h1 className="text-lg font-semibold text-foreground">관리자 권한이 필요합니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">트레이너 승인과 관리 기능은 관리자만 사용할 수 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell-wide animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageMeta.title}</h1>
          <p className="page-description">{pageMeta.description}</p>
        </div>
      </div>

      {view === "dashboard" ? (
      <>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">현재 필터 신청</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{applications?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">승인된 트레이너</div>
              <div className="mt-1 text-2xl font-bold text-primary">{approvedTrainers?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">전체 회원</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{memberSummary?.totalMembers ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">진단 필요 항목</div>
              <div className="mt-1 text-2xl font-bold text-orange-400">{dataDiagnostics?.issueCount ?? 0}</div>
            </CardContent>
          </Card>
        </div>
        <Card className="mb-4 border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Database size={17} className="text-primary" />
              <span className="font-semibold text-foreground">데이터 진단</span>
              {(dataDiagnostics?.issueCount ?? 0) > 0 ? (
                <Badge className="border border-orange-400/30 bg-orange-400/10 text-orange-300">
                  <AlertTriangle size={12} className="mr-1" />
                  확인 필요
                </Badge>
              ) : (
                <Badge className="border border-primary/25 bg-primary/10 text-primary">정상</Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["최근 30일 세션", dataDiagnostics?.recentSessions ?? 0, "전체 운동 기록 중 최근 활동"],
                ["0kg 세션", dataDiagnostics?.zeroVolumeSessions ?? 0, "볼륨 계산 누락 가능"],
                ["무게 누락 세트", dataDiagnostics?.missingWeightLogs ?? 0, "근력 세트 입력 점검"],
                ["처리 대기 의견", dataDiagnostics?.openFeedback ?? 0, "접수/검토 중 의견"],
              ].map(([label, value, desc]) => (
                <div key={String(label)} className="rounded-xl border border-border bg-accent/25 p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-xl font-bold text-foreground">{Number(value).toLocaleString()}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
      ) : null}

      {view !== "trainers" && view !== "members" && view !== "feedback" ? (
      <Card id="applications" className="scroll-mt-24 border-border bg-card">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-primary" />
              <span className="font-semibold text-foreground">트레이너 신청 관리</span>
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger className="w-full border-border bg-accent text-foreground sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                <SelectItem value="pending">대기</SelectItem>
                <SelectItem value="approved">승인</SelectItem>
                <SelectItem value="rejected">거절</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-36 skeleton rounded-xl" />
              ))}
            </div>
          ) : !applications?.length ? (
            <div className="rounded-xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
              조건에 맞는 트레이너 신청이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((application: any) => {
                const note = reviewNotes[application.id] ?? "";
                return (
                  <div key={application.id} className="rounded-xl border border-border bg-accent/25 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-foreground">{application.displayName || application.user?.name}</h2>
                          <Badge className={cn(
                            "border text-xs",
                            application.status === "pending"
                              ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                              : application.status === "approved"
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                          )}>
                            {statusLabels[application.status] ?? application.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{application.user?.email}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(application.createdAt).toLocaleString("ko-KR")}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm lg:grid-cols-2">
                      <div className="rounded-lg bg-background/40 p-3">
                        <div className="mb-1 text-xs text-muted-foreground">소개</div>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground">{application.bio || "-"}</p>
                      </div>
                      <div className="rounded-lg bg-background/40 p-3">
                        <div className="mb-1 text-xs text-muted-foreground">경력 / 자격 / 운영 방식</div>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground">{application.experience || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(application.specialties ?? []).map((item: string) => (
                        <Badge key={item} className="border border-primary/25 bg-primary/10 text-primary">{item}</Badge>
                      ))}
                      {application.contact && (
                        <Badge className="border border-border bg-background text-muted-foreground">{application.contact}</Badge>
                      )}
                    </div>

                    {application.status === "pending" && (
                      <div className="mt-4 space-y-2">
                        <Textarea
                          value={note}
                          onChange={(event) => setReviewNotes((items) => ({ ...items, [application.id]: event.target.value }))}
                          placeholder="승인/거절 메모. 거절 시 사용자에게 사유로 표시됩니다."
                          className="min-h-20 resize-none border-border bg-background text-foreground"
                          maxLength={500}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ applicationId: application.id, status: "rejected", reviewNote: note })}
                          >
                            <UserX size={14} />
                            거절
                          </Button>
                          <Button
                            className="bg-primary text-primary-foreground"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ applicationId: application.id, status: "approved", reviewNote: note })}
                          >
                            <UserCheck size={14} />
                            승인 및 코드 발급
                          </Button>
                        </div>
                      </div>
                    )}

                    {application.status !== "pending" && application.reviewNote && (
                      <p className="mt-3 rounded-lg bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
                        처리 메모: {application.reviewNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {view !== "applications" && view !== "members" && view !== "feedback" ? (
      <Card id="trainers" className="mt-4 scroll-mt-24 border-border bg-card">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users size={17} className="text-primary" />
            <span className="font-semibold text-foreground">승인된 트레이너</span>
          </div>
          {approvedTrainersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-20 skeleton rounded-xl" />
              ))}
            </div>
          ) : !approvedTrainers?.length ? (
            <div className="rounded-xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
              아직 승인된 트레이너가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {approvedTrainers.map((trainer: any) => (
                <div key={trainer.user?.id ?? trainer.applicationId} className="rounded-xl border border-border bg-accent/25 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{trainer.displayName || trainer.user?.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{trainer.user?.email}</div>
                    </div>
                    <Badge className="border border-primary/30 bg-primary/10 text-primary">
                      회원 {trainer.clientCount ?? 0}명
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-background/40 px-3 py-2 font-mono text-sm text-foreground">
                    {trainer.code ?? "코드 없음"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {view === "dashboard" || view === "members" ? (
      <Card id="members" className="mt-4 scroll-mt-24 border-border bg-card">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-primary" />
                <span className="font-semibold text-foreground">회원 관리</span>
                <Badge className="border border-border bg-accent text-muted-foreground">{members?.length ?? 0}명</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                최근 접속, 운동 기록, 트레이너 연결과 관리자 권한을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_140px_140px] xl:w-[620px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="이름, 이메일, 회원 ID 검색"
                  className="border-border bg-background pl-9 text-foreground"
                />
              </div>
              <Select value={memberRole} onValueChange={(value) => setMemberRole(value as any)}>
                <SelectTrigger className="border-border bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">전체 권한</SelectItem>
                  <SelectItem value="user">일반</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
              <Select value={memberAppRole} onValueChange={(value) => setMemberAppRole(value as any)}>
                <SelectTrigger className="border-border bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="member">회원</SelectItem>
                  <SelectItem value="trainer">트레이너</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {view === "members" ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-accent/25 p-3">
                <div className="text-xs text-muted-foreground">전체 회원</div>
                <div className="mt-1 text-xl font-bold text-foreground">{memberSummary?.totalMembers ?? 0}</div>
              </div>
              <div className="rounded-xl border border-border bg-accent/25 p-3">
                <div className="text-xs text-muted-foreground">최근 30일 접속</div>
                <div className="mt-1 text-xl font-bold text-primary">{memberSummary?.active30dMembers ?? 0}</div>
              </div>
              <div className="rounded-xl border border-border bg-accent/25 p-3">
                <div className="text-xs text-muted-foreground">트레이너 권한</div>
                <div className="mt-1 text-xl font-bold text-foreground">{memberSummary?.trainerMembers ?? 0}</div>
              </div>
              <div className="rounded-xl border border-border bg-accent/25 p-3">
                <div className="text-xs text-muted-foreground">관리자</div>
                <div className="mt-1 text-xl font-bold text-foreground">{memberSummary?.adminMembers ?? 0}</div>
              </div>
            </div>
          ) : null}

          {membersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 skeleton rounded-xl" />
              ))}
            </div>
          ) : !members?.length ? (
            <div className="rounded-xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
              조건에 맞는 회원이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => {
                const memberId = Number(member.id);
                const draftName = memberNames[memberId] ?? member.name ?? "";
                const draftRole = memberRoles[memberId] ?? member.role ?? "user";
                const isCurrentUser = user?.id === memberId;
                const hasChanges = draftName.trim() !== (member.name ?? "") || draftRole !== member.role;
                return (
                  <div key={memberId} className="rounded-xl border border-border bg-accent/25 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(320px,1.2fr)_220px] xl:items-start">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className="border border-border bg-background text-muted-foreground">ID {memberId}</Badge>
                          <Badge className={cn(
                            "border",
                            member.role === "admin"
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground"
                          )}>
                            {roleLabels[member.role] ?? member.role}
                          </Badge>
                          <Badge className={cn(
                            "border",
                            member.appRole === "trainer"
                              ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                              : "border-border bg-background text-muted-foreground"
                          )}>
                            {appRoleLabels[member.appRole] ?? "회원"}
                          </Badge>
                        </div>
                        <div className="truncate text-base font-semibold text-foreground">{member.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{member.email || "이메일 없음"}</div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                          <span>가입 {formatDateTime(member.createdAt)}</span>
                          <span>최근 접속 {formatDateTime(member.lastSignedIn)}</span>
                          <span>로그인 {member.loginMethod || "-"}</span>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg bg-background/40 p-3">
                          <div className="text-xs text-muted-foreground">운동 기록</div>
                          <div className="mt-1 text-lg font-bold text-foreground">{member.workoutCount ?? 0}</div>
                          <div className="mt-1 truncate text-[11px] text-muted-foreground">
                            최근 {formatDateTime(member.lastWorkoutAt)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-background/40 p-3">
                          <div className="text-xs text-muted-foreground">루틴 / 체성분</div>
                          <div className="mt-1 text-lg font-bold text-foreground">
                            {member.routineCount ?? 0} / {member.bodyWeightCount ?? 0}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">루틴과 인바디 기록</div>
                        </div>
                        <div className="rounded-lg bg-background/40 p-3">
                          <div className="text-xs text-muted-foreground">연결</div>
                          <div className="mt-1 text-lg font-bold text-foreground">
                            {member.trainerClientCount ?? 0} / {member.linkedTrainerCount ?? 0}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">담당 회원 / 내 트레이너</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Input
                          value={draftName}
                          onChange={(event) => setMemberNames((items) => ({ ...items, [memberId]: event.target.value }))}
                          className="border-border bg-background text-foreground"
                          aria-label="회원 이름"
                        />
                        <Select
                          value={draftRole}
                          onValueChange={(value) => setMemberRoles((items) => ({ ...items, [memberId]: value as any }))}
                        >
                          <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-card">
                            <SelectItem value="user">일반</SelectItem>
                            <SelectItem value="admin" disabled={isCurrentUser}>관리자</SelectItem>
                          </SelectContent>
                        </Select>
                        {member.appRole === "trainer" && member.trainerCode ? (
                          <div className="rounded-lg bg-background/40 px-3 py-2 font-mono text-xs text-foreground">
                            {member.trainerCode}
                          </div>
                        ) : null}
                        <Button
                          className="w-full bg-primary text-primary-foreground"
                          disabled={!hasChanges || memberMutation.isPending || (isCurrentUser && draftRole !== "admin")}
                          onClick={() => memberMutation.mutate({
                            userId: memberId,
                            name: draftName,
                            role: draftRole,
                          })}
                        >
                          <Save size={14} />
                          저장
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {view === "dashboard" || view === "feedback" ? (
      <Card id="feedback" className="mt-4 scroll-mt-24 border-border bg-card">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={17} className="text-primary" />
              <span className="font-semibold text-foreground">사용자 의견 관리</span>
              <Badge className="border border-border bg-accent text-muted-foreground">{userFeedback?.length ?? 0}건</Badge>
            </div>
            <Select value={feedbackStatus} onValueChange={(value) => setFeedbackStatus(value as any)}>
              <SelectTrigger className="w-full border-border bg-accent text-foreground sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                <SelectItem value="open">접수</SelectItem>
                <SelectItem value="reviewing">검토 중</SelectItem>
                <SelectItem value="resolved">완료</SelectItem>
                <SelectItem value="closed">보류</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userFeedbackLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 skeleton rounded-xl" />
              ))}
            </div>
          ) : !userFeedback?.length ? (
            <div className="rounded-xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
              조건에 맞는 사용자 의견이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {userFeedback.map((item: any) => {
                const selectedStatus = feedbackStatuses[item.id] ?? item.status;
                const note = feedbackNotes[item.id] ?? item.adminNote ?? "";
                return (
                  <div key={item.id} className="rounded-xl border border-border bg-accent/25 p-4">
                    <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold text-foreground">{item.user?.name || "사용자"}</h2>
                          <Badge className="border border-primary/25 bg-primary/10 text-primary">
                            {feedbackCategoryLabels[item.category] ?? "기타"}
                          </Badge>
                          <Badge className="border border-border bg-background text-muted-foreground">
                            {feedbackStatusLabels[item.status] ?? item.status}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.user?.email || "이메일 없음"}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap rounded-lg bg-background/40 p-3 text-sm leading-relaxed text-foreground">
                      {item.message}
                    </p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-end">
                      <div>
                        <label className="mb-2 block text-xs text-muted-foreground">처리 상태</label>
                        <Select
                          value={selectedStatus}
                          onValueChange={(value) => setFeedbackStatuses((items) => ({ ...items, [item.id]: value as any }))}
                        >
                          <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-card">
                            <SelectItem value="open">접수</SelectItem>
                            <SelectItem value="reviewing">검토 중</SelectItem>
                            <SelectItem value="resolved">완료</SelectItem>
                            <SelectItem value="closed">보류</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-muted-foreground">관리자 메모</label>
                        <Textarea
                          value={note}
                          onChange={(event) => setFeedbackNotes((items) => ({ ...items, [item.id]: event.target.value }))}
                          placeholder="처리 메모를 남기면 사용자 의견 내역에 표시됩니다."
                          className="min-h-12 resize-none border-border bg-background text-foreground"
                          maxLength={1000}
                        />
                      </div>
                      <Button
                        className="bg-primary text-primary-foreground"
                        disabled={feedbackMutation.isPending}
                        onClick={() => feedbackMutation.mutate({
                          feedbackId: item.id,
                          status: selectedStatus,
                          adminNote: note,
                        })}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
