"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  HardDrive,
  Camera,
  Plus,
  RefreshCw,
  Save,
  Server,
  Shield,
  Trash2,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NvrConfig = {
  id: string;
  name: string;
  host: string;
  port?: number;
  protocol?: "http" | "https";
  username: string;
  password: string;
  site?: string;
};

type Form = Record<string, string>;
type Tab = "overview" | "network" | "time" | "users" | "storage" | "cameras";

const TABS: [Tab, string, any][] = [
  ["overview", "Overview", Server],
  ["network", "Network", Wifi],
  ["time", "Date & Time", Clock],
  ["users", "Users", Shield],
  ["storage", "Storage", HardDrive],
  ["cameras", "Camera", Camera],
];

const ENDPOINTS: Record<Exclude<Tab, "overview">, string> = {
  network: "/ISAPI/System/Network/interfaces",
  time: "/ISAPI/System/time",
  users: "/ISAPI/Security/users",
  storage: "/ISAPI/ContentMgmt/Storage/hdd",
  cameras: "/ISAPI/ContentMgmt/InputProxy/channels",
};

const XML_NS = "http://www.hikvision.com/ver20/XMLSchema";

export default function Page() {
  const [nvrs, setNvrs] = useState<NvrConfig[]>([]);
  const [selected, setSelected] = useState("");
  const [nvr, setNvr] = useState<NvrConfig | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>({});
  const [rows, setRows] = useState<Form[]>([]);

  const load = async () => {
    const response = await fetch("/api/hikvision/config", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || "โหลด Config ไม่สำเร็จ");
    }
    const list = json.data?.nvrs || [];
    setNvrs(list);
    if (!selected && list[0]) setSelected(list[0].id);
  };

  const call = async (
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body = "",
  ) => {
    const response = await fetch("/api/hikvision/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nvrId: selected, method, path, body }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || "NVR request failed");
    }
    return json.data?.body || "";
  };

  const text = (root: Document | Element, name: string, fallback = "") => {
    const node = Array.from(root.getElementsByTagName("*")).find(
      (item) => item.localName === name,
    );
    return node?.textContent?.trim() || fallback;
  };

  const read = async () => {
    if (!selected || tab === "overview") return;
    setBusy(true);
    setError("");
    try {
      const xml = await call("GET", ENDPOINTS[tab]);
      const doc = new DOMParser().parseFromString(xml, "application/xml");

      if (tab === "network") {
        const iface =
          Array.from(doc.getElementsByTagName("*")).find(
            (item) => item.localName === "NetworkInterface",
          ) || doc;
        setForm({
          id: text(iface, "id", "1"),
          addressingType: text(iface, "addressingType", "static"),
          ipAddress: text(iface, "ipAddress"),
          subnetMask: text(iface, "subnetMask"),
          gateway: text(iface, "DefaultGateway"),
          primaryDns: text(iface, "PrimaryDNS"),
          secondaryDns: text(iface, "SecondaryDNS"),
          mac: text(iface, "MACAddress"),
        });
      }

      if (tab === "time") {
        setForm({
          timeMode: text(doc, "timeMode", "NTP"),
          localTime: text(doc, "localTime"),
          timeZone: text(doc, "timeZone", "ICT-7"),
          ntpServer: text(doc, "address", "pool.ntp.org"),
        });
      }

      if (tab === "users") {
        const users = Array.from(doc.getElementsByTagName("*")).filter(
          (item) => item.localName === "User",
        );
        setRows(
          users.map((item, index) => ({
            id: text(item, "id", String(index + 1)),
            userName: text(item, "userName"),
            userLevel: text(item, "userLevel", "Viewer"),
          })),
        );
      }

      if (tab === "storage") {
        const hdds = Array.from(doc.getElementsByTagName("*")).filter(
          (item) => item.localName === "hdd",
        );
        setRows(
          hdds.map((item, index) => ({
            id: text(item, "id", String(index + 1)),
            name: text(item, "name", "HDD " + (index + 1)),
            status: text(item, "status", "unknown"),
            capacity: text(item, "capacity", "0"),
            freeSpace: text(item, "freeSpace", "0"),
          })),
        );
      }

      if (tab === "cameras") {
        const cameras = Array.from(doc.getElementsByTagName("*")).filter(
          (item) => item.localName === "InputProxyChannel",
        );
        setRows(
          cameras.map((item) => ({
            id: text(item, "id"),
            name: text(item, "name"),
            ipAddress: text(item, "ipAddress"),
            managePortNo: text(item, "managePortNo", "8000"),
            userName: text(item, "userName"),
          })),
        );
      }

      setMessage("อ่านค่าจาก NVR สำเร็จ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "อ่านข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const found = nvrs.find((item) => item.id === selected);
    setNvr(found ? { ...found, password: "" } : null);
    setForm({});
    setRows([]);
    if (selected && tab !== "overview") void read();
  }, [selected, tab]);

  const update = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addCamera = async (camera: Form) => {
    if (!selected || !camera.channel) return;
    setBusy(true);
    setError("");
    try {
      if (!camera.ipAddress || !camera.userName || !camera.password) {
        throw new Error("กรุณากรอก IP Address, Username และ Password ให้ครบ");
      }

      const xml = newCameraXml(camera);
      await call("POST", "/ISAPI/ContentMgmt/InputProxy/channels", xml);

      setMessage("เพิ่ม Camera สำเร็จ");
      await read();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เพิ่ม Camera ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const saveCamera = async (camera: Form) => {
    if (!selected || !camera.id) return;
    if (camera.id === "new") return addCamera(camera);
    setBusy(true);
    setError("");
    try {
      // Hikvision InputProxyChannel is firmware/model sensitive.
      // Read the exact XML from the NVR first, change only the requested
      // fields, and PUT the same document back. This avoids sending a
      // hand-built partial schema that the NVR may reject.
      const currentXml = await call(
        "GET",
        "/ISAPI/ContentMgmt/InputProxy/channels/" + encodeURIComponent(camera.id),
      );

      const doc = new DOMParser().parseFromString(currentXml, "application/xml");
      if (doc.querySelector("parsererror")) {
        throw new Error("NVR returned invalid Camera Channel XML.");
      }

      const all = Array.from(doc.getElementsByTagName("*"));
      const find = (name: string) =>
        all.find((node) => node.localName === name) ?? null;

      const setExisting = (name: string, value: string, required = false) => {
        const node = find(name);
        if (node) {
          node.textContent = value;
          return node;
        }
        if (required) throw new Error("NVR XML does not contain <" + name + ">.");
        return null;
      };

      setExisting("name", camera.name || "");
      setExisting("ipAddress", camera.ipAddress || "");
      setExisting("managePortNo", camera.managePortNo || "8000");
      setExisting("userName", camera.userName || "");

      // Blank password means keep the password already stored on the NVR.
      if (camera.password) {
        setExisting("password", camera.password);
      }

      // Hikvision devices can reject an XML declaration as an extra root/tag.
      // Serialize the existing document and explicitly remove the declaration.
      let xml = new XMLSerializer().serializeToString(doc).trim();
      xml = xml.replace(/^<\?xml[^>]*\?>\s*/i, "");

      await call(
        "PUT",
        "/ISAPI/ContentMgmt/InputProxy/channels/" + encodeURIComponent(camera.id),
        xml,
      );

      setMessage("บันทึก Camera สำเร็จ");
      await read();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึก Camera ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const saveRequest = async (
    path: string,
    body: string,
    successMessage: string,
    method: "PUT" | "POST" | "DELETE" = "PUT",
  ) => {
    setBusy(true);
    setError("");
    try {
      await call(method, path, body);
      setMessage(successMessage);
      await read();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const saveNvr = async () => {
    if (!nvr) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hikvision/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nvr,
          type: "nvr",
          port: Number(nvr.port || 80),
          password: nvr.password || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "บันทึกไม่สำเร็จ");
      }
      setMessage("บันทึก Connection สำเร็จ");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hikvision NVR Management</h1>
          <p className="text-sm text-muted-foreground">
            จัดการ NVR จริงด้วย GUI Form ไม่ต้องกรอก XML
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[270px_1fr]">
        <aside className="rounded-xl border p-4">
          <div className="mb-3 text-xs font-semibold text-muted-foreground">
            NVR DEVICES
          </div>
          {nvrs.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelected(item.id);
                setTab("overview");
              }}
              className={
                "mb-2 w-full rounded-xl border p-3 text-left " +
                (selected === item.id ? "bg-muted" : "hover:bg-muted/50")
              }
            >
              <b>{item.name || item.id}</b>
              <div className="font-mono text-xs">
                {item.host}:{item.port || 80}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.site || "-"}
              </div>
            </button>
          ))}
        </aside>

        <main className="rounded-xl border">
          <div className="border-b p-5">
            {nvr ? (
              <>
                <h2 className="text-xl font-semibold">{nvr.name || nvr.id}</h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {nvr.protocol || "http"}://{nvr.host}:{nvr.port || 80}
                </p>
              </>
            ) : (
              <span>เลือก NVR</span>
            )}
          </div>

          {nvr && (
            <>
              <nav className="flex overflow-x-auto border-b">
                {TABS.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={
                      "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm " +
                      (tab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>

              <div className="p-5">
                {tab === "overview" && (
                  <Card
                    title="NVR Connection"
                    desc="ข้อมูลที่ระบบ Monitor ใช้เชื่อมต่อ NVR"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {field("NVR ID", <Input disabled value={nvr.id} />)}
                      {field(
                        "Name",
                        <Input
                          value={nvr.name}
                          onChange={(e) =>
                            setNvr({ ...nvr, name: e.target.value })
                          }
                        />,
                      )}
                      {field(
                        "Host / IP",
                        <Input
                          value={nvr.host}
                          onChange={(e) =>
                            setNvr({ ...nvr, host: e.target.value })
                          }
                        />,
                      )}
                      {field(
                        "Protocol",
                        <Select
                          value={nvr.protocol || "http"}
                          onChange={(value) =>
                            setNvr({
                              ...nvr,
                              protocol: value as "http" | "https",
                            })
                          }
                          options={["http", "https"]}
                        />,
                      )}
                      {field(
                        "Port",
                        <Input
                          type="number"
                          value={nvr.port || 80}
                          onChange={(e) =>
                            setNvr({ ...nvr, port: Number(e.target.value) })
                          }
                        />,
                      )}
                      {field(
                        "Site",
                        <Input
                          value={nvr.site || ""}
                          onChange={(e) =>
                            setNvr({ ...nvr, site: e.target.value })
                          }
                        />,
                      )}
                      {field(
                        "Username",
                        <Input
                          value={nvr.username}
                          onChange={(e) =>
                            setNvr({ ...nvr, username: e.target.value })
                          }
                        />,
                      )}
                      {field(
                        "Password",
                        <Input
                          type="password"
                          placeholder="ว่าง = ใช้รหัสเดิม"
                          value={nvr.password}
                          onChange={(e) =>
                            setNvr({ ...nvr, password: e.target.value })
                          }
                        />,
                      )}
                    </div>
                    <Actions busy={busy} save={() => void saveNvr()} />
                  </Card>
                )}

                {tab === "network" && (
                  <NetworkForm
                    data={form}
                    update={update}
                    busy={busy}
                    save={() =>
                      void saveRequest(
                        "/ISAPI/System/Network/interfaces/" +
                          encodeURIComponent(form.id || "1"),
                        networkXml(form),
                        "บันทึก Network สำเร็จ",
                      )
                    }
                  />
                )}

                {tab === "time" && (
                  <TimeForm
                    data={form}
                    update={update}
                    busy={busy}
                    save={() =>
                      void saveRequest(
                        "/ISAPI/System/time",
                        timeXml(form),
                        "บันทึก Date & Time สำเร็จ",
                      )
                    }
                  />
                )}

                {tab === "users" && (
                  <UsersForm
                    rows={rows}
                    busy={busy}
                    save={(user) => {
                      const path =
                        user.id === "new"
                          ? "/ISAPI/Security/users"
                          : "/ISAPI/Security/users/" + user.id;
                      void saveRequest(
                        path,
                        userXml(user),
                        user.id === "new"
                          ? "เพิ่ม User สำเร็จ"
                          : "แก้ไข User สำเร็จ",
                        user.id === "new" ? "POST" : "PUT",
                      );
                    }}
                    del={(user) =>
                      void saveRequest(
                        "/ISAPI/Security/users/" + user.id,
                        "",
                        "ลบ User สำเร็จ",
                        "DELETE",
                      )
                    }
                  />
                )}

                {tab === "storage" && <StorageForm rows={rows} />}

                {tab === "cameras" && (
                  <CamerasForm
                    rows={rows}
                    busy={busy}
                    save={(camera) => void saveCamera(camera)}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function field(label: string, child: ReactNode) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {child}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function NetworkForm({
  data,
  update,
  busy,
  save,
}: {
  data: Form;
  update: (key: string, value: string) => void;
  busy: boolean;
  save: () => void;
}) {
  return (
    <Card title="Network" desc="แก้ไข IPv4, Gateway และ DNS ของ NVR">
      <div className="grid gap-4 md:grid-cols-2">
        {field(
          "Addressing Type",
          <Select
            value={data.addressingType || "static"}
            onChange={(value) => update("addressingType", value)}
            options={["static", "dhcp"]}
          />,
        )}
        {field("MAC Address", <Input disabled value={data.mac || ""} />)}
        {field(
          "IP Address",
          <Input
            disabled={data.addressingType === "dhcp"}
            value={data.ipAddress || ""}
            onChange={(e) => update("ipAddress", e.target.value)}
          />,
        )}
        {field(
          "Subnet Mask",
          <Input
            disabled={data.addressingType === "dhcp"}
            value={data.subnetMask || ""}
            onChange={(e) => update("subnetMask", e.target.value)}
          />,
        )}
        {field(
          "Gateway",
          <Input
            disabled={data.addressingType === "dhcp"}
            value={data.gateway || ""}
            onChange={(e) => update("gateway", e.target.value)}
          />,
        )}
        {field(
          "Primary DNS",
          <Input
            value={data.primaryDns || ""}
            onChange={(e) => update("primaryDns", e.target.value)}
          />,
        )}
        {field(
          "Secondary DNS",
          <Input
            value={data.secondaryDns || ""}
            onChange={(e) => update("secondaryDns", e.target.value)}
          />,
        )}
      </div>
      <Warn text="การเปลี่ยน IP อาจทำให้ NVR หลุดจากระบบทันที" />
      <Actions busy={busy} save={save} />
    </Card>
  );
}

function TimeForm({
  data,
  update,
  busy,
  save,
}: {
  data: Form;
  update: (key: string, value: string) => void;
  busy: boolean;
  save: () => void;
}) {
  return (
    <Card title="Date & Time" desc="ตั้ง Time Zone และ NTP">
      <div className="grid gap-4 md:grid-cols-2">
        {field(
          "Time Mode",
          <Select
            value={data.timeMode || "NTP"}
            onChange={(value) => update("timeMode", value)}
            options={["NTP", "manual"]}
          />,
        )}
        {field(
          "Time Zone",
          <Input
            value={data.timeZone || ""}
            onChange={(e) => update("timeZone", e.target.value)}
          />,
        )}
        {field(
          "NTP Server",
          <Input
            disabled={data.timeMode !== "NTP"}
            value={data.ntpServer || ""}
            onChange={(e) => update("ntpServer", e.target.value)}
          />,
        )}
        {field(
          "Local Time",
          <Input
            type="datetime-local"
            disabled={data.timeMode === "NTP"}
            value={(data.localTime || "").slice(0, 16)}
            onChange={(e) => update("localTime", e.target.value)}
          />,
        )}
      </div>
      <Actions busy={busy} save={save} />
    </Card>
  );
}

function UsersForm({
  rows,
  busy,
  save,
  del,
}: {
  rows: Form[];
  busy: boolean;
  save: (user: Form) => void;
  del: (user: Form) => void;
}) {
  const [edit, setEdit] = useState<Form | null>(null);

  return (
    <Card title="Users" desc="เพิ่ม แก้ไข และลบ User บน NVR จริง">
      <div className="flex justify-end">
        <Button
          onClick={() =>
            setEdit({
              id: "new",
              userName: "",
              userLevel: "Viewer",
              password: "",
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Table headers={["ID", "Username", "Level", "Action"]}>
        {rows.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.userName}</td>
            <td>{user.userLevel}</td>
            <td className="space-x-2 text-right">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEdit({ ...user, password: "" })}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || user.userName?.toLowerCase() === "admin"}
                onClick={() => {
                  if (confirm("ลบ " + user.userName + " จาก NVR จริง?")) {
                    del(user);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        ))}
      </Table>

      {edit && (
        <Editor title={edit.id === "new" ? "Add User" : "Edit " + edit.userName}>
          {field(
            "Username",
            <Input
              disabled={edit.id !== "new"}
              value={edit.userName || ""}
              onChange={(e) =>
                setEdit({ ...edit, userName: e.target.value })
              }
            />,
          )}
          {field(
            "Password",
            <Input
              type="password"
              value={edit.password || ""}
              onChange={(e) => setEdit({ ...edit, password: e.target.value })}
            />,
          )}
          {field(
            "User Level",
            <Select
              value={edit.userLevel || "Viewer"}
              onChange={(value) => setEdit({ ...edit, userLevel: value })}
              options={["Administrator", "Operator", "Viewer"]}
            />,
          )}
          <Actions
            busy={busy}
            save={() => {
              save(edit);
              setEdit(null);
            }}
            cancel={() => setEdit(null)}
          />
        </Editor>
      )}
    </Card>
  );
}

function StorageForm({ rows }: { rows: Form[] }) {
  return (
    <Card title="Storage / HDD" desc="ข้อมูล HDD จาก NVR">
      <Table headers={["HDD", "Status", "Capacity", "Free"]}>
        {rows.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.status}</td>
            <td>{item.capacity}</td>
            <td>{item.freeSpace}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function CamerasForm({
  rows,
  busy,
  save,
}: {
  rows: Form[];
  busy: boolean;
  save: (camera: Form) => void;
}) {
  const [edit, setEdit] = useState<Form | null>(null);

  const nextChannel = () => {
    const used = rows
      .map((row) => Number(row.id))
      .filter((value) => Number.isInteger(value) && value > 0);
    return String((used.length ? Math.max(...used) : 0) + 1);
  };

  return (
    <Card
      title="Camera Channels"
      desc="เพิ่ม แก้ชื่อ IP Port และ Username ของ Camera Channel"
    >
      <div className="flex justify-end">
        <Button
          disabled={busy}
          onClick={() =>
            setEdit({
              id: "new",
              channel: nextChannel(),
              name: "",
              ipAddress: "",
              managePortNo: "8000",
              userName: "",
              password: "",
              protocolType: "HIKVISION",
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Camera
        </Button>
      </div>

      <Table headers={["CH", "Name", "IP", "Port", "Username", "Action"]}>
        {rows.map((camera) => (
          <tr key={camera.id}>
            <td>{camera.id}</td>
            <td>{camera.name}</td>
            <td className="font-mono text-xs">{camera.ipAddress || "-"}</td>
            <td>{camera.managePortNo}</td>
            <td>{camera.userName}</td>
            <td className="text-right">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEdit({ ...camera, password: "" })}
              >
                Edit
              </Button>
            </td>
          </tr>
        ))}
      </Table>

      {edit && (
        <Editor
          title={
            edit.id === "new"
              ? "Add Camera Channel"
              : "Edit Camera Channel " + edit.id
          }
        >
          {edit.id === "new" && (
            <div className="grid gap-4 md:grid-cols-2">
              {field(
                "Channel No.",
                <Input
                  type="number"
                  min={1}
                  value={edit.channel || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, channel: e.target.value })
                  }
                />,
              )}
              {field(
                "Protocol",
                <Select
                  value={edit.protocolType || "HIKVISION"}
                  onChange={(value) =>
                    setEdit({ ...edit, protocolType: value })
                  }
                  options={["HIKVISION", "ONVIF"]}
                />,
              )}
            </div>
          )}
          {field(
            "Name",
            <Input
              value={edit.name || ""}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />,
          )}
          {field(
            "IP Address",
            <Input
              value={edit.ipAddress || ""}
              onChange={(e) =>
                setEdit({ ...edit, ipAddress: e.target.value })
              }
            />,
          )}
          {field(
            "Port",
            <Input
              value={edit.managePortNo || "8000"}
              onChange={(e) =>
                setEdit({ ...edit, managePortNo: e.target.value })
              }
            />,
          )}
          {field(
            "Username",
            <Input
              value={edit.userName || ""}
              onChange={(e) => setEdit({ ...edit, userName: e.target.value })}
            />,
          )}
          {field(
            "Password",
            <Input
              type="password"
              placeholder={
                edit.id === "new" ? "" : "ว่าง = ใช้รหัสเดิม"
              }
              value={edit.password || ""}
              onChange={(e) => setEdit({ ...edit, password: e.target.value })}
            />,
          )}
          <Actions
            busy={busy}
            save={() => {
              save(edit);
              setEdit(null);
            }}
            cancel={() => setEdit(null)}
          />
        </Editor>
      )}
    </Card>
  );
}

function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

function Editor({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <b>{title}</b>
      {children}
    </div>
  );
}

function Actions({
  busy,
  save,
  cancel,
}: {
  busy?: boolean;
  save: () => void;
  cancel?: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      {cancel && (
        <Button variant="outline" disabled={busy} onClick={cancel}>
          Cancel
        </Button>
      )}
      <Button disabled={busy} onClick={save}>
        <Save className="mr-2 h-4 w-4" />
        {busy ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function Warn({ text: message }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      {message}
    </div>
  );
}

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function networkXml(x: Form) {
  return (
    '<NetworkInterface version="2.0" xmlns="' +
    XML_NS +
    '">' +
    "<id>" +
    esc(x.id || "1") +
    "</id>" +
    "<IPAddress><ipVersion>v4</ipVersion>" +
    "<addressingType>" +
    esc(x.addressingType || "static") +
    "</addressingType>" +
    "<ipAddress>" +
    esc(x.ipAddress || "") +
    "</ipAddress>" +
    "<subnetMask>" +
    esc(x.subnetMask || "") +
    "</subnetMask>" +
    "<DefaultGateway><ipAddress>" +
    esc(x.gateway || "") +
    "</ipAddress></DefaultGateway>" +
    "<PrimaryDNS><ipAddress>" +
    esc(x.primaryDns || "") +
    "</ipAddress></PrimaryDNS>" +
    "<SecondaryDNS><ipAddress>" +
    esc(x.secondaryDns || "") +
    "</ipAddress></SecondaryDNS></IPAddress>" +
    "</NetworkInterface>"
  );
}

function timeXml(x: Form) {
  return (
    '<Time version="2.0" xmlns="' +
    XML_NS +
    '">' +
    "<timeMode>" +
    esc(x.timeMode || "NTP") +
    "</timeMode>" +
    "<localTime>" +
    esc(x.localTime || "") +
    "</localTime>" +
    "<timeZone>" +
    esc(x.timeZone || "ICT-7") +
    "</timeZone>" +
    "<NTPServer><address>" +
    esc(x.ntpServer || "pool.ntp.org") +
    "</address></NTPServer></Time>"
  );
}

function userXml(x: Form) {
  return (
    '<User version="2.0" xmlns="' +
    XML_NS +
    '">' +
    "<id>" +
    esc(x.id === "new" ? "" : x.id || "") +
    "</id>" +
    "<userName>" +
    esc(x.userName || "") +
    "</userName>" +
    (x.password ? "<password>" + esc(x.password) + "</password>" : "") +
    "<userLevel>" +
    esc(x.userLevel || "Viewer") +
    "</userLevel></User>"
  );
}

function newCameraXml(x: Form) {
  return (
    '<InputProxyChannel version="2.0" xmlns="' +
    XML_NS +
    '">' +
    "<id>" +
    esc(x.channel || "") +
    "</id>" +
    "<name>" +
    esc(x.name || "IPCamera " + (x.channel || "")) +
    "</name>" +
    "<sourceInputPortDescriptor>" +
    "<proxyProtocol><id>1</id><protocolType>" +
    esc(x.protocolType || "HIKVISION") +
    "</protocolType></proxyProtocol>" +
    "<addressingFormatType>ipaddress</addressingFormatType>" +
    "<ipAddress>" +
    esc(x.ipAddress || "") +
    "</ipAddress>" +
    "<managePortNo>" +
    esc(x.managePortNo || "8000") +
    "</managePortNo>" +
    "<srcInputPort>1</srcInputPort>" +
    "<userName>" +
    esc(x.userName || "") +
    "</userName>" +
    "<password>" +
    esc(x.password || "") +
    "</password>" +
    "</sourceInputPortDescriptor>" +
    "</InputProxyChannel>"
  );
}
