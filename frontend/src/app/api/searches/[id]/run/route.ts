import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: search, error: searchError } = await supabase
    .from("searches")
    .select("id, hashtags, accounts, min_engagement")
    .eq("id", id)
    .single();

  if (searchError || !search) {
    return NextResponse.json({ error: "busca não encontrada" }, { status: 404 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      type: "discover",
      payload: {
        search_id: search.id,
        hashtags: search.hashtags,
        accounts: search.accounts,
        min_engagement: search.min_engagement,
      },
      status: "pending",
    })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  return NextResponse.json({ job_id: job.id });
}
