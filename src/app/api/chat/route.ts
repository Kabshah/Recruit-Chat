import { type NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow Vercel Hobby to run up to 60s for dual-LLM logic

import { supabaseAdmin } from "@/lib/supabase-server";
import {
  generateBotResponse,
  extractSlots,
  getNextSlot,
  SlotState,
  TranscriptTurn,
} from "@/lib/gemini";
import { scoreCandidate, ScreeningCriteria } from "@/lib/screening";
import { sendApplicationConfirmation, sendInterviewInvite } from "@/lib/email";
import crypto from "node:crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TURNS = 25;
const MAX_MESSAGE_LENGTH = 500;

// Simple in-memory rate limiter (resets on server restart; use Redis in prod)
const rateLimitMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

const CANNED_FALLBACK =
  "I'm experiencing a brief technical issue. Your answers have been saved — please try again in a moment, or a recruiter will follow up with you directly.";

// Dynamic greeting is generated in the POST handler.

// ─── Rate limit helper ────────────────────────────────────────────────────────

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// ─── Request types ────────────────────────────────────────────────────────────

type ChatRequest = {
  message?: string;
  session_id?: string;
};

// ─── POST /api/chat ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message = "", session_id } = body;

  // Validate message length
  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

  // ── Load or create session ────────────────────────────────────────────────
  let sessionId = session_id;
  let transcript: TranscriptTurn[] = [];
  let slots: SlotState = {
    role_interest: null,
    years_experience: null,
    experience_level: null,
    availability: null,
    location: null,
    work_mode: null,
    full_name: null,
    email: null,
    phone: null,
    key_skills: [],
    off_topic_query: null,
    consent_given: false,
    cv_prompted: false,
    summary_confirmed: false,
    relocation_refused: null,
  };
  let turnCount = 0;

  if (!sessionId) {
    // New session — fetch active roles
    const { data: criteriaRows } = await supabaseAdmin
      .from("screening_criteria")
      .select("role")
      .eq("active", true);

    const activeRoles = criteriaRows?.map((r) => r.role) || [];
    let greetingText = `Hi! I'm the RecruitChat AI. 🎉\n\nI'm here to learn more about your background. Before we begin, please know this conversation is processed by AI, and your data is stored securely.`;
    
    if (activeRoles.length > 0) {
      greetingText += `\n\nHere are our currently open roles:\n` + activeRoles.map(r => `• ${r}`).join("\n");
      greetingText += `\n\nWhich of these roles are you interested in applying for? Please also tell me your full name to proceed.`;
    } else {
      greetingText += `\n\nAre you happy to proceed? If so, please tell me your full name.`;
    }

    const { data: newSession, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        transcript: [{ role: "bot", content: greetingText }],
        turn_count: 1,
        completion_state: "in_progress",
        ip_hash: hashIp(ip),
        user_agent: req.headers.get("user-agent") || "",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[chat] session create error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_id: newSession.id,
      message: greetingText,
      done: false,
    });
  }

  // Existing session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  transcript = (session.transcript as TranscriptTurn[]) || [];
  turnCount = session.turn_count || 0;

  // Hard cap on turns
  if (turnCount >= MAX_TURNS) {
    return NextResponse.json({
      session_id: sessionId,
      message:
        "We've covered a lot of ground! Your information has been saved and our team will be in touch shortly.",
      done: true,
    });
  }

  // Add candidate message to transcript
  if (trimmed) {
    transcript.push({ role: "candidate", content: trimmed });
  }

  // ── Extract slots from full transcript ──────────────────────────────────
  try {
    const extracted = await extractSlots(transcript);
    
    // Safely merge: skip null values from the new extraction so we don't overwrite existing data
    const merged = { ...slots };
    for (const key of Object.keys(extracted) as (keyof SlotState)[]) {
      const val = extracted[key];
      if (val != null) {
        // @ts-ignore
        merged[key] = val;
      }
    }
    
    slots = {
      ...merged,
      // Ensure array doesn't go null if somehow missed
      key_skills: extracted.key_skills ?? slots.key_skills ?? [],
    };
  } catch (e) {
    console.error("[chat] extraction failed:", e);
  }

  // Determine next slot to collect
  let nextSlot = getNextSlot(slots);

  let botMessage: string;
  let isDone = false;

  if (nextSlot === "done") {
    isDone = true;
    botMessage =
      "Thank you so much! Your profile has been recorded. Our team will review your details and be in touch — usually within 1–3 business days. 🙌";

    // Trigger screening on session completion
    await finalizeSession(sessionId, transcript, slots, ip);
  } else if (nextSlot === "off_topic_handoff") {
    isDone = true;
    botMessage = `I'm sorry, but I am specifically programmed only to collect application data and cannot chat about off-topic subjects. Since this conversation has gone off-topic, I am closing this session now. A human recruiter has been notified and will review your profile.`;
    
    // Trigger screening on session completion even though it was aborted early
    await finalizeSession(sessionId, transcript, slots, ip);
  } else {
    // Fetch active role context to inject into prompt so bot can explain the JD or list open roles
    let roleContext = "";
    const { data: criteriaRows } = await supabaseAdmin
      .from("screening_criteria")
      .select("role, criteria")
      .eq("active", true);
      
    if (slots.role_interest) {
      const matched = criteriaRows?.find((r) => 
        r.role.toLowerCase().includes(slots.role_interest!.toLowerCase()) ||
        slots.role_interest!.toLowerCase().includes(r.role.toLowerCase())
      );
      if (matched) {
        const isRemote = matched.criteria.work_mode === "remote" || matched.criteria.acceptable_locations?.some((al: string) => al.toLowerCase().includes("remote") || al.toLowerCase().includes("any"));
        const locOk = matched.criteria.acceptable_locations?.some((al: string) => 
          slots.location?.toLowerCase().includes(al.toLowerCase()) || 
          al.toLowerCase().includes(slots.location?.toLowerCase() || "")
        );
        
        if (!isRemote && slots.location && !locOk && slots.relocation_refused !== true) {
          nextSlot = "relocate";
        }
        
        roleContext = `[Context for Role: ${matched.role}. Job Description: ${matched.criteria.description || "N/A"}. Required Skills: ${matched.criteria.required_skills?.join(", ") || ""}. Work Mode: ${matched.criteria.work_mode || "Hybrid"}. Required Location: ${matched.criteria.acceptable_locations?.join(", ") || "Any"}. When confirming their role or asking subsequent questions, seamlessly mention these details. CRITICAL: If the Work Mode is onsite or hybrid, and they provide a location not in the Required Location list, you MUST ask "Are you willing to relocate to ${matched.criteria.acceptable_locations?.join(", ")}?" before moving on.]`;
      }
    } else {
      const activeRoles = criteriaRows?.map((r) => r.role) || [];
      roleContext = `[Available Roles: ${activeRoles.length > 0 ? activeRoles.join(", ") : "No roles are currently open"}. If you need to ask about their role interest, you MUST list these available roles for them to choose from.]`;
    }

    // Generate next bot turn
    botMessage = await generateBotResponse(transcript, slots, nextSlot, roleContext).catch(
      () => CANNED_FALLBACK
    );
  }

  // Append bot response to transcript
  transcript.push({ role: "bot", content: botMessage });
  turnCount++;

  // Persist updated transcript
  let compState = "in_progress";
  if (isDone) {
    compState = slots.off_topic_query ? "needs_recruiter" : "completed";
  }

  const { error: updateError } = await supabaseAdmin
    .from("chat_sessions")
    .update({
      transcript,
      turn_count: turnCount,
      completion_state: compState,
      completed_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[chat] session update error:", updateError);
  }

  return NextResponse.json({
    session_id: sessionId,
    message: botMessage,
    done: isDone,
  });
}

// ─── Finalize session: score + upsert candidate + webhook ────────────────────

async function finalizeSession(
  sessionId: string,
  transcript: TranscriptTurn[],
  slots: SlotState,
  ip: string
) {
  try {
    // 1. Fetch active criteria for the role (or first active)
    const roleQuery = slots.role_interest?.toLowerCase() || "";
    const { data: criteriaRows } = await supabaseAdmin
      .from("screening_criteria")
      .select("*")
      .eq("active", true);

    let criteria: ScreeningCriteria | null = null;
    if (criteriaRows && criteriaRows.length > 0) {
      // Try to match by role name
      const matched = criteriaRows.find((c) =>
        c.role.toLowerCase().includes(roleQuery) ||
        roleQuery.includes(c.role.toLowerCase())
      );
      criteria = (matched || criteriaRows[0]).criteria as ScreeningCriteria;
      if (!criteria.thresholds) {
        criteria = (matched || criteriaRows[0]).criteria;
      }
    }

    let scoreResult = null;
    if (criteria) {
      // 2. Score deterministically
      const extraction = {
        role_interest: slots.role_interest,
        years_experience: slots.years_experience,
        experience_level: slots.experience_level as "junior" | "mid" | "senior" | "lead" | null,
        availability: slots.availability as "immediate" | "2_weeks" | "1_month" | "3_months_plus" | "not_looking" | null,
        location: slots.location,
        work_mode: slots.work_mode as "onsite" | "hybrid" | "remote" | null,
        work_authorization: null,
        key_skills: slots.key_skills,
        off_topic_query: slots.off_topic_query,
        confidence: {},
      };
      scoreResult = scoreCandidate(extraction, null, criteria);
    }

    // 2.5 Extract uploaded resume path if it exists for this session
    const { data: files } = await supabaseAdmin.storage.from("resumes").list(sessionId);
    let resumePath = null;
    if (files && files.length > 0 && files[0].name !== ".emptyFolderPlaceholder") {
      resumePath = `resumes/${sessionId}/${files[0].name}`;
    }

    // 3. Upsert candidate record
    const candidateData = {
      session_id: sessionId,
      full_name: slots.full_name,
      email: slots.email,
      phone: slots.phone,
      role_interest: slots.role_interest,
      experience_level: slots.experience_level,
      years_experience: slots.years_experience,
      location: slots.location,
      work_mode: slots.work_mode,
      availability: slots.availability,
      skills: slots.key_skills,
      needs_recruiter: !!slots.off_topic_query,
      resume_path: resumePath,
      resume_source: resumePath ? "upload" : null,
      status: scoreResult?.status || "pending",
      score: scoreResult?.score ?? null,
      score_breakdown: scoreResult?.breakdown ?? null,
      reason: scoreResult?.reason ?? null,
      consent_at: slots.consent_given ? new Date().toISOString() : null,
    };

    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .insert(candidateData)
      .select("id")
      .single();

    // 4. Audit log
    if (candidate) {
      await supabaseAdmin.from("audit_log").insert({
        candidate_id: candidate.id,
        actor: "system",
        action: "session_completed",
        after: candidateData,
      });
    }

    // 5. Send automatic emails based on qualification
    if (slots.email && candidate) {
      if (scoreResult?.status === "qualified") {
        await sendInterviewInvite({
          to: slots.email,
          candidateName: slots.full_name || "there",
          roleInterest: slots.role_interest,
          candidateId: candidate.id
        });
        
        // Auto-log that they were invited
        await supabaseAdmin.from("candidates").update({
          recruiter_notes: `[${new Date().toLocaleDateString()}] System Auto-Sent Interview Invite slots.`
        }).eq("id", candidate.id);

      } else {
        await sendApplicationConfirmation({
          to: slots.email,
          candidateName: slots.full_name || "there",
          roleInterest: slots.role_interest,
        });
      }
    }

    // 6. Fire n8n webhook if configured
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl && candidate) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidate.id,
          session_id: sessionId,
          status: scoreResult?.status,
          score: scoreResult?.score,
          reason: scoreResult?.reason,
          needs_recruiter: !!slots.off_topic_query,
          role_interest: slots.role_interest,
        }),
      }).catch((e) => console.error("[chat] webhook error:", e));
    }
  } catch (e) {
    console.error("[chat] finalize error:", e);
    // Log to audit_log but don't crash the API
    await supabaseAdmin.from("audit_log").insert({
      actor: "system",
      action: "finalize_error",
      after: { error: String(e), session_id: sessionId },
    });
  }
}
