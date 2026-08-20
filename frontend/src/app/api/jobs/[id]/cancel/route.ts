import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const id = parsedId.data;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "job não encontrado" }, { status: 404 });
  }

  if (job.status !== "pending" && job.status !== "running") {
    return NextResponse.json({ error: "essa busca já terminou" }, { status: 409 });
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "cancelled",
      error_message: "Cancelado pelo usuário",
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
