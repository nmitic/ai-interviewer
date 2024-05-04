import { Request, Response } from "express";
import { Response as LlamaIndexResponse } from "llamaindex";
import WebSocket from "ws";
import { getAnswerSource } from "../ask/source.js";
import { getAnswerChunks } from "../ask/stream.js";

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

export const route = async (req: Request, res: Response) => {
  const { question } = req.query;
  const voiceId = "Gb8ZPzpt9F3NJOirHhyN"; // replace with your voice_id
  const model = "eleven_multilingual_v2";
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
  const socket = new WebSocket(wsUrl);

  res.set({
    "Content-Type": "audio/mp3",
    "Transfer-Encoding": "chunked",
  });

  socket.onopen = async function (event) {
    console.log("OPEN SOCKET");

    const answerSource = await getAnswerSource();
    const answerChunks = await getAnswerChunks(answerSource, question);

    const bosMessage = {
      text: " ",
      voice_settings: {
        stability: 0.8,
        similarity_boost: 1,
        style: 0.1,
        use_speaker_boost: true,
      },
      xi_api_key: "79dce7b9d8e3cc26e334a69f9c46b570",
    };

    socket.send(JSON.stringify(bosMessage));
    console.log("start sending chunked answer");
    for await (const text of textChunker(answerChunks)) {
      console.log(text);
      socket.send(JSON.stringify({ text: text, try_trigger_generation: true }));
    }

    const eosMessage = {
      text: "",
    };

    socket.send(JSON.stringify(eosMessage));
  };

  // 5. Handle server responses
  socket.onmessage = function (event) {
    const response = JSON.parse(event.data.toString());

    if (response.audio) {
      console.log("Received audio chunk");

      const buffer = Buffer.from(response.audio, "base64");
      res.write(buffer);
    } else {
      console.log("No audio data in the response");
    }

    if (response.isFinal) {
      // the generation is complete
      res.end();
    }

    if (response.normalizedAlignment) {
      // use the alignment info if needed
    }
  };

  // Handle errors
  socket.onerror = function (error) {
    console.error(`WebSocket Error: ${error}`);
  };

  // Handle socket closing
  socket.onclose = function (event) {
    if (event.wasClean) {
      console.info(
        `Connection closed cleanly, code=${event.code}, reason=${event.reason}`
      );
    } else {
      console.warn("Connection died");
    }
  };
};
