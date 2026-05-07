// NOVA DECO - Data Store (Supabase 100% Integration)
import { supabase } from "./supabase";
import * as sync from "./supabaseSync";

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  category: CategoryType;
  priceSale: number;
  priceBuy: number;
  stock: number;
  minStock?: number;
  unit: "unité" | "kg";
  expiryDate?: string;
}

export type CategoryType = "satine" | "enduit" | "vinyle" | "laque" | "decor" | "fixateur" | "accessoires";

export interface CartItem {
  product: Product;
  quantity: number;
  weightKg?: number;
  subtotal: number;
  customUnitPrice?: number;
  customUnitCost?: number;
  customBaseProductId?: string;
  customCardId?: string;
}

export interface TeinteEntry {
  unitPrice: number;
  kg: number;
}

export interface CustomSaleCard {
  id: string;
  baseProductId: string;
  baseProductName: string;
  category: CategoryType;
  kg: number;
  unitPrice: number;
  priceBuyPerKg?: number;
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
  teinteEntries?: TeinteEntry[];
}

export interface Versement {
  id: string;
  amount: number;
  date: string;
}

export interface Credit {
  id: string;
  clientName: string;
  clientPhone: string;
  items: CartItem[];
  teinteAmount: number;
  teinteEntries?: TeinteEntry[];
  reduction: number;
  total: number;
  versements: Versement[];
  date: string;
}

export interface Sale {
  id: string;
  type: "direct" | "bon" | "credit" | "retour";
  bonId?: string;
  creditId?: string;
  items: CartItem[];
  teinteAmount: number;
  reduction: number;
  total: number;
  date: string;
  teinteEntries?: TeinteEntry[];
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

export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
}

export interface Invoice {
  id: string;
  number: string;
  supplier: Supplier;
  items: InvoiceItem[];
  total: number;
  paidAmount: number;
  payments: InvoicePayment[];
  date: string;
  type: "achat" | "retour";
}

export interface Expense {
  id: string;
  reason: string;
  amount: number;
  date: string;
  category: string;
}

// MULTI-STORE: Helpers
function getStoreId(): string | null {
  try {
    const storedStore = localStorage.getItem('novadeco_selected_store');
    if (storedStore) return JSON.parse(storedStore).id;
  } catch (e) { console.error(e); }
  return null;
}

function getStorePrefix(): string {
  try {
    const storedStore = localStorage.getItem('novadeco_selected_store');
    if (storedStore) {
      const store = JSON.parse(storedStore);
      return `novadeco_${store.slug}_`;
    }
  } catch (e) { console.error(e); }
  return "novadeco_";
}

function load<T>(key: string, fallback: T): T {
  try {
    const prefix = getStorePrefix();
    const raw = localStorage.getItem(`${prefix}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  const prefix = getStorePrefix();
  localStorage.setItem(`${prefix}${key}`, JSON.stringify(data));
}

/**
 * Sync from Supabase - Rebuilds everything from relational tables.
 */
export async function syncFromSupabase() {
  const storeId = getStoreId();
  if (!storeId) return;

  try {
    const data = await sync.fetchAllData(storeId);
    const prefix = getStorePrefix();

    localStorage.setItem(`${prefix}products`, JSON.stringify(data.products));
    localStorage.setItem(`${prefix}sales`, JSON.stringify(data.sales));
    localStorage.setItem(`${prefix}expenses`, JSON.stringify(data.expenses));
    localStorage.setItem(`${prefix}suppliers`, JSON.stringify(data.suppliers));

    window.dispatchEvent(new Event("novaInventoryUpdated"));
    window.dispatchEvent(new Event("novaStoreUpdated"));
  } catch (e) {
    console.error("Supabase sync failed", e);
  }
}

export function getProducts(): Product[] {
  return load<Product[]>("products", []);
}

export function saveProducts(products: Product[]) {
  save("products", products);
  const storeId = getStoreId();
  if (storeId) sync.pushProducts(storeId, products);
}

export function updateProductStock(id: string, delta: number) {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index >= 0) {
    products[index].stock = Math.max(0, products[index].stock + delta);
    saveProducts(products); // also pushes to supabase
  }
}

export function addSale(sale: Sale) {
  const sales = getSales();
  sales.unshift(sale);
  save("sales", sales);

  const storeId = getStoreId();
  if (storeId) sync.pushSale(storeId, sale);
}

export function getSales(): Sale[] {
  return load<Sale[]>("sales", []);
}

export function addBon(bon: Bon) {
  const bons = getBons();
  bons.unshift(bon);
  save("bons", bons);
}

export function updateBon(updated: Bon) {
  const bons = getBons();
  const index = bons.findIndex(bon => bon.id === updated.id);
  if (index >= 0) {
    bons[index] = updated;
    saveBons(bons);
  }
}

export function getBons(): Bon[] {
  return load<Bon[]>("bons", []);
}

export function addCredit(credit: Credit) {
  const credits = getCredits();
  credits.unshift(credit);
  save("credits", credits);
}

export function getCredits(): Credit[] {
  return load<Credit[]>("credits", []);
}

export function updateCredit(updated: Credit) {
  const credits = getCredits();
  const index = credits.findIndex(c => c.id === updated.id);
  if (index >= 0) {
    credits[index] = updated;
    save("credits", credits);
  }
}

export function deleteCredit(id: string) {
  const credits = getCredits();
  const filtered = credits.filter(c => c.id !== id);
  save("credits", filtered);
}

export function addExpense(expense: Expense) {
  const expenses = getExpenses();
  expenses.unshift(expense);
  save("expenses", expenses);

  const storeId = getStoreId();
  if (storeId) sync.pushExpense(storeId, expense);
}

export function getExpenses(): Expense[] {
  return load<Expense[]>("expenses", []);
}

export function getCustomCards(): CustomSaleCard[] {
  return load<CustomSaleCard[]>("custom_cards", []);
}

export function saveCustomCards(cards: CustomSaleCard[]) {
  save("custom_cards", cards);
}

export function saveBons(bons: Bon[]) {
  save("bons", bons);
}

export function saveSales(sales: Sale[]) {
  save("sales", sales);
}

export function saveCredits(credits: Credit[]) {
  save("credits", credits);
}

export function getSuppliers(): Supplier[] {
  return load<Supplier[]>("suppliers", []);
}

export function saveSuppliers(suppliers: Supplier[]) {
  save("suppliers", suppliers);
}

export function getInvoices(): Invoice[] {
  return load<Invoice[]>("invoices", []);
}

export function saveInvoices(invoices: Invoice[]) {
  save("invoices", invoices);
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " DZD";
}

export const CATEGORIES: { key: CategoryType; label: string; labelAr: string }[] = [
  { key: "satine", label: "Satiné", labelAr: "ساتيني" },
  { key: "enduit", label: "Enduit", labelAr: "معجون" },
  { key: "vinyle", label: "Vinyle", labelAr: "فينيل" },
  { key: "laque", label: "Laque", labelAr: "لاك" },
  { key: "decor", label: "Décor", labelAr: "ديكور" },
  { key: "fixateur", label: "Fixateur", labelAr: "مثبت" },
  { key: "accessoires", label: "Accessoires", labelAr: "إكسسوارات" },
];
