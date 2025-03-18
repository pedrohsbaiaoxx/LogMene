import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import ClientHomePage from "@/pages/client/home-page";
import CompanyHomePage from "@/pages/company/home-page";
import NewRequestPage from "@/pages/client/new-request";
import RequestDetailsPage from "@/pages/client/request-details";
import CreateQuotePage from "@/pages/company/create-quote";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Client routes */}
      <ProtectedRoute 
        path="/" 
        component={() => (
          user?.role === "client" ? <ClientHomePage /> : <CompanyHomePage />
        )} 
      />
      <ProtectedRoute 
        path="/requests/new" 
        component={NewRequestPage} 
        allowedRoles={["client"]} 
      />
      <ProtectedRoute 
        path="/requests/:id" 
        component={RequestDetailsPage} 
        allowedRoles={["client"]} 
      />
      
      {/* Company routes */}
      <ProtectedRoute 
        path="/company/quotes/:requestId" 
        component={CreateQuotePage} 
        allowedRoles={["company"]} 
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
