import { ShoppingCart, FileText, Package, BarChart3, Receipt } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Caisse", url: "/", icon: ShoppingCart },
  { title: "Bons", url: "/bons", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
  { title: "Inventaire", url: "/inventaire", icon: Package },
  { title: "Analytique", url: "/analytique", icon: BarChart3 },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-72 min-h-screen bg-white flex flex-col border-r border-gray-200 shadow-sm z-20 font-sans">
      {/* Logo */}
      <div className="px-8 py-10 border-b border-gray-100 flex flex-col items-start">
        <h1 className="text-3xl font-black tracking-tighter text-[#3f5362]">
          NOVA<span className="text-[#41b86d]">DECO</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-400 mt-1 tracking-[0.2em] uppercase">
          Décoration Intérieure
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-200 group font-bold ${isActive
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
      <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">© 2026 Nova Deco · Algérie</p>
      </div>
    </aside>
  );
}
