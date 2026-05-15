import BodyWeightTracker from "@/components/BodyWeightTracker";

export default function BodyWeight() {
  return (
    <div className="page-shell page-shell-narrow animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">체중 기록</h1>
        <p className="page-description">체중과 체성분 변화를 기록하세요</p>
      </div>
      <BodyWeightTracker />
    </div>
  );
}
