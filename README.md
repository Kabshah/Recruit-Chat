# RecruitChat AI 

RecruitChat AI is an intelligent, automated, and conflict-aware technical interview scheduling and candidate screening platform.It intelligently analyzes applicant CVs, hosts deterministic screening chat sessions, and autonomously maps candidates into real-time interview slots securely synchronized directly within the HR Dashboard.

## 🌟 Key Features

*   **⚡ Real-Time HR Dashboard**: Built with a reactive 5-second polling pipeline that seamlessly pushes new candidate submissions and confirmed interview bookings directly to the recruiter's screen without a manual page reload.
*   **🤖 Deterministic AI Screening Engine**: Employs Google's Gemini models to run highly structured, conversational assessments. It automatically overrides candidate tangents to strictly capture key slot constraints: availability, years of experience, office location compatibility, and technical skills.
*   **🔐 Zero-Touch Secure Video Rooms**: Programmatically auto-generates mathematically secure, cryptographically random (`node:crypto`) Jitsi video interview rooms. Zero downloads or installations required for the candidate.
*   **📩 Intelligent Automated Mailer (Anti-Clipping)**: Integrated `nodemailer` transports (with explicitly forced TLS/SSL encryptions) mapped to responsive, professional HTML templates. Features dynamic timestamps injected invisibly to prevent Gmail threads from inappropriately clipping or rolling up separate confirmation emails.
*   **🛡️ Production-Grade Security**: Fully cleared and sanitized against strict SonarQube rulesets, preventing cross-site scripting risks, insecure clear-text transport protocols, and weak random number generation. Accessibility correctly maps `onClick` properties directly onto semantic DOM `<button>` structures.

## 🛠️ Technology Stack

*   **Framework:** Next.js 14+ / React
*   **Backend & File Storage:** Supabase (PostgreSQL & Storage Buckets)
*   **AI Engine:** Google Gemini (`@google/genai`)
*   **Email Deliverability:** Nodemailer (SMTP)
*   **Styling & Motion:** TailwindCSS, Vanilla CSS overrides

## 🚀 Getting Started

### 1. Environment Variables Configuration

Copy `.env.local.example` into a new `.env.local` file and populate your keys:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_SECRET"

# AI Core
GEMINI_API_KEY="YOUR_GOOGLE_AI_STUDIO_KEY"

# Secure Email Transports 
SMTP_HOST="YOUR_SECURE_HOST"
SMTP_PORT=465
SMTP_USER="YOUR_EMAIL@XYZ.com"
SMTP_PASSWORD="YOUR_PASSWORD"
```

### 2. Database Initialization

A complete, production-ready schema is included. Navigate to your Supabase SQL Editor and execute the entire contents of `supabase-schema.sql`. This file acts as the ultimate "Save State" and will automatically build out your `candidates`, `chat_sessions`, and `screening_criteria` tables alongside robust Row-Level Security (RLS) policies.

### 3. Running the Server

Install dependencies and boot up:

```bash
npm install
npm run dev
```

*Note: By default, the Next.js visual development indicator has been forcibly hidden in the UI codebase to provide a seamless premium feel while testing.*

## 📈 HR Dashboard Operations

*   **Add Roles**: Publish new roles directly to the AI constraint ledger in real-time. Wait for it to synchronize. Ensure you map location correctly, as the AI will negotiate Remote vs. On-Site willingness.
*   **Filters**: Role arrays are programmatically normalized inside the backend algorithms to dynamically scrub out candidate-hallucinated variations and strict-lock the dropdown exclusively to your currently active database listings.
*   **Attention Indicators**: Newly applied candidates (within the last 48 hours) flagged as needing review will feature an animated red badge to immediately command HR focus.