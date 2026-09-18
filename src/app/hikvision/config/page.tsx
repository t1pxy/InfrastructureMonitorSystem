"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, RefreshCw, Save, Server, ShieldAlert, Terminal, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NvrConfig = { id:string; name:string; host:string; port?:number; protocol?:"http"|"https"; username:string; password:string; site?:string };
type CameraConfig = { nvrId:string; channel:number; name?:string; ipAddress?:string|null; enabled?:boolean };
type Method = "GET"|"POST"|"PUT"|"DELETE";

const PRESETS = [
  { label:"Device Info", method:"GET" as Method, path:"/ISAPI/System/deviceInfo", readOnly:true },
  { label:"System Time", method:"GET" as Method, path:"/ISAPI/System/time", readOnly:false },
  { label:"Network Interfaces", method:"GET" as Method, path:"/ISAPI/System/Network/interfaces", readOnly:false },
  { label:"HDD / Storage", method:"GET" as Method, path:"/ISAPI/ContentMgmt/Storage/hdd", readOnly:true },
  { label:"Camera Channels", method:"GET" as Method, path:"/ISAPI/ContentMgmt/InputProxy/channels", readOnly:true },
  { label:"Camera Channel Status", method:"GET" as Method, path:"/ISAPI/ContentMgmt/InputProxy/channels/status", readOnly:true },
  { label:"Users", method:"GET" as Method, path:"/ISAPI/Security/users", readOnly:false },
];

export default function Page() {
  const [nvrs,setNvrs]=useState<NvrConfig[]>([]);
  const [selected,setSelected]=useState("");
  const [nvr,setNvr]=useState<NvrConfig|null>(null);
  const [tab,setTab]=useState("overview");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [data,setData]=useState<any>(null);
  const tabs:any[]=[["overview","Overview",Server],["network","Network",Wifi],["time","Date & Time",Clock],["users","Users",Shield],["storage","Storage",HardDrive],["cameras","Camera",Camera]];
  const call=async(method:string,path:string,body:string="")=>{const r=await fetch("/api/hikvision/device",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nvrId:selected,method,path,body})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||"Request failed");return j.data.body||""};
  const load=async()=>{const j=await fetch("/api/hikvision/config",{cache:"no-store"}).then(x=>x.json());if(!j.success)throw new Error(j.error);setNvrs(j.data.nvrs||[]);if(!selected&&j.data.nvrs?.[0])setSelected(j.data.nvrs[0].id)};
  const read=async()=>{if(!selected||tab==="overview")return;setBusy(true);setError("");try{let path="/ISAPI/System/Network/interfaces";if(tab==="time")path="/ISAPI/System/time";if(tab==="users")path="/ISAPI/Security/users";if(tab==="storage")path="/ISAPI/ContentMgmt/Storage/hdd";if(tab==="cameras")path="/ISAPI/ContentMgmt/InputProxy/channels";setData(await call("GET",path));setMessage("อ่านค่าจาก NVR สำเร็จ")}catch(e){setError(e instanceof Error?e.message:"Read failed")}finally{setBusy(false)}};
  useEffect(()=>{void load().catch(e=>setError(e.message))},[]);
  useEffect(()=>{const x=nvrs.find(v=>v.id===selected);setNvr(x?{...x,password:""}:null);void read()},[selected,tab]);
  const saveConnection=async()=>{if(!nvr)return;setBusy(true);try{const r=await fetch("/api/hikvision/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...nvr,type:"nvr",port:Number(nvr.port||80),password:nvr.password||undefined})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error);setMessage("บันทึก Connection สำเร็จ");await load()}catch(e){setError(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}};
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Hikvision NVR Management</h1><p className="text-sm text-muted-foreground">GUI แบบ Web UI สำหรับควบคุม NVR จริง</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
  {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{message&&<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{message}</div>}
  <div className="grid gap-6 xl:grid-cols-[270px_1fr]"><aside className="rounded-xl border p-4"><div className="mb-3 text-xs font-semibold text-muted-foreground">NVR DEVICES</div>{nvrs.map(x=><button key={x.id} onClick={()=>{setSelected(x.id);setTab("overview")}} className={"mb-2 w-full rounded-xl border p-3 text-left "+(selected===x.id?"bg-muted":"hover:bg-muted/50")}><b>{x.name||x.id}</b><div className="font-mono text-xs">{x.host}:{x.port||80}</div><div className="text-xs text-muted-foreground">{x.site||"-"}</div></button>)}</aside>
  <main className="rounded-xl border"><div className="border-b p-5">{nvr?<><h2 className="text-xl font-semibold">{nvr.name||nvr.id}</h2><div className="font-mono text-xs text-muted-foreground">{nvr.protocol||"http"}://{nvr.host}:{nvr.port||80}</div></>:<span>เลือก NVR</span>}</div>
  {nvr&&<><nav className="flex overflow-x-auto border-b">{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={"flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm "+(tab===id?"border-primary text-primary":"border-transparent text-muted-foreground")}><Icon className="h-4 w-4"/>{label}</button>)}</nav><div className="p-5">
  {tab==="overview"&&<Card title="NVR Connection" desc="ค่าการเชื่อมต่อที่ Monitor ใช้งานจริง"><div className="grid gap-4 md:grid-cols-2">{field("NVR ID",<Input disabled value={nvr.id}/>)}{field("Name",<Input value={nvr.name} onChange={e=>setNvr({...nvr,name:e.target.value})}/>)}{field("Host / IP",<Input value={nvr.host} onChange={e=>setNvr({...nvr,host:e.target.value})}/>)}{field("Protocol",<Select value={nvr.protocol||"http"} onChange={v=>setNvr({...nvr,protocol:v as "http"|"https"})} options={["http","https"]}/>)}{field("Port",<Input type="number" value={nvr.port||80} onChange={e=>setNvr({...nvr,port:Number(e.target.value)})}/>)}{field("Site",<Input value={nvr.site||""} onChange={e=>setNvr({...nvr,site:e.target.value})}/>)}{field("Username",<Input value={nvr.username} onChange={e=>setNvr({...nvr,username:e.target.value})}/>)}{field("Password",<Input type="password" placeholder="ว่าง = ใช้เดิม" value={nvr.password} onChange={e=>setNvr({...nvr,password:e.target.value})}/>)}</div><div className="mt-5 flex justify-end"><Button disabled={busy} onClick={()=>void saveConnection()}><Save className="mr-2 h-4 w-4"/>Save Connection</Button></div></Card>}
  {tab!=="overview"&&<Card title={tabs.find(x=>x[0]===tab)?.[1]||tab} desc="อ่านค่าจาก NVR จริงและเตรียมเป็น GUI form"><div className="mb-4 flex justify-end"><Button disabled={busy} onClick={()=>void read()}><RefreshCw className="mr-2 h-4 w-4"/>Read From NVR</Button></div><pre className="max-h-[520px] overflow-auto rounded-xl bg-muted p-4 text-xs whitespace-pre-wrap">{data||"กด Read From NVR"}</pre><Warn text="ขั้นต่อไปสามารถทำ field editor เฉพาะแต่ละเมนูได้ โดยไม่ต้องให้ผู้ใช้แก้ XML"/></Card>}
  </div></>}</main></div></div>;
}
function Card(p:{title:string;desc:string;children:React.ReactNode}){return <div className="space-y-5"><div><h3 className="text-lg font-semibold">{p.title}</h3><p className="text-sm text-muted-foreground">{p.desc}</p></div>{p.children}</div>}
function field(label:string,child:React.ReactNode){return <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{child}</label>}
function Select(p:{value:string;onChange:(v:string)=>void;options:string[]}){return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={p.value} onChange={e=>p.onChange(e.target.value)}>{p.options.map(x=><option key={x}>{x}</option>)}</select>}
function Warn({text}:{text:string}){return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{text}</div>}