import { Router } from 'express'

const router = Router();

router.get("/", (req, res ) => {res.send("Hello les G@MERS")})

export { router }