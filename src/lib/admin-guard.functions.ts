import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_current_user_admin");
    if (error) return { isAdmin: false, email: null as string | null };
    return {
      isAdmin: Boolean(data),
      email: (context.claims?.email as string | undefined) ?? null,
    };
  });
