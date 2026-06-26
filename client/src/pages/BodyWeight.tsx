import BodyWeightTracker from "@/components/BodyWeightTracker";
import { AuthRequiredState, PageLoadingState } from "@/components/PageState";
import { useAuth } from "@/_core/hooks/useAuth";
import { Scale } from "lucide-react";

export default function BodyWeight() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoadingState />;
  if (!isAuthenticated) {
    return <AuthRequiredState icon={Scale} description="체중과 체성분 변화를 기록하려면 로그인하세요." />;
  }

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
