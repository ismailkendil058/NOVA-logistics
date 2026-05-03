import { Bon, formatDZD } from "@/lib/store";

interface BonA4Props {
    bon: Bon;
}

export function BonA4({ bon }: BonA4Props) {
    return (
        <div className="print-only hidden print:block bg-white text-gray-900 font-sans w-full mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-[#3f5362]">
                        NOVA<span className="text-[#41b86d]">DECO</span>
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                        Décoration Intérieure
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800 uppercase">Bon de Vente</h2>
                    <p className="text-sm font-mono font-bold text-gray-500">{bon.number}</p>
                    <p className="text-xs text-gray-400">{new Date(bon.date).toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            {/* Info Section */}
            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Client</p>
                    <p className="font-bold">{bon.clientName}</p>
                    <p className="text-gray-600">{bon.clientPhone}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Magasin</p>
                    <p className="font-bold text-gray-700">NovaDeco</p>
                    <p className="text-xs text-gray-500">Algérie</p>
                </div>
            </div>

            {/* Table */}
            <div className="mb-6">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-100 bg-gray-50">
                            <th className="py-2 px-3 font-bold text-gray-600">Désignation</th>
                            <th className="py-2 px-3 font-bold text-gray-600 text-center">Qté</th>
                            <th className="py-2 px-3 font-bold text-gray-600 text-right">Prix</th>
                            <th className="py-2 px-3 font-bold text-gray-600 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bon.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-50">
                                <td className="py-2 px-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-800">{item.product.name}</span>
                                        {item.product.nameAr && <span className="text-xs text-gray-400 mr-2" dir="rtl">{item.product.nameAr}</span>}
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center">{item.quantity}</td>
                                <td className="py-2 px-3 text-right">{formatDZD(item.customUnitPrice ?? item.product.priceSale)}</td>
                                <td className="py-2 px-3 text-right font-bold">{formatDZD(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 px-2">
                        <span>Sous-total</span>
                        <span>{formatDZD(bon.items.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                    </div>

                    {bon.teinteAmount > 0 && (
                        <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                            <div className="flex justify-between font-bold text-[#41b86d]">
                                <span>Teinte</span>
                                <span>+{formatDZD(bon.teinteAmount)}</span>
                            </div>
                            {bon.teinteEntries && bon.teinteEntries.length > 0 && (
                                <div className="text-[10px] text-gray-400">
                                    {bon.teinteEntries.map((e, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{e.kg}kg x {formatDZD(e.unitPrice)}</span>
                                            <span>{formatDZD(e.kg * e.unitPrice)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {bon.reduction > 0 && (
                        <div className="flex justify-between text-xs text-red-500 px-2">
                            <span>Réduction</span>
                            <span>-{formatDZD(bon.reduction)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center border-t border-gray-200 pt-2 px-2">
                        <span className="text-sm font-black uppercase">Total</span>
                        <span className="text-xl font-black text-[#41b86d]">{formatDZD(bon.total)}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Signatures */}
            <div className="mt-12 grid grid-cols-2 gap-8 text-center">
                <div>
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-10">Cachet Magasin</p>
                    <div className="w-20 h-20 border border-dashed border-gray-100 rounded-full mx-auto"></div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-10">Signature Client</p>
                    <div className="border-b border-gray-100 w-32 mx-auto"></div>
                </div>
            </div>

            <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4">
                Merci de votre visite · NovaDeco Algérie
            </div>
        </div>
    );
}
