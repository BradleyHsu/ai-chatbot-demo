"use client"
import { useState, useEffect } from "react"

export default function ChatComponent() {
    const [isRecording, setIsRecording] = useState(false);
    const [talkMessages, setTalkMessages] = useState([{
        role: "system",
        content: "You are Steve Jobs",
      },]);
    let audioQueue: any = [];
    let mediaRecorder : MediaRecorder | null = null;
    let audioContext : AudioContext | null = null;
    let source : AudioBufferSourceNode | null = null;
    let analyser : AnalyserNode | null = null;
    let stream : MediaStream | null = null;
    let isPlaying = false;

    useEffect(() => {
        if (talkMessages[talkMessages.length - 1].role === "user") {
            console.log("messages after user input")
            console.log(talkMessages)
            getChatResponse();
        } else if (talkMessages.length > 1) {
            console.log("messages after ai response");
            console.log(talkMessages);
            handleStartRecording();
        }}, [talkMessages]
    )

    async function playNext() {
        var audioContext = new AudioContext();
        if (audioQueue.length === 0 || isPlaying) return;
        isPlaying = true;

        audioQueue.sort((a, b) => a.sequence - b.sequence); // Sort by sequence number

        const audio = audioQueue.shift();
        console.log(audio);
        if (!audio.chunk) return;

        await new Promise<void>((resolve, reject) => {
            audioContext.decodeAudioData(audio.chunk, function(buffer) {
                source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.onended = () => {
                    isPlaying = false;
                    playNext();
                };
                source.start(0);
            }, function(err) {
                console.log('An error occurred: ' + err);
                reject(err);
            })
        });
    }
    function splitSentence(sentence) {
        const match = sentence.match(/(.*?[,.?!])(.*)/s);
        if (match) {
            return [match[1], match[2]];
        } else {
            return [sentence, ''];
        }
    }

    const getAudioResponse = async (chatResponse: Response) => {
        let sentence = "";
        let sequenceNum = 0;
        let fullMessage = "";
        for await (const value of chatResponse.body) {
            let token = new TextDecoder().decode(value);
            sentence += token;
            if (/[,.?!]/.test(token)) {
                const sentences = splitSentence(sentence);
                const sentenceToPlay = sentences[0];
                sentence = sentences[1];
                fullMessage += sentenceToPlay;

                const currentSequence = sequenceNum++;
                console.log(sentenceToPlay);
                console.log(currentSequence);
                const response = await fetch("/api/textToSpeech", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: sentenceToPlay,
                })
                const req = await response;
                const arrayBuffer = await req.arrayBuffer();
                audioQueue.push({
                    chunk: arrayBuffer,
                    sequence: currentSequence
                });
                playNext();
            }
        }
        console.log("updated messages")
        console.log(talkMessages)
        while(isPlaying) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        setTalkMessages([...talkMessages, {role: "assistant", content: fullMessage}]);
    }

    const getChatResponse = async () => {
        console.log("messages");
        console.log(talkMessages);
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ talkMessages }),
        });

        getAudioResponse(response);
    }

    const handleStartRecording = async () => {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        const audioChunks : Blob[] = [];
        mediaRecorder.addEventListener("dataavailable", (event : BlobEvent) => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", async () => {
            const audioBlob = new Blob(audioChunks);
            try  {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    console.log(base64Audio);
                    const result = await fetch("/api/speechToText", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ audio: base64Audio }),
                    })
                    const data = await result.json();
                    const transcription = data['text'];
                    setTalkMessages([...talkMessages, {role: "user", content: transcription}]);
                }
            } catch (error) {
                console.log(error);
            }
        });

        setIsRecording(true);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const checkSilence = () => {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = sum / bufferLength;
            console.log(avg)
            if (avg < 2) {
                handleStopRecording();
            } else {
                setTimeout(checkSilence, 100);
            }
        };
        setTimeout(checkSilence, 2000);
    }

    const handleStopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }
    };

    return (
                <button type="button" onMouseDown={handleStartRecording}>
                    {isRecording ? 'Recording...' : 'Start Recording'}
                </button>
    )
}