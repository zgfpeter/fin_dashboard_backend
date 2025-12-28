import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // Attach user data to request
    next(); // route can proceed
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // if the token has expired (so session expired)
      return res.status(401).json({
        message: "Session expired",
      });
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }
    return res.status(500).json({
      message: "Authentication error",
    });
  }
};
