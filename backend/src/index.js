import express from "express";
import "dotenv/config";
import cors from "cors";
import { connectDB } from "../lib/db.js";
import { clerkMiddleware } from "@clerk/express";

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});
app.listen(port, () => {
  console.log(process.env.MONGO_URI);
  connectDB();
  console.log(`server has been started at the ${port} `);
});
