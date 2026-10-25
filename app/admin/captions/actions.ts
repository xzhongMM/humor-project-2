"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { deleteCaption, insertCaption, updateCaption } from "@/lib/data";

/*
 * Server actions are public POST endpoints. Each one re-checks superadmin
 * itself instead of relying on the page that rendered the form.
 */

function readForm(form: FormData) {
  const content = String(form.get("content") ?? "").trim();
  const picked = String(form.get("meme_id") ?? "").trim(); // radio from the picker grid
  const manual = String(form.get("meme_id_manual") ?? "").trim(); // optional override
  return { content, memeId: manual || picked };
}

function validate({ content, memeId }: { content: string; memeId: string }): string | null {
  if (!content) return "Caption text is required.";
  if (content.length > 280) return "Caption is too long (280 characters max).";
  if (!memeId) return "Pick a meme.";
  return null;
}

function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function createCaptionAction(form: FormData) {
  const user = await requireSuperadmin();
  const input = readForm(form);
  const invalid = validate(input);
  if (invalid) back("/admin/captions/new", invalid);

  let id: string;
  try {
    id = await insertCaption({ ...input, profileId: user.id });
  } catch (e) {
    back("/admin/captions/new", (e as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/captions/${id}?saved=created`);
}

export async function updateCaptionAction(id: string, form: FormData) {
  await requireSuperadmin();
  const input = readForm(form);
  const invalid = validate(input);
  if (invalid) back(`/admin/captions/${id}`, invalid);

  try {
    await updateCaption(id, input);
  } catch (e) {
    back(`/admin/captions/${id}`, (e as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/captions/${id}?saved=1`);
}

export async function deleteCaptionAction(id: string) {
  await requireSuperadmin();
  try {
    await deleteCaption(id);
  } catch (e) {
    back(`/admin/captions/${id}`, (e as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/captions?saved=deleted`);
}
