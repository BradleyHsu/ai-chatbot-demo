
import fs from 'fs';
import { exec } from 'child_process';
import { NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai-edge";

const util = require('util');
const execAsync = util.promisify(exec);

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config);

async function convertAudioToMp3(audioData: Buffer) {
    const inputPath = '/tmp/input.webm';
    fs.writeFileSync(inputPath, audioData);
    const outputPath = '/tmp/output.mp3';
    await execAsync(`ffmpeg -i ${inputPath} ${outputPath}`);
    const mp3AudioData = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    return mp3AudioData;
}

async function convertAudioToText(audioData: Buffer) {
    const mp3AudioData = await convertAudioToMp3(audioData);
    const outputPath = '/tmp/output.mp3';
    fs.writeFileSync(outputPath, mp3AudioData);
    const buffer = fs.readFileSync(outputPath);
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    const file = new File([blob], outputPath);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
        }
    )    
    fs.unlinkSync(outputPath);
    return response
}

// POST localhost:3000/api/speechToText
export async function POST(request: Request) {
    const req = await request.json(); 
    const base64Audio = req.audio;
    const audio = Buffer.from(base64Audio, 'base64');
    try {
        const response = await convertAudioToText(audio);
        return response
    } catch {
        return NextResponse.json({ error: "An error occurred during your request." }, {status:500});
    }
}
