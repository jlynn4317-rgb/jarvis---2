# JARVIS

JARVIS is a Next.js dashboard for planning and running affiliate-marketing campaigns. It brings campaign copy generation, affiliate link creation, lead capture, and activity monitoring into one workspace.

## What it does

- Generates campaign copy and variants with configured AI providers.
- Builds tracked links for Amazon, ClickBank, ShareASale, Impact, and generic destinations.
- Creates campaign landing pages that capture leads and track clicks.
- Supports social post approval, email sequences, and campaign data persistence.
- Reports runtime and integration status from the dashboard.

The app integrates with services such as Gemini/OpenAI, Supabase, and Resend; live functionality depends on the corresponding environment variables and service setup.

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
