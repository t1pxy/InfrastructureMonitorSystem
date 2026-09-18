"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  HardDrive,
  Laptop,
  Monitor,
  Search,
  Server,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab =
  | "overview"
  | "offline"
  | "department"
  | "pc"
  | "camera"
  | "windows";

type DeviceType = "PC / Desktop" | "Notebook";

type Device = {
  hostname: string;
  ip: string;
  department: string;
  type: DeviceType;
  user: string;
  offlineDays: number;
};

type Department = {
  name: string;
  pc: number;
  notebook: number;
};

type CameraRow = {
  name: string;
  nvr: string;
  site: string;
  offlineHours: number;
};

type UpdateDevice = {
  hostname: string;
  ip: string;
  department: string;
  user: string;
  type: DeviceType;
  status: "Need Update" | "Restart Required";
  updates: number;
  lastScan: string;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "offline", label: "Offline / Not Online" },
  { id: "department", label: "Department Summary" },
  { id: "pc", label: "PC / Notebook Usage" },
  { id: "camera", label: "Camera Summary" },
  { id: "windows", label: "Windows Update" },
];

const devices: Device[] = [
  {
    hostname: "PC-FIN-003",
    ip: "192.168.10.45",
    department: "การเงิน",
    type: "PC / Desktop",
    user: "สุภาวดี",
    offlineDays: 32,
  },
  {
    hostname: "NB-MKT-012",
    ip: "192.168.20.78",
    department: "การตลาด",
    type: "Notebook",
    user: "กิตติศักดิ์",
    offlineDays: 21,
  },
  {
    hostname: "PC-PROD-021",
    ip: "192.168.30.112",
    department: "ฝ่ายผลิต",
    type: "PC / Desktop",
    user: "วิทยา",
    offlineDays: 18,
  },
  {
    hostname: "PC-WH-005",
    ip: "192.168.40.67",
    department: "คลังสินค้า",
    type: "PC / Desktop",
    user: "อนุชา",
    offlineDays: 14,
  },
  {
    hostname: "NB-ENG-007",
    ip: "192.168.50.33",
    department: "วิศวกรรม",
    type: "Notebook",
    user: "ธนากร",
    offlineDays: 12,
  },
  {
    hostname: "PC-ADMIN-006",
    ip: "192.168.10.33",
    department: "IT",
    type: "PC / Desktop",
    user: "ปฏิบัติการ",
    offlineDays: 10,
  },
  {
    hostname: "NB-HR-003",
    ip: "192.168.60.18",
    department: "HR",
    type: "Notebook",
    user: "กมลชนก",
    offlineDays: 9,
  },
  {
    hostname: "PC-QC-014",
    ip: "192.168.30.61",
    department: "ตรวจสอบคุณภาพ",
    type: "PC / Desktop",
    user: "ศิริพร",
    offlineDays: 8,
  },
];

const departments: Department[] = [
  { name: "ฝ่ายผลิต", pc: 48, notebook: 12 },
  { name: "คลังสินค้า", pc: 32, notebook: 8 },
  { name: "การตลาด", pc: 28, notebook: 15 },
  { name: "การเงิน", pc: 22, notebook: 10 },
  { name: "วิศวกรรม", pc: 18, notebook: 12 },
  { name: "HR", pc: 12, notebook: 6 },
  { name: "IT", pc: 10, notebook: 7 },
  { name: "อื่นๆ", pc: 5, notebook: 4 },
];

const cameras: CameraRow[] = [
  { name: "CAM-03", nvr: "NVR-01", site: "โซนผลิต", offlineHours: 132 },
  { name: "CAM-12", nvr: "NVR-03", site: "คลังสินค้า", offlineHours: 75 },
  { name: "CAM-27", nvr: "NVR-02", site: "ทางเข้า", offlineHours: 54 },
  { name: "CAM-31", nvr: "NVR-05", site: "สำนักงาน", offlineHours: 38 },
  { name: "CAM-42", nvr: "NVR-04", site: "ลานจอดรถ", offlineHours: 26 },
];

const camerasBySite = [
  { name: "โรงงาน 1 (สำนักงานใหญ่)", count: 18 },
  { name: "คลังสินค้า", count: 8 },
  { name: "สำนักงาน", count: 7 },
  { name: "ทางเข้า / ลานจอดรถ", count: 6 },
  { name: "อื่นๆ", count: 9 },
];

const updates: UpdateDevice[] = [
  {
    hostname: "PC-ACC-001",
    ip: "192.168.10.25",
    department: "บัญชี",
    user: "สมชาย",
    type: "PC / Desktop",
    status: "Need Update",
    updates: 5,
    lastScan: "18/09/2026 09:12",
  },
  {
    hostname: "PC-SALES-012",
    ip: "192.168.20.18",
    department: "การตลาด",
    user: "สุภาวดี",
    type: "PC / Desktop",
    status: "Need Update",
    updates: 3,
    lastScan: "18/09/2026 10:03",
  },
  {
    hostname: "NB-MKT-005",
    ip: "192.168.20.33",
    department: "การตลาด",
    user: "กิตติศักดิ์",
    type: "Notebook",
    status: "Need Update",
    updates: 4,
    lastScan: "18/09/2026 10:45",
  },
  {
    hostname: "PC-PROD-021",
    ip: "192.168.30.45",
    department: "ฝ่ายผลิต",
    user: "วิทยา",
    type: "PC / Desktop",
    status: "Need Update",
    updates: 6,
    lastScan: "18/09/2026 11:20",
  },
  {
    hostname: "PC-WH-003",
    ip: "192.168.40.12",
    department: "คลังสินค้า",
    user: "อนุชา",
    type: "PC / Desktop",
    status: "Need Update",
    updates: 2,
    lastScan: "18/09/2026 11:48",
  },
  {
    hostname: "NB-ENG-007",
    ip: "192.168.50.17",
    department: "วิศวกรรม",
    user: "ธนากร",
    type: "Notebook",
    status: "Need Update",
    updates: 3,
    lastScan: "18/09/2026 12:10",
  },
  {
    hostname: "PC-ADMIN-006",
    ip: "192.168.10.33",
    department: "IT",
    user: "ปฏิบัติการ",
    type: "PC / Desktop",
    status: "Restart Required",
    updates: 2,
    lastScan: "18/09/2026 13:05",
  },
  {
    hostname: "PC-QC-014",
    ip: "192.168.30.61",
    department: "ตรวจสอบคุณภาพ",
    user: "ศิริพร",
    type: "PC / Desktop",
    status: "Need Update",
    updates: 4,
    lastScan: "18/09/2026 14:22",
  },
  {
    hostname: "NB-FIN-002",
    ip: "192.168.10.78",
    department: "การเงิน",
    user: "รัตนา",
    type: "Notebook",
    status: "Need Update",
    updates: 3,
    lastScan: "18/09/2026 14:50",
  },
  {
    hostname: "PC-MAINT-008",
    ip: "192.168.40.22",
    department: "ซ่อมบำรุง",
    user: "ประเสริฐ",
    type: "PC / Desktop",
    status: "Restart Required",
    updates: 1,
    lastScan: "18/09/2026 15:12",
  },
];

function formatDuration(hours: number) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return days > 0
    ? `${days} วัน ${remainingHours} ชม.`
    : `${remainingHours} ชม.`;
}

function StatusBadge({ status }: { status: UpdateDevice["status"] }) {
  const restart = status === "Restart Required";

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold " +
        (restart
          ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
          : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200")
      }
    >
      {restart ? "Restart Required" : "Need Update"}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "overflow-hidden rounded-xl border bg-background shadow-sm " + className
      }
    >
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "danger" | "success" | "warning" | "info";
}) {
  const tones = {
    neutral: "bg-slate-50 text-slate-600",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    info: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
            tones[tone]
          }
        >
          {icon}
        </div>
        {tone === "danger" ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : null}
      </div>
      <div className="mt-4 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div
        className={
          "mt-1 text-[11px] " +
          (tone === "danger" ? "text-red-500" : "text-muted-foreground")
        }
      >
        {detail}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (number) => (
          <Button
            key={number}
            variant={page === number ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(number)}
          >
            {number}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function OfflineTable({ search }: { search: string }) {
  const filtered = devices.filter((device) =>
    [device.hostname, device.ip, device.department, device.user]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <SectionCard
      title="เครื่องที่ไม่ Online นานที่สุด"
      icon={<WifiOff className="h-4 w-4 text-red-500" />}
      action={
        <span className="text-xs text-muted-foreground">
          แสดง {Math.min(filtered.length, 8)} จาก {filtered.length} เครื่อง
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3">Hostname</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">แผนก</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">ผู้ใช้งาน</th>
              <th className="px-4 py-3 text-right">ไม่ Online นาน</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((device, index) => (
              <tr key={device.hostname} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium">{device.hostname}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {device.ip}
                </td>
                <td className="px-4 py-3">{device.department}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    {device.type === "Notebook" ? (
                      <Laptop className="h-3.5 w-3.5 text-violet-500" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    {device.type === "Notebook" ? "Notebook" : "PC"}
                  </span>
                </td>
                <td className="px-4 py-3">{device.user}</td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                    {device.offlineDays} วัน
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3">
        <Button variant="ghost" size="sm" className="text-xs">
          ดูทั้งหมด <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </SectionCard>
  );
}

function DepartmentTable() {
  return (
    <SectionCard
      title="สรุปการใช้งานคอมพิวเตอร์ / โน้ตบุ๊ก แยกตามแผนก"
      icon={<Monitor className="h-4 w-4 text-blue-600" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3">แผนก</th>
              <th className="px-4 py-3 text-right">PC / Desktop</th>
              <th className="px-4 py-3 text-right">Notebook</th>
              <th className="px-4 py-3 text-right">รวมทั้งหมด</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {departments.map((department, index) => (
              <tr key={department.name} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-2.5 font-medium">{department.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {department.pc}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {department.notebook}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                  {department.pc + department.notebook}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 font-semibold">
            <tr>
              <td colSpan={2} className="px-4 py-3">
                รวมทั้งหมด
              </td>
              <td className="px-4 py-3 text-right">175</td>
              <td className="px-4 py-3 text-right">74</td>
              <td className="px-4 py-3 text-right">249</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

function CameraStatusChart() {
  return (
    <SectionCard
      title="สรุปจำนวนกล้องในโรงงาน"
      icon={<Camera className="h-4 w-4 text-emerald-600" />}
    >
      <div className="flex items-center gap-6 p-5">
        <div
          className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "conic-gradient(#10b981 0deg 345deg, #ef4444 345deg 360deg)",
          }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-background">
            <span className="text-[10px] text-muted-foreground">ทั้งหมด</span>
            <span className="text-2xl font-bold">48</span>
            <span className="text-[10px] text-muted-foreground">ตัว</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <LegendRow label="ใช้งานปกติ" value="46" percent="95.8%" tone="success" />
          <LegendRow label="ไม่ Online" value="2" percent="4.2%" tone="danger" />
          <LegendRow label="ออฟไลน์ (ชั่วคราว)" value="0" percent="0.0%" tone="info" />
          <LegendRow label="ข้อผิดพลาด" value="0" percent="0.0%" tone="warning" />
        </div>
      </div>
    </SectionCard>
  );
}

function LegendRow({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: string;
  tone: "success" | "danger" | "info" | "warning";
}) {
  const dots = {
    success: "bg-emerald-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${dots[tone]}`} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="w-12 text-right text-muted-foreground">{percent}</span>
    </div>
  );
}

function CameraSiteTable() {
  return (
    <SectionCard
      title="จำนวนกล้อง แยกตามพื้นที่ / Site"
      icon={<HardDrive className="h-4 w-4 text-blue-600" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-sm">
          <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">โรงงาน / Site</th>
              <th className="px-4 py-3 text-right">จำนวนกล้อง</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {camerasBySite.map((site) => (
              <tr key={site.name} className="hover:bg-muted/20">
                <td className="px-4 py-3">{site.name}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {site.count}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 font-semibold">
            <tr>
              <td className="px-4 py-3">รวมทั้งหมด</td>
              <td className="px-4 py-3 text-right">48</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

function OfflineCameraTable() {
  return (
    <SectionCard
      title="กล้องที่ Offline นานที่สุด"
      icon={<AlertCircle className="h-4 w-4 text-red-500" />}
      action={
        <Button variant="ghost" size="sm" className="text-xs">
          ดูทั้งหมด <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3">กล้อง</th>
              <th className="px-4 py-3">NVR</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3 text-right">Offline นาน</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cameras.map((camera, index) => (
              <tr key={camera.name} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-2.5 font-medium">{camera.name}</td>
                <td className="px-4 py-2.5">{camera.nvr}</td>
                <td className="px-4 py-2.5">{camera.site}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                    {formatDuration(camera.offlineHours)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function WindowsUpdateTable({ search }: { search: string }) {
  const filtered = updates.filter((device) =>
    [device.hostname, device.ip, device.department, device.user, device.type]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <SectionCard
      title="เครื่องที่ต้องอัปเดต Windows"
      icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
      action={
        <span className="text-xs text-muted-foreground">
          แสดง {filtered.length} เครื่อง
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3">Hostname</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">แผนก</th>
              <th className="px-4 py-3">ผู้ใช้ (ผู้รับผิดชอบ)</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-center">จำนวน Update</th>
              <th className="px-4 py-3">ตรวจพบเมื่อ</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((device, index) => (
              <tr key={device.hostname} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>
                <td className="px-4 py-3 font-medium">{device.hostname}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {device.ip}
                </td>
                <td className="px-4 py-3">{device.department}</td>
                <td className="px-4 py-3">{device.user}</td>
                <td className="px-4 py-3 text-xs">
                  {device.type === "Notebook" ? "Notebook" : "PC / Desktop"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums">
                  {device.updates}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {device.lastScan}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="text-xs">
                    ดูรายละเอียด
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-muted-foreground">
          แสดง {rows.length} จาก {filtered.length} เครื่อง
        </span>
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </SectionCard>
  );
}

function WindowsUpdateSummary() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="เครื่องที่ต้องอัปเดต (ทั้งหมด)"
          value="42"
          detail="จากทั้งหมด 350 เครื่อง"
          tone="danger"
        />
        <KpiCard
          icon={<HardDrive className="h-5 w-5" />}
          label="เครื่องที่ต้อง Restart"
          value="15"
          detail="จากทั้งหมด 350 เครื่อง"
          tone="warning"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="อัปเดตเรียบร้อย"
          value="287"
          detail="จากทั้งหมด 350 เครื่อง"
          tone="success"
        />
        <KpiCard
          icon={<Monitor className="h-5 w-5" />}
          label="ออฟไลน์ / ตรวจสอบไม่ได้"
          value="6"
          detail="จากทั้งหมด 350 เครื่อง"
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]">
        <WindowsUpdateTable search="" />
        <SectionCard
          title="สรุปเครื่องที่ต้องอัปเดตตามแผนก"
          icon={<Monitor className="h-4 w-4 text-blue-600" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[430px] text-sm">
              <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">แผนก</th>
                  <th className="px-4 py-3 text-right">PC</th>
                  <th className="px-4 py-3 text-right">Notebook</th>
                  <th className="px-4 py-3 text-right">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["ฝ่ายผลิต", 7, 3],
                  ["การตลาด", 5, 4],
                  ["การเงิน", 4, 3],
                  ["คลังสินค้า", 3, 2],
                  ["วิศวกรรม", 3, 2],
                  ["IT", 2, 1],
                  ["อื่นๆ", 2, 1],
                ].map(([name, pc, notebook]) => (
                  <tr key={String(name)} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">{name}</td>
                    <td className="px-4 py-2.5 text-right">{pc}</td>
                    <td className="px-4 py-2.5 text-right">{notebook}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {Number(pc) + Number(notebook)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t bg-red-50/60 px-4 py-3 text-xs text-red-700">
            รายงานนี้แสดงเฉพาะเครื่องที่มี Windows Update ค้าง หรือจำเป็นต้อง
            Restart
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("ทั้งหมด");
  const [dateRange, setDateRange] = useState("18/09/2026 - 18/09/2026");

  const totalDevices = useMemo(
    () => departments.reduce((sum, item) => sum + item.pc + item.notebook, 0),
    [],
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearch("");
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="text-foreground">Reports</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            รายงานสรุปข้อมูลอุปกรณ์และสถานะการใช้งานในระบบ
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-10 w-full pl-9 sm:w-[220px]"
              aria-label="Date range"
            />
          </label>
          <select
            value={site}
            onChange={(event) => setSite(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm sm:w-[150px]"
          >
            <option>ทั้งหมด</option>
            <option>โรงงาน 1</option>
            <option>โรงงาน 2</option>
            <option>สำนักงานใหญ่</option>
            <option>คลังสินค้า</option>
          </select>
          <Button className="h-10">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto border-b">
        <nav className="flex min-w-max items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={
                "relative px-3 py-3 text-xs font-medium transition-colors " +
                (activeTab === tab.id
                  ? "text-blue-600"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {tab.label}
              {activeTab === tab.id ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Monitor className="h-5 w-5" />}
              label="เครื่องที่ไม่ Online นาน"
              value="12"
              detail={`จากทั้งหมด ${totalDevices + 113} เครื่อง`}
              tone="danger"
            />
            <KpiCard
              icon={<Monitor className="h-5 w-5" />}
              label="PC / Desktop ทั้งหมด"
              value="175"
              detail="จากข้อมูลอุปกรณ์ทั้งหมด"
              tone="info"
            />
            <KpiCard
              icon={<Laptop className="h-5 w-5" />}
              label="Notebook ทั้งหมด"
              value="74"
              detail="จากข้อมูลอุปกรณ์ทั้งหมด"
              tone="info"
            />
            <KpiCard
              icon={<Camera className="h-5 w-5" />}
              label="จำนวนกล้องทั้งหมด"
              value="48"
              detail="Online 46 / Offline 2"
              tone="success"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <OfflineTable search={search} />
            <DepartmentTable />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr]">
            <CameraStatusChart />
            <CameraSiteTable />
            <OfflineCameraTable />
          </div>
        </>
      ) : null}

      {activeTab === "offline" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<WifiOff className="h-5 w-5" />}
              label="Offline นานกว่า 7 วัน"
              value="12"
              detail="เครื่อง"
              tone="danger"
            />
            <KpiCard
              icon={<WifiOff className="h-5 w-5" />}
              label="Offline นานกว่า 30 วัน"
              value="2"
              detail="เครื่อง"
              tone="danger"
            />
            <KpiCard
              icon={<Monitor className="h-5 w-5" />}
              label="PC Offline"
              value="8"
              detail="เครื่อง"
              tone="warning"
            />
            <KpiCard
              icon={<Laptop className="h-5 w-5" />}
              label="Notebook Offline"
              value="4"
              detail="เครื่อง"
              tone="warning"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา Hostname / IP / แผนก / ผู้ใช้"
                className="pl-9"
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <OfflineTable search={search} />
        </>
      ) : null}

      {activeTab === "department" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              icon={<Monitor className="h-5 w-5" />}
              label="PC / Desktop"
              value="175"
              detail="70.3% ของทั้งหมด"
              tone="info"
            />
            <KpiCard
              icon={<Laptop className="h-5 w-5" />}
              label="Notebook"
              value="74"
              detail="29.7% ของทั้งหมด"
              tone="info"
            />
            <KpiCard
              icon={<Server className="h-5 w-5" />}
              label="รวมอุปกรณ์"
              value="249"
              detail="8 แผนก"
              tone="success"
            />
          </div>
          <DepartmentTable />
        </>
      ) : null}

      {activeTab === "pc" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              icon={<Monitor className="h-5 w-5" />}
              label="PC / Desktop"
              value="175"
              detail="70.3%"
              tone="info"
            />
            <KpiCard
              icon={<Laptop className="h-5 w-5" />}
              label="Notebook"
              value="74"
              detail="29.7%"
              tone="info"
            />
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Online"
              value="237"
              detail="95.2%"
              tone="success"
            />
          </div>
          <SectionCard
            title="PC / Notebook Usage"
            icon={<Monitor className="h-4 w-4 text-blue-600" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Hostname</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">แผนก</th>
                    <th className="px-4 py-3">ประเภท</th>
                    <th className="px-4 py-3">ผู้ใช้งาน</th>
                    <th className="px-4 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {devices.map((device) => (
                    <tr key={device.hostname} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{device.hostname}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {device.ip}
                      </td>
                      <td className="px-4 py-3">{device.department}</td>
                      <td className="px-4 py-3">{device.type}</td>
                      <td className="px-4 py-3">{device.user}</td>
                      <td className="px-4 py-3">
                        {device.offlineDays > 0 ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                            Offline
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                            Online
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}

      {activeTab === "camera" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Camera className="h-5 w-5" />}
              label="กล้องทั้งหมด"
              value="48"
              detail="ทุก Site"
              tone="info"
            />
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Online"
              value="46"
              detail="95.8%"
              tone="success"
            />
            <KpiCard
              icon={<WifiOff className="h-5 w-5" />}
              label="Offline"
              value="2"
              detail="4.2%"
              tone="danger"
            />
            <KpiCard
              icon={<Server className="h-5 w-5" />}
              label="NVR"
              value="10"
              detail="อุปกรณ์"
              tone="info"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <CameraStatusChart />
            <CameraSiteTable />
          </div>
          <OfflineCameraTable />
        </>
      ) : null}

      {activeTab === "windows" ? (
        <>
          <WindowsUpdateSummary />
        </>
      ) : null}

      <div className="flex items-center justify-between border-t pt-4 text-[11px] text-muted-foreground">
        <span>อัปเดตล่าสุด: 18/09/2026 15:42 น.</span>
        <span>ข้อมูลจากระบบ Infrastructure Monitor</span>
      </div>
    </div>
  );
}
