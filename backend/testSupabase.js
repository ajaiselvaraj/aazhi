import { supabase } from "./config/supabaseClient.js";

async function run() {
    console.log("Testing Supabase Query...");
    try {
        const { data, error } = await supabase
            .from('service_requests')
            .select('*, citizen:citizens!service_requests_citizen_id_fkey(name, mobile), staff:citizens!service_requests_assigned_to_fkey(name)');
        
        if (error) {
            console.error("❌ SUPABASE QUERY ERROR:", error);
        } else {
            console.log("✅ SUCCESS! Retrieved rows count:", data?.length);
            if (data?.length > 0) {
                console.log("Sample row:", data[0]);
            }
        }
    } catch (err) {
        console.error("❌ Exception caught:", err);
    }
    process.exit(0);
}

run();
