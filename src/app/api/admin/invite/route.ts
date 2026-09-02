import { NextRequest, NextResponse } from "next/server";
import { sendInterviewInvite } from "@/lib/email";

export const maxDuration = 60; // Vercel Hobby: allow up to 60s for email sending

function isAuthorized(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  return adminEmail === "iamkabshah@gmail.com" || (adminEmail?.endsWith("@brandivemedsols.com") ?? false);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { to, candidateName, roleInterest, candidateId } = await req.json();
    if (!to) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    await sendInterviewInvite({ to, candidateName, roleInterest, candidateId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
