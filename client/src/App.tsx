import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import AdminDashboard from "@/pages/AdminDashboard";
import ClientDocuments from "@/pages/ClientDocuments";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/documents" component={ClientDocuments} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;