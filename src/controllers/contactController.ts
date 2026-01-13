import type { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import ContactForm from "../models/ContactForm";

export const contact = async (req: AuthRequest, res: Response) => {
  const { reason, title, message, username, email } = req.body;

  console.log(req.body);
  // ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  // server-trusted identity

  //console.log(username);

  // basic validation
  if (!title || !message) {
    return res.status(400).json({
      message: "Title and message are required",
    });
  }

  try {
    await ContactForm.create({
      reason,
      title,
      email,
      username, // maybe useful?
      message,
    });

    console.log("From contact form :", reason, title, email, username, message);

    // 200 - ok, 201 - resource created
    return res.status(201).json({
      message: "Message received",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
