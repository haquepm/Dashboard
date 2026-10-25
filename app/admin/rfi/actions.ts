"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
async function actor(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error("Sign in required");const {data:p}=await s.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!p?.is_active||p.role==="viewer")throw new Error("You do not have permission to manage RFIs");return {s,user};}
export async function createRfi(fd:FormData){
 const {s,user}=await actor();const project_id=String(fd.get("project_id")||"");const rfi_number=String(fd.get("rfi_number")||"").trim();if(!project_id||!rfi_number)throw new Error("Project and RFI number are required");
 const payload={project_id,rfi_number,dpr_date:String(fd.get("dpr_date")||"")||null,requested_inspection_at:String(fd.get("requested_inspection_at")||"")||null,inspection_type:String(fd.get("inspection_type")||"").trim(),work_package:String(fd.get("work_package")||"").trim()||null,activity_description:String(fd.get("activity_description")||"").trim(),location:String(fd.get("location")||"").trim()||null,drawing_reference:String(fd.get("drawing_reference")||"").trim()||null,specification_reference:String(fd.get("specification_reference")||"").trim()||null,inspection_area:String(fd.get("inspection_area")||"").trim()||null,submitted_by:user.id,assigned_inspector:String(fd.get("assigned_inspector")||"").trim()||null,consultant_representative:String(fd.get("consultant_representative")||"").trim()||null,status:"submitted"};
 if(!payload.inspection_type||!payload.activity_description)throw new Error("Inspection type and activity description are required");
 const {data,error}=await s.from("rfis").insert(payload).select("id").single();if(error)throw new Error(error.message);
 await s.from("rfi_status_history").insert({rfi_id:data.id,from_status:null,to_status:"submitted",note:"RFI submitted",changed_by:user.id});
 revalidatePath("/admin/rfi");revalidatePath("/admin");redirect("/admin/rfi/"+data.id);
}
export async function recordInspection(fd:FormData){
 const {s,user}=await actor();const rfi_id=String(fd.get("rfi_id")||"");const result=String(fd.get("result")||"");if(!["approved","rejected","rectification_required"].includes(result))throw new Error("Select a valid inspection result");
 const {data:r}=await s.from("rfis").select("id,project_id,status").eq("id",rfi_id).single();if(!r)throw new Error("RFI not found");
 const {error}=await s.from("rfi_inspections").insert({rfi_id,inspection_at:String(fd.get("inspection_at")||"")||null,inspected_by:String(fd.get("inspected_by")||"").trim()||null,consultant_representative:String(fd.get("consultant_representative")||"").trim()||null,result,observations:String(fd.get("observations")||"").trim()||null,corrective_action:String(fd.get("corrective_action")||"").trim()||null,reinspection_required:fd.get("reinspection_required")==="on",next_inspection_at:String(fd.get("next_inspection_at")||"")||null,attachment_url:String(fd.get("attachment_url")||"").trim()||null,recorded_by:user.id});
 if(error)throw new Error(error.message);
 const next=result==="approved"?"approved":result==="rejected"?"rejected":"rectification_required";
 const {error:updateError}=await s.from("rfis").update({status:next,latest_result:result,latest_observation:String(fd.get("observations")||"").trim()||null,closed_at:result==="approved"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",rfi_id);
 if(updateError)throw new Error(updateError.message);
 await s.from("rfi_status_history").insert({rfi_id,from_status:r.status,to_status:next,note:String(fd.get("observations")||"Inspection result recorded"),changed_by:user.id});
 revalidatePath("/admin/rfi");revalidatePath("/admin/rfi/"+rfi_id);revalidatePath("/admin");revalidatePath("/admin/projects/"+r.project_id);
}
export async function changeRfiStatus(fd:FormData){
 const {s,user}=await actor();const rfi_id=String(fd.get("rfi_id")||"");const next=String(fd.get("status")||"");const allowed=["scheduled","reinspection_requested","closed","cancelled"];if(!allowed.includes(next))throw new Error("Invalid status");
 const {data:r}=await s.from("rfis").select("id,project_id,status").eq("id",rfi_id).single();if(!r)throw new Error("RFI not found");
 const {error}=await s.from("rfis").update({status:next,requested_inspection_at:String(fd.get("requested_inspection_at")||"")||undefined,updated_at:new Date().toISOString(),closed_at:next==="closed"?new Date().toISOString():null}).eq("id",rfi_id);if(error)throw new Error(error.message);
 await s.from("rfi_status_history").insert({rfi_id,from_status:r.status,to_status:next,note:String(fd.get("note")||"Status updated"),changed_by:user.id});
 revalidatePath("/admin/rfi");revalidatePath("/admin/rfi/"+rfi_id);revalidatePath("/admin");
}
