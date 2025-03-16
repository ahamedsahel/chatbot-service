// controllers/controller.js
const db = require('../db'); // Ensure this points to your MySQL connection

// Get all todos
exports.getTodos = (req, res) => {
  const query = 'SELECT * FROM tudo';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching todos:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
};

// Add a new todo
exports.saveTodo = (req, res) => {
  const { name, age, date, description, place } = req.body;
  if (!name || !age || !date || !description || !place) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const query = 'INSERT INTO tudo (name, age, date, description, place) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, age, date, description, place], (err, result) => {
    if (err) {
      console.error('Error saving tudo:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.status(201).json({ message: 'Tudo saved', id: result.insertId });
  });
};

// Update a todo by ID
exports.updateTodo = (req, res) => {
  const { id } = req.params;
  const { title, description, age, date, name, place } = req.body;
  const query = 'UPDATE tudo SET title = ?, description = ?, age = ?, date = ?, name = ?, place = ? WHERE id = ?';
  db.query(query, [title, description, age, date, name, place, id], (err, results) => {
    if (err) {
      console.error('Error updating todo:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json({ message: 'Todo updated successfully' });
  });
};

// Delete a todo by ID
exports.deleteTodo = (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM tudo WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting todo:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json({ message: 'Todo deleted successfully' });
  });
};
