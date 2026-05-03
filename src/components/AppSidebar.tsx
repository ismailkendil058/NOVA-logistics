import { ShoppingCart, FileText, Package, BarChart3, Receipt, Wallet, Store, ArrowLeftRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
// MULTI-STORE: Import useStore
import { useStore } from "@/lib/StoreContext";
import { Button } from "./ui/button";

const navItems = [
  { title: "Caisse", url: "/", icon: ShoppingCart },
  { title: "Crédit", url: "/credit", icon: Wallet },
  { title: "Bons", url: "/bons", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
  { title: "Inventaire", url: "/inventaire", icon: Package },
  { title: "Analytique", url: "/analytique", icon: BarChart3 },
];

export function AppSidebar() {
  const location = useLocation();
  // MULTI-STORE: Access current store and setStore
  const { currentStore, setStore } = useStore();

  return (
    <aside className="w-60 min-h-screen bg-white flex flex-col border-r border-gray-200 shadow-sm z-20 font-sans">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 border-b border-gray-100 flex flex-col items-start relative">
        <h1 className="text-[28px] font-black tracking-tighter text-[#3f5362]">
          NOVA<span className="text-[#41b86d]">DECO</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-400 mt-1 tracking-[0.2em] uppercase">
          Décoration Intérieure
        </p>

        {/* MULTI-STORE: Display Current Store properly */}
        {currentStore && (
          <div className="mt-6 p-3 bg-[#f0fbf4] border border-[#a3e4be] rounded-xl w-full relative group">
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-4 w-4 text-[#39a05f]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#39a05f]">Magasin Actif</span>
            </div>
            <p className="text-xs font-black text-gray-800 leading-tight">
              {currentStore.name}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStore(null)}
              className="absolute -bottom-3 right-2 h-7 rounded-lg bg-white border border-gray-200 text-[10px] text-gray-500 hover:text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity gap-1"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Changer
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 group font-bold ${isActive
                ? "bg-[#41b86d] text-white shadow-[0_4px_14px_0_rgba(65,184,109,0.39)] hover:-translate-y-0.5"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              activeClassName=""
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-[#41b86d]"}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="tracking-wide">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">© 2026 Nova Deco · Algérie</p>
      </div>
    </aside>
  );
}
