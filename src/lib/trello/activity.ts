import { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  cardId: string,
  userId: string,
  message: string
) {
  await supabase.from("trello_card_comments").insert({
    card_id: cardId,
    user_id: userId,
    body: `[ATIVIDADE] ${message}`,
  });
}
