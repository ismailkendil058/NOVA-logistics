import { useState, useMemo } from "react";
import { Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBons, Bon, formatDZD } from "@/lib/store";

export default function BonsPage() {
  const [bons] = useState(getBons);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBon, setSelectedBon] = useState<Bon | null>(null);

  const filtered = useMemo(() => {
    return bons.filter(b => {
      const matchSearch = !search || b.clientName.toLowerCase().includes(search.toLowerCase()) || b.number.includes(search);
      const matchDate = !dateFilter || b.date.startsWith(dateFilter);
      return matchSearch && matchDate;
    });
  }, [bons, search, dateFilter]);

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Bons de Vente</h2>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input placeholder="Rechercher par nom ou n° de bon..." className="pl-12 bg-white border-gray-200 h-12 shadow-sm rounded-xl focus-visible:ring-0 text-sm font-medium" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="w-48 bg-white border-gray-200 h-12 shadow-sm rounded-xl font-medium focus-visible:ring-0" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">N° Bon</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Client</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Téléphone</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Date</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Total</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Statut</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 font-medium">Aucun bon trouvé</td></tr>
            ) : (
              filtered.map(bon => (
                <tr key={bon.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-gray-500 text-center">{bon.number}</td>
                  <td className="px-6 py-4 font-bold text-gray-700 text-center">{bon.clientName}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">{bon.clientPhone}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">{new Date(bon.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatDZD(bon.total)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${bon.status === 'payé' ? 'bg-[#41b86d]/10 text-[#41b86d]' : 'bg-[#628b9a]/10 text-[#628b9a]'}`}>
                      {bon.status === 'payé' ? 'Payé' : 'En cours'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-[#41b86d] hover:bg-[#41b86d]/10 transition-colors" onClick={() => setSelectedBon(bon)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedBon} onOpenChange={() => setSelectedBon(null)}>
        <DialogContent className="sm:max-w-lg bg-white border-0 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-4 tracking-tight">Détail du Bon <span className="text-gray-400 font-mono text-lg ml-2">{selectedBon?.number}</span></DialogTitle>
          </DialogHeader>
          {selectedBon && (
            <div className="space-y-6 pt-2">
              <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4 text-sm font-medium">
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Client</span> <span className="font-bold">{selectedBon.clientName}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Téléphone</span> {selectedBon.clientPhone}</div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Date</span> {new Date(selectedBon.date).toLocaleDateString('fr-FR')}</div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Statut</span> <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${selectedBon.status === 'payé' ? 'bg-[#41b86d]/10 text-[#41b86d]' : 'bg-[#628b9a]/10 text-[#628b9a]'}`}>{selectedBon.status}</span></div>
              </div>
              <div className="space-y-3 px-1">
                {selectedBon.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-2 border border-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 text-sm">{item.product.name} <span className="text-gray-400 font-medium ml-2">× {item.quantity}</span></span>
                    <span className="font-bold text-gray-600">{formatDZD(item.subtotal)}</span>
                  </div>
                ))}
                {selectedBon.teinteAmount > 0 && (
                  <div className="space-y-2 px-2 pt-2">
                    <div className="flex justify-between font-bold text-sm text-[#41b86d]">
                      <span>La Teinte</span>
                      <span>+{formatDZD(selectedBon.teinteAmount)}</span>
                    </div>
                    {selectedBon.teinteEntries?.length > 0 && (
                      <div className="space-y-1 text-[11px] text-[#41b86d]">
                        {selectedBon.teinteEntries.map((entry, index) => (
                          <div key={index} className="flex justify-between gap-2">
                            <span>Teinte {index + 1} • {entry.kg} kg</span>
                            <span>{formatDZD(entry.unitPrice)} / kg</span>
                            <span>{formatDZD(entry.unitPrice * entry.kg)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {selectedBon.reduction > 0 && (
                  <div className="flex justify-between font-bold text-sm text-red-500 px-2 pt-1">
                    <span>Réduction</span>
                    <span>-{formatDZD(selectedBon.reduction)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xl font-black">
                <span className="text-gray-800">Total</span>
                <span className="text-[#39a05f]">{formatDZD(selectedBon.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
