import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;

  return (
    <main className="go-shell">
      <section className="go-card">
        <p className="go-eyebrow">JARVIS</p>
        <h1>Sign in</h1>
        <LoginForm denied={Boolean(denied)} />
      </section>
    </main>
  );
}
