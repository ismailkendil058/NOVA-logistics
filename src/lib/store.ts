// NOVA DECO — Data Store (localStorage-backed)

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  category: CategoryType;
  priceSale: number;
  priceBuy: number;
  stock: number;
  unit: 'unité' | 'kg';
  expiryDate?: string;
}

export type CategoryType = 'satine' | 'enduit' | 'vinyle' | 'decor' | 'fixateur' | 'accessoires';

export interface CartItem {
  product: Product;
  quantity: number;
  weightKg?: number;
  subtotal: number;
}

export interface Bon {
  id: string;
  number: string;
  clientName: string;
  clientPhone: string;
  items: CartItem[];
  teinteAmount: number;
  reduction: number;
  total: number;
  date: string;
  status: 'en_cours' | 'payé';
}

export interface Sale {
  id: string;
  type: 'direct' | 'bon';
  bonId?: string;
  items: CartItem[];
  teinteAmount: number;
  reduction: number;
  total: number;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface InvoiceItem {
  product: Product;
  quantity: number;
  priceBuy: number;
  priceSale: number;
  expiryDate?: string;
}

export interface Invoice {
  id: string;
  number: string;
  supplier: Supplier;
  items: InvoiceItem[];
  total: number;
  date: string;
  type: 'achat' | 'retour';
}

// Helpers
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`novadeco_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(`novadeco_${key}`, JSON.stringify(data));
}

// --- Products ---
export function getProducts(): Product[] {
  return load<Product[]>('products', defaultProducts());
}
export function saveProducts(p: Product[]) { save('products', p); }
export function updateProductStock(id: string, delta: number) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx >= 0) {
    products[idx].stock = Math.max(0, products[idx].stock + delta);
    saveProducts(products);
  }
}

// --- Bons ---
export function getBons(): Bon[] { return load<Bon[]>('bons', []); }
export function saveBons(b: Bon[]) { save('bons', b); }
export function addBon(b: Bon) { const bons = getBons(); bons.unshift(b); saveBons(bons); }

// --- Sales ---
export function getSales(): Sale[] { return load<Sale[]>('sales', []); }
export function saveSales(s: Sale[]) { save('sales', s); }
export function addSale(s: Sale) { const sales = getSales(); sales.unshift(s); saveSales(sales); }

// --- Suppliers ---
export function getSuppliers(): Supplier[] { return load<Supplier[]>('suppliers', []); }
export function saveSuppliers(s: Supplier[]) { save('suppliers', s); }

// --- Invoices ---
export function getInvoices(): Invoice[] { return load<Invoice[]>('invoices', []); }
export function saveInvoices(i: Invoice[]) { save('invoices', i); }

// --- Default products ---
function defaultProducts(): Product[] {
  return [
    { id: '1', name: 'Satiné Blanc 25kg', nameAr: 'ساتيني أبيض', category: 'satine', priceSale: 5500, priceBuy: 4200, stock: 30, unit: 'unité' },
    { id: '2', name: 'Satiné Ivoire 25kg', nameAr: 'ساتيني عاجي', category: 'satine', priceSale: 5800, priceBuy: 4500, stock: 20, unit: 'unité' },
    { id: '3', name: 'Enduit Fin 25kg', nameAr: 'معجون ناعم', category: 'enduit', priceSale: 3200, priceBuy: 2400, stock: 45, unit: 'unité' },
    { id: '4', name: 'Enduit de Rebouchage', nameAr: 'معجون ترميم', category: 'enduit', priceSale: 2800, priceBuy: 2000, stock: 25, unit: 'unité' },
    { id: '5', name: 'Vinyle Mat 10L', nameAr: 'فينيل مطفي', category: 'vinyle', priceSale: 4500, priceBuy: 3500, stock: 35, unit: 'unité' },
    { id: '6', name: 'Vinyle Brillant 10L', nameAr: 'فينيل لامع', category: 'vinyle', priceSale: 4800, priceBuy: 3700, stock: 20, unit: 'unité' },
    { id: '7', name: 'Cadre Décoratif Or', nameAr: 'إطار ذهبي', category: 'decor', priceSale: 3500, priceBuy: 2200, stock: 15, unit: 'unité' },
    { id: '8', name: 'Sticker Mural Floral', nameAr: 'ملصق جداري', category: 'decor', priceSale: 1800, priceBuy: 900, stock: 40, unit: 'unité' },
    { id: '9', name: 'Fixateur Universel 5L', nameAr: 'مثبت عالمي', category: 'fixateur', priceSale: 3000, priceBuy: 2200, stock: 28, unit: 'unité' },
    { id: '10', name: 'Fixateur Acrylique 1L', nameAr: 'مثبت أكريليك', category: 'fixateur', priceSale: 1200, priceBuy: 800, stock: 50, unit: 'unité' },
    { id: '11', name: 'Rouleau Laine 25cm', nameAr: 'رولو صوف', category: 'accessoires', priceSale: 600, priceBuy: 350, stock: 60, unit: 'unité' },
    { id: '12', name: 'Pinceau Plat 10cm', nameAr: 'فرشاة مسطحة', category: 'accessoires', priceSale: 400, priceBuy: 200, stock: 80, unit: 'unité' },
  ];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' DZD';
}

export const CATEGORIES: { key: CategoryType; label: string; labelAr: string }[] = [
  { key: 'satine', label: 'Satiné', labelAr: 'ساتيني' },
  { key: 'enduit', label: 'Enduit', labelAr: 'معجون' },
  { key: 'vinyle', label: 'Vinyle', labelAr: 'فينيل' },
  { key: 'decor', label: 'Décor', labelAr: 'ديكور' },
  { key: 'fixateur', label: 'Fixateur', labelAr: 'مثبت' },
  { key: 'accessoires', label: 'Accessoires', labelAr: 'إكسسوارات' },
];
