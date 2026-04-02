import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { CallProvider } from "@/contexts/CallContext";
import { CallModals } from "@/components/calls/CallModals";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TrackPage from "./pages/TrackPage";
import LeadsPage from "./pages/LeadsPage";
import SellersPage from "./pages/SellersPage";
import SettingsPage from "./pages/SettingsPage";
import InterviewsPage from "./pages/InterviewsPage";
import InterviewFormPage from "./pages/InterviewFormPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { UtmGenerator } from "@/components/utm/UtmGenerator";
import { WhatsAppCRM } from "@/components/whatsapp/WhatsAppCRM";
import { SalesFunnel } from "@/components/funnel/SalesFunnel";
import { PostSaleFunnel } from "@/components/funnel/PostSaleFunnel";
import AgendaPage from "./pages/AgendaPage";
import MarketingPage from "./pages/MarketingPage";
import MarketingCampaignsPage from "./pages/MarketingCampaignsPage";
import MarketingCreativesPage from "./pages/MarketingCreativesPage";
import MetasPage from "./pages/MetasPage";
import PipelineVendasPage from "./pages/PipelineVendasPage";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { SetupRequired } from "@/components/setup/SetupRequired";

const queryClient = new QueryClient();

// Error boundary to catch HMR-related React hook errors
class CallProviderBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    if (error.message.includes('Should have a queue')) {
      // HMR corruption -- force remount
      setTimeout(() => this.setState({ hasError: false }), 0);
    }
  }
  render() {
    if (this.state.hasError) return <>{this.props.children}</>;
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AuthenticatedCallProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <CallProviderBoundary>
      <CallProvider>
        <CallModals />
        {children}
      </CallProvider>
    </CallProviderBoundary>
  );
}

const App = () => {
  if (!isSupabaseConfigured) {
    return <SetupRequired />;
  }

  return (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthenticatedCallProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/utm-generator" element={<ProtectedRoute><UtmGenerator /></ProtectedRoute>} />
              <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppCRM /></ProtectedRoute>} />
              <Route path="/funnel" element={<ProtectedRoute><SalesFunnel /></ProtectedRoute>} />
              <Route path="/post-sale" element={<ProtectedRoute><PostSaleFunnel /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
              <Route path="/sellers" element={<ProtectedRoute><SellersPage /></ProtectedRoute>} />
              <Route path="/interviews" element={<ProtectedRoute><InterviewsPage /></ProtectedRoute>} />
              <Route path="/interview/:token" element={<InterviewFormPage />} />
              <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
              <Route path="/marketing/campaigns" element={<ProtectedRoute><MarketingCampaignsPage /></ProtectedRoute>} />
              <Route path="/marketing/creatives" element={<ProtectedRoute><MarketingCreativesPage /></ProtectedRoute>} />
              <Route path="/metas" element={<ProtectedRoute><MetasPage /></ProtectedRoute>} />
              <Route path="/pipeline-vendas" element={<ProtectedRoute><PipelineVendasPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthenticatedCallProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;