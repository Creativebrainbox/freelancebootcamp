// Server-only: sends emails via Resend API.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Freelance Bootcamp Admissions Team <admissions@freelancebootcamp.dedyn.io>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

interface BootcampVars {
  full_name: string;
  bootcamp_name: string;
  start_date?: string;
  daily_time?: string;
  whatsapp_group_link?: string;
}

const wrap = (inner: string) => `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#ffffff;margin:0;padding:32px;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:32px">
    ${inner}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#6b7280;margin:0">Freelance Bootcamp Admissions Team</p>
  </div></body></html>`;

export const emailTemplates = {
  received: (v: BootcampVars) => ({
    subject: `Application Received – ${v.bootcamp_name}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px">Application Received</h2>
      <p>Hello ${escape(v.full_name)},</p>
      <p>Your application for <strong>${escape(v.bootcamp_name)}</strong> has been received successfully.</p>
      <p>Our team is currently reviewing all applications. Only shortlisted applicants will receive a final decision email.</p>
      <p>Please check your email regularly.</p>
      <p style="margin-top:24px">— Freelance Bootcamp Admissions Team</p>
    `),
  }),
  approved: (v: BootcampVars) => ({
    subject: `Congratulations! You've Been Selected`,
    html: wrap(`
      <p>Hello ${escape(v.full_name)},</p>
      <p><strong>Congratulations!</strong></p>
      <p>You have been successfully shortlisted for our Freelancing Bootcamp after review.</p>
      <p>Due to limited slots, only selected applicants were chosen.</p>
      <p>Join the official WhatsApp group below:</p>
      <p><a href="${escape(v.whatsapp_group_link ?? "")}" style="color:#059669;font-weight:600">${escape(v.whatsapp_group_link ?? "")}</a></p>
      <p>All updates, schedules, and instructions will be shared there.</p>
      <p>Please join immediately.</p>
      <p>Welcome aboard!</p>
      <p style="margin-top:24px">Freelance Bootcamp Admissions Team</p>
    `),
  }),
  rejected: (v: BootcampVars) => ({
    subject: `Application Update`,
    html: wrap(`
      <p>Hello ${escape(v.full_name)},</p>
      <p>Thank you for applying.</p>
      <p>After review, you were not selected for this intake.</p>
      <p>We encourage you to apply for future bootcamps.</p>
      <p style="margin-top:24px">Best regards,<br/>Freelance Bootcamp Admissions Team</p>
    `),
  }),
};

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
