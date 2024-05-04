import { Response as LlamaIndexResponse } from "llamaindex";
import WebSocket, { ErrorEvent, CloseEvent } from "ws";
import { getAnswerSource } from "../ask/source.js";
import { getAnswerChunks } from "../ask/stream.js";

// Responsible for buffering answer from llamaindex into words which will be generated into audio stream
// This is needed as llamaindex stream of text chunks can be random chars which can not be audio streamed
async function* textChunker(chunks: AsyncIterable<LlamaIndexResponse>) {
  const splitters = [
    ".",
    ",",
    "?",
    "!",
    ";",
    ":",
    "—",
    "-",
    "(",
    ")",
    "[",
    "]",
    "}",
    " ",
  ];
  let buffer = "";

  for await (const text of chunks) {
    const isEndOfSentence = splitters.includes(buffer.slice(-1));
    const ifChunkStartsWithNewSentence = splitters.includes(text.response[0]);

    if (isEndOfSentence) {
      yield buffer + " ";
      // reset buffer
      buffer = text.response;
    } else if (ifChunkStartsWithNewSentence) {
      yield buffer + text.response[0] + " ";
      buffer = text.response.slice(1);
    } else {
      buffer += text;
    }
  }

  if (buffer) {
    yield buffer + " ";
  }
}

// Responsible for getting the source of the knowledge, getting ai clone answer and making a websocket api
// connection to eleven labs api for audio streaming
export const streamAudioAnswer = ({
  question,
  onChunkReceived,
  onChunkFinal,
  onError,
  onClose,
}: {
  question: string;
  onChunkReceived: (audioChunk: string) => void;
  onChunkFinal: () => void;
  onError: (error: ErrorEvent) => void;
  onClose: (event: CloseEvent) => void;
}) => {
  const voiceId = "Gb8ZPzpt9F3NJOirHhyN";
  const model = "eleven_multilingual_v2";
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = async function (_event) {
    console.log("OPEN SOCKET");

    const answerSource = await getAnswerSource();
    const answerChunks = await getAnswerChunks(answerSource, question);

    const bosMessage = {
      text: " ",
      voice_settings: {
        stability: 0.8,
        similarity_boost: 0.7,
        style: 0.0,
        use_speaker_boost: true,
      },
      xi_api_key: process.env.ELEVEN_LABS_API_KEY,
    };

    socket.send(JSON.stringify(bosMessage));

    console.log("start sending chunked answer");

    for await (const text of textChunker(answerChunks)) {
      socket.send(JSON.stringify({ text: text, try_trigger_generation: true }));
    }

    const eosMessage = {
      text: "",
    };

    socket.send(JSON.stringify(eosMessage));
  };

  socket.onmessage = function (event) {
    const response = JSON.parse(event.data.toString());

    if (response.audio) {
      console.log("Received audio chunk");
      onChunkReceived(response.audio);
    } else {
      console.log("No audio data in the response");
    }

    if (response.isFinal) {
      console.log("Audio stream chunks final");
      onChunkFinal();
    }
  };

  socket.onerror = onError;

  socket.onclose = onClose;
};
