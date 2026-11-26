import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ENV } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminRouter } from "./routes/admin.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { cartRouter } from "./routes/cart.routes.js";
import { catalogRouter } from "./routes/catalog.routes.js";
import { customerRouter } from "./routes/customer.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { sellerRouter } from "./routes/seller.routes.js";
import { wishlistRouter } from "./routes/wishlist.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: ENV.corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "closetloop-backend" });
  });

  app.use("/api/catalog", catalogRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/admin", adminRouter);

  app.use(errorHandler);
  return app;
}
