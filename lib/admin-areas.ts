export type AdminField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "uuid" | "json" | "email" | "url" | "date";
  required?: boolean;
};

export type AdminArea = {
  slug: string;
  title: string;
  table: string;
  mode: "read" | "crud" | "update";
  fields: AdminField[];
  editable?: string[];
  searchable?: string[];
};

export const ADMIN_AREAS: AdminArea[] = [
  { slug: "prompt-chains", title: "Prompt chains", table: "prompt_chains", mode: "read", fields: [{name:"name",label:"Name"},{name:"description",label:"Description",type:"textarea"},{name:"active",label:"Active",type:"boolean"},{name:"created_at",label:"Created",type:"date"},{name:"updated_at",label:"Updated",type:"date"}] },
  { slug: "prompt-chain-steps", title: "Prompt chain steps", table: "prompt_chain_steps", mode: "read", fields: [{name:"chain_id",label:"Chain",type:"uuid"},{name:"position",label:"Position",type:"number"},{name:"name",label:"Name"},{name:"instruction",label:"Instruction",type:"textarea"},{name:"required",label:"Required",type:"boolean"}] },
  { slug: "prompt-chain-mix", title: "Prompt chain mix", table: "prompt_chain_mix", mode: "update", editable:["chain_id","term_id","weight"], fields: [{name:"chain_id",label:"Chain",type:"uuid",required:true},{name:"term_id",label:"Term",type:"uuid",required:true},{name:"weight",label:"Weight",type:"number",required:true}] },
  { slug: "terms", title: "Terms", table: "terms", mode: "crud", searchable:["name","slug","description"], editable:["name","slug","description","active"], fields: [{name:"name",label:"Name",required:true},{name:"slug",label:"Slug",required:true},{name:"description",label:"Description",type:"textarea"},{name:"active",label:"Active",type:"boolean"}] },
  { slug: "generation-requests", title: "Generation requests", table: "generation_requests", mode: "read", fields: [{name:"user_id",label:"User",type:"uuid"},{name:"meme_id",label:"Meme",type:"uuid"},{name:"chain_id",label:"Chain",type:"uuid"},{name:"provider_id",label:"Provider",type:"uuid"},{name:"model_id",label:"Model",type:"uuid"},{name:"prompt",label:"Prompt",type:"textarea"},{name:"status",label:"Status"},{name:"error_message",label:"Error",type:"textarea"},{name:"created_at",label:"Created",type:"date"},{name:"completed_at",label:"Completed",type:"date"}] },
  { slug: "generation-examples", title: "Generation examples", table: "generation_examples", mode: "crud", searchable:["title","prompt","expected_output"], editable:["title","prompt","expected_output","provider_id","model_id","chain_id","active"], fields: [{name:"title",label:"Title",required:true},{name:"prompt",label:"Prompt",type:"textarea",required:true},{name:"expected_output",label:"Expected output",type:"textarea"},{name:"provider_id",label:"Provider",type:"uuid"},{name:"model_id",label:"Model",type:"uuid"},{name:"chain_id",label:"Chain",type:"uuid"},{name:"active",label:"Active",type:"boolean"}] },
  { slug: "llm-models", title: "LLM models", table: "llm_models", mode: "crud", searchable:["name","identifier"], editable:["provider_id","name","identifier","active","context_window"], fields: [{name:"provider_id",label:"Provider",type:"uuid",required:true},{name:"name",label:"Name",required:true},{name:"identifier",label:"Identifier",required:true},{name:"active",label:"Active",type:"boolean"},{name:"context_window",label:"Context window",type:"number"}] },
  { slug: "llm-providers", title: "LLM providers", table: "llm_providers", mode: "crud", searchable:["name","website_url"], editable:["name","website_url","active"], fields: [{name:"name",label:"Name",required:true},{name:"website_url",label:"Website",type:"url"},{name:"active",label:"Active",type:"boolean"}] },
  { slug: "llm-responses", title: "LLM responses", table: "llm_responses", mode: "read", fields: [{name:"request_id",label:"Request",type:"uuid"},{name:"model_id",label:"Model",type:"uuid"},{name:"response_text",label:"Response",type:"textarea"},{name:"response_json",label:"Response JSON",type:"json"},{name:"input_tokens",label:"Input tokens",type:"number"},{name:"output_tokens",label:"Output tokens",type:"number"},{name:"latency_ms",label:"Latency (ms)",type:"number"},{name:"created_at",label:"Created",type:"date"}] },
  { slug: "allowed-signup-domains", title: "Allowed signup domains", table: "allowed_signup_domains", mode: "crud", searchable:["domain"], editable:["domain","active"], fields: [{name:"domain",label:"Domain",required:true},{name:"active",label:"Active",type:"boolean"}] },
  { slug: "whitelisted-emails", title: "Whitelisted emails", table: "whitelisted_emails", mode: "crud", searchable:["email","note"], editable:["email","note","active","added_by"], fields: [{name:"email",label:"Email",type:"email",required:true},{name:"note",label:"Note",type:"textarea"},{name:"active",label:"Active",type:"boolean"},{name:"added_by",label:"Added by",type:"uuid"}] },
  { slug: "images", title: "Images", table: "images", mode: "crud", searchable:["storage_path","public_url","alt_text","caption"], editable:["user_id","meme_id","storage_path","public_url","alt_text","caption"], fields: [{name:"user_id",label:"User",type:"uuid"},{name:"meme_id",label:"Meme",type:"uuid"},{name:"storage_path",label:"Storage path",required:true},{name:"public_url",label:"Public URL",type:"url",required:true},{name:"alt_text",label:"Alt text",type:"textarea"},{name:"caption",label:"Caption",type:"textarea"}] }
];

export function getAdminArea(slug: string) {
  return ADMIN_AREAS.find((area) => area.slug === slug) ?? null;
}
