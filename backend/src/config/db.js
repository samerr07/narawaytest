// /**
//  * config/db.js — MongoDB connection via Mongoose
//  *
//  * Connects once on startup and logs status.
//  * Mongoose handles auto-reconnect internally.
//  *
//  * Usage: import { connectDB } from './config/db.js'; await connectDB();
//  */

// const mongoose = require('mongoose');
// const logger   = require('../utils/logger');

// /**
//  * connectDB — opens Mongoose connection to MongoDB Atlas.
//  * Exits the process on failure so the container restarts cleanly on AWS ECS.
//  */
// async function connectDB() {
//   try {
//     await mongoose.connect(
//       "mongodb+srv://sam07:L.bf%25yvj47xB-EW@cluster0.tzi5s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
//       {
//         dbName: "renergizr",
//       }
//     );
//     logger.info(`MongoDB connected → ${process.env.DB_NAME}`);
//   } catch (err) {
//     logger.error(`MongoDB connection error: ${err.message}`);
//     process.exit(1);
//   }
// }

// module.exports = { connectDB };





/**
 * config/db.js — MongoDB connection via Mongoose
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDB() {
  try {
    const MONGO_URL =
      "mongodb+srv://anilanita07_db_user:OMAagppkLGw8DmwR@cluster0.u33r6dj.mongodb.net/?appName=Cluster0";

    await mongoose.connect(MONGO_URL);

    logger.info("MongoDB connected → renergizr");
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { connectDB };
