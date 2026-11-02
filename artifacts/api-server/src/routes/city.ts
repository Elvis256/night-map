import { Router, type IRouter } from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import { GetCityWeatherParams, ListOutagesQueryParams, ReportOutageBody } from "@workspace/api-zod";
import { db, outageReportsTable } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { getWeather } from "../lib/weather";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/cities/:city/weather", async (req, res) => {
  const { city } = GetCityWeatherParams.parse(req.params);
  res.json(await getWeather(city));
});

router.get("/outages", async (req, res) => {
  const q = ListOutagesQueryParams.parse(req.query);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const conditions = [gt(outageReportsTable.createdAt, since)];
  if (q.city) conditions.push(eq(outageReportsTable.city, q.city));
  const rows = await db.select().from(outageReportsTable).where(and(...conditions)).orderBy(desc(outageReportsTable.createdAt)).limit(100);
  const latestByArea = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const key = `${r.city}:${r.area.toLowerCase()}`;
    if (!latestByArea.has(key)) latestByArea.set(key, r);
  }
  res.json(
    [...latestByArea.values()]
      .filter((r) => r.status !== "restored")
      .map((r) => ({ id: r.id, city: r.city, area: r.area, status: r.status, createdAt: r.createdAt.toISOString() })),
  );
});

router.post("/outages", async (req, res) => {
  const me = currentUser(req);
  const body = ReportOutageBody.parse(req.body);
  const [r] = await db
    .insert(outageReportsTable)
    .values({ reporterId: me.id, city: body.city.trim(), area: body.area.trim(), status: body.status })
    .returning();
  res.status(201).json({ id: r.id, city: r.city, area: r.area, status: r.status, createdAt: r.createdAt.toISOString() });
});

export default router;
