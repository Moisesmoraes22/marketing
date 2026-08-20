import { supabase } from "./supabase.js";

/**
 * Garante que uma falha em qualquer estágio do pipeline marque o
 * content_item como "error" — sem isso ele fica preso no status
 * anterior (transcrevendo/analisando) para sempre, já que só o job
 * na tabela `jobs` registra o erro.
 */
export async function withContentItemErrorHandling<T>(
  contentItemId: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    await supabase
      .from("content_items")
      .update({ status: "error" })
      .eq("id", contentItemId);
    throw err;
  }
}
