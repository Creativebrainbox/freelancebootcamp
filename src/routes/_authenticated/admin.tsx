import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(Boolean(data));
    })();
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center border border-border bg-card p-8">
          <h1 className="text-lg font-bold text-foreground">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({email}) is signed in but has no admin role.
            Ask an existing admin to grant access, or — if this is the first admin —
            run the following on the database via Cloud:
          </p>
          <pre className="mt-4 text-left text-[11px] bg-background p-3 overflow-x-auto rounded-sm font-mono">{`INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = '${email}';`}</pre>
          <button onClick={signOut} className="mt-6 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>
    );
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
        {isAdmin === null ? (
          <div className="text-sm text-muted-foreground font-mono">Loading…</div>
        ) : (
          <Outlet />
        )}
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
