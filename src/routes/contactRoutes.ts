import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middleware/authMiddleware";
import { contact } from "../controllers/contactController";
const router = Router();

// for dangerous routes (login,signup,password reset, OTP verification etc), i need to protect them by applying a rate limit
// like 5/minute
// limit each IP to 5 requests per minute
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // max 5 requests per IP
  message: {
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true, // return rate limit info in headers
  legacyHeaders: false, // disable old headers
});

// contact route
router.use(authenticateToken);
router.post("/contact", contact);

export default router;
