import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getProducts, formatDZD, CATEGORIES } from "@/lib/store";

export default function InventairePage() {
  const [products] = useState(getProducts);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Inventaire</h2>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input placeholder="Rechercher un produit..." className="pl-12 bg-white border-gray-200 h-12 shadow-sm rounded-xl focus-visible:ring-0 text-sm font-medium" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-4 py-2 h-12 bg-white rounded-xl shadow-sm border border-gray-200 text-sm font-bold text-gray-600 focus:outline-none" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Produit</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Catégorie</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Stock</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Prix de vente</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Unité</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Péremption</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cat = CATEGORIES.find(c => c.key === p.category);
              return (
                <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-700 text-center">{p.name}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-black uppercase tracking-wider">{cat?.label}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded font-black ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'text-gray-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatDZD(p.priceSale)}</td>
                  <td className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] text-center">{p.unit}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium text-center">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
