"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NvrCamera } from "@/types/nvr";

export function CameraConfigDialog({
  open,
  nvrId,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  nvrId: string;
  initial: NvrCamera | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !initial) return;
    setName(initial.name);
    setIpAddress(initial.ipAddress ?? "");
    setError(null);
  }, [open, initial]);

  if (!open || !initial || initial.channel === null) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/hikvision/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "camera",
          nvrId,
          channel: initial.channel,
          name,
          ipAddress,
          enabled: true,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? "Save failed");
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Edit Camera</h2>
        <p className="mt-1 text-sm text-muted-foreground">CH {initial.channel} · แก้ไขชื่อและ IP ที่แสดงในระบบ</p>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Camera Name</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">IP Address</span><Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} /></label>
        </div>
        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save Configuration"}</Button>
        </div>
      </div>
    </div>
  );
}
