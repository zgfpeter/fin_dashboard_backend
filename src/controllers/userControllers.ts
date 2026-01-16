import type { Request, Response } from "express";
import User from "../models/User";
import Dashboard from "../models/Dashboard";

import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose"; // Import mongoose for transactions
import Transaction from "../models/Transaction";
import UpcomingCharge from "../models/UpcomingCharge";
import Debt from "../models/Debt";
import RecurringCharge from "../models/RecurringCharge";
import Goal from "../models/Goal";

const getUserId = (req: AuthRequest) => {
  return req.user?.id || req.user?._id;
};
export const userSignUp = async (req: Request, res: Response) => {
  console.log("Signup request received:", req.body);
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already exists
    // I want duplicate usernames, but not emails
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Create user (password is plain — Mongoose will hash it)
    const newUser = new User({ email, username, password });
    await newUser.save();
    // i let mongoose pre("save") hook hash the password

    // new user, create an empty dashboard
    // inside userSignUp after user.save()
    // needs to match the mongoose schema
    await Dashboard.create({
      userId: newUser._id,
      overview: { totalBalance: 0, monthlyChange: 0 },
      accounts: [
        {
          type: "cash",
          balance: 0,
          userId: newUser._id.toString(), // TODO check this again, is .toString() correct?
          createdAt: new Date(),
        },
      ],
      transactions: [],
      upcomingCharges: [],
      debts: [],
      goals: [],
      // income: [],
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// user login
export const userLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password (user has the helper compare password method)
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // generate jwt
    // sign the token with the user's id and email
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" } //  expires in 7 days
    );

    // Return user info
    // !DON"T SEND PASSWORD HERE
    // no return needed because sending a response already ends the request
    // express doesn't require return for the last response
    res.status(200).json({
      message: "Login successful",
      token: token, // send the jwt token
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        currency: user.currency,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// change user details

export const changeUserDetails = async (req: AuthRequest, res: Response) => {
  console.log("User is changing details...");
  const { username, currency, avatar } = req.body;
  // get the user id from the middleware
  const userId = getUserId(req);

  try {
    const user = await User.findOne({ username });

    // update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        // if username is truthy, then
        ...(username && { username }),
        // evaluates to ...{username:username}, and is inserted into the object being built. In short, if user actually provides a username, then it is inserted into the document, otherwise it's not
        ...(currency && { currency }),
        ...(avatar && { avatar }),
      },
      { new: true } // return updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // if user has been successfully updated
    res.status(200).json({
      message: "User details updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// delete user account
// a session is a logical object that allows me to group multiple database operations together to ensure they are handled in a specific way
// enables Transactions (ACID compliance) in mongodb
// analogy: shopping cart during checkout
// start session: walk to register
// operations: scan item A, item B etc
// transaction: until you actually pay, those items are not officially sold, if the credit card is declined, transaction is cancelled, you doon't leave with just items a and b, you leave with nothing
// commit: you pay, inventory is update, sale is final
// Why i need it? (all or nothing rule)
// to delete a user, i need to delete their transactions, goals, debts user profile
// without a transaction, if server crashes after step 2, transactions are gone, but everything else exists, account is now broken or half deleted
// With a session ( transaction), i tell mongodb to do steps 1,2,3,4. If any step fails, undo everything. This ensures data never gets into a broken state
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  console.log("User requested account deletion...");

  // get the user id from the middleware
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Start a MongoDB session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // before i delete the account, i need to delete all of user's transactions, upcoming charges etc.
    // otherwise i might get orphan data with no user
    await Transaction.deleteMany({ userId }, { session });
    await UpcomingCharge.deleteMany({ userId }, { session });
    await Debt.deleteMany({ userId }, { session });
    await Goal.deleteMany({ userId }, { session });
    await RecurringCharge.deleteMany({ userId }, { session }); // Clean up recurring rules

    //  Delete the dashboard (which contains accounts)
    await Dashboard.deleteOne({ userId }, { session });

    // finally, delete the user
    const deletedUser = await User.findByIdAndDelete(userId, { session });

    if (!deletedUser) {
      // If user not found (already deleted?), abort everything to be safe
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    //  Commit the transaction (save changes)
    await session.commitTransaction();
    session.endSession();

    console.log(`Successfully deleted user ${userId} and all associated data.`);

    res.status(200).json({
      message: "Account and all associated data deleted successfully.",
    });
  } catch (error) {
    // undo everything if anything fails
    await session.abortTransaction();
    session.endSession();
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Server error during deletion" });
  }
};
