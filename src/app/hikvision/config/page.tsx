"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, RefreshCw, Save, Server, Trash2, Video, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NvrConfig = { id:string; name:string; host:string; port?:number; protocol?:"http"|"https"; username:string; password:string; site?:string };
type CameraConfig = { nvrId:string; channel:number; name?:string; ipAddress?:string|null; enabled?:boolean };

export default function HikvisionConfigPage() {
  const [nvrs,setNvrs]=useState<NvrConfig[]>([]);
  const [cameras,setCameras]=useState<CameraConfig[]>([]);
  const [nvr,setNvr]=useState<NvrConfig|null>(null);
  const [camera,setCamera]=useState<CameraConfig|null>(null);
  const [selectedNvr,setSelectedNvr]=useState("");
  const [newNvr,setNewNvr]=useState(false);
  const [newCamera,setNewCamera]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [testing,setTesting]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load() {
    const r=await fetch("/api/hikvision/config",{cache:"no-store"});
    const j=await r.json();
    if(!r.ok||!j.success) throw new Error(j.error||"โหลด Config ไม่สำเร็จ");
    setNvrs(j.data.nvrs||[]); setCameras(j.data.cameras||[]); return j.data;
  }
  useEffect(()=>{ void load().catch(e=>setError(e instanceof Error?e.message:"โหลดไม่สำเร็จ")); },[]);

  const cameraRows=useMemo(()=>cameras.filter(x=>x.nvrId===selectedNvr),[cameras,selectedNvr]);

  function chooseNvr(id:string) {
    setSelectedNvr(id); setNewNvr(false); setNewCamera(false); setCamera(null); setMessage(""); setError("");
    const x=nvrs.find(v=>v.id===id); setNvr(x ? {...x,password:""} : null);
  }
  function addNvr() {
    setSelectedNvr(""); setNewNvr(true); setCamera(null);
    setNvr({id:"",name:"",host:"",port:80,protocol:"http",username:"",password:"",site:""}); setMessage(""); setError("");
  }
  function editCamera(x:CameraConfig) { setNewCamera(false); setCamera({...x}); setMessage(""); setError(""); }
  function addCamera() {
    const id=selectedNvr || nvrs[0]?.id || ""; setSelectedNvr(id); setNewCamera(true); setMessage(""); setError("");
    setCamera({nvrId:id,channel:1,name:"",ipAddress:"",enabled:true});
  }
  async function saveNvr() {
    if(!nvr) return; setBusy(true); setError(""); setMessage("");
    try {
      const r=await fetch("/api/hikvision/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...nvr,type:"nvr",port:Number(nvr.port||80)})});
      const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.error||"บันทึก NVR ไม่สำเร็จ");
      const id=nvr.id; await load(); chooseNvr(id); setMessage("บันทึก NVR configuration สำเร็จ");
    } catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");} finally{setBusy(false);}
  }
  async function saveCamera() {
    if(!camera) return; setBusy(true); setError(""); setMessage("");
    try {
      const r=await fetch("/api/hikvision/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...camera,type:"camera",channel:Number(camera.channel)})});
      const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.error||"บันทึก CCTV ไม่สำเร็จ");
      const id=camera.nvrId; const ch=Number(camera.channel); const data=await load(); setSelectedNvr(id); setCamera((data.cameras||[]).find((x:CameraConfig)=>x.nvrId===id&&x.channel===ch)||null); setNewCamera(false); setMessage("บันทึก CCTV configuration สำเร็จ");
    } catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");} finally{setBusy(false);}
  }
  async function testConnection() {
    if(!nvr) return; setTesting(true); setError(""); setMessage("");
    try {
      const r=await fetch("/api/hikvision/config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...nvr,type:"test",port:Number(nvr.port||80)})});
      const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.error||"Connection failed");
      setMessage("เชื่อมต่อสำเร็จ: "+(j.data?.model||"Hikvision")+" | S/N "+(j.data?.serialNumber||"-")+" | FW "+(j.data?.firmware||"-"));
    } catch(e){setError(e instanceof Error?e.message:"เชื่อมต่อไม่สำเร็จ");} finally{setTesting(false);}
  }
  async function remove(type:"nvr"|"camera") {
    if(!confirm(type==="nvr"?"ลบ NVR นี้และ config กล้องทั้งหมดของ NVR นี้?":"ปิดการ Monitor กล้อง channel นี้?")) return;
    const body=type==="nvr"?{type,id:nvr?.id}:{type,nvrId:camera?.nvrId,channel:camera?.channel};
    const r=await fetch("/api/hikvision/config",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json(); if(!r.ok||!j.success){setError(j.error||"ดำเนินการไม่สำเร็จ");return;}
    await load(); setNvr(null); setCamera(null); setSelectedNvr(""); setMessage(type==="nvr"?"ลบ NVR สำเร็จ":"ปิดการ Monitor CCTV สำเร็จ");
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div><h1 className="text-2xl font-bold tracking-tight">Hikvision Configuration</h1><p className="mt-1 text-sm text-muted-foreground">จัดการ Config แบบละเอียดสำหรับ NVR และ CCTV — ค่าที่บันทึกจะถูกใช้โดย Monitor Worker โดยตรง</p></div>
      <Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </div>
    {error?<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>:null}
    {message?<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{message}</div>:null}

    <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold">NVR Configuration</h2><Button size="sm" onClick={addNvr}><Server className="mr-1.5 h-4 w-4"/>Add</Button></div>
        <div className="mt-4 space-y-2">{nvrs.map(x=><button key={x.id} onClick={()=>chooseNvr(x.id)} className={"w-full rounded-xl border p-3 text-left transition-colors "+(selectedNvr===x.id?"bg-muted":"hover:bg-muted/50")}><div className="font-semibold">{x.name||x.id}</div><div className="mt-1 font-mono text-xs">{x.host}:{x.port||80}</div><div className="mt-1 text-xs text-muted-foreground">{(x.protocol||"http").toUpperCase()+" · "+(x.site||"No Site")}</div></button>)}{!nvrs.length?<p className="p-4 text-sm text-muted-foreground">ยังไม่มี NVR configuration</p>:null}</div>
      </aside>

      <section className="rounded-xl border bg-background p-5 shadow-sm">
        {!nvr?<div className="flex min-h-[360px] items-center justify-center text-center text-muted-foreground"><div><Server className="mx-auto h-10 w-10"/><p className="mt-3">เลือก NVR ทางซ้ายเพื่อแก้ไข<br/>หรือกด Add เพื่อเพิ่ม NVR</p></div></div>:
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><h2 className="text-xl font-semibold">{newNvr?"Add NVR":"Edit NVR Configuration"}</h2><p className="mt-1 text-sm text-muted-foreground">Connection และ Identity ที่ใช้เรียก Hikvision ISAPI</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void testConnection()} disabled={testing||busy}><Wifi className="mr-2 h-4 w-4"/>{testing?"Testing...":"Test Connection"}</Button>{!newNvr?<Button variant="destructive" onClick={()=>void remove("nvr")} disabled={busy}><Trash2 className="mr-2 h-4 w-4"/>Delete NVR</Button>:null}</div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="NVR ID *"><Input value={nvr.id} disabled={!newNvr} onChange={e=>setNvr({...nvr,id:e.target.value})}/><Hint>Key หลักของ NVR ในระบบ</Hint></Field>
            <Field label="Display Name *"><Input value={nvr.name} onChange={e=>setNvr({...nvr,name:e.target.value})}/></Field>
            <Field label="Host / IP *"><Input value={nvr.host} onChange={e=>setNvr({...nvr,host:e.target.value})}/></Field>
            <Field label="Protocol"><select value={nvr.protocol||"http"} onChange={e=>setNvr({...nvr,protocol:e.target.value as "http"|"https"})} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="http">HTTP</option><option value="https">HTTPS</option></select></Field>
            <Field label="Port"><Input type="number" min={1} max={65535} value={nvr.port||80} onChange={e=>setNvr({...nvr,port:Number(e.target.value)})}/></Field>
            <Field label="Site"><Input value={nvr.site||""} onChange={e=>setNvr({...nvr,site:e.target.value})}/></Field>
            <Field label="Username *"><Input value={nvr.username} onChange={e=>setNvr({...nvr,username:e.target.value})}/></Field>
            <Field label={newNvr?"Password *":"Password"}><div className="relative"><Input type={showPassword?"text":"password"} value={nvr.password} onChange={e=>setNvr({...nvr,password:e.target.value})} placeholder={newNvr?"Enter NVR password":"Blank = keep existing password"}/><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></Field>
          </div>
          <div className="flex justify-end"><Button onClick={()=>void saveNvr()} disabled={busy}><Save className="mr-2 h-4 w-4"/>{busy?"Saving...":"Save NVR Configuration"}</Button></div>

          {!newNvr?<div className="border-t pt-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h3 className="font-semibold">CCTV Channel Configuration</h3><p className="text-xs text-muted-foreground">ตั้งค่าเฉพาะ Channel ที่ต้องการ override จากข้อมูล NVR</p></div><Button size="sm" onClick={addCamera}><Video className="mr-2 h-4 w-4"/>Add CCTV</Button></div>
            <div className="mt-4 overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">CH</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">Monitor</th><th className="px-3 py-2 text-right">Edit</th></tr></thead><tbody className="divide-y">{cameraRows.map(c=><tr key={c.nvrId+"-"+c.channel}><td className="px-3 py-2 font-mono">CH {c.channel}</td><td className="px-3 py-2">{c.name||"-"}</td><td className="px-3 py-2 font-mono text-xs">{c.ipAddress||"Auto"}</td><td className="px-3 py-2">{c.enabled!==false?"Enabled":"Disabled"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={()=>editCamera(c)}>Edit</Button></td></tr>)}{!cameraRows.length?<tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">ไม่มี Camera override — ระบบอ่าน Channel จาก NVR อัตโนมัติ</td></tr>:null}</tbody></table></div>
          </div>:null}
        </div>}
      </section>
    </div>

    {camera?<section className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h2 className="text-lg font-semibold">{newCamera?"Add CCTV Configuration":"Edit CCTV Configuration"}</h2><p className="text-sm text-muted-foreground">NVR: {camera.nvrId}</p></div><Button variant="destructive" onClick={()=>void remove("camera")} disabled={busy}><Trash2 className="mr-2 h-4 w-4"/>Disable Monitoring</Button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="NVR *"><select disabled={!newCamera} value={camera.nvrId} onChange={e=>setCamera({...camera,nvrId:e.target.value})} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">{nvrs.map(x=><option key={x.id} value={x.id}>{x.name} ({x.id})</option>)}</select></Field>
        <Field label="Channel *"><Input type="number" min={1} value={camera.channel} disabled={!newCamera} onChange={e=>setCamera({...camera,channel:Number(e.target.value)})}/><Hint>ต้องตรงกับ Channel ที่ NVR ใช้งาน</Hint></Field>
        <Field label="Camera Name"><Input value={camera.name||""} onChange={e=>setCamera({...camera,name:e.target.value})} placeholder="Entrance Camera"/></Field>
        <Field label="Camera IP Address"><Input value={camera.ipAddress||""} onChange={e=>setCamera({...camera,ipAddress:e.target.value})} placeholder="เว้นว่างเพื่อใช้ IP จาก NVR"/></Field>
      </div>
      <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={camera.enabled!==false} onChange={e=>setCamera({...camera,enabled:e.target.checked})}/>Enable this CCTV for monitoring</label>
      <div className="mt-5 flex justify-end"><Button onClick={()=>void saveCamera()} disabled={busy}><Save className="mr-2 h-4 w-4"/>Save CCTV Configuration</Button></div>
    </section>:null}
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
function Hint({children}:{children:React.ReactNode}){return <span className="text-[11px] text-muted-foreground">{children}</span>}
