import express from "express";
import "dotenv/config";
import cors from "cors";
import fs from "fs";
import path from "path";
import User from "./models/user.model.js";
import { connectDB } from "../lib/db.js";
import { clerkMiddleware } from "@clerk/express";

const app = express();
const port = process.env.PORT || 5000;
const FRONTEND_URL = process.env.PORT;

const publicDir = path.join(process.cwd(), "public");
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});
// if the public directory exists,
// serve the static files
// this is for the production
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}
app.listen(port, () => {
  console.log(process.env.MONGO_URI);
  connectDB();
  console.log(`server has been started at the ${port} `);
});
