import { useState, useMemo } from "react";
import { Search, Eye, Edit3, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBons, Bon, formatDZD, updateBon, CartItem, getProducts, updateProductStock } from "@/lib/store";

export default function BonsPage() {
  const [bons, setBons] = useState(getBons);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBon, setSelectedBon] = useState<Bon | null>(null);
  const [editingBon, setEditingBon] = useState<Bon | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editingItems, setEditingItems] = useState<CartItem[]>([]);
  const [newProductId, setNewProductId] = useState("");
  const [newProductQty, setNewProductQty] = useState("");
  const [editReduction, setEditReduction] = useState("");
  const products = getProducts();

  const filtered = useMemo(() => {
    return bons.filter(b => {
      const matchSearch = !search || b.clientName.toLowerCase().includes(search.toLowerCase()) || b.number.includes(search);
      const matchDate = !dateFilter || b.date.startsWith(dateFilter);
      return matchSearch && matchDate;
    });
  }, [bons, search, dateFilter]);

  const openEditBon = (bon: Bon) => {
    setEditingBon(bon);
    setEditClientName(bon.clientName);
    setEditClientPhone(bon.clientPhone);
    setEditingItems(bon.items.map(item => ({ ...item })));
    setNewProductId("");
    setNewProductQty("");
    setEditReduction(bon.reduction.toString());
  };

  const closeEditBon = () => {
    setEditingBon(null);
    setEditingItems([]);
    setNewProductId("");
    setNewProductQty("");
    setEditReduction("");
  };

  const getInventoryProductId = (item: CartItem) => item.customBaseProductId ?? item.product.id;

  const applyInventoryAdjustments = (original: CartItem[], updated: CartItem[]) => {
    const deltaMap = new Map<string, number>();
    original.forEach(item => {
      const id = getInventoryProductId(item);
      deltaMap.set(id, (deltaMap.get(id) ?? 0) + item.quantity);
    });
    updated.forEach(item => {
      const id = getInventoryProductId(item);
      deltaMap.set(id, (deltaMap.get(id) ?? 0) - item.quantity);
    });
    deltaMap.forEach((delta, productId) => {
      if (delta !== 0) {
        updateProductStock(productId, delta);
      }
    });
  };

  const handleEditSave = () => {
    if (!editingBon) return;
    applyInventoryAdjustments(editingBon.items, editingItems);
    const subtotal = editingItems.reduce((sum, item) => sum + item.subtotal, 0);
    const reductionValue = Number(editReduction) || 0;
    const updated: Bon = {
      ...editingBon,
      clientName: editClientName.trim() || editingBon.clientName,
      clientPhone: editClientPhone.trim() || editingBon.clientPhone,
      items: editingItems,
      reduction: reductionValue,
      total: subtotal + editingBon.teinteAmount - reductionValue,
    };
    updateBon(updated);
    setBons(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("novaInventoryUpdated"));
    }
    closeEditBon();
  };

  const isEditFormValid = editClientName.trim().length > 0 && editClientPhone.trim().length > 0;
  const selectedProductsForAdd = products.filter(p => p.stock > 0);
  const editingItemsSubtotal = editingItems.reduce((sum, item) => sum + item.subtotal, 0);
  const hasEditingItems = editingItems.length > 0;
  const editingBonTeinte = editingBon?.teinteAmount ?? 0;
  const editingReductionValue = Number(editReduction) || 0;
  const editingTotal = editingItemsSubtotal + editingBonTeinte - editingReductionValue;
  const selectedOriginalItems = editingBon?.items ?? [];
  const itemsDiffer = Boolean(editingBon) && (
    editingItems.length !== selectedOriginalItems.length ||
    editingItems.some((item, index) => {
      const original = selectedOriginalItems[index];
      if (!original) return true;
      return (
        original.product.id !== item.product.id ||
        original.quantity !== item.quantity ||
        original.subtotal !== item.subtotal ||
        original.customUnitPrice !== item.customUnitPrice
      );
    })
  );
  const clientChanged = Boolean(editingBon && (editClientName.trim() !== editingBon.clientName || editClientPhone.trim() !== editingBon.clientPhone));
  const reductionChanged = Boolean(editingBon && editingReductionValue !== editingBon.reduction);
  const hasChanges = clientChanged || itemsDiffer || reductionChanged;
  const canSaveEdit = isEditFormValid && hasEditingItems && hasChanges;

  const handleEditItemQuantity = (productId: string, quantity: number) => {
    setEditingItems(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const unitPrice = item.customUnitPrice ?? item.product.priceSale;
      const newQty = Math.max(0, quantity);
      return { ...item, quantity: newQty, subtotal: newQty * unitPrice };
    }).filter(item => item.quantity > 0));
  };

  const removeEditingItem = (productId: string) => {
    setEditingItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleAddProduct = () => {
    if (!newProductId || Number(newProductQty) <= 0) return;
    const product = products.find(p => p.id === newProductId);
    if (!product) return;
    const qty = Number(newProductQty);
    const subtotal = qty * product.priceSale;
    const cartItem: CartItem = {
      product,
      quantity: qty,
      subtotal,
      weightKg: qty,
    };
    setEditingItems(prev => [...prev, cartItem]);
    setNewProductId("");
    setNewProductQty("");
  };

  const handleClientNameChange = (value: string) => {
    setEditClientName(value);
  };

  const handleClientPhoneChange = (value: string) => {
    setEditClientPhone(value);
  };

  const handleReductionChange = (value: string) => {
    setEditReduction(value);
  };

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
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 font-medium">Aucun bon trouvé</td></tr>
            ) : (
              filtered.map(bon => (
                <tr key={bon.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-gray-500 text-center">{bon.number}</td>
                  <td className="px-6 py-4 font-bold text-gray-700 text-center">{bon.clientName}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">{bon.clientPhone}</td>
                  <td className="px-6 py-4 font-medium text-gray-500 text-center">{new Date(bon.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-center font-black text-[#41b86d]">{formatDZD(bon.total)}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-[#41b86d] hover:bg-[#41b86d]/10 transition-colors" onClick={() => setSelectedBon(bon)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-[#628b9a] hover:bg-[#628b9a]/10 transition-colors" onClick={() => openEditBon(bon)}>
                      <Edit3 className="h-4 w-4" />
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
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-4 tracking-tight">
              Détail du Bon <span className="text-gray-400 font-mono text-lg ml-2">{selectedBon?.number}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedBon && (
            <div className="space-y-6 pt-2">
              <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Client</span>
                  <span className="font-bold">{selectedBon.clientName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Téléphone</span>
                  {selectedBon.clientPhone}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Date</span>
                  {new Date(selectedBon.date).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div className="space-y-3 px-1">
                {selectedBon.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-2 border border-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 text-sm">
                      {item.product.name} <span className="text-gray-400 font-medium ml-2">× {item.quantity}</span>
                    </span>
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

      <Dialog open={!!editingBon} onOpenChange={open => { if (!open) closeEditBon(); }}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-4 tracking-tight">
              Modifier le bon <span className="text-gray-400 font-mono text-lg ml-2">{editingBon?.number}</span>
            </DialogTitle>
          </DialogHeader>
          {editingBon && (
            <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500">Client</p>
                  <Input value={editClientName} onChange={e => handleClientNameChange(e.target.value)} placeholder="Nom complet" className="h-11 border-gray-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500">Téléphone</p>
                  <Input value={editClientPhone} onChange={e => handleClientPhoneChange(e.target.value)} placeholder="Numéro de téléphone" className="h-11 border-gray-200" />
                </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500">Articles</p>
                  <span className="text-xs font-semibold text-gray-400">{editingItems.length} article(s)</span>
                </div>
                {editingItems.length === 0 ? (
                  <p className="text-xs text-gray-400">Ajoutez des articles pour modifier le bon.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-auto pr-1">
                    {editingItems.map(item => {
                      const unitPrice = item.customUnitPrice ?? item.product.priceSale;
                      return (
                        <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-700 truncate">{item.product.name}</p>
                            <p className="text-[11px] text-gray-500">{formatDZD(unitPrice)} / unité</p>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            className="w-20 h-10 text-sm"
                            value={item.quantity}
                            onChange={e => handleEditItemQuantity(item.product.id, Number(e.target.value))}
                          />
                          <p className="font-bold text-gray-700">{formatDZD(item.subtotal)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-100"
                            onClick={() => removeEditingItem(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Ajouter un produit</p>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="col-span-2">
                    <select
                      className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                      value={newProductId}
                      onChange={e => setNewProductId(e.target.value)}
                    >
                      <option value="">Sélectionner un produit</option>
                      {selectedProductsForAdd.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {formatDZD(product.priceSale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qté"
                    className="h-10 rounded-xl text-sm col-span-1"
                    value={newProductQty}
                    onChange={e => setNewProductQty(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm font-semibold"
                  onClick={handleAddProduct}
                  disabled={!newProductId || Number(newProductQty) <= 0}
                >
                  Ajouter à la liste
                </Button>
                <div className="flex justify-between text-sm font-bold text-gray-600">
                  <span>Montant articles</span>
                  <span>{formatDZD(editingItemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Teinte </span>
                  <span>{formatDZD(editingBonTeinte)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-widest text-gray-500">Réduction (DZD)</span>
                  <Input
                    type="number"
                    min={0}
                    value={editReduction}
                    onChange={e => handleReductionChange(e.target.value)}
                    className="h-10 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div className="flex justify-between text-lg font-black text-[#41b86d]">
                  <span>Total modifié</span>
                  <span>{formatDZD(editingTotal)}</span>
                </div>
              </div>
              <Button
                disabled={!canSaveEdit}
                onClick={handleEditSave}
                className="w-full h-11 mt-1 bg-[#41b86d] hover:bg-[#378f63] text-white font-bold"
              >
                Enregistrer les modifications
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
  </div>
);
}
