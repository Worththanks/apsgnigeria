import {
  consumeLimit,
  errorResponse,
  issueMemberToken,
  jsonError,
  jsonResponse,
  memberByCredentials,
  memberById,
  organizationForRegistration,
  phoneMatches,
  preflight,
  requireAllowedOrigin,
  requestIp,
  safeMember,
  verifyMemberToken
} from "../_shared/member-portal.ts";

// @spec PORTAL-LOGIN-001, PORTAL-LOGIN-002, PORTAL-SECURITY-003
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight(req);
  const rejected = requireAllowedOrigin(req);
  if (rejected) return rejected;

  try {
    const body = await req.json();
    const action = body?.action || "verify";
    const ip = requestIp(req);

    if (action === "refresh") {
      const claims = await verifyMemberToken(req, "profile:write");
      await consumeLimit("session-refresh-member", `${claims.org}:${claims.sub}`, 100, 60 * 60);
      if (ip) await consumeLimit("session-refresh-ip", ip, 60, 60 * 60);
      const member = await memberById(claims.org, claims.sub);
      if (!member || String(member.id) !== claims.sub) throw new Error("invalid_session");
      return jsonResponse(req, {
        organization: claims.org,
        member: safeMember(member, claims.org),
        token: await issueMemberToken(claims.sub, claims.org)
      });
    }

    if (action !== "verify") return errorResponse(req, 400, "invalid_request", "The member portal request could not be completed.");

    const registrationNumber = String(body?.registrationNumber || "").trim().toUpperCase();
    const phone = String(body?.phone || "").trim();
    const requestedOrganization = String(body?.organization || "").toUpperCase();
    if (!registrationNumber || !/^\+[1-9]\d{6,14}$/.test(phone) || !["APSG", "CWDI"].includes(requestedOrganization)) {
      return errorResponse(req, 400, "invalid_credentials", "The registration number and phone number could not be verified.");
    }
    const org = requestedOrganization as "APSG" | "CWDI";
    if (organizationForRegistration(registrationNumber) !== org) {
      return errorResponse(req, 401, "invalid_credentials", "The registration number and phone number could not be verified.");
    }

    if (ip) await consumeLimit("session-ip", ip, 8, 15 * 60);
    await consumeLimit("session-identity", `${org}:${registrationNumber}`, 10, 60 * 60);
    const member = await memberByCredentials(org, registrationNumber, phone);
    if (!member || !phoneMatches(member.phone, phone)) {
      return errorResponse(req, 401, "invalid_credentials", "The registration number and phone number could not be verified.");
    }

    const memberId = String(member.id || "");
    if (!memberId) throw new Error("service_unavailable");
    return jsonResponse(req, {
      organization: org,
      member: safeMember(member, org),
      token: await issueMemberToken(memberId, org)
    });
  } catch (error) {
    return jsonError(req, error);
  }
});
