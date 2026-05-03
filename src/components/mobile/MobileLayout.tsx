import { BarChart3, FileText, Package, Receipt, ShoppingCart, Wallet, Store, ArrowLeftRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
// MULTI-STORE: Import Store context
import { useStore } from "@/lib/StoreContext";

const mobileNavItems = [
  { title: "Caisse", url: "/", icon: ShoppingCart },
  { title: "Bons", url: "/bons", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
  { title: "Crédit", url: "/credit", icon: Wallet },
  { title: "Stock", url: "/inventaire", icon: Package },
  { title: "Stats", url: "/analytique", icon: BarChart3 },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { currentStore, setStore } = useStore();

  return (
    <div className="min-h-screen bg-[#eef5f4] text-gray-900 flex flex-col">
      {/* MULTI-STORE: Mobile Header for active store */}
      {currentStore && (
        <div className="bg-[#243740] w-full px-4 py-2 flex items-center justify-between z-50 sticky top-0 shadow-md">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[#41b86d]" />
            <div>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider leading-tight">Magasin</p>
              <p className="text-xs font-black text-white leading-tight">{currentStore.name}</p>
            </div>
          </div>
          <button
            onClick={() => setStore(null)}
            className="flex items-center gap-1 bg-[#41b86d]/20 hover:bg-[#41b86d]/30 text-[#41b86d] px-2 py-1.5 rounded-lg transition-colors text-[10px] font-bold"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Changer
          </button>
        </div>
      )}
      <main className="mobile-safe-bottom flex-1">{children}</main>
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-t-[2rem] border border-white/70 bg-[#243740]/95 px-4 py-3 shadow-[0_-14px_40px_rgba(20,32,39,0.18)] backdrop-blur-xl">
          {mobileNavItems.map(item => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition-all ${isActive ? "bg-[#41b86d] text-white shadow-[0_10px_24px_rgba(65,184,109,0.28)]" : "text-white/70"
                  }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={2.2} />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
