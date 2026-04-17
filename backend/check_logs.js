import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/opportunity_pulse';

const loginLogSchema = new mongoose.Schema({
  username: String,
  loginDate: String,
  loginTime: String,
  timestamp: Date
});

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

async function checkLogs() {
  try {
    await mongoose.connect(MONGODB_URI);
    const logs = await LoginLog.find().sort({ timestamp: -1 }).limit(1);
    console.log('Latest Login Log:', JSON.stringify(logs, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error checking logs:', err);
  }
}

checkLogs();
