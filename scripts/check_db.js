
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCategories() {
    const { data: stores } = await supabase.from('stores').select('*');
    console.log('STORES:', JSON.stringify(stores, null, 2));

    const { data: categories } = await supabase.from('store_categories').select('*, stores(slug)');
    console.log('CATEGORIES:', JSON.stringify(categories, null, 2));
}

checkCategories();
