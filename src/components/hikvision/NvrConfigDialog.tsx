"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NvrConfig } from "@/types/nvr";

export function NvrConfigDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: NvrConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    host: "",
    port: "80",
    username: "",
    password: "",
    site: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id ?? "",
      name: initial?.name ?? "",
      host: initial?.host ?? "",
      port: String(initial?.port ?? 80),
      username: initial?.username ?? "",
      password: "",
      site: initial?.site ?? "",
    });
    setError(null);
  }, [open, initial]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/hikvision/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "nvr", ...form, port: Number(form.port) }),
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
      <div className="w-full max-w-2xl rounded-2xl border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{initial ? "Edit NVR" : "Add NVR"}</h2>
            <p className="text-sm text-muted-foreground">แก้ไขข้อมูลเชื่อมต่อ Hikvision NVR</p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="NVR ID"><Input value={form.id} disabled={!!initial} onChange={(e) => setForm({ ...form, id: e.target.value })} /></Field>
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="IP / Host"><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field>
          <Field label="Port"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field>
          <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label={initial ? "Password (เว้นว่าง = ไม่เปลี่ยน)" : "Password"}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Site"><Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} /></Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
