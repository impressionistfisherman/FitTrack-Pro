import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Home, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const statusLabels: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const { data: applications, isLoading } = trpc.admin.trainerApplications.useQuery(
    { status },
    { enabled: user?.role === "admin" }
  );
  const { data: approvedTrainers, isLoading: approvedTrainersLoading } = trpc.admin.approvedTrainers.useQuery(
    undefined,
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
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">관리자</h1>
            <p className="page-description">트레이너 신청과 승인 상태를 관리하세요</p>
          </div>
          <div className="flex w-fit rounded-xl border border-border bg-card p-1">
            <Button asChild size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground">
              <Link href="/">
                <Home size={14} />
                사용자
              </Link>
            </Button>
            <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
              <ShieldCheck size={14} />
              관리자
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
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
            <div className="text-xs text-muted-foreground">관리 기준</div>
            <div className="mt-1 text-sm font-semibold text-foreground">신청 검토 후 코드 발급</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
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

      <Card className="mt-4 border-border bg-card">
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
    </div>
  );
}
