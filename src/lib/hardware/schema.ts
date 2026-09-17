import "server-only";

const PLACEHOLDERS = [
  "",
  "System Product Name",
  "System Serial Number",
  "System manufacturer",
  "To Be Filled By O.E.M.",
  "Default string",
  "None",
  "N/A",
  "NA",
  "Unknown",
  "Unassigned",
  "null",
] as const;

const PLACEHOLDER_LIST = PLACEHOLDERS.map(
  (value) => `'${value}'`,
).join(", ");

function scrub(column: string): string {
  return `
    NULLIF(
      CASE
        WHEN LTRIM(RTRIM(CONVERT(varchar(500), ${column}))) IN (${PLACEHOLDER_LIST})
          THEN NULL
        ELSE LTRIM(RTRIM(CONVERT(varchar(500), ${column})))
      END,
      ''
    )
  `;
}

const BRAND = `
  CASE
    WHEN sys.Manufacturer LIKE 'ASUS%' THEN 'ASUS'
    WHEN sys.Manufacturer LIKE 'HP%' OR sys.Manufacturer LIKE 'Hewlett%' THEN 'HP'
    WHEN sys.Manufacturer LIKE 'Dell%' THEN 'Dell'
    WHEN sys.Manufacturer LIKE 'Lenovo%' THEN 'Lenovo'
    WHEN sys.Manufacturer LIKE 'Acer%' THEN 'Acer'
    WHEN sys.Manufacturer LIKE 'Micro-Star%' OR sys.Manufacturer LIKE 'MSI%' THEN 'MSI'
    WHEN sys.Manufacturer LIKE 'Giga-Byte%' OR sys.Manufacturer LIKE 'Gigabyte%' THEN 'Gigabyte'
    WHEN sys.Manufacturer LIKE 'Apple%' THEN 'Apple'
    WHEN sys.Manufacturer LIKE 'Microsoft%' THEN 'Microsoft'
    WHEN sys.Manufacturer LIKE 'Samsung%' THEN 'Samsung'
    WHEN sys.Manufacturer LIKE 'Fujitsu%' THEN 'Fujitsu'
    WHEN sys.Manufacturer LIKE 'Toshiba%' THEN 'Toshiba'
    WHEN sys.Manufacturer LIKE 'Intel%' THEN 'Intel'
    ELSE COALESCE(
      ${scrub("sys.Manufacturer")},
      ${scrub("eq.Manufacturer")}
    )
  END
`;

const WINDOWS_BUILD = `
  CASE
    WHEN ${scrub("os.Build")} IS NULL THEN NULL

    WHEN
      CHARINDEX(
        '.',
        REPLACE(
          REPLACE(
            ${scrub("os.Build")},
            'OS Build ',
            ''
          ),
          '10.0.',
          ''
        )
      ) > 0
    THEN
      REPLACE(
        REPLACE(
          ${scrub("os.Build")},
          'OS Build ',
          ''
        ),
        '10.0.',
        ''
      )

    WHEN
      ${scrub("os.UBR")} IS NOT NULL
    THEN
      REPLACE(
        REPLACE(
          ${scrub("os.Build")},
          'OS Build ',
          ''
        ),
        '10.0.',
        ''
      )
      + '.'
      + CONVERT(
          varchar(30),
          ${scrub("os.UBR")}
        )

    ELSE
      REPLACE(
        REPLACE(
          ${scrub("os.Build")},
          'OS Build ',
          ''
        ),
        '10.0.',
        ''
      )
  END
`;

export const DEVICE_SOURCE = `
SELECT
  d.AgentID AS agentId,

  COALESCE(
    ${scrub("d.DeviceName")},
    ${scrub("d.Alias")}
  ) AS hostname,

  CASE
    WHEN d.DeviceType = 'COMPUTER' THEN 'COMPUTER'
    ELSE COALESCE(
      ${scrub("d.DeviceType")},
      'UNKNOWN'
    )
  END AS deviceClass,

  COALESCE(
    ${scrub("d.IPAddress")},
    ${scrub("net.IPAddress")}
  ) AS ipAddress,

  ${scrub("comp.LogonUser")} AS [user],

  ${scrub("dep.DEPNAME")} AS department,

  ${scrub("loc.LOCATIONNAME")} AS location,

  CAST(
    CASE
      WHEN d.OnlineStatus = 'True' THEN 1
      ELSE 0
    END
    AS bit
  ) AS online,

  ${BRAND} AS manufacturer,

  COALESCE(
    ${scrub("sys.Model")},
    ${scrub("eq.Model")}
  ) AS model,

  COALESCE(
    ${scrub("comp.SerialNumber")},
    ${scrub("sys.Serial")},
    ${scrub("eq.Serial")}
  ) AS serialNumber,

  ${scrub("comp.AgentVersion")} AS agentVersion,

  COALESCE(
    ${scrub("os.Windows_Version")},
    ${scrub("os.VersionFull")}
  ) AS windowsVersion,

  ${WINDOWS_BUILD} AS windowsBuild,

  CASE
    WHEN mac.TotalMemory > 0
      THEN ROUND(mac.TotalMemory / 1024.0, 1)
    ELSE NULL
  END AS memoryTotalGb,

  CASE
    WHEN diskInfo.TotalCapacity > 0
      THEN ROUND(
        diskInfo.TotalCapacity / 1073741824.0,
        1
      )
    ELSE NULL
  END AS diskTotalGb,

  mac.LastBoot AS lastBoot,

  cpuInfo.CPUName AS cpuName,

  lastSeenInfo.lastSeen AS lastSeen

FROM TB_SYSTEMDEVICE d

LEFT JOIN TB_USER u
  ON u.USER_ID = ${scrub("d.OwnerID")}

LEFT JOIN TB_DEPARTMENT dep
  ON dep.DEP_ID = u.DEP_ID

LEFT JOIN TB_LOCATION loc
  ON loc.LOCATION_ID = u.LOCATION_ID

LEFT JOIN TB_INV_SYSTEM sys
  ON sys.AgentID = d.AgentID

LEFT JOIN TB_INV_OS os
  ON os.AgentID = d.AgentID

LEFT JOIN TB_INV_MACHINE mac
  ON mac.AgentID = d.AgentID

LEFT JOIN TB_COMPUTER comp
  ON comp.AgentID = d.AgentID

LEFT JOIN TB_EQUIPMENT eq
  ON eq.AgentID = d.AgentID

LEFT JOIN TB_EQUIPMENTTYPE eqt
  ON eqt.EquipmentTypeID = eq.EquipmentTypeID

LEFT JOIN TB_INV_NETWORK net
  ON net.AgentID = d.AgentID

OUTER APPLY (
  SELECT TOP 1
    w.CPUName
  FROM TB_INV_WMICPU w
  WHERE w.AgentID = d.AgentID
  ORDER BY w.AgentID
) AS cpuInfo

OUTER APPLY (
  SELECT
    SUM(
      CASE
        WHEN TRY_CONVERT(bigint, di.Capacity) > 0
          THEN TRY_CONVERT(bigint, di.Capacity)
        ELSE 0
      END
    ) AS TotalCapacity
  FROM TB_INV_DISK di
  WHERE di.AgentID = d.AgentID
) AS diskInfo

CROSS APPLY (
  SELECT
    MAX(seenValues.seen) AS lastSeen
  FROM (
    VALUES
      (d.LastRespond),
      (comp.LastHardwareUpdate),
      (comp.LastSoftwareUpdate)
  ) AS seenValues(seen)
) AS lastSeenInfo
`;