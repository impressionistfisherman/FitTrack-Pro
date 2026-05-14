import BodyWeightTracker from "@/components/BodyWeightTracker";

export default function BodyWeight() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">체중 기록</h1>
        <p className="text-sm text-muted-foreground mt-0.5">체중과 체성분 변화를 기록하세요</p>
      </div>
      <BodyWeightTracker />
    </div>
  );
}
