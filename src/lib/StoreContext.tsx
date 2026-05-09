import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

// MULTI-STORE: Definition of the Store entity
export interface Store {
    id: string;
    name: string;
    slug: string;
}

// MULTI-STORE: Definition of the Context layout
interface StoreContextType {
    currentStore: Store | null;
    setStore: (store: Store | null) => Promise<void>;
    isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// MULTI-STORE: Provider that wraps the app to give access to the active store
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initStore = async () => {
            // Only localStorage usage: persist which store is selected (not business data)
            const storedStore = localStorage.getItem('novadeco_selected_store');
            if (storedStore) {
                try {
                    const store = JSON.parse(storedStore);
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (store && store.id && uuidRegex.test(store.id)) {
                        setCurrentStoreState(store);
                    } else {
                        // Invalid store ID (likely a placeholder like 'store-1'), clear it
                        localStorage.removeItem('novadeco_selected_store');
                        setCurrentStoreState(null);
                    }
                } catch (e) {
                    console.error("Failed to parse store", e);
                    localStorage.removeItem('novadeco_selected_store');
                }
            }
            setIsLoading(false);
        };
        initStore();
    }, []);

    // REALTIME: Listen for changes on critical tables
    useEffect(() => {
        if (!currentStore) return;

        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${currentStore.id}` }, () => {
                window.dispatchEvent(new Event("novaInventoryUpdated"));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `store_id=eq.${currentStore.id}` }, () => {
                window.dispatchEvent(new Event("novaInventoryUpdated"));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStore]);

    const setStore = async (store: Store | null) => {
        setIsLoading(true);
        setCurrentStoreState(store);
        if (store) {
            localStorage.setItem('novadeco_selected_store', JSON.stringify(store));
            window.dispatchEvent(new Event("novaStoreUpdated"));
        } else {
            localStorage.removeItem('novadeco_selected_store');
        }
        setIsLoading(false);
    };

    return (
        <StoreContext.Provider value={{ currentStore, setStore, isLoading }}>
            {children}
        </StoreContext.Provider>
    );
};

// MULTI-STORE: Custom hook to use the store context
export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
