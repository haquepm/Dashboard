import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitDailyQuantity, reviewDailyQuantity, importGeojitCsv } from "./actions";
export const dynamic = "force-dynamic";
export default async function GeojitProgressPage() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login");
 const { data: profile } = await supabase.from("profiles").select("full_name,role,is_active").eq("id",user.id).maybeSingle();
 if (!profile?.is_active) redirect("/login");
 const { data: project } = await supabase.from("projects").select("id,name,project_code").eq("project_code","CC-001").maybeSingle();
 if (!project) return <main className="admin-main"><h1>Geojit Quantity Progress</h1><p>Project CC-001 was not found.</p></main>;
 const [{data: activities},{data: boq},{data: entries}] = await Promise.all([
  supabase.from("project_activities").select("id,wbs_code,activity_name,baseline_start,baseline_finish").eq("project_id",project.id).eq("is_active",true).order("sort_order"),
  supabase.from("project_boq_items").select("id,item_code,bill_description,unit,bill_quantity,final_quantity,rate").eq("project_id",project.id).order("item_code"),
  supabase.from("daily_progress_entries").select("id,work_date,completed_quantity,unit,status,remarks,review_note,boq_item_id,submitted_by").eq("project_id",project.id).order("work_date",{ascending:false}).limit(100)
 ]);
 const canSubmit=["admin","md","director","general_manager","project_manager","site_engineer","qs"].includes(profile.role);
 const canReview=["admin","md","director","general_manager","project_manager","qs"].includes(profile.role);
 const boqMap = new Map((boq||[]).map(x=>[x.id,x]));
 return <main className="admin-main" style={{maxWidth:1500,margin:"0 auto",padding:32}}>
  <a href="/admin">← Back to Management Backend</a>
  <header className="admin-header"><div><p className="eyebrow">GEOJIT IT TOWER / DAILY QUANTITY CONTROL</p><h1>Quantity-based Progress</h1><p className="muted">Daily site measurement submissions · QS verification · Approved quantity drives actual progress</p></div><span className="pill">{project.project_code}</span></header>
  <div className="notice">Progress denominator: Final Quantity. Original Bill Quantity remains available for comparison. Only QS-approved daily quantities count toward actual progress.</div>
  <section className="stat-grid"><article><span>Programme activities imported</span><b>{activities?.length||0}</b></article><article><span>BOQ items imported</span><b>{boq?.length||0}</b></article><article><span>Pending QS review</span><b>{entries?.filter(x=>x.status==="submitted").length||0}</b></article></section>
  <section className="admin-panel"><h2>Import programme & BOQ</h2><p className="muted">Administrator-only import. Upload the prepared CSV files. Existing source rows are skipped on repeat imports.</p><div className="form-grid"><form action={importGeojitCsv}><input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="kind" value="activities"/><label>Rev 4 programme CSV<input type="file" name="file" accept=".csv,text/csv" required/></label><button className="primary">Import programme activities</button></form><form action={importGeojitCsv}><input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="kind" value="boq"/><label>Pricing Bill BOQ CSV<input type="file" name="file" accept=".csv,text/csv" required/></label><button className="primary">Import BOQ items</button></form></div></section>
  <section className="admin-panel"><h2>Daily completed quantity</h2><p className="muted">Enter actual measured quantity for the work date. Multiple submissions per BOQ item and day are supported.</p>
  {canSubmit&&boq?.length ? <form action={submitDailyQuantity} className="form-grid">
   <input type="hidden" name="project_id" value={project.id}/>
   <label>BOQ item<select name="boq_item_id" required>{boq.map(b=><option key={b.id} value={b.id}>{b.item_code||"No code"} · {b.bill_description} ({b.unit})</option>)}</select></label>
   <label>Programme activity (optional)<select name="activity_id"><option value="">Select activity if mapped</option>{activities?.map(a=><option key={a.id} value={a.id}>{a.wbs_code? a.wbs_code+" · ":""}{a.activity_name}</option>)}</select></label>
   <label>Work date<input type="date" name="work_date" required/></label>
   <label>Completed quantity<input type="number" name="completed_quantity" min="0.0001" step="0.0001" required/></label>
   <label>Unit<input name="unit" required placeholder="Same as BOQ unit"/></label>
   <label>Evidence file path (optional)<input name="evidence_path" placeholder="Storage path / attachment reference"/></label>
   <label className="span-two">Remarks<textarea name="remarks" rows={2}/></label>
   <button className="primary">Submit for QS verification</button>
  </form> : <p className="muted">BOQ items are not imported yet. Import the approved Pricing Bill before daily quantity entry can begin.</p>}
  </section>
  <section className="admin-panel"><h2>Daily submissions & QS verification</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>BOQ item</th><th>Quantity</th><th>Status</th><th>Review / remarks</th></tr></thead><tbody>
  {entries?.map(e=>{const b=boqMap.get(e.boq_item_id);return <tr key={e.id}><td>{e.work_date}</td><td>{b?.item_code||"—"} · {b?.bill_description||"BOQ item"}</td><td>{Number(e.completed_quantity).toLocaleString("en-IN")} {e.unit}</td><td><span className="pill">{e.status}</span></td><td>{e.status==="submitted"&&canReview?<form action={reviewDailyQuantity} className="inline-review"><input type="hidden" name="id" value={e.id}/><input name="note" placeholder="QS review note"/><button name="decision" value="approved">Approve</button><button name="decision" value="rejected" className="reject">Reject</button><button name="decision" value="returned" className="secondary">Return</button></form>:e.review_note||e.remarks||"—"}</td></tr>})}
  {!entries?.length&&<tr><td colSpan={5}>No daily quantity entries recorded.</td></tr>}
  </tbody></table></div></section>
  <section className="admin-panel"><h2>BOQ quantity reference</h2><div className="table-wrap"><table><thead><tr><th>Item code</th><th>Description</th><th>Unit</th><th>Bill quantity</th><th>Final quantity</th><th>Rate</th></tr></thead><tbody>{boq?.map(b=><tr key={b.id}><td>{b.item_code||"—"}</td><td>{b.bill_description}</td><td>{b.unit}</td><td>{b.bill_quantity??"—"}</td><td>{b.final_quantity??"—"}</td><td>{b.rate??"—"}</td></tr>)}{!boq?.length&&<tr><td colSpan={6}>BOQ not imported yet.</td></tr>}</tbody></table></div></section>
 </main>;
}
