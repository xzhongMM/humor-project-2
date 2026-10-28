"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "admin-images";

function uuid(value: string | null) {
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function uploadAdminImageAction(form: FormData) {
  const user = await requireSuperadmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/data/images/upload?error=Choose%20an%20image%20file");
  if (!file.type.startsWith("image/")) redirect("/admin/data/images/upload?error=Only%20image%20files%20are%20allowed");
  if (file.size > 10 * 1024 * 1024) redirect("/admin/data/images/upload?error=Image%20must%20be%2010MB%20or%20smaller");

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg" : "jpg";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const db = createSupabaseAdmin();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect(`/admin/data/images/upload?error=${encodeURIComponent(uploadError.message)}`);

  const publicUrl = db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const memeId = uuid(String(form.get("meme_id") ?? ""));
  const values = {
    user_id: user.id,
    meme_id: memeId,
    storage_path: storagePath,
    public_url: publicUrl,
    alt_text: String(form.get("alt_text") ?? "").trim() || null,
    caption: String(form.get("caption") ?? "").trim() || null,
  };
  const { error } = await db.from("images").insert(values as never);
  if (error) {
    await db.storage.from(BUCKET).remove([storagePath]);
    redirect(`/admin/data/images/upload?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/data/images?saved=image-uploaded");
}

export async function deleteAdminImageAction(id: string, storagePath: string) {
  await requireSuperadmin();
  const db = createSupabaseAdmin();
  const { error } = await db.from("images").delete().eq("id", id);
  if (error) redirect(`/admin/data/images/${id}?error=${encodeURIComponent(error.message)}`);
  if (storagePath) {
    const { error: storageError } = await db.storage.from(BUCKET).remove([storagePath]);
    if (storageError) redirect(`/admin/data/images?error=${encodeURIComponent(storageError.message)}`);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/data/images?saved=image-deleted");
}
