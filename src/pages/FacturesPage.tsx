import { useState, useMemo } from "react";
import { Plus, RotateCcw, Search, Eye, ArrowLeft, Package, PackagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getInvoices, saveInvoices, getSuppliers, saveSuppliers, getProducts, saveProducts,
  Invoice, InvoiceItem, Supplier, Product,
  formatDZD, generateId, updateProductStock
} from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";

type View = "list" | "add" | "return";
type InvoiceFormItem = {
  productId: string;
  isNew: boolean;
  newName: string;
  newCategory: string;
  quantity: number;
  priceBuy: number;
  priceSale: number;
  expiryDate: string;
};

const createInvoiceFormItem = (): InvoiceFormItem => ({
  productId: "",
  isNew: false,
  newName: "",
  newCategory: "satine",
  quantity: 1,
  priceBuy: 0,
  priceSale: 0,
  expiryDate: "",
});

export default function FacturesPage() {
  const [invoices, setInvoices] = useState(getInvoices);
  const [suppliers, setSuppliers] = useState(getSuppliers);
  const [products, setProducts] = useState(getProducts);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Add form state
  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", address: "" });
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceFormItem[]>([]);
  const [draftInvoiceItem, setDraftInvoiceItem] = useState<InvoiceFormItem>(createInvoiceFormItem());

  // Return form state
  const [returnInvoiceId, setReturnInvoiceId] = useState("");
  const [returnItems, setReturnItems] = useState<{ idx: number; quantity: number }[]>([]);
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search || inv.supplier.name.toLowerCase().includes(search.toLowerCase()) || inv.number.includes(search);
      const matchDate = !dateFilter || inv.date.startsWith(dateFilter);
      return matchSearch && matchDate;
    });
  }, [invoices, search, dateFilter]);

  const updateDraftInvoiceItem = <K extends keyof InvoiceFormItem>(key: K, value: InvoiceFormItem[K]) => {
    setDraftInvoiceItem(prev => ({ ...prev, [key]: value }));
  };

  const handleDraftInvoiceMode = (isNew: boolean) => {
    setDraftInvoiceItem(prev => ({
      ...prev,
      isNew,
      productId: isNew ? "" : prev.productId,
      newName: isNew ? prev.newName : "",
    }));
  };

  const canAddDraftInvoiceItem = draftInvoiceItem.quantity > 0
    && draftInvoiceItem.priceBuy > 0
    && draftInvoiceItem.priceSale > 0
    && (draftInvoiceItem.isNew ? draftInvoiceItem.newName.trim().length > 0 : draftInvoiceItem.productId.length > 0);
  const addInvoiceItem = () => {
    if (!canAddDraftInvoiceItem) return;
    setInvoiceItems(prev => [...prev, { ...draftInvoiceItem, newName: draftInvoiceItem.newName.trim() }]);
    setDraftInvoiceItem(createInvoiceFormItem());
  };

  const removeInvoiceItem = (idx: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== idx));
  };

  const getInvoiceItemLabel = (item: InvoiceFormItem) => {
    if (item.isNew) return item.newName;
    return products.find(product => product.id === item.productId)?.name || "Produit";
  };

  const handleSubmitInvoice = () => {
    let supplier: Supplier;
    if (isNewSupplier) {
      supplier = { id: generateId(), ...newSupplier };
      const updatedSuppliers = [...suppliers, supplier];
      saveSuppliers(updatedSuppliers);
      setSuppliers(updatedSuppliers);
    } else {
      supplier = suppliers.find(s => s.id === supplierId)!;
      if (!supplier) return;
    }

    const items: InvoiceItem[] = [];
    const updatedProducts = [...products];

    for (const item of invoiceItems) {
      let product: Product;
      if (item.isNew) {
        product = {
          id: generateId(), name: item.newName, nameAr: "", category: item.newCategory as any,
          priceSale: item.priceSale, priceBuy: item.priceBuy, stock: item.quantity, unit: "unitÃ©", expiryDate: item.expiryDate || undefined
        };
        updatedProducts.push(product);
      } else {
        const idx = updatedProducts.findIndex(p => p.id === item.productId);
        if (idx < 0) continue;
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          stock: updatedProducts[idx].stock + item.quantity,
          priceBuy: item.priceBuy,
          priceSale: item.priceSale,
          expiryDate: item.expiryDate || updatedProducts[idx].expiryDate,
        };
        product = updatedProducts[idx];
      }
      items.push({ product, quantity: item.quantity, priceBuy: item.priceBuy, priceSale: item.priceSale, expiryDate: item.expiryDate });
    }

    saveProducts(updatedProducts);
    setProducts(updatedProducts);

    const invoice: Invoice = {
      id: generateId(),
      number: `FAC-${Date.now().toString().slice(-6)}`,
      supplier,
      items,
      total: items.reduce((s, i) => s + i.priceBuy * i.quantity, 0),
      date: invoiceDate,
      type: "achat",
    };

    const updated = [invoice, ...invoices];
    saveInvoices(updated);
    setInvoices(updated);
    resetAddForm();
    setView("list");
  };

  const handleReturn = () => {
    const original = invoices.find(i => i.id === returnInvoiceId);
    if (!original) return;

    const returnedItems: InvoiceItem[] = [];
    for (const ri of returnItems) {
      const origItem = original.items[ri.idx];
      if (!origItem) continue;
      updateProductStock(origItem.product.id, -ri.quantity);
      returnedItems.push({ ...origItem, quantity: ri.quantity });
    }

    const returnInvoice: Invoice = {
      id: generateId(),
      number: `RET-${Date.now().toString().slice(-6)}`,
      supplier: original.supplier,
      items: returnedItems,
      total: returnedItems.reduce((s, i) => s + i.priceBuy * i.quantity, 0),
      date: new Date().toISOString().split("T")[0],
      type: "retour",
    };

    const updated = [returnInvoice, ...invoices];
    saveInvoices(updated);
    setInvoices(updated);
    setProducts(getProducts());
    setReturnInvoiceId("");
    setReturnItems([]);
    setView("list");
  };

  const resetAddForm = () => {
    setSupplierId("");
    setNewSupplier({ name: "", phone: "", address: "" });
    setIsNewSupplier(false);
    setInvoiceItems([]);
    setDraftInvoiceItem(createInvoiceFormItem());
    setInvoiceDate(new Date().toISOString().split("T")[0]);
  };

  const selectedReturnInvoice = invoices.find(i => i.id === returnInvoiceId);
  const invoiceTotal = invoiceItems.reduce((s, i) => s + i.priceBuy * i.quantity, 0);
  const returnTotal = returnItems.reduce((s, ri) => {
    const item = selectedReturnInvoice?.items[ri.idx];
    return s + (item ? item.priceBuy * ri.quantity : 0);
  }, 0);

  // â”€â”€â”€ ADD FACTURE VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "add") {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
          <div className="mx-auto max-w-md space-y-5">
            <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
              <button
                onClick={() => { resetAddForm(); setView("list"); }}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Factures</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Nouvel achat</h2>
              <p className="mt-1 text-sm text-white/70">CrÃ©ez une facture fournisseur pensÃ©e pour le mobile.</p>
            </div>

            <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
              <div className="flex rounded-2xl bg-[#eef5f4] p-1">
                <button
                  onClick={() => setIsNewSupplier(false)}
                  className={`flex-1 rounded-2xl px-3 py-2 text-sm font-bold ${!isNewSupplier ? "bg-white text-[#243740] shadow-sm" : "text-gray-500"}`}
                >
                  Existant
                </button>
                <button
                  onClick={() => setIsNewSupplier(true)}
                  className={`flex-1 rounded-2xl px-3 py-2 text-sm font-bold ${isNewSupplier ? "bg-white text-[#243740] shadow-sm" : "text-gray-500"}`}
                >
                  Nouveau
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {isNewSupplier ? (
                  <>
                    <Input placeholder="Nom du fournisseur" value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa]" />
                    <Input placeholder="TÃ©lÃ©phone" value={newSupplier.phone} onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))} className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa]" />
                    <Input placeholder="Adresse" value={newSupplier.address} onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))} className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa]" />
                  </>
                ) : (
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] text-sm">
                      <SelectValue placeholder="Choisir un fournisseur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa]" />
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-[#243740]">Produits</p>
                  <p className="text-xs text-gray-400">{invoiceItems.length} ligne{invoiceItems.length > 1 ? "s" : ""}</p>
                </div>
                <Button onClick={addInvoiceItem} variant="outline" className="hidden h-10 rounded-2xl border-[#41b86d]/20 text-[#41b86d] hover:bg-[#41b86d]/5">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-[1.5rem] border border-gray-100 bg-[#f7fbfa] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#243740]">Nouveau produit</p>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#628b9a]">Toujours visible</span>
                  </div>
                  <div className="mt-3 flex rounded-2xl bg-white p-1">
                    <button
                      onClick={() => handleDraftInvoiceMode(false)}
                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold ${!draftInvoiceItem.isNew ? "bg-[#41b86d] text-white" : "text-gray-500"}`}
                    >
                      Existant
                    </button>
                    <button
                      onClick={() => handleDraftInvoiceMode(true)}
                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold ${draftInvoiceItem.isNew ? "bg-[#41b86d] text-white" : "text-gray-500"}`}
                    >
                      Nouveau
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {draftInvoiceItem.isNew ? (
                      <>
                        <Input placeholder="Nom du produit" value={draftInvoiceItem.newName} onChange={e => updateDraftInvoiceItem("newName", e.target.value)} className="h-12 rounded-2xl border-gray-200 bg-white" />
                        <Select value={draftInvoiceItem.newCategory} onValueChange={value => updateDraftInvoiceItem("newCategory", value)}>
                          <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="satine">SatinÃƒÂ©</SelectItem>
                              <SelectItem value="enduit">Enduit</SelectItem>
                              <SelectItem value="vinyle">Vinyle</SelectItem>
                              <SelectItem value="laque">Laque</SelectItem>
                              <SelectItem value="decor">DÃƒÂ©cor</SelectItem>
                              <SelectItem value="fixateur">Fixateur</SelectItem>
                              <SelectItem value="accessoires">Accessoires</SelectItem>
                            </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <Select value={draftInvoiceItem.productId} onValueChange={value => updateDraftInvoiceItem("productId", value)}>
                        <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-sm">
                          <SelectValue placeholder="Choisir un produit..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" placeholder="QuantitÃƒÂ©" value={draftInvoiceItem.quantity || ""} onChange={e => updateDraftInvoiceItem("quantity", Number(e.target.value))} className="h-12 rounded-2xl border-gray-200 bg-white" />
                      <Input type="number" placeholder="Prix achat" value={draftInvoiceItem.priceBuy || ""} onChange={e => updateDraftInvoiceItem("priceBuy", Number(e.target.value))} className="h-12 rounded-2xl border-gray-200 bg-white" />
                      <Input type="number" placeholder="Prix vente" value={draftInvoiceItem.priceSale || ""} onChange={e => updateDraftInvoiceItem("priceSale", Number(e.target.value))} className="h-12 rounded-2xl border-gray-200 bg-white" />
                      <Input type="date" value={draftInvoiceItem.expiryDate || ""} onChange={e => updateDraftInvoiceItem("expiryDate", e.target.value)} className="h-12 rounded-2xl border-gray-200 bg-white" />
                    </div>
                    <Button onClick={addInvoiceItem} disabled={!canAddDraftInvoiceItem} className="h-12 w-full rounded-2xl bg-[#41b86d] font-bold text-white hover:bg-[#39a05f]">
                      Valider le produit
                    </Button>
                  </div>
                </div>
                {invoiceItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#c9dcda] px-4 py-10 text-center text-sm text-gray-400">
                    Aucun produit validÃƒÂ©.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#f7fbfa]">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Produit</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">QtÃƒÂ©</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Achat</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Vente</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.map((item, idx) => (
                            <tr key={`${getInvoiceItemLabel(item)}-${idx}`} className="border-t border-gray-100">
                              <td className="px-4 py-3 font-semibold text-[#243740]">{getInvoiceItemLabel(item)}</td>
                              <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-3 text-gray-600">{formatDZD(item.priceBuy)}</td>
                              <td className="px-4 py-3 text-gray-600">{formatDZD(item.priceSale)}</td>
                              <td className="px-4 py-3 font-bold text-[#41b86d]">{formatDZD(item.priceBuy * item.quantity)}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => removeInvoiceItem(idx)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden mt-4 space-y-4">
                {invoiceItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#c9dcda] px-4 py-10 text-center text-sm text-gray-400">
                    Aucun produit ajoutÃ©.
                  </div>
                ) : (
                  invoiceItems.map((item, idx) => (
                    <div key={idx} className="rounded-[1.5rem] border border-gray-100 bg-[#f7fbfa] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-[#243740]">Produit #{idx + 1}</p>
                        <button
                          onClick={() => removeInvoiceItem(idx)}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-gray-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex rounded-2xl bg-white p-1">
                        <button
                          onClick={() => { const u = [...invoiceItems]; u[idx].isNew = false; setInvoiceItems(u); }}
                          className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold ${!item.isNew ? "bg-[#41b86d] text-white" : "text-gray-500"}`}
                        >
                          Existant
                        </button>
                        <button
                          onClick={() => { const u = [...invoiceItems]; u[idx].isNew = true; setInvoiceItems(u); }}
                          className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold ${item.isNew ? "bg-[#41b86d] text-white" : "text-gray-500"}`}
                        >
                          Nouveau
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        {item.isNew ? (
                          <>
                            <Input placeholder="Nom du produit" value={item.newName} onChange={e => { const u = [...invoiceItems]; u[idx].newName = e.target.value; setInvoiceItems(u); }} className="h-12 rounded-2xl border-gray-200 bg-white" />
                            <Select value={item.newCategory} onValueChange={v => { const u = [...invoiceItems]; u[idx].newCategory = v; setInvoiceItems(u); }}>
                              <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="satine">SatinÃ©</SelectItem>
                                <SelectItem value="enduit">Enduit</SelectItem>
                                <SelectItem value="vinyle">Vinyle</SelectItem>
                                <SelectItem value="laque">Laque</SelectItem>
                                <SelectItem value="decor">DÃ©cor</SelectItem>
                                <SelectItem value="fixateur">Fixateur</SelectItem>
                                <SelectItem value="accessoires">Accessoires</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <Select value={item.productId} onValueChange={v => { const u = [...invoiceItems]; u[idx].productId = v; setInvoiceItems(u); }}>
                            <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-sm">
                              <SelectValue placeholder="Choisir un produit..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="number" placeholder="QuantitÃ©" value={item.quantity || ""} onChange={e => { const u = [...invoiceItems]; u[idx].quantity = Number(e.target.value); setInvoiceItems(u); }} className="h-12 rounded-2xl border-gray-200 bg-white" />
                          <Input type="number" placeholder="Prix achat" value={item.priceBuy || ""} onChange={e => { const u = [...invoiceItems]; u[idx].priceBuy = Number(e.target.value); setInvoiceItems(u); }} className="h-12 rounded-2xl border-gray-200 bg-white" />
                          <Input type="number" placeholder="Prix vente" value={item.priceSale || ""} onChange={e => { const u = [...invoiceItems]; u[idx].priceSale = Number(e.target.value); setInvoiceItems(u); }} className="h-12 rounded-2xl border-gray-200 bg-white" />
                          <Input type="date" value={item.expiryDate || ""} onChange={e => { const u = [...invoiceItems]; u[idx].expiryDate = e.target.value; setInvoiceItems(u); }} className="h-12 rounded-2xl border-gray-200 bg-white" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-[#243740] px-5 py-4 text-white shadow-[0_18px_40px_rgba(36,55,64,0.14)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">Total facture</p>
                  <p className="mt-1 text-2xl font-black">{formatDZD(invoiceTotal)}</p>
                </div>
                <Button
                  onClick={handleSubmitInvoice}
                  disabled={invoiceItems.length === 0}
                  className="h-12 rounded-2xl bg-[#41b86d] px-5 font-bold text-white hover:bg-[#39a05f]"
                >
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4f8f8] font-sans text-gray-800 animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { resetAddForm(); setView("list"); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#3f5362]">Nouvelle Facture</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Saisir les informations de la facture d'achat</p>
              </div>
            </div>
            <Button
              onClick={handleSubmitInvoice}
              disabled={invoiceItems.length === 0}
              className="bg-[#41b86d] hover:bg-[#39a05f] text-white shadow-sm font-bold h-11 px-6 rounded-xl disabled:opacity-40"
            >
              Valider la Facture
            </Button>
          </div>
        </div>

        <div className="px-8 py-8 max-w-4xl mx-auto space-y-6">
          {/* Supplier Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#41b86d]/10 flex items-center justify-center">
                <PackagePlus className="h-4 w-4 text-[#41b86d]" />
              </div>
              <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Fournisseur & Date</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Toggle buttons */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setIsNewSupplier(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isNewSupplier ? "bg-white text-[#3f5362] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Fournisseur existant
                </button>
                <button
                  onClick={() => setIsNewSupplier(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isNewSupplier ? "bg-white text-[#3f5362] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Nouveau fournisseur
                </button>
              </div>

              {isNewSupplier ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nom</label>
                    <Input placeholder="Nom du fournisseur" value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">TÃ©lÃ©phone</label>
                    <Input placeholder="0555 ..." value={newSupplier.phone} onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))} className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Adresse</label>
                    <Input placeholder="Adresse" value={newSupplier.address} onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))} className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0" />
                  </div>
                </div>
              ) : (
                <div className="max-w-sm">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Choisir un fournisseur</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0">
                      <SelectValue placeholder="SÃ©lectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="max-w-xs">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Date de la facture</label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0 w-48" />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#628b9a]/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-[#628b9a]" />
                </div>
                <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Produits</h3>
                {invoiceItems.length > 0 && (
                  <span className="bg-[#41b86d]/10 text-[#41b86d] text-xs font-black px-2 py-0.5 rounded-full">{invoiceItems.length}</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addInvoiceItem}
                className="hidden border-gray-200 text-gray-600 hover:bg-[#41b86d]/5 hover:border-[#41b86d]/30 hover:text-[#41b86d] font-bold rounded-lg"
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter un produit
              </Button>
            </div>

            <div className="p-6 pb-0">
              <div className="border border-gray-100 rounded-xl p-4 space-y-4 bg-gray-50/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-300">+</span>
                    <span className="text-sm font-black text-[#3f5362]">Nouveau produit</span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#628b9a]">Toujours visible</span>
                </div>

                <div className="flex gap-1.5 bg-white p-0.5 rounded-lg border border-gray-100 w-fit">
                  <button
                    onClick={() => handleDraftInvoiceMode(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!draftInvoiceItem.isNew ? "bg-[#41b86d] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Existant
                  </button>
                  <button
                    onClick={() => handleDraftInvoiceMode(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${draftInvoiceItem.isNew ? "bg-[#41b86d] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Nouveau
                  </button>
                </div>

                {draftInvoiceItem.isNew ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du produit</label>
                      <Input placeholder="Ex: Peinture SatinÃƒÂ©e..." value={draftInvoiceItem.newName} onChange={e => updateDraftInvoiceItem("newName", e.target.value)} className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CatÃƒÂ©gorie</label>
                      <Select value={draftInvoiceItem.newCategory} onValueChange={value => updateDraftInvoiceItem("newCategory", value)}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="satine">SatinÃƒÂ©</SelectItem>
                          <SelectItem value="enduit">Enduit</SelectItem>
                          <SelectItem value="vinyle">Vinyle</SelectItem>
                          <SelectItem value="laque">Laque</SelectItem>
                          <SelectItem value="decor">DÃƒÂ©cor</SelectItem>
                          <SelectItem value="fixateur">Fixateur</SelectItem>
                          <SelectItem value="accessoires">Accessoires</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produit</label>
                    <Select value={draftInvoiceItem.productId} onValueChange={value => updateDraftInvoiceItem("productId", value)}>
                      <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                      <SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "QuantitÃƒÂ©", placeholder: "0", key: "quantity", type: "number" },
                    { label: "Prix achat", placeholder: "0 DZD", key: "priceBuy", type: "number" },
                    { label: "Prix vente", placeholder: "0 DZD", key: "priceSale", type: "number" },
                    { label: "PÃƒÂ©remption", placeholder: "", key: "expiryDate", type: "date" },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(draftInvoiceItem as any)[field.key] || ""}
                        onChange={e => updateDraftInvoiceItem(field.key as keyof InvoiceFormItem, (field.type === "number" ? Number(e.target.value) : e.target.value) as never)}
                        className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"
                      />
                    </div>
                  ))}
                </div>


                <Button
                  onClick={addInvoiceItem}
                  disabled={!canAddDraftInvoiceItem}
                  className="w-full h-11 bg-[#41b86d] hover:bg-[#39a05f] text-white shadow-sm font-bold rounded-xl disabled:opacity-40"
                >
                  Valider le produit
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {invoiceItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <PackagePlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucun produit validÃƒÂ©</p>
                  <p className="text-xs mt-1">Remplissez le formulaire ci-dessus puis validez le produit.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Produit</th>
                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">QtÃƒÂ©</th>
                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Prix achat</th>
                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Prix vente</th>
                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Total achat</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={`${getInvoiceItemLabel(item)}-${idx}`} className="border-b last:border-0 border-gray-50">
                          <td className="px-4 py-3 font-semibold text-[#3f5362]">{getInvoiceItemLabel(item)}</td>
                          <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDZD(item.priceBuy)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDZD(item.priceSale)}</td>
                          <td className="px-4 py-3 font-bold text-[#41b86d]">{formatDZD(item.priceBuy * item.quantity)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeInvoiceItem(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="hidden p-6 space-y-4">
              {invoiceItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <PackagePlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucun produit ajoutÃ©</p>
                  <p className="text-xs mt-1">Cliquez sur "Ajouter un produit" pour commencer</p>
                </div>
              ) : (
                invoiceItems.map((item, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50 relative group">
                    <button
                      onClick={() => removeInvoiceItem(idx)}
                      className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-300 w-5">#{idx + 1}</span>
                      <div className="flex gap-1.5 bg-white p-0.5 rounded-lg border border-gray-100">
                        <button
                          onClick={() => { const u = [...invoiceItems]; u[idx].isNew = false; setInvoiceItems(u); }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!item.isNew ? "bg-[#41b86d] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          Existant
                        </button>
                        <button
                          onClick={() => { const u = [...invoiceItems]; u[idx].isNew = true; setInvoiceItems(u); }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${item.isNew ? "bg-[#41b86d] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          Nouveau
                        </button>
                      </div>
                    </div>

                    {item.isNew ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du produit</label>
                          <Input placeholder="Ex: Peinture SatinÃ©e..." value={item.newName} onChange={e => { const u = [...invoiceItems]; u[idx].newName = e.target.value; setInvoiceItems(u); }} className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CatÃ©gorie</label>
                          <Select value={item.newCategory} onValueChange={v => { const u = [...invoiceItems]; u[idx].newCategory = v; setInvoiceItems(u); }}>
                            <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="satine">SatinÃ©</SelectItem>
                              <SelectItem value="enduit">Enduit</SelectItem>
                              <SelectItem value="vinyle">Vinyle</SelectItem>
                              <SelectItem value="laque">Laque</SelectItem>
                              <SelectItem value="decor">DÃ©cor</SelectItem>
                              <SelectItem value="fixateur">Fixateur</SelectItem>
                              <SelectItem value="accessoires">Accessoires</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produit</label>
                        <Select value={item.productId} onValueChange={v => { const u = [...invoiceItems]; u[idx].productId = v; setInvoiceItems(u); }}>
                          <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                          <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "QuantitÃ©", placeholder: "0", key: "quantity", type: "number" },
                        { label: "Prix achat", placeholder: "0 DZD", key: "priceBuy", type: "number" },
                        { label: "Prix vente", placeholder: "0 DZD", key: "priceSale", type: "number" },
                        { label: "PÃ©remption", placeholder: "", key: "expiryDate", type: "date" },
                      ].map(field => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={(item as any)[field.key] || ""}
                            onChange={e => { const u = [...invoiceItems]; (u[idx] as any)[field.key] = field.type === "number" ? Number(e.target.value) : e.target.value; setInvoiceItems(u); }}
                            className="bg-white border-gray-200 h-10 rounded-lg focus-visible:ring-0 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {invoiceItems.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500">{invoiceItems.length} produit{invoiceItems.length > 1 ? "s" : ""}</span>
                <span className="text-xl font-black text-[#41b86d]">{formatDZD(invoiceTotal)}</span>
              </div>
            )}
          </div>

          {/* Bottom action */}
          <div className="flex gap-3 justify-end pb-8">
            <Button
              variant="outline"
              onClick={() => { resetAddForm(); setView("list"); }}
              className="border-gray-200 text-gray-500 hover:bg-gray-50 font-bold h-11 px-6 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitInvoice}
              disabled={invoiceItems.length === 0}
              className="bg-[#41b86d] hover:bg-[#39a05f] text-white shadow-sm font-bold h-11 px-8 rounded-xl disabled:opacity-40"
            >
              Valider la Facture
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ RETOUR DE FACTURE VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "return") {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
          <div className="mx-auto max-w-md space-y-5">
            <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
              <button
                onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Retours</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Retour facture</h2>
              <p className="mt-1 text-sm text-white/70">SÃ©lectionnez une facture et les quantitÃ©s Ã  retirer.</p>
            </div>

            <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
              <p className="text-sm font-black text-[#243740]">Facture d'origine</p>
              <Select value={returnInvoiceId} onValueChange={v => { setReturnInvoiceId(v); setReturnItems([]); }}>
                <SelectTrigger className="mt-3 h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] text-sm">
                  <SelectValue placeholder="Choisir une facture..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.type === "achat").map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number} - {i.supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReturnInvoice && (
              <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                <p className="text-sm font-black text-[#243740]">Produits Ã  retourner</p>
                <div className="mt-4 space-y-3">
                  {selectedReturnInvoice.items.map((item, idx) => {
                    const currentQty = returnItems.find(r => r.idx === idx)?.quantity || 0;
                    return (
                      <div key={idx} className="rounded-[1.5rem] border border-gray-100 bg-[#f7fbfa] p-4">
                        <p className="text-sm font-bold text-[#243740]">{item.product.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          AchetÃ©: {item.quantity} â€¢ {formatDZD(item.priceBuy)} / unitÃ©
                        </p>
                        <Input
                          type="number"
                          className="mt-3 h-12 rounded-2xl border-gray-200 bg-white text-center font-bold"
                          min={0}
                          max={item.quantity}
                          value={currentQty || ""}
                          placeholder="QtÃ© retour"
                          onChange={e => {
                            const qty = Math.min(Number(e.target.value), item.quantity);
                            setReturnItems(prev => {
                              const existing = prev.find(r => r.idx === idx);
                              if (qty === 0) return prev.filter(r => r.idx !== idx);
                              if (existing) return prev.map(r => r.idx === idx ? { ...r, quantity: qty } : r);
                              return [...prev, { idx, quantity: qty }];
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-[1.75rem] bg-[#5f1f2f] px-5 py-4 text-white shadow-[0_18px_40px_rgba(95,31,47,0.16)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">Montant retour</p>
                  <p className="mt-1 text-2xl font-black">{formatDZD(returnTotal)}</p>
                </div>
                <Button
                  onClick={handleReturn}
                  disabled={returnItems.length === 0}
                  className="h-12 rounded-2xl bg-red-500 px-5 font-bold text-white hover:bg-red-600"
                >
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4f8f8] font-sans text-gray-800 animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#3f5362]">Retour de Facture</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">SÃ©lectionner une facture et les produits Ã  retourner</p>
              </div>
            </div>
            <Button
              onClick={handleReturn}
              disabled={returnItems.length === 0}
              className="bg-red-500 hover:bg-red-600 text-white shadow-sm font-bold h-11 px-6 rounded-xl disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmer le Retour
            </Button>
          </div>
        </div>

        <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
          {/* Invoice picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                <RotateCcw className="h-4 w-4 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Facture d'origine</h3>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">SÃ©lectionner une facture d'achat</label>
              <Select value={returnInvoiceId} onValueChange={v => { setReturnInvoiceId(v); setReturnItems([]); }}>
                <SelectTrigger className="bg-gray-50 border-gray-200 h-11 rounded-xl focus-visible:ring-0 max-w-lg">
                  <SelectValue placeholder="Choisir une facture..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.type === "achat").map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="font-mono text-xs text-gray-400 mr-2">{i.number}</span>
                      {i.supplier.name}
                      <span className="text-gray-400 ml-2 text-xs">Â· {new Date(i.date).toLocaleDateString("fr-FR")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items to return */}
          {selectedReturnInvoice && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Produits Ã  retourner</h3>
                <p className="text-xs text-gray-400 mt-0.5">Saisir la quantitÃ© Ã  retourner pour chaque produit (0 = pas de retour)</p>
              </div>
              <div className="p-6 space-y-3">
                {selectedReturnInvoice.items.map((item, idx) => {
                  const currentQty = returnItems.find(r => r.idx === idx)?.quantity || 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <p className="font-bold text-gray-700 text-sm">{item.product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          AchetÃ© : <span className="font-bold text-gray-600">{item.quantity}</span>
                          <span className="mx-2">Â·</span>
                          {formatDZD(item.priceBuy)} / unitÃ©
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <label className="text-xs font-bold text-gray-400">QtÃ© retour</label>
                        <Input
                          type="number"
                          className="w-24 h-10 text-center rounded-xl border-gray-200 bg-white focus-visible:ring-0 font-bold text-gray-700"
                          min={0}
                          max={item.quantity}
                          value={currentQty || ""}
                          placeholder="0"
                          onChange={e => {
                            const qty = Math.min(Number(e.target.value), item.quantity);
                            setReturnItems(prev => {
                              const existing = prev.find(r => r.idx === idx);
                              if (qty === 0) return prev.filter(r => r.idx !== idx);
                              if (existing) return prev.map(r => r.idx === idx ? { ...r, quantity: qty } : r);
                              return [...prev, { idx, quantity: qty }];
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {returnItems.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-red-50/40 flex items-center justify-between">
                  <span className="text-sm font-bold text-red-400">{returnItems.length} produit{returnItems.length > 1 ? "s" : ""} Ã  retourner</span>
                  <span className="text-xl font-black text-red-500">{formatDZD(returnTotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom action */}
          <div className="flex gap-3 justify-end pb-8">
            <Button
              variant="outline"
              onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
              className="border-gray-200 text-gray-500 hover:bg-gray-50 font-bold h-11 px-6 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleReturn}
              disabled={returnItems.length === 0}
              className="bg-red-500 hover:bg-red-600 text-white shadow-sm font-bold h-11 px-8 rounded-xl disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmer le Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ LIST VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Factures</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Flux achats</h2>
                <p className="mt-1 text-sm text-white/70">{invoices.length} facture{invoices.length !== 1 ? "s" : ""} au total</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Retour</p>
                <p className="text-lg font-black">{invoices.filter(invoice => invoice.type === "retour").length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setView("add")} className="h-12 rounded-[1.5rem] bg-[#41b86d] font-bold text-white hover:bg-[#39a05f]">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
            <Button variant="outline" onClick={() => setView("return")} className="h-12 rounded-[1.5rem] border-red-200 text-red-500 hover:bg-red-50">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </div>

          <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher une facture..."
                className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] pl-11 text-sm font-medium shadow-none focus-visible:ring-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="date"
              className="mt-3 h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] font-medium shadow-none focus-visible:ring-0"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[#c9dcda] bg-white px-4 py-10 text-center text-sm font-medium text-gray-400">
                Aucune facture trouvÃ©e.
              </div>
            ) : (
              filtered.map(inv => (
                <article key={inv.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#628b9a]">{inv.number}</p>
                      <p className="mt-2 text-lg font-black leading-tight text-[#243740]">{inv.supplier.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{new Date(inv.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${inv.type === "retour" ? "bg-red-100 text-red-500" : "bg-[#eef5f4] text-[#628b9a]"}`}>
                      {inv.type === "retour" ? "Retour" : "Achat"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7fbfa] px-3 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Total</p>
                      <p className="text-base font-black text-[#41b86d]">{formatDZD(inv.total)}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl border-[#41b86d]/20 text-[#41b86d] hover:bg-[#41b86d]/5"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      DÃ©tail
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-h-[85vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-[1.75rem] border-0 bg-white shadow-xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="border-b border-gray-100 pb-4 text-xl font-bold tracking-tight">
                Facture <span className="ml-2 text-lg font-mono text-gray-400">{selectedInvoice?.number}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-4 text-sm font-medium">
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Fournisseur</span>
                    <span className="font-bold">{selectedInvoice.supplier.name}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Date</span>
                    {new Date(selectedInvoice.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Type</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${selectedInvoice.type === "retour" ? "bg-red-100 text-red-600" : "bg-[#628b9a]/10 text-[#628b9a]"}`}>
                      {selectedInvoice.type === "retour" ? "Retour" : "Achat"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 px-1">
                  {selectedInvoice.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-gray-50 bg-white p-3">
                      <span className="text-sm font-bold text-gray-700">{item.product.name} <span className="ml-1 font-medium text-gray-400">Ã— {item.quantity}</span></span>
                      <span className="font-bold text-gray-600">{formatDZD(item.priceBuy * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xl font-black">
                  <span className="text-gray-800">Total</span>
                  <span className="text-[#41b86d]">{formatDZD(selectedInvoice.total)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Factures</h2>
          <p className="text-sm text-gray-400 font-medium mt-1">
            {invoices.length} facture{invoices.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setView("add")}
            className="bg-[#41b86d] hover:bg-[#39a05f] text-white shadow-sm font-bold h-11 px-5 rounded-xl"
          >
            <Plus className="h-5 w-5 mr-2" /> Ajouter une Facture
          </Button>
          <Button
            variant="outline"
            onClick={() => setView("return")}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 h-11 font-bold rounded-xl shadow-sm"
          >
            <RotateCcw className="h-5 w-5 mr-2" /> Retour de Facture
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-12 bg-white border-gray-200 h-12 shadow-sm rounded-xl focus-visible:ring-0 text-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="date"
          className="w-48 bg-white border-gray-200 h-12 shadow-sm rounded-xl font-medium focus-visible:ring-0"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">NÂ° Facture</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Fournisseur</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Date</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Type</th>
              <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Total</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400 font-medium">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  Aucune facture trouvÃ©e
                </td>
              </tr>
            ) : (
              filtered.map(inv => (
                <tr key={inv.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-gray-500 text-center">{inv.number}</td>
                  <td className="px-6 py-4 font-bold text-gray-700 text-center">{inv.supplier.name}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">{new Date(inv.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center ${inv.type === "retour" ? "bg-red-100 text-red-600" : "bg-[#628b9a]/10 text-[#628b9a]"}`}>
                      {inv.type === "retour" ? "Retour" : "Achat"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatDZD(inv.total)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-300 hover:text-[#41b86d] hover:bg-[#41b86d]/10 transition-colors"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal â€” kept as dialog since it's just a viewer */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-lg bg-white border-0 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-4 tracking-tight">
              Facture <span className="text-gray-400 font-mono text-lg ml-2">{selectedInvoice?.number}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-5 pt-2">
              <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Fournisseur</span>
                  <span className="font-bold">{selectedInvoice.supplier.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Date</span>
                  {new Date(selectedInvoice.date).toLocaleDateString("fr-FR")}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Type</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${selectedInvoice.type === "retour" ? "bg-red-100 text-red-600" : "bg-[#628b9a]/10 text-[#628b9a]"}`}>
                    {selectedInvoice.type === "retour" ? "Retour" : "Achat"}
                  </span>
                </div>
              </div>
              <div className="space-y-2 px-1">
                {selectedInvoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-2.5 border border-gray-50 rounded-xl">
                    <span className="font-bold text-gray-700 text-sm">{item.product.name} <span className="text-gray-400 font-medium ml-1">Ã— {item.quantity}</span></span>
                    <span className="font-bold text-gray-600">{formatDZD(item.priceBuy * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xl font-black">
                <span className="text-gray-800">Total</span>
                <span className="text-[#41b86d]">{formatDZD(selectedInvoice.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
