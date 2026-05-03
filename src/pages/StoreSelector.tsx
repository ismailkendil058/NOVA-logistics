import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, Store } from "@/lib/StoreContext";
import { Store as StoreIcon, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// MULTI-STORE: Component to render the store selection UI before dashboard
export default function StoreSelector() {
    const { setStore, currentStore, isLoading: contextLoading } = useStore();
    const navigate = useNavigate();
    const [stores, setStores] = useState<Store[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // MULTI-STORE: Redirect to dashboard if a store is already selected
        if (!contextLoading && currentStore) {
            navigate("/");
        }
    }, [currentStore, contextLoading, navigate]);

    useEffect(() => {
        // MULTI-STORE: Mock fetching stores from Supabase. 
        // Replace this logic with your actual Supabase query later.
        const fetchStores = async () => {
            setIsLoading(true);
            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 800));

                // MULTI-STORE: Renamed "Succursale" to "Placo" as requested
                setStores([
                    { id: "store-1", name: "Nova Deco - Magasin Principal", slug: "magasin-principal" },
                    { id: "store-2", name: "Nova Deco - Placo", slug: "placo" },
                ]);
            } catch (error) {
                console.error("Failed to fetch stores", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStores();
    }, []);

    const handleSelectStore = (store: Store) => {
        setStore(store);
        navigate("/");
    };

    if (contextLoading) return null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f8f8] p-4 font-sans selection:bg-[#41b86d]/30">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden animate-in fade-in zoom-in duration-500">
                {/* Header with Brand Colors */}
                <div className="bg-[#243740] p-10 text-center relative overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#41b86d] opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-[#628b9a] opacity-10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white/10 p-4 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                            <StoreIcon className="h-10 w-10 text-[#41b86d]" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                            NOVA<span className="text-[#41b86d]">DECO</span>
                        </h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">C'est un plaisir de vous revoir</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-8 text-center px-4">
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Sélection du Magasin</h2>
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">Veuillez choisir le magasin que vous souhaitez gérer aujourd'hui.</p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center py-16 space-y-4">
                            <div className="relative">
                                <Loader2 className="h-10 w-10 animate-spin text-[#41b86d]" />
                                <Sparkles className="h-4 w-4 text-[#41b86d] absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Chargement de vos accès</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stores.map(store => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectStore(store)}
                                    className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-50 bg-gray-50/30 hover:border-[#41b86d]/30 hover:bg-white hover:shadow-[0_10px_25px_rgba(65,184,109,0.1)] transition-all duration-300 group text-left relative overflow-hidden"
                                >
                                    {/* Active State Indicator (Hidden by default) */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#41b86d] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:border-[#41b86d]/20 transition-colors">
                                            <StoreIcon className="h-5 w-5 text-gray-400 group-hover:text-[#41b86d] transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 group-hover:text-[#41b86d] transition-colors">{store.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter group-hover:bg-[#41b86d]/10 group-hover:text-[#41b86d] transition-colors">
                                                    {store.slug}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <ArrowRight className="h-4 w-4 text-[#41b86d]" strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer simple */}
                <div className="px-8 pb-8 text-center mt-2">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-loose">
                        Système de gestion Nova Deco<br />
                        v2.4 · Accès sécurisé
                    </p>
                </div>
            </div>
        </div>
    );
}
