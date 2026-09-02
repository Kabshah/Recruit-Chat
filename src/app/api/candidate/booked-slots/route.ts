import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: candidates, error } = await supabaseAdmin
      .from("candidates")
      .select("recruiter_notes");
      
    if (error) {
      return NextResponse.json({ bookedSlots: [] }, { status: 500 });
    }

    const bookedSlots: string[] = [];
    
    candidates?.forEach(c => {
      if (c.recruiter_notes) {
        const lines = c.recruiter_notes.split("\n");
        lines.forEach((line: string) => {
          if (line.includes("INTERVIEW CONFIRMED:")) {
             const slotData = line.split("INTERVIEW CONFIRMED:")[1]?.trim();
             if (slotData) {
               bookedSlots.push(slotData);
             }
          }
        });
      }
    });

    return NextResponse.json({ bookedSlots });
  } catch (err: any) {
    return NextResponse.json({ bookedSlots: [] }, { status: 500 });
  }
}
