import mongoose from "mongoose";

export default async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: mongoose.ServerApiVersion.v1,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};