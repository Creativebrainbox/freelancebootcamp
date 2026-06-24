import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { checkAdminAccess } from "@/lib/admin-guard.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const result = await checkAdminAccess();
    if (!result.isAdmin) {
      throw redirect({ to: "/admin/access-denied" as never });
    }
    return { adminEmail: result.email ?? "" };
  },
  loader: ({ context }) => ({ email: (context as { adminEmail?: string }).adminEmail ?? "" }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { email } = Route.useLoaderData();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-foreground">Admin.Console</span>
            </div>
            <div className="flex items-center gap-1">
              <NavLink to="/admin" active={pathname === "/admin"}>Applications</NavLink>
              <NavLink to="/admin/admins" active={pathname.startsWith("/admin/admins")}>Admins</NavLink>
              <NavLink to="/admin/settings" active={pathname.startsWith("/admin/settings")}>Settings</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground hidden md:inline">{email}</span>
            <button onClick={signOut} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-widest transition-colors ${
        active ? "bg-brand-muted text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
