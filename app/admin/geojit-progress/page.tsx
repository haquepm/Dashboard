import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function LegacyProgressRedirect(){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const {data:project}=await s.from("projects").select("id").eq("project_code","CC-001").maybeSingle();
 if(project)redirect("/admin/projects/"+project.id+"?section=progress");
 redirect("/admin");
}