//Debugging
console.log("supabase global is:", window.supabase);

// Connect Supabase Project
const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";

const Supabase = window.Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Test Connection with simple pull

async function testConnection() {
    console.log("Testing Supabase connection...");

    //Pull user data for now
    const { data, error } = await Supabase
        .from("users")
        .select("*")
        .limit(5);

    if (error) {
        console.error("Connection failed or error: " + error);
        alert("Connection failed. Check console for details.");
    } else {
        console.log("Connection Successful! Data received: " + data);
        alert("Connection successful! Check console for results.")
    }
}

window.onload = testConnection; // or wire to a button
