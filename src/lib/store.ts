// NOVA DECO - Data Store (100% Supabase)
import { supabase } from "./supabase";

// ─── TYPE DEFINITIONS ────────────────────────────────────────────────
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

export type CategoryType =
  | "satine" | "enduit" | "vinyle" | "laque" | "decor" | "fixateur" | "accessoires"
  | "placo" | "vis" | "platre" | "electricite" | "pvc" | "cornier" | "peinture" | "outillage";

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

// ─── STORE ID HELPER ─────────────────────────────────────────────────
export function getStoreId(): string | null {
  try {
    const storedStore = localStorage.getItem('novadeco_selected_store');
    if (storedStore) return JSON.parse(storedStore).id;
  } catch (e) { console.error(e); }
  return null;
}

function requireStoreId(): string {
  const id = getStoreId();
  if (!id) throw new Error("No store selected");
  return id;
}

// ─── PRODUCTS ────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('products')
    .select('*, category:store_categories!products_store_category_fkey(code)')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (error) { console.error("getProducts error:", error); return []; }
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    nameAr: p.name_ar || '',
    category: (p.category?.code || 'satine') as CategoryType,
    priceSale: Number(p.price_sale),
    priceBuy: Number(p.price_buy),
    stock: Number(p.stock_quantity),
    minStock: Number(p.min_stock_quantity),
    unit: p.unit === 'unit' ? 'unité' : 'kg',
    expiryDate: p.expiry_date || undefined
  }));
}

export async function saveProducts(products: Product[]) {
  const storeId = requireStoreId();
  const { data: categories } = await supabase
    .from('store_categories').select('*').eq('store_id', storeId);

  const mapped = products.map(p => ({
    id: isValidUUID(p.id) ? p.id : undefined,
    store_id: storeId,
    name: p.name,
    name_ar: p.nameAr,
    price_sale: p.priceSale,
    price_buy: p.priceBuy,
    stock_quantity: p.stock,
    min_stock_quantity: p.minStock || 5,
    unit: p.unit === 'unité' ? 'unit' : 'kg',
    expiry_date: p.expiryDate || null,
    category_id: categories?.find(c => c.code === p.category)?.id,
  })).filter(p => !!p.category_id);

  if (mapped.length > 0) {
    const { error } = await supabase.from('products').upsert(mapped);
    if (error) console.error("saveProducts error:", error);
  }
}

export async function updateProductStock(id: string, delta: number) {
  const storeId = requireStoreId();
  if (!isValidUUID(id) || delta === 0) return;

  const { error } = await supabase.rpc('apply_product_stock_delta', {
    p_store_id: storeId,
    p_product_id: id,
    p_delta: delta,
  });
  if (error) {
    console.error("updateProductStock error:", error);
    // Fallback: direct update
    const { data: product } = await supabase
      .from('products').select('stock_quantity').eq('id', id).single();
    if (product) {
      await supabase.from('products').update({
        stock_quantity: Math.max(0, Number(product.stock_quantity) + delta)
      }).eq('id', id);
    }
  }
}

// ─── SALES ───────────────────────────────────────────────────────────
export async function getSales(): Promise<Sale[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('store_id', storeId)
    .order('sold_at', { ascending: false });

  if (error) { console.error("getSales error:", error); return []; }
  return (data || []).map(s => ({
    id: s.id,
    type: s.sale_type as Sale['type'],
    total: Number(s.total_amount),
    teinteAmount: Number(s.teinte_amount) || 0,
    reduction: Number(s.reduction_amount) || 0,
    date: s.sold_at,
    bonId: undefined,
    creditId: s.credit_account_id || undefined,
    items: (s.sale_items || []).map((si: any) => ({
      product: { id: si.product_id || '', name: si.product_name_snapshot, priceSale: Number(si.unit_price), priceBuy: Number(si.unit_cost) } as Product,
      quantity: Number(si.quantity),
      subtotal: Number(si.line_total) || Number(si.quantity) * Number(si.unit_price),
      customUnitPrice: si.is_custom_price ? Number(si.unit_price) : undefined,
      customUnitCost: Number(si.unit_cost) || undefined,
    })),
  }));
}

export async function addSale(sale: Sale) {
  const storeId = requireStoreId();

  // 1. Look up or create customer
  let customerId: string | null = null;
  const customerName = (sale as any).clientName || '';
  const customerPhone = (sale as any).clientPhone || '';

  if (customerPhone) {
    const { data: customer } = await supabase.from('customers')
      .select('id').eq('store_id', storeId).eq('phone', customerPhone).single();
    if (customer) {
      customerId = customer.id;
    } else {
      const { data: newCust } = await supabase.from('customers')
        .insert({ store_id: storeId, full_name: customerName, phone: customerPhone })
        .select().single();
      customerId = newCust?.id || null;
    }
  }

  // 2. Credit account
  let creditAccountId: string | null = null;
  if (sale.type === 'credit' && customerId) {
    const { data: account } = await supabase.from('credit_accounts')
      .select('id').eq('store_id', storeId).eq('customer_id', customerId).eq('status', 'open').single();
    if (account) {
      creditAccountId = account.id;
    } else {
      const { data: newAccount } = await supabase.from('credit_accounts')
        .insert({ store_id: storeId, customer_id: customerId }).select().single();
      creditAccountId = newAccount?.id || null;
    }
  }

  // 3. Insert sale
  const { data: saleData, error } = await supabase.from('sales').insert({
    id: isValidUUID(sale.id) ? sale.id : undefined,
    store_id: storeId,
    customer_id: customerId,
    credit_account_id: creditAccountId,
    sale_type: sale.type,
    total_amount: Math.abs(sale.total),
    teinte_amount: sale.teinteAmount || 0,
    reduction_amount: sale.reduction || 0,
    sold_at: sale.date,
    customer_name_snapshot: customerName,
    customer_phone_snapshot: customerPhone,
  }).select().single();

  if (error) { console.error("addSale error:", error); return; }

  // 4. Insert sale items
  if (saleData && sale.items.length > 0) {
    const items = sale.items.map(item => ({
      store_id: storeId,
      sale_id: saleData.id,
      product_id: isValidUUID(item.product.id) ? item.product.id : null,
      product_name_snapshot: item.product.name,
      quantity: item.quantity,
      unit_price: item.customUnitPrice || item.product.priceSale || 0,
      unit_cost: item.customUnitCost || item.product.priceBuy || 0,
      unit: item.product.unit === 'unité' ? 'unit' : 'kg',
      is_custom_price: !!item.customUnitPrice,
    }));
    await supabase.from('sale_items').insert(items);
  }

  // 5. Insert tint entries
  if (saleData && sale.teinteEntries && sale.teinteEntries.length > 0) {
    const tintEntries = sale.teinteEntries.map(entry => ({
      store_id: storeId,
      sale_id: saleData.id,
      kg: entry.kg,
      unit_price: entry.unitPrice,
    }));
    await supabase.from('sale_tint_entries').insert(tintEntries);
  }

  // 6. Insert bon link
  if (sale.type === 'bon' && saleData) {
    await supabase.from('bons').insert({
      store_id: storeId,
      sale_id: saleData.id,
      bon_number: (sale as any).number || `BON-${Date.now()}`,
      customer_id: customerId,
    });
  }
}

// ─── BONS ────────────────────────────────────────────────────────────
export async function getBons(): Promise<Bon[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('bons')
    .select('*, sales:sales!bons_sale_fkey(*, items:sale_items!sale_items_sale_fkey(*), tint_entries:sale_tint_entries!sale_tint_entries_sale_fkey(*))')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) { console.error("getBons error:", error); return []; }
  return (data || []).map(b => {
    const sale = b.sales;
    return {
      id: b.id,
      number: b.bon_number,
      clientName: sale?.customer_name_snapshot || '',
      clientPhone: sale?.customer_phone_snapshot || '',
      teinteAmount: Number(sale?.teinte_amount) || 0,
      reduction: Number(sale?.reduction_amount) || 0,
      total: Number(sale?.total_amount) || 0,
      date: sale?.sold_at || b.created_at,
      teinteEntries: (sale?.tint_entries || []).map((t: any) => ({
        unitPrice: Number(t.unit_price),
        kg: Number(t.kg),
      })),
      items: (sale?.items || []).map((si: any) => ({
        product: {
          id: si.product_id || '',
          name: si.product_name_snapshot,
          priceSale: Number(si.unit_price),
          priceBuy: Number(si.unit_cost),
        } as Product,
        quantity: Number(si.quantity),
        subtotal: Number(si.line_total) || Number(si.quantity) * Number(si.unit_price),
        customUnitPrice: si.is_custom_price ? Number(si.unit_price) : undefined,
        customUnitCost: Number(si.unit_cost) || undefined,
      })),
    };
  });
}

export async function addBon(bon: Bon) {
  // Bons are created via addSale with type 'bon'
  // No separate action needed - the sale + bon link is handled in addSale
}

export async function updateBon(updated: Bon) {
  const storeId = requireStoreId();

  // Update customer info snapshot on the linked sale
  const { data: bonData } = await supabase
    .from('bons').select('sale_id').eq('id', updated.id).eq('store_id', storeId).single();
  if (!bonData) return;

  // Update the sale record
  await supabase.from('sales').update({
    total_amount: updated.total,
    teinte_amount: updated.teinteAmount,
    reduction_amount: updated.reduction,
    customer_name_snapshot: updated.clientName,
    customer_phone_snapshot: updated.clientPhone,
  }).eq('id', bonData.sale_id).eq('store_id', storeId);

  // Delete old sale items and insert new ones
  await supabase.from('sale_items').delete().eq('sale_id', bonData.sale_id).eq('store_id', storeId);

  if (updated.items.length > 0) {
    const items = updated.items.map(item => ({
      store_id: storeId,
      sale_id: bonData.sale_id,
      product_id: isValidUUID(item.product.id) ? item.product.id : null,
      product_name_snapshot: item.product.name,
      quantity: item.quantity,
      unit_price: item.customUnitPrice || item.product.priceSale || 0,
      unit_cost: item.customUnitCost || item.product.priceBuy || 0,
      unit: item.product.unit === 'unité' ? 'unit' : 'kg',
      is_custom_price: !!item.customUnitPrice,
    }));
    await supabase.from('sale_items').insert(items);
  }
}

export async function deleteBon(id: string) {
  const storeId = requireStoreId();

  // Get the linked sale_id
  const { data: bonData } = await supabase
    .from('bons')
    .select('sale_id')
    .eq('id', id)
    .eq('store_id', storeId)
    .maybeSingle();

  if (bonData?.sale_id) {
    // Deleting the sale will:
    // 1. Restore stock (via sale_items_sync_stock trigger)
    // 2. Delete the bon (via ON DELETE CASCADE)
    // 3. Update analytics (automatic)
    await supabase.from('sales').delete().eq('id', bonData.sale_id).eq('store_id', storeId);
  }
}

export async function saveBons(_bons: Bon[]) {
  // No-op: individual operations handle persistence
}

// ─── CREDITS ─────────────────────────────────────────────────────────
export async function getCredits(): Promise<Credit[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('credit_accounts')
    .select('*, customer:customers!credit_accounts_customer_fkey(*), sales:sales!sales_credit_account_fkey(*, items:sale_items!sale_items_sale_fkey(*), tint_entries:sale_tint_entries!sale_tint_entries_sale_fkey(*)), credit_payments:credit_payments!credit_payments_credit_account_fkey(*)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) { console.error("getCredits error:", error); return []; }
  return (data || []).map(ca => {
    const customer = ca.customer;
    const creditSales = (ca.sales || []).filter((s: any) => s.sale_type === 'credit');
    const allItems: CartItem[] = [];
    let teinteAmount = 0;
    let reduction = 0;
    let teinteEntries: TeinteEntry[] = [];

    creditSales.forEach((s: any) => {
      teinteAmount += Number(s.teinte_amount) || 0;
      reduction += Number(s.reduction_amount) || 0;
      (s.tint_entries || []).forEach((t: any) => {
        teinteEntries.push({ unitPrice: Number(t.unit_price), kg: Number(t.kg) });
      });
      (s.items || []).forEach((si: any) => {
        allItems.push({
          product: {
            id: si.product_id || '', name: si.product_name_snapshot,
            priceSale: Number(si.unit_price), priceBuy: Number(si.unit_cost),
          } as Product,
          quantity: Number(si.quantity),
          subtotal: Number(si.line_total) || Number(si.quantity) * Number(si.unit_price),
        });
      });
    });

    const versements: Versement[] = (ca.credit_payments || []).map((p: any) => ({
      id: p.id, amount: Number(p.amount), date: p.paid_at,
    }));

    return {
      id: ca.id,
      clientName: customer?.full_name || '',
      clientPhone: customer?.phone || '',
      items: allItems,
      teinteAmount,
      teinteEntries,
      reduction,
      total: Number(ca.total_amount),
      versements,
      date: ca.opened_at || ca.created_at,
    };
  });
}

export async function addCredit(_credit: Credit) {
  // Credits are created via addSale with type 'credit'
}

export async function updateCredit(updated: Credit) {
  const storeId = requireStoreId();
  // updateCredit is typically for adding versements
  // The credit_payments trigger handles recalculation automatically
}

export async function addCreditPayment(creditId: string, amount: number) {
  const storeId = requireStoreId();
  await supabase.from('credit_payments').insert({
    store_id: storeId,
    credit_account_id: creditId,
    amount,
    paid_at: new Date().toISOString(),
  });
}

export async function deleteCredit(_id: string) {
  // Credits are managed through credit_accounts table
}

export async function saveCredits(_credits: Credit[]) {
  // No-op
}

// ─── EXPENSES ────────────────────────────────────────────────────────
export async function getExpenses(): Promise<Expense[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)
    .order('expense_at', { ascending: false });

  if (error) { console.error("getExpenses error:", error); return []; }
  return (data || []).map(e => ({
    id: e.id,
    reason: e.reason,
    amount: Number(e.amount),
    date: e.expense_at,
    category: e.category,
  }));
}

export async function addExpense(expense: Expense) {
  const storeId = requireStoreId();
  const { error } = await supabase.from('expenses').insert({
    store_id: storeId,
    category: expense.category,
    reason: expense.reason,
    amount: expense.amount,
    expense_at: expense.date,
  });
  if (error) console.error("addExpense error:", error);
}

// ─── CUSTOM SALE CARDS ───────────────────────────────────────────────
export async function getCustomCards(): Promise<CustomSaleCard[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('custom_sale_cards')
    .select('*, base_product:products!custom_sale_cards_base_product_fkey(name, category:store_categories!products_store_category_fkey(code))')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (error) { console.error("getCustomCards error:", error); return []; }
  return (data || []).map(c => ({
    id: c.id,
    baseProductId: c.base_product_id,
    baseProductName: c.base_product?.name || '',
    category: (c.base_product?.category?.code || 'satine') as CategoryType,
    kg: Number(c.remaining_quantity),
    unitPrice: Number(c.unit_price),
    priceBuyPerKg: Number(c.price_buy_per_kg) || 0,
  }));
}

export async function saveCustomCards(cards: CustomSaleCard[]) {
  const storeId = requireStoreId();
  // Update remaining quantities for existing cards
  for (const card of cards) {
    if (isValidUUID(card.id)) {
      await supabase.from('custom_sale_cards').update({
        remaining_quantity: card.kg,
        unit_price: card.unitPrice,
        price_buy_per_kg: card.priceBuyPerKg || 0,
      }).eq('id', card.id).eq('store_id', storeId);
    }
  }
}

// ─── SUPPLIERS ───────────────────────────────────────────────────────
export async function getSuppliers(): Promise<Supplier[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (error) { console.error("getSuppliers error:", error); return []; }
  return (data || []).map(s => ({
    id: s.id,
    name: s.name,
    phone: s.phone || '',
    address: s.address || '',
  }));
}

export async function saveSuppliers(suppliers: Supplier[]) {
  const storeId = requireStoreId();
  for (const s of suppliers) {
    const row = {
      id: isValidUUID(s.id) ? s.id : undefined,
      store_id: storeId,
      name: s.name,
      phone: s.phone || null,
      address: s.address || null,
    };
    await supabase.from('suppliers').upsert(row);
  }
}

// ─── INVOICES (PURCHASE) ─────────────────────────────────────────────
export async function getInvoices(): Promise<Invoice[]> {
  const storeId = requireStoreId();
  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('*, supplier:suppliers!purchase_invoices_supplier_fkey(*), invoice_items:purchase_invoice_items!purchase_invoice_items_invoice_fkey(*, product:products!purchase_invoice_items_product_fkey(name, name_ar, category:store_categories!products_store_category_fkey(code))), payments:purchase_invoice_payments!purchase_invoice_payments_invoice_fkey(*)')
    .eq('store_id', storeId)
    .order('invoice_date', { ascending: false });

  if (error) { console.error("getInvoices error:", error); return []; }
  return (data || []).map(inv => ({
    id: inv.id,
    number: inv.invoice_number,
    supplier: {
      id: inv.supplier?.id || inv.supplier_id,
      name: inv.supplier?.name || '',
      phone: inv.supplier?.phone || '',
      address: inv.supplier?.address || '',
    },
    items: (inv.invoice_items || []).map((ii: any) => ({
      product: {
        id: ii.product_id || '',
        name: ii.product_name_snapshot || ii.product?.name || '',
        nameAr: ii.product?.name_ar || '',
        category: (ii.product?.category?.code || ii.category_name_snapshot || 'satine') as CategoryType,
        priceSale: Number(ii.unit_sale_price),
        priceBuy: Number(ii.unit_cost),
        stock: 0,
        unit: ii.unit === 'unit' ? 'unité' : 'kg',
      } as Product,
      quantity: Number(ii.quantity),
      priceBuy: Number(ii.unit_cost),
      priceSale: Number(ii.unit_sale_price),
      expiryDate: ii.expiry_date || undefined,
    })),
    total: Number(inv.total_amount),
    paidAmount: Number(inv.paid_amount),
    payments: (inv.payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.paid_at,
    })),
    date: inv.invoice_date,
    type: inv.invoice_type as 'achat' | 'retour',
  }));
}

export async function saveInvoices(_invoices: Invoice[]) {
  // Individual operations handle persistence
}

export async function createInvoice(invoice: Invoice, supplierId: string) {
  const storeId = requireStoreId();

  const { data: invData, error } = await supabase.from('purchase_invoices').insert({
    store_id: storeId,
    supplier_id: supplierId,
    invoice_number: invoice.number,
    invoice_type: invoice.type,
    total_amount: invoice.total,
    paid_amount: invoice.paidAmount,
    invoice_date: invoice.date,
  }).select().single();

  if (error || !invData) { console.error("createInvoice error:", error); return null; }

  // Insert items
  if (invoice.items.length > 0) {
    const items = invoice.items.map(item => ({
      store_id: storeId,
      purchase_invoice_id: invData.id,
      product_id: isValidUUID(item.product.id) ? item.product.id : null,
      product_name_snapshot: item.product.name,
      unit: item.product.unit === 'unité' ? 'unit' : 'kg',
      quantity: item.quantity,
      unit_cost: item.priceBuy,
      unit_sale_price: item.priceSale,
      expiry_date: item.expiryDate || null,
    }));
    await supabase.from('purchase_invoice_items').insert(items);
  }

  // Insert initial payment
  if (invoice.paidAmount > 0) {
    await supabase.from('purchase_invoice_payments').insert({
      store_id: storeId,
      purchase_invoice_id: invData.id,
      amount: invoice.paidAmount,
      paid_at: invoice.date,
    });
  }

  return invData;
}

export async function updateInvoice(invoice: Invoice, supplierId: string) {
  const storeId = requireStoreId();

  // Update the invoice header
  await supabase.from('purchase_invoices').update({
    supplier_id: supplierId,
    total_amount: invoice.total,
    paid_amount: invoice.paidAmount,
    invoice_date: invoice.date,
  }).eq('id', invoice.id).eq('store_id', storeId);

  // Replace items
  await supabase.from('purchase_invoice_items').delete()
    .eq('purchase_invoice_id', invoice.id).eq('store_id', storeId);

  if (invoice.items.length > 0) {
    const items = invoice.items.map(item => ({
      store_id: storeId,
      purchase_invoice_id: invoice.id,
      product_id: isValidUUID(item.product.id) ? item.product.id : null,
      product_name_snapshot: item.product.name,
      unit: item.product.unit === 'unité' ? 'unit' : 'kg',
      quantity: item.quantity,
      unit_cost: item.priceBuy,
      unit_sale_price: item.priceSale,
      expiry_date: item.expiryDate || null,
    }));
    await supabase.from('purchase_invoice_items').insert(items);
  }
}

export async function deleteInvoice(id: string) {
  const storeId = requireStoreId();
  // Deleting the invoice will:
  // 1. Revert stock changes (via purchase_invoice_items_sync_stock trigger on cascade delete)
  // 2. Delete invoice items (via ON DELETE CASCADE)
  // 3. Delete invoice payments (via ON DELETE CASCADE)
  const { error } = await supabase.from('purchase_invoices').delete().eq('id', id).eq('store_id', storeId);
  if (error) console.error("deleteInvoice error:", error);
}

export async function addInvoicePayment(invoiceId: string, amount: number) {
  const storeId = requireStoreId();
  await supabase.from('purchase_invoice_payments').insert({
    store_id: storeId,
    purchase_invoice_id: invoiceId,
    amount,
    paid_at: new Date().toISOString(),
  });
}

// ─── SUPPLIER UPSERT ─────────────────────────────────────────────────
export async function upsertSupplier(supplier: { name: string; phone: string; address: string }): Promise<Supplier> {
  const storeId = requireStoreId();

  // Check if supplier exists
  const { data: existing } = await supabase.from('suppliers')
    .select('*')
    .eq('store_id', storeId)
    .ilike('name', supplier.name.trim())
    .maybeSingle();

  if (existing) {
    return { id: existing.id, name: existing.name, phone: existing.phone || '', address: existing.address || '' };
  }

  const { data: newSup, error } = await supabase.from('suppliers')
    .insert({
      store_id: storeId,
      name: supplier.name.trim(),
      phone: supplier.phone || null,
      address: supplier.address || null
    })
    .select()
    .maybeSingle();

  if (error || !newSup) {
    console.error("upsertSupplier error:", error);
    throw new Error("Failed to create supplier: " + (error?.message || "Unknown error"));
  }
  return { id: newSup.id, name: newSup.name, phone: newSup.phone || '', address: newSup.address || '' };
}

// ─── PRODUCT UPSERT ──────────────────────────────────────────────────
export async function upsertProduct(product: { name: string; category: string; priceBuy: number; priceSale: number; quantity: number; expiryDate?: string }): Promise<Product> {
  const storeId = requireStoreId();

  // Find existing product by name
  const { data: existing } = await supabase.from('products')
    .select('*, store_categories(code)')
    .eq('store_id', storeId)
    .ilike('name', product.name.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    // Update metadata and prices, but NOT stock (handled by triggers)
    await supabase.from('products').update({
      price_buy: product.priceBuy,
      price_sale: product.priceSale,
      expiry_date: product.expiryDate || existing.expiry_date,
    }).eq('id', existing.id);

    return {
      id: existing.id, name: existing.name, nameAr: existing.name_ar || '',
      category: (existing.store_categories?.code || 'satine') as CategoryType,
      priceSale: product.priceSale, priceBuy: product.priceBuy,
      stock: Number(existing.stock_quantity), // Return current stock
      unit: existing.unit === 'unit' ? 'unité' : 'kg', expiryDate: product.expiryDate,
    };
  }

  // Create new product
  let { data: categories } = await supabase.from('store_categories')
    .select('id, code').eq('store_id', storeId);
  let categoryId = categories?.find(c => c.code === product.category)?.id;
  
  // Auto-create category if it doesn't exist
  if (!categoryId) {
    const { data: newCat, error: catError } = await supabase.from('store_categories').insert({
      store_id: storeId,
      code: product.category,
      name: product.category,
      sort_order: 0,
    }).select('id').maybeSingle();
    
    if (catError || !newCat) {
      console.error("Failed to create category:", catError);
      throw new Error(`Failed to create category '${product.category}': ${catError?.message || 'Unknown error'}`);
    }
    categoryId = newCat.id;
  }

  const { data: newProd, error } = await supabase.from('products').insert({
    store_id: storeId, name: product.name.trim(), category_id: categoryId,
    price_sale: product.priceSale, price_buy: product.priceBuy,
    stock_quantity: 0, // Start at 0, let the invoice trigger add the quantity
    unit: 'unit',
    expiry_date: product.expiryDate || null,
  }).select('*, store_categories(code)').maybeSingle();

  if (error || !newProd) {
    console.error("upsertProduct error:", error);
    throw new Error("Failed to create product: " + (error?.message || "Unknown error"));
  }
  return {
    id: newProd.id, name: newProd.name, nameAr: '', category: (newProd.store_categories?.code || 'satine') as CategoryType,
    priceSale: Number(newProd.price_sale), priceBuy: Number(newProd.price_buy),
    stock: Number(newProd.stock_quantity), unit: 'unité', expiryDate: newProd.expiry_date,
  };
}

// ─── SAVE SALES (no-op, handled via addSale) ─────────────────────────
export async function saveSales(_sales: Sale[]) {
  // No-op
}

// ─── UTILITIES ───────────────────────────────────────────────────────
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " DZD";
}

function isValidUUID(str: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ─── CATEGORIES ──────────────────────────────────────────────────────
export const CATEGORIES_MAP: Record<string, { key: CategoryType; label: string; labelAr: string }[]> = {
  "magasin-principal": [
    { key: "satine", label: "Satiné", labelAr: "ساتيني" },
    { key: "enduit", label: "Enduit", labelAr: "معجون" },
    { key: "vinyle", label: "Vinyle", labelAr: "فينيل" },
    { key: "laque", label: "Laque", labelAr: "لاك" },
    { key: "decor", label: "Décor", labelAr: "ديكور" },
    { key: "fixateur", label: "Fixateur", labelAr: "مثبت" },
    { key: "accessoires", label: "Accessoires", labelAr: "إكسسوارات" },
  ],
  "placo": [
    { key: "placo", label: "Placoplatre", labelAr: "بلاكو بلاتر" },
    { key: "pvc", label: "PVC", labelAr: "بي في سي" },
    { key: "cornier", label: "Cornière & M", labelAr: "زاوية و حرف M" },
    { key: "peinture", label: "Peinture", labelAr: "طلاء" },
    { key: "vis", label: "Vis & Chevilles", labelAr: "براغي و سدادات" },
    { key: "electricite", label: "Électricité", labelAr: "كهرباء" },
    { key: "outillage", label: "Outillages", labelAr: "أدوات" },
    { key: "accessoires", label: "Accessoires", labelAr: "إكسسوارات" },
  ]
};

export const getStoreSlug = (): string => {
  try {
    const storedStore = localStorage.getItem('novadeco_selected_store');
    if (storedStore) return JSON.parse(storedStore).slug;
  } catch (e) { console.error(e); }
  return "magasin-principal";
};

export const getCategories = () => {
  const slug = getStoreSlug();
  return CATEGORIES_MAP[slug] || CATEGORIES_MAP["magasin-principal"];
};

export const CATEGORIES = getCategories();

// ─── SYNC LEGACY (no-op, kept for compatibility) ─────────────────────
export async function syncFromSupabase() {
  // No-op: everything reads from Supabase directly now
  window.dispatchEvent(new Event("novaInventoryUpdated"));
  window.dispatchEvent(new Event("novaStoreUpdated"));
}
