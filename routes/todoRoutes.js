const express = require('express');
const router = express.Router();
const todoController = require('../controllers/controller');

// Define routes
router.post('/todos', todoController.saveTodo);
router.get('/todos', todoController.getTodos);
router.put('/todos/:id', todoController.updateTodo);
router.delete('/todos/:id', todoController.deleteTodo);

module.exports = router;
