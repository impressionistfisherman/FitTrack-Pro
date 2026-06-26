import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect } from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";

const loadHome = () => import("./pages/Home");
const loadExercises = () => import("./pages/Exercises");
const loadExerciseDetail = () => import("./pages/ExerciseDetail");
const loadRoutines = () => import("./pages/Routines");
const loadRoutineDetail = () => import("./pages/RoutineDetail");
const loadWorkoutSession = () => import("./pages/WorkoutSession");
const loadHistory = () => import("./pages/History");
const loadAICoach = () => import("./pages/AICoach");
const loadCoaching = () => import("@/pages/Coaching");
const loadFeedback = () => import("@/pages/Feedback");
const loadProfile = () => import("@/pages/Profile");
const loadBodyWeight = () => import("@/pages/BodyWeight");
const loadAdmin = () => import("@/pages/Admin");
const loadTrainer = () => import("@/pages/Trainer");
const loadTrainerClientDetail = () => import("@/pages/TrainerClientDetail");

const Home = lazy(loadHome);
const Exercises = lazy(loadExercises);
const ExerciseDetail = lazy(loadExerciseDetail);
const Routines = lazy(loadRoutines);
const RoutineDetail = lazy(loadRoutineDetail);
const WorkoutSession = lazy(loadWorkoutSession);
const History = lazy(loadHistory);
const AICoach = lazy(loadAICoach);
const Coaching = lazy(loadCoaching);
const Feedback = lazy(loadFeedback);
const Profile = lazy(loadProfile);
const BodyWeight = lazy(loadBodyWeight);
const Admin = lazy(loadAdmin);
const Trainer = lazy(loadTrainer);
const TrainerClientDetail = lazy(loadTrainerClientDetail);

const preloadCommonRoutes = () => {
  void loadExercises();
  void loadRoutines();
  void loadHistory();
  void loadAICoach();
  void loadCoaching();
  void loadProfile();
  void loadBodyWeight();
};

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
        <Route path="/history/:id" component={History} />
        <Route path="/history" component={History} />
        <Route path="/ai-coach" component={AICoach} />
        <Route path="/coaching" component={Coaching} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/profile" component={Profile} />
        <Route path="/body-weight" component={BodyWeight} />
        <Route path="/admin" component={Admin} />
        <Route path="/trainer" component={Trainer} />
        <Route path="/trainer/clients/:id/:view" component={TrainerClientDetail} />
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const preload = () => preloadCommonRoutes();
    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(preload, { timeout: 2500 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(preload, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

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
