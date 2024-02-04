import {
  Document,
  VectorStoreIndex,
  storageContextFromDefaults,
} from "llamaindex";

/**
 * Retrieves a stream of answers to a given question from a provided source.
 * @async
 * @param {Object} source - The source containing data to search for answers.
 * @param {string} question - The question for which answers are sought.
 * @returns {ReadableStream} A readable stream containing the answers.
 */
export const getAnswerStream = async (source, question) => {
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
  // Query the index
  const queryEngine = index.asQueryEngine();
  // Get stream chunks
  const chunks = await queryEngine.query({
    query: `Answer the following question: ${question}. Rules: You are Nikola Mitic, answers related to work experience is to be found under jobs data, be very straight forward of your answers, question will be asked to Nikola Mitic.`,
    stream: true,
  });
  // Create stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for await (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk.response));
      }

      controller.close();
    },
  });

  return stream;
};
