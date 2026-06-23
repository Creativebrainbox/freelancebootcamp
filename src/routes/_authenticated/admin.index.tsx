import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { approveApplication, rejectApplication } from "@/lib/applications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type Status = "all" | "pending" | "approved" | "rejected";

interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  whatsapp: string;
  participation_format: string;
  status: string;
  gender: string | null;
  age: number | null;
  education_level: string | null;
  institution: string | null;
  department: string | null;
  level: string | null;
  school_name: string | null;
  study_track: string | null;
  class_level: string | null;
  graduation_year: string | null;
  state: string | null;
  city: string | null;
  physical_address: string | null;
  freelanced_before: string | null;
  freelancing_interest: string | null;
  motivation: string | null;
  heard_about_bootcamp: string | null;
  heard_about_other: string | null;
  invited_by: string | null;
}

async function fetchApplications(): Promise<Application[]> {
  const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Application[];
}

function Dashboard() {
  const queryClient = useQueryClient();
  const { data: apps = [], isLoading } = useQuery({ queryKey: ["applications"], queryFn: fetchApplications });
  const [filter, setFilter] = useState<Status>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Application | null>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("applications-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const approveFn = useServerFn(approveApplication);
  const rejectFn = useServerFn(rejectApplication);

  type DecisionResult = { ok: boolean; email_sent?: boolean; error?: string };

  const approveMut = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id } }) as Promise<DecisionResult>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(res.email_sent ? "Approved & email sent" : `Approved (email failed: ${res.error ?? "unknown"})`);
      setViewing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { id } }) as Promise<DecisionResult>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(res.email_sent ? "Rejected & email sent" : `Rejected (email failed: ${res.error ?? "unknown"})`);
      setViewing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const counts = {
    total: apps.length,
    pending: apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of apps) {
      const key = a.heard_about_bootcamp || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [apps]);

  const sources = useMemo(() => ["all", ...sourceCounts.map(([s]) => s)], [sourceCounts]);

  const filtered = apps.filter(a => {
    if (filter !== "all" && a.status !== filter) return false;
    if (sourceFilter !== "all" && (a.heard_about_bootcamp || "Unspecified") !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${a.full_name} ${a.email} ${a.whatsapp} ${a.heard_about_bootcamp ?? ""} ${a.heard_about_other ?? ""} ${a.invited_by ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and decide on cohort applications. Updates in real time.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        <Stat label="Total" value={counts.total} accent={false} />
        <Stat label="Pending" value={counts.pending} accent />
        <Stat label="Approved" value={counts.approved} accent={false} />
        <Stat label="Rejected" value={counts.rejected} accent={false} />
      </div>

      {/* Referral analytics */}
      <div className="border border-border bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">Referral / Discovery Sources</div>
        {sourceCounts.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono">No data yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sourceCounts.map(([src, n]) => (
              <div key={src} className="flex items-center justify-between border border-border bg-background/40 px-3 py-2">
                <span className="text-xs text-foreground truncate">{src}</span>
                <span className="text-xs font-mono font-bold text-primary">{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as Status[]).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border ${
                filter === s ? "border-primary bg-brand-muted text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-background border border-border px-3 py-2 text-xs font-mono uppercase tracking-widest">
          {sources.map(s => <option key={s} value={s}>{s === "all" ? "All Sources" : s}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email / referral…"
          className="flex-1 min-w-[200px] bg-background border border-border px-3 py-2 text-xs" />
      </div>

      <div className="border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <Th>Name</Th><Th>Email</Th><Th>WhatsApp</Th><Th>Heard From</Th><Th>Invited By</Th><Th>Status</Th><Th>Applied</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={8} className="p-8 text-center text-muted-foreground font-mono text-xs">Loading…</td></tr>)}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground font-mono text-xs">No applications</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background/30">
                <Td className="text-foreground font-medium">{a.full_name}</Td>
                <Td>{a.email}</Td>
                <Td>{a.whatsapp}</Td>
                <Td>{a.heard_about_bootcamp ?? "—"}{a.heard_about_other ? ` (${a.heard_about_other})` : ""}</Td>
                <Td>{a.invited_by ?? "—"}</Td>
                <Td><StatusBadge status={a.status} /></Td>
                <Td className="font-mono text-[11px]">{new Date(a.created_at).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button onClick={() => setViewing(a)} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">View</button>
                    {a.status !== "approved" && (
                      <button onClick={() => approveMut.mutate(a.id)} disabled={approveMut.isPending}
                        className="text-[10px] font-mono uppercase tracking-widest text-primary hover:brightness-110 disabled:opacity-50">Approve</button>
                    )}
                    {a.status !== "rejected" && (
                      <button onClick={() => rejectMut.mutate(a.id)} disabled={rejectMut.isPending}
                        className="text-[10px] font-mono uppercase tracking-widest text-destructive hover:brightness-110 disabled:opacity-50">Reject</button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl bg-card border border-border max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border p-4 flex items-center justify-between sticky top-0 bg-card">
              <div>
                <h3 className="text-lg font-bold text-foreground">{viewing.full_name}</h3>
                <StatusBadge status={viewing.status} />
              </div>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Email" value={viewing.email} />
              <Field label="WhatsApp" value={viewing.whatsapp} />
              <Field label="Gender" value={viewing.gender} />
              <Field label="Age" value={viewing.age?.toString() ?? null} />
              <Field label="Education" value={viewing.education_level} />
              <Field label="School / Institution" value={viewing.school_name || viewing.institution} />
              <Field label="Study Track" value={viewing.study_track} />
              <Field label="Class" value={viewing.class_level} />
              <Field label="Department" value={viewing.department} />
              <Field label="Level / Year" value={viewing.level} />
              <Field label="Graduation Year" value={viewing.graduation_year} />
              <Field label="State" value={viewing.state} />
              <Field label="City" value={viewing.city} />
              <Field label="Format" value={viewing.participation_format} />
              <Field label="Freelanced before" value={viewing.freelanced_before} />
              <Field label="Interest" value={viewing.freelancing_interest} />
              <Field label="Heard From" value={viewing.heard_about_bootcamp} />
              <Field label="Heard – Other" value={viewing.heard_about_other} />
              <Field label="Invited By" value={viewing.invited_by} />
              <div className="md:col-span-2"><Field label="Address" value={viewing.physical_address} /></div>
              <div className="md:col-span-2"><Field label="Motivation" value={viewing.motivation} multiline /></div>
            </div>
            <div className="border-t border-border p-4 flex justify-end gap-2 sticky bottom-0 bg-card">
              {viewing.status !== "rejected" && (
                <button onClick={() => rejectMut.mutate(viewing.id)} disabled={rejectMut.isPending}
                  className="px-4 py-2 border border-destructive text-destructive text-xs font-mono uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50">Reject</button>
              )}
              {viewing.status !== "approved" && (
                <button onClick={() => approveMut.mutate(viewing.id)} disabled={approveMut.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110 disabled:opacity-50">Approve</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: boolean }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-3 text-3xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 text-muted-foreground ${className}`}>{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved"
    ? "bg-brand-muted text-primary"
    : status === "rejected"
    ? "bg-destructive/15 text-destructive"
    : "bg-accent text-muted-foreground";
  return <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${cls}`}>{status}</span>;
}
function Field({ label, value, multiline = false }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}>{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
