import express from "express";
import { GraphQLClient, gql } from "graphql-request";
import {
  Document,
  VectorStoreIndex,
  storageContextFromDefaults,
} from "llamaindex";
import { pipeline } from "node:stream/promises";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3002; // You can use any port you prefer

const client = new GraphQLClient(process.env.NEXT_PUBLIC_HYGRAPH_READ_ONLY);

const jobsQuery = gql`
  query Jobs {
    page(where: { slug: "tiny-thoughts" }) {
      description {
        text
      }
    }
    jobs(orderBy: startDate_DESC) {
      job_description_and_responsibilities: description {
        text
      }
      companyName
      companyWebsite
      industry
      location
      date_when_you_started_working_here: startDate
      date_when_you_ended_working_here: endDate
      tools_programming_languages_frameworks_you_used_in_this_job: techStackTools
      job_position_title: title
    }
    nikola_mitic_thoughts_on_various_subjects: tinyThoughts(first: 100) {
      content {
        text
      }
    }
  }
`;

app.use(
  cors({
    origin: "http://localhost:3001",
  }),
);

// Define your API route
app.get("/api/ask", async (req, res) => {
  const { question } = req.query;

  // Check if the query parameter exists
  if (!question) {
    return res.status(400).json({ error: "Missing parameter" });
  }

  // load jobs data
  const documentsData = await client.request(jobsQuery);

  // Create Document object
  const document = new Document({ text: JSON.stringify(documentsData) });
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
  // Serve stream
  await pipeline(stream, res);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
