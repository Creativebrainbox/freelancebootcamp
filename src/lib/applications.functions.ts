import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const applicationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).toLowerCase(),
  whatsapp: z.string().trim().min(5).max(30),
  gender: z.string().trim().max(30).optional().nullable(),
  age: z.number().int().min(10).max(120).optional().nullable(),
  education_level: z.string().trim().max(80).optional().nullable(),
  institution: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(160).optional().nullable(),
  level: z.string().trim().max(60).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  physical_address: z.string().trim().max(400).optional().nullable(),
  participation_format: z.enum(["physical", "online"]),
  freelanced_before: z.string().trim().max(20).optional().nullable(),
  freelancing_interest: z.string().trim().max(120).optional().nullable(),
  motivation: z.string().trim().max(2000).optional().nullable(),
});

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => applicationSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();

    // Check registration status + capacity
    const { data: settings } = await sb.from("settings").select("*").limit(1).maybeSingle();
    if (!settings) return { ok: false as const, error: "Bootcamp not configured yet." };
    if (settings.registration_status !== "open") {
      return { ok: false as const, error: "Registration is closed." };
    }

    const { data: counts } = await sb.rpc("get_application_counts");
    const approved = counts?.[0]?.approved ?? 0;
    if (approved >= settings.max_participants) {
      return { ok: false as const, error: "Bootcamp is full." };
    }

    const { data: inserted, error } = await sb.from("applications").insert(data).select("id").maybeSingle();
    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? "An application with this email or WhatsApp number already exists."
        : "Could not submit your application. Please try again.";
      return { ok: false as const, error: msg };
    }

    // Fire confirmation email (best-effort)
    try {
      const { sendEmail, emailTemplates } = await import("./email.server");
      const tpl = emailTemplates.received({ full_name: data.full_name, bootcamp_name: settings.bootcamp_name });
      const res = await sendEmail({ to: data.email, subject: tpl.subject, html: tpl.html });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("email_logs").insert({
        application_id: inserted?.id,
        email_type: "received",
        status: res.ok ? "sent" : "failed",
        error: res.ok ? null : res.error ?? null,
      });
    } catch (e) {
      console.error("confirmation email error", e);
    }

    return { ok: true as const };
  });

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: settings }, { data: counts }] = await Promise.all([
    sb.from("settings").select("bootcamp_name,start_date,end_date,daily_time,registration_status,max_participants,venue_address").limit(1).maybeSingle(),
    sb.rpc("get_application_counts"),
  ]);
  const total = Number(counts?.[0]?.total ?? 0);
  const approved = Number(counts?.[0]?.approved ?? 0);
  const max = settings?.max_participants ?? 0;
  return {
    settings: settings ?? null,
    total_applications: total,
    approved_count: approved,
    remaining_slots: Math.max(0, max - approved),
    is_full: approved >= max,
  };
});

const decisionSchema = z.object({ id: z.string().uuid() });

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: app, error } = await context.supabase
      .from("applications")
      .update({ status: "approved", approved_at: new Date().toISOString(), rejected_at: null })
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error || !app) throw new Error(error?.message ?? "Application not found");

    const { data: settings } = await context.supabase.from("settings").select("*").limit(1).maybeSingle();
    const { sendEmail, emailTemplates } = await import("./email.server");
    const tpl = emailTemplates.approved({
      full_name: app.full_name,
      bootcamp_name: settings?.bootcamp_name ?? "Freelancing Bootcamp",
      start_date: settings?.start_date ?? undefined,
      daily_time: settings?.daily_time ?? undefined,
      whatsapp_group_link: settings?.whatsapp_group_link ?? undefined,
    });
    const res = await sendEmail({ to: app.email, subject: tpl.subject, html: tpl.html });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("email_logs").insert({
      application_id: app.id, email_type: "approved",
      status: res.ok ? "sent" : "failed", error: res.ok ? null : res.error ?? null,
    });
    return { ok: true, email_sent: res.ok, error: res.error };
  });

export const rejectApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: app, error } = await context.supabase
      .from("applications")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), approved_at: null })
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error || !app) throw new Error(error?.message ?? "Application not found");

    const { data: settings } = await context.supabase.from("settings").select("bootcamp_name").limit(1).maybeSingle();
    const { sendEmail, emailTemplates } = await import("./email.server");
    const tpl = emailTemplates.rejected({
      full_name: app.full_name,
      bootcamp_name: settings?.bootcamp_name ?? "Freelancing Bootcamp",
    });
    const res = await sendEmail({ to: app.email, subject: tpl.subject, html: tpl.html });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("email_logs").insert({
      application_id: app.id, email_type: "rejected",
      status: res.ok ? "sent" : "failed", error: res.ok ? null : res.error ?? null,
    });
    return { ok: true, email_sent: res.ok, error: res.error };
  });
