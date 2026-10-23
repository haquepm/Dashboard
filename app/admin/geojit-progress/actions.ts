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

function parseCsv(input:string):string[][] {
 const text=input.replace(/^\uFEFF/,"");
 const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){field+='"';i++;}
   else if(c==='"')quoted=false;
   else field+=c;
  } else if(c==='"') quoted=true;
  else if(c===','){row.push(field);field="";}
  else if(c==='\n'){row.push(field.replace(/\r$/,""));if(row.some(x=>x.trim()))rows.push(row);row=[];field="";}
  else field+=c;
 }
 row.push(field.replace(/\r$/,""));if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function num(v:string){if(!v?.trim())return null;const n=Number(v);return Number.isFinite(n)?n:null;}
export async function importGeojitCsv(fd:FormData){
 const {s,user,role}=await requireUser();
 if(!["admin","md","director","general_manager"].includes(role))throw new Error("Only an administrator can import the programme or BOQ.");
 const projectId=String(fd.get("project_id")||"");
 const kind=String(fd.get("kind")||"");
 const file=fd.get("file");
 if(!projectId||!(file instanceof File)||!file.size)throw new Error("Choose a valid CSV file.");
 const {data:project,error:pe}=await s.from("projects").select("id").eq("id",projectId).single();
 if(pe||!project)throw new Error("Project not found.");
 const matrix=parseCsv(await file.text());
 if(matrix.length<2)throw new Error("The CSV has no data rows.");
 const headers=matrix[0].map(x=>x.trim());
 const records=matrix.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||"").trim()])));
 if(kind==="activities"){
  const required=["source_activity_ref","wbs_code","parent_wbs","activity_name","duration_days","baseline_start","baseline_finish"];
  if(required.some(h=>!headers.includes(h)))throw new Error("This is not a valid programme import CSV.");
  const {data:existing}=await s.from("project_activities").select("source_activity_ref").eq("project_id",projectId);
  const seen=new Set((existing||[]).map(x=>x.source_activity_ref));
  const fresh=records.filter(x=>x.source_activity_ref&&!seen.has(x.source_activity_ref));
  const payload=fresh.map(x=>({project_id:projectId,source_activity_ref:x.source_activity_ref,wbs_code:x.wbs_code,activity_name:x.activity_name,duration_days:num(x.duration_days),baseline_start:x.baseline_start||null,baseline_finish:x.baseline_finish||null,source_revision:"Rev 4 label in task name; source file named Rev 3",sort_order:num(x.source_activity_ref)||0,created_by:user.id}));
  for(let i=0;i<payload.length;i+=100){const {error}=await s.from("project_activities").insert(payload.slice(i,i+100));if(error)throw new Error("Programme import stopped: "+error.message);}
  const {data:all}=await s.from("project_activities").select("id,wbs_code,source_activity_ref").eq("project_id",projectId);
  const byWbs=new Map((all||[]).map(x=>[x.wbs_code,x.id]));
  for(const x of records){const id=byWbs.get(x.wbs_code);const parent=byWbs.get(x.parent_wbs);if(id&&parent){const {error}=await s.from("project_activities").update({parent_activity_id:parent}).eq("id",id);if(error)throw new Error("Hierarchy linking stopped: "+error.message);}}
  revalidatePath("/admin/geojit-progress");return;
 }
 if(kind==="boq"){
  const required=["source_row_number","item_code","bill_description","unit","bill_quantity","final_quantity","rate","amount","trade","source_description"];
  if(required.some(h=>!headers.includes(h)))throw new Error("This is not a valid BOQ import CSV.");
  const {data:existing}=await s.from("project_boq_items").select("source_row_number").eq("project_id",projectId);
  const seen=new Set((existing||[]).map(x=>String(x.source_row_number)));
  const fresh=records.filter(x=>x.source_row_number&&!seen.has(String(x.source_row_number)));
  const payload=fresh.map(x=>({project_id:projectId,source_row_number:num(x.source_row_number),item_code:x.item_code||null,bill_description:x.bill_description||"(description not provided)",unit:x.unit||"—",bill_quantity:num(x.bill_quantity),final_quantity:num(x.final_quantity),rate:num(x.rate),amount:num(x.amount),trade:x.trade||null,source_description:x.source_description||null,created_by:user.id}));
  for(let i=0;i<payload.length;i+=100){const {error}=await s.from("project_boq_items").insert(payload.slice(i,i+100));if(error)throw new Error("BOQ import stopped: "+error.message);}
  revalidatePath("/admin/geojit-progress");return;
 }
 throw new Error("Unknown import type.");
}

export async function submitStageProgress(fd:FormData){
 const {s,user,role}=await requireUser();
 if(!["admin","md","director","general_manager","project_manager","site_engineer","qs"].includes(role))throw new Error("You do not have permission to submit stage progress.");
 const project_id=String(fd.get("project_id")||""),package_id=String(fd.get("package_id")||"");
 const completion_percent=Number(fd.get("completion_percent")),work_date=String(fd.get("work_date")||"");
 if(!project_id||!package_id||!work_date||!Number.isFinite(completion_percent)||completion_percent<0||completion_percent>100)throw new Error("Enter a valid completion percentage and work date.");
 const {data:p,error:pe}=await s.from("project_stage_packages").select("id,stage_id").eq("id",package_id).single();
 if(pe||!p)throw new Error("Selected work package was not found.");
 const {data:stage,error:se}=await s.from("project_progress_stages").select("id,project_id").eq("id",p.stage_id).single();
 if(se||!stage||stage.project_id!==project_id)throw new Error("Selected work package does not belong to this project.");
 const {error}=await s.from("project_stage_updates").insert({project_id,package_id,work_date,completion_percent,remarks:String(fd.get("remarks")||""),evidence_path:String(fd.get("evidence_path")||"")||null,status:"submitted",submitted_by:user.id});
 if(error)throw new Error(error.message);revalidatePath("/admin/geojit-progress");
}
export async function reviewStageProgress(fd:FormData){
 const {s,user,role}=await requireUser();
 if(!["admin","md","director","general_manager","project_manager","qs"].includes(role))throw new Error("Progress verification permission required.");
 const id=String(fd.get("id")||""),decision=String(fd.get("decision")||""),note=String(fd.get("note")||"");
 if(!id||!["approved","rejected","returned"].includes(decision))throw new Error("Invalid review action.");
 const {data:u,error:ue}=await s.from("project_stage_updates").select("id,status").eq("id",id).single();
 if(ue||!u||u.status!=="submitted")throw new Error("Only submitted progress updates can be reviewed.");
 const {error}=await s.from("project_stage_updates").update({status:decision,reviewed_by:user.id,reviewed_at:new Date().toISOString(),review_note:note}).eq("id",id).eq("status","submitted");
 if(error)throw new Error(error.message);revalidatePath("/admin/geojit-progress");
}
