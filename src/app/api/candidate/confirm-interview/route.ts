import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export const maxDuration = 60; // Allow Vercel Hobby to run up to 60s

import { sendInterviewConfirmedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const slot = searchParams.get("slot");

  if (!id || !slot) {
    return new NextResponse("Invalid Request", { status: 400 });
  }

  try {
    // 1. Fetch current candidate & all notes to check conflicts
    const { data: candidates, error: fetchErr } = await supabaseAdmin
      .from("candidates")
      .select("id, email, full_name, role_interest, recruiter_notes");

    if (fetchErr || !candidates) {
      return new NextResponse("Database Error", { status: 500 });
    }

    const candidate = candidates.find(c => c.id === id);
    if (!candidate) {
      return new NextResponse("Candidate Not Found", { status: 404 });
    }

    // 2. Validate against duplicates
    let isConflict = false;
    candidates.forEach(c => {
      if (c.recruiter_notes?.includes(`INTERVIEW CONFIRMED: ${slot}`)) {
        isConflict = true;
      }
    });

    if (isConflict) {
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Slot Unavailable</title></head>
      <body style="margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh;background-color:#FDF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="background:white;padding:48px;border-radius:32px;box-shadow:0 20px 40px rgba(0,0,0,0.05);text-align:center;max-width:400px;border:1px solid #FFE1CD;">
          <div style="width:80px;height:80px;background:#EF4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:white;font-size:40px;box-shadow:0 8px 20px rgba(239,68,68,0.3);">!</div>
          <h1 style="margin:0 0 16px;color:#1A2E46;font-size:28px;">Slot Taken</h1>
          <p style="color:#5C6B7B;font-size:16px;margin:0 0 24px;line-height:1.6;">Sorry, this slot was just booked by someone else! Please pick a custom time from the calendar instead.</p>
          <a href="/schedule?id=${id}" style="display:inline-block;background:#1A2E46;color:white;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:bold;font-size:16px;">Open Calendar</a>
        </div>
      </body>
      </html>
      `.trim();
      return new NextResponse(html, { headers: { "Content-Type": "text/html" }});
    }

    // 3. Append the schedule note & generate meet link (Using Jitsi for zero-setup working video rooms)
    const meetLink = `https://meet.jit.si/RecruitChat-Interview-${id.substring(0,8)}-${crypto.randomUUID().substring(0, 4)}`;
    
    const bookingNote = `\n[${new Date().toLocaleDateString()}] ✨ INTERVIEW CONFIRMED: ${slot}\n[Meet Link] ${meetLink}`;
    const updatedNotes = candidate.recruiter_notes 
      ? candidate.recruiter_notes + bookingNote 
      : bookingNote.trim();

    // 4. Update candidate
    const { error: updateErr } = await supabaseAdmin
      .from("candidates")
      .update({ 
        recruiter_notes: updatedNotes,
        status: "qualified" 
      })
      .eq("id", id);
      
    if (updateErr) {
      return new NextResponse("Server Error updating candidate", { status: 500 });
    }

    // 5. Send confirmation email to candidate
    if (candidate.email) {
      await sendInterviewConfirmedEmail({
        to: candidate.email,
        candidateName: candidate.full_name || "Applicant",
        roleInterest: candidate.role_interest,
        slot,
        meetLink
      });
    }

    // 6. Return success HTML
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Interview Confirmed</title></head>
    <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background-color:#FDF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="background:white;padding:48px;border-radius:32px;box-shadow:0 20px 40px rgba(0,0,0,0.05);text-align:center;max-width:400px;border:1px solid #FFE1CD;">
        <div style="width:80px;height:80px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:white;font-size:40px;box-shadow:0 8px 20px rgba(34,197,94,0.3);">✓</div>
        <h1 style="margin:0 0 16px;color:#1A2E46;font-size:28px;">It's a Date!</h1>
        <p style="color:#5C6B7B;font-size:16px;margin:0 0 8px;line-height:1.6;">Your interview is officially locked in for:</p>
        <div style="background:#FFF6F0;padding:16px 20px;border-radius:16px;color:#FF6F3C;font-weight:700;font-size:18px;margin:24px 0;border:1px solid #FFEDDF;">
          ${slot}
        </div>
        <p style="color:#94a3b8;font-size:14px;margin:0;">The recruiter has been notified. You can safely close this window.</p>
      </div>
    </body>
    </html>
    `.trim();

    return new NextResponse(html, { headers: { "Content-Type": "text/html" }});

  } catch (err: any) {
    console.error("[confirm-interview] Critical exception handled:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
