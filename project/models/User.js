// models/User.js
const db = require('../db');
const bcrypt = require('bcrypt');

// Function to create a new user
function createUser(userData, callback) {
    const { username, email, password, role } = userData;
    
    // Hash the password before storing
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return callback(err);
        }

        const sql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        db.query(sql, [username, email, hashedPassword, role], callback);
    });
}

// Function to find user by username
function findByUsername(username, callback) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], callback);
}

// Function to validate password
function validatePassword(password, hashedPassword, callback) {
    bcrypt.compare(password, hashedPassword, callback);
}

module.exports = {
    createUser,
    findByUsername,
    validatePassword
};