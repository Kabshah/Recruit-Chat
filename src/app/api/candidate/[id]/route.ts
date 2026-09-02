import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// DELETE /api/candidate/[id] — GDPR purge
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing candidate id" }, { status: 400 });
  }

  // 1. Fetch candidate to get resume path
  const { data: candidate, error: fetchErr } = await supabaseAdmin
    .from("candidates")
    .select("id, resume_path, email")
    .eq("id", id)
    .single();

  if (fetchErr || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // 2. Delete resume from storage if it exists
  if (candidate.resume_path) {
    const storagePath = candidate.resume_path.startsWith("resumes/") ? candidate.resume_path.replace("resumes/", "") : candidate.resume_path;
    const { error: storageErr } = await supabaseAdmin.storage
      .from("resumes")
      .remove([storagePath]);
    if (storageErr) {
      console.error("[delete] storage remove error:", storageErr);
    }
  }

  // 3. Log the deletion before deleting
  await supabaseAdmin.from("audit_log").insert({
    candidate_id: candidate.id,
    actor: "system_gdpr_purge",
    action: "candidate_deleted",
    before: { email: candidate.email, resume_path: candidate.resume_path },
    after: null,
  });

  // 4. Delete candidate row (cascades to audit_log via FK)
  const { error: deleteErr } = await supabaseAdmin
    .from("candidates")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    console.error("[delete] candidate delete error:", deleteErr);
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted_id: id });
}
