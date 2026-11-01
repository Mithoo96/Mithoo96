# Phase 2 changed files

Implementation commit: `a28552d`. Existing page moves preserve their URLs.

| Change | File |
|---|---|
| Modified | `.gitignore` |
| Moved unchanged | `web/app/appointments/page.tsx` → `web/app/(workspace)/appointments/page.tsx` |
| Moved unchanged | `web/app/approvals/page.tsx` → `web/app/(workspace)/approvals/page.tsx` |
| Moved unchanged | `web/app/apps/page.tsx` → `web/app/(workspace)/apps/page.tsx` |
| Moved unchanged | `web/app/clients/[id]/page.tsx` → `web/app/(workspace)/clients/[id]/page.tsx` |
| Moved unchanged | `web/app/clients/page.tsx` → `web/app/(workspace)/clients/page.tsx` |
| Moved unchanged | `web/app/create/[tool]/page.tsx` → `web/app/(workspace)/create/[tool]/page.tsx` |
| Moved unchanged | `web/app/create/page.tsx` → `web/app/(workspace)/create/page.tsx` |
| Moved unchanged | `web/app/documents/page.tsx` → `web/app/(workspace)/documents/page.tsx` |
| Moved unchanged | `web/app/inbox/page.tsx` → `web/app/(workspace)/inbox/page.tsx` |
| Moved unchanged | `web/app/insights/[metric]/page.tsx` → `web/app/(workspace)/insights/[metric]/page.tsx` |
| Moved unchanged | `web/app/insights/page.tsx` → `web/app/(workspace)/insights/page.tsx` |
| Added | `web/app/(workspace)/layout.tsx` |
| Added | `web/app/(workspace)/page.tsx` |
| Moved unchanged | `web/app/settings/page.tsx` → `web/app/(workspace)/settings/page.tsx` |
| Moved unchanged | `web/app/template.tsx` → `web/app/(workspace)/template.tsx` |
| Moved unchanged | `web/app/work/page.tsx` → `web/app/(workspace)/work/page.tsx` |
| Added | `web/app/error.tsx` |
| Modified | `web/app/layout.tsx` |
| Added | `web/app/login/login-form.tsx` |
| Added | `web/app/login/page.tsx` |
| Removed | `web/app/page.tsx` |
| Modified | `web/components/hero.tsx` |
| Modified | `web/components/launch-screen.tsx` |
| Modified | `web/components/owner-avatar.tsx` |
| Modified | `web/components/sections.tsx` |
| Modified | `web/components/shell/app-shell.tsx` |
| Modified | `web/components/shell/assistant.tsx` |
| Modified | `web/components/shell/mobile-nav.tsx` |
| Modified | `web/components/shell/notifications.tsx` |
| Modified | `web/components/shell/search.tsx` |
| Modified | `web/components/shell/session.tsx` |
| Modified | `web/components/shell/sidebar.tsx` |
| Modified | `web/components/shell/topbar.tsx` |
| Added | `web/components/shell/workspace.tsx` |
| Modified | `web/lib/supabase/client.ts` |
| Added | `web/lib/supabase/navigation.ts` |
| Modified | `web/lib/supabase/server.ts` |
| Modified | `web/package-lock.json` |
| Modified | `web/package.json` |
| Added | `web/playwright.config.ts` |
| Modified | `web/proxy.ts` |
| Modified | `web/server/adapters/prototype.ts` |
| Added | `web/server/auth/workspace.ts` |
| Modified | `web/server/services/dashboard.ts` |
| Added | `web/tests/e2e/owner.spec.ts` |
| Added | `web/tests/unit/auth-session.test.ts` |
| Updated | `HANDOFF.md` |
| Added | `docs/AGENT-DECISIONS.md` |
| Updated | `docs/NEXT-STEPS.md` |
| Added | `docs/PHASE-2-FILES.md` |

No migration, seed, RLS policy or Phase 1 engine files changed.
