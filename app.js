const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const port = 3001; // Ensure the backend is running on this port

app.use(cors()); // To handle CORS errors
app.use(express.json()); // To parse JSON bodies

// Update to use the new db.js file
const db = require('./db');

const todoController = require('./controllers/todoController');
const { handleChatbotRequest } = require('./controllers/chatbotController');

// Route to get todos
app.get('/todos', todoController.getTodos);

// Route to save a new todo
app.post('/todos', todoController.saveTodo);

// Route to update a todo by ID
app.put('/todos/:id', todoController.updateTodo);

// Route to delete a todo by ID
app.delete('/todos/:id', todoController.deleteTodo);

// API Route to Handle OpenAI Chatbot Request
app.post('/api/chatbot', handleChatbotRequest);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
