import "dotenv/config"

import express from "express"
import cors from "cors"
import { sanitizeInput } from "./src/middlewares/sanitizeInput.js"

import { router } from "./src/router.js"
import './src/models/associations.js'

import { errorHandler, notFoundHandler } from "./src/middlewares/controllerWrapper.js"

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET n\'est pas configuré.');
}

const app = express();

app.use(cors({
    origin: ["http://localhost:5173"]
}));

app.use(express.json());

app.use(sanitizeInput);

app.use("/uploads", express.static("uploads"));

app.use(router);

app.use(notFoundHandler);

app.use(errorHandler);

app.listen(3000, () => {
    console.log(`🚀 Listening on http://localhost:3000`);
});