import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRfi } from "./actions";
import { signOut } from "../../login/actions";
export const dynamic="force-dynamic";
export default async function RfiPage(){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await s.from("profiles").select("full_name,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active)redirect("/login");
 const [{data:projects},{data:rfis}]=await Promise.all([s.from("projects").select("id,project_code,name").eq("is_active",true).order("name"),s.from("rfis").select("id,project_id,rfi_number,dpr_date,submitted_at,requested_inspection_at,inspection_type,work_package,activity_description,location,status,projects(name,project_code)").order("submitted_at",{ascending:false}).limit(300)]);
 const labels:Record<string,string>={draft:"Draft",submitted:"Submitted",scheduled:"Scheduled",inspected:"Inspected",approved:"Approved",rejected:"Rejected",rectification_required:"Rectification Required",reinspection_requested:"Reinspection Requested",closed:"Closed",cancelled:"Cancelled"};
 return <main className="admin-shell"><aside className="admin-side"><div className="brand-mark">C</div><h2>CRESCENT</h2><small>MANAGEMENT BACKEND</small><nav><a href="/admin">MD Dashboard</a><a href="/admin/rfi">RFI Management</a></nav><form action={signOut}><button className="secondary">Sign out</button></form></aside><section className="admin-main">
 <header className="admin-header"><div><p className="eyebrow">PROJECT QUALITY CONTROL</p><h1>Request for Inspection</h1><p className="muted">Register, schedule, inspect, rectify and close project inspection requests.</p></div><a className="pill" href="/admin">Back to MD Dashboard</a></header>
 <div className="rfi-stats"><article><b>{rfis?.length||0}</b><span>Total RFIs</span></article><article><b>{rfis?.filter(x=>["submitted","scheduled","reinspection_requested"].includes(x.status)).length||0}</b><span>Awaiting inspection</span></article><article><b>{rfis?.filter(x=>x.status==="approved"||x.status==="closed").length||0}</b><span>Approved / Closed</span></article><article><b>{rfis?.filter(x=>["rejected","rectification_required"].includes(x.status)).length||0}</b><span>Action required</span></article></div>
 <section className="admin-panel"><h2>Submit new RFI</h2><p className="muted">Submit one request for each inspection activity. Link the report to the relevant DPR date.</p>
 <form action={createRfi} className="form-grid">
 <label>Project<select name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{(projects||[]).map(p=><option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}</select></label>
 <label>RFI number<input name="rfi_number" required placeholder="e.g. CC-001-RFI-001"/></label>
 <label>DPR date<input name="dpr_date" type="date"/></label><label>Requested inspection date & time<input name="requested_inspection_at" type="datetime-local"/></label>
 <label>Inspection type<select name="inspection_type" required defaultValue=""><option value="" disabled>Select type</option>{["Civil","Structural","Reinforcement / BBS","Formwork","Concrete pour","Blockwork","Plastering","Waterproofing","MEP","Electrical","Plumbing","HVAC","Fire fighting","Finishing","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Work package<input name="work_package" placeholder="Work package / BOQ item"/></label>
 <label className="span-two">Activity ready for inspection<input name="activity_description" required placeholder="Describe the completed work to be inspected"/></label>
 <label>Location<input name="location" placeholder="Block / floor / grid / area"/></label><label>Inspection area<input name="inspection_area" placeholder="Exact inspection area"/></label>
 <label>Drawing reference<input name="drawing_reference" placeholder="Drawing number and revision"/></label><label>Specification reference<input name="specification_reference" placeholder="Specification / clause"/></label>
 <label>Assigned inspector<input name="assigned_inspector" placeholder="Consultant / client inspector"/></label><label>Consultant representative<input name="consultant_representative" placeholder="Name, if known"/></label>
 <div className="span-two"><button className="primary">Submit RFI</button></div></form></section>
 <section className="admin-panel"><h2>RFI Register & Tracker</h2><div className="table-wrap"><table><thead><tr><th>RFI No.</th><th>Project</th><th>Activity / Location</th><th>Requested inspection</th><th>Type</th><th>Status</th><th>Open</th></tr></thead><tbody>{(rfis||[]).map(r=><tr key={r.id}><td><strong>{r.rfi_number}</strong><small>{r.dpr_date?"DPR "+r.dpr_date:""}</small></td><td>{(r.projects as any)?.project_code} · {(r.projects as any)?.name}</td><td>{r.activity_description}<small>{r.location||"Location not entered"}</small></td><td>{r.requested_inspection_at?new Date(r.requested_inspection_at).toLocaleString("en-IN"):"Not scheduled"}</td><td>{r.inspection_type}</td><td><span className={"rfi-status "+r.status}>{labels[r.status]||r.status}</span></td><td><a href={"/admin/rfi/"+r.id}>View / Update →</a></td></tr>)}{!rfis?.length&&<tr><td colSpan={7}>No RFIs submitted yet.</td></tr>}</tbody></table></div></section>
 </section></main>;
}
