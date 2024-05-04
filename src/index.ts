import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { route as routeApiAsk } from "./routes/ask/route.js";
import { route as routeApiTalk } from "./routes/talk/route.js";

dotenv.config();

const app = express();
const port = 3002;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://nikola-mitic.dev"],
  })
);

app.get("/api/ask", routeApiAsk());

app.get("/api/talk", routeApiTalk);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
