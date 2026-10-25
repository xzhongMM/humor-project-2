import type { Meme } from "@/lib/types";

/** Server-rendered form. The meme picker is a pure-CSS radio grid. */
export default function CaptionForm({
  action,
  memes,
  initial,
  submitLabel,
  returnTo,
}: {
  action: (form: FormData) => Promise<void>;
  memes: Meme[];
  initial?: { content: string; memeId: string | null };
  submitLabel: string;
  returnTo?: string;
}) {
  // Make sure the caption's current meme is selectable even if it's not in the recent list.
  const list =
    initial?.memeId && !memes.some((m) => m.id === initial.memeId)
      ? [{ id: initial.memeId, imageUrl: null, created: null }, ...memes]
      : memes;
  const memeReturnTo = returnTo && /^\/admin\/memes\/[0-9a-f-]{36}$/i.test(returnTo) ? returnTo : undefined;

  return (
    <form action={action} className="form">
      {memeReturnTo && <input type="hidden" name="return_to" value={memeReturnTo} />}
      <label>
        <span>Caption</span>
        <textarea name="content" rows={3} required maxLength={280} defaultValue={initial?.content ?? ""} placeholder="Write something funny…" />
      </label>

      <fieldset>
        <legend>Meme</legend>
        <div className="picker">
          {list.map((m) => (
            <label key={m.id} className="pick" title={`meme ${m.id}`}>
              <input type="radio" name="meme_id" value={m.id} defaultChecked={initial?.memeId === m.id} />
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="pick-id mono small">#{m.id.slice(0, 8)}</span>
              )}
            </label>
          ))}
        </div>
        <label className="inline small">
          <span className="muted">…or enter a meme ID:</span>
          <input name="meme_id_manual" placeholder="meme id" className="mono" />
        </label>
      </fieldset>

      <div className="row gap-sm">
        <button className="btn primary">{submitLabel}</button>
      </div>
    </form>
  );
}
