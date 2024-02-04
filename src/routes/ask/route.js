import { pipeline } from "node:stream/promises";
import { getAnswerSource } from "./source.js";
import { getAnswerStream } from "./stream.js";

export const route = () =>
  ((getAnswerSource, getAnswerStream) => async (req, res) => {
    const { question } = req.query;
    const answerSource = await getAnswerSource();
    const answerStream = await getAnswerStream(answerSource, question);

    await pipeline(answerStream, res);
  })(getAnswerSource, getAnswerStream);
