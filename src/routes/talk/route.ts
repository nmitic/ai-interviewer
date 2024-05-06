import { Request, Response } from "express";
import { demoStream, streamAudioAnswer } from "./stream.js";

interface RequestQuery {
  question: string;
  demo: string;
}

export const route = async (
  req: Request<unknown, unknown, unknown, RequestQuery>,
  res: Response
) => {
  const { question, demo } = req.query;

  res.set({
    "Content-Type": "audio/mp3",
    "Transfer-Encoding": "chunked",
  });

  if (typeof question !== "string") {
    return res
      .status(400)
      .send(`Client error: question query not type of string`);
  }
  if (demo === "true") {
    return demoStream().pipe(res);
  }

  streamAudioAnswer({
    question: question,
    onChunkReceived: (chunk) => {
      const buffer = Buffer.from(chunk, "base64");
      res.write(buffer);
    },
    onChunkFinal: () => {
      res.end();
    },
    onError: (error) => {
      console.error(`WebSocket Error: ${error}`);
      res.status(500).send(`WebSocket Error: ${error}`);
    },
    onClose: (event) => {
      if (event.wasClean) {
        console.info(
          `Connection closed cleanly, code=${event.code}, reason=${event.reason}`
        );
      } else {
        console.warn("Connection died");
      }
      res.end();
    },
  });
};
