import mongoose from "mongoose";

declare global {
  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export async function dbConnect() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global.mongooseConnectionPromise) {
    global.mongooseConnectionPromise = mongoose.connect(mongoUri, {
      bufferCommands: false
    });
  }

  return global.mongooseConnectionPromise;
}

