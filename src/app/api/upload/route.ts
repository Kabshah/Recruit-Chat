import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseResume } from "@/lib/gemini";

export const maxDuration = 60; // Vercel Hobby: allow up to 60s for resume parsing
export const dynamic = "force-dynamic";

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("session_id") as string | null;
    const candidateId = formData.get("candidate_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side MIME sniff (don't trust client Content-Type)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Basic magic byte check
    const detectedMime = detectMimeType(bytes);
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a PDF, DOC, DOCX, or TXT file.",
        },
        { status: 415 }
      );
    }

    // Size check
    if (bytes.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 413 }
      );
    }

    // Determine candidate_id from session or create placeholder
    const cid = sessionId || candidateId || uuidv4();

    // Upload to Supabase Storage
    const internalPath = `${cid}/${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const dbResumePath = `resumes/${internalPath}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(internalPath, bytes, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload] storage error:", uploadError);
      return NextResponse.json(
        { error: "Failed to store file. Please try again." },
        { status: 500 }
      );
    }

    // Parse resume with Gemini
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const parsed = await parseResume(base64, detectedMime);

    // Update candidate record if candidateId provided
    if (candidateId) {
      const { error: updateErr } = await supabaseAdmin
        .from("candidates")
        .update({
          resume_path: dbResumePath,
          resume_source: "upload",
          resume_parsed: parsed,
          // Merge parsed fields into candidate
          full_name: (parsed.full_name as string) || undefined,
          email: (parsed.email as string) || undefined,
          phone: (parsed.phone as string) || undefined,
          skills: (parsed.skills as string[]) || [],
          years_experience: (parsed.total_years as number) || undefined,
        })
        .eq("id", candidateId);

      if (updateErr) {
        console.error("[upload] candidate update error:", updateErr);
      }
    }

    return NextResponse.json({
      success: true,
      resume_path: dbResumePath,
      parsed,
      candidate_id: cid,
    });
  } catch (err) {
    console.error("[upload] unexpected error:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectMimeType(bytes: Uint8Array): string | null {
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  // DOCX / DOC / ZIP (OOXML): PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  // DOC: D0 CF 11 E0 (OLE2)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return "application/msword";
  }
  // TXT: try to decode as UTF-8
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, 1024));
    return "text/plain";
  } catch {
    return null;
  }
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
  };
  return map[mime] || "bin";
}
