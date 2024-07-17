import mongoose from "mongoose";

const eventSchema = mongoose.Schema({
    //now we want to save the text in our databse and we want to know who sended it.

    text: {
        type: String,
        required: true
    },
    tgId: {
        type: String,
        required: true
    }

} , {timestamps: true});

export default mongoose.model('Event', eventSchema);