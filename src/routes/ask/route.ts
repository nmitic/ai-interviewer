import { Request, Response } from "express";
import { getAnswerSource } from "./source.js";
import { getAnswerChunks } from "./stream.js";

export const route = async (req: Request, res: Response) => {
  const { question } = req.query;

  if (typeof question !== "string") {
    return res
      .status(400)
      .send(`Client error: question query not type of string`);
  }
  try {
    const answerSource = await getAnswerSource();
    const answerChunks = await getAnswerChunks(answerSource, question);

    for await (const chunk of answerChunks) {
      if (req.closed) {
        res.end();
        return;
      }

      res.write(chunk.response);
    }
  } catch (error) {
    return res.status(500).send(`Server error: ${error}`);
  }

  res.end();
};
