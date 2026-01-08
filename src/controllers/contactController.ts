import type { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

const getUserId = (req: AuthRequest) => {
  return req.user?.id || req.user?._id;
};

// contact form

export const contact = async (req: Request, res: Response) => {
  console.log("User is contacting me...");
  const { reason, title, email, body } = req.body;
  // get the user id from the middleware
  const userId = getUserId(req);

  console.log("Contact reason: ", reason);
  console.log("Title: ", title);
  console.log("Email: ", email);
  console.log("Body: ", body);

  try {
    res.status(200).json({
      message: "User message received",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
