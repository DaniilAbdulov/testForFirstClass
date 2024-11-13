import {Router} from "express";
import {LessonsController} from "../controllers/lessonsController.js";

const router = new Router();
const lessonsController = new LessonsController();

export const lessonsRouter = router.get("/", lessonsController.getLessons.bind(lessonsController));