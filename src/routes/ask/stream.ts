import {
  Document,
  VectorStoreIndex,
  storageContextFromDefaults,
  ContextChatEngine,
  Settings,
  Groq,
} from "llamaindex";

export const getAnswerChunks = async (
  source: string,
  question: string,
  useGroq: boolean = false
) => {
  Settings.llm = new Groq({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
  });
  // Create Document object
  const document = new Document({
    text: `Nikola Mitic - life story: ${JSON.stringify(source)}`,
  });
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
    ...(useGroq
      ? {
          chatModel: Settings.llm,
        }
      : {}),
  });
  // Get stream chunks
  const chunks = await chatEngine.chat({
    message: `
      Act as Nikola Mitic.
      Be very brief with your answers.
      Always answer with few sentences only.
      You should always refuse to answer questions that are not related to provided context.
      Bellow is the question:
      -------------------------------------------------
       ${question}
      -------------------------------------------------
    `,
    stream: true,
  });

  return chunks;
};
