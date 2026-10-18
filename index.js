import "dotenv/config"

import express from "express"
import cors from "cors"
import { sanitizeInput } from "./src/middlewares/sanitizeInput.js"

import { router } from "./src/router.js"
import './src/models/associations.js'

import { stripeWebhookController } from "./src/controllers/stripeWebhookController.js";

import { errorHandler, notFoundHandler } from "./src/middlewares/controllerWrapper.js"

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET n\'est pas configuré.');
}

const app = express();

app.use(cors({
    origin: ["http://localhost:5173"]
}));

// HEALTH CHECK
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

app.post(
    "/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookController.handleWebhook
);

app.use(express.json());

app.use(sanitizeInput);

app.use("/uploads", express.static("uploads"));

app.use(router);

app.use(notFoundHandler);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});