require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();


app.use(cors());
app.use(express.json());

const todoController = require("./controllers/todoController");
const { handleChatbotRequest } = require("./controllers/chatbotController");

// Todo Routes
app.get("/todos", todoController.getTodos);
app.post("/todos", todoController.saveTodo);
app.put("/todos/:id", todoController.updateTodo);
app.delete("/todos/:id", todoController.deleteTodo);

// Chatbot API Route
app.post("/api/chatbot", handleChatbotRequest);

// ✅ DO NOT use app.listen() for Vercel
module.exports = app;
