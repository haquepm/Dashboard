import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveWorkspaceEntry } from "./actions";
export const dynamic="force-dynamic";
const tabs=[["overview","Project Overview"],["progress","Progress Entry"],["stages","Stages"],["work_packages","Work Packages"],["finance","Finance"],["milestones","Milestones"],["issues","Issues & Delays"],["responsibilities","Responsibilities"],["documents","Documents"]] as const;
export default async function ProjectWorkspace({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{section?:string}>}){
 const {id}=await params;const sp=await searchParams;const section=tabs.some(t=>t[0]===sp.section)?(sp.section as string):"overview";
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const {data:p}=await s.from("profiles").select("is_active,role").eq("id",user.id).maybeSingle();if(!p?.is_active)redirect("/login");
 const {data:project}=await s.from("projects").select("id,project_code,name,client_name,location,status").eq("id",id).maybeSingle();if(!project)notFound();
 const {data:entries}=await s.from("project_workspace_entries").select("id,title,entry_date,status,fields,remarks,attachment_url").eq("project_id",id).eq("section",section).order("created_at",{ascending:false}).limit(100);
 const title=tabs.find(t=>t[0]===section)?.[1]||"Project Overview";
 return <main className="admin-main" style={{maxWidth:1500,margin:"0 auto",padding:30}}>
 <a href="/admin">← Consolidated dashboard</a><header className="admin-header" style={{marginTop:20}}><div><p className="eyebrow">{project.project_code} / PROJECT WORKSPACE</p><h1>{project.name}</h1><p className="muted">{project.client_name||"Client not entered"} · {project.location||"Location not entered"}</p></div><span className="pill">{project.status}</span></header>
 <nav className="workspace-tabs">{tabs.map(([key,label])=><a key={key} className={section===key?"active":""} href={"/admin/projects/"+id+"?section="+key}>{label}</a>)}</nav>
 <section className="admin-panel"><h2>{title} — Direct Entry</h2><p className="muted">Enter values exactly as reported. No totals, averages, valuations or progress figures are calculated.</p>
 <form action={saveWorkspaceEntry} className="form-grid"><input type="hidden" name="project_id" value={id}/><input type="hidden" name="section" value={section}/>
 <label>Record title<input name="title" required/></label><label>Reporting date<input name="entry_date" type="date"/></label><label>Status<input name="status" placeholder="Enter status"/></label><label>Attachment URL<input name="attachment_url" type="url" placeholder="Optional link"/></label>
 <div className="span-two"><p className="eyebrow">Manual data fields</p><div className="workspace-fields">{[1,2,3,4,5,6].map(i=><div className="workspace-field" key={i}><input name={"field_"+i+"_name"} placeholder={"Field "+i+" name"}/><input name={"field_"+i+"_value"} placeholder="Entered value"/></div>)}</div></div>
 <label className="span-two">Remarks<textarea name="remarks" rows={3}/></label><div className="span-two"><button className="primary">Save entry</button></div></form></section>
 <section className="admin-panel"><h2>Saved {title} records</h2><div className="table-wrap"><table><thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Entered data</th><th>Remarks</th><th>Attachment</th></tr></thead><tbody>
 {(entries||[]).map((e:any)=><tr key={e.id}><td>{e.title}</td><td>{e.entry_date||"—"}</td><td>{e.status||"—"}</td><td>{Object.entries(e.fields||{}).map(([k,v])=><div key={k}><strong>{k}:</strong> {String(v)}</div>)}</td><td>{e.remarks||"—"}</td><td>{e.attachment_url?<a href={e.attachment_url} target="_blank" rel="noreferrer">Open</a>:"—"}</td></tr>)}
 {!entries?.length&&<tr><td colSpan={6}>No entries yet.</td></tr>}</tbody></table></div></section></main>;
}