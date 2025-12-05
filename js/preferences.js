import { supabase } from "./supabase.js";

export async function getBlockedIngredientsForUser(user) {
  if (!user) return [];

  const { data } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", user.username)
    .maybeSingle();

  return (data?.preferences || [])
    .map((i) => i.toLowerCase().trim())
    .filter((i) => i);
}
