import mongoose from "mongoose";
// if the function instance is reused, isConnecting prevents double connect attempts, avoid connection storms, mongoDB IP throttling, random deployment failures
let isConnecting = false;
// connect to MongoDB database
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    // if a connection already exists
    console.log("MongoDB already connected.");
    return;
  }
  if (isConnecting) {
    return;
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }
  try {
    isConnecting = true;
    // if no connection exists, connect
    await mongoose.connect(process.env.MONGODB_URI!);
    isConnecting = false;
    console.log("MongoDB connected.");
  } catch (error) {
    isConnecting = false;
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
