import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitStageProgress, reviewStageProgress } from "./actions";
export const dynamic = "force-dynamic";
export default async function GeojitProgressPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active) redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name,project_code").eq("project_code","CC-001").maybeSingle();
 if(!project) return <main className="admin-main"><h1>Stage-wise Progress</h1><p>Project CC-001 was not found.</p></main>;
 const [{data:stages},{data:updates}] = await Promise.all([
  supabase.from("project_progress_stages").select("id,stage_code,stage_name,sort_order,weight_percent,project_stage_packages(id,package_name,sort_order)").eq("project_id",project.id).eq("is_active",true).order("sort_order"),
  supabase.from("project_stage_updates").select("id,package_id,work_date,completion_percent,status,remarks,review_note,created_at").eq("project_id",project.id).order("created_at",{ascending:false}).limit(500)
 ]);
 const canSubmit=["admin","md","director","general_manager","project_manager","site_engineer","qs"].includes(profile.role);
 const canReview=["admin","md","director","general_manager","project_manager","qs"].includes(profile.role);
 const latest=new Map<string,any>();
 for(const u of updates||[]) if(!latest.has(u.package_id)) latest.set(u.package_id,u);
 const stageRows=(stages||[]).map(s=>{const pkgs=(s.project_stage_packages||[]).sort((a:any,b:any)=>a.sort_order-b.sort_order);const vals=pkgs.map((p:any)=>latest.get(p.id)).filter((u:any)=>u?.status==="approved").map((u:any)=>Number(u.completion_percent));return {...s,pkgs,progress:vals.length?Math.round(vals.reduce((a:number,b:number)=>a+b,0)/pkgs.length):0,approvedCount:vals.length};});
 const weightedReady=(stages||[]).length>0&&(stages||[]).every(s=>s.weight_percent!==null);
 const overall=weightedReady?Math.round(stageRows.reduce((a,s)=>a+s.progress*Number(s.weight_percent)/100,0)):null;
 const pending=(updates||[]).filter(u=>u.status==="submitted");
 return <main className="admin-main" style={{maxWidth:1500,margin:"0 auto",padding:32}}>
 <a href="/admin">← Back to Management Backend</a>
 <header className="admin-header"><div><p className="eyebrow">GEOJIT IT TOWER / CONSTRUCTION PROGRESS</p><h1>Stage-based Progress</h1><p className="muted">Programme-derived stages · Package-wise percentage reporting · QS and Project Manager verification</p></div><span className="pill">{project.project_code}</span></header>
 <section className="stat-grid"><article><span>Construction stages</span><b>{stageRows.length}</b></article><article><span>Work packages</span><b>{stageRows.reduce((n,s)=>n+s.pkgs.length,0)}</b></article><article><span>Pending review</span><b>{pending.length}</b></article><article><span>Overall approved progress</span><b>{overall===null?"Weight pending":overall+"%"}</b></article></section>
 <div className="notice">Progress is calculated from the latest QS/management-approved percentage for each work package. Stage progress is the average of its packages. Overall project progress will be shown after management assigns stage weights totalling 100%; no weights have been assumed.</div>
 <section className="admin-panel"><h2>Stage-wise progress</h2><div className="form-grid">
 {stageRows.map(s=><article key={s.id} className="stage-card" style={{border:"1px solid var(--border,#ddd)",borderRadius:12,padding:16,gridColumn:"span 2"}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><span className="eyebrow">{s.stage_code}</span><h3>{s.stage_name}</h3></div><strong>{s.progress}%</strong></div>
 <div style={{height:8,background:"#e5e7eb",borderRadius:10,overflow:"hidden",margin:"10px 0"}}><div style={{height:8,width:s.progress+"%",background:"#16865b"}}/></div>
 <small className="muted">{s.approvedCount} of {s.pkgs.length} packages have approved progress · Stage weight: {s.weight_percent===null?"Not assigned":s.weight_percent+"%"}</small>
 <div style={{marginTop:14,overflowX:"auto"}}>
 <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
 <thead><tr style={{textAlign:"left",borderBottom:"1px solid var(--border,#ddd)"}}><th style={{padding:"10px 8px"}}>Work package</th><th style={{padding:"10px 8px"}}>Latest progress</th><th style={{padding:"10px 8px"}}>Status</th><th style={{padding:"10px 8px"}}>Update</th></tr></thead>
 <tbody>
 {s.pkgs.map((p:any)=>{const u=latest.get(p.id);const isSubmitted=u?.status==="submitted";return <tr key={p.id} style={{borderBottom:"1px solid var(--border,#ddd)"}}>
 <td style={{padding:"12px 8px",fontWeight:600}}>{p.package_name}</td>
 <td style={{padding:"12px 8px",whiteSpace:"nowrap"}}>{u?Number(u.completion_percent)+"%":"—"}</td>
 <td style={{padding:"12px 8px",whiteSpace:"nowrap"}}><span className="pill">{isSubmitted?"Submitted":u?.status==="approved"?"Approved":u?.status==="rejected"?"Rejected":u?.status==="returned"?"Returned":"Not submitted"}</span></td>
 <td style={{padding:"8px"}}>
 {canSubmit?(isSubmitted?<span style={{color:"#16865b",fontWeight:600}}>Update submitted · Awaiting verification</span>:<form action={submitStageProgress} className="inline-review" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
 <input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="package_id" value={p.id}/>
 <input type="number" name="completion_percent" min="0" max="100" step="0.01" required placeholder="Completion %" style={{width:130}}/>
 <input type="date" name="work_date" required/>
 <input name="remarks" placeholder="Remarks (optional)"/>
 <input name="evidence_path" placeholder="Evidence reference (optional)"/>
 <button className="primary">Submit</button></form>):"—"}
 </td></tr>})}
 </tbody></table></div>
 </article>)}
 </div></section>
 <section className="admin-panel"><h2>Pending verification</h2><div className="table-wrap"><table><thead><tr><th>Submitted</th><th>Work package</th><th>Completion</th><th>Remarks</th><th>Review</th></tr></thead><tbody>
 {pending.map(u=>{const stage=stageRows.find(s=>s.pkgs.some((p:any)=>p.id===u.package_id));const pkg=stage?.pkgs.find((p:any)=>p.id===u.package_id);return <tr key={u.id}><td>{u.work_date}</td><td>{stage?.stage_name} / {pkg?.package_name}</td><td>{u.completion_percent}%</td><td>{u.remarks||"—"}</td><td>{canReview?<form action={reviewStageProgress} className="inline-review"><input type="hidden" name="id" value={u.id}/><input name="note" placeholder="Review note"/><button name="decision" value="approved">Approve</button><button name="decision" value="rejected" className="reject">Reject</button><button name="decision" value="returned" className="secondary">Return</button></form>:"Awaiting review"}</td></tr>})}
 {!pending.length&&<tr><td colSpan={5}>No pending progress updates.</td></tr>}</tbody></table></div></section>
 </main>;
}
