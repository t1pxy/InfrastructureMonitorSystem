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
  "0",
] as const;

const PLACEHOLDER_LIST = PLACEHOLDERS
  .map((value) => `'${value}'`)
  .join(", ");

function scrub(column: string): string {
  return `
    NULLIF(
      CASE
        WHEN LTRIM(
          RTRIM(
            CONVERT(varchar(500), ${column})
          )
        ) IN (${PLACEHOLDER_LIST})
        THEN NULL
        ELSE LTRIM(
          RTRIM(
            CONVERT(varchar(500), ${column})
          )
        )
      END,
      ''
    )
  `;
}

const HOSTNAME = `
  COALESCE(
    ${scrub("d.DeviceName")},
    ${scrub("d.Alias")}
  )
`;

const DEVICE_CLASS = `
  CASE
    WHEN ${HOSTNAME} LIKE '[0-9][0-9]RDT[0-9][0-9][0-9]'
      THEN 'DESKTOP'

    WHEN ${HOSTNAME} LIKE '[0-9][0-9]RNB[0-9][0-9][0-9]'
      THEN 'NOTEBOOK'

    ELSE 'UNKNOWN'
  END
`;

const BRAND = `
  CASE
    WHEN sys.Manufacturer LIKE 'ASUS%'
      THEN 'ASUS'

    WHEN sys.Manufacturer LIKE 'HP%'
      OR sys.Manufacturer LIKE 'Hewlett%'
      THEN 'HP'

    WHEN sys.Manufacturer LIKE 'Dell%'
      THEN 'Dell'

    WHEN sys.Manufacturer LIKE 'Lenovo%'
      THEN 'Lenovo'

    WHEN sys.Manufacturer LIKE 'Acer%'
      THEN 'Acer'

    WHEN sys.Manufacturer LIKE 'Micro-Star%'
      OR sys.Manufacturer LIKE 'MSI%'
      THEN 'MSI'

    WHEN sys.Manufacturer LIKE 'Giga-Byte%'
      OR sys.Manufacturer LIKE 'Gigabyte%'
      THEN 'Gigabyte'

    WHEN sys.Manufacturer LIKE 'Apple%'
      THEN 'Apple'

    WHEN sys.Manufacturer LIKE 'Microsoft%'
      THEN 'Microsoft'

    WHEN sys.Manufacturer LIKE 'Samsung%'
      THEN 'Samsung'

    WHEN sys.Manufacturer LIKE 'Fujitsu%'
      THEN 'Fujitsu'

    WHEN sys.Manufacturer LIKE 'Toshiba%'
      THEN 'Toshiba'

    WHEN sys.Manufacturer LIKE 'Intel%'
      THEN 'Intel'

    ELSE COALESCE(
      ${scrub("sys.Manufacturer")},
      ${scrub("eq.Manufacturer")}
    )
  END
`;

const WINDOWS_BUILD = `
  CASE
    WHEN ${scrub("os.Build")} IS NULL
      THEN NULL

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

    WHEN ${scrub("os.UBR")} IS NOT NULL
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

const LAST_SEEN = `
  CASE
    WHEN
      ISNULL(
        d.LastRespond,
        CAST('1900-01-01' AS datetime)
      ) >= ISNULL(
        comp.LastHardwareUpdate,
        CAST('1900-01-01' AS datetime)
      )
      AND
      ISNULL(
        d.LastRespond,
        CAST('1900-01-01' AS datetime)
      ) >= ISNULL(
        comp.LastSoftwareUpdate,
        CAST('1900-01-01' AS datetime)
      )
    THEN d.LastRespond

    WHEN
      ISNULL(
        comp.LastHardwareUpdate,
        CAST('1900-01-01' AS datetime)
      ) >= ISNULL(
        d.LastRespond,
        CAST('1900-01-01' AS datetime)
      )
      AND
      ISNULL(
        comp.LastHardwareUpdate,
        CAST('1900-01-01' AS datetime)
      ) >= ISNULL(
        comp.LastSoftwareUpdate,
        CAST('1900-01-01' AS datetime)
      )
    THEN comp.LastHardwareUpdate

    ELSE comp.LastSoftwareUpdate
  END
`;

export const DEVICE_SOURCE = `
SELECT
  d.AgentID AS agentId,

  ${HOSTNAME} AS hostname,

  ${DEVICE_CLASS} AS deviceClass,

  COALESCE(
    ${scrub("d.IPAddress")},
    (
      SELECT TOP 1
        ${scrub("n.IPAddress")}
      FROM TB_INV_NETWORK n
      WHERE n.AgentID = d.AgentID
      ORDER BY n.id
    )
  ) AS ipAddress,

  ${scrub("comp.LogonUser")} AS [user],

  ${scrub("dep.DEPNAME")} AS department,

  ${scrub("loc.LOCATIONNAME")} AS location,

  CAST(
    CASE
      WHEN d.OnlineStatus = 'True'
        THEN 1
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
    ${scrub("eq.SerialNumber")}
  ) AS serialNumber,

  ${scrub("comp.AgentVersion")} AS agentVersion,

  COALESCE(
    ${scrub("os.Windows_Version")},
    ${scrub("os.VersionFull")}
  ) AS windowsVersion,

  ${WINDOWS_BUILD} AS windowsBuild,

  CASE
    WHEN mac.TotalMemory > 0
      THEN ROUND(
        mac.TotalMemory / 1024.0,
        1
      )
    ELSE NULL
  END AS memoryTotalGb,

  CASE
    WHEN (
      SELECT SUM(
        CASE
          WHEN di.Capacity > 0
            THEN di.Capacity
          ELSE 0
        END
      )
      FROM TB_INV_DISK di
      WHERE di.AgentID = d.AgentID
    ) > 0
    THEN ROUND(
      (
        SELECT SUM(
          CASE
            WHEN di2.Capacity > 0
              THEN di2.Capacity
            ELSE 0
          END
        )
        FROM TB_INV_DISK di2
        WHERE di2.AgentID = d.AgentID
      ) / 1073741824.0,
      1
    )
    ELSE NULL
  END AS diskTotalGb,

  mac.LastBoot AS lastBoot,

  (
    SELECT TOP 1
      w.CPUName
    FROM TB_INV_WMICPU w
    WHERE w.AgentID = d.AgentID
    ORDER BY w.AgentID
  ) AS cpuName,

  ${LAST_SEEN} AS lastSeen

FROM TB_SYSTEMDEVICE d

/*
 * IMPORTANT:
 * StarCat stores the reliable owner relationship
 * in TB_USER.OwnerID.
 *
 * Department / Location should therefore come from:
 *
 *   d.OwnerID
 *      -> TB_USER.USER_ID
 *      -> TB_USER.DEP_ID
 *      -> TB_DEPARTMENT
 *
 *   d.OwnerID
 *      -> TB_USER.USER_ID
 *      -> TB_USER.LOCATION_ID
 *      -> TB_LOCATION
 *
 * This matches starcat_dashboard.
 */
LEFT JOIN TB_USER u
  ON u.USER_ID = ${scrub("d.OwnerID")}

LEFT JOIN TB_DEPARTMENT dep
  ON dep.DEP_ID = COALESCE(
    u.DEP_ID,
    d.DEP_ID
  )

LEFT JOIN TB_LOCATION loc
  ON loc.LOCATION_ID = COALESCE(
    u.LOCATION_ID,
    d.LOCATION_ID
  )

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
`;