import crypto from "node:crypto";

interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
}

function md5(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function parseDigest(header: string): DigestChallenge {
  const values: Record<string, string> = {};
  const regex = /([a-zA-Z]+)=(?:"([^"]*)"|([^,\s]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(header))) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }

  if (!values.realm || !values.nonce) {
    throw new Error("Hikvision returned an invalid digest challenge.");
  }

  return {
    realm: values.realm,
    nonce: values.nonce,
    qop: values.qop,
    opaque: values.opaque,
  };
}

function buildDigest(
  challenge: DigestChallenge,
  username: string,
  password: string,
  method: string,
  uri: string,
) {
  const qop = challenge.qop?.split(",").map((value) => value.trim()).find((value) => value === "auth");
  const nc = "00000001";
  const cnonce = crypto.randomBytes(16).toString("hex");
  const ha1 = md5(`${username}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${challenge.nonce}:${ha2}`);

  const parts = [
    `username="${username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];

  if (qop) {
    parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  }
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);

  return `Digest ${parts.join(", ")}`;
}

export async function hikvisionRequestRaw(
  baseUrl: string,
  username: string,
  password: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: string,
  timeoutMs = 12000,
): Promise<{ status: number; body: string }> {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const first = await fetch(url, {
      method,
      signal: controller.signal,
      cache: "no-store",
    });

    if (first.status !== 401) {
      const firstBody = await first.text();
      if (!first.ok) throw new Error(`Hikvision HTTP ${first.status}: ${firstBody.slice(0, 300)}`);
      return { status: first.status, body: firstBody };
    }

    const challengeHeader = first.headers.get("www-authenticate");
    if (!challengeHeader?.toLowerCase().startsWith("digest")) {
      throw new Error("Hikvision did not provide Digest authentication.");
    }

    const challenge = parseDigest(challengeHeader);
    const auth = buildDigest(challenge, username, password, method, url.pathname + url.search);

    const second = await fetch(url, {
      method,
      headers: {
        Authorization: auth,
        Accept: "application/xml, text/xml, application/json, */*",
        ...(body !== undefined ? { "Content-Type": "application/xml; charset=UTF-8" } : {}),
      },
      ...(body !== undefined ? { body } : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const secondBody = await second.text();
    if (!second.ok) throw new Error(`Hikvision HTTP ${second.status}: ${secondBody.slice(0, 500)}`);
    return { status: second.status, body: secondBody };
  } finally {
    clearTimeout(timer);
  }
}


export async function hikvisionRequest(
  baseUrl: string,
  username: string,
  password: string,
  path: string,
  timeoutMs = 8000,
): Promise<string> {
  return (await hikvisionRequestRaw(baseUrl, username, password, "GET", path, undefined, timeoutMs)).body;
}
