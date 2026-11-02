import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { AdminGrantSubscriptionBody, RequestSubscriptionBody } from "@workspace/api-zod";
import type { AdminSubscription } from "@workspace/api-zod";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { currentUser, requireAdmin, requireAuth } from "../lib/auth";
import { badRequest, notFound } from "../lib/errors";
import { entitlementsFor, grantPackage, packageById, packageDurationDays, PACKAGES, toSubscription } from "../lib/billing";
import { notify, notifyAdmins } from "../lib/notify";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/packages", (req, res) => {
  const me = currentUser(req);
  res.json(PACKAGES.filter((p) => p.audience === me.role));
});

router.get("/me/entitlements", async (req, res) => {
  res.json(await entitlementsFor(currentUser(req)));
});

router.post("/subscriptions", async (req, res) => {
  const me = currentUser(req);
  const body = RequestSubscriptionBody.parse(req.body);
  const pkg = packageById(body.packageId);
  if (!pkg) throw notFound("Package");
  if (pkg.audience !== me.role) throw badRequest("This package is not available for your role");
  if (pkg.price === 0) throw badRequest("Free packages are active by default");
  const existing = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, me.id), eq(subscriptionsTable.packageId, pkg.id), eq(subscriptionsTable.status, "requested")))
    .limit(1);
  if (existing[0]) {
    res.status(201).json(toSubscription(existing[0]));
    return;
  }
  const [row] = await db
    .insert(subscriptionsTable)
    .values({ userId: me.id, packageId: pkg.id, amount: pkg.price, note: body.note?.trim() ?? "" })
    .returning();
  await notifyAdmins({
    type: "billing",
    title: `${me.name} wants ${pkg.title}`,
    body: `${me.phone} · ${me.role} · UGX ${pkg.price.toLocaleString()}${pkg.period}`,
    actorId: me.id,
  });
  res.status(201).json(toSubscription(row));
});

router.get("/admin/subscriptions", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ sub: subscriptionsTable, user: usersTable })
    .from(subscriptionsTable)
    .innerJoin(usersTable, eq(usersTable.id, subscriptionsTable.userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(200);
  const out: AdminSubscription[] = rows.map((r) => ({
    ...toSubscription(r.sub),
    userId: r.user.id,
    userName: r.user.name,
    userPhone: r.user.phone,
    userRole: r.user.role,
  }));
  res.json(out);
});

router.post("/admin/subscriptions", requireAdmin, async (req, res) => {
  const me = currentUser(req);
  const body = AdminGrantSubscriptionBody.parse(req.body);
  const pkg = packageById(body.packageId);
  if (!pkg) throw notFound("Package");
  const target = await db.select().from(usersTable).where(eq(usersTable.id, body.userId)).limit(1);
  if (!target[0]) throw notFound("User");
  if (pkg.audience !== target[0].role) throw badRequest("Package does not match the user's role");
  const days = body.days ?? packageDurationDays(pkg);
  const row = await grantPackage(target[0].id, pkg, days, body.note?.trim() ?? "", me.id);
  await notify({
    userId: target[0].id,
    type: "billing",
    title: `${pkg.title} is now active ✨`,
    body: `Valid until ${row.endsAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) ?? "further notice"}`,
    actionRoute: "/vip",
    actionLabel: "View package",
  });
  res.status(201).json({ ...toSubscription(row), userId: target[0].id, userName: target[0].name, userPhone: target[0].phone, userRole: target[0].role });
});

export default router;
