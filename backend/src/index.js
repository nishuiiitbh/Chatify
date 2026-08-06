import express from "express";
import cors from "cors";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";
import clerkWebhook from "./webhooks/clerk.webhook.js";

const app = express();

const port = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Current project ke andar "public" folder
//  ka poora address (path) store kar rahe
//  hain publicDir me
// cwd=current directory
const publicDir = path.join(process.cwd(), "public");

// Webhook ke liye raw data chahiye hota hai,
// isliye JSON me parse nahi karte
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook,
);

app.use(express.json());

// Sirf FRONTEND_URL se request allow karo
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

// clerkMiddleware() acts like a security guard.
// Every request first goes through Clerk. It
// verifies whether the user is authenticated.
// If the user is valid, it allows the request to
//  continue to the backend
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Agar public folder exist karta hai,
// to Express browser ko isi folder ke andar ki
//  static files:---
// (HTML, CSS, JS, images) serve karega.
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

app.listen(port, () => {
  connectDB();

  job.start(); // Cron job start karo

  console.log(`Server started on port ${port}`);
});
