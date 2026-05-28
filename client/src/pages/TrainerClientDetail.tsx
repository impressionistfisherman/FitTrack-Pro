import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

export default function TrainerClientDetail() {
  const [, params] = useRoute("/trainer/clients/:id");
  const clientUserId = Number(params?.id ?? 0);
  const utils = trpc.useUtils();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data, isLoading } = trpc.trainer.clientDetail.useQuery(
    { clientUserId, limit: 20 },
    { enabled: Number.isFinite(clientUserId) && clientUserId > 0 }
  );
  const feedbackMutation = trpc.trainer.addFeedback.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("피드백을 남겼습니다.");
      setDrafts((items) => ({ ...items, [variables.sessionId ? `s-${variables.sessionId}` : "general"]: "" }));
      utils.trainer.clientDetail.invalidate({ clientUserId, limit: 20 });
    },
    onError: (error) => toast.error(error.message || "피드백 저장에 실패했습니다."),
  });

  const addFeedback = (key: string, sessionId?: number) => {
    const message = drafts[key]?.trim();
    if (!message) return;
    feedbackMutation.mutate({ clientUserId, sessionId, message });
  };

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <Link href="/profile" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={15} />
          프로필로 돌아가기
        </Link>
        <h1 className="page-title">회원 운동 기록</h1>
        <p className="page-description">연결된 회원의 운동 기록을 확인하고 세션별 피드백을 남기세요</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-40 skeleton rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {!data?.sessions?.length ? (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  아직 확인할 운동 기록이 없습니다.
                </CardContent>
              </Card>
            ) : data.sessions.map((session: any) => {
              const key = `s-${session.id}`;
              const logs = session.logs ?? [];
              const volume = logs.reduce((sum: number, item: any) => sum + (Number(item.log?.weightKg) || 0) * (Number(item.log?.reps) || 0), 0);
              return (
                <Card key={session.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-semibold text-foreground">{session.name || "운동 세션"}</h2>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.workoutDate ?? session.startedAt).toLocaleDateString("ko-KR")} · {logs.length}세트 · {Math.round(volume).toLocaleString()}kg
                        </p>
                      </div>
                      {session.durationMinutes ? (
                        <span className="text-xs text-muted-foreground">{session.durationMinutes}분</span>
                      ) : null}
                    </div>
                    <div className="mb-3 space-y-1.5">
                      {logs.slice(0, 8).map((item: any) => (
                        <div key={item.log.id} className="rounded-lg bg-accent/40 px-3 py-2 text-sm text-foreground">
                          {item.exercise?.nameKo} · {item.log.weightKg ? `${item.log.weightKg}kg ` : ""}{item.log.reps ? `${item.log.reps}회` : item.log.durationSeconds ? `${Math.round(item.log.durationSeconds / 60)}분` : ""}
                        </div>
                      ))}
                    </div>
                    <Textarea
                      value={drafts[key] ?? ""}
                      onChange={(event) => setDrafts((items) => ({ ...items, [key]: event.target.value }))}
                      placeholder="이 세션에 대한 피드백을 남겨주세요."
                      className="min-h-20 resize-none border-border bg-accent text-foreground"
                      maxLength={1200}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        className="bg-primary text-primary-foreground"
                        disabled={!drafts[key]?.trim() || feedbackMutation.isPending}
                        onClick={() => addFeedback(key, session.id)}
                      >
                        <MessageSquare size={14} />
                        세션 피드백
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit border-border bg-card">
            <CardContent className="p-4">
              <h2 className="mb-3 font-semibold text-foreground">피드백 기록</h2>
              {data?.feedback?.length ? (
                <div className="space-y-2">
                  {data.feedback.map((item: any) => (
                    <div key={item.id} className="rounded-lg bg-accent/40 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("ko-KR")}
                        {item.sessionId ? ` · 세션 #${item.sessionId}` : ""}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 남긴 피드백이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
