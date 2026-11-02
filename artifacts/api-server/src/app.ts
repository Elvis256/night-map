import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { errorHandler } from "./lib/errors";
import { logger } from "./lib/logger";
import { PUBLIC_UPLOADS } from "./lib/storage";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "40mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(PUBLIC_UPLOADS, { maxAge: "7d", immutable: true }));
app.use("/api", router);
app.use((_req, res) => {
  res.status(404).json({ message: "Not found", code: "not_found" });
});
app.use(errorHandler);

export default app;
