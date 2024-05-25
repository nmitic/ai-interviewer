import {
  Document,
  VectorStoreIndex,
  storageContextFromDefaults,
  ContextChatEngine,
  Settings,
} from "llamaindex";

import { ReadableStream } from "stream/web";

export const getAnswerChunks = async (source: string, question: string) => {
  // Create Document object
  const document = new Document({ text: JSON.stringify(source) });
  // Create storage from local file
  const storageContext = await storageContextFromDefaults({
    persistDir: "./index-storage",
  });
  // Split text and create embeddings. Store them in a VectorStoreIndex
  const index = await VectorStoreIndex.fromDocuments([document], {
    storageContext,
  });
  // gets retriever
  const retriever = index.asRetriever({ similarityTopK: 5 });

  const chatEngine = new ContextChatEngine({
    retriever,
    chatModel: Settings.llm,
  });
  // Get stream chunks
  const chunks = await chatEngine.chat({
    message: `Answer the following question: ${question}. Rules: You are Nikola Mitic, answers related to work experience is to be found under jobs data, be very straight forward of your answers, question will be asked to Nikola Mitic.`,
    stream: true,
  });

  return chunks;
};

export const getAnswerStream = async (
  source: string,
  question: string
): Promise<ReadableStream> => {
  // Create stream
  const answerChunks = await getAnswerChunks(source, question);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for await (const chunk of answerChunks) {
        controller.enqueue(encoder.encode(chunk.response));
      }

      controller.close();
    },
  });

  return stream;
};
