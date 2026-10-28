import type { AdminArea } from "@/lib/admin-areas";

export default function RecordForm({
  area,
  action,
  initial,
  submitLabel,
}: {
  area: AdminArea;
  action: (form: FormData) => Promise<void>;
  initial?: Record<string, unknown>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="form">
      {area.fields.filter((field) => area.editable?.includes(field.name)).map((field) => {
        const value = initial?.[field.name];
        const common = { name: field.name, required: field.required, defaultValue: value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value) };
        if (field.type === "textarea" || field.type === "json") return <label key={field.name}><span>{field.label}</span><textarea {...common} rows={field.type === "json" ? 8 : 4} /></label>;
        if (field.type === "boolean") return <label key={field.name} className="check"><input type="checkbox" name={field.name} defaultChecked={value === true} /><span>{field.label}</span></label>;
        return <label key={field.name}><span>{field.label}</span><input {...common} type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "uuid" ? "text" : "text"} step={field.type === "number" ? "any" : undefined} /></label>;
      })}
      <div className="row gap-sm"><button className="btn primary">{submitLabel}</button></div>
    </form>
  );
}
