import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

interface Settings {
  id: string;
  bootcamp_name: string;
  start_date: string | null;
  end_date: string | null;
  daily_time: string;
  whatsapp_group_link: string;
  registration_status: string;
  max_participants: number;
  venue_address: string;
}

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).maybeSingle().then(({ data }) => setS(data as Settings | null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("settings").update({
      bootcamp_name: s.bootcamp_name,
      start_date: s.start_date || null,
      end_date: s.end_date || null,
      daily_time: s.daily_time,
      whatsapp_group_link: s.whatsapp_group_link,
      registration_status: s.registration_status,
      max_participants: Number(s.max_participants),
      venue_address: s.venue_address,
      updated_at: new Date().toISOString(),
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  if (!s) return <div className="text-sm text-muted-foreground font-mono">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bootcamp Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">All settings here power the landing page and approval emails.</p>
      </div>

      <form onSubmit={save} className="border border-border bg-card p-6 space-y-5">
        <Input label="Bootcamp Name" value={s.bootcamp_name} onChange={v => setS({ ...s, bootcamp_name: v })} />
        <div className="grid md:grid-cols-2 gap-5">
          <Input type="date" label="Start Date" value={s.start_date ?? ""} onChange={v => setS({ ...s, start_date: v })} />
          <Input type="date" label="End Date" value={s.end_date ?? ""} onChange={v => setS({ ...s, end_date: v })} />
        </div>
        <Input label="Daily Time" value={s.daily_time} onChange={v => setS({ ...s, daily_time: v })} />
        <Input label="WhatsApp Group Link" value={s.whatsapp_group_link} onChange={v => setS({ ...s, whatsapp_group_link: v })} placeholder="https://chat.whatsapp.com/..." />
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Registration</label>
            <select value={s.registration_status} onChange={e => setS({ ...s, registration_status: e.target.value })}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <Input type="number" label="Max Participants" value={String(s.max_participants)} onChange={v => setS({ ...s, max_participants: Number(v) || 0 })} />
        </div>
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Physical Venue Address</label>
          <textarea value={s.venue_address} onChange={e => setS({ ...s, venue_address: e.target.value })} rows={3}
            className="w-full bg-background border border-border px-3 py-2.5 text-sm resize-none" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 disabled:opacity-50">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
    </div>
  );
}
