import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Access denied · Humor Admin" };

export default async function Unauthorized() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark deny">403</div>
        <h1>Access denied</h1>
        {user ? (
          <p className="muted">
            You're signed in as <strong>{user.email}</strong>, but this account doesn't have{" "}
            <code>profiles.is_superadmin = true</code>.
          </p>
        ) : (
          <p className="muted">You need to sign in first.</p>
        )}
        <form action="/auth/signout" method="post">
          <button className="btn">{user ? "Sign out and switch account" : "Go to sign in"}</button>
        </form>
      </div>
    </main>
  );
}
