import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitValuationEntry, reviewValuationEntry } from "./actions";
export const dynamic="force-dynamic";
export default async function GeojitProgressPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active)redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name,project_code,approved_budget,contract_value").eq("project_code","CC-001").maybeSingle();
 if(!project)return <main className="admin-main"><h1>Geojit Valuation Progress</h1><p>Project CC-001 not found.</p></main>;
 const [{data:boq},{data:activities},{data:stages},{data:entries}]=await Promise.all([
  supabase.from("project_boq_items").select("id,item_code,bill_description,unit,final_quantity,rate,amount,trade").eq("project_id",project.id).order("source_row_number"),
  supabase.from("project_activities").select("id,wbs_code,activity_name,sort_order").eq("project_id",project.id).eq("is_active",true).order("sort_order"),
  supabase.from("project_progress_stages").select("id,stage_name,stage_code,project_stage_packages(id,package_name)").eq("project_id",project.id).eq("is_active",true).order("sort_order"),
  supabase.from("valuation_entries").select("id,work_date,location_label,activity_id,package_id,remarks,status,review_note,created_at,valuation_entry_items(id,completed_quantity,rate_snapshot,completed_value,boq_item_id,project_boq_items(item_code,bill_description,unit))").eq("project_id",project.id).order("created_at",{ascending:false}).limit(300)
 ]);
 const lines=(entries||[]) as any[];
 const approved=lines.filter(e=>e.status==="approved");
 const value=(e:any)=>(e.valuation_entry_items||[]).reduce((n:number,x:any)=>n+Number(x.completed_value||0),0);
 const approvedValue=approved.reduce((n:number,e:any)=>n+value(e),0);
 const budget=Number(project.approved_budget||0);
 const progress=budget>0?approvedValue/budget*100:0;
 const pending=lines.filter(e=>["submitted","qs_verified"].includes(e.status));
 const canSubmit=["admin","md","director","general_manager","project_manager","site_engineer","qs"].includes(profile.role);
 const canQs=profile.role==="qs";
 const canApprove=["admin","md","director","general_manager","project_manager"].includes(profile.role);
 const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
 return <main className="admin-main" style={{maxWidth:1500,margin:"0 auto",padding:32}}>
 <a href="/admin">← Back to Management Backend</a>
 <header className="admin-header"><div><p className="eyebrow">GEOJIT IT TOWER / VALUATION-BASED PROGRESS</p><h1>Work Valuation & Progress</h1><p className="muted">Record completed BOQ work once. Approved valuation automatically updates project progress.</p></div><span className="pill">{project.project_code}</span></header>
 <section className="stat-grid">
 <article><span>Approved budget (progress denominator)</span><b>{money(budget)}</b></article>
 <article><span>Approved completed valuation</span><b>{money(approvedValue)}</b></article>
 <article><span>Overall approved progress</span><b>{progress.toFixed(2)}%</b></article>
 <article><span>Pending verification</span><b>{pending.length}</b></article>
 </section>
 <section className="admin-panel">
 <h2>Project progress</h2>
 <div style={{height:14,background:"#e5e7eb",borderRadius:20,overflow:"hidden",margin:"12px 0"}}><div style={{height:14,width:Math.min(progress,100)+"%",background:"#16865b",borderRadius:20}}/></div>
 <p><strong>{money(approvedValue)}</strong> approved out of <strong>{money(budget)}</strong> approved budget · Balance to budget: <strong>{money(Math.max(0,budget-approvedValue))}</strong></p>
 <p className="muted">Only entries approved by the Project Manager or management count towards progress. Valuation is quantity × BOQ rate. The denominator is the approved budget, as instructed.</p>
 </section>
 {canSubmit&&<section className="admin-panel">
 <h2>Quick valuation entry</h2><p className="muted">Select a BOQ item and enter the quantity completed. Rate and valuation are calculated automatically after selection/submission.</p>
 <form action={submitValuationEntry} className="form-grid">
 <input type="hidden" name="project_id" value={project.id}/>
 <label>Work date<input type="date" name="work_date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
 <label>Floor / location<input name="location_label" placeholder="e.g. Basement / P1 / First Floor"/></label>
 <label style={{gridColumn:"span 2"}}>BOQ item<select name="boq_item_id" required defaultValue=""><option value="" disabled>Select BOQ item by code or description</option>{(boq||[]).map((b:any)=><option key={b.id} value={b.id}>{b.item_code||"No code"} · {b.bill_description} · {b.unit} · Rate {b.rate===null?"Not set":money(Number(b.rate))}</option>)}</select></label>
 <label>Completed quantity<input type="number" name="completed_quantity" min="0.0001" step="0.0001" required placeholder="Enter quantity"/></label>
 <label>Programme activity (optional)<select name="activity_id" defaultValue=""><option value="">Select activity</option>{(activities||[]).map((a:any)=><option key={a.id} value={a.id}>{a.wbs_code||"—"} · {a.activity_name}</option>)}</select></label>
 <label>Stage / work package (optional)<select name="package_id" defaultValue=""><option value="">Select package</option>{(stages||[]).map((s:any)=><optgroup key={s.id} label={s.stage_name}>{(s.project_stage_packages||[]).map((k:any)=><option key={k.id} value={k.id}>{k.package_name}</option>)}</optgroup>)}</select></label>
 <label style={{gridColumn:"span 2"}}>Remarks (optional)<input name="remarks" placeholder="Short work description or clarification"/></label>
 <label style={{gridColumn:"span 2"}}>Photo / evidence reference (optional)<input name="evidence_path" placeholder="Paste a file link or evidence reference"/></label>
 <div style={{gridColumn:"span 2"}}><button className="primary">Submit valuation for verification</button></div>
 </form>
 </section>}
 <section className="admin-panel"><h2>Pending verification</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Location</th><th>BOQ work</th><th>Quantity</th><th>Value</th><th>Status / action</th></tr></thead><tbody>
 {pending.map((e:any)=><tr key={e.id}><td>{e.work_date}</td><td>{e.location_label||"—"}</td><td>{(e.valuation_entry_items||[]).map((x:any)=><div key={x.id}>{x.project_boq_items?.item_code||""} {x.project_boq_items?.bill_description}</div>)}</td><td>{(e.valuation_entry_items||[]).map((x:any)=><div key={x.id}>{x.completed_quantity} {x.project_boq_items?.unit}</div>)}</td><td>{money(value(e))}</td><td><div>{e.status==="qs_verified"?"QS verified · Awaiting PM approval":"Awaiting QS verification"}</div>{e.status==="submitted"&&canQs&&<form action={reviewValuationEntry} className="inline-review"><input type="hidden" name="id" value={e.id}/><input name="note" placeholder="Review note"/><button name="decision" value="qs_verified">Verify</button><button name="decision" value="returned" className="secondary">Return</button><button name="decision" value="rejected" className="reject">Reject</button></form>}{e.status==="qs_verified"&&canApprove&&<form action={reviewValuationEntry} className="inline-review"><input type="hidden" name="id" value={e.id}/><input name="note" placeholder="Approval note"/><button name="decision" value="approved">Approve</button><button name="decision" value="returned" className="secondary">Return</button><button name="decision" value="rejected" className="reject">Reject</button></form>}</td></tr>)}
 {!pending.length&&<tr><td colSpan={6}>No pending valuation entries.</td></tr>}</tbody></table></div></section>
 <section className="admin-panel"><h2>Recent valuation register</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Location</th><th>BOQ item</th><th>Quantity</th><th>Rate</th><th>Valuation</th><th>Status</th></tr></thead><tbody>
 {lines.slice(0,100).map((e:any)=>(e.valuation_entry_items||[]).map((x:any)=><tr key={x.id}><td>{e.work_date}</td><td>{e.location_label||"—"}</td><td>{x.project_boq_items?.item_code||"—"} · {x.project_boq_items?.bill_description}</td><td>{x.completed_quantity} {x.project_boq_items?.unit}</td><td>{money(Number(x.rate_snapshot))}</td><td>{money(Number(x.completed_value))}</td><td>{e.status.replace("_"," ")}</td></tr>))}
 {!lines.length&&<tr><td colSpan={7}>No valuation entries yet.</td></tr>}</tbody></table></div></section>
 <section className="admin-panel"><h2>Stage and floor allocation</h2><p className="muted">BOQ valuation is captured now. Stage/floor breakdown will become accurate as programme activities and work packages are mapped to BOQ items; no automatic or guessed mappings have been created.</p></section>
 </main>;
}
