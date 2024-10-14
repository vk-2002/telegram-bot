import mongoose from "mongoose";

// Define the schema for storing user information in MongoDB.
// Add these fields to the User schema in ./src/models/User.js
const userSchema = new mongoose.Schema({
  tgId: { type: Number, required: true, unique: true },
  firstName: String,
  lastName: String,
  isBot: Boolean,
  username: String,
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  receivedAppreciationCount: { type: Number, default: 0 }, // New field
  givenAppreciationCount: { type: Number, default: 0 }    // New field
}, { timestamps: true });


// Export the model in server.js file 
export default mongoose.model('User', userSchema);
