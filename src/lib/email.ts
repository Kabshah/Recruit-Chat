import nodemailer from "nodemailer";

export interface ConfirmationEmailPayload {
  to: string;
  candidateName: string;
  roleInterest: string | null;
  candidateId?: string;
}

export interface InterviewConfirmedPayload {
  to: string;
  candidateName: string;
  roleInterest: string | null;
  slot: string;
  meetLink: string;
}

export async function sendApplicationConfirmation(
  payload: ConfirmationEmailPayload
): Promise<void> {
  const { to, candidateName, roleInterest } = payload;
  const firstName = candidateName.split(" ")[0] || candidateName;
  const role = roleInterest || "the position you applied for";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Received — RecruitChat AI</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(139,92,246,0.2);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:40px 40px 36px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:600;">RecruitChat AI</p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">Application Received ✅</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                Hi <strong style="color:#a78bfa;">${firstName}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                Thank you for completing your screening with RecruitChat AI! We've successfully received your application for <strong style="color:#a78bfa;">${role}</strong>.
              </p>

              <!-- Status card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:24px 28px;">
                    <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;font-weight:700;">What happens next</p>
                    <ul style="margin:12px 0 0;padding-left:20px;color:#94a3b8;font-size:15px;line-height:2;">
                      <li>Our team will review your profile within <strong style="color:#e2e8f0;">1–3 business days</strong>.</li>
                      <li>If there's a strong match, a recruiter will reach out directly.</li>
                      <li>You can reply to this email at any time with questions.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#94a3b8;">
                If you'd like to update any of the information you shared or request deletion of your data, simply reply to this email and we'll take care of it.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.7;color:#cbd5e1;">
                Wishing you all the best,<br/>
                <strong style="color:#e2e8f0;">The RecruitChat Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111827;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.8;">
                This email was sent because you completed an AI-assisted screening session.<br/>
                © ${new Date().getFullYear()} RecruitChat AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    let transporter;
    let fromAddress;
    
    // 1. Hostinger / Custom SMTP (Highest Priority)
    if (process.env.SMTP_HOST) {
       fromAddress = process.env.SMTP_USER || "kabshahkashif@brandivemedsols.com";
       transporter = nodemailer.createTransport({
         host: process.env.SMTP_HOST,
         port: Number(process.env.SMTP_PORT) || 465,
         secure: true,
         auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASSWORD,
         }
       });
    } 
    // 2. Gmail App Password fallback
    else if (process.env.GMAIL_APP_PASSWORD) {
      fromAddress = process.env.GMAIL_USER || "iamkabshah@gmail.com";
      transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: {
          user: fromAddress,
          pass: process.env.GMAIL_APP_PASSWORD,
        }
      });
    } 
    // 3. Google OAuth fallback
    else {
      fromAddress = process.env.GMAIL_USER || "iamkabshah@gmail.com";
      transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: {
          type: "OAuth2",
          user: fromAddress,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        }
      });
    }

    await transporter.sendMail({
      from: `"RecruitChat AI" <${fromAddress}>`,
      to,
      subject: `✅ Your application has been received — ${role}`,
      html,
    });

    console.log(`📧 Confirmation email sent to ${to}`);
  } catch (err) {
    console.error("[email] Failed to send confirmation email:", err);
  }
}

export interface ConfirmationEmailPayload {
  to: string;
  candidateName: string;
  roleInterest: string | null;
  candidateId?: string;
}

export async function sendInterviewInvite(
  payload: ConfirmationEmailPayload
): Promise<void> {
  const { to, candidateName, roleInterest, candidateId } = payload;
  const firstName = candidateName.split(" ")[0] || candidateName;
  const role = roleInterest || "the position you applied for";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const scheduleLink = `${baseUrl}/schedule?id=${candidateId}`;

  // Find a valid "Day 1" (today if before 5PM and weekday, or next valid weekday)
  let day1 = new Date();
  if (day1.getHours() >= 17) {
    day1.setDate(day1.getDate() + 1);
  }
  while (day1.getDay() === 0 || day1.getDay() === 6) {
    day1.setDate(day1.getDate() + 1); // Skip weekends
  }
  
  // Find "Day 2"
  let day2 = new Date(day1);
  day2.setDate(day2.getDate() + 1);
  while (day2.getDay() === 0 || day2.getDay() === 6) {
    day2.setDate(day2.getDate() + 1);
  }

  const d1Str = day1.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const d2Str = day2.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Generate 4 dynamic quick slots avoiding overlap logically
  const quickSlots = [
    { label: `${d1Str} at 02:00 PM`, url: `${baseUrl}/api/candidate/confirm-interview?id=${candidateId}&slot=${encodeURIComponent(d1Str + " at 02:00 PM")}` },
    { label: `${d1Str} at 03:30 PM`, url: `${baseUrl}/api/candidate/confirm-interview?id=${candidateId}&slot=${encodeURIComponent(d1Str + " at 03:30 PM")}` },
    { label: `${d2Str} at 02:45 PM`, url: `${baseUrl}/api/candidate/confirm-interview?id=${candidateId}&slot=${encodeURIComponent(d2Str + " at 02:45 PM")}` },
    { label: `${d2Str} at 04:15 PM`, url: `${baseUrl}/api/candidate/confirm-interview?id=${candidateId}&slot=${encodeURIComponent(d2Str + " at 04:15 PM")}` }
  ];

  const quickButtonsHtml = quickSlots.map(s => 
    `<a href="${s.url}" style="display:block;margin:8px 0;padding:12px;background:#F9F9FB;border:1px solid #E5E7EB;color:#1A2E46;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;text-align:center;">
       ⚡ Quick Confirm: ${s.label}
     </a>`
  ).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A2E46;line-height:1.6;background:#F9F9FB;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:40px;border-radius:24px;box-shadow:0 12px 40px rgba(0,0,0,0.04);">
    <h2 style="margin-top:0;font-size:24px;color:#FF6F3C;">Interview Invitation 📅</h2>
    <p style="font-size:16px;">Hi <strong>${firstName}</strong>,</p>
    <p style="font-size:16px;">We reviewed your application and would love to invite you to a technical interview for the <strong>${role}</strong> role.</p>
    <p style="font-size:15px;color:#6B7280;margin-bottom:20px;">You can instantly lock in one of our immediate openings below:</p>
    
    <div style="margin:24px 0;">
      ${quickButtonsHtml}
    </div>

    <div style="margin:32px 0;text-align:center;border-top:1px solid #F3F4F6;padding-top:24px;">
      <p style="font-size:14px;color:#6B7280;margin-bottom:16px;">Or select a custom time on our full calendar:</p>
      <a href="${scheduleLink}" style="display:inline-block;padding:14px 28px;background:#1A2E46;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;width:100%;box-sizing:border-box;">
        📅 Open Calendar View
      </a>
    </div>
    
    <p style="font-size:15px;color:#6B7280;margin-top:32px;">We look forward to speaking with you!</p>
    <p style="font-size:15px;font-weight:bold;margin:0;">The RecruitChat Team</p>
  </div>
  <span style="opacity:0; font-size:0px;">${Date.now()}</span>
</body>
</html>
  `.trim();

  try {
    let transporter;
    let fromAddress;
    
    // 1. Hostinger / Custom SMTP (Highest Priority)
    if (process.env.SMTP_HOST) {
       fromAddress = process.env.SMTP_USER || "kabshahkashif@brandivemedsols.com";
       transporter = nodemailer.createTransport({
         host: process.env.SMTP_HOST,
         port: Number(process.env.SMTP_PORT) || 465,
         secure: true,
         auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASSWORD,
         }
       });
    } 
    // 2. Gmail App Password fallback
    else if (process.env.GMAIL_APP_PASSWORD) {
      fromAddress = process.env.GMAIL_USER || "iamkabshah@gmail.com";
      transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: {
          user: fromAddress,
          pass: process.env.GMAIL_APP_PASSWORD,
        }
      });
    } 

    if (transporter) {
      await transporter.sendMail({
        from: `"RecruitChat AI" <${fromAddress}>`,
        to,
        subject: `🎉 Interview Invitation: ${role}`,
        html,
      });
      console.log(`📧 Invited ${to} to an interview.`);
    }
  } catch (err) {
    console.error("[email] Failed to send invite email:", err);
  }
}

export interface InterviewConfirmedPayload {
  to: string;
  candidateName: string;
  roleInterest: string | null;
  slot: string;
  meetLink: string;
}

export async function sendInterviewConfirmedEmail(
  payload: InterviewConfirmedPayload
): Promise<void> {
  const { to, candidateName, roleInterest, slot, meetLink } = payload;
  const firstName = candidateName.split(" ")[0] || candidateName;
  const role = roleInterest || "the open role";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A2E46;line-height:1.6;background:#FDF9F6;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:40px;border-radius:24px;box-shadow:0 12px 40px rgba(0,0,0,0.04);border:1px solid #FFE1CD;">
    <div style="width:64px;height:64px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;color:white;font-size:32px;font-weight:bold;">#</div>
    <h2 style="margin-top:0;font-size:24px;color:#1A2E46;">Interview Confirmed!</h2>
    <p style="font-size:16px;">Hi <strong>${firstName}</strong>,</p>
    <p style="font-size:16px;">Awesome! Your technical interview with our HR team for the <strong>${role}</strong> role is locked in for:</p>
    
    <div style="margin:24px 0;background:#FFF6F0;padding:20px;border-radius:16px;border:1px solid #FFEDDF;text-align:center;">
      <p style="color:#FF6F3C;font-weight:800;font-size:18px;margin:0;margin-bottom:16px;">🕒 ${slot}</p>
      <a href="${meetLink}" style="display:inline-block;padding:16px 28px;background:#22C55E;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px;width:100%;box-sizing:border-box;text-align:center;">
        🎥 Join Video Call
      </a>
    </div>

    <p style="font-size:15px;color:#6B7280;margin-bottom:24px;">Please make sure of your availability. This is your direct, secure video interview link. On the day of your interview, simply click the button above to join.</p>
    
    <p style="font-size:14px;color:#9ca3af;margin-top:32px;">If you need to reschedule, please reply directly to this email.</p>
    <p style="font-size:15px;font-weight:bold;margin:0;">The HR Team</p>
  </div>
  <span style="opacity:0; font-size:0px;">${Date.now()}</span>
</body>
</html>
  `.trim();

  try {
    let transporter;
    const fromAddress = process.env.SMTP_USER || process.env.GMAIL_USER || "hello@recruitchat.ai";
    
    if (process.env.SMTP_HOST) {
       transporter = nodemailer.createTransport({
         host: process.env.SMTP_HOST,
         port: Number(process.env.SMTP_PORT) || 465,
         secure: true,
         auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
       });
    } else if (process.env.GMAIL_APP_PASSWORD) {
       transporter = nodemailer.createTransport({
         service: "gmail",
         secure: true,
         auth: { user: fromAddress, pass: process.env.GMAIL_APP_PASSWORD }
       });
    }

    if (transporter) {
      await transporter.sendMail({
        from: `"RecruitChat HR" <${fromAddress}>`,
        to,
        subject: `Confirmed: Video Interview on ${slot.split(" at ")[0]}`,
        html,
      });
      console.log(`📧 Confirmed interview emailed to ${to}`);
    }
  } catch (err) {
    console.error("[email] Failed to send confirmation email:", err);
  }
}
