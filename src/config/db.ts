import mongoose from "mongoose";

// connect to MongoDB database
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      // if a connection already exists
      console.log("MongoDB already connected.");
      return;
    }

    // if no connection exists, connect
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

export default connectDB;
