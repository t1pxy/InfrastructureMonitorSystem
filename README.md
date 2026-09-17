# Infrastructure Monitor System

Infrastructure Monitor System is a Next.js-based infrastructure dashboard for monitoring managed Windows computers from a read-only Microsoft SQL Server / StarCat database.

The project is designed around two main operational views:

- **Hardware Monitor** — inventory, online/offline state, CPU, RAM, disk usage, Windows version/build, user, department, location, and performance history.
- **Windows Update Center** — compares the Windows build reported by each managed computer against a locally generated Microsoft Windows production baseline and identifies machines that are current, need updates, are on an unsupported version, or cannot be evaluated.

The application is intended to be deployed internally and can run on Windows Server behind a reverse proxy such as Nginx.

---

## 1. Project Goals

The system is intended to provide a single dashboard for the infrastructure team to answer questions such as:

- Which managed computers are online or offline?
- What is the current CPU, RAM, and disk utilization of each machine?
- Which user, department, and location does a computer belong to?
- What Windows version and build is installed?
- Which machines are behind the current Microsoft production baseline?
- Which machines are already up to date?
- Which machines are on an unsupported Windows feature version?
- Can an administrator open the full hardware details for a machine directly from the Windows Update page?

The current database integration is intentionally **read-only**. The dashboard reads inventory and monitoring information from StarCat/MSSQL and does not use the application to modify the source database.

---

## 2. Current Feature Set

### Hardware Monitor

The `/hardware` page provides:

- Desktop and Notebook inventory
- Machine hostname
- IP address
- Logged-on user
- Department
- Location
- Manufacturer
- Model
- Serial number
- CPU name
- CPU utilization
- RAM utilization
- Total RAM
- Disk utilization
- Total disk capacity
- Windows version
- Windows build
- Agent version
- Last contact time
- Performance sample time
- Overall health status
- Search
- Device type filter
- Pagination
- Manual refresh
- Automatic refresh every 30 seconds

The hardware list is restricted to the organization's machine naming convention:

```text
YYRDT###   = Desktop
YYRNB###   = Notebook
```

Examples:

```text
22RDT107
22RDT108
22RNB025
25RNB041
```

The `RDT` / `RNB` convention is intentionally evaluated from the hostname. Other StarCat device types are excluded from the managed computer list.

### Hardware Detail

The route:

```text
/hardware/[id]
```

shows the full information for a selected machine, including:

- device type
- IP address
- disk utilization
- Windows version
- manufacturer
- model
- serial number
- CPU
- RAM
- disk capacity
- agent version
- user
- department
- location
- Windows build
- last contact
- performance sample time
- CPU/RAM/Disk performance history

A machine can be opened using its `AgentID` or hostname depending on the calling route.

### Windows Update Center

The `/update` page provides fleet-level Windows patch compliance.

The supported compliance states are:

| Status | Meaning |
|---|---|
| `ล่าสุด` | Current build is at or above the latest known production revision for that Windows feature version |
| `ต้องอัปเดต` | A newer production revision exists for the same Windows feature version |
| `หมดระยะรองรับ` | The Windows feature version is marked as ended in the generated baseline |
| `ไม่ทราบ` | Required build/version information is missing or cannot be matched safely |

The page also provides:

- total device count
- current device count
- update-required count
- unsupported-version count
- unknown count
- filtering by compliance state
- current build
- latest known build
- latest KB
- number of revisions behind
- machine IP address
- direct **ดูข้อมูลเครื่อง** action to open `/hardware/[id]`
- automatic data refresh every 5 minutes

---

## 3. High-Level Architecture

The application follows a layered architecture rather than placing SQL directly inside React components.

```text
┌────────────────────────────────────────────────────────────┐
│                      Browser / UI                          │
│                                                            │
│  /hardware                 /update                         │
│  HardwareTable             WindowsFleetComparison          │
│  Hardware Detail           Update filters / summary        │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                      │
│                                                            │
│  /api/hardware                                             │
│  /api/hardware/summary                                    │
│  /api/hardware/[id]                                       │
│  /api/hardware/[id]/performance                           │
│  /api/update                                               │
│  /api/update/summary                                      │
│  /api/update/[id]                                         │
│  /api/update/compliance                                   │
│  /api/update/release                                      │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                     Server-side Logic                      │
│                                                            │
│  src/lib/hardware/schema.ts                                │
│  src/lib/hardware/query.ts                                 │
│  src/lib/hardware/performance.ts                           │
│  src/lib/windows-update/compare.ts                         │
│  src/lib/db.ts                                             │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                    Microsoft SQL Server                    │
│                         StarCat10                          │
│                                                            │
│  TB_SYSTEMDEVICE                                           │
│  TB_USER                                                   │
│  TB_DEPARTMENT                                             │
│  TB_LOCATION                                               │
│  TB_COMPUTER                                               │
│  TB_INV_OS                                                 │
│  TB_INV_MACHINE                                            │
│  TB_INV_SYSTEM                                             │
│  TB_INV_DISK                                               │
│  TB_INV_WMICPU                                             │
│  TB_INV_NETWORK                                            │
│  TB_MONITORHISTORY                                         │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```

Windows release information follows a separate maintenance-time pipeline:

```text
Microsoft Windows Release Health
              │
              ▼
 scripts/build-windows-releases.mjs
              │
              ▼
 src/lib/windows-update/windows-releases.ts
              │
              ▼
 compareWindowsBuild()
              │
              ▼
 /api/update/compliance
              │
              ▼
 Windows Update Center
```

This means the dashboard does not need to call Microsoft's website every time a user opens the page.

---

## 4. Technology Stack

| Component | Technology |
|---|---|
| Framework | Next.js 16.3.5 |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui / Base UI components |
| Icons | Lucide React |
| Charts | Recharts |
| Database driver | `mssql` 12.x |
| Database | Microsoft SQL Server / StarCat10 |
| Runtime | Node.js |
| Reverse proxy | Nginx (optional) |

The current package scripts are:

```text
npm run dev
npm run build
npm run start
npm run lint
npm run windows:refresh
```

---

## 5. Repository Structure

The main application structure is:

```text
InfrastructureMonitorSystem/
├─ public/
├─ scripts/
│  └─ build-windows-releases.mjs
│
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ hardware/
│  │  │  │  ├─ route.ts
│  │  │  │  ├─ summary/route.ts
│  │  │  │  └─ [id]/
│  │  │  │     ├─ route.ts
│  │  │  │     └─ performance/route.ts
│  │  │  │
│  │  │  └─ update/
│  │  │     ├─ route.ts
│  │  │     ├─ summary/route.ts
│  │  │     ├─ [id]/route.ts
│  │  │     ├─ compliance/route.ts
│  │  │     └─ release/route.ts
│  │  │
│  │  ├─ hardware/
│  │  │  ├─ page.tsx
│  │  │  └─ [id]/page.tsx
│  │  │
│  │  ├─ update/
│  │  │  ├─ page.tsx
│  │  │  └─ [id]/page.tsx
│  │  │
│  │  ├─ page.tsx
│  │  └─ layout.tsx
│  │
│  ├─ components/
│  │  ├─ hardware/
│  │  │  ├─ HardwarePerformancePanel.tsx
│  │  │  ├─ HardwareStatusBadge.tsx
│  │  │  ├─ HardwareSummary.tsx
│  │  │  └─ HardwareTable.tsx
│  │  │
│  │  ├─ windows-update/
│  │  │  ├─ WindowsFleetComparison.tsx
│  │  │  ├─ UpdateStatusBadge.tsx
│  │  │  ├─ UpdateSummary.tsx
│  │  │  ├─ UpdateTable.tsx
│  │  │  └─ UpdateHistoryTable.tsx
│  │  │
│  │  ├─ layout/
│  │  ├─ main/
│  │  └─ ui/
│  │
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ hardware/
│  │  │  ├─ schema.ts
│  │  │  ├─ query.ts
│  │  │  └─ performance.ts
│  │  │
│  │  └─ windows-update/
│  │     ├─ compare.ts
│  │     └─ windows-releases.ts
│  │
│  └─ types/
│     ├─ hardware.ts
│     └─ windows-update.ts
│
├─ components.json
├─ next.config.ts
├─ package.json
├─ package-lock.json
├─ postcss.config.mjs
├─ tsconfig.json
└─ README.md
```

The exact repository may contain additional UI or layout components; the sections above describe the infrastructure-monitoring portion of the application.

---

## 6. Database Integration

### Connection

The application uses the `mssql` package and creates a reusable connection pool in:

```text
src/lib/db.ts
```

The connection is configured from environment variables.

```env
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=StarCat10
DB_USER=your_username
DB_PASSWORD=your_password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Environment variable reference

| Variable | Description | Example |
|---|---|---|
| `DB_SERVER` | SQL Server hostname | `IHL-SQL-DEV` |
| `DB_PORT` | SQL Server TCP port | `1433` |
| `DB_NAME` | Database name | `StarCat10` |
| `DB_USER` | SQL login | `dashboard_reader` |
| `DB_PASSWORD` | SQL password | secret |
| `DB_ENCRYPT` | Enable SQL encryption | `false` |
| `DB_TRUST_SERVER_CERTIFICATE` | Trust SQL Server certificate | `true` for an internal/self-signed setup |

Do not commit `.env.local` to Git.

### Read-only design

The monitoring layer is intended to execute read operations against the StarCat database. The dashboard derives its UI state from existing StarCat inventory and monitoring tables rather than maintaining a second copy of the computer inventory.

This is important because StarCat remains the authoritative source of hardware and Windows inventory.

---

## 7. Important StarCat Tables

### `TB_SYSTEMDEVICE`

The central device table.

Typical information used by the dashboard includes:

- `AgentID`
- `DeviceName`
- `Alias`
- `IPAddress`
- `OnlineStatus`
- `LastRespond`
- `OwnerID`
- `DEP_ID`
- `LOCATION_ID`

### `TB_USER`

The application uses the owner relationship to obtain the most reliable department and location assignment.

```text
TB_SYSTEMDEVICE.OwnerID
        │
        ▼
TB_USER.USER_ID
        ├── DEP_ID
        └── LOCATION_ID
              │
              ├── TB_DEPARTMENT.DEPNAME
              └── TB_LOCATION.LOCATIONNAME
```

This relationship is important for the current StarCat database because `TB_SYSTEMDEVICE.DEP_ID` and `TB_SYSTEMDEVICE.LOCATION_ID` should not be treated as the only source of organizational information.

### `TB_COMPUTER`

Provides agent state and software/inventory timestamps such as:

- serial number
- agent version
- logon user
- last hardware update
- last software update
- Office version

### `TB_INV_OS`

Windows inventory source.

Relevant columns include:

- `Windows_Version`
- `VersionFull`
- `Build`
- `UBR`
- `InstallDate`

The important point is that Windows build data is not necessarily stored as one complete value. The system therefore normalizes `Build` and `UBR` into a comparison value such as:

```text
26200.9445
26100.9445
```

### `TB_INV_MACHINE`

Provides machine-level resources such as:

- total memory
- total storage
- last boot

### `TB_INV_DISK`

Provides disk inventory including:

- drive
- capacity
- free space
- mount point

### `TB_INV_WMICPU`

Provides CPU names by `AgentID`.

### `TB_INV_NETWORK`

Provides network information such as IP addresses.

### `TB_MONITORHISTORY`

Large historical monitoring table containing CPU and memory observations.

The application deliberately does not scan the entire table for every request. The hardware query first limits the monitoring history to a recent window and then chooses the most recent record per device.

This is important because the table can contain millions of rows.

---

## 8. Hardware Data Flow

The main hardware pipeline is:

```text
TB_SYSTEMDEVICE
      │
      ├── TB_USER
      │      ├── TB_DEPARTMENT
      │      └── TB_LOCATION
      │
      ├── TB_COMPUTER
      ├── TB_INV_OS
      ├── TB_INV_MACHINE
      ├── TB_INV_SYSTEM
      ├── TB_INV_DISK
      ├── TB_INV_WMICPU
      └── TB_INV_NETWORK
             │
             ▼
      DEVICE_SOURCE
             │
             ▼
      hardware/query.ts
             │
             ▼
       /api/hardware
             │
             ▼
        Hardware UI
```

`src/lib/hardware/schema.ts` is intentionally treated as the main StarCat schema adapter. It converts database-specific columns into stable application-level fields.

This means UI components do not need to know the underlying StarCat table relationships.

---

## 9. Hardware Device Classification

The dashboard uses the organization's hostname convention rather than generic StarCat device types for its managed computer list.

```text
YYRDT### → DESKTOP
YYRNB### → NOTEBOOK
```

For example:

```text
22RDT107 → DESKTOP
22RNB025 → NOTEBOOK
```

Everything else is excluded from the managed hardware list.

This filter is intentionally applied at the server/query layer so that non-managed devices do not need to be transferred to the browser just to be discarded there.

---

## 10. Hardware Status Calculation

The hardware health state is derived from online state and resource utilization.

### `OFFLINE`

The device is not reported as online.

### `UNKNOWN`

There is not enough usable performance information to calculate a meaningful resource status.

### `CRITICAL`

At least one available resource is at or above the critical threshold.

Current threshold logic:

```text
CPU >= 90%
RAM >= 90%
Disk >= 90%
```

### `WARNING`

At least one available resource is at or above the warning threshold but below critical.

```text
CPU >= 80%
RAM >= 80%
Disk >= 80%
```

### `HEALTHY`

The device is online and no measured resource is in the warning or critical range.

---

## 11. Performance Monitoring Strategy

`TB_MONITORHISTORY` is a high-volume table, so queries are intentionally bounded.

The current implementation uses a recent-row window and then ranks records per `AgentID` to select the latest performance sample.

Conceptually:

```text
TB_MONITORHISTORY
      │
      ├── take recent rows
      │
      ├── partition by AgentID
      │
      ├── newest CurrentTime first
      │
      └── row number = 1
              │
              ▼
       latest CPU / RAM sample
```

This avoids an unrestricted latest-record lookup across the entire monitoring history for every page request.

The Hardware page automatically refreshes every 30 seconds.

---

## 12. Windows Update Architecture

The Windows Update Center does not determine compliance from the `InstallState` field alone.

Instead, the system compares:

```text
Machine Windows Version
        +
Machine Windows Build / UBR
        │
        ▼
Normalized build
        │
        ▼
Microsoft production baseline
        │
        ▼
Compliance status
```

### Baseline generation

The script:

```text
scripts/build-windows-releases.mjs
```

downloads the Microsoft Windows 11 Release Health page and extracts release history for the supported build families.

The current script keeps these build families:

```text
22631
26100
26200
28000
```

The generated result is written to:

```text
src/lib/windows-update/windows-releases.ts
```

The generated file contains:

- feature version
- build number
- UBR
- release date
- KB number
- end-of-updates information
- ended flag

The dashboard then performs compliance comparison locally from that generated data.

### Refreshing Windows release data

Run:

```powershell
npm run windows:refresh
```

This requires Internet access while generating the baseline.

The application itself does not need Internet access to Microsoft on every page request after the generated file has been updated.

After refreshing the generated data, commit the updated `windows-releases.ts` together with the code change.

---

## 13. Windows Compliance Logic

The comparison logic is implemented in:

```text
src/lib/windows-update/compare.ts
```

The comparison process is:

1. Normalize the reported Windows version.
2. Parse the machine build number.
3. Parse UBR when available.
4. Infer feature version from the build when the explicit version is missing.
5. Find the matching release history.
6. Identify the newest known revision.
7. Compare the machine UBR with the latest known UBR.
8. Return one of the four supported states.

If the application cannot safely determine the state, it returns `UNKNOWN` rather than guessing.

This is intentional because an incorrect compliance status is more dangerous for operational reporting than an explicit unknown state.

---

## 14. Main Application Routes

### UI routes

| Route | Purpose |
|---|---|
| `/` | Application entry point / redirect |
| `/hardware` | Hardware Monitor fleet view |
| `/hardware/[id]` | Hardware detail and performance view |
| `/update` | Windows Update Center |
| `/update/[id]` | Windows update detail view |

### API routes

| Endpoint | Purpose |
|---|---|
| `GET /api/hardware` | Hardware list with search/type filter |
| `GET /api/hardware/summary` | Fleet hardware summary |
| `GET /api/hardware/[id]` | Single machine detail |
| `GET /api/hardware/[id]/performance` | Performance history for a machine |
| `GET /api/update` | Windows update inventory endpoint |
| `GET /api/update/summary` | Windows update summary |
| `GET /api/update/[id]` | Windows update details for a device |
| `GET /api/update/compliance` | Windows build compliance for managed PCs |
| `GET /api/update/release` | Current generated Windows release information |

---

## 15. Hardware API Parameters

The hardware list supports device type and search filtering.

Example:

```text
GET /api/hardware?type=ALL
GET /api/hardware?type=DESKTOP
GET /api/hardware?type=NOTEBOOK
GET /api/hardware?type=ALL&search=22RDT107
GET /api/hardware?type=ALL&search=192.168.1.20
```

Supported device type values:

```text
ALL
DESKTOP
NOTEBOOK
```

The search is designed to match fields such as:

- hostname
- IP address
- user
- department
- location
- manufacturer
- model
- serial number

---

## 16. Installation

### Requirements

Install the following before running the project:

- Node.js compatible with the installed Next.js toolchain
- npm
- Microsoft SQL Server access
- Network access to the StarCat database host
- A SQL login with permission to read the required StarCat tables

### Clone

```powershell
git clone https://github.com/t1pxy/InfrastructureMonitorSystem.git
cd InfrastructureMonitorSystem
```

### Install dependencies

```powershell
npm install
```

### Create environment file

Create:

```text
.env.local
```

Example:

```env
DB_SERVER=IHL-SQL-DEV
DB_PORT=1433
DB_NAME=StarCat10
DB_USER=YOUR_USERNAME
DB_PASSWORD=YOUR_PASSWORD
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

Do not copy the example credentials into production. Replace them with a dedicated read-only SQL account.

---

## 17. Development

Start the development server:

```powershell
npm run dev
```

By default, Next.js serves the application on:

```text
http://localhost:3000
```

Then open:

```text
http://localhost:3000/hardware
```

or:

```text
http://localhost:3000/update
```

---

## 18. Production Build

Always test a production build before deployment.

```powershell
npm run build
```

Start the production server:

```powershell
npm run start
```

The production server can then be placed behind Nginx or another reverse proxy.

---

## 19. Windows Server Deployment Concept

A typical Windows Server deployment is:

```text
Internet / Internal Network
          │
          ▼
        Nginx
          │
          ▼
  Next.js Node.js process
          │
          ▼
     StarCat SQL Server
```

The application should listen only on the intended internal interface/port and Nginx can expose the public/internal URL.

For a production environment:

1. Install Node.js on Windows Server.
2. Clone or copy the project.
3. Create `.env.local` or equivalent process environment variables.
4. Run `npm install`.
5. Run `npm run build`.
6. Start the application with `npm run start`.
7. Keep the Node process alive using an appropriate Windows service/process manager.
8. Configure Nginx as the reverse proxy.
9. Restrict SQL access to the application server where possible.

Example reverse-proxy concept:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

If the application is later deployed under a path such as `/camera-monitor`, `basePath`, reverse-proxy path handling, static asset URLs, and any API path assumptions must be verified together rather than changing only Nginx.

---

## 20. Security Recommendations

### Database account

Use a dedicated account with read-only permissions for the application.

At minimum, the dashboard should be able to read the required StarCat tables without permission to update or delete operational inventory.

### Environment variables

Never commit:

```text
.env
.env.local
.env.production
```

or database passwords into Git.

### SQL injection prevention

User-entered search values should remain parameterized through the MSSQL request object. Do not concatenate raw user input into SQL text.

### SQL Server exposure

Do not expose TCP 1433 publicly just to make the dashboard work. Prefer:

```text
Application Server → SQL Server internal network
```

with firewall restrictions.

---

## 21. Troubleshooting

### MSSQL connection failure

Typical error:

```text
Failed to connect to localhost:1433
```

Check:

```text
DB_SERVER
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Also verify that SQL Server is listening on TCP 1433 or the configured port and that the application server can reach the database host.

### Environment variables appear ignored

Stop and restart the Next.js development server after changing `.env.local`.

Example:

```powershell
Ctrl+C
npm run dev
```

Environment files are loaded by the Node/Next.js process at startup; changing credentials without restarting can leave the previous configuration in memory.

### Invalid column name

The StarCat database schema is not assumed to be identical to generic SQL Server inventory schemas.

When an error such as:

```text
Invalid column name 'Serial'
```

appears, check the actual StarCat table definition before changing the query.

For example, `TB_EQUIPMENT` uses:

```text
SerialNumber
```

while some StarCat inventory tables use:

```text
Serial
```

The schema adapter in `src/lib/hardware/schema.ts` exists specifically to centralize these differences.

### Department / Location are blank

Verify the owner relationship:

```text
TB_SYSTEMDEVICE.OwnerID
        → TB_USER.USER_ID
        → TB_USER.DEP_ID
        → TB_DEPARTMENT.DEPNAME

TB_SYSTEMDEVICE.OwnerID
        → TB_USER.USER_ID
        → TB_USER.LOCATION_ID
        → TB_LOCATION.LOCATIONNAME
```

Do not assume that `TB_SYSTEMDEVICE.DEP_ID` and `TB_SYSTEMDEVICE.LOCATION_ID` are populated for every device.

### Windows Update shows `ไม่ทราบ`

Check that StarCat contains usable values in:

```text
TB_INV_OS.Windows_Version
TB_INV_OS.Build
TB_INV_OS.UBR
```

A machine with only the major build number and no UBR may intentionally remain `UNKNOWN` because the application cannot safely determine the patch revision.

### Windows baseline is outdated

Run:

```powershell
npm run windows:refresh
```

Then verify that:

```text
src/lib/windows-update/windows-releases.ts
```

was regenerated.

---

## 22. Performance Considerations

The project has several intentional performance safeguards.

### Limit large history scans

`TB_MONITORHISTORY` can be very large. Do not replace the bounded recent-row query with an unrestricted scan across the entire table.

### Keep database aggregation server-side

CPU, RAM, disk, and compliance information should be calculated in the server/data layer whenever practical.

### Avoid duplicate one-to-many joins

Inventory tables such as disks, network adapters, or CPU records may contain multiple rows per `AgentID`.

Joining them blindly can multiply machine rows. Use aggregation or controlled subqueries when the UI expects one row per machine.

### Keep release comparison local

Microsoft release history is generated into a TypeScript data file during maintenance rather than fetched live during each dashboard request.

---

## 23. Development Conventions

### Database layer

Keep SQL in:

```text
src/lib/
```

rather than placing SQL strings directly in client-side React components.

### API layer

Use Next.js route handlers for server-side data access.

### UI layer

React components should consume typed data rather than knowing the StarCat table structure.

### Shared schema

When StarCat column names change, update the schema adapter first. Avoid spreading StarCat-specific SQL column names throughout multiple routes.

### Generated Windows data

Do not manually edit:

```text
src/lib/windows-update/windows-releases.ts
```

Use:

```powershell
npm run windows:refresh
```

instead.

---

## 24. Operational Data Ownership

The system follows this ownership model:

```text
StarCat / MSSQL
    ↓
Source of truth for:
    - devices
    - hardware inventory
    - users
    - department
    - location
    - OS inventory
    - monitoring history

Infrastructure Monitor System
    ↓
Read / normalize / calculate / display
    - hardware health
    - resource usage
    - Windows compliance
    - dashboard views
```

The application does not attempt to replace StarCat as the inventory master.

---

## 25. Current Limitations

The project currently has several deliberate limitations:

1. Windows compliance depends on the Windows version/build information available in StarCat.
2. A machine with insufficient build/UBR information can only be classified as `UNKNOWN`.
3. The Windows release baseline is a generated snapshot and should be refreshed periodically.
4. Performance history is intentionally bounded for database performance.
5. The application currently focuses on managed Desktop/Notebook devices matching the organization's hostname convention.
6. Other infrastructure modules shown in the broader navigation can be implemented independently without changing the Hardware/Windows Update data layer.

---

## 26. Future Development Ideas

Potential future modules include:

- NVR monitoring
- CCTV monitoring
- Windows Update action workflow
- alerting and notifications
- scheduled compliance reports
- historical hardware availability reports
- export to Excel/CSV
- authentication and role-based access
- audit logging
- service health monitoring
- dashboard customization

These should be added as separate modules while preserving the existing separation between:

```text
UI
→ API
→ server/data layer
→ StarCat/MSSQL
```

---

## 27. Quick Command Reference

### Install

```powershell
npm install
```

### Development

```powershell
npm run dev
```

### Lint

```powershell
npm run lint
```

### Production build

```powershell
npm run build
```

### Production server

```powershell
npm run start
```

### Refresh Windows release baseline

```powershell
npm run windows:refresh
```

---

## 28. Useful URLs During Development

```text
Application:
http://localhost:3000

Hardware Monitor:
http://localhost:3000/hardware

Windows Update Center:
http://localhost:3000/update

Hardware API:
http://localhost:3000/api/hardware

Windows Compliance API:
http://localhost:3000/api/update/compliance
```

---

## 29. Microsoft Windows Release Source

The generated Windows release baseline is derived from Microsoft's Windows 11 Release Health information:

```text
https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information
```

The application stores a generated snapshot in:

```text
src/lib/windows-update/windows-releases.ts
```

This allows the dashboard to perform comparisons without making Microsoft web requests on every page render.

---

## 30. Project Status

The current implementation provides the core monitoring foundation:

```text
✅ Next.js application
✅ MSSQL / StarCat integration
✅ Hardware inventory
✅ Desktop / Notebook classification
✅ Search / filter / pagination
✅ CPU / RAM / Disk monitoring
✅ Hardware detail page
✅ Performance history
✅ Department / Location mapping
✅ Windows version/build detection
✅ Windows compliance comparison
✅ Microsoft release baseline generator
✅ Update status filtering
✅ Direct update-page → hardware-detail navigation
✅ Production build/start workflow
```

The architecture is intentionally modular so additional infrastructure monitoring modules can be added without replacing the existing StarCat integration layer.

---

## License / Internal Use

This project is intended for internal infrastructure monitoring and operational use. Review your organization's security, access-control, and data-handling requirements before exposing the application outside the internal network.
