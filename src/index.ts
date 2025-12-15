import "dotenv/config";
import express from "express";
import connectDB from "./config/db";
import financeRoutes from "./routes/dashboardRoutes";
import userRoutes from "./routes/userRoutes";
import cors from "cors";
import rateLimit from "express-rate-limit";
// check if jwt secret exists
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}

//const PORT = process.env.PORT || 4000;
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 requests per minute per IP
  message: { message: "Too many requests. Slow down." },
});
const app = express();
app.use(globalLimiter);
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://finance-dashboard-gules-omega.vercel.app", // your production domain
      ];

      const vercelPreviewRegex = /^https:\/\/.*\.vercel\.app$/;

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        vercelPreviewRegex.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked: " + origin));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

connectDB();
// ! app.use not app.get here
// ORDER MATTERS:
// if it was financeRoutes first,
// express sees url starts with /api, matches the first router: financeRoutes, enters financeRoutes, the first line is router.use(authenticateToken), middleware runs, sees no token yet because user hasn't logged in or registered, throws 401 :(, request dies here, never reaches userRoutes.
app.use("/api", userRoutes);
app.use("/api", financeRoutes);

export default app;

// if it's not running in production, listen on port, otherwise not needed since vercel uses serverless functions
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
