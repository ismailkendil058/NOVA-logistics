import { useState, useEffect } from "react";
import { formatDZD, getCredits, Credit, updateCredit, generateId } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, User, Phone, Calendar, Banknote, History, Package, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CreditPage() {
    const [credits, setCredits] = useState<Credit[]>([]);
    const [search, setSearch] = useState("");
    const [showPayModal, setShowPayModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [payAmount, setPayAmount] = useState("");

    useEffect(() => {
        setCredits(getCredits());
    }, []);

    const getPaidAmount = (credit: Credit) => (credit.versements || []).reduce((sum, v) => sum + v.amount, 0);

    const filteredCredits = credits.filter(c =>
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.clientPhone.includes(search)
    );

    const openPayModal = (credit: Credit) => {
        setSelectedCredit(credit);
        setPayAmount("");
        setShowPayModal(true);
    };

    const openHistoryModal = (credit: Credit) => {
        setSelectedCredit(credit);
        setShowHistoryModal(true);
    };

    const handlePay = () => {
        if (!selectedCredit) return;
        const amount = Number(payAmount);
        if (!amount || amount <= 0) {
            toast.error("Veuillez entrer un montant valide");
            return;
        }

        const currentPaid = getPaidAmount(selectedCredit);
        const remaining = selectedCredit.total - currentPaid;
        if (amount > remaining) {
            toast.error("Le montant dépasse le reste à payer");
            return;
        }

        const updated: Credit = {
            ...selectedCredit,
            versements: [
                ...(selectedCredit.versements || []),
                { id: generateId(), amount, date: new Date().toISOString() }
            ]
        };

        updateCredit(updated);
        setCredits(getCredits());
        setShowPayModal(false);
        toast.success("Versement enregistré");
    };

    const totalCreditAmount = credits.reduce((sum, c) => sum + (c.total - getPaidAmount(c)), 0);

    return (
        <div className="p-6 space-y-6 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-800">Gestion des Crédits</h2>
                    <p className="text-sm font-medium text-gray-500">Suivi des dettes et historique des versements</p>
                </div>
                <Card className="bg-orange-50 border-orange-100 shadow-sm min-w-[240px]">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500 p-2 rounded-lg text-white">
                                <Banknote className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Total Dettes Clients</p>
                                <p className="text-2xl font-black text-orange-700">{formatDZD(totalCreditAmount)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-gray-100 pb-4">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-700">Liste des Crédits</CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher un client..."
                                className="pl-10 h-10 bg-gray-50 border-gray-100 focus:bg-white transition-all rounded-xl"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow className="hover:bg-transparent border-gray-100">
                                    <TableHead className="font-bold text-gray-400 py-4">Client</TableHead>
                                    <TableHead className="font-bold text-gray-400">Date Initiale</TableHead>
                                    <TableHead className="font-bold text-gray-400">Total</TableHead>
                                    <TableHead className="font-bold text-gray-400">Versé</TableHead>
                                    <TableHead className="font-bold text-gray-400">Reste</TableHead>
                                    <TableHead className="text-right font-bold text-gray-400 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCredits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-gray-400">
                                            Aucun crédit trouvé
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCredits.map((credit) => {
                                        const paid = getPaidAmount(credit);
                                        const remaining = credit.total - paid;
                                        const isPaid = remaining <= 0;

                                        return (
                                            <TableRow key={credit.id} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-gray-800 flex items-center gap-2">
                                                            <User className="h-3 w-3 text-gray-400" /> {credit.clientName}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 flex items-center gap-2">
                                                            <Phone className="h-3 w-3" /> {credit.clientPhone}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-600 flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-gray-400" /> {new Date(credit.date).toLocaleDateString('fr-DZ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-bold text-gray-700">{formatDZD(credit.total)}</TableCell>
                                                <TableCell className="font-bold text-green-600">{formatDZD(paid)}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {isPaid ? "PAYÉ" : formatDZD(remaining)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-gray-500 hover:text-[#41b86d] hover:bg-[#41b86d]/5 gap-2 font-bold"
                                                            onClick={() => openHistoryModal(credit)}
                                                        >
                                                            <History className="h-4 w-4" /> Historique
                                                        </Button>
                                                        {!isPaid && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2 font-bold"
                                                                onClick={() => openPayModal(credit)}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" /> Verser
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pay Modal */}
            <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-3">Enregistrer un versement</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        {selectedCredit && (
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Client</span>
                                    <span className="text-gray-700">{selectedCredit.clientName}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Reste à payer</span>
                                    <span className="text-orange-600">{formatDZD(selectedCredit.total - getPaidAmount(selectedCredit))}</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Montant du versement</label>
                            <Input
                                type="number"
                                placeholder="Ex. 5000"
                                className="h-12 text-lg font-bold bg-white border-gray-200 focus:ring-blue-500 rounded-xl"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="bg-gray-50/50 p-4 -mx-6 -mb-6 rounded-b-2xl border-t border-gray-100 gap-2">
                        <Button variant="outline" className="flex-1 h-11 font-bold rounded-xl border-gray-200" onClick={() => setShowPayModal(false)}>Annuler</Button>
                        <Button className="flex-1 h-11 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" onClick={handlePay}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Modal */}
            <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
                <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold border-b border-gray-100 pb-3">Détails & Historique</DialogTitle>
                    </DialogHeader>

                    {selectedCredit && (
                        <div className="py-4 space-y-6">
                            {/* Client Info Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Client</p>
                                    <p className="font-bold text-gray-800">{selectedCredit.clientName}</p>
                                    <p className="text-xs text-gray-500">{selectedCredit.clientPhone}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">État du Crédit</p>
                                    <p className="font-bold text-orange-600">{formatDZD(selectedCredit.total - getPaidAmount(selectedCredit))} restant</p>
                                    <p className="text-xs text-gray-400">sur {formatDZD(selectedCredit.total)}</p>
                                </div>
                            </div>

                            {/* Products List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Produits achetés
                                </h4>
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-gray-50/50">
                                            <TableRow className="hover:bg-transparent border-gray-50">
                                                <TableHead className="text-[10px] uppercase font-bold py-2">Désignation</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold">Qté</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedCredit.items.map((item, idx) => (
                                                <TableRow key={idx} className="border-gray-50">
                                                    <TableCell className="py-2 text-xs font-medium text-gray-700">{item.product.name}</TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-500">{item.quantity} {item.weightKg ? 'kg' : 'pcs'}</TableCell>
                                                    <TableCell className="py-2 text-xs font-bold text-gray-800 text-right">{formatDZD(item.subtotal)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(selectedCredit.teinteAmount ?? 0) > 0 && (
                                                <TableRow className="bg-gray-50/30 border-gray-50">
                                                    <TableCell className="py-2 text-xs font-medium text-[#628b9a]">La Teinte</TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-500">-</TableCell>
                                                    <TableCell className="py-2 text-xs font-bold text-[#628b9a] text-right">+{formatDZD(selectedCredit.teinteAmount)}</TableCell>
                                                </TableRow>
                                            )}
                                            {(selectedCredit.reduction ?? 0) > 0 && (
                                                <TableRow className="bg-red-50/30 border-gray-50">
                                                    <TableCell className="py-2 text-xs font-medium text-red-600">Réduction</TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-500">-</TableCell>
                                                    <TableCell className="py-2 text-xs font-bold text-red-600 text-right">-{formatDZD(selectedCredit.reduction)}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Versements List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ArrowUpRight className="h-4 w-4" /> Historique des Versements
                                </h4>
                                <div className="space-y-2">
                                    {(!selectedCredit.versements || selectedCredit.versements.length === 0) ? (
                                        <p className="text-center py-4 text-xs text-gray-400 italic">Aucun versement enregistré</p>
                                    ) : (
                                        selectedCredit.versements.map((v, idx) => (
                                            <div key={v.id} className="flex items-center justify-between p-3 bg-green-50/50 border border-green-100 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-green-100 p-1.5 rounded-lg">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">Versement #{(selectedCredit.versements?.length || 0) - idx}</p>
                                                        <p className="text-[10px] text-gray-400">{new Date(v.date).toLocaleString('fr-DZ')}</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-green-700">{formatDZD(v.amount)}</p>
                                            </div>
                                        )).reverse()
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t border-gray-100 pt-4 mt-2">
                        <Button className="w-full h-11 font-bold rounded-xl bg-gray-800 text-white hover:bg-gray-900" onClick={() => setShowHistoryModal(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
