import type { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
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

    // Return user info
    // !DON"T SEND PASSWORD HERE
    // no return needed because sending a response already ends the request
    // express doesn't require return for the last response
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
