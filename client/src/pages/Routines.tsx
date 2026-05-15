import { useAuth } from "@/_core/hooks/useAuth";
import { getAppPath, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Activity, ChevronRight, Dumbbell, LogIn, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function RoutineCard({ routine, onDelete }: { routine: any; onDelete: () => void }) {
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
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base truncate">{routine.name}</h3>
            {routine.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{routine.description}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); deleteRoutine.mutate({ id: routine.id }); }}
            className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge className={cn("text-xs border", goalConfig.color)}>
            <Target size={9} className="mr-1" />
            {goalConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            주 {routine.daysPerWeek}회
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
            onClick={handleStart}
            disabled={startSession.isPending}
          >
            <Activity size={12} />
            운동 시작
          </Button>
          <Link href={`/routines/${routine.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 border-border text-muted-foreground hover:text-foreground text-xs h-8">
              편집 <ChevronRight size={12} />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Routines() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { data: routines, isLoading } = trpc.routines.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-14 skeleton rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 lg:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Dumbbell size={40} className="text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
        <p className="text-sm text-muted-foreground mb-4">루틴을 관리하려면 로그인하세요.</p>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => startLogin()}>
          <LogIn size={16} />로그인
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">내 루틴</h1>
          <p className="text-sm text-muted-foreground mt-0.5">목표별 맞춤 운동 루틴을 관리하세요</p>
        </div>
        <CreateRoutineDialog onCreated={() => utils.routines.list.invalidate()} />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)}
        </div>
      ) : routines && routines.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} onDelete={() => utils.routines.list.invalidate()} />
          ))}
        </div>
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
