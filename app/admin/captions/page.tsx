import { redirect } from "next/navigation";

export default async function CaptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; saved?: string; error?: string }>;
}) {
  await searchParams;
  redirect("/admin/memes");
}
