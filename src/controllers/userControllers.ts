import type { Request, Response } from "express";
import User from "../models/User";
import Dashboard from "../models/Dashboard";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/authMiddleware";

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
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  console.log("User requested account deletion...");
  const { username, currency, avatar } = req.body;
  // get the user id from the middleware
  const userId = getUserId(req);

  try {
    const user = await User.findOne({ username });

    res.status(200).json({
      message:
        "We received your request and are working on it, this might take a few days.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
