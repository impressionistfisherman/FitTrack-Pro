import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";

const Home = lazy(() => import("./pages/Home"));
const Exercises = lazy(() => import("./pages/Exercises"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail"));
const Routines = lazy(() => import("./pages/Routines"));
const RoutineDetail = lazy(() => import("./pages/RoutineDetail"));
const WorkoutSession = lazy(() => import("./pages/WorkoutSession"));
const History = lazy(() => import("./pages/History"));
const AICoach = lazy(() => import("./pages/AICoach"));
const Coaching = lazy(() => import("@/pages/Coaching"));
const Profile = lazy(() => import("@/pages/Profile"));
const BodyWeight = lazy(() => import("@/pages/BodyWeight"));
const Admin = lazy(() => import("@/pages/Admin"));
const Trainer = lazy(() => import("@/pages/Trainer"));
const TrainerClientDetail = lazy(() => import("@/pages/TrainerClientDetail"));

const routerBase =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
    ? import.meta.env.BASE_URL.replace(/\/$/, "")
    : "";

function Routes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/exercises" component={Exercises} />
        <Route path="/exercises/:id" component={ExerciseDetail} />
        <Route path="/routines" component={Routines} />
        <Route path="/routines/:id" component={RoutineDetail} />
        <Route path="/workout/:sessionId" component={WorkoutSession} />
        <Route path="/history" component={History} />
        <Route path="/ai-coach" component={AICoach} />
        <Route path="/coaching" component={Coaching} />
        <Route path="/profile" component={Profile} />
        <Route path="/body-weight" component={BodyWeight} />
        <Route path="/admin" component={Admin} />
        <Route path="/trainer" component={Trainer} />
        <Route path="/trainer/clients/:id" component={TrainerClientDetail} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function PageLoading() {
  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <div className="h-6 w-40 skeleton rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-56 skeleton rounded-2xl" />
          <div className="h-56 skeleton rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const { themeConfig } = useTheme();
  return (
    <TooltipProvider>
      <Toaster theme={themeConfig.isDark ? "dark" : "light"} />
      <WouterRouter base={routerBase}>
        <AppLayout>
          <Routes />
        </AppLayout>
      </WouterRouter>
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
