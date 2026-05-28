import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Exercises from "./pages/Exercises";
import ExerciseDetail from "./pages/ExerciseDetail";
import Routines from "./pages/Routines";
import RoutineDetail from "./pages/RoutineDetail";
import WorkoutSession from "./pages/WorkoutSession";
import History from "./pages/History";
import AICoach from "./pages/AICoach";
import Profile from "@/pages/Profile";
import BodyWeight from "@/pages/BodyWeight";
import Admin from "@/pages/Admin";
import TrainerClientDetail from "@/pages/TrainerClientDetail";

const routerBase =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
    ? import.meta.env.BASE_URL.replace(/\/$/, "")
    : "";

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/exercises" component={Exercises} />
      <Route path="/exercises/:id" component={ExerciseDetail} />
      <Route path="/routines" component={Routines} />
      <Route path="/routines/:id" component={RoutineDetail} />
      <Route path="/workout/:sessionId" component={WorkoutSession} />
      <Route path="/history" component={History} />
      <Route path="/ai-coach" component={AICoach} />
      <Route path="/profile" component={Profile} />
      <Route path="/body-weight" component={BodyWeight} />
      <Route path="/admin" component={Admin} />
      <Route path="/trainer/clients/:id" component={TrainerClientDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
