import type { Request, Response } from "express";
import mongoose from "mongoose";
import { parseCSVSync, buildCSV } from "../utils/csv";

// Import  models
import Transaction from "../models/Transaction";
import UpcomingCharge from "../models/UpcomingCharge";
import Debt from "../models/Debt";
import Goal from "../models/Goal";

type Entity = "transactions" | "upcomingCharges" | "debts" | "goals";

// Helper to get the correct Mongoose Model based on the entity string
function getModel(entity: Entity) {
  switch (entity) {
    case "transactions":
      return Transaction;
    case "upcomingCharges":
      return UpcomingCharge;
    case "debts":
      return Debt;
    case "goals":
      return Goal;
    default:
      throw new Error("Unknown entity");
  }
}

// so that all dates are synchronized, instead of different dates because of time zones
function parseSafeDate(dateStr: string) {
  const trimmed = dateStr ? dateStr.trim() : "";
  if (!trimmed) return new Date(); // Fallback to now if empty

  // If it's a simple date YYYY-MM-DD, append "T12:00:00" to force noon UTC (safe middle of day)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }
  return new Date(trimmed);
}

// normalizers
function normalizeTransactionRow(r: any, userId: string) {
  return {
    userId,
    _id:
      r._id && mongoose.isValidObjectId(r._id)
        ? new mongoose.Types.ObjectId(String(r._id))
        : new mongoose.Types.ObjectId(),
    date: parseSafeDate(r.date),
    company: (r.company || "").trim(),
    amount: Number(r.amount),
    transactionType: r.transactionType,
    category: r.category,
    account: r.account || "cash",
  };
}

function normalizeUpcomingRow(r: any, userId: string) {
  return {
    userId,
    _id:
      r._id && mongoose.isValidObjectId(r._id)
        ? new mongoose.Types.ObjectId(String(r._id))
        : new mongoose.Types.ObjectId(),
    date: parseSafeDate(r.date),
    company: (r.company || "").trim(),
    amount: Number(r.amount),
    category: r.category,
    recurring:
      r.recurring === "true" || r.recurring === "1" || r.recurring === true,
    // Handle optional parent ID carefully
    parentRecurringId:
      r.parentRecurringId && mongoose.isValidObjectId(r.parentRecurringId)
        ? new mongoose.Types.ObjectId(String(r.parentRecurringId))
        : undefined,
    repeating: r.repeating || undefined,
  };
}

function normalizeDebtRow(r: any, userId: string) {
  return {
    userId,
    _id:
      r._id && mongoose.isValidObjectId(r._id)
        ? new mongoose.Types.ObjectId(String(r._id))
        : new mongoose.Types.ObjectId(),
    company: (r.company || "").trim(),
    currentPaid: Number(r.currentPaid),
    totalAmount: Number(r.totalAmount),
    dueDate: parseSafeDate(r.dueDate),
  };
}

function normalizeGoalRow(r: any, userId: string) {
  return {
    userId,
    _id:
      r._id && mongoose.isValidObjectId(r._id)
        ? new mongoose.Types.ObjectId(String(r._id))
        : new mongoose.Types.ObjectId(),
    title: (r.title || "").trim(),
    targetDate: parseSafeDate(r.targetDate),
    currentAmount: Number(r.currentAmount || 0),
    targetAmount: Number(r.targetAmount || 0),
  };
}

function getNormalizer(entity: Entity) {
  switch (entity) {
    case "transactions":
      return normalizeTransactionRow;
    case "upcomingCharges":
      return normalizeUpcomingRow;
    case "debts":
      return normalizeDebtRow;
    case "goals":
      return normalizeGoalRow;
    default:
      throw new Error("Unknown entity");
  }
}

// Basic validation helpers
function isValidDate(d: Date) {
  return d instanceof Date && !isNaN(d.getTime());
}

function validateDoc(entity: Entity, doc: any) {
  if (entity === "transactions") {
    if (!isValidDate(doc.date)) return "Invalid date";
    if (!doc.company) return "Missing company";
    if (!Number.isFinite(doc.amount)) return "Invalid amount";
    if (!["income", "expense"].includes(doc.transactionType))
      return "Invalid transactionType";
  }
  if (entity === "upcomingCharges") {
    if (!isValidDate(doc.date)) return "Invalid date";
    if (!doc.company) return "Missing company";
  }
  if (entity === "debts") {
    if (!doc.company) return "Missing company";
    if (!isValidDate(doc.dueDate)) return "Invalid dueDate";
  }
  if (entity === "goals") {
    if (!doc.title) return "Missing title";
    if (!isValidDate(doc.targetDate)) return "Invalid targetDate";
  }
  return null;
}

/**
 * POST /api/import/:entity?mode=append|replace|upsert
 */
export const importToDashboard = async (req: Request, res: Response) => {
  try {
    const entityParam = String(req.params.entity || "");
    const allowed: Entity[] = [
      "transactions",
      "upcomingCharges",
      "debts",
      "goals",
    ];

    if (!allowed.includes(entityParam as Entity)) {
      return res.status(400).json({ message: "Unknown entity" });
    }

    const entity = entityParam as Entity;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // file must be provided
    if (!req.file) return res.status(400).json({ message: "Missing file" });

    const text = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const rawRows = parseCSVSync(text) as any[];

    const normalize = getNormalizer(entity);
    const Model = getModel(entity); // Get the Mongoose Model

    // Normalize and validate, gather errors
    const docs: any[] = [];
    const errors: { row: number; message: string }[] = [];

    rawRows.forEach((r: any, i: number) => {
      try {
        const doc = normalize(r, userId); // Pass userId to normalizer
        const v = validateDoc(entity, doc);
        if (v) {
          errors.push({ row: i + 1, message: v });
        } else {
          docs.push(doc);
        }
      } catch (e: any) {
        errors.push({
          row: i + 1,
          message: e?.message || "Normalization failed",
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "CSV validation failed",
        errors: errors.slice(0, 50),
        total: rawRows.length,
      });
    }

    const mode = String(req.query.mode || "append");

    // fixed now that i have separate models

    if (mode === "replace") {
      // Delete all existing docs for this user
      await Model.deleteMany({ userId });

      // Insert new docs
      if (docs.length > 0) {
        await Model.insertMany(docs);
      }

      return res.json({
        message: "Replaced successfully",
        inserted: docs.length,
      });
    }

    if (mode === "append") {
      // Insert all docs.
      // Note: This does NOT filter duplicates automatically unless you have unique indexes in DB.

      const existing = await Model.find({ userId }).lean();
      const toInsert: any[] = [];

      for (const doc of docs) {
        let isDup = false;

        if (entity === "transactions") {
          isDup = existing.some(
            (e: any) =>
              new Date(e.date).toISOString().slice(0, 10) ===
                doc.date.toISOString().slice(0, 10) &&
              e.company === doc.company &&
              Number(e.amount) === Number(doc.amount)
          );
        } else if (entity === "debts") {
          isDup = existing.some(
            (e: any) =>
              e.company === doc.company &&
              new Date(e.dueDate).toISOString().slice(0, 10) ===
                doc.dueDate.toISOString().slice(0, 10)
          );
        }
        // TODO any other checks?

        if (!isDup) {
          toInsert.push(doc);
        }
      }

      if (toInsert.length > 0) {
        await Model.insertMany(toInsert);
      }

      return res.json({
        message: "Appended",
        inserted: toInsert.length,
        skipped: docs.length - toInsert.length,
      });
    }

    if (mode === "upsert") {
      // For separate collections, best way is bulkWrite
      const operations = docs.map((doc) => {
        // If _id provided, use it. Else try to match fields.
        // Simplified: Since CSVs from your tool usually have _id, we use that.
        // If no _id, we treat as insert (or define a custom filter)

        return {
          updateOne: {
            filter: { _id: doc._id, userId }, // Must match ID and User
            update: { $set: doc },
            upsert: true,
          },
        };
      });

      if (operations.length > 0) {
        await Model.bulkWrite(operations);
      }

      return res.json({ message: "Upsert complete", total: docs.length });
    }

    return res.status(400).json({ message: "Unknown mode" });
  } catch (err: any) {
    console.error("importToDashboard error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};

/**
 * GET /api/export/:entity
 */
export const exportFromDashboard = async (req: Request, res: Response) => {
  try {
    const entityParam = String(req.params.entity || "");
    const allowed: Entity[] = [
      "transactions",
      "upcomingCharges",
      "debts",
      "goals",
    ];

    if (!allowed.includes(entityParam as Entity)) {
      return res.status(400).json({ message: "Unknown entity" });
    }

    const entity = entityParam as Entity;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const Model = getModel(entity); // Get correct model

    // Fetch directly from collection
    // .lean() makes it a plain JS object (faster)
    const rows = await Model.find({ userId }).lean();

    // Map rows to CSV-safe primitives (dates -> YYYY-MM-DD)
    const mapped = rows.map((r: any) => {
      const out: any = { ...r };

      // Remove backend-specific fields if you want clean CSVs
      delete out.__v;
      delete out.userId; // Don't export userId usually

      for (const k of Object.keys(out)) {
        if (out[k] instanceof Date) {
          out[k] = (out[k] as Date).toISOString().slice(0, 10);
        }
        // ensure ObjectIds are strings
        if (mongoose.isValidObjectId(out[k])) {
          out[k] = out[k].toString();
        }
      }
      return out;
    });

    // Choose columns based on first row (or explicit definition)
    const columns = mapped.length > 0 ? Object.keys(mapped[0]) : [];

    const csv = buildCSV(mapped, columns);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${entity}.csv"`
    );
    res.send(csv);
  } catch (err: any) {
    console.error("exportFromDashboard error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err?.message });
  }
};
