import { useAuth } from "@/_core/hooks/useAuth";
import { getAppPath, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Activity, CheckSquare, ChevronRight, Dumbbell, LogIn, Pencil, Plus, Square, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthRequiredState, PageLoadingState } from "@/components/PageState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const goalOptions = [
  { value: "hypertrophy", label: "근비대", desc: "근육량 증가", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "fat_loss", label: "다이어트", desc: "체지방 감소", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { value: "strength", label: "근력", desc: "최대 근력 향상", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { value: "endurance", label: "지구력", desc: "근지구력 향상", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { value: "flexibility", label: "유연성", desc: "가동성 향상", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { value: "general", label: "일반 건강", desc: "전반적 건강", color: "text-primary bg-primary/10 border-primary/20" },
];

function CreateRoutineDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("general");
  const [daysPerWeek, setDaysPerWeek] = useState("3");

  const createRoutine = trpc.routines.create.useMutation({
    onSuccess: () => {
      toast.success("루틴이 생성되었습니다!");
      setOpen(false);
      setName(""); setDescription(""); setGoal("general"); setDaysPerWeek("3");
      onCreated();
    },
    onError: () => toast.error("루틴 생성에 실패했습니다."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} />
          루틴 만들기
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">새 루틴 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">루틴 이름 *</Label>
            <Input
              placeholder="예: 상체 근비대 루틴"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-accent border-border text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">설명</Label>
            <Textarea
              placeholder="루틴에 대한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-accent border-border text-foreground resize-none"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">운동 목표 *</Label>
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={cn(
                    "p-2.5 rounded-lg border text-left transition-all text-xs",
                    goal === g.value ? g.color : "bg-accent border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <div className="font-semibold">{g.label}</div>
                  <div className="opacity-70">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">주 운동 횟수</Label>
            <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
              <SelectTrigger className="bg-accent border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {[1,2,3,4,5,6,7].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-foreground">{d}일</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => createRoutine.mutate({ name, description, goal: goal as any, daysPerWeek: parseInt(daysPerWeek) })}
            disabled={!name || createRoutine.isPending}
          >
            {createRoutine.isPending ? "생성 중..." : "루틴 생성"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenameRoutineDialog({ routine, onRenamed }: { routine: any; onRenamed: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(routine.name || "");
  const updateRoutine = trpc.routines.update.useMutation({
    onSuccess: () => {
      toast.success("루틴 이름을 변경했습니다.");
      setOpen(false);
      onRenamed();
    },
    onError: () => toast.error("이름 변경에 실패했습니다."),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) setName(routine.name || "");
    }}>
      <DialogTrigger asChild>
        <button
          className="ml-2 rounded-lg p-1.5 text-muted-foreground opacity-100 transition-colors hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="루틴 이름 변경"
        >
          <Pencil size={14} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">루틴 이름 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">루틴 이름</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border-border bg-accent text-foreground"
              placeholder="루틴 이름"
            />
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!name.trim() || updateRoutine.isPending}
            onClick={() => updateRoutine.mutate({ id: routine.id, name: name.trim() })}
          >
            {updateRoutine.isPending ? "저장 중..." : "이름 저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoutineCard({
  routine,
  onDelete,
  selectionMode = false,
  selected = false,
  onToggleSelected,
}: {
  routine: any;
  onDelete: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const goalConfig = goalOptions.find((g) => g.value === routine.goal) || goalOptions[5];
  const deleteRoutine = trpc.routines.delete.useMutation({
    onSuccess: () => { toast.success("루틴이 삭제되었습니다."); onDelete(); },
    onError: () => toast.error("삭제에 실패했습니다."),
  });
  const startSession = trpc.workout.startSession.useMutation();

  const handleStart = async () => {
    const result = await startSession.mutateAsync({ routineId: routine.id, name: routine.name });
    window.location.href = getAppPath(`/workout/${result.sessionId}`);
  };

  return (
    <Card
      className={cn(
        "figma-plan-card group",
        selectionMode ? "cursor-pointer hover:border-primary/40" : "hover:border-primary/30",
        selected && "border-primary/60 bg-primary/5"
      )}
      onClick={selectionMode ? onToggleSelected : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          {selectionMode && (
            <button
              type="button"
              className="mr-3 mt-0.5 text-primary"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelected?.();
              }}
              aria-label={selected ? "선택 해제" : "루틴 선택"}
            >
              {selected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base truncate">{routine.name}</h3>
            {routine.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{routine.description}</p>
            )}
          </div>
          {!selectionMode && (
            <>
              <RenameRoutineDialog routine={routine} onRenamed={onDelete} />
              <button
                onClick={(e) => { e.preventDefault(); deleteRoutine.mutate({ id: routine.id }); }}
                className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>

        <div className="figma-card-metrics">
          <Badge className={cn("text-xs border", goalConfig.color)}>
            <Target size={9} className="mr-1" />
            {goalConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            주 {routine.daysPerWeek}회
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">맞춤 플랜</span>
        </div>

        <div className="figma-card-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(18, Number(routine.daysPerWeek || 3) * 14))}%` }} />
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-9 min-w-0 flex-1 gap-1.5 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            onClick={handleStart}
            disabled={selectionMode || startSession.isPending}
          >
            <Activity size={12} />
            운동 시작
          </Button>
          {selectionMode ? (
            <Button size="sm" variant="outline" className="h-9 gap-1.5 whitespace-nowrap border-border text-muted-foreground text-xs" disabled>
              편집 <ChevronRight size={12} />
            </Button>
          ) : (
            <Link href={`/routines/${routine.id}`}>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 whitespace-nowrap border-border text-muted-foreground hover:text-foreground text-xs">
                편집 <ChevronRight size={12} />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Routines() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { data: routines, isLoading } = trpc.routines.list.useQuery(undefined, { enabled: isAuthenticated });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const deleteRoutine = trpc.routines.delete.useMutation();
  const selectedCount = selectedIds.length;
  const allRoutineIds = routines?.map((routine: any) => routine.id) ?? [];
  const allSelected = allRoutineIds.length > 0 && selectedCount === allRoutineIds.length;

  const toggleSelectionMode = () => {
    setSelectionMode((value) => {
      if (value) setSelectedIds([]);
      return !value;
    });
  };

  const toggleRoutineSelection = (id: number) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  const toggleAllSelection = () => {
    setSelectedIds(allSelected ? [] : allRoutineIds);
  };

  const deleteRoutines = async (ids: number[]) => {
    if (!ids.length || deleteRoutine.isPending) return;
    const ok = window.confirm(`${ids.length}개 루틴을 삭제할까요? 삭제한 루틴은 복구할 수 없습니다.`);
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => deleteRoutine.mutateAsync({ id })));
      toast.success(`${ids.length}개 루틴을 삭제했습니다.`);
      setSelectedIds([]);
      setSelectionMode(false);
      utils.routines.list.invalidate();
    } catch {
      toast.error("루틴 삭제에 실패했습니다.");
    }
  };

  if (loading) return <PageLoadingState wide cards={3} />;
  if (!isAuthenticated) {
    return <AuthRequiredState icon={Dumbbell} description="맞춤 루틴을 만들고 관리하려면 로그인하세요." />;
  }

  return (
    <div className="page-shell figma-page animate-fade-in">
      <div className="figma-centered-header">
        <h1 className="page-title">목표</h1>
        <p className="page-description">운동 계획과 운동 라이브러리</p>
      </div>

      <nav className="figma-segmented" aria-label="목표 화면">
        <Link href="/routines" className="is-active">플랜</Link>
        <Link href="/exercises">운동</Link>
      </nav>

      <section className="figma-overall-progress" aria-label="전체 진행률">
        <div className="flex items-end justify-between">
          <div>
            <span>전체 진행률</span>
            <strong>{routines?.length ?? 0}개 플랜</strong>
          </div>
          <b>{routines?.length ? Math.min(100, routines.length * 12) : 0}%</b>
        </div>
        <div className="figma-card-progress">
          <span style={{ width: `${routines?.length ? Math.min(100, routines.length * 12) : 0}%` }} />
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-2">
        <CreateRoutineDialog onCreated={() => utils.routines.list.invalidate()} />
        <div className="flex flex-wrap gap-2">
          {routines && routines.length > 0 && (
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              className="border-border"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? "관리 완료" : "선택 관리"}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)}
        </div>
      ) : routines && routines.length > 0 ? (
        <>
          {selectionMode && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedCount}</span> / {routines.length}개 선택
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex">
                <Button variant="outline" className="border-border" onClick={toggleAllSelection}>
                  {allSelected ? "전체 해제" : "전체 선택"}
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={!selectedCount || deleteRoutine.isPending}
                  onClick={() => deleteRoutines(selectedIds)}
                >
                  선택 삭제
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteRoutine.isPending}
                  onClick={() => deleteRoutines(allRoutineIds)}
                >
                  전체 삭제
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onDelete={() => utils.routines.list.invalidate()}
                selectionMode={selectionMode}
                selected={selectedIds.includes(routine.id)}
                onToggleSelected={() => toggleRoutineSelection(routine.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Activity size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">루틴이 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">첫 번째 루틴을 만들어 체계적으로 운동해보세요!</p>
          <CreateRoutineDialog onCreated={() => utils.routines.list.invalidate()} />
        </div>
      )}
    </div>
  );
}
