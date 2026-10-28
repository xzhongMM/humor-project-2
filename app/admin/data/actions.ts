"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getAdminArea } from "@/lib/admin-areas";
import { deleteAdminRecord, insertAdminRecord, parseFormValues, updateAdminRecord } from "@/lib/admin-records";

export async function createAdminRecordAction(slug: string, form: FormData) {
  await requireSuperadmin();
  const area = getAdminArea(slug);
  if (!area || area.mode !== "crud") redirect("/admin");
  try {
    await insertAdminRecord(area, parseFormValues(area, form));
  } catch (error) {
    redirect(`/admin/data/${slug}/new?error=${encodeURIComponent((error as Error).message)}`);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/data/${slug}?saved=created`);
}

export async function updateAdminRecordAction(slug: string, id: string, form: FormData) {
  await requireSuperadmin();
  const area = getAdminArea(slug);
  if (!area || area.mode === "read") redirect("/admin");
  try {
    await updateAdminRecord(area, id, parseFormValues(area, form));
  } catch (error) {
    redirect(`/admin/data/${slug}/${id}?error=${encodeURIComponent((error as Error).message)}`);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/data/${slug}/${id}?saved=updated`);
}

export async function deleteAdminRecordAction(slug: string, id: string) {
  await requireSuperadmin();
  const area = getAdminArea(slug);
  if (!area || area.mode !== "crud") redirect("/admin");
  try {
    await deleteAdminRecord(area, id);
  } catch (error) {
    redirect(`/admin/data/${slug}/${id}?error=${encodeURIComponent((error as Error).message)}`);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/data/${slug}?saved=deleted`);
}
