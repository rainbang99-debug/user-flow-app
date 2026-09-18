import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart npm run dev.";
  }
  if (typeof password !== "string" || password.length === 0) {
    return "Password required";
  }
  if (password !== expected) {
    return "Unauthorized";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const authError = checkPassword(body.password);

  if (authError === "Unauthorized" || authError === "Password required") {
    return unauthorized();
  }
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 500 });
  }

  if (body.action === "login") {
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_price") {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_settings")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_all") {
  const { error } = await supabase
    .from("submissions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

  if (body.action === "set_status") {
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!body.id) {
      return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("submissions")
      .update({
        status: body.status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
