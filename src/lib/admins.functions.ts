import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as { from: (t: string) => { select: (s: string) => { eq: (a: string, b: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } } };
  const { data } = await sb.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export interface AdminRow {
  user_id: string;
  email: string;
  created_at: string;
  is_primary: boolean;
}
export interface PendingUserRow {
  user_id: string;
  email: string;
  created_at: string;
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ admins: AdminRow[]; pending: PendingUserRow[]; me: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at, is_primary")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));

    const { data: usersRes } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = usersRes?.users ?? [];

    const admins: AdminRow[] = (roles ?? []).map((r) => {
      const u = users.find((x) => x.id === r.user_id);
      return {
        user_id: r.user_id,
        email: u?.email ?? "(unknown)",
        created_at: r.created_at as string,
        is_primary: Boolean(r.is_primary),
      };
    }).sort((a, b) => (a.is_primary === b.is_primary ? a.email.localeCompare(b.email) : a.is_primary ? -1 : 1));

    const pending: PendingUserRow[] = users
      .filter((u) => !adminIds.has(u.id) && u.email)
      .map((u) => ({ user_id: u.id, email: u.email!, created_at: u.created_at }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return { admins, pending, me: context.userId };
  });

const userIdSchema = z.object({ user_id: z.string().uuid() });

export const approveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: "admin", is_primary: false });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);

    // Notify the new admin by email
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const email = userRes?.user?.email;
    let email_sent = false;
    let email_error: string | undefined;
    if (email) {
      try {
        const { sendEmail } = await import("./email.server");
        const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#fff;padding:32px;color:#111827">
          <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;padding:32px">
            <h2 style="margin:0 0 16px">You're now an admin</h2>
            <p>Your account (<strong>${email}</strong>) has been approved as an admin for the Freelance Bootcamp.</p>
            <p>You now have full access to the admin dashboard — view applications, approve or reject candidates, manage settings, and add or remove other admins.</p>
            <p>Sign in at the admin console to get started.</p>
            <p style="margin-top:24px">— Freelance Bootcamp Admissions Team</p>
          </div></body></html>`;
        const res = await sendEmail({ to: email, subject: "You've been approved as an admin", html });
        email_sent = res.ok;
        email_error = res.error;
      } catch (e) {
        email_error = e instanceof Error ? e.message : String(e);
      }
    }
    return { ok: true, email_sent, error: email_error };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot remove yourself.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_roles")
      .select("id, is_primary")
      .eq("user_id", data.user_id)
      .eq("role", "admin")
      .maybeSingle();
    if (!row) throw new Error("Admin not found.");
    if (row.is_primary) throw new Error("The primary admin cannot be removed.");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
