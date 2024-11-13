import express from "express";
import {service} from './service/index.js';

const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use("/api", service);

const start = async () => {
  try {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.log(e);
  }
};

start();