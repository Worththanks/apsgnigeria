const encoder = new TextEncoder();
const issuer = "apsg-member-portal";
const audience = "member-portal";
const profileScope = ["profile:write", "photo:write"] as const;

export type MemberClaims = {
  iss: string;
  aud: string;
  sub: string;
  org: "APSG" | "CWDI";
  scope: string[];
  iat: number;
  exp: number;
};

export function tableForOrganization(org: string): "members" | "cwdi_members" {
  if (org === "APSG") return "members";
  if (org === "CWDI") return "cwdi_members";
  throw new Error("invalid_organization");
}

export function organizationForRegistration(registrationNumber: string): "APSG" | "CWDI" {
  return /^CWDI\//i.test(registrationNumber) ? "CWDI" : "APSG";
}

export function corsAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const configured = Deno.env.get("MEMBER_PORTAL_ALLOWED_ORIGINS") || "https://apsgnigeria.org,https://www.apsgnigeria.org";
  return configured.split(",").map((value) => value.trim()).filter(Boolean).includes(origin);
}

function corsHeaders(req: Request): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, idempotency-key, x-client-info, x-member-revision"
  });
  const origin = req.headers.get("origin");
  if (origin && corsAllowed(req)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function errorResponse(req: Request, status: number, code: string, message: string, member?: unknown): Response {
  return jsonResponse(req, { code, message, ...(member ? { member } : {}) }, status);
}

export function jsonError(req: Request, error: unknown): Response {
  const code = error instanceof Error ? error.message : "service_unavailable";
  if (code === "invalid_credentials") return errorResponse(req, 401, code, "The registration number and phone number could not be verified.");
  if (code === "invalid_session") return errorResponse(req, 401, code, "Your secure member session has expired. Sign in again.");
  if (code === "rate_limited") return errorResponse(req, 429, code, "Too many attempts. Please wait and try again.");
  if (code === "service_unavailable") return errorResponse(req, 503, code, "The member portal service is temporarily unavailable. Please retry.");
  return errorResponse(req, 400, "invalid_request", "The member portal request could not be completed.");
}

export function requireAllowedOrigin(req: Request): Response | null {
  if (!corsAllowed(req)) return errorResponse(req, 403, "origin_not_allowed", "This member portal request is not allowed.");
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return errorResponse(req, 405, "method_not_allowed", "This request method is not supported.");
  return null;
}

function b64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromB64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("MEMBER_PORTAL_JWT_SECRET") || "";
  if (encoder.encode(secret).byteLength < 32) throw new Error("service_unavailable");
  return await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function issueMemberToken(id: string, org: "APSG" | "CWDI"): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const head = b64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const claims: MemberClaims = {
    iss: issuer,
    aud: audience,
    sub: id,
    org,
    scope: [...profileScope],
    iat: issuedAt,
    exp: issuedAt + 30 * 60
  };
  const body = b64Url(encoder.encode(JSON.stringify(claims)));
  const input = `${head}.${body}`;
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(input)));
  return `${input}.${b64Url(signature)}`;
}

export async function verifyMemberToken(req: Request, requiredScope: string): Promise<MemberClaims> {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9._-]+)$/i);
  if (!match) throw new Error("invalid_session");
  const pieces = match[1].split(".");
  if (pieces.length !== 3) throw new Error("invalid_session");
  try {
    const header = JSON.parse(new TextDecoder().decode(fromB64Url(pieces[0])));
    const claims = JSON.parse(new TextDecoder().decode(fromB64Url(pieces[1]))) as MemberClaims;
    if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("invalid_session");
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), fromB64Url(pieces[2]), encoder.encode(`${pieces[0]}.${pieces[1]}`));
    const now = Math.floor(Date.now() / 1000);
    if (!valid || claims.iss !== issuer || claims.aud !== audience || !claims.sub || !["APSG", "CWDI"].includes(claims.org)
      || !Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.iat > now + 60 || claims.exp <= now
      || claims.exp - claims.iat > 30 * 60 || !Array.isArray(claims.scope) || !claims.scope.includes(requiredScope)) {
      throw new Error("invalid_session");
    }
    return claims;
  } catch (_) {
    throw new Error("invalid_session");
  }
}

export function supabaseConfig(): { url: string; serviceKey: string } {
  const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) throw new Error("service_unavailable");
  return { url, serviceKey };
}

export async function serviceRest(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, serviceKey } = supabaseConfig();
  return await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.headers || {})
    }
  });
}

// @spec PORTAL-LOGIN-007, REG-MATCH-020, REG-MATCH-021, REG-MATCH-022
export function phoneMatches(storedPhone: unknown, submittedPhone: unknown): boolean {
  const storedRaw = String(storedPhone || "").trim();
  const submittedRaw = String(submittedPhone || "").trim();
  if (!/^\+[1-9]\d{6,14}$/.test(submittedRaw)) return false;
  const storedDigits = storedRaw.replace(/\D/g, "");
  const submittedDigits = submittedRaw.slice(1);
  if (storedRaw.startsWith("+")) return storedDigits === submittedDigits;
  if (!submittedRaw.startsWith("+234")) return false;
  const nationalSignificant = submittedDigits.slice(3);
  return storedDigits === nationalSignificant || storedDigits === `0${nationalSignificant}` || storedDigits === `234${nationalSignificant}`;
}

export async function memberById(org: "APSG" | "CWDI", id: string): Promise<Record<string, unknown> | null> {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return null;
  const params = new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" });
  const response = await serviceRest(`${tableForOrganization(org)}?${params.toString()}`);
  if (!response.ok) throw new Error("service_unavailable");
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

// @spec PORTAL-LOGIN-001
export async function memberByCredentials(org: "APSG" | "CWDI", regNumber: string, phone: string): Promise<Record<string, unknown> | null> {
  if (!/^\+[1-9]\d{6,14}$/.test(String(phone || ""))) return null;
  const rpc = org === "CWDI" ? "cwdi_member_login_by_reg_phone" : "apsg_member_login_by_reg_phone";
  const response = await serviceRest(`rpc/${rpc}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_reg_number: regNumber, p_phone: phone })
  });
  if (!response.ok) throw new Error("service_unavailable");
  const member = await response.json();
  return member && typeof member === "object" && !Array.isArray(member) ? member : null;
}

// @spec PORTAL-EDIT-009, PORTAL-VIEW-003
export function safeMember(member: Record<string, unknown>, org: "APSG" | "CWDI"): Record<string, unknown> {
  const allowed = [
    "id", "reg_number", "first_name", "middle_name", "last_name", "sex", "designation", "phone", "email",
    "state", "lga", "lcda", "ward", "residence_country_code", "residence_city", "residence_state_province", "membership_chapter", "nigerian_phone_e164", "preferred_contact_type", "created_at", "updated_at", "profile_photo_path", "avatar_url", "photo_url",
    "account_number", "accountNumber", "acct_number", "bank_name", "bank", "bankName", "account_name",
    "pvc_number", "apc_card_number", "pvc_upload_path", "apc_upload_path", "verified", "is_youth_wing_member"
  ];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(member, key)) clean[key] = member[key];
  }
  clean._sourceTable = tableForOrganization(org);
  return clean;
}

// @spec PORTAL-SECURITY-005, PORTAL-EDIT-012, PORTAL-EDIT-013
export function safeMemberWrite(member: Record<string, unknown>, org: "APSG" | "CWDI"): Record<string, unknown> {
  const clean = safeMember(member, org);
  delete clean.nigerian_phone_e164;
  delete clean.preferred_contact_type;
  return clean;
}

function base64UrlHmacInput(value: string): Uint8Array {
  return encoder.encode(value);
}

async function limitDigest(action: string, identity: string): Promise<string> {
  const key = await signingKey();
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, base64UrlHmacInput(`${action}\0${identity}`)));
  return [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeLimit(action: string, identity: string, limit: number, windowSeconds: number): Promise<void> {
  const keyHash = await limitDigest(action, identity);
  const response = await serviceRest("rpc/consume_member_portal_rate_limit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_key_hash: keyHash, p_limit: limit, p_window_seconds: windowSeconds })
  });
  if (!response.ok) throw new Error("service_unavailable");
  const allowed = await response.json();
  if (allowed !== true) throw new Error("rate_limited");
}

export function requestIp(req: Request): string {
  const forwarded = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim().slice(0, 80);
}

export function memberScopePath(org: "APSG" | "CWDI", id: string): string {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new Error("invalid_session");
  return `profile/${org}/${id}/`;
}

export async function updateRow(
  org: "APSG" | "CWDI",
  id: string,
  revision: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({ select: "*", id: `eq.${id}`, updated_at: `eq.${revision}` });
  const response = await serviceRest(`${tableForOrganization(org)}?${params.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(fields)
  });
  if (!response.ok) throw new Error("service_unavailable");
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function deleteOwnPhoto(org: "APSG" | "CWDI", id: string, path: string): Promise<void> {
  const prefix = memberScopePath(org, id);
  if (!path.startsWith(prefix) || path.includes("..")) return;
  const { url, serviceKey } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/uploads`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefixes: [path] })
  });
  if (!response.ok) throw new Error("photo_cleanup_failed");
}
