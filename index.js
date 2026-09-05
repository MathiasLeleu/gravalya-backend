import "dotenv/config"

import express from "express"
import cors from "cors"

import { router } from "./src/router.js"
import './src/models/associations.js'

const app = express();

app.use(express.json());

app.use(router);

app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
        error: err.message || 'Erreur interne du serveur.'
    });
});

app.listen(3000, () => {
    console.log(`🚀 Listening on http://localhost:3000`);
});