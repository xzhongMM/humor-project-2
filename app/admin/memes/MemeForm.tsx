import type { Meme } from "@/lib/types";

export default function MemeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  initial?: Meme;
  submitLabel: string;
}) {
  return (
    <form action={action} className="form">
      <label>
        <span>Image path</span>
        <input name="image_path" required maxLength={2000} defaultValue={initial?.imagePath ?? ""} />
      </label>
      <label>
        <span>Image URL</span>
        <input name="image_url" type="url" required maxLength={4000} defaultValue={initial?.imageUrl ?? ""} />
      </label>
      <label>
        <span>Vibe</span>
        <input name="vibe" required defaultValue={initial?.vibe ?? ""} />
      </label>
      <label>
        <span>Generation prompt</span>
        <textarea name="prompt" rows={5} required maxLength={10000} defaultValue={initial?.prompt ?? ""} />
      </label>
      <label>
        <span>Model</span>
        <input name="model" required defaultValue={initial?.model ?? ""} />
      </label>
      <label>
        <span>Source</span>
        <select name="source" defaultValue={initial?.source ?? "user"}>
          <option value="user">User</option>
          <option value="bot">Bot</option>
        </select>
      </label>
      <label>
        <span>Owner user ID <span className="muted small">(optional UUID)</span></span>
        <input name="user_id" className="mono" defaultValue={initial?.userId ?? ""} />
      </label>
      <label>
        <span>Image credit</span>
        <input name="image_credit" defaultValue={initial?.imageCredit ?? ""} />
      </label>
      <label>
        <span>Image source URL</span>
        <input name="image_source_url" type="url" maxLength={4000} defaultValue={initial?.imageSourceUrl ?? ""} />
      </label>
      <div className="row gap-sm">
        <button className="btn primary">{submitLabel}</button>
      </div>
    </form>
  );
}