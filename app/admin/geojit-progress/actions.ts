"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
async function requireUser(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error("Sign in required");const {data:p}=await s.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!p?.is_active)throw new Error("Active profile required");return {s,user,role:p.role};}
export async function submitDailyQuantity(fd:FormData){
 const {s,user,role}=await requireUser();
 if(!["admin","md","director","general_manager","project_manager","site_engineer","qs"].includes(role))throw new Error("You do not have permission to submit quantities.");
 const project_id=String(fd.get("project_id")||""),boq_item_id=String(fd.get("boq_item_id")||""),activity_id=String(fd.get("activity_id")||"")||null;
 const quantity=Number(fd.get("completed_quantity")),unit=String(fd.get("unit")||"").trim(),work_date=String(fd.get("work_date")||"");
 if(!project_id||!boq_item_id||!work_date||!unit||!Number.isFinite(quantity)||quantity<=0)throw new Error("Enter a valid project, BOQ item, date, unit and quantity.");
 const {data:item,error:lookupError}=await s.from("project_boq_items").select("id,project_id,unit").eq("id",boq_item_id).single();
 if(lookupError||!item||item.project_id!==project_id)throw new Error("Selected BOQ item does not belong to this project.");
 if(item.unit.trim().toLowerCase()!==unit.toLowerCase())throw new Error("Unit must match the BOQ unit ("+item.unit+").");
 if(activity_id){const {data:a,error}=await s.from("project_activities").select("id,project_id").eq("id",activity_id).single();if(error||!a||a.project_id!==project_id)throw new Error("Selected activity does not belong to this project.");}
 const {error}=await s.from("daily_progress_entries").insert({project_id,boq_item_id,activity_id,work_date,completed_quantity:quantity,unit,remarks:String(fd.get("remarks")||""),evidence_path:String(fd.get("evidence_path")||"")||null,status:"submitted",submitted_by:user.id});
 if(error)throw new Error(error.message);revalidatePath("/admin/geojit-progress");
}
export async function reviewDailyQuantity(fd:FormData){
 const {s,user,role}=await requireUser();if(!["admin","md","director","general_manager","project_manager","qs"].includes(role))throw new Error("QS review permission required.");
 const id=String(fd.get("id")||""),decision=String(fd.get("decision")||""),note=String(fd.get("note")||"");
 if(!id||!["approved","rejected","returned"].includes(decision))throw new Error("Invalid review action.");
 const {data:entry,error:readError}=await s.from("daily_progress_entries").select("id,status").eq("id",id).single();
 if(readError||!entry||entry.status!=="submitted")throw new Error("Only submitted entries can be reviewed.");
 const {error}=await s.from("daily_progress_entries").update({status:decision,reviewed_by:user.id,reviewed_at:new Date().toISOString(),review_note:note}).eq("id",id).eq("status","submitted");
 if(error)throw new Error(error.message);revalidatePath("/admin/geojit-progress");
}
