import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import AdminDashboard from "@/pages/AdminDashboard";
import ClientDocuments from "@/pages/ClientDocuments";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import AdminDocuments from "@/pages/AdminDocuments";
import UserManagement from "@/pages/UserManagement";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
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
    <AuthProvider>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <AdminRoute path="/admin" component={AdminDashboard} />
        <AdminRoute path="/admin/documents" component={AdminDocuments} />
        <AdminRoute path="/admin/users" component={UserManagement} />
        <AdminRoute path="/admin/reports" component={Reports} />
        <ProtectedRoute path="/documents" component={ClientDocuments} />
        <ProtectedRoute path="/settings" component={Settings} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-x-hidden">
          <Router />
          <Toaster />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;