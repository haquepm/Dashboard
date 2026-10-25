"use client";
import { use, useState } from "react";
import { saveWorkspaceEntry } from "./actions";
const sections = [
 ["overview","Project Profile",["Project description","Project image URL","Project start date","Original completion date","Revised completion date","Project manager","Project status"]],
 ["progress","Progress & Schedule",["Reporting date","Project stage","Work package","Planned progress (%)","Actual progress (%)","SPI (entered)","CPI (entered)","Schedule position","Progress remarks","Progress photo URL"]],
 ["stages","Project Stages",["Stage name","Planned start date","Planned finish date","Actual start date","Actual finish date","Stage status","Responsible person","Remarks"]],
 ["work_packages","Work Packages",["Package name","BOQ / package reference","Responsible contractor","Planned start date","Target completion date","Actual completion date","Package status","Remarks"]],
 ["finance","Financial Overview",["Reporting date","Approved budget (INR)","Contract value (INR)","Actual cost to date (INR)","Receivables (INR)","Payables (INR)","Cash inflow (INR)","Cash outflow (INR)","Cost category","Cost category amount (INR)","Financial remarks"]],
 ["milestones","Operations & Resources",["Reporting date","Trade / manpower category","Total workforce","Present workforce","Attendance (%) entered","Material name","Unit","Quantity consumed","Planned quantity","Equipment name","Total equipment","Equipment utilised","Utilisation (%) entered","PO number","Vendor","PO quantity","Received quantity","In-transit quantity","Pending quantity","Cancelled quantity","Expected delivery date","Procurement status"]],
 ["issues","Quality, Safety & Compliance",["Reporting date","Record type (NCR / Incident / Inspection)","Reference number","Description","Location / work package","Date raised / incident date","Incident category","LTI (Yes / No)","Responsible person","Corrective action","Closure due date","Closure date","Status","Inspection authority","Inspection result","Compliance status","Supporting document URL"]],
 ["responsibilities","Upcoming Activities & Alerts",["Record type (Milestone / Activity / Alert)","Title","Description","Project stage / work package","Planned date","Revised date","Actual completion date","Start date","Due date","Responsible person","Priority","Status","Alert category","Approval required (Yes / No)","Remarks"]],
 ["documents","Documents & Photographs",["Document title","Document category","Document reference number","Document date","Related work package","File URL","Uploaded by","Remarks"]]
] as const;
export default function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
 const {id}=use(params); const [section,setSection]=useState("overview"); const [saving,setSaving]=useState(false);
 const active=sections.find(s=>s[0]===section)!;
 async function submit(formData:FormData){setSaving(true);try{await saveWorkspaceEntry(formData);window.location.reload();}finally{setSaving(false);}}
 return <main className="admin-main" style={{maxWidth:1500,margin:"0 auto",padding:30}}>
 <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><a href="/admin">← Consolidated dashboard</a><a className="pill" href={"/admin/rfi?project="+id}>Request for Inspection →</a></div><header className="admin-header" style={{marginTop:20}}><div><p className="eyebrow">PROJECT WORKSPACE</p><h1>Project Data Entry</h1><p className="muted">Enter each report or update as a separate record. Values are stored exactly as entered.</p></div></header>
 <nav className="workspace-tabs">{sections.map(([key,label])=><button type="button" key={key} className={section===key?"active":""} onClick={()=>setSection(key)}>{label}</button>)}</nav>
 <section className="admin-panel"><h2>{active[1]} — Direct Entry</h2><p className="muted">Complete relevant fields. Leave unavailable information blank. No derived figures are calculated.</p>
 <form action={submit} className="form-grid"><input type="hidden" name="project_id" value={id}/><input type="hidden" name="section" value={section}/>
 <label>Record title<input name="title" required placeholder="Enter a clear record title"/></label><label>Reporting / record date<input name="entry_date" type="date"/></label><label>Status<input name="status" placeholder="Enter status"/></label><label>Supporting attachment URL<input name="attachment_url" type="url" placeholder="Optional document or image link"/></label>
 <div className="span-two"><p className="eyebrow">Section-specific information</p><div className="workspace-fields">{active[2].map((label,i)=><label className="workspace-field" key={label}>{label}<input name={"field_"+label} placeholder={"Enter "+label}/></label>)}</div></div>
 <label className="span-two">Additional remarks<textarea name="remarks" rows={3}/></label><div className="span-two"><button className="primary" disabled={saving}>{saving?"Saving…":"Save entry"}</button></div></form></section>
 <section className="admin-panel"><h2>Entry guidance</h2><p className="muted">Create separate records for each reporting period, financial update, milestone, manpower report, material record, equipment report, NCR, safety incident or document. Earlier submissions remain available in the consolidated records.</p></section></main>;
}
