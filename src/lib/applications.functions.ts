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
  school_name: z.string().trim().max(160).optional().nullable(),
  study_track: z.string().trim().max(60).optional().nullable(),
  class_level: z.string().trim().max(60).optional().nullable(),
  graduation_year: z.string().trim().max(10).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  physical_address: z.string().trim().max(400).optional().nullable(),
  participation_format: z.literal("physical"),
  freelanced_before: z.string().trim().max(20).optional().nullable(),
  freelancing_interest: z.string().trim().max(120).optional().nullable(),
  motivation: z.string().trim().max(2000).optional().nullable(),
  heard_about_bootcamp: z.string().trim().max(80).optional().nullable(),
  heard_about_other: z.string().trim().max(160).optional().nullable(),
  invited_by: z.string().trim().max(160).optional().nullable(),
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin.from("settings").select("*").limit(1).maybeSingle();
    if (!settings) return { ok: false as const, error: "Bootcamp not configured yet." };
    if (settings.registration_status !== "open") {
      return { ok: false as const, error: "Registration is closed." };
    }

    const { count: approvedCount, error: countError } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    if (countError) return { ok: false as const, error: "Could not verify seat availability. Please try again." };
    const approved = Number(approvedCount ?? 0);
    if (approved >= settings.max_participants) {
      return { ok: false as const, error: "Bootcamp is full." };
    }

    // Duplicate check (email or whatsapp)
    const { data: dup } = await supabaseAdmin
      .from("applications")
      .select("id")
      .or(`email.eq.${data.email},whatsapp.eq.${data.whatsapp}`)
      .maybeSingle();
    if (dup) {
      return { ok: false as const, error: "An application with this email or WhatsApp number already exists." };
    }

    const applicationId = crypto.randomUUID();
    const { error } = await supabaseAdmin.from("applications").insert({ ...data, id: applicationId });
    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? "An application with this email or WhatsApp number already exists."
        : "Could not submit your application. Please try again.";
      return { ok: false as const, error: msg };
    }

    try {
      const { sendEmail, emailTemplates } = await import("./email.server");
      const tpl = emailTemplates.received({ full_name: data.full_name, bootcamp_name: settings.bootcamp_name });
      const res = await sendEmail({ to: data.email, subject: tpl.subject, html: tpl.html });
      await supabaseAdmin.from("email_logs").insert({
        application_id: applicationId,
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: settings }, { count: total }, { count: approved }] = await Promise.all([
    sb.from("settings").select("bootcamp_name,start_date,end_date,daily_time,registration_status,max_participants,venue_address").limit(1).maybeSingle(),
    supabaseAdmin.from("applications").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);
  const totalCount = Number(total ?? 0);
  const approvedCount = Number(approved ?? 0);
  const max = settings?.max_participants ?? 0;
  return {
    settings: settings ?? null,
    total_applications: totalCount,
    approved_count: approvedCount,
    remaining_slots: Math.max(0, max - approvedCount),
    is_full: approvedCount >= max,
  };
});

const decisionSchema = z.object({ id: z.string().uuid() });

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!adminRole) throw new Error("Forbidden");

    // Always fetch latest settings (including WhatsApp link) at send time
    const { data: settings } = await context.supabase.from("settings").select("*").limit(1).maybeSingle();
    const link = settings?.whatsapp_group_link?.trim();
    if (!link || !/^https?:\/\//i.test(link)) {
      throw new Error("WhatsApp group link is missing or invalid in Settings. Please configure it before approving.");
    }

    const { data: app, error } = await context.supabase
      .from("applications")
      .update({ status: "approved", approved_at: new Date().toISOString(), rejected_at: null })
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error || !app) throw new Error(error?.message ?? "Application not found");

    const { sendEmail, emailTemplates } = await import("./email.server");
    const tpl = emailTemplates.approved({
      full_name: app.full_name,
      bootcamp_name: settings?.bootcamp_name ?? "Freelancing Bootcamp",
      start_date: settings?.start_date ?? undefined,
      daily_time: settings?.daily_time ?? undefined,
      whatsapp_group_link: link,
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
    const { data: adminRole } = await context.supabase.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!adminRole) throw new Error("Forbidden");

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
