import "server-only";
import { createSupabaseAdmin } from "./supabase/admin";
import type { AdminArea } from "./admin-areas";

export type AdminRow = Record<string, unknown> & { id: string };

export async function listAdminRecords(area: AdminArea, page = 1, pageSize = 25, query = "") {
  const db = createSupabaseAdmin();
  let request = db.from(area.table).select("*", { count: "exact" });
  const q = query.trim().slice(0, 100);
  if (q && area.searchable?.length) {
    request = request.or(area.searchable.map((column) => `${column}.ilike.%${q}%`).join(","));
  }
  const { data, count, error } = await request
    .order("created_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as AdminRow[], count: count ?? 0, pageSize };
}

export async function getAdminRecord(area: AdminArea, id: string) {
  const { data, error } = await createSupabaseAdmin()
    .from(area.table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as AdminRow | null;
}

export async function insertAdminRecord(area: AdminArea, values: Record<string, unknown>) {
  const allowed = new Set(area.editable ?? []);
  const safe = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
  const { data, error } = await createSupabaseAdmin()
    .from(area.table).insert(safe as never).select("id").single();
  if (error) throw new Error(error.message);
  return String((data as unknown as { id: string }).id);
}

export async function updateAdminRecord(area: AdminArea, id: string, values: Record<string, unknown>) {
  const allowed = new Set(area.editable ?? []);
  const safe = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
  const { error } = await createSupabaseAdmin()
    .from(area.table).update(safe as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAdminRecord(area: AdminArea, id: string) {
  const { error } = await createSupabaseAdmin().from(area.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function parseFormValues(area: AdminArea, form: FormData) {
  const values: Record<string, unknown> = {};
  for (const field of area.fields) {
    if (!area.editable?.includes(field.name)) continue;
    const raw = String(form.get(field.name) ?? "").trim();
    if (field.type === "boolean") {
      values[field.name] = form.has(field.name);
    } else if (field.type === "number") {
      values[field.name] = raw === "" ? null : Number(raw);
    } else if (field.type === "json") {
      values[field.name] = raw === "" ? null : JSON.parse(raw);
    } else {
      values[field.name] = raw === "" ? null : raw;
    }
  }
  return values;
}
