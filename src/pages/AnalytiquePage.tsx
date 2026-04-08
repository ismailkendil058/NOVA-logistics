import { useMemo, useState } from "react";
import { getSales, formatDZD } from "@/lib/store";
import { Input } from "@/components/ui/input";

export default function AnalytiquePage() {
  const [sales] = useState(getSales);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [day, setDay] = useState<string>("");
  const [mobileView, setMobileView] = useState<"kpis" | "history">("kpis");
  const mobileSections = [
    { id: "kpis", label: "KPIs" },
    { id: "history", label: "Historique" },
  ] as const;

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

  const getItemPurchaseCost = (item: (typeof sales)[number]["items"][number]) => {
    const unitCost = item.customUnitCost ?? item.product.priceBuy;
    return unitCost * item.quantity;
  };

  const totalRevenue = monthlySales.reduce((s, sale) => s + sale.total, 0);
  const totalTeinte = monthlySales.reduce((s, sale) => s + sale.teinteAmount, 0);
  const totalCost = monthlySales.reduce((s, sale) => {
    return s + sale.items.reduce((is, item) => is + getItemPurchaseCost(item), 0);
  }, 0);
  const profit = totalRevenue - totalCost;

  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const dailyGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        revenue: number;
        cost: number;
        teinte: number;
        teinteEntriesCount: number;
        bonCount: number;
        directCount: number;
        productNames: Set<string>;
        sales: typeof monthlySales;
      }
    >();

    monthlySales.forEach(sale => {
      const dayKey = sale.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        teinte: 0,
        teinteEntriesCount: 0,
        bonCount: 0,
        directCount: 0,
        productNames: new Set<string>(),
        sales: [],
      };

      existing.revenue += sale.total;
      existing.teinte += sale.teinteAmount;
      const entryCount = sale.teinteEntries?.length ?? (sale.teinteAmount > 0 ? 1 : 0);
      existing.teinteEntriesCount += entryCount;
      existing.cost += sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0);
      if (sale.type === "bon") {
        existing.bonCount += 1;
      } else {
        existing.directCount += 1;
      }

      sale.items.forEach(item => existing.productNames.add(item.product.name));
      existing.sales.push(sale);
      map.set(dayKey, existing);
    });

    const groups = Array.from(map.values()).map(group => ({
      ...group,
      productList: Array.from(group.productNames),
      profit: group.revenue - group.cost,
    }));

    groups.forEach(group => {
      group.sales.sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales]);

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Analytique</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="month"
            className="w-full max-w-[220px] bg-white border-gray-200 h-12 shadow-sm rounded-xl font-bold focus-visible:ring-0 text-[#3f5362]"
            value={month}
            onChange={e => { setMonth(e.target.value); setDay(""); }}
          />
          <div className="relative flex items-center">
            <select
              className="appearance-none w-48 h-12 px-4 pr-9 bg-white border border-gray-200 rounded-xl font-bold text-[#3f5362] shadow-sm focus:outline-none focus:ring-0 text-sm cursor-pointer"
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
      <div className="lg:hidden mb-6 flex gap-2">
        {mobileSections.map(section => (
          <button
            key={section.id}
            type="button"
            onClick={() => setMobileView(section.id)}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f5362] ${mobileView === section.id ? "bg-[#3f5362] text-white border-transparent" : "bg-white text-[#3f5362] border-gray-200"}`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className={`${mobileView === "kpis" ? "block" : "hidden"} lg:block`}>
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Chiffre d'affaires", value: formatDZD(totalRevenue), color: "text-[#3f5362]" },
            { label: "Coût d'achat", value: formatDZD(totalCost), color: "text-red-500" },
            { label: "Bénéfice", value: formatDZD(profit), color: "text-[#41b86d]" },
            { label: "La Teinte", value: formatDZD(totalTeinte), color: "text-[#628b9a]" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{kpi.label}</p>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sales list */}
      <div className={`${mobileView === "history" ? "block" : "hidden"} lg:block`}>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100">
            <h4 className="font-bold text-sm text-[#3f5362]">
              Historique des Ventes — {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
            </h4>
          </div>
          <div className="hidden lg:block">
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
                ) : day ? (
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
                ) : (
                  dailyGroups.flatMap(group => {
                    const isOpen = expandedDates.includes(group.date);
                    const displayDate = new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    const previewProducts = group.productList.slice(0, 3).join(', ');
                    const extras = group.productList.length > 3 ? ` +${group.productList.length - 3} autres` : '';

                    const summaryRow = (
                      <tr
                        key={`${group.date}-summary`}
                        className="border-t border-gray-50 bg-white hover:bg-[#f4fbf9]/80 transition-colors cursor-pointer"
                        onClick={() => toggleDate(group.date)}
                        aria-expanded={isOpen}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-gray-900 font-black">{displayDate}</p>
                              <p className="text-[10px] text-gray-500">{group.sales.length} vente{group.sales.length > 1 ? 's' : ''}</p>
                            </div>
                            <span className="text-xs text-gray-400 font-black">{isOpen ? '−' : '+'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#628b9a]/10 text-[#628b9a] text-[10px] font-black uppercase tracking-widest">
                            {group.bonCount} bon{group.bonCount > 1 ? 's' : ''}
                          </div>
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#41b86d]/10 text-[#41b86d] text-[10px] font-black uppercase tracking-widest">
                            {group.directCount} directe{group.directCount > 1 ? 's' : ''}
                          </div>
                          {group.teinteEntriesCount > 0 && (
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3f5362]/10 text-[#3f5362] text-[10px] font-black uppercase tracking-widest">
                              {group.teinteEntriesCount} teinte{group.teinteEntriesCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-bold">
                          {previewProducts}
                          {extras && <span className="text-[10px] text-gray-400">{extras}</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-[#41b86d]">{formatDZD(group.revenue)}</td>
                      </tr>
                    );

                    const detailRows = isOpen
                      ? group.sales.map(sale => (
                        <tr key={sale.id} className="bg-[#f8fdf8] border-t border-gray-100">
                          <td className="px-12 py-3 text-[11px] text-gray-500">{new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-3">
                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex justify-center items-center ${sale.type === 'bon' ? 'bg-[#628b9a]/10 text-[#628b9a]' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                              {sale.type === 'bon' ? 'BON' : 'Directe'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-600 font-bold">
                            <div>{sale.items.map(i => i.product.name).join(', ')}</div>
                            {sale.teinteEntries?.length ? (
                              <div className="mt-1 text-[11px] text-[#41b86d] space-y-1">
                                {sale.teinteEntries.map((entry, idx) => (
                                  <div key={idx} className="flex justify-between gap-3">
                                    <span>Teinte {idx + 1}: {entry.kg} kg</span>
                                    <span>{formatDZD(entry.unitPrice)} / kg</span>
                                    <span>{formatDZD(entry.unitPrice * entry.kg)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : sale.teinteAmount > 0 ? (
                              <div className="mt-1 text-[11px] text-[#41b86d]">La Teinte +{formatDZD(sale.teinteAmount)}</div>
                            ) : null}
                          </td>
                          <td className="px-6 py-3 text-right font-black text-[#41b86d]">{formatDZD(sale.total)}</td>
                        </tr>
                      ))
                      : [];

                    return [summaryRow, ...detailRows];
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="block lg:hidden px-4 py-5">
            {monthlySales.length === 0 ? (
              <div className="text-center text-sm text-gray-400 font-medium py-10">Aucune vente ce mois</div>
            ) : day ? (
              <div className="space-y-4">
                {monthlySales.map(sale => (
                  <div key={sale.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{new Date(sale.date).toLocaleDateString('fr-FR')}</p>
                        <p className="text-[11px] text-gray-500">{new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${sale.type === 'bon' ? 'bg-[#628b9a]/10 text-[#628b9a]' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                        {sale.type === 'bon' ? 'BON' : 'Directe'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 font-semibold">{sale.items.map(i => i.product.name).join(', ')}</p>
                    {sale.teinteEntries?.length ? (
                      <div className="mt-3 space-y-2 text-[11px] text-[#41b86d]">
                        {sale.teinteEntries.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>Teinte {idx + 1}: {entry.kg} kg</span>
                            <span>{formatDZD(entry.unitPrice)} / kg</span>
                            <span>{formatDZD(entry.unitPrice * entry.kg)}</span>
                          </div>
                        ))}
                      </div>
                    ) : sale.teinteAmount > 0 && (
                      <p className="mt-3 text-xs text-[#41b86d] font-semibold">La Teinte +{formatDZD(sale.teinteAmount)}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-black text-[#41b86d]">{formatDZD(sale.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {dailyGroups.map(group => {
                  const isOpen = expandedDates.includes(group.date);
                  const displayDate = new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                  const previewProducts = group.productList.slice(0, 3).join(', ');
                  const extras = group.productList.length > 3 ? ` +${group.productList.length - 3} autres` : '';
                  return (
                    <div key={group.date} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleDate(group.date)}
                        className="flex w-full items-center justify-between text-left"
                        aria-expanded={isOpen}
                      >
                        <div>
                          <p className="text-sm font-black text-gray-900">{displayDate}</p>
                          <p className="text-[11px] text-gray-500">{group.sales.length} vente{group.sales.length > 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-xl font-black text-gray-400">{isOpen ? '−' : '+'}</span>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#628b9a]/10 text-[#628b9a]">
                          {group.bonCount} bon{group.bonCount > 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#41b86d]/10 text-[#41b86d]">
                          {group.directCount} directe{group.directCount > 1 ? 's' : ''}
                        </span>
                        {group.teinteEntriesCount > 0 && (
                          <span className="px-2 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#3f5362]/10 text-[#3f5362]">
                            {group.teinteEntriesCount} teinte{group.teinteEntriesCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-gray-600 font-semibold">
                        {previewProducts}
                        {extras && <span className="text-[11px] text-gray-400">{extras}</span>}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-lg font-black text-[#41b86d]">
                        <span>Recette</span>
                        <span>{formatDZD(group.revenue)}</span>
                      </div>
                      {isOpen && (
                        <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                          {group.sales.map(sale => (
                            <div key={sale.id} className="rounded-xl border border-gray-100 bg-[#f8fdf8] p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500">{new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sale.type === 'bon' ? 'bg-[#628b9a]/10 text-[#628b9a]' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                                  {sale.type === 'bon' ? 'BON' : 'Directe'}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-gray-600">{sale.items.map(i => i.product.name).join(', ')}</p>
                              {sale.teinteEntries?.length ? (
                                <div className="mt-2 space-y-1 text-[11px] text-[#41b86d]">
                                  {sale.teinteEntries.map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <span>Teinte {idx + 1}: {entry.kg} kg</span>
                                      <span>{formatDZD(entry.unitPrice)} / kg</span>
                                      <span>{formatDZD(entry.unitPrice * entry.kg)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : sale.teinteAmount > 0 && (
                                <p className="mt-2 text-xs text-[#41b86d]">La Teinte +{formatDZD(sale.teinteAmount)}</p>
                              )}
                              <div className="mt-3 flex items-center justify-between text-lg font-black text-[#41b86d]">
                                <span>Total</span>
                                <span>{formatDZD(sale.total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
