import express from "express";
const router = express.Router();
import {lessonsRouter} from "./lessonsRouter.js";


export const service = router.use('/lessons', lessonsRouter);