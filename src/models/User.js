import mongoose from "mongoose";

// Define the schema for storing user information in MongoDB.
const userSchema = mongoose.Schema({
    tgId: {   // Telegram ID
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    isBot: {
        type: Boolean,
        required: true
    },
    username: {
        type: String,
        required: false, // Make username optional
        unique: false // Remove uniqueness constraint
    },
    // Optional fields
    promptTokens: {
        type: Number,
        required: false
    },
    completionTokens: {
        type: Number,
        required: false
    }
}, { timestamps: true });

// Export the model in server.js file 
export default mongoose.model('User', userSchema);