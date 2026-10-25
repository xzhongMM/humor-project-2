import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";
import { checkSuperadmin } from "./auth-core";

/**
 * Defense in depth: middleware already gates every route, but every admin
 * layout, page and server action calls this too. Server actions are POST
 * endpoints that can be invoked directly, so they must never trust the UI.
 */
export const requireSuperadmin = cache(async () => {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // verifies the JWT with Supabase Auth, unlike getSession()
  if (!user) redirect("/login");
  if (!(await checkSuperadmin(user.id))) redirect("/unauthorized");
  return user;
});
