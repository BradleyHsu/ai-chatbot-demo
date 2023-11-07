export async function POST(request: Request) {
    const ELEVEN_LABS_KEY = process.env.ELEVENLABS_API_KEY;
    const voice_id = "21m00Tcm4TlvDq8ikWAM";
    const req = await request;
    const sentenceToPlay = await req.text();
    console.log('things are happening here')
    console.log(sentenceToPlay);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream?optimize_streaming_latency=4`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_LABS_KEY,
        },
        body: JSON.stringify({
            'model': 'eleven_multilingual_v1',
            'text': sentenceToPlay,
            'voice_settings': {
                'stability': 0.8,
                'similarity_boost': 0.5,
            }
        })
    });
    return response
}