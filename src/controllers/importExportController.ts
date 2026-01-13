// controllers/dashboardImportController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Dashboard from "../models/Dashboard";
import { parseCSVSync, buildCSV } from "../utils/csv";
// you already made csv util
// NOTE: keep your existing comments in the file as you requested

type Entity = "transactions" | "upcomingCharges" | "debts" | "goals";

// so that all dates are synchronized, instead of different dates because of time zones
function parseSafeDate(dateStr: string) {
  // 1. Check if string is just YYYY-MM-DD (length 10)
  const trimmed = dateStr.trim();

  // 2. If it's a simple date, append "T12:00:00" to force it to noon
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }

  // 3. Fallback for other formats
  return new Date(trimmed);
}
function normalizeTransactionRow(r: any) {
  return {
    _id: r._id
      ? new mongoose.Types.ObjectId(String(r._id))
      : new mongoose.Types.ObjectId(),
    date: parseSafeDate(r.date),
    company: (r.company || "").trim(),
    amount: Number(r.amount),
    transactionType: r.transactionType,
    category: r.category,
    account: r.account,
  };
}

function normalizeUpcomingRow(r: any) {
  return {
    _id: r._id
      ? new mongoose.Types.ObjectId(String(r._id))
      : new mongoose.Types.ObjectId(),
    date: parseSafeDate(r.date),
    company: (r.company || "").trim(),
    amount: Number(r.amount),
    category: r.category,
    recurring:
      r.recurring === "true" || r.recurring === "1" || r.recurring === true,
    parentRecurringId: r.parentRecurringId
      ? new mongoose.Types.ObjectId(String(r.parentRecurringId))
      : undefined,
    repeating: r.repeating || undefined,
  };
}

function normalizeDebtRow(r: any) {
  return {
    _id: r._id
      ? new mongoose.Types.ObjectId(String(r._id))
      : new mongoose.Types.ObjectId(),
    company: (r.company || "").trim(),
    currentPaid: Number(r.currentPaid),
    totalAmount: Number(r.totalAmount),
    dueDate: parseSafeDate(r.dueDate),
  };
}

function normalizeGoalRow(r: any) {
  return {
    _id: r._id
      ? new mongoose.Types.ObjectId(String(r._id))
      : new mongoose.Types.ObjectId(),
    title: (r.title || "").trim(),
    targetDate: parseSafeDate(r.targetDate),
    currentAmount: Number(r.currentAmount || 0),
    targetAmount: Number(r.targetAmount || 0),
  };
}

function getNormalizers(entity: Entity) {
  switch (entity) {
    case "transactions":
      return {
        normalize: normalizeTransactionRow,
        arrayName: "transactions" as const,
      };
    case "upcomingCharges":
      return {
        normalize: normalizeUpcomingRow,
        arrayName: "upcomingCharges" as const,
      };
    case "debts":
      return { normalize: normalizeDebtRow, arrayName: "debts" as const };
    case "goals":
      return { normalize: normalizeGoalRow, arrayName: "goals" as const };
    default:
      throw new Error("Unknown entity");
  }
}

// Basic validation helpers (expand as necessary)
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
 * body: multipart/form-data file field "file"
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
    console.log(req.file?.filename);
    console.log(entity);

    // file must be provided (your multer middleware should have put it on req.file)
    if (!req.file) return res.status(400).json({ message: "Missing file" });

    const text = req.file.buffer.toString("utf8").replace(/^\uFEFF/, ""); // strip BOM if present
    const rawRows = parseCSVSync(text) as any[];

    const { normalize, arrayName } = getNormalizers(entity);

    // Normalize + validate, gather errors
    const docs: any[] = [];
    const errors: { row: number; message: string }[] = [];
    rawRows.forEach((r: any, i: number) => {
      try {
        const doc = normalize(r);
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
      // return preview-like response with errors; let client decide whether to continue
      return res.status(400).json({
        message: "CSV validation failed",
        errors: errors.slice(0, 50),
        total: rawRows.length,
      });
    }

    // mode: append | replace | upsert
    const mode = String(req.query.mode || "append");

    // find user's dashboard
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Work with the array in-memory and save once for simplicity (good for small sets)
    if (mode === "replace") {
      // destructive: replace the whole array
      // backup step would be recommended before doing this in production
      (dashboard as any)[arrayName] = docs;
      await dashboard.save();
      return res.json({
        message: "Replaced successfully",
        inserted: docs.length,
      });
    }

    if (mode === "append") {
      // just push docs (but avoid exact duplicate - basic check)
      const existing = (dashboard as any)[arrayName] as any[];
      const inserted: any[] = [];
      for (const doc of docs) {
        // Simple duplicate test by combination of fields (customize per entity)
        let isDup = false;
        if (entity === "transactions") {
          isDup = existing.some(
            (e) =>
              new Date(e.date).toISOString().slice(0, 10) ===
                doc.date.toISOString().slice(0, 10) &&
              e.company === doc.company &&
              Number(e.amount) === Number(doc.amount) &&
              e.account === doc.account
          );
        } else if (entity === "upcomingCharges") {
          isDup = existing.some(
            (e) =>
              new Date(e.date).toISOString().slice(0, 10) ===
                doc.date.toISOString().slice(0, 10) &&
              e.company === doc.company &&
              Number(e.amount) === Number(doc.amount)
          );
        } else if (entity === "debts") {
          isDup = existing.some(
            (e) =>
              e.company === doc.company &&
              new Date(e.dueDate).toISOString().slice(0, 10) ===
                doc.dueDate.toISOString().slice(0, 10)
          );
        } else if (entity === "goals") {
          isDup = existing.some(
            (e) =>
              e.title === doc.title &&
              new Date(e.targetDate).toISOString().slice(0, 10) ===
                doc.targetDate.toISOString().slice(0, 10)
          );
        }

        if (!isDup) {
          inserted.push(doc);
          existing.push(doc);
        }
      }
      await dashboard.save();
      return res.json({
        message: "Appended",
        inserted: inserted.length,
        skipped: docs.length - inserted.length,
      });
    }

    if (mode === "upsert") {
      // match by _id if provided; otherwise by natural key.
      const existing = (dashboard as any)[arrayName] as any[];
      let updated = 0;
      let inserted = 0;
      for (const doc of docs) {
        let foundIndex = -1;
        if (doc._id) {
          foundIndex = existing.findIndex(
            (e) => String(e._id) === String(doc._id)
          );
        }
        if (foundIndex === -1) {
          // try natural key
          if (entity === "transactions") {
            foundIndex = existing.findIndex(
              (e) =>
                new Date(e.date).toISOString().slice(0, 10) ===
                  doc.date.toISOString().slice(0, 10) &&
                e.company === doc.company &&
                Number(e.amount) === Number(doc.amount) &&
                e.account === doc.account
            );
          } else if (entity === "upcomingCharges") {
            foundIndex = existing.findIndex(
              (e) =>
                new Date(e.date).toISOString().slice(0, 10) ===
                  doc.date.toISOString().slice(0, 10) &&
                e.company === doc.company &&
                Number(e.amount) === Number(doc.amount)
            );
          } else if (entity === "debts") {
            foundIndex = existing.findIndex(
              (e) =>
                e.company === doc.company &&
                new Date(e.dueDate).toISOString().slice(0, 10) ===
                  doc.dueDate.toISOString().slice(0, 10)
            );
          } else if (entity === "goals") {
            foundIndex = existing.findIndex(
              (e) =>
                e.title === doc.title &&
                new Date(e.targetDate).toISOString().slice(0, 10) ===
                  doc.targetDate.toISOString().slice(0, 10)
            );
          }
        }

        if (foundIndex !== -1) {
          // update existing
          existing[foundIndex] = { ...existing[foundIndex], ...doc };
          updated++;
        } else {
          // insert new
          existing.push(doc);
          inserted++;
        }
      }

      await dashboard.save();
      return res.json({ message: "Upsert complete", updated, inserted });
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
 * Export the requested entity's array as CSV
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

    const dashboard = await Dashboard.findOne({ userId }).lean().exec();
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    const rows = (dashboard as any)[entity] as any[];

    // map rows to CSV-safe primitives (dates -> YYYY-MM-DD)
    const mapped = rows.map((r: any) => {
      const out: any = { ...r };
      for (const k of Object.keys(out)) {
        if (out[k] instanceof Date) {
          out[k] = (out[k] as Date).toISOString().slice(0, 10);
        }
      }
      return out;
    });

    // Choose columns based on entity (simple header inference)
    const columns = mapped.length > 0 ? Object.keys(mapped[0]) : []; // or explicitly define headers
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
