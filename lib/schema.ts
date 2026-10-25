import config from "@/schema.config.json";

/**
 * All table/column names live in schema.config.json so a mismatch with the
 * real database is a one-line fix. Run `npm run check-schema` to verify.
 */
export const TABLES = config.tables;
export const COLS = config.columns;
export const TZ = config.timezone;

/** Build a PostgREST select string that aliases real columns to our keys: "id:id,imageUrl:image_url". */
export function sel(cols: Record<string, string>): string {
  return Object.entries(cols)
    .map(([alias, col]) => (alias === col ? col : `${alias}:${col}`))
    .join(",");
}

/** Re-key a raw row (real column names) to our aliases. */
export function aliasRow(raw: Record<string, unknown>, cols: Record<string, string>) {
  return Object.fromEntries(Object.entries(cols).map(([alias, col]) => [alias, raw[col]]));
}
