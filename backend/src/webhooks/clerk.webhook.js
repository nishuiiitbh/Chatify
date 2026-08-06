import express from "express";
import User from "../models/user.model.js";
import { verifyWebhook } from "@clerk/backend/webhooks";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("Clerk webhook received");

    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    console.log("Webhook secret available:", !!signingSecret);

    if (!signingSecret) {
      return res.status(503).json({
        message: "Webhook secret is not provided",
      });
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : String(req.body);

    const request = new Request("http://internal/webhooks/clerk", {
      method: "POST",
      headers: new Headers(req.headers),
      body: payload,
    });

    const evt = await verifyWebhook(request, { signingSecret });

    console.log("Webhook verified successfully");
    console.log("Event:", evt.type);

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data;

      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
          ?.email_address ?? u.email_addresses?.[0]?.email_address;

      const fullName =
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.username ||
        email?.split("@")[0];

      const user = await User.findOneAndUpdate(
        { clerkId: u.id },
        {
          clerkId: u.id,
          email,
          fullName,
          profilePic: u.image_url,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      console.log("User synced:", user?.email);
    }

    if (evt.type === "user.deleted") {
      if (evt.data.id) {
        await User.findOneAndDelete({ clerkId: evt.data.id });
        console.log("User deleted:", evt.data.id);
      }
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Webhook Error:", error);

    return res.status(400).json({
      message: "Webhook verification failed",
      error: error.message,
    });
  }
});

export default router;
