import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Plus, Minus, Trash2, Paintbrush, Percent, PaintBucket, PaintRoller, Pipette, PaintbrushVertical, Frame, Droplets, Wrench, Package, ShoppingCart, FileText, Wallet, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getProducts, CartItem, Product, CategoryType, CATEGORIES,
  formatDZD, generateId, addSale, addBon, updateProductStock, TeinteEntry,
  getCustomCards, saveCustomCards, CustomSaleCard, addCredit, getCredits, updateCredit
} from "@/lib/store";

const categoryIcons: Record<CategoryType, React.ElementType> = {
  satine: PaintBucket,
  enduit: PaintRoller,
  vinyle: Pipette,
  laque: PaintbrushVertical,
  decor: Frame,
  fixateur: Droplets,
  accessoires: Wrench,
};

const categoryColors: Record<CategoryType, string> = {
  satine: "bg-[#9bc7d8] hover:bg-[#8ab8c9] text-white",
  enduit: "bg-[#628b9a] hover:bg-[#527b8a] text-white",
  vinyle: "bg-[#5a626a] hover:bg-[#4a525a] text-white",
  laque: "bg-[#2f6b5f] hover:bg-[#22564c] text-white",
  decor: "bg-[#a686b8] hover:bg-[#9676a8] text-white",
  fixateur: "bg-[#e26c6d] hover:bg-[#d25c5d] text-white",
  accessoires: "bg-[#e6a861] hover:bg-[#d69851] text-white",
};

const customizableCategories = new Set<CategoryType>(["satine", "vinyle", "enduit", "laque", "fixateur"]);

type TempTeinteEntry = { unitPrice: string; kg: string };
const createTempTeinteEntry = (): TempTeinteEntry => ({ unitPrice: "", kg: "" });

export default function CaissePage() {
  const [products, setProducts] = useState(getProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>("satine");
  const [teinteEntries, setTeinteEntries] = useState<TeinteEntry[]>([]);
  const [reduction, setReduction] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTeinte, setShowTeinte] = useState(false);
  const [showReduction, setShowReduction] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [mobileSection, setMobileSection] = useState<"products" | "cart">("products");
  const [tempTeinteEntries, setTempTeinteEntries] = useState<TempTeinteEntry[]>([createTempTeinteEntry()]);
  const [tempReduction, setTempReduction] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<"choice" | "bon" | "credit">("choice");
  const previewTeinteAmount = tempTeinteEntries.reduce((sum, entry) => {
    const unitPrice = Number(entry.unitPrice) || 0;
    const kg = Number(entry.kg) || 0;
    return sum + unitPrice * kg;
  }, 0);
  const [customCards, setCustomCards] = useState<CustomSaleCard[]>(() => getCustomCards());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [allCredits, setAllCredits] = useState(() => getCredits());
  const uniqueClients = useMemo(() => {
    const clients: Record<string, { name: string; phone: string }> = {};
    allCredits.forEach(c => {
      clients[c.clientPhone] = { name: c.clientName, phone: c.clientPhone };
    });
    return Object.values(clients);
  }, [allCredits]);

  const clientSuggestions = useMemo(() => {
    if (!clientName && !clientPhone) return [];
    return uniqueClients.filter(c =>
      (clientName && c.name.toLowerCase().includes(clientName.toLowerCase())) ||
      (clientPhone && c.phone.includes(clientPhone))
    ).slice(0, 5);
  }, [uniqueClients, clientName, clientPhone]);
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null);
  const [customModalKg, setCustomModalKg] = useState("");
  const [customModalUnitPrice, setCustomModalUnitPrice] = useState("");
  const [activeCustomCard, setActiveCustomCard] = useState<CustomSaleCard | null>(null);
  const [customCardKg, setCustomCardKg] = useState("");
  const previewCustomTotal = (Number(customModalKg) || 0) * (Number(customModalUnitPrice) || 0);
  const previewCustomCardTotal = activeCustomCard ? (Number(customCardKg) || 0) * activeCustomCard.unitPrice : 0;
  const remainingCustomKg = activeCustomCard?.kg ?? 0;
  const getCustomCardPendingKg = useCallback((cardId: string) => {
    return cart.reduce((sum, item) => {
      if (item.customCardId !== cardId) return sum;
      return sum + (item.weightKg ?? item.quantity);
    }, 0);
  }, [cart]);
  const visibleCustomCards = useMemo(() => {
    const filtered = activeCategory ? customCards.filter(card => card.category === activeCategory) : customCards;
    return filtered.filter(card => card.kg - getCustomCardPendingKg(card.id) > 0);
  }, [customCards, activeCategory, getCustomCardPendingKg]);
  const mobileCartCount = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + (item.weightKg ?? item.quantity), 0);
    return Number.isInteger(total) ? String(total) : total.toFixed(1);
  }, [cart]);
  const sectionOptions = [
    { id: "products", label: "Produits" },
    { id: "cart", label: "Panier" },
  ] as const;
  const hasValidTempTeinteEntry = tempTeinteEntries.some(entry => (Number(entry.unitPrice) || 0) > 0 && (Number(entry.kg) || 0) > 0);
  useEffect(() => {
    saveCustomCards(customCards);
  }, [customCards]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleInventoryUpdated = () => setProducts(getProducts());
    window.addEventListener("novaInventoryUpdated", handleInventoryUpdated);
    return () => window.removeEventListener("novaInventoryUpdated", handleInventoryUpdated);
  }, []);

  const openCustomModal = (product: Product) => {
    if (product.stock <= 0) return;
    setCustomModalProduct(product);
    setCustomModalKg("");
    setCustomModalUnitPrice("");
    setShowCustomModal(true);
  };

  const closeCustomModal = () => {
    setShowCustomModal(false);
    setCustomModalProduct(null);
    setCustomModalKg("");
    setCustomModalUnitPrice("");
  };

  const getCustomPurchaseCostPerKg = (baseProduct: Product, kg: number) => {
    if (kg <= 0) return baseProduct.priceBuy;
    return baseProduct.priceBuy / kg;
  };

  const addCustomCartItem = (
    baseProduct: Product,
    kg: number,
    unitPrice: number,
    customPurchaseCostPerKg: number,
    customCardId?: string
  ) => {
    const customProduct: Product = {
      ...baseProduct,
      id: `${baseProduct.id}-custom-${Date.now()}`,
      name: `${baseProduct.name} (${kg} kg)`,
      priceSale: unitPrice,
      priceBuy: customPurchaseCostPerKg,
    };

    const newItem: CartItem = {
      product: customProduct,
      quantity: kg,
      subtotal: kg * unitPrice,
      weightKg: kg,
      customUnitPrice: unitPrice,
      customUnitCost: customPurchaseCostPerKg,
      customBaseProductId: baseProduct.id,
      customCardId,
    };

    setCart(prev => [...prev, newItem]);
  };

  const addCustomCardEntry = (baseProduct: Product, kg: number, unitPrice: number, priceBuyPerKg: number) => {
    const card: CustomSaleCard = {
      id: `${baseProduct.id}-custom-card-${Date.now()}`,
      baseProductId: baseProduct.id,
      baseProductName: baseProduct.name,
      category: baseProduct.category,
      kg,
      unitPrice,
      priceBuyPerKg,
    };
    setCustomCards(prev => [...prev, card]);
  };

  const handleCustomSaleConfirm = () => {
    if (!customModalProduct) return;
    const kg = Number(customModalKg);
    const unitPrice = Number(customModalUnitPrice);
    if (!kg || !unitPrice) return;
    const customPurchaseCostPerKg = getCustomPurchaseCostPerKg(customModalProduct, kg);

    addCustomCardEntry(customModalProduct, kg, unitPrice, customPurchaseCostPerKg);
    closeCustomModal();
  };

  const canUseCustomCard = (card: CustomSaleCard) => {
    const product = products.find(p => p.id === card.baseProductId);
    const available = card.kg - getCustomCardPendingKg(card.id);
    return !!product && product.stock > 0 && available > 0;
  };

  const handleCustomCardAdd = (card: CustomSaleCard, kgOverride?: number) => {
    const kg = kgOverride ?? card.kg;
    if (kg <= 0 || kg > card.kg) return;
    const baseProduct = products.find(p => p.id === card.baseProductId);
    if (!baseProduct || baseProduct.stock <= 0) return;
    const pending = getCustomCardPendingKg(card.id);
    if (kg > card.kg - pending) return;
    const customPurchaseCostPerKg = card.priceBuyPerKg ?? getCustomPurchaseCostPerKg(baseProduct, card.kg);
    addCustomCartItem(baseProduct, kg, card.unitPrice, customPurchaseCostPerKg, card.id);
    setActiveCustomCard(prev => {
      if (!prev || prev.id !== card.id) return prev;
      const remaining = Math.max(0, prev.kg - kg);
      return remaining > 0 ? { ...prev, kg: remaining } : null;
    });
  };

  const openCustomCardModal = (card: CustomSaleCard) => {
    if (!canUseCustomCard(card)) return;
    setActiveCustomCard(card);
    setCustomCardKg("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !search && activeCategory ? p.category === activeCategory : true;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const normalProductCartQty = (productId: string) => {
    return cart.reduce((sum, item) => {
      if (item.product.id !== productId || item.customUnitPrice) return sum;
      return sum + item.quantity;
    }, 0);
  };

  const addToCart = useCallback((product: Product) => {
    const qtyInCart = normalProductCartQty(product.id);
    if (product.stock <= qtyInCart) return;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && !c.customUnitPrice);
      if (existing) {
        return prev.map(c => c.product.id === product.id && !c.customUnitPrice
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * product.priceSale }
          : c
        );
      }
      return [...prev, { product, quantity: 1, subtotal: product.priceSale }];
    });
  }, [cart]);

  const updateQty = (id: string, delta: number) => {
    const targetProduct = products.find(p => p.id === id);
    if (!targetProduct) return;
    if (delta > 0) {
      const qtyInCart = normalProductCartQty(id);
      if (qtyInCart >= targetProduct.stock) return;
    }

    setCart(prev => prev.map(c => {
      if (c.product.id !== id) return c;
      const newQty = Math.max(0, c.quantity + delta);
      return { ...c, quantity: newQty, subtotal: newQty * c.product.priceSale };
    }).filter(c => c.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const teinteAmount = teinteEntries.reduce((s, entry) => s + entry.unitPrice * entry.kg, 0);
  const total = subtotal + teinteAmount - reduction;

  const applyCustomCardUsage = () => {
    const usage: Record<string, number> = {};
    cart.forEach(item => {
      if (!item.customCardId) return;
      usage[item.customCardId] = (usage[item.customCardId] || 0) + (item.weightKg ?? item.quantity);
    });
    if (!Object.keys(usage).length) return;
    setCustomCards(prev => {
      return prev.reduce<CustomSaleCard[]>((acc, card) => {
        const used = usage[card.id] ?? 0;
        const remaining = Math.max(0, card.kg - used);
        if (remaining > 0) {
          return [...acc, { ...card, kg: remaining }];
        }
        return acc;
      }, []);
    });
  };

  const handleCheckout = (type: 'direct' | 'bon' | 'credit') => {
    const saleId = generateId();
    cart.forEach(item => {
      const productId = item.customBaseProductId ?? item.product.id;
      updateProductStock(productId, -item.quantity);
    });
    applyCustomCardUsage();

    if (type === 'direct') {
      addSale({ id: saleId, type: 'direct', items: [...cart], teinteAmount, teinteEntries, reduction, total, date: new Date().toISOString() });
    } else if (type === 'bon') {
      const bonId = generateId();
      const bonNumber = `BON-${Date.now().toString().slice(-6)}`;
      addBon({ id: bonId, number: bonNumber, clientName, clientPhone, items: [...cart], teinteAmount, teinteEntries, reduction, total, date: new Date().toISOString() });
      addSale({ id: saleId, type: 'bon', bonId, items: [...cart], teinteAmount, teinteEntries, reduction, total, date: new Date().toISOString() });
    } else {
      const existingCredits = getCredits();
      const existingCredit = existingCredits.find(c => c.clientPhone === clientPhone);
      const initialPaid = Number(paidAmount) || 0;
      const saleId = generateId();

      if (existingCredit) {
        const updated = {
          ...existingCredit,
          items: [...(existingCredit.items || []), ...cart],
          total: existingCredit.total + total,
          teinteAmount: (existingCredit.teinteAmount || 0) + teinteAmount,
          reduction: (existingCredit.reduction || 0) + reduction,
          versements: initialPaid > 0
            ? [...(existingCredit.versements || []), { id: generateId(), amount: initialPaid, date: new Date().toISOString() }]
            : (existingCredit.versements || [])
        };
        updateCredit(updated);
        addSale({ id: saleId, type: 'credit', creditId: existingCredit.id, items: [...cart], teinteAmount, teinteEntries, reduction, total, date: new Date().toISOString() });
      } else {
        const creditId = generateId();
        addCredit({
          id: creditId,
          clientName,
          clientPhone,
          items: [...cart],
          teinteAmount,
          teinteEntries,
          reduction,
          total,
          versements: initialPaid > 0 ? [{ id: generateId(), amount: initialPaid, date: new Date().toISOString() }] : [],
          date: new Date().toISOString()
        });
        addSale({ id: saleId, type: 'credit', creditId, items: [...cart], teinteAmount, teinteEntries, reduction, total, date: new Date().toISOString() });
      }
    }

    setCart([]);
    setTeinteEntries([]);
    setTempTeinteEntries([createTempTeinteEntry()]);
    setReduction(0);
    setClientName("");
    setClientPhone("");
    setPaidAmount("");
    setAllCredits(getCredits());
    setProducts(getProducts());
    setShowCheckout(false);
    setCheckoutMode("choice");
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row animate-fade-in bg-[#f4f8f8] font-sans">
      <div className="lg:hidden w-full border-b border-gray-200 bg-white px-4 pt-4 pb-3 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-800">Caisse</h2>
            <p className="text-sm text-gray-500">Point de vente</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {sectionOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMobileSection(option.id)}
              aria-pressed={mobileSection === option.id}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#628b9a] ${mobileSection === option.id ? "bg-[#628b9a] border-transparent text-white" : "bg-white border-gray-200 text-gray-600"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {/* Left panel — Products */}
      <div className={`${mobileSection === "cart" ? "hidden" : ""} flex-1 flex flex-col border-b border-gray-200 bg-white p-4 lg:flex lg:p-5 lg:border-r lg:border-gray-200 lg:bg-white`}>
        <div className="mb-3 hidden items-center justify-between lg:flex">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-800">Caisse</h2>
            <p className="text-sm font-medium text-gray-500">Point de vente</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 bg-white rounded-md shadow-sm border border-gray-100">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Rechercher des produits par mots-clés..."
            className="pl-11 bg-transparent border-0 h-11 text-sm focus-visible:ring-0 shadow-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filters - mobile */}
        <div className="mobile-scroll-x flex gap-2 overflow-x-auto pb-3 lg:hidden">
          <div className="flex min-w-max gap-2">
            {CATEGORIES.map(cat => {
              const CategoryIcon = categoryIcons[cat.key];

              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`min-w-[108px] md:min-w-[116px] flex-shrink-0 py-4 md:min-h-[84px] rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm border border-transparent ${categoryColors[cat.key]} ${activeCategory === cat.key ? 'ring-4 ring-black/10 scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                >
                  <CategoryIcon className="hidden md:block h-7 w-[35px]" strokeWidth={2.2} />
                  <div className="text-[9px] md:text-[9px] opacity-80 uppercase tracking-wider">{cat.labelAr}</div>
                  <span className="font-semibold text-xs md:text-sm tracking-wide text-center leading-tight max-w-[72px] whitespace-normal">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto rounded-lg mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-2.5 p-1">
            {filteredProducts.map(product => {
              const Icon = categoryIcons[product.category] || Package;
              const showCustom = customizableCategories.has(product.category);
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border border-gray-100 rounded-lg p-2.5 md:p-2.5 text-left hover:border-gray-300 hover:shadow-md transition-all duration-200 group relative flex flex-col min-h-[172px] md:min-h-[160px] items-center justify-between cursor-pointer"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {product.stock}
                  </span>
                  {showCustom && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openCustomModal(product); }}
                      className="absolute left-2 top-2 h-8 w-8 rounded-full bg-[#41b86d] text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#41b86d]"
                      disabled={product.stock <= 0}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                  <div className="flex-1 flex items-center justify-center pt-3 pb-1 w-full pointer-events-none">
                    <Icon className="h-11 w-11 md:h-[54px] md:w-[54px] text-gray-400 group-hover:text-gray-600 group-hover:scale-110 transition-all drop-shadow-sm" strokeWidth={1.5} />
                  </div>
                  <div className="w-full border-t border-gray-100 pt-2 flex flex-col h-12 justify-end">
                    <p className="text-[11px] md:text-[11px] font-medium text-gray-700 leading-tight mb-1 line-clamp-2 text-center" title={product.name}>{product.name}</p>
                    <p className="text-sm font-bold text-[#41b86d] text-center">{formatDZD(product.priceSale)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleCustomCards.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#41b86d]">Ventes personnalisées</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {visibleCustomCards.map(card => (
                  <div
                    key={card.id}
                    className="relative border border-gray-100 rounded-2xl bg-white p-3 shadow-sm cursor-pointer"
                    onClick={() => openCustomCardModal(card)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{card.category}</p>
                      <span className="text-[10px] font-black text-gray-500">{card.kg} kg</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-gray-800 line-clamp-2">{card.baseProductName}</p>
                    <p className="text-xs text-gray-500 mt-1">Prix unitaire</p>
                    <p className="text-lg font-black text-[#41b86d]">{formatDZD(card.unitPrice)} / kg</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className="mobile-scroll-x hidden gap-2 overflow-x-auto pt-2 border-t border-gray-200 pb-1 lg:flex">
          <div className="flex min-w-max gap-2 md:mx-auto">
            {CATEGORIES.map(cat => {
              const CategoryIcon = categoryIcons[cat.key];

              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`min-w-[108px] md:min-w-[116px] flex-shrink-0 py-4 md:min-h-[84px] rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm border border-transparent ${categoryColors[cat.key]} ${activeCategory === cat.key ? 'ring-4 ring-black/10 scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                >
                  <CategoryIcon className="hidden md:block h-7 w-[35px]" strokeWidth={2.2} />
                  <div className="text-[9px] md:text-[9px] opacity-80 uppercase tracking-wider">{cat.labelAr}</div>
                  <span className="font-semibold text-xs md:text-sm tracking-wide text-center leading-tight max-w-[72px] whitespace-normal">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel — Cart */}
      <div className={`${mobileSection === "products" ? "hidden" : ""} flex w-full flex-col bg-white border-l border-gray-200 z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] lg:flex lg:w-[340px] xl:w-[360px]`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
          <h3 className="text-xl font-bold tracking-tight text-gray-800">Panier</h3>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#41b86d] px-2 text-sm font-bold text-white lg:hidden">
            {mobileCartCount}
          </span>
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
                    {item.customUnitPrice ? (
                      <p className="text-[10px] text-[#41b86d] mt-1 font-semibold">
                        {item.weightKg ?? item.quantity} kg × {formatDZD(item.customUnitPrice)} / kg
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">{formatDZD(item.product.priceSale)}</p>
                    )}
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
              <button
                onClick={() => {
                  if (teinteEntries.length) {
                    setTempTeinteEntries(teinteEntries.map(entry => ({
                      unitPrice: entry.unitPrice.toString(),
                      kg: entry.kg.toString(),
                    })));
                  } else {
                    setTempTeinteEntries([createTempTeinteEntry()]);
                  }
                  setShowTeinte(true);
                }}
                className="flex items-center gap-2 text-[#628b9a] hover:underline text-sm font-semibold"
              >
                <Paintbrush className="h-4 w-4" />
                La Teinte
              </button>
              <div className="text-right">
                <span className="font-semibold text-gray-700">
                  {teinteAmount > 0 ? `+${formatDZD(teinteAmount)}` : '—'}
                </span>
                {teinteEntries.length > 0 && (
                  <div className="text-[10px] text-gray-400 space-y-1 mt-1">
                    {teinteEntries.map((entry, index) => (
                      <div key={index}>
                        <span>{entry.kg} kg</span> × <span>{formatDZD(entry.unitPrice)}</span> / kg
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
      <Dialog open={showCheckout} onOpenChange={(open) => { setShowCheckout(open); if (!open) setCheckoutMode("choice"); }}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-3 flex items-center justify-between">
              {checkoutMode === "choice" && "Encaissement"}
              {checkoutMode === "bon" && "Créer un Bon"}
              {checkoutMode === "credit" && "Vente à Crédit"}
              {checkoutMode !== "choice" && (
                <button
                  onClick={() => setCheckoutMode("choice")}
                  className="text-xs font-bold text-[#628b9a] hover:underline"
                >
                  Retour
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className={`bg-[#f0fbf4] border border-[#a3e4be] p-6 rounded-xl ${checkoutMode !== "choice" ? "py-3 px-4" : ""}`}>
              <p className={`text-center font-black text-[#39a05f] ${checkoutMode === "choice" ? "text-3xl" : "text-xl"}`}>
                {formatDZD(total)}
              </p>
            </div>

            {checkoutMode === "choice" && (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-24 flex-col gap-2 rounded-xl border-gray-200 hover:border-[#41b86d] hover:bg-[#41b86d]/5 transition-all text-xs" onClick={() => handleCheckout('direct')}>
                  <div className="bg-[#41b86d]/10 p-2 rounded-lg"><ShoppingCart className="h-5 w-5 text-[#41b86d]" /></div>
                  <span className="font-bold text-gray-700">Vente Directe</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 rounded-xl border-[#628b9a]/30 hover:border-[#628b9a] hover:bg-[#628b9a]/5 transition-all text-xs" onClick={() => setCheckoutMode("bon")}>
                  <div className="bg-[#628b9a]/10 p-2 rounded-lg"><FileText className="h-5 w-5 text-[#628b9a]" /></div>
                  <span className="font-bold text-gray-700">BON</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 rounded-xl border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-xs" onClick={() => setCheckoutMode("credit")}>
                  <div className="bg-orange-100 p-2 rounded-lg"><Wallet className="h-5 w-5 text-orange-500" /></div>
                  <span className="font-bold text-gray-700">CRÉDIT</span>
                </Button>
              </div>
            )}

            {checkoutMode === "bon" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Informations Client</h4>
                  <Input placeholder="Nom complet du client" className="bg-gray-50 border-gray-200 h-12 rounded-xl" value={clientName} onChange={e => setClientName(e.target.value)} />
                  <Input placeholder="Numéro de téléphone" className="bg-gray-50 border-gray-200 h-12 rounded-xl" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                </div>
                <Button
                  className="w-full h-14 bg-[#628b9a] hover:bg-[#527b8a] text-white font-bold rounded-xl text-lg shadow-lg shadow-gray-200 mt-4"
                  onClick={() => handleCheckout('bon')}
                  disabled={!clientName}
                >
                  Confirmer le Bon
                </Button>
              </div>
            )}

            {checkoutMode === "credit" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-3 relative">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Informations Client</h4>
                  <Input placeholder="Nom complet du client" className="bg-gray-50 border-gray-200 h-12 rounded-xl transition-all focus:bg-white" value={clientName} onChange={e => setClientName(e.target.value)} />
                  <Input placeholder="Numéro de téléphone" className="bg-gray-50 border-gray-200 h-12 rounded-xl transition-all focus:bg-white" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />

                  {clientSuggestions.length > 0 && !(clientSuggestions.length === 1 && clientSuggestions[0].name === clientName && clientSuggestions[0].phone === clientPhone) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-3 py-1.5 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Clients Existants
                      </div>
                      {clientSuggestions.map((c, i) => (
                        <button
                          key={i}
                          className="w-full px-4 py-3 text-left hover:bg-[#41b86d]/5 flex items-center justify-between group transition-colors"
                          onClick={() => { setClientName(c.name); setClientPhone(c.phone); }}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-800 group-hover:text-[#41b86d]">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.phone}</p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-[#41b86d]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-2 mt-4">
                  <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest pl-1">Versement Initial (Facultatif)</label>
                  <Input
                    placeholder="Montant versé (DZD)"
                    className="bg-white border-orange-200 h-12 rounded-lg font-bold text-lg text-orange-700 focus:ring-orange-500"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    type="number"
                  />
                </div>
                <Button
                  className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-orange-100 mt-4 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  onClick={() => handleCheckout('credit')}
                  disabled={!clientName}
                >
                  Confirmer le Crédit
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Teinte modal */}
      <Dialog open={showTeinte} onOpenChange={setShowTeinte}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">La Teinte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">Définissez un prix unitaire et une quantité pour chaque teinte. Le total se met à jour instantanément.</p>
            {tempTeinteEntries.map((entry, index) => {
              const entryTotal = (Number(entry.unitPrice) || 0) * (Number(entry.kg) || 0);
              const isInvalid = !entry.unitPrice || !entry.kg;
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Teinte {index + 1}</span>
                    {tempTeinteEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTempTeinteEntries(prev => prev.filter((_, i) => i !== index))}
                        className="text-[11px] font-semibold text-red-500"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] uppercase tracking-widest text-gray-500">Unitaire</label>
                      <Input
                        type="number"
                        placeholder="Prix (DZD/kg)"
                        className={`h-11 border ${isInvalid && !entry.unitPrice ? "border-red-200" : "border-gray-200"}`}
                        value={entry.unitPrice}
                        onChange={e => setTempTeinteEntries(prev => prev.map((item, i) => i === index ? { ...item, unitPrice: e.target.value } : item))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] uppercase tracking-widest text-gray-500">Kg</label>
                      <Input
                        type="number"
                        placeholder="Quantité"
                        className={`h-11 border ${isInvalid && !entry.kg ? "border-red-200" : "border-gray-200"}`}
                        value={entry.kg}
                        onChange={e => setTempTeinteEntries(prev => prev.map((item, i) => i === index ? { ...item, kg: e.target.value } : item))}
                      />
                    </div>
                    <div className="flex flex-col justify-center text-[11px] text-gray-500">
                      {entryTotal > 0 ? (
                        <>
                          <span>Total</span>
                          <span className="text-gray-900 font-black">{formatDZD(entryTotal)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">En attente</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className="w-full text-sm font-semibold text-[#628b9a] border border-[#628b9a] rounded-xl py-2 hover:bg-[#628b9a]/5"
              onClick={() => setTempTeinteEntries(prev => [...prev, createTempTeinteEntry()])}
            >
              Ajouter une teinte
            </button>
            {previewTeinteAmount > 0 && (
              <div className="rounded-2xl border border-dashed border-[#628b9a]/60 bg-[#ecf8f7] px-4 py-2 text-sm font-semibold text-[#1f7161]">
                Total estimé : {formatDZD(previewTeinteAmount)}
              </div>
            )}
          </div>
          <Button
            disabled={!hasValidTempTeinteEntry}
            onClick={() => {
              const normalizedEntries = tempTeinteEntries.map(entry => ({
                unitPrice: Number(entry.unitPrice) || 0,
                kg: Number(entry.kg) || 0,
              })).filter(entry => entry.unitPrice > 0 && entry.kg > 0);
              setTeinteEntries(normalizedEntries);
              setTempTeinteEntries(normalizedEntries.length ? normalizedEntries.map(entry => ({
                unitPrice: entry.unitPrice.toString(),
                kg: entry.kg.toString(),
              })) : [createTempTeinteEntry()]);
              setShowTeinte(false);
            }}
            className="w-full h-11 mt-2 bg-[#628b9a] hover:bg-[#527b8a] text-white font-bold"
          >
            Appliquer
          </Button>
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

      {/* Custom kg modal */}
      <Dialog open={showCustomModal} onOpenChange={open => { if (!open) closeCustomModal(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Vente personnalisée</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm font-semibold text-gray-700">{customModalProduct?.name}</p>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-500">Quantité (kg)</p>
              <Input
                type="number"
                placeholder="Ex. 25"
                className="h-11 border-gray-200"
                value={customModalKg}
                onChange={e => setCustomModalKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-500">Prix unitaire (DZD/kg)</p>
              <Input
                type="number"
                placeholder="Ex. 1200"
                className="h-11 border-gray-200"
                value={customModalUnitPrice}
                onChange={e => setCustomModalUnitPrice(e.target.value)}
              />
            </div>
            {previewCustomTotal > 0 && (
              <div className="rounded-2xl border border-dashed border-[#41b86d]/40 bg-[#ecf8f7] px-4 py-2 text-sm font-semibold text-[#1f7161]">
                Total estimé : {formatDZD(previewCustomTotal)}
              </div>
            )}
          </div>
          <Button
            disabled={!customModalProduct || !(Number(customModalKg) > 0) || !(Number(customModalUnitPrice) > 0)}
            onClick={handleCustomSaleConfirm}
            className="w-full h-11 mt-2 bg-[#41b86d] hover:bg-[#378f63] text-white font-bold"
          >
            Ajouter
          </Button>
        </DialogContent>
      </Dialog>

      {/* Custom card quick sale modal */}
      <Dialog open={!!activeCustomCard} onOpenChange={open => { if (!open) { setActiveCustomCard(null); setCustomCardKg(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Vente rapide</DialogTitle>
          </DialogHeader>
          {activeCustomCard && (
            <div className="space-y-4 pt-2">
              <p className="text-sm font-semibold text-gray-700">{activeCustomCard.baseProductName}</p>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Quantité à vendre (kg)</p>
                <Input
                  type="number"
                  placeholder="Ex. 25"
                  className="h-11 border-gray-200"
                  value={customCardKg}
                  max={remainingCustomKg || undefined}
                  onChange={e => setCustomCardKg(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500">Prix unitaire fixé : {formatDZD(activeCustomCard.unitPrice)} / kg</p>
              {remainingCustomKg > 0 && (
                <p className="text-xs text-[#41b86d] font-semibold">Disponible : {remainingCustomKg} kg</p>
              )}
              {previewCustomCardTotal > 0 && (
                <div className="rounded-2xl border border-dashed border-[#41b86d]/40 bg-[#ecf8f7] px-4 py-2 text-sm font-semibold text-[#1f7161]">
                  Total estimé : {formatDZD(previewCustomCardTotal)}
                </div>
              )}
              <Button
                disabled={!customCardKg || Number(customCardKg) <= 0 || Number(customCardKg) > remainingCustomKg}
                onClick={() => {
                  handleCustomCardAdd(activeCustomCard, Number(customCardKg) || 0);
                  setActiveCustomCard(null);
                  setCustomCardKg("");
                }}
                className="w-full h-11 mt-2 bg-[#41b86d] hover:bg-[#378f63] text-white font-bold"
              >
                Ajouter au panier
              </Button>
            </div>
          )}
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
