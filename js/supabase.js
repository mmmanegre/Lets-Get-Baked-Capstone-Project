const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function minutesToTimeString(minutes) {
  const m = Number(minutes) || 0;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}
