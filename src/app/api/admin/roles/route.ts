import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Generic auth check for simplicity (hardcoded to the HR's email for this phase)
function isAuthorized(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  return adminEmail === "iamkabshah@gmail.com" || (adminEmail?.endsWith("@brandivemedsols.com") ?? false);
}

export async function GET(req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from("screening_criteria")
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roles: data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { role, jd, required_skills, work_mode, location } = body;

    if (!role || !jd || !required_skills) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Transform into screening criteria format matching the DB and deterministic screening logic
    const criteria = {
      description: jd,
      required_skills: required_skills.split(",").map((s: string) => s.trim()),
      nice_to_have_skills: [],
      min_years: 1,
      work_mode: work_mode || 'remote',
      acceptable_locations: work_mode === 'remote' ? ["Remote", "Any", "Remote-WAT"] : [location].filter(Boolean),
      acceptable_availability: ["immediate", "2_weeks", "1_month", "3_months_plus"],
      weights: {
        experience: 20,
        required_skills: 50,
        location: 10,
        availability: 10,
        nice_to_have: 10
      },
      thresholds: {
        qualified: 70,
        needs_review: 40
      }
    };

    const { data, error } = await supabaseAdmin
      .from("screening_criteria")
      .insert([
        {
          role,
          active: true,
          criteria
        }
      ])
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ role: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    const { error } = await supabaseAdmin
      .from("screening_criteria")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
