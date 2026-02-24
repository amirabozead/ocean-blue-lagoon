## Cursor Cloud specific instructions

**Ocean Stay Admin** is an offline-first React SPA (hotel/resort property management) built with Vite 7.x and npm.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (serves at `http://localhost:5173`) |
| Build | `npm run build` |

### Authentication (local dev)

In a fresh browser (no localStorage), the app shows a local PIN-based login. Default admin credentials: username **admin**, PIN **1234**. Other seeded users: `accountant` / `1111`, `frontoffice` / `2222`, `store` / `3333`.

When Supabase env vars are set *and* Supabase config is enabled in localStorage, the app shows a cloud login instead. For local-only testing, either remove `.env` or use the app without enabling cloud sync in Settings.

### Environment variables

Copy `env.local` to `.env` for Supabase cloud sync (optional). The app functions fully without Supabase using localStorage.

### Notes

- No ESLint, Prettier, or lint tooling is configured in this project.
- No automated test framework is present.
- The project has no git hooks or pre-commit checks.
- Vite dev server supports HMR; changes to `.jsx`/`.css` files are picked up automatically.
