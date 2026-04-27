import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, AlertTriangle, TrendingUp, Wallet, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProducts, CATEGORIES, saveProducts, Product } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";

// Custom formatter for Inventaire to remove .00
const formatPrice = (amount: number) => {
  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + " DZD";
};

export default function InventairePage() {
  const [products, setProducts] = useState(getProducts);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const isMobile = useIsMobile();

  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  const totals = useMemo(() => {
    return products.reduce((acc, p) => ({
      buy: acc.buy + (p.stock * p.priceBuy),
      sale: acc.sale + (p.stock * p.priceSale)
    }), { buy: 0, sale: 0 });
  }, [products]);

  const updateMinStock = (id: string, value: number) => {
    const updated = products.map(p => p.id === id ? { ...p, minStock: value } : p);
    setProducts(updated);
    saveProducts(updated);
  };

  const handleEditSave = () => {
    if (!editingProduct) return;
    const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    setProducts(updated);
    saveProducts(updated);
    setEditingProduct(null);
  };

  const confirmDelete = () => {
    if (!productToDelete) return;
    const updated = products.filter(p => p.id !== productToDelete.id);
    setProducts(updated);
    saveProducts(updated);
    setProductToDelete(null);
    setEditingProduct(null);
  };

  function renderDeleteDialog() {
    if (!productToDelete) return null;
    return (
      <Dialog open={!!productToDelete} onOpenChange={(o) => !o && setProductToDelete(null)}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-black text-[#243740]">Supprimer le produit ?</DialogTitle>
            <DialogDescription className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer <span className="font-bold text-[#243740]">"{productToDelete.name}"</span> ? Cette action est irréversible.
            </DialogDescription>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={confirmDelete}
              className="h-12 w-full rounded-2xl bg-red-500 font-bold text-white hover:bg-red-600 shadow-lg shadow-red-200"
            >
              Oui, supprimer
            </Button>
            <Button
              variant="ghost"
              onClick={() => setProductToDelete(null)}
              className="h-12 w-full rounded-2xl font-bold text-gray-400 hover:bg-gray-50"
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function renderEditDialog() {
    if (!editingProduct) return null;
    return (
      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent className="max-w-md rounded-3xl border-0 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#243740]">Modifier le produit</DialogTitle>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nom du produit</label>
              <Input
                value={editingProduct.name}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Catégorie</label>
              <Select value={editingProduct.category} onValueChange={(v: any) => setEditingProduct({ ...editingProduct, category: v })}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prix Achat</label>
                <Input
                  type="number"
                  value={editingProduct.priceBuy}
                  onChange={e => setEditingProduct({ ...editingProduct, priceBuy: Number(e.target.value) })}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prix Vente</label>
                <Input
                  type="number"
                  value={editingProduct.priceSale}
                  onChange={e => setEditingProduct({ ...editingProduct, priceSale: Number(e.target.value) })}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock</label>
                <Input
                  type="number"
                  value={editingProduct.stock}
                  onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Alerte (Q)</label>
                <Input
                  type="number"
                  value={editingProduct.minStock}
                  onChange={e => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Unité</label>
              <Select value={editingProduct.unit || "unité"} onValueChange={(v: any) => setEditingProduct({ ...editingProduct, unit: v })}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50">
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                  <SelectItem value="unité">Unité</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Péremption</label>
              <Input
                type="date"
                value={editingProduct.expiryDate || ""}
                onChange={e => setEditingProduct({ ...editingProduct, expiryDate: e.target.value })}
                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setProductToDelete(editingProduct)}
                className="h-12 flex-1 rounded-2xl border-red-50 bg-red-50 font-bold text-red-500 hover:bg-red-100 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
              <Button
                onClick={handleEditSave}
                className="h-12 flex-[2] rounded-2xl bg-[#41b86d] font-bold text-white hover:bg-[#39a05f]"
              >
                Appliquer les modifs
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Inventaire Global</p>
            <div className="mt-3 grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Valeur Achat</p>
                <p className="text-lg font-black text-orange-400">{formatPrice(totals.buy)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Valeur Vente</p>
                <p className="text-lg font-black text-[#41b86d]">{formatPrice(totals.sale)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Stock mobile</h2>
                <p className="mt-1 text-sm text-white/70">{filtered.length} produit{filtered.length !== 1 ? "s" : ""} visible{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Alertes</p>
                <p className="text-lg font-black">{filtered.filter(product => product.stock <= (product.minStock ?? 5)).length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Rechercher un produit..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-[#f7fbfa] pl-11 text-sm font-medium shadow-none focus-visible:ring-0 outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="mobile-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCatFilter("")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${!catFilter ? "bg-[#41b86d] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
              >
                Toutes
              </button>
              {CATEGORIES.map(category => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setCatFilter(category.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${catFilter === category.key ? "bg-[#243740] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[#c9dcda] bg-white px-4 py-10 text-center text-sm font-medium text-gray-400">
                Aucun produit ne correspond aux filtres.
              </div>
            ) : (
              filtered.map(product => {
                const category = CATEGORIES.find(item => item.key === product.category);
                const isLow = product.stock <= (product.minStock ?? 5);
                return (
                  <article key={product.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black leading-tight text-[#243740]">{product.name}</p>
                          <button onClick={() => setEditingProduct(product)} className="text-gray-400 hover:text-[#41b86d]">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 inline-flex rounded-full bg-[#eef5f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#628b9a]">
                          {category?.label}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="rounded-2xl bg-gray-50 px-3 py-2 text-center border border-gray-100">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Q</p>
                          <input
                            type="number"
                            value={product.minStock ?? 5}
                            onChange={(e) => updateMinStock(product.id, parseInt(e.target.value) || 0)}
                            className="bg-transparent text-lg font-black text-[#243740] w-10 text-center focus:outline-none"
                          />
                        </div>
                        <div className={`rounded-2xl px-3 py-2 text-center ${isLow ? "bg-red-50 text-red-500" : "bg-[#ecf8f0] text-[#41b86d]"}`}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Stock</p>
                          <p className="text-lg font-black">{product.stock}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3 border border-gray-50">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix vente</p>
                        <p className="mt-1 text-sm font-black text-[#41b86d]">{formatPrice(product.priceSale)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3 border border-gray-50">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix achat</p>
                        <p className="mt-1 text-sm font-black text-orange-600">{formatPrice(product.priceBuy)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#f7fbfa] px-3 py-3 border border-gray-50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Péremption</p>
                      <p className="mt-1 text-sm font-semibold text-gray-600 truncate">
                        {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("fr-FR") : "—"}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
        {renderEditDialog()}
        {renderDeleteDialog()}
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Inventaire</h2>

        <div className="flex gap-4">
          <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Achat</p>
              <p className="text-xl font-black text-orange-600">{formatPrice(totals.buy)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#ecf8f0] text-[#41b86d] flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Vente</p>
              <p className="text-xl font-black text-[#41b86d]">{formatPrice(totals.sale)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-sm:w-full max-w-sm">
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
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-left pl-8">Produit</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Catégorie</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Stock</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Q</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Prix d'achat</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Prix de vente</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Péremption</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-right pr-10">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cat = CATEGORIES.find(c => c.key === p.category);
              const isLow = p.stock <= (p.minStock ?? 5);
              return (
                <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-700 text-left pl-8">{p.name}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-black uppercase tracking-wider">{cat?.label}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded font-black ${isLow ? 'bg-red-100 text-red-600' : 'text-gray-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      value={p.minStock ?? 5}
                      onChange={(e) => updateMinStock(p.id, parseInt(e.target.value) || 0)}
                      className="w-12 bg-gray-50 border border-gray-100 rounded px-1 py-0.5 text-center font-bold text-[#243740] focus:ring-1 focus:ring-[#41b86d] outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 text-center font-black text-orange-600">{formatPrice(p.priceBuy)}</td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatPrice(p.priceSale)}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium text-center">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-6 py-4 text-right pr-6">
                    <Button onClick={() => setEditingProduct(p)} variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 hover:bg-[#41b86d]/10 text-gray-400 hover:text-[#41b86d]">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setProductToDelete(p)} variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 hover:bg-red-50 text-gray-400 hover:text-red-500 ml-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {renderEditDialog()}
      {renderDeleteDialog()}
    </div>
  );
}
