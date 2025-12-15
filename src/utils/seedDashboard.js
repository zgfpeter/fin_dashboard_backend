"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var dotenv_1 = require("dotenv");
// This tells the script: "Look for .env in the current working directory (Root)"
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
var mongoose_1 = require("mongoose");
var Dashboard_1 = require("../models/Dashboard");
var User_1 = require("../models/User");
var connectDB = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, mongoose_1.default.connect("mongodb+srv://petros:Abc12345@freecluster.oelub3u.mongodb.net/finance_database?retryWrites=true&w=majority")];
            case 1:
                _a.sent();
                console.log("✅ MongoDB Connected");
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("❌ DB Connection Error:", error_1);
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
var seedData = function () { return __awaiter(void 0, void 0, void 0, function () {
    var user, dashboardData, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, connectDB()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, , 7]);
                return [4 /*yield*/, User_1.default.findOne()];
            case 3:
                user = _a.sent();
                if (!user) {
                    console.log("❌ No users found.");
                    process.exit(1);
                }
                console.log("\uD83C\uDF31 Seeding data for: ".concat(user.username));
                // 2. Clear old data
                return [4 /*yield*/, Dashboard_1.default.deleteOne({ userId: user._id })];
            case 4:
                // 2. Clear old data
                _a.sent();
                dashboardData = {
                    userId: user._id,
                    overview: {
                        totalBalance: 4250.5,
                        monthlyChange: 12.5,
                    },
                    accounts: [
                        {
                            userId: user._id,
                            type: "checking",
                            balance: 2350.18,
                            createdAt: new Date().toISOString(),
                        },
                        {
                            userId: user._id,
                            type: "savings",
                            balance: 1783.51,
                            createdAt: new Date().toISOString(),
                        },
                        {
                            userId: user._id,
                            type: "credit",
                            balance: 864.34,
                            createdAt: new Date().toISOString(),
                        },
                        {
                            userId: user._id,
                            type: "cash",
                            balance: 593.31,
                            createdAt: new Date().toISOString(),
                        },
                    ],
                    income: [
                        {
                            company: "Tech Solutions Inc.",
                            amount: 3500,
                        },
                        {
                            company: "Upwork Freelance",
                            amount: 450,
                        },
                    ],
                    transactions: [
                        {
                            date: "2025-01-12",
                            company: "Spotify",
                            amount: 12.99,
                            transactionType: "expense",
                            category: "Subscription",
                        },
                        {
                            date: "2025-01-12",
                            company: "Whole Foods",
                            amount: 85.5,
                            transactionType: "expense",
                            category: "Other",
                        },
                        {
                            date: "2025-01-10",
                            company: "Tech Solutions Inc.",
                            amount: 3500,
                            transactionType: "income",
                            category: "Other",
                        },
                        {
                            date: "2025-01-05",
                            company: "Geico",
                            amount: 120.0,
                            transactionType: "expense",
                            category: "Insurance",
                        },
                        {
                            date: "2024-12-28",
                            company: "Electric Company",
                            amount: 145.2,
                            transactionType: "expense",
                            category: "Bill",
                        },
                    ],
                    upcomingCharges: [
                        {
                            date: "2025-02-01",
                            company: "Netflix",
                            amount: 15.99,
                            category: "Subscription",
                            recurring: true,
                        },
                        {
                            date: "2025-02-01",
                            company: "Apartment Rent",
                            amount: 1200.0,
                            category: "Bill",
                            recurring: true,
                        },
                        {
                            date: "2025-02-15",
                            company: "Car Insurance",
                            amount: 120.0,
                            category: "Insurance",
                            recurring: true,
                        },
                    ],
                    debts: [
                        {
                            company: "Chase Credit Card",
                            currentPaid: 500,
                            totalAmount: 2000,
                            dueDate: "2025-12-31",
                        },
                        {
                            company: "Student Loan",
                            currentPaid: 15000,
                            totalAmount: 40000,
                            dueDate: "2030-05-15",
                        },
                    ],
                    goals: [
                        {
                            title: "Trip to Japan",
                            targetDate: "2025-06-01",
                            currentAmount: 1500,
                            targetAmount: 5000,
                        },
                        {
                            title: "New MacBook",
                            targetDate: "2025-11-20",
                            currentAmount: 800,
                            targetAmount: 2500,
                        },
                    ],
                };
                // 4. Create
                return [4 /*yield*/, Dashboard_1.default.create(dashboardData)];
            case 5:
                // 4. Create
                _a.sent();
                console.log("✅ Dummy data successfully seeded!");
                process.exit(0);
                return [3 /*break*/, 7];
            case 6:
                error_2 = _a.sent();
                console.error("❌ Seeding failed:", error_2);
                process.exit(1);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
seedData();
