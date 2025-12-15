"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
// A mongoose schema. Exists at runtime, tells MongoDB how to store, validate, and structure data. This is what actually enforces rules in the database.
// I need both the interface, and the schema.
// With new Schema<IDashboard>... mongoose knows the structure, typescript knows the document type returned.
// So when i do await Dashboard.findOne(...), i get intellisense, type checking, fewer runtime bugs
var DashboardSchema = new mongoose_1.Schema({
    // user id, each user will have their own data
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    overview: {
        totalBalance: Number,
        monthlyChange: Number,
    },
    accounts: [
        {
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            type: {
                type: String,
                enum: ["checking", "savings", "credit", "cash"],
            },
            balance: Number,
            createdAt: {
                type: Date,
                default: Date.now,
            },
            _id: {
                type: mongoose_1.Schema.Types.ObjectId,
                auto: true,
            },
        },
    ],
    transactions: [
        {
            date: String,
            company: String,
            amount: Number,
            transactionType: String,
            category: {
                type: String,
                enum: ["Subscription", "Bill", "Loan", "Insurance", "Tax", "Other"],
            },
            _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
        },
    ],
    upcomingCharges: [
        {
            date: String,
            company: String,
            amount: Number,
            category: {
                type: String,
                enum: ["Subscription", "Bill", "Loan", "Insurance", "Tax", "Other"],
            },
            recurring: Boolean,
            _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
        },
    ],
    debts: [
        {
            company: String,
            currentPaid: Number,
            totalAmount: Number,
            dueDate: String,
            _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
        },
    ],
    goals: [
        {
            title: String,
            targetDate: String,
            currentAmount: Number,
            targetAmount: Number,
            _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
        },
    ],
    income: [
        {
            company: String,
            amount: Number,
            _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
        },
    ],
}, {
    collection: "finance_collection",
});
// don't allow duplicate charges
DashboardSchema.path("upcomingCharges").validate(function (charges) {
    var seen = new Set();
    for (var _i = 0, charges_1 = charges; _i < charges_1.length; _i++) {
        var charge = charges_1[_i];
        // define what counts as a duplicate: company + date
        var key = "".concat(charge.company, "-").concat(charge.date);
        if (seen.has(key))
            return false; // duplicate found
        seen.add(key);
    }
    return true;
}, "Duplicate upcoming charges are not allowed.");
// the model Dashboard is what i use to query the database
exports.default = mongoose_1.default.model("Dashboard", DashboardSchema, "finance_collection");
