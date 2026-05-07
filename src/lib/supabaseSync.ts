import { supabase } from "./supabase";
import { Product, Bon, Credit, Sale, Expense, Supplier, Invoice, CartItem } from "./store";

/**
 * Robust mapping between frontend state and Supabase relational schema.
 */

export async function pushProducts(storeId: string, products: Product[]) {
    // Get categories to map slugs to IDs
    const { data: categories } = await supabase.from('store_categories').select('*').eq('store_id', storeId);

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
        expiry_date: p.expiryDate,
        category_id: categories?.find(c => c.code === p.category)?.id
    })).filter(p => !!p.category_id);

    if (mapped.length > 0) {
        return await supabase.from('products').upsert(mapped);
    }
}

export async function pushSale(storeId: string, sale: Sale) {
    // 1. Ensure customer exists if it's a bon or credit
    let customerId = null;
    let customerName = (sale as any).clientName || '';
    let customerPhone = (sale as any).clientPhone || '';

    if (customerPhone) {
        const { data: customer } = await supabase.from('customers')
            .select('id')
            .eq('store_id', storeId)
            .eq('phone', customerPhone)
            .single();

        if (customer) {
            customerId = customer.id;
        } else {
            const { data: newCust } = await supabase.from('customers')
                .insert({ store_id: storeId, full_name: customerName, phone: customerPhone })
                .select()
                .single();
            customerId = newCust?.id;
        }
    }

    // 2. Handle Credit Account if type is credit
    let creditAccountId = null;
    if (sale.type === 'credit' && customerId) {
        const { data: account } = await supabase.from('credit_accounts')
            .select('id')
            .eq('store_id', storeId)
            .eq('customer_id', customerId)
            .eq('status', 'open')
            .single();

        if (account) {
            creditAccountId = account.id;
        } else {
            const { data: newAccount } = await supabase.from('credit_accounts')
                .insert({ store_id: storeId, customer_id: customerId })
                .select()
                .single();
            creditAccountId = newAccount?.id;
        }
    }

    // 3. Create Sale record
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
        id: isValidUUID(sale.id) ? sale.id : undefined,
        store_id: storeId,
        customer_id: customerId,
        credit_account_id: creditAccountId,
        sale_type: sale.type,
        total_amount: sale.total,
        teinte_amount: sale.teinteAmount,
        reduction_amount: sale.reduction,
        sold_at: sale.date,
        customer_name_snapshot: customerName,
        customer_phone_snapshot: customerPhone
    }).select().single();

    if (saleError) throw saleError;

    // 4. Create Sale Items
    if (saleData && sale.items.length > 0) {
        const items = sale.items.map(item => ({
            store_id: storeId,
            sale_id: saleData.id,
            product_id: isValidUUID(item.product.id) ? item.product.id : null,
            product_name_snapshot: item.product.name,
            quantity: item.quantity,
            unit_price: item.customUnitPrice || item.product.priceSale,
            unit_cost: item.customUnitCost || item.product.priceBuy,
            unit: item.product.unit === 'unité' ? 'unit' : 'kg'
        }));
        await supabase.from('sale_items').insert(items);
    }

    // 5. Handle Bon specific link
    if (sale.type === 'bon' && saleData) {
        await supabase.from('bons').insert({
            store_id: storeId,
            sale_id: saleData.id,
            bon_number: (sale as any).number || `BON-${Date.now()}`,
            customer_id: customerId
        });
    }

    return saleData;
}

export async function pushExpense(storeId: string, expense: Expense) {
    return await supabase.from('expenses').insert({
        store_id: storeId,
        category: expense.category,
        reason: expense.reason,
        amount: expense.amount,
        expense_at: expense.date
    });
}

export async function fetchAllData(storeId: string) {
    // Complex fetch to rebuild frontend state
    const [
        { data: products },
        { data: sales },
        { data: expenses },
        { data: suppliers }
    ] = await Promise.all([
        supabase.from('products').select('*, store_categories(code)').eq('store_id', storeId).eq('is_active', true),
        supabase.from('sales').select('*, sale_items(*)').eq('store_id', storeId).order('sold_at', { ascending: false }).limit(100),
        supabase.from('expenses').select('*').eq('store_id', storeId).order('expense_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('store_id', storeId)
    ]);

    return {
        products: products?.map(p => ({
            id: p.id,
            name: p.name,
            nameAr: p.name_ar || '',
            category: p.store_categories?.code || 'satine',
            priceSale: Number(p.price_sale),
            priceBuy: Number(p.price_buy),
            stock: Number(p.stock_quantity),
            minStock: Number(p.min_stock_quantity),
            unit: p.unit === 'unit' ? 'unité' : 'kg',
            expiryDate: p.expiry_date
        })) || [],
        sales: sales?.map(s => ({
            id: s.id,
            type: s.sale_type,
            total: Number(s.total_amount),
            teinteAmount: Number(s.teinte_amount),
            reduction: Number(s.reduction_amount),
            date: s.sold_at,
            items: s.sale_items?.map((si: any) => ({
                product: { id: si.product_id, name: si.product_name_snapshot },
                quantity: Number(si.quantity),
                subtotal: Number(si.line_total)
            })) || []
        })) || [],
        expenses: expenses?.map(e => ({
            id: e.id,
            reason: e.reason,
            amount: Number(e.amount),
            date: e.expense_at,
            category: e.category
        })) || [],
        suppliers: suppliers || []
    };
}

function isValidUUID(str: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}
