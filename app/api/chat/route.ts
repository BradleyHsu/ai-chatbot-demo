// route.ts Route Handlers
import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";

export const runtime = 'edge'; // Provide optimal infrastructure for our API route (https://edge-runtime.vercel.app/)

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config);


// POST localhost:3000/api/chat
export async function POST(request: Request) {
    const req = await request; // { messages: [] }
    const json = await req.json();
    const messages = json['talkMessages'];
    console.log(messages);

    // messages [{ user and he says "hello there" }]

    // GPT-4 system message
    // system message tells GPT-4 how to act
    // it should always be at the front of your array

    // createChatCompletion (get response from GPT-4)
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-0613',
        messages: [
            ...messages
        ],
        stream: true
    })
    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);

    const response_json = await response.json();
    return new Response(JSON.stringify(response_json["choices"][0]["message"]))
}