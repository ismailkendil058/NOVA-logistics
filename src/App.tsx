import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
// MULTI-STORE: Import Store components
import { StoreProvider, useStore } from "./lib/StoreContext";
import StoreSelector from "./pages/StoreSelector";

import CaissePage from "./pages/CaissePage";
import BonsPage from "./pages/BonsPage";
import FacturesPage from "./pages/FacturesPage";
import InventairePage from "./pages/InventairePage";
import AnalytiquePage from "./pages/AnalytiquePage";
import CreditPage from "./pages/CreditPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// MULTI-STORE: Component to protect dashboard routes
const ProtectedApp = () => {
  const { currentStore, isLoading } = useStore();

  if (isLoading) return null; // or a loader

  // If no store is selected, force them to select one
  if (!currentStore) {
    return <Navigate to="/select-store" replace />;
  }

  // If a store is selected, render the dashboard layout
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CaissePage />} />
        <Route path="/bons" element={<BonsPage />} />
        <Route path="/factures" element={<FacturesPage />} />
        <Route path="/credit" element={<CreditPage />} />
        <Route path="/inventaire" element={<InventairePage />} />
        <Route path="/analytique" element={<AnalytiquePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MULTI-STORE: Wrap the application with StoreProvider */}
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* MULTI-STORE: Store selector route is unprotected and outside the main Layout */}
            <Route path="/select-store" element={<StoreSelector />} />
            {/* All other routes go through the protected App */}
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
