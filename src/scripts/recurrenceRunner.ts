// scripts/recurrenceRunner.ts
import cron from "node-cron";
import RecurringCharge from "../models/RecurringCharge";
import Dashboard from "../models/Dashboard";
import { addIntervalIso, generateOccurrencesIso } from "../utils/recurrence";

const HORIZON_DAYS = 90; // ensure next 90 days are covered

cron.schedule("0 2 * * *", async () => {
  // run daily at 02:00
  try {
    const now = new Date();
    const horizonDate = new Date(
      now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000
    );
    const horizonIso = horizonDate.toISOString().slice(0, 10);

    // Find active rules that need generation
    // FIX: only consider rules that haven't ended (by endDate or count)
    const rules = await RecurringCharge.find({
      $or: [
        { lastGenerated: { $exists: false } },
        { lastGenerated: { $lt: horizonDate } },
      ],
      // If endDate exists and already passed horizonDate, skip (will be filtered later).
    });

    for (const rule of rules) {
      // Skip if rule ended by endDate
      if (rule.endDate && rule.endDate.getTime() < now.getTime()) {
        continue;
      }

      // compute start ISO
      let startIso = rule.lastGenerated
        ? rule.lastGenerated.toISOString().slice(0, 10)
        : rule.startDate.toISOString().slice(0, 10);

      // if lastGenerated exists, we want next occurrence AFTER lastGenerated
      if (rule.lastGenerated) {
        startIso = addIntervalIso(startIso, rule.repeating, rule.interval ?? 1);
      }

      // how many to generate until horizon
      // FIX: respect rule.count (max total occurrences) by computing alreadyGenerated
      const dashboard = await Dashboard.findOne({ userId: rule.userId });
      if (!dashboard) continue;

      // count how many occurrences already generated for this rule
      const alreadyGenerated = dashboard.upcomingCharges.filter(
        (c: any) =>
          c.parentRecurringId &&
          c.parentRecurringId.toString() === rule._id.toString()
      ).length;

      // if rule.count is defined, compute remaining allowed
      let maxAllowed = 36; // fallback hard cap
      if (rule.count && Number.isFinite(rule.count)) {
        const remaining = (rule.count as number) - alreadyGenerated;
        if (remaining <= 0) {
          // nothing left to generate
          continue;
        }
        maxAllowed = Math.min(maxAllowed, remaining);
      }

      const occurrences = generateOccurrencesIso({
        startDateIso: startIso,
        repeating: rule.repeating,
        interval: rule.interval ?? 1,
        maxCount: maxAllowed,
        untilIso: rule.endDate
          ? rule.endDate.toISOString().slice(0, 10)
          : horizonIso,
      });

      if (!occurrences.length) continue;

      // push occurrences but avoid duplicates by checking dashboard.upcomingCharges
      const existingDates = new Set(
        dashboard.upcomingCharges
          .filter(
            (c: any) =>
              c.parentRecurringId &&
              c.parentRecurringId.toString() === rule._id.toString()
          )
          .map((c: any) => {
            // normalize to YYYY-MM-DD
            const d =
              c.date instanceof Date
                ? c.date.toISOString().slice(0, 10)
                : new Date(c.date).toISOString().slice(0, 10);
            return d;
          })
      );

      let lastInsertedIso: string | null = null;
      for (const iso of occurrences) {
        if (existingDates.has(iso)) {
          // already present, skip
          continue;
        }
        dashboard.upcomingCharges.push({
          date: new Date(iso + "T00:00:00Z"),
          company: rule.company,
          amount: rule.amount,
          category: rule.category,
          recurring: true,
          parentRecurringId: rule._id,
          repeating: rule.repeating,
        } as any);
        lastInsertedIso = iso;
        existingDates.add(iso);
      }

      if (!lastInsertedIso) {
        // nothing new was inserted
        continue;
      }

      // update lastGenerated to last inserted occurrence (or to the last generated occurrence)
      rule.lastGenerated = new Date(lastInsertedIso + "T00:00:00Z");
      await rule.save();
      await dashboard.save();
    }
  } catch (err) {
    console.error("recurrence runner error:", err);
  }
});
