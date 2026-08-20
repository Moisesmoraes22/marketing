"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "member"]),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("apenas admins podem gerenciar o time");
  }
}

const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  instagram_handle: z.string().trim().max(60).optional(),
  avatar_url: z.string().trim().url().max(2000).optional(),
});

function normalizeInstagramHandle(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  return cleaned || null;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");

  const parsed = profileSchema.safeParse({
    name: formData.has("name") ? String(formData.get("name")) : undefined,
    instagram_handle: formData.has("instagram_handle")
      ? String(formData.get("instagram_handle"))
      : undefined,
    avatar_url: formData.has("avatar_url") ? String(formData.get("avatar_url")) : undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const update: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name || null;
  if (parsed.data.instagram_handle !== undefined) {
    update.instagram_handle = normalizeInstagramHandle(parsed.data.instagram_handle);
  }
  if (parsed.data.avatar_url !== undefined) update.avatar_url = parsed.data.avatar_url;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}

export async function inviteMember(formData: FormData) {
  await requireAdmin();

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "member"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
  );
  if (error) throw new Error(error.message);

  if (parsed.data.role === "admin" && data.user) {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (roleError) throw new Error(roleError.message);
  }

  revalidatePath("/configuracoes");
}
