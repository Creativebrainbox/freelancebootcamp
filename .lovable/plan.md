## Fixes

### 1. Submission failure (root cause)
The `applications`, `settings`, `user_roles`, `email_logs` tables have RLS policies but **zero `GRANT` statements**, so PostgREST rejects all requests with a permission error before RLS even runs. That's why the form returns "Could not submit your application."

Add a migration that grants the privileges each role actually needs:

```sql
-- Public can submit + read settings (RLS still applies)
GRANT INSERT ON public.applications TO anon, authenticated;
GRANT ALL    ON public.applications TO service_role;

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL    ON public.settings TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

GRANT ALL    ON public.email_logs TO service_role;

GRANT EXECUTE ON FUNCTION public.get_application_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
```

Admin SELECT/UPDATE/DELETE on `applications` already works through the existing RLS policies once `authenticated` has table-level privileges (admins inherit them via `has_role`).

### 2. Rename "Graphic Design" → "Email Marketing"
Update the `SKILLS` array in `src/routes/index.tsx`:
- `code: "0x03"` → `name: "Email Marketing"`, blurb: "Run inbox campaigns that drive sales."

(Only the landing-page list references this; no DB enum to change.)

### Verification
- Reload `/` and submit a test application — should succeed and trigger the "received" email.
- Confirm the new "Email Marketing" tile appears in the curriculum grid and as an option in the "Skill most interested in" dropdown.
