import { Request, Response } from "express";
import { streamAudioAnswer } from "./stream.js";

export const route = async (req: Request, res: Response) => {
  const { question } = req.query;

  res.set({
    "Content-Type": "audio/mp3",
    "Transfer-Encoding": "chunked",
  });

  if (typeof question !== "string") {
    return res
      .status(400)
      .send(`Client error: question query not type of string`);
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
