import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/access-denied")({
  head: () => ({ meta: [{ title: "Access Denied" }, { name: "robots", content: "noindex" }] }),
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md text-center border border-border bg-card p-8">
        <h1 className="text-lg font-bold text-foreground">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have admin access. Please contact an existing admin to request access.
        </p>
        <Link to="/" className="mt-6 inline-block text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}
