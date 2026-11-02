import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { AdminReviewVerificationBody, AdminReviewVerificationParams, SubmitVerificationBody } from "@workspace/api-zod";
import type { AdminVerification, VerificationStatus } from "@workspace/api-zod";
import { db, usersTable, verificationRequestsTable } from "@workspace/db";
import { currentUser, requireAdmin, requireAuth } from "../lib/auth";
import { badRequest, notFound } from "../lib/errors";
import { awardPoints, notify, notifyAdmins, POINTS } from "../lib/notify";
import { privatePath, saveUpload } from "../lib/storage";

const router: IRouter = Router();
router.use(requireAuth);

function statusPayload(user: { verificationStatus: VerificationStatus["status"] }, request?: typeof verificationRequestsTable.$inferSelect | null): VerificationStatus {
  return {
    status: user.verificationStatus,
    requestId: request?.id ?? null,
    submittedAt: request?.createdAt.toISOString() ?? null,
    reviewedAt: request?.reviewedAt?.toISOString() ?? null,
    reviewNote: request?.reviewNote || null,
  };
}

async function latestRequest(userId: string) {
  const rows = await db.select().from(verificationRequestsTable).where(eq(verificationRequestsTable.userId, userId)).orderBy(desc(verificationRequestsTable.createdAt)).limit(1);
  return rows[0] ?? null;
}

router.get("/verification", async (req, res) => {
  const me = currentUser(req);
  res.json(statusPayload(me, await latestRequest(me.id)));
});

router.post("/verification", async (req, res) => {
  const me = currentUser(req);
  const body = SubmitVerificationBody.parse(req.body);
  if (me.verified) throw badRequest("You are already verified", "already_verified");
  if (me.verificationStatus === "pending") throw badRequest("Your verification is already under review", "already_pending");
  const [idPhoto, selfie, video] = await Promise.all([
    saveUpload(body.idPhotoBase64, { visibility: "private", kind: "image" }),
    saveUpload(body.selfieBase64, { visibility: "private", kind: "image" }),
    body.videoBase64 ? saveUpload(body.videoBase64, { visibility: "private", kind: "video" }) : Promise.resolve(null),
  ]);
  const [request] = await db
    .insert(verificationRequestsTable)
    .values({ userId: me.id, idPhotoPath: idPhoto.path, selfiePath: selfie.path, videoPath: video?.path ?? null, code: body.code })
    .returning();
  await db.update(usersTable).set({ verificationStatus: "pending" }).where(eq(usersTable.id, me.id));
  await notifyAdmins({ type: "verification", title: `Verification request from ${me.name}`, body: `${me.phone} · ${me.city}`, actorId: me.id, actionRoute: "/admin/verifications" });
  res.status(201).json(statusPayload({ verificationStatus: "pending" }, request));
});

function toAdmin(r: typeof verificationRequestsTable.$inferSelect, user: { name: string; phone: string }): AdminVerification {
  return {
    id: r.id,
    userId: r.userId,
    userName: user.name,
    userPhone: user.phone,
    status: r.status,
    code: r.code,
    idPhotoUrl: `/api/admin/verifications/${r.id}/files/id`,
    selfieUrl: `/api/admin/verifications/${r.id}/files/selfie`,
    videoUrl: r.videoPath ? `/api/admin/verifications/${r.id}/files/video` : null,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  };
}

router.get("/admin/verifications", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ request: verificationRequestsTable, user: usersTable })
    .from(verificationRequestsTable)
    .innerJoin(usersTable, eq(usersTable.id, verificationRequestsTable.userId))
    .orderBy(desc(verificationRequestsTable.createdAt))
    .limit(200);
  res.json(rows.map((r) => toAdmin(r.request, r.user)));
});

router.get("/admin/verifications/:requestId/files/:kind", requireAdmin, async (req, res) => {
  const rows = await db.select().from(verificationRequestsTable).where(eq(verificationRequestsTable.id, String(req.params.requestId))).limit(1);
  const r = rows[0];
  if (!r) throw notFound("Request");
  const kind = String(req.params.kind);
  const file = kind === "id" ? r.idPhotoPath : kind === "selfie" ? r.selfiePath : kind === "video" ? r.videoPath : null;
  if (!file) throw notFound("File");
  res.sendFile(privatePath(file));
});

router.post("/admin/verifications/:requestId", requireAdmin, async (req, res) => {
  const me = currentUser(req);
  const { requestId } = AdminReviewVerificationParams.parse(req.params);
  const body = AdminReviewVerificationBody.parse(req.body);
  const rows = await db
    .select({ request: verificationRequestsTable, user: usersTable })
    .from(verificationRequestsTable)
    .innerJoin(usersTable, eq(usersTable.id, verificationRequestsTable.userId))
    .where(eq(verificationRequestsTable.id, requestId))
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound("Request");
  if (row.request.status !== "pending") throw badRequest("Already reviewed");
  const approved = body.decision === "approve";
  const [updated] = await db
    .update(verificationRequestsTable)
    .set({ status: approved ? "approved" : "rejected", reviewNote: body.note?.trim() ?? "", reviewedBy: me.id, reviewedAt: new Date() })
    .where(eq(verificationRequestsTable.id, requestId))
    .returning();
  await db
    .update(usersTable)
    .set({ verified: approved, verificationStatus: approved ? "approved" : "rejected" })
    .where(eq(usersTable.id, row.user.id));
  if (approved) await awardPoints(row.user.id, POINTS.verified, "verified", "Profile verified");
  await notify({
    userId: row.user.id,
    type: "verification",
    title: approved ? "You're verified ✅" : "Verification not approved",
    body: approved ? `Your verified badge is live. +${POINTS.verified} loyalty points.` : body.note?.trim() || "Please resubmit clearer documents.",
    actionRoute: approved ? "/profile" : "/verify",
    actionLabel: approved ? "View profile" : "Try again",
  });
  res.json(toAdmin(updated, row.user));
});

export default router;
