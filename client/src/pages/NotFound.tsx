import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="page-shell flex min-h-[calc(100dvh-9rem)] items-center justify-center">
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
              <AlertCircle className="relative h-14 w-14 text-destructive" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>

          <h2 className="text-lg font-semibold text-foreground mb-3">
            페이지를 찾을 수 없습니다
          </h2>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            주소가 잘못되었거나 페이지가 이동되었습니다.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Home className="w-4 h-4 mr-2" />
              홈으로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
