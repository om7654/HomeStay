// models/House.js
const db = require('../db'); // Import your MySQL connection

// Function to fetch all houses
function getAllHouses(callback) {
    const sql = 'SELECT * FROM houses';
    db.query(sql, callback);
}

// Function to fetch a house by ID
function getHouseById(id, callback) {
    const sql = 'SELECT * FROM houses WHERE id = ?';
    db.query(sql, [id], callback);
}

// Function to create a new house
function createHouse(houseData, callback) {
    const { image, description, address, contact, rent, landlord_id } = houseData;
    const sql = 'INSERT INTO houses (image, description, address, contact, rent, landlord_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [image, description, address, contact, rent, landlord_id], callback);
}

module.exports = {
    getAllHouses,
    getHouseById,
    createHouse,
};
