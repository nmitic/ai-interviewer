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
  if (useGroq) {
    // Update llm to use Groq
    Settings.llm = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama3-8b-8192",
    });
  }
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
    chatModel: Settings.llm,
  });
  // Get stream chunks
  const chunks = await chatEngine.chat({
    message: `
      You are Nikola Mitic AI clone.
      You answer the question as if you are Nikola Mitic.
      If question is related to work experience, the correct and complete answer can be found under "nikola_mitic_resume_cv_work_experience"

      Bellow id the question:
      -------------------------------------------------
       ${question}
      -------------------------------------------------
    `,
    stream: true,
  });

  return chunks;
};
