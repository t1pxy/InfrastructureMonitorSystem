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

export default function HikvisionConfigPage() {
  const [nvrs,setNvrs]=useState<NvrConfig[]>([]);
  const [cameras,setCameras]=useState<CameraConfig[]>([]);
  const [selectedNvr,setSelectedNvr]=useState("");
  const [nvr,setNvr]=useState<NvrConfig|null>(null);
  const [camera,setCamera]=useState<CameraConfig|null>(null);
  const [newNvr,setNewNvr]=useState(false);
  const [newCamera,setNewCamera]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [testing,setTesting]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [method,setMethod]=useState<Method>("GET");
  const [path,setPath]=useState("/ISAPI/System/deviceInfo");
  const [requestBody,setRequestBody]=useState("");
  const [responseBody,setResponseBody]=useState("");
  const [responseStatus,setResponseStatus]=useState<number|null>(null);

  async function load() {
    const r=await fetch("/api/hikvision/config",{cache:"no-store"});
    const j=await r.json();
    if(!r.ok||!j.success) throw new Error(j.error||"โหลด Config ไม่สำเร็จ");
    setNvrs(j.data.nvrs||[]); setCameras(j.data.cameras||[]); return j.data;
  }
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:"โหลด Config ไม่สำเร็จ"));},[]);
  const cameraRows=useMemo(()=>cameras.filter(x=>x.nvrId===selectedNvr),[cameras,selectedNvr]);

  function chooseNvr(id:string){setSelectedNvr(id);setNewNvr(false);setNewCamera(false);setCamera(null);setMessage("");setError("");const x=nvrs.find(v=>v.id===id);setNvr(x?{...x,password:""}:null);}
  function addNvr(){setSelectedNvr("");setNewNvr(true);setCamera(null);setNvr({id:"",name:"",host:"",port:80,protocol:"http",username:"",password:"",site:""});setMessage("");setError("");}
  function addCamera(){const id=selectedNvr||nvrs[0]?.id||"";setSelectedNvr(id);setNewCamera(true);setCamera({nvrId:id,channel:1,name:"",ipAddress:"",enabled:true});}
  function editCamera(x:CameraConfig){setNewCamera(false);setCamera({...x});}
  async function saveNvr(){
    if(!nvr)return;setBusy(true);setError("");setMessage("");
    try{const r=await fetch("/api/hikvision/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...nvr,type:"nvr",port:Number(nvr.port||80)})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||"บันทึก NVR ไม่สำเร็จ");const id=nvr.id;await load();chooseNvr(id);setMessage("บันทึก NVR configuration สำเร็จ");}catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");}finally{setBusy(false);}
  }
  async function saveCamera(){
    if(!camera)return;setBusy(true);setError("");setMessage("");
    try{const r=await fetch("/api/hikvision/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...camera,type:"camera",channel:Number(camera.channel)})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||"บันทึก CCTV ไม่สำเร็จ");const id=camera.nvrId,ch=Number(camera.channel),data=await load();setSelectedNvr(id);setCamera((data.cameras||[]).find((x:CameraConfig)=>x.nvrId===id&&x.channel===ch)||null);setNewCamera(false);setMessage("บันทึก CCTV configuration สำเร็จ");}catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");}finally{setBusy(false);}
  }
  async function testConnection(){
    if(!nvr)return;setTesting(true);setError("");setMessage("");
    try{const r=await fetch("/api/hikvision/config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...nvr,type:"test",port:Number(nvr.port||80)})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||"Connection failed");setMessage("เชื่อมต่อสำเร็จ: "+(j.data?.model||"Hikvision")+" | S/N "+(j.data?.serialNumber||"-")+" | FW "+(j.data?.firmware||"-"));}catch(e){setError(e instanceof Error?e.message:"เชื่อมต่อไม่สำเร็จ");}finally{setTesting(false);}
  }
  async function remove(type:"nvr"|"camera"){
    if(!confirm(type==="nvr"?"ลบ NVR นี้และ config กล้องทั้งหมดของ NVR นี้?":"ปิดการ Monitor กล้อง channel นี้?"))return;
    const body=type==="nvr"?{type,id:nvr?.id}:{type,nvrId:camera?.nvrId,channel:camera?.channel};const r=await fetch("/api/hikvision/config",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||!j.success){setError(j.error||"ดำเนินการไม่สำเร็จ");return;}await load();setNvr(null);setCamera(null);setSelectedNvr("");setMessage(type==="nvr"?"ลบ NVR สำเร็จ":"ปิดการ Monitor CCTV สำเร็จ");
  }
  function preset(p:typeof PRESETS[number]){setMethod(p.method);setPath(p.path);setRequestBody("");setResponseBody("");setResponseStatus(null);}
  async function execute(){
    if(!selectedNvr){setError("กรุณาเลือก NVR ก่อน");return;}
    if(!path.startsWith("/ISAPI/")){setError("Endpoint ต้องเริ่มด้วย /ISAPI/");return;}
    setBusy(true);setError("");setMessage("");setResponseBody("");setResponseStatus(null);
    try{
      const r=await fetch("/api/hikvision/device",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nvrId:selectedNvr,method,path,body:requestBody})});
      const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||"Hikvision request failed");
      setResponseStatus(j.data.status);setResponseBody(j.data.body||"");setMessage(method+" "+path+" สำเร็จ");
    }catch(e){setError(e instanceof Error?e.message:"Hikvision request failed");}finally{setBusy(false);}
  }
  async function loadForEdit(){setMethod("GET");await execute();}

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div><h1 className="text-2xl font-bold tracking-tight">Hikvision NVR Management</h1><p className="mt-1 text-sm text-muted-foreground">จัดการ Config ระบบ Monitor และควบคุม NVR จริงผ่าน Hikvision ISAPI</p></div>
      <Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </div>
    {error?<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>:null}
    {message?<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{message}</div>:null}
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/><div><b>Direct Device Control</b><div className="mt-1">คำสั่ง PUT/POST/DELETE จะเปลี่ยนค่าบน NVR จริงทันที และ endpoint ที่รองรับขึ้นกับรุ่นและ firmware ของ NVR แต่ละตัว</div></div></div>

    <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold">NVR</h2><Button size="sm" onClick={addNvr}><Server className="mr-1.5 h-4 w-4"/>Add</Button></div>
        <div className="mt-4 space-y-2">{nvrs.map(x=><button key={x.id} onClick={()=>chooseNvr(x.id)} className={"w-full rounded-xl border p-3 text-left "+(selectedNvr===x.id?"bg-muted":"hover:bg-muted/50")}><div className="font-semibold">{x.name||x.id}</div><div className="mt-1 font-mono text-xs">{x.host}:{x.port||80}</div><div className="mt-1 text-xs text-muted-foreground">{(x.protocol||"http").toUpperCase()+" · "+(x.site||"No Site")}</div></button>)}</div>
      </aside>

      <section className="rounded-xl border bg-background p-5 shadow-sm">
        {!nvr?<div className="flex min-h-[220px] items-center justify-center text-center text-muted-foreground"><div><Server className="mx-auto h-10 w-10"/><p className="mt-3">เลือก NVR เพื่อจัดการ</p></div></div>:
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row"><div><h2 className="text-xl font-semibold">{newNvr?"Add NVR":"NVR Connection Configuration"}</h2><p className="text-sm text-muted-foreground">ค่าชุดนี้ใช้สำหรับเชื่อมต่อและเรียก ISAPI</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void testConnection()} disabled={testing||busy}><Wifi className="mr-2 h-4 w-4"/>{testing?"Testing...":"Test Connection"}</Button>{!newNvr?<Button variant="destructive" onClick={()=>void remove("nvr")} disabled={busy}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>:null}</div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="NVR ID *"><Input value={nvr.id} disabled={!newNvr} onChange={e=>setNvr({...nvr,id:e.target.value})}/></Field>
            <Field label="Name *"><Input value={nvr.name} onChange={e=>setNvr({...nvr,name:e.target.value})}/></Field>
            <Field label="Host / IP *"><Input value={nvr.host} onChange={e=>setNvr({...nvr,host:e.target.value})}/></Field>
            <Field label="Protocol"><select value={nvr.protocol||"http"} onChange={e=>setNvr({...nvr,protocol:e.target.value as "http"|"https"})} className="h-9 w-full rounded-lg border px-3 text-sm"><option value="http">HTTP</option><option value="https">HTTPS</option></select></Field>
            <Field label="Port"><Input type="number" min={1} max={65535} value={nvr.port||80} onChange={e=>setNvr({...nvr,port:Number(e.target.value)})}/></Field>
            <Field label="Site"><Input value={nvr.site||""} onChange={e=>setNvr({...nvr,site:e.target.value})}/></Field>
            <Field label="Username *"><Input value={nvr.username} onChange={e=>setNvr({...nvr,username:e.target.value})}/></Field>
            <Field label={newNvr?"Password *":"Password"}><div className="relative"><Input type={showPassword?"text":"password"} value={nvr.password} onChange={e=>setNvr({...nvr,password:e.target.value})} placeholder={newNvr?"Enter password":"Blank = keep existing"}/><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4" />}</button></div></Field>
          </div>
          <div className="flex justify-end"><Button onClick={()=>void saveNvr()} disabled={busy}><Save className="mr-2 h-4 w-4"/>{busy?"Saving...":"Save Connection"}</Button></div>
        </div>}
      </section>
    </div>

    {nvr&&!newNvr?<section className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div><h2 className="text-xl font-semibold flex items-center gap-2"><Terminal className="h-5 w-5"/>Direct ISAPI Console</h2><p className="text-sm text-muted-foreground">อ่านและแก้ไข configuration ของ NVR จริงผ่าน HTTP Digest Authentication</p></div>
        <div className="text-xs text-muted-foreground">Target: <span className="font-mono">{nvr.host}</span></div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">{PRESETS.map(p=><Button key={p.path} size="sm" variant={path===p.path?"default":"outline"} onClick={()=>preset(p)}>{p.label}</Button>)}</div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="HTTP Method"><select value={method} onChange={e=>setMethod(e.target.value as Method)} className="h-9 w-full rounded-lg border px-3 text-sm"><option>GET</option><option>PUT</option><option>POST</option><option>DELETE</option></select></Field>
          <Field label="ISAPI Endpoint"><Input value={path} onChange={e=>setPath(e.target.value)} placeholder="/ISAPI/System/time"/></Field>
          <Button className="w-full" onClick={()=>void execute()} disabled={busy}><Terminal className="mr-2 h-4 w-4"/>{busy?"Executing...":"Execute Request"}</Button>
          <p className="text-[11px] leading-4 text-muted-foreground">GET ใช้อ่านค่า ส่วน PUT/POST/DELETE ใช้เปลี่ยนค่าบนอุปกรณ์จริง</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div><div className="mb-2 text-xs font-semibold text-muted-foreground">REQUEST BODY (XML)</div><textarea value={requestBody} onChange={e=>setRequestBody(e.target.value)} spellCheck={false} className="min-h-[360px] w-full rounded-lg border bg-muted/20 p-3 font-mono text-xs outline-none focus:ring-2" placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<Time>...</Time>'}/></div>
          <div><div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>RESPONSE {responseStatus!==null?"· HTTP "+responseStatus:""}</span><Button size="sm" variant="outline" onClick={()=>void loadForEdit()} disabled={busy}>Reload</Button></div><textarea readOnly value={responseBody} spellCheck={false} className="min-h-[360px] w-full rounded-lg border bg-muted/20 p-3 font-mono text-xs outline-none"/></div>
        </div>
      </div>
      <div className="mt-5 rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground"><b>Workflow:</b> กด preset เพื่อเลือก endpoint → Execute GET เพื่ออ่าน XML จริง → นำ XML มาแก้ใน Request Body → เปลี่ยน Method เป็น PUT/POST → Execute เพื่อเขียนกลับ NVR</div>
    </section>:null}

    {nvr&&!newNvr?<section className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold">CCTV Monitor Configuration</h2><p className="text-xs text-muted-foreground">ส่วนนี้ยังคงเป็น config ของระบบ Monitor ไม่ใช่การลบกล้องจริงจาก NVR</p></div><Button size="sm" onClick={addCamera}>Add CCTV</Button></div>
      <div className="mt-4 overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">CH</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">Monitor</th><th className="px-3 py-2">Edit</th></tr></thead><tbody className="divide-y">{cameraRows.map(c=><tr key={c.nvrId+"-"+c.channel}><td className="px-3 py-2 font-mono">CH {c.channel}</td><td className="px-3 py-2">{c.name||"-"}</td><td className="px-3 py-2 font-mono text-xs">{c.ipAddress||"Auto"}</td><td className="px-3 py-2">{c.enabled!==false?"Enabled":"Disabled"}</td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={()=>editCamera(c)}>Edit</Button></td></tr>)}{!cameraRows.length?<tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">ไม่มี override config</td></tr>:null}</tbody></table></div>
    </section>:null}

    {camera?<section className="rounded-xl border bg-background p-5 shadow-sm"><div className="flex justify-between"><div><h3 className="font-semibold">{newCamera?"Add":"Edit"} CCTV Configuration</h3><p className="text-sm text-muted-foreground">NVR: {camera.nvrId}</p></div><Button variant="destructive" onClick={()=>void remove("camera")}>Disable Monitor</Button></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="NVR"><select disabled={!newCamera} value={camera.nvrId} onChange={e=>setCamera({...camera,nvrId:e.target.value})} className="h-9 w-full rounded-lg border px-3 text-sm">{nvrs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Channel"><Input type="number" min={1} value={camera.channel} disabled={!newCamera} onChange={e=>setCamera({...camera,channel:Number(e.target.value)})}/></Field><Field label="Camera Name"><Input value={camera.name||""} onChange={e=>setCamera({...camera,name:e.target.value})}/></Field><Field label="Camera IP"><Input value={camera.ipAddress||""} onChange={e=>setCamera({...camera,ipAddress:e.target.value})}/></Field></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={camera.enabled!==false} onChange={e=>setCamera({...camera,enabled:e.target.checked})}/>Enable monitoring</label><div className="mt-4 flex justify-end"><Button onClick={()=>void saveCamera()} disabled={busy}><Save className="mr-2 h-4 w-4"/>Save CCTV</Button></div></section>:null}
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
