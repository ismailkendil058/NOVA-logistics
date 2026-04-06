import { useState, useMemo } from "react";
import { getSales, formatDZD } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer } from "recharts";

export default function AnalytiquePage() {
  const [sales] = useState(getSales);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [day, setDay] = useState<string>("");

  const monthlySales = useMemo(() => {
    const prefix = day ? `${month}-${day.padStart(2, "0")}` : month;
    return sales.filter(s => s.date.startsWith(prefix));
  }, [sales, month, day]);

  // All calendar days of the selected month
  const daysInMonth = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    const totalDays = new Date(year, m, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );
  }, [month]);

  const totalRevenue = monthlySales.reduce((s, sale) => s + sale.total, 0);
  const totalTeinte = monthlySales.reduce((s, sale) => s + sale.teinteAmount, 0);
  const totalCost = monthlySales.reduce((s, sale) => {
    return s + sale.items.reduce((is, item) => is + item.product.priceBuy * item.quantity, 0);
  }, 0);
  const profit = totalRevenue - totalCost;

  const dailyData = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; teinte: number }>();
    monthlySales.forEach(sale => {
      const day = sale.date.slice(0, 10);
      const existing = map.get(day) || { revenue: 0, cost: 0, teinte: 0 };
      existing.revenue += sale.total;
      existing.teinte += sale.teinteAmount;
      existing.cost += sale.items.reduce((s, i) => s + i.product.priceBuy * i.quantity, 0);
      map.set(day, existing);
    });
    return Array.from(map.entries()).map(([date, data]) => ({
      date: new Date(date).getDate().toString(),
      ...data,
      profit: data.revenue - data.cost,
    })).sort((a, b) => Number(a.date) - Number(b.date));
  }, [monthlySales]);

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Analytique</h2>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            className="w-48 bg-white border-gray-200 h-12 shadow-sm rounded-xl font-bold focus-visible:ring-0 text-[#3f5362]"
            value={month}
            onChange={e => { setMonth(e.target.value); setDay(""); }}
          />
          <div className="relative flex items-center">
            <select
              className="appearance-none w-44 h-12 px-4 pr-9 bg-white border border-gray-200 rounded-xl font-bold text-[#3f5362] shadow-sm focus:outline-none focus:ring-0 text-sm cursor-pointer"
              value={day}
              onChange={e => setDay(e.target.value)}
            >
              <option value="">Tout le mois</option>
              {daysInMonth.map(d => (
                <option key={d} value={d}>
                  {new Date(`${month}-${d}`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 text-gray-400 text-xs">▾</span>
          </div>
          {day && (
            <button
              onClick={() => setDay("")}
              className="h-12 px-4 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-200 transition-colors shadow-sm font-bold text-lg"
              title="Effacer le filtre jour"
            >×</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: "Chiffre d'affaires", value: formatDZD(totalRevenue), color: "text-[#3f5362]" },
          { label: "Coût d'achat", value: formatDZD(totalCost), color: "text-red-500" },
          { label: "Bénéfice", value: formatDZD(profit), color: "text-[#41b86d]" },
          { label: "La Teinte", value: formatDZD(totalTeinte), color: "text-[#628b9a]" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Sales list */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100">
          <h4 className="font-bold text-sm text-[#3f5362]">
            Historique des Ventes — {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
          </h4>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr>
              <th className="text-center px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Date</th>
              <th className="text-center px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Type</th>
              <th className="text-center px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Produits</th>
              <th className="text-center px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthlySales.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-16 text-gray-400 font-medium">Aucune vente ce mois</td></tr>
            ) : (
              monthlySales.map(sale => (
                <tr key={sale.id} className="border-t border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-medium">{new Date(sale.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex justify-center items-center ${sale.type === 'bon' ? 'bg-[#628b9a]/10 text-[#628b9a]' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                      {sale.type === 'bon' ? 'BON' : 'Directe'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-bold">{sale.items.map(i => i.product.name).join(', ')}</td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatDZD(sale.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
