import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    console.log("✅ [SUPABASE] Client initialized successfully.");
} else {
    const missing = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    console.warn(`⚠️ [SUPABASE] Client not initialized. MISSING VARS: ${missing.join(" / ")}.`);
}

export const supabase = supabaseClient;
