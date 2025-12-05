import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend the Request interface to include the user
export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  //  Get the token from the header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Split because the response has spaces

  // no token - deny access
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  try {
    // Verify the token using the same secret
    const verified = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = verified; // Attach user data to request
    next(); // route can proceed
  } catch (error) {
    res.status(403).json({ message: "Invalid Token" });
  }
};
