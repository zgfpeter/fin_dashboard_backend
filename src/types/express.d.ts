import { User as DbUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: DbUser;
    }
  }
}
