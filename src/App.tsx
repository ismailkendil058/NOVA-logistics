import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import CaissePage from "./pages/CaissePage";
import BonsPage from "./pages/BonsPage";
import FacturesPage from "./pages/FacturesPage";
import InventairePage from "./pages/InventairePage";
import AnalytiquePage from "./pages/AnalytiquePage";
import CreditPage from "./pages/CreditPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
