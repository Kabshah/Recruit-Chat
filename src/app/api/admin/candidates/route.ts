import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

// Generic auth check for simplicity
function isAuthorized(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  return adminEmail === "iamkabshah@gmail.com" || (adminEmail?.endsWith("@brandivemedsols.com") ?? false);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch all completed candidates
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // If created_at fails entirely
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("candidates")
      .select("*");
    
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json({ candidates: fallbackData });
  }
  let candidatesToReturn = data || [];

  if (candidatesToReturn.length > 0) {
    const promises = candidatesToReturn.map(async (c: any) => {
      if (c.resume_path) {
        const storagePath = c.resume_path.startsWith("resumes/") ? c.resume_path.replace("resumes/", "") : c.resume_path;
        const { data: signedData } = await supabaseAdmin.storage
          .from("resumes")
          .createSignedUrl(storagePath, 3600); // 60 mins

        if (signedData?.signedUrl) {
          c.resume_url = signedData.signedUrl;
        }
      }
      
      if (c.session_id) {
        const { data: sessionData } = await supabaseAdmin
          .from("chat_sessions")
          .select("transcript")
          .eq("id", c.session_id)
          .single();
        if (sessionData) {
          c.transcript = sessionData.transcript;
        }
      }
      
      return c;
    });

    candidatesToReturn = await Promise.all(promises);
  }

  return NextResponse.json({ candidates: candidatesToReturn });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status, recruiter_notes } = body;

    if (!id) return NextResponse.json({ error: "Missing candidate ID" }, { status: 400 });

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (recruiter_notes !== undefined) updates.recruiter_notes = recruiter_notes;

    const { error } = await supabaseAdmin
      .from("candidates")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
