import BodyWeightTracker from "@/components/BodyWeightTracker";

export default function BodyWeight() {
  return (
    <div className="page-shell figma-page content-page animate-fade-in">
      <div className="figma-centered-header">
        <h1 className="page-title">체중 기록</h1>
        <p className="page-description">체중과 체성분 변화를 기록하세요</p>
      </div>
      <BodyWeightTracker />
    </div>
  );
}
