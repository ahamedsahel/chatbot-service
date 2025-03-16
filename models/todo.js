const connection = require('../db/connection');

class Todo {
    constructor(id, title, description) {
        this.id = id;
        this.title = title;
        this.description = description;
    }

    static getAll(callback) {
        connection.query('SELECT * FROM todos', (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    static getById(id, callback) {
        connection.query('SELECT * FROM todos WHERE id = ?', [id], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    }

    save(callback) {
        connection.query('INSERT INTO todos (title, description) VALUES (?, ?)', [this.title, this.description], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    static deleteById(id, callback) {
        connection.query('DELETE FROM todos WHERE id = ?', [id], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results);
        });
    }
}

module.exports = Todo;
