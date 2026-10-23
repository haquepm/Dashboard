"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const allowed = ["overview","progress","stages","work_packages","finance","milestones","issues","responsibilities","documents"];
export async function saveWorkspaceEntry(fd: FormData) {
 const s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user) throw new Error("Sign in required");
 const project_id=String(fd.get("project_id")||""); const section=String(fd.get("section")||"");
 if(!project_id||!allowed.includes(section)) throw new Error("Invalid project or section");
 const {data:p}=await s.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!p?.is_active||p.role==="viewer") throw new Error("You do not have permission to enter project data");
 const fields:Record<string,string>={};
 for(const [key,value] of fd.entries()){if(key.startsWith("field_") && String(value).trim()) fields[key.slice(6)]=String(value).trim();}
 const title=String(fd.get("title")||"").trim(); if(!title)throw new Error("Record title is required");
 const {error}=await s.from("project_workspace_entries").insert({project_id,section,title,entry_date:String(fd.get("entry_date")||"")||null,status:String(fd.get("status")||"")||null,fields,remarks:String(fd.get("remarks")||"")||null,attachment_url:String(fd.get("attachment_url")||"")||null,created_by:user.id});
 if(error)throw new Error(error.message); revalidatePath("/admin"); revalidatePath("/admin/projects/"+project_id);
}
