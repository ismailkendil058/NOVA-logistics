import React, { createContext, useContext, useState, useEffect } from 'react';

// MULTI-STORE: Definition of the Store entity
export interface Store {
    id: string;
    name: string;
    slug: string;
}

// MULTI-STORE: Definition of the Context layout
interface StoreContextType {
    currentStore: Store | null;
    setStore: (store: Store | null) => void;
    isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// MULTI-STORE: Provider that wraps the app to give access to the active store
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // MULTI-STORE: Retrieve persisted store selection from localStorage on load
        const storedStore = localStorage.getItem('novadeco_selected_store');
        if (storedStore) {
            try {
                setCurrentStoreState(JSON.parse(storedStore));
            } catch (e) {
                console.error("Failed to parse store", e);
            }
        }
        setIsLoading(false);
    }, []);

    const setStore = (store: Store | null) => {
        setCurrentStoreState(store);
        if (store) {
            // MULTI-STORE: Persist selected store in localStorage
            localStorage.setItem('novadeco_selected_store', JSON.stringify(store));
            // MULTI-STORE: Dispatch a global event so listeners know the store changed
            window.dispatchEvent(new Event("novaStoreUpdated"));
        } else {
            localStorage.removeItem('novadeco_selected_store');
        }
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
