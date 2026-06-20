import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { submitApplication, getPublicStats } from "@/lib/applications.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "5-Day Freelancing Bootcamp — Apply Now" },
      { name: "description", content: "Learn in-demand freelancing skills, build your online profile, and discover how to start earning remotely — even as a beginner." },
      { property: "og:title", content: "5-Day Freelancing Bootcamp" },
      { property: "og:description", content: "Apply for the 5-Day Freelancing Bootcamp. Limited seats available." },
    ],
  }),
  component: Landing,
});

const SKILLS = [
  { code: "0x01", name: "Website Design", blurb: "Build & ship modern sites for clients." },
  { code: "0x02", name: "Digital Marketing", blurb: "Run campaigns that actually convert." },
  { code: "0x03", name: "Graphic Design", blurb: "Visual systems that sell brands." },
  { code: "0x04", name: "Content Writing", blurb: "Write copy that earns trust and clicks." },
  { code: "0x05", name: "Resume Writing", blurb: "Package your offer for premium clients." },
  { code: "0x06", name: "AI Tools for Freelancers", blurb: "Ship faster with the latest stack." },
  { code: "0x07", name: "Client Acquisition", blurb: "Find, pitch, and close real customers." },
  { code: "0x08", name: "Freelancing Fundamentals", blurb: "Pricing, contracts, and operations." },
];

function Landing() {
  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => getPublicStats(),
    refetchInterval: 30_000,
  });
  const registrationClosed = stats?.is_full || stats?.settings?.registration_status === "closed";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav stats={stats} />
      <Hero stats={stats} closed={Boolean(registrationClosed)} />
      <Skills />
      <WhyJoin />
      <Apply closed={Boolean(registrationClosed)} bootcampName={stats?.settings?.bootcamp_name ?? "Freelancing Bootcamp"} />
      <Footer />
    </div>
  );
}

function Nav({ stats }: { stats: Awaited<ReturnType<typeof getPublicStats>> | undefined }) {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="size-3 bg-primary animate-pulse rounded-full shadow-[0_0_10px_var(--color-primary)]" />
          <span className="font-mono text-sm tracking-tight text-foreground uppercase">System.Bootcamp_v1.0</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
          <a href="#curriculum" className="hover:text-foreground"><span className="text-primary">[01]</span> Curriculum</a>
          <a href="#why" className="hover:text-foreground"><span className="text-primary">[02]</span> Why Join</a>
          <a href="#apply" className="hover:text-foreground"><span className="text-primary">[03]</span> Apply</a>
        </div>
        <a href="#apply" className="px-4 py-1.5 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-widest font-bold rounded-sm hover:brightness-110">
          Apply {stats ? `· ${stats.remaining_slots} left` : ""}
        </a>
      </div>
    </nav>
  );
}

function Hero({ stats, closed }: { stats: Awaited<ReturnType<typeof getPublicStats>> | undefined; closed: boolean }) {
  const max = stats?.settings?.max_participants ?? 0;
  const remaining = stats?.remaining_slots ?? 0;
  const fmtDate = stats?.settings?.start_date ? new Date(stats.settings.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBA";

  return (
    <header className="relative py-24 border-b border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className={`inline-flex items-center gap-3 px-3 py-1 rounded-full border mb-8 ${closed ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-brand-muted"}`}>
          <span className={`flex size-2 rounded-full ${closed ? "bg-destructive" : "bg-primary animate-ping"}`} />
          <span className={`font-mono text-[11px] uppercase font-semibold ${closed ? "text-destructive" : "text-primary"}`}>
            {closed ? "Registration Closed" : `${remaining} Seats remaining / ${max} Total`}
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-3xl leading-[0.95] text-foreground">
          5-Day <span className="text-primary underline decoration-primary/30">Freelancing Bootcamp</span>.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
          Learn in-demand freelancing skills, build your online profile, and discover how to start earning remotely — even as a beginner.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <a href="#apply" className={`px-8 py-4 font-mono font-bold text-sm uppercase tracking-tighter transition-all ${closed ? "bg-muted text-muted-foreground pointer-events-none" : "bg-primary text-primary-foreground hover:brightness-110"}`}>
            {closed ? "Closed" : "Initialize Application"}
          </a>
          <div className="px-8 py-4 border border-border font-mono text-sm uppercase tracking-tighter text-muted-foreground">
            Viewing: {stats?.settings?.bootcamp_name ?? "Bootcamp"}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-1">
          <Metric label="Duration" value="5 Days" />
          <Metric label="Time" value={stats?.settings?.daily_time ?? "4:00 PM – 6:00 PM"} />
          <Metric label="Start Date" value={fmtDate} />
          <Metric label="Applications" value={String(stats?.total_applications ?? 0)} />
        </div>
      </div>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 border border-border bg-card">
      <div className="font-mono text-[10px] text-primary uppercase tracking-widest">{label}</div>
      <div className="mt-2 text-lg font-mono font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Skills() {
  return (
    <section id="curriculum" className="py-24 border-b border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">/ Curriculum</div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Eight in-demand skills.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
          {SKILLS.map(s => (
            <div key={s.code} className="p-8 border border-border bg-card hover:border-primary/40 transition-colors">
              <span className="font-mono text-[10px] text-primary block mb-4">{s.code} / SKILL</span>
              <h3 className="text-base font-semibold text-foreground mb-2">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyJoin() {
  const items = [
    { title: "No Experience Needed", body: "Beginner-friendly training from zero. We start with fundamentals and ship outward." },
    { title: "Practical Training", body: "Live demos and assignments. You leave with real artifacts, not just notes." },
    { title: "Community Support", body: "WhatsApp group access for updates, peer help, and post-bootcamp accountability." },
  ];
  return (
    <section id="why" className="py-24 border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">/ Why Join</div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Built for builders.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-1">
          {items.map(it => (
            <div key={it.title} className="border border-border bg-card p-8">
              <div className="text-primary font-mono text-sm mb-4">[!]</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{it.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FormState {
  full_name: string; email: string; whatsapp: string;
  gender: string; age: string;
  education_level: string; institution: string; department: string; level: string;
  state: string; city: string; physical_address: string;
  participation_format: "physical" | "online";
  freelanced_before: string; freelancing_interest: string; motivation: string;
}
const empty: FormState = {
  full_name: "", email: "", whatsapp: "",
  gender: "", age: "",
  education_level: "", institution: "", department: "", level: "",
  state: "", city: "", physical_address: "",
  participation_format: "online",
  freelanced_before: "", freelancing_interest: "", motivation: "",
};

function Apply({ closed, bootcampName }: { closed: boolean; bootcampName: string }) {
  const [form, setForm] = useState<FormState>(empty);
  const [done, setDone] = useState(false);
  const submitFn = useServerFn(submitApplication);
  type SubmitResult = { ok: boolean; error?: string };
  const mut = useMutation({
    mutationFn: (payload: FormState) => submitFn({ data: {
      ...payload,
      age: payload.age ? Number(payload.age) : null,
      gender: payload.gender || null,
      education_level: payload.education_level || null,
      institution: payload.institution || null,
      department: payload.department || null,
      level: payload.level || null,
      state: payload.state || null,
      city: payload.city || null,
      physical_address: payload.physical_address || null,
      freelanced_before: payload.freelanced_before || null,
      freelancing_interest: payload.freelancing_interest || null,
      motivation: payload.motivation || null,
    } }) as Promise<SubmitResult>,
    onSuccess: (res) => {
      if (res.ok) { setDone(true); setForm(empty); }
      else toast.error(res.error ?? "Submission failed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(f => ({ ...f, [k]: v })); }

  if (done) {
    return (
      <section id="apply" className="py-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="border border-primary/30 bg-brand-muted p-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">[200] Status: Submitted</div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Application Submitted Successfully</h2>
            <p className="text-muted-foreground leading-relaxed">
              Thank you for applying for the {bootcampName}. Your application has been received and is currently being reviewed by our team.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Due to limited slots, only shortlisted participants will be contacted via email with next steps and training updates. Please monitor your email regularly.
            </p>
            <p className="text-primary font-mono uppercase text-sm tracking-widest mt-6">Good luck!</p>
          </div>
        </div>
      </section>
    );
  }

  if (closed) {
    return (
      <section id="apply" className="py-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="border border-destructive/30 bg-destructive/10 p-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-destructive mb-3">[403] Registration Closed</div>
            <h2 className="text-2xl font-bold text-foreground">All seats are taken for this cohort.</h2>
            <p className="mt-3 text-muted-foreground">Follow us for the next bootcamp announcement.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4 bg-background/40">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-destructive/50" />
              <div className="size-2.5 rounded-full bg-yellow-500/50" />
              <div className="size-2.5 rounded-full bg-primary" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Application Form</span>
          </div>

          <form onSubmit={e => { e.preventDefault(); mut.mutate(form); }} className="p-6 md:p-10 space-y-10">
            <FormSection title="Personal Information">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Full Name" required value={form.full_name} onChange={v => set("full_name", v)} />
                <Field label="Email Address" type="email" required value={form.email} onChange={v => set("email", v)} />
                <Field label="WhatsApp Number" required value={form.whatsapp} onChange={v => set("whatsapp", v)} placeholder="+234..." />
                <Select label="Gender" value={form.gender} onChange={v => set("gender", v)} options={["", "Male", "Female", "Other"]} />
                <Field label="Age" type="number" value={form.age} onChange={v => set("age", v)} />
              </div>
            </FormSection>

            <FormSection title="Education">
              <div className="grid md:grid-cols-2 gap-5">
                <Select label="Education Level" value={form.education_level} onChange={v => set("education_level", v)}
                  options={["", "Secondary", "Diploma", "Undergraduate", "Graduate", "Postgraduate"]} />
                <Field label="Institution Name" value={form.institution} onChange={v => set("institution", v)} />
                <Field label="Department / Course" value={form.department} onChange={v => set("department", v)} />
                <Field label="Level / Year" value={form.level} onChange={v => set("level", v)} />
              </div>
            </FormSection>

            <FormSection title="Location">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="State" value={form.state} onChange={v => set("state", v)} />
                <Field label="City" value={form.city} onChange={v => set("city", v)} />
              </div>
              <div className="mt-5">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Physical Address</label>
                <textarea value={form.physical_address} onChange={e => set("physical_address", e.target.value)} rows={2}
                  className="mt-2 w-full bg-background border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
            </FormSection>

            <FormSection title="Participation">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Format</label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["online", "physical"] as const).map(opt => (
                  <button key={opt} type="button" onClick={() => set("participation_format", opt)}
                    className={`px-3 py-4 border text-xs font-mono uppercase tracking-widest transition-all ${
                      form.participation_format === opt
                        ? "border-primary bg-brand-muted text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>{opt} session</button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Physical location is shared only with shortlisted participants.</p>
            </FormSection>

            <FormSection title="A few more things">
              <div className="grid md:grid-cols-2 gap-5">
                <Select label="Have you freelanced before?" value={form.freelanced_before} onChange={v => set("freelanced_before", v)}
                  options={["", "Yes", "No"]} />
                <Select label="Skill most interested in" value={form.freelancing_interest} onChange={v => set("freelancing_interest", v)}
                  options={["", ...SKILLS.map(s => s.name)]} />
              </div>
              <div className="mt-5">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Why do you want to join?</label>
                <textarea value={form.motivation} onChange={e => set("motivation", e.target.value)} rows={4}
                  className="mt-2 w-full bg-background border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
            </FormSection>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={mut.isPending}
                className="bg-primary text-primary-foreground px-10 py-4 font-mono font-bold text-xs uppercase tracking-tighter hover:brightness-110 disabled:opacity-50">
                {mut.isPending ? "Submitting…" : "Submit Application →"}
              </button>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          All communication via email. No applicant login required.
        </p>
      </div>
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-primary mb-5 pb-2 border-b border-border">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}{required && <span className="text-primary"> *</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
        {options.map(o => <option key={o} value={o}>{o || "Select…"}</option>)}
      </select>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          © {new Date().getFullYear()} Freelancing Bootcamp // Cohort System
        </div>
        <a href="/auth" className="font-mono text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest">Admin</a>
      </div>
    </footer>
  );
}
