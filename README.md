# JARVIS

A JARVIS-style affiliate growth operating system built with Next.js.

## Included phases

1. Campaign generation and affiliate link creation
2. JARVIS runtime status monitoring
3. Campaign brief orchestration
4. Supabase client and schema foundation
5. Auth/session, telemetry, email queue, and persistence endpoints

## Local usage

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Secrets and reinstall safety

The app does not need to be recreated when a service key is rotated or regenerated.

1. Keep your live values in `.env.local` only.
2. Use `.env.example` as the template for the exact variable names.
3. If a provider hides a key again, regenerate it in that provider's dashboard instead of rebuilding the project.
4. Store a secure backup of the final `.env.local` in a password manager or encrypted notes.

This keeps the project portable and avoids the "redo the whole app" trap.

## Environment

Create or update `.env.local` with your own values before enabling live services.
