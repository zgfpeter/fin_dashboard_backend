import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import financeRoutes from "./routes/dashboardRoutes";
import userRoutes from "./routes/userRoutes";
import cors from "cors";
import rateLimit from "express-rate-limit";
dotenv.config();
const PORT = process.env.PORT || 4000;
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 requests per minute per IP
  message: { message: "Too many requests. Slow down." },
});
const app = express();
app.use(globalLimiter);
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "finance-dashboard-gules-omega.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

connectDB();
// ! app.use not app.get here
app.use("/api", financeRoutes);
app.use("/api", userRoutes);

app.listen(PORT, () => {
  console.log("Server is listening...", PORT);
});
