import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'CRITICAL: Supabase environment variables are missing! ' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file. ' +
        'If you just added them, you MUST restart your development server or REBUILD your application.';
    console.error(errorMsg);
    // We throw a more descriptive error than the default one from Supabase JS
    if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required but was not found in environment variables.');
    if (!supabaseAnonKey) throw new Error('VITE_SUPABASE_ANON_KEY is required but was not found in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

