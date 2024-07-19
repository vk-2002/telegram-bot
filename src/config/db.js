import mongoose from "mongoose";

export default async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT_STRING, {
      ssl: true,
      sslValidate: false,
      tls: true,
      tlsInsecure: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error;
  }
};