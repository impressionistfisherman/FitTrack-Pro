import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, Lightbulb, Loader2, MessageSquare, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FeedbackCategory = "bug" | "idea" | "ux" | "data" | "other";

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: "오류 제보",
  idea: "기능 제안",
  ux: "사용성 의견",
  data: "운동 데이터",
  other: "기타",
};

const statusLabels: Record<string, string> = {
  open: "접수",
  reviewing: "검토 중",
  resolved: "완료",
  closed: "보류",
};

const statusStyles: Record<string, string> = {
  open: "border-primary/30 bg-primary/10 text-primary",
  reviewing: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  closed: "border-muted-foreground/30 bg-accent text-muted-foreground",
};

function feedbackCategoryLabel(category: unknown) {
  return typeof category === "string" && category in categoryLabels
    ? categoryLabels[category as FeedbackCategory]
    : categoryLabels.other;
}

export default function Feedback() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");
  const remaining = 2000 - message.length;
  const canSubmit = message.trim().length >= 5 && remaining >= 0;
  const { data: feedbackItems, isLoading } = trpc.feedback.mine.useQuery(undefined, {
    enabled: Boolean(user?.id),
    staleTime: 1000 * 30,
  });
  const createMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      toast.success("의견을 접수했습니다.");
      setMessage("");
      utils.feedback.mine.invalidate();
      utils.admin.userFeedback.invalidate();
    },
    onError: (error) => toast.error(error.message || "의견 접수에 실패했습니다."),
  });
  const recentItems = useMemo(() => feedbackItems ?? [], [feedbackItems]);

  if (loading) {
    return (
      <div className="page-shell page-shell-narrow space-y-4">
        <div className="h-16 skeleton rounded-xl" />
        <div className="h-72 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell page-shell-narrow">
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto mb-3 text-primary" size={34} />
            <h1 className="text-xl font-bold text-foreground">로그인 후 의견을 남길 수 있습니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">개선 의견과 오류 제보를 남기면 관리자 화면에서 확인됩니다.</p>
            <Button className="mt-5 bg-primary text-primary-foreground" onClick={() => startLogin()}>
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">의견 보내기</h1>
          <p className="page-description">불편한 점, 오류, 원하는 기능을 남겨주세요</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card">
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">새 의견</h2>
              </div>
              <Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}>
                <SelectTrigger className="h-10 w-full border-border bg-background text-foreground sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm text-muted-foreground">내용</label>
                <span className={cn("text-xs", remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                  {remaining}자 남음
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="예: 모바일에서 운동 기록 버튼이 잘려요. 기록 후 그래프가 바로 갱신되면 좋겠어요."
                className="min-h-32 resize-none border-border bg-background text-foreground"
                maxLength={2100}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                접수된 의견은 관리자만 확인하며, 처리 상태와 관리자 메모가 아래에 표시됩니다.
              </p>
              <Button
                className="h-10 bg-primary text-primary-foreground sm:min-w-32"
                disabled={!canSubmit || createMutation.isPending}
                onClick={() => createMutation.mutate({ category, message })}
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                의견 보내기
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">내 의견</h2>
              <Badge className="border border-border bg-accent text-muted-foreground">
                {recentItems.length}건
              </Badge>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-20 skeleton rounded-xl" />
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background/35 px-4 py-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">아직 남긴 의견이 없습니다</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      첫 의견을 보내면 접수 상태와 관리자 답변을 여기에서 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-primary/25 bg-primary/10 text-primary">
                          {feedbackCategoryLabel(item.category)}
                        </Badge>
                        <Badge className={cn("border", statusStyles[item.status] ?? statusStyles.open)}>
                          {statusLabels[item.status] ?? item.status}
                        </Badge>
                      </div>
                      {item.status === "resolved" ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                      ) : (
                        <Clock3 size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>
                    {item.adminNote ? (
                      <div className="mt-3 rounded-lg border border-border bg-accent/25 p-3 text-xs leading-relaxed text-muted-foreground">
                        관리자 메모: {item.adminNote}
                      </div>
                    ) : null}
                    <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
