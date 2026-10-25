import LoginButton from "./LoginButton";

export const metadata = { title: "Sign in · Humor Admin" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark">ha</div>
        <h1>Humor Admin</h1>
        <p className="muted">Restricted area. Sign in with Google. Only superadmins get past this page.</p>
        {error && <p className="flash error">Sign-in failed. Please try again.</p>}
        <LoginButton next={next} />
      </div>
    </main>
  );
}
