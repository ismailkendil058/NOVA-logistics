import { useState, useMemo, useCallback } from "react";
import { Search, Plus, Minus, Trash2, Paintbrush, Percent, PaintBucket, Hammer, Pipette, Frame, SprayCan, Wrench, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getProducts, CartItem, Product, CategoryType, CATEGORIES,
  formatDZD, generateId, addSale, addBon, updateProductStock
} from "@/lib/store";

const categoryIcons: Record<CategoryType, React.ElementType> = {
  satine: PaintBucket,
  enduit: Hammer,
  vinyle: Pipette,
  decor: Frame,
  fixateur: SprayCan,
  accessoires: Wrench,
};

const categoryColors: Record<CategoryType, string> = {
  satine: "bg-[#9bc7d8] hover:bg-[#8ab8c9] text-white",
  enduit: "bg-[#628b9a] hover:bg-[#527b8a] text-white",
  vinyle: "bg-[#5a626a] hover:bg-[#4a525a] text-white",
  decor: "bg-[#a686b8] hover:bg-[#9676a8] text-white",
  fixateur: "bg-[#e26c6d] hover:bg-[#d25c5d] text-white",
  accessoires: "bg-[#e6a861] hover:bg-[#d69851] text-white",
};

export default function CaissePage() {
  const [products] = useState(getProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>(null);
  const [teinteAmount, setTeinteAmount] = useState(0);
  const [reduction, setReduction] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTeinte, setShowTeinte] = useState(false);
  const [showReduction, setShowReduction] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [tempTeinte, setTempTeinte] = useState("");
  const [tempReduction, setTempReduction] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !activeCategory || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c => c.product.id === product.id
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * product.priceSale }
          : c
        );
      }
      return [...prev, { product, quantity: 1, subtotal: product.priceSale }];
    });
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== id) return c;
      const newQty = Math.max(0, c.quantity + delta);
      return { ...c, quantity: newQty, subtotal: newQty * c.product.priceSale };
    }).filter(c => c.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const total = subtotal + teinteAmount - reduction;

  const handleCheckout = (type: 'direct' | 'bon') => {
    const saleId = generateId();
    cart.forEach(item => updateProductStock(item.product.id, -item.quantity));

    if (type === 'direct') {
      addSale({ id: saleId, type: 'direct', items: [...cart], teinteAmount, reduction, total, date: new Date().toISOString() });
    } else {
      const bonId = generateId();
      const bonNumber = `BON-${Date.now().toString().slice(-6)}`;
      addBon({ id: bonId, number: bonNumber, clientName, clientPhone, items: [...cart], teinteAmount, reduction, total, date: new Date().toISOString(), status: 'en_cours' });
      addSale({ id: saleId, type: 'bon', bonId, items: [...cart], teinteAmount, reduction, total, date: new Date().toISOString() });
    }

    setCart([]);
    setTeinteAmount(0);
    setReduction(0);
    setClientName("");
    setClientPhone("");
    setShowCheckout(false);
  };

  return (
    <div className="flex h-screen animate-fade-in bg-[#f4f8f8] font-sans">
      {/* Left panel — Products */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 border-r border-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-800">Caisse</h2>
            <p className="text-sm font-medium text-gray-500">Point de vente</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5 bg-white rounded-md shadow-sm border border-gray-100">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Rechercher des produits par mots-clés..."
            className="pl-11 bg-transparent border-0 h-12 text-sm focus-visible:ring-0 shadow-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto rounded-lg mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
            {filteredProducts.map(product => {
              const Icon = categoryIcons[product.category] || Package;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border border-gray-100 rounded-lg p-3 text-left hover:border-gray-300 hover:shadow-md transition-all duration-200 group relative flex flex-col min-h-[140px] items-center justify-between"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {product.stock}
                  </span>
                  <div className="flex-1 flex items-center justify-center pt-3 pb-1 w-full">
                    <Icon className="h-10 w-10 text-gray-400 group-hover:text-gray-600 group-hover:scale-110 transition-all drop-shadow-sm" strokeWidth={1.5} />
                  </div>
                  <div className="w-full border-t border-gray-100 pt-2 flex flex-col h-14 justify-end">
                    <p className="text-xs font-medium text-gray-700 leading-tight mb-1 line-clamp-2 text-center" title={product.name}>{product.name}</p>
                    <p className="text-sm font-bold text-[#41b86d] text-center">{formatDZD(product.priceSale)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filters */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-gray-200">

          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className={`py-4 rounded-lg transition-all flex flex-col items-center justify-center gap-1 shadow-sm border border-transparent ${categoryColors[cat.key]} ${activeCategory === cat.key ? 'ring-4 ring-black/10 scale-[0.98]' : 'hover:-translate-y-0.5'}`}
            >
              <div className="text-[9px] opacity-80 uppercase tracking-wider">{cat.labelAr}</div>
              <span className="font-semibold text-xs tracking-wide">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — Cart */}
      <div className="w-[400px] flex flex-col bg-white border-l border-gray-200 z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h3 className="text-xl font-bold tracking-tight text-gray-800">Panier</h3>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto bg-[#fafcfc]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCartEmpty />
              <p className="text-sm mt-4 font-medium">Le panier est vide</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 p-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-50 mb-2 group transition-all hover:border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDZD(item.product.priceSale)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="h-7 w-7 rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 text-gray-500 transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-700">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="h-7 w-7 rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 text-gray-500 transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <p className="text-sm font-bold text-gray-800">{formatDZD(item.subtotal)}</p>
                    <button onClick={() => removeItem(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors bg-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="p-6 bg-white border-t border-gray-100 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium tracking-wide">Sous-total</span>
              <span className="font-semibold text-gray-700">{formatDZD(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded -mx-2">
              <button onClick={() => { setTempTeinte(teinteAmount.toString()); setShowTeinte(true); }} className="flex items-center gap-2 text-[#628b9a] hover:underline text-sm font-semibold">
                <Paintbrush className="h-4 w-4" />
                La Teinte
              </button>
              <span className="font-semibold text-gray-700">{teinteAmount > 0 ? `+${formatDZD(teinteAmount)}` : '—'}</span>
            </div>

            <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded -mx-2">
              <button onClick={() => { setTempReduction(reduction.toString()); setShowReduction(true); }} className="flex items-center gap-2 text-[#628b9a] hover:underline text-sm font-semibold">
                <Percent className="h-4 w-4" />
                Réduction
              </button>
              <span className="font-semibold text-gray-700">{reduction > 0 ? `-${formatDZD(reduction)}` : '—'}</span>
            </div>
          </div>

          <div className="h-px bg-gray-200 w-full" />

          <div className="flex justify-between items-end pb-2">
            <div>
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Total à payer</span>
              <span className="text-[10px] text-gray-400">TVA(19%) Comprise</span>
            </div>
            <span className="text-3xl font-black text-[#41b86d] tracking-tight">{formatDZD(total)}</span>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold bg-[#41b86d] hover:bg-[#39a05f] text-white shadow-[0_4px_14px_0_rgba(65,184,109,0.39)] hover:shadow-[0_6px_20px_rgba(65,184,109,0.23)] hover:-translate-y-0.5 transition-all rounded-lg disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            ENCAISSER
          </Button>
        </div>
      </div>

      {/* Checkout modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-3">Encaissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="bg-[#f0fbf4] border border-[#a3e4be] p-6 rounded-xl">
              <p className="text-center text-3xl font-black text-[#39a05f]">{formatDZD(total)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2 rounded-xl border-gray-200 hover:border-[#41b86d] hover:bg-[#41b86d]/5 transition-all" onClick={() => handleCheckout('direct')}>
                <span className="text-sm font-bold text-gray-700">Vente Directe</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 rounded-xl border-[#628b9a] text-[#628b9a] hover:bg-[#628b9a]/5 transition-all" onClick={() => { }}>
                <span className="text-sm font-bold">BON</span>
              </Button>
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informations Client (Bon)</h4>
              <Input placeholder="Nom complet du client" className="bg-gray-50 border-gray-200 h-11" value={clientName} onChange={e => setClientName(e.target.value)} />
              <Input placeholder="Numéro de téléphone" className="bg-gray-50 border-gray-200 h-11" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
              <Button className="w-full h-12 mt-2 bg-[#628b9a] hover:bg-[#527b8a] text-white font-bold rounded-lg" onClick={() => handleCheckout('bon')} disabled={!clientName}>
                Confirmer le Bon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teinte modal */}
      <Dialog open={showTeinte} onOpenChange={setShowTeinte}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">La Teinte</DialogTitle>
          </DialogHeader>
          <Input type="number" placeholder="Montant en DZD" className="h-11 border-gray-200" value={tempTeinte} onChange={e => setTempTeinte(e.target.value)} />
          <Button onClick={() => { setTeinteAmount(Number(tempTeinte) || 0); setShowTeinte(false); }} className="w-full h-11 mt-2 bg-[#628b9a] hover:bg-[#527b8a] text-white font-bold">Appliquer</Button>
        </DialogContent>
      </Dialog>

      {/* Reduction modal */}
      <Dialog open={showReduction} onOpenChange={setShowReduction}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Réduction</DialogTitle>
          </DialogHeader>
          <Input type="number" placeholder="Montant en DZD" className="h-11 border-gray-200" value={tempReduction} onChange={e => setTempReduction(e.target.value)} />
          <Button onClick={() => { setReduction(Number(tempReduction) || 0); setShowReduction(false); }} className="w-full h-11 mt-2 bg-[#628b9a] hover:bg-[#527b8a] text-white font-bold">Appliquer</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

