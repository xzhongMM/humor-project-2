import { createServiceClient } from "./supabase/service";
import { TABLES, COLS } from "./schema";

/**
 * Single source of truth for "is this user allowed in?".
 * Reads profiles.is_superadmin with the service key (so RLS can't hide the row)
 * and FAILS CLOSED: any error, missing row, or non-true value → false.
 */
export async function checkSuperadmin(userId: string): Promise<boolean> {
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from(TABLES.profiles)
      .select(COLS.profiles.isSuperadmin)
      .eq(COLS.profiles.id, userId)
      .maybeSingle();
    if (error || !data) return false;
    return (data as unknown as Record<string, unknown>)[COLS.profiles.isSuperadmin] === true;
  } catch {
    return false;
  }
}
