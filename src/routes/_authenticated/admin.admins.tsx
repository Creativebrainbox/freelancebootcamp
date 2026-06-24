import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdmins, approveAdmin, removeAdmin } from "@/lib/admins.functions";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAdmins);
  const approveFn = useServerFn(approveAdmin);
  const removeFn = useServerFn(removeAdmin);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => listFn({}),
  });

  const approveMut = useMutation({
    mutationFn: (user_id: string) => approveFn({ data: { user_id } }) as Promise<{ ok: boolean; email_sent: boolean; error?: string }>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success(res.email_sent ? "Approved & notified by email" : `Approved (email failed: ${res.error ?? "unknown"})`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeMut = useMutation({
    mutationFn: (user_id: string) => removeFn({ data: { user_id } }) as Promise<{ ok: boolean }>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      toast.success("Admin removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const admins = data?.admins ?? [];
  const pending = (data?.pending ?? []).filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const me = data?.me;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve new admins, or revoke existing ones. The primary admin is protected.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Current Admins</h2>
        <div className="border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <Th>Email</Th><Th>Role</Th><Th>Since</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="p-6 text-center text-xs font-mono text-muted-foreground">Loading…</td></tr>}
              {!isLoading && admins.map(a => (
                <tr key={a.user_id} className="border-b border-border last:border-0">
                  <Td className="text-foreground">{a.email}{a.user_id === me ? " (you)" : ""}</Td>
                  <Td>
                    {a.is_primary
                      ? <span className="inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-primary/20 text-primary">Primary</span>
                      : <span className="inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-accent text-muted-foreground">Admin</span>}
                  </Td>
                  <Td className="font-mono text-[11px]">{new Date(a.created_at).toLocaleDateString()}</Td>
                  <Td>
                    {a.is_primary
                      ? <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Protected</span>
                      : a.user_id === me
                        ? <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">—</span>
                        : (
                          <button
                            onClick={() => { if (confirm(`Remove admin ${a.email}?`)) removeMut.mutate(a.user_id); }}
                            disabled={removeMut.isPending}
                            className="text-[10px] font-mono uppercase tracking-widest text-destructive hover:brightness-110 disabled:opacity-50"
                          >Remove</button>
                        )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Pending Users (signed up, not yet admin)</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email…"
            className="bg-background border border-border px-3 py-2 text-xs min-w-[200px]" />
        </div>
        <div className="border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <Th>Email</Th><Th>Signed Up</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={3} className="p-6 text-center text-xs font-mono text-muted-foreground">Loading…</td></tr>}
              {!isLoading && pending.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-xs font-mono text-muted-foreground">No pending users.</td></tr>
              )}
              {pending.map(u => (
                <tr key={u.user_id} className="border-b border-border last:border-0">
                  <Td className="text-foreground">{u.email}</Td>
                  <Td className="font-mono text-[11px]">{new Date(u.created_at).toLocaleDateString()}</Td>
                  <Td>
                    <button
                      onClick={() => approveMut.mutate(u.user_id)}
                      disabled={approveMut.isPending}
                      className="text-[10px] font-mono uppercase tracking-widest text-primary hover:brightness-110 disabled:opacity-50"
                    >Approve as Admin</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 text-muted-foreground ${className}`}>{children}</td>;
}
