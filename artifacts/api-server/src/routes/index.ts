import { Router, type IRouter } from "express";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import cityRouter from "./city";
import companionsRouter from "./companions";
import connectionsRouter from "./connections";
import healthRouter from "./health";
import loungesRouter from "./lounges";
import meRouter from "./me";
import notificationsRouter from "./notifications";
import reviewsRouter from "./reviews";
import safetyRouter from "./safety";
import streamsRouter from "./streams";
import verificationRouter from "./verification";
import walletRouter from "./wallet";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(companionsRouter);
router.use(connectionsRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);
router.use(safetyRouter);
router.use(walletRouter);
router.use(streamsRouter);
router.use(loungesRouter);
router.use(cityRouter);
router.use(verificationRouter);

export default router;
