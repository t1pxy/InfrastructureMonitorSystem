"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NvrCamera } from "@/types/nvr";

type NvrOption = { id: string; name: string };

export function CameraConfigDialog({ open, nvrId, initial, nvrOptions = [], onClose, onSaved, onDeleted }: {
  open: boolean; nvrId?: string; initial: NvrCamera | null; nvrOptions?: NvrOption[];
  onClose: () => void; onSaved: () => void; onDeleted?: () => void;
}) {
  const [selectedNvr, setSelectedNvr] = useState(nvrId ?? "");
  const [channel, setChannel] = useState("");
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setSelectedNvr(nvrId ?? "");
    setChannel(initial?.channel != null ? String(initial.channel) : "");
    setName(initial?.name ?? "");
    setIpAddress(initial?.ipAddress ?? "");
    setEnabled(true);
    setError(null);
  }, [open, nvrId, initial]);

  if (!open) return null;

  async function save() {
    const numericChannel = Number(channel);
    if (!selectedNvr || !Number.isInteger(numericChannel) || numericChannel < 1) {
      setError("กรุณาเลือก NVR และระบุ Channel ที่ถูกต้อง"); return;
    }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/hikvision/config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "camera", nvrId: selectedNvr, channel: numericChannel, name, ipAddress, enabled }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? "Save failed");
      onSaved(); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!initial?.channel || !selectedNvr) return;
    if (!window.confirm("ต้องการลบการตั้งค่า CCTV CH " + initial.channel + " ใช่หรือไม่?")) return;
    setDeleting(true); setError(null);
    try {
      const response = await fetch("/api/hikvision/config", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "camera", nvrId: selectedNvr, channel: initial.channel }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? "Delete failed");
      onDeleted?.(); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed");
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">{editing ? "Edit CCTV" : "Add CCTV"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{editing ? "CH " + initial?.channel : "เพิ่ม Camera Channel สำหรับ NVR"}</p></div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">NVR</span>
            {editing ? <Input value={selectedNvr} disabled /> : <select value={selectedNvr} onChange={(e) => setSelectedNvr(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select NVR</option>{nvrOptions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select>}
          </label>
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Channel</span>
            <Input type="number" min={1} value={channel} disabled={editing} onChange={(e) => setChannel(e.target.value)} placeholder="1" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Camera Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Entrance Camera" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">IP Address</span>
            <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.101" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Enabled</label>
        </div>
        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-6 flex justify-between gap-2">
          <div>{editing && onDeleted ? <Button variant="destructive" onClick={() => void remove()} disabled={saving || deleting}>{deleting ? "Deleting..." : "Delete"}</Button> : null}</div>
          <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={saving || deleting}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving || deleting}>{saving ? "Saving..." : "Save"}</Button></div>
        </div>
      </div>
    </div>
  );
}
