// routes/importExportRoutes.ts
import { Router } from "express";
import multer from "multer";
import {
  importToDashboard,
  exportFromDashboard,
} from "../controllers/importExportController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Multer config (memory storage ,  since i read CSV from buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB  limit
  },
});

// IMPORT ( entity is like :id here, don't be confused by name)
router.post(
  "/import/:entity",
  authenticateToken, // auth first
  upload.single("file"), // CSV file
  importToDashboard
);

// EXPORT
router.get("/export/:entity", authenticateToken, exportFromDashboard);

export default router;
