// Server-only: sends emails via Resend API.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Freelancing Bootcamp <onboarding@resend.dev>";

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

const wrap = (inner: string) => `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;margin:0;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:32px;color:#111827">
    ${inner}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#6b7280;margin:0">Freelancing Bootcamp · Email-only communication</p>
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
      <p style="margin-top:24px">— The Bootcamp Team</p>
    `),
  }),
  approved: (v: BootcampVars) => ({
    subject: `Application Approved – ${v.bootcamp_name}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#059669">You're in 🎉</h2>
      <p>Hello ${escape(v.full_name)},</p>
      <p>You have been selected for <strong>${escape(v.bootcamp_name)}</strong>.</p>
      <ul style="line-height:1.8">
        ${v.start_date ? `<li><strong>Start Date:</strong> ${escape(v.start_date)}</li>` : ""}
        ${v.daily_time ? `<li><strong>Time:</strong> ${escape(v.daily_time)}</li>` : ""}
        ${v.whatsapp_group_link ? `<li><strong>WhatsApp Group:</strong> <a href="${escape(v.whatsapp_group_link)}">${escape(v.whatsapp_group_link)}</a></li>` : ""}
      </ul>
      <p>Join the WhatsApp group immediately for updates and instructions.</p>
      <p style="margin-top:24px">See you there.<br/>— The Bootcamp Team</p>
    `),
  }),
  rejected: (v: BootcampVars) => ({
    subject: `Application Status Update – ${v.bootcamp_name}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px">Application Update</h2>
      <p>Hello ${escape(v.full_name)},</p>
      <p>Thank you for applying for <strong>${escape(v.bootcamp_name)}</strong>.</p>
      <p>After review, you were not selected for this cohort. We encourage you to apply for future bootcamps.</p>
      <p style="margin-top:24px">— The Bootcamp Team</p>
    `),
  }),
};

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
