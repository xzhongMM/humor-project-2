"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { deleteMeme, insertMeme, updateMeme, type MemeInput } from "@/lib/data";

function readForm(form: FormData): MemeInput {
  return {
    userId: String(form.get("user_id") ?? "").trim() || null,
    imagePath: String(form.get("image_path") ?? "").trim(),
    imageUrl: String(form.get("image_url") ?? "").trim(),
    vibe: String(form.get("vibe") ?? "").trim(),
    prompt: String(form.get("prompt") ?? "").trim(),
    model: String(form.get("model") ?? "").trim(),
    source: form.get("source") === "bot" ? "bot" : "user",
    imageCredit: String(form.get("image_credit") ?? "").trim() || null,
    imageSourceUrl: String(form.get("image_source_url") ?? "").trim() || null,
  };
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(input: MemeInput): string | null {
  if (!input.imagePath || !input.imageUrl || !input.vibe || !input.prompt || !input.model) {
    return "Image path, image URL, vibe, prompt and model are required.";
  }
  if (input.source !== "user" && input.source !== "bot") return "Source must be user or bot.";
  if (!validHttpUrl(input.imageUrl)) return "Image URL must be a valid http or https URL.";
  if (input.imageSourceUrl && !validHttpUrl(input.imageSourceUrl)) {
    return "Image source URL must be a valid http or https URL.";
  }
  if (input.userId && !/^[0-9a-f-]{36}$/i.test(input.userId)) return "User ID must be a UUID.";
  if (input.imagePath.length > 2000 || input.imageUrl.length > 4000 || input.prompt.length > 10000) {
    return "One or more fields exceed the allowed length.";
  }
  return null;
}

function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function createMemeAction(form: FormData) {
  await requireSuperadmin();
  const input = readForm(form);
  const invalid = validate(input);
  if (invalid) back("/admin/memes/new", invalid);

  let id: string;
  try {
    id = await insertMeme(input);
  } catch (error) {
    back("/admin/memes/new", (error as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/memes/${id}?saved=media-created`);
}

export async function updateMemeAction(id: string, form: FormData) {
  await requireSuperadmin();
  const input = readForm(form);
  const invalid = validate(input);
  if (invalid) back(`/admin/memes/${id}`, invalid);

  try {
    await updateMeme(id, input);
  } catch (error) {
    back(`/admin/memes/${id}`, (error as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/memes/${id}?saved=1`);
}

export async function deleteMemeAction(id: string) {
  await requireSuperadmin();
  try {
    await deleteMeme(id);
  } catch (error) {
    back(`/admin/memes/${id}`, (error as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/memes?saved=media-deleted");
}