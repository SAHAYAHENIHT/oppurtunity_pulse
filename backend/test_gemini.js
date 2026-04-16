import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('No API Key');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // try 1.5 flash

async function test() {
    try {
        const result = await model.generateContent('hi');
        console.log('Success:', result.response.text());
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
