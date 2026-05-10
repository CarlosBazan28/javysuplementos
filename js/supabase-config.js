const SUPABASE_URL = "https://fodwjfiyfmscklqsqrip.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PPVylWuHuvEf9GmZONSSfw_X-dEFJGQ";

const supabaseClient = window.supabase
  ? supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

window.supabaseClient = supabaseClient;

if (!supabaseClient) {
  console.warn("Supabase no esta disponible. La web usara datos locales como respaldo.");
}
