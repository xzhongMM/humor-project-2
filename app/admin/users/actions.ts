"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { updateProfileSuperadmin } from "@/lib/data";

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function updateUserRoleAction(id: string, form: FormData) {
  const currentUser = await requireSuperadmin();
  if (!uuidPattern.test(id)) redirect("/admin/users?error=Invalid%20user%20ID");
  if (id === currentUser.id) {
    redirect(`/admin/users/${id}?error=You%20cannot%20change%20your%20own%20admin%20role`);
  }

  const isSuperadmin = form.get("role") === "superadmin";
  try {
    await updateProfileSuperadmin(id, isSuperadmin);
  } catch (error) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent((error as Error).message)}`);
  }

  revalidatePath("/admin", "layout");
  const returnTo = String(form.get("return_to") ?? "");
  if (returnTo === "/admin/users") redirect("/admin/users?saved=role-updated");
  redirect(`/admin/users/${id}?saved=role-updated`);
}
