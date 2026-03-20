import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key', 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
