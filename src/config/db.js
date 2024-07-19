import mongoose from 'mongoose';

export default async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
    });
    console.log('MongoDb database connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
