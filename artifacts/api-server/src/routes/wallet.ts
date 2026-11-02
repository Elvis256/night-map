import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import type { WalletSummary } from "@workspace/api-zod";
import { bookingsTable, db, walletLedgerTable } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/wallet", async (req, res) => {
  const me = currentUser(req);
  const [ledger, earned, spent] = await Promise.all([
    db.select().from(walletLedgerTable).where(eq(walletLedgerTable.userId, me.id)).orderBy(desc(walletLedgerTable.createdAt)).limit(100),
    db.select({ rate: bookingsTable.rate, hours: bookingsTable.hours }).from(bookingsTable).where(and(eq(bookingsTable.companionId, me.id), eq(bookingsTable.status, "completed"))),
    db.select({ rate: bookingsTable.rate, hours: bookingsTable.hours }).from(bookingsTable).where(and(eq(bookingsTable.seekerId, me.id), eq(bookingsTable.status, "completed"))),
  ]);
  const balance = ledger.filter((e) => e.status === "completed").reduce((s, e) => s + e.amount, 0);
  const payload: WalletSummary = {
    balance,
    totalEarnings: earned.reduce((s, b) => s + b.rate * b.hours, 0),
    pendingPayout: ledger.filter((e) => e.kind === "payout" && e.status === "pending").reduce((s, e) => s + Math.abs(e.amount), 0),
    totalSpent: spent.reduce((s, b) => s + b.rate * b.hours, 0),
    paymentsEnabled: false,
    transactions: ledger.map((e) => ({
      id: e.id,
      amount: e.amount,
      kind: e.kind,
      status: e.status,
      reference: e.reference,
      createdAt: e.createdAt.toISOString(),
    })),
  };
  res.json(payload);
});

export default router;
