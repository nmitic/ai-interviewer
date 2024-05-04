import { pipeline } from "node:stream/promises";
import { Request, Response } from "express";
import { getAnswerSource } from "./source.js";
import { getAnswerStream } from "./stream.js";

export const route = async (req: Request, res: Response) => {
  const { question } = req.query;

  if (typeof question !== "string") {
    return res
      .status(400)
      .send(`Client error: question query not type of string`);
  }

  const answerSource = await getAnswerSource();
  const answerStream = await getAnswerStream(answerSource, question);

  await pipeline(answerStream, res);
};
