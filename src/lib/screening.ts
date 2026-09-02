/**
 * Deterministic screening logic.
 * Runs fully server-side — the LLM never makes pass/fail decisions.
 * Every run with the same input produces the same output.
 */

export interface ExtractionResult {
  role_interest: string | null;
  years_experience: number | null;
  experience_level: "junior" | "mid" | "senior" | "lead" | null;
  availability:
    | "immediate"
    | "2_weeks"
    | "1_month"
    | "3_months_plus"
    | "not_looking"
    | null;
  location: string | null;
  work_mode: "onsite" | "hybrid" | "remote" | null;
  work_authorization: boolean | null;
  key_skills: string[];
  off_topic_query: string | null;
  confidence: Record<string, number>;
}

export interface ScreeningCriteria {
  role: string;
  min_years: number;
  required_skills: string[];
  nice_to_have_skills: string[];
  acceptable_locations: string[];
  acceptable_availability: string[];
  weights: {
    experience: number;
    required_skills: number;
    location: number;
    availability: number;
    nice_to_have: number;
  };
  thresholds: {
    qualified: number;
    needs_review: number;
  };
}

export interface ScoreResult {
  score: number;
  status: "qualified" | "needs_review" | "not_a_fit";
  breakdown: Record<string, number>;
  reason: string;
}

/**
 * Score a candidate deterministically against a criteria set.
 * Returns a 0–100 score, a status band, a breakdown, and a human-readable reason.
 */
export function scoreCandidate(
  extraction: ExtractionResult,
  resumeParsed: Record<string, unknown> | null,
  criteria: ScreeningCriteria
): ScoreResult {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // --- Experience score (0–weights.experience) ---
  const yearsExp =
    extraction.years_experience ??
    (resumeParsed?.total_years as number | null) ??
    null;
  const expWeight = criteria.weights.experience;
  if (yearsExp !== null && yearsExp !== undefined) {
    const ratio = Math.min(yearsExp / criteria.min_years, 1.2);
    breakdown.experience = Math.round(Math.min(ratio, 1) * expWeight);
    if (yearsExp < criteria.min_years) {
      reasons.push(
        `${yearsExp} yr${yearsExp !== 1 ? "s" : ""} vs ${criteria.min_years} min`
      );
    }
  } else {
    breakdown.experience = 0;
    reasons.push("years experience missing");
  }

  // --- Required skills score (0–weights.required_skills) ---
  const candidateSkills: string[] = [
    ...(extraction.key_skills ?? []),
    ...((resumeParsed?.skills as string[]) ?? []),
  ].map((s) => (s as string).toLowerCase());

  const reqWeight = criteria.weights.required_skills;
  const reqSkills = criteria.required_skills;
  const matchedReq = reqSkills.filter((rs) =>
    candidateSkills.some(
      (cs) => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs)
    )
  );
  breakdown.required_skills =
    reqSkills.length > 0
      ? Math.round((matchedReq.length / reqSkills.length) * reqWeight)
      : reqWeight;
  if (matchedReq.length < reqSkills.length) {
    const missing = reqSkills.filter((rs) => !matchedReq.includes(rs));
    reasons.push(`missing ${missing.join(", ")}`);
  }

  // --- Location score (0–weights.location) ---
  const locWeight = criteria.weights.location;
  const candidateLoc = (extraction.location ?? "").toLowerCase();
  const remoteOk =
    extraction.work_mode === "remote" ||
    criteria.acceptable_locations.some((l) =>
      l.toLowerCase().includes("remote")
    );
  const locMatch = criteria.acceptable_locations.some(
    (al) =>
      candidateLoc.includes(al.toLowerCase()) ||
      al.toLowerCase().includes(candidateLoc)
  );
  if (locMatch || remoteOk) {
    breakdown.location = locWeight;
  } else {
    breakdown.location = 0;
    if (candidateLoc) reasons.push(`location ${extraction.location} not in acceptable list`);
    else reasons.push("location not provided");
  }

  // --- Availability score (0–weights.availability) ---
  const availWeight = criteria.weights.availability;
  const availMatch =
    extraction.availability &&
    criteria.acceptable_availability.includes(extraction.availability);
  breakdown.availability = availMatch ? availWeight : 0;
  if (!availMatch && extraction.availability) {
    reasons.push(`availability ${extraction.availability} outside window`);
  }

  // --- Nice-to-have score (0–weights.nice_to_have) ---
  const nthWeight = criteria.weights.nice_to_have;
  const nthSkills = criteria.nice_to_have_skills;
  const matchedNth = nthSkills.filter((ns) =>
    candidateSkills.some(
      (cs) => cs.includes(ns.toLowerCase()) || ns.toLowerCase().includes(cs)
    )
  );
  breakdown.nice_to_have =
    nthSkills.length > 0
      ? Math.round((matchedNth.length / nthSkills.length) * nthWeight)
      : nthWeight;

  // --- Total ---
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // --- Override conditions → Needs Review regardless of score ---
  const hasOff_topic = !!extraction.off_topic_query;
  const missingRequired =
    !extraction.role_interest ||
    !extraction.availability ||
    yearsExp === null ||
    !extraction.location;

  let status: ScoreResult["status"];
  if (missingRequired || hasOff_topic) {
    status = "needs_review";
    if (missingRequired) reasons.push("required fields missing/declined — review required");
    if (hasOff_topic) reasons.push("off-topic query flagged — recruiter follow-up needed");
  } else if (score >= criteria.thresholds.qualified) {
    status = "qualified";
  } else if (score >= criteria.thresholds.needs_review) {
    status = "needs_review";
  } else {
    status = "not_a_fit";
  }

  const reason =
    reasons.length > 0 ? reasons.join("; ") : "Meets all core criteria";

  return { score, status, breakdown, reason };
}
