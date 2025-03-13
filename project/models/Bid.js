// models/Bid.js
const db = require('../../database');

// Function to create a new bid
function createBid(bidData, callback) {
    const { house_id, tenant_id, bid_amount, status } = bidData;
    const sql = 'INSERT INTO bids (house_id, tenant_id, bid_amount, status, created_at) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [house_id, tenant_id, bid_amount, status || 'pending'], callback);
}

// Function to get all bids for a landlord's houses
function getLandlordBids(landlordId, callback) {
    const sql = `
        SELECT b.*, h.description as house_description, u.username as tenant_name, u.email as tenant_email 
        FROM bids b 
        JOIN houses h ON b.house_id = h.id 
        JOIN users u ON b.tenant_id = u.id 
        WHERE h.landlord_id = ? 
        ORDER BY b.created_at DESC
    `;
    db.query(sql, [landlordId], callback);
}

// Function to get all bids made by a tenant
function getTenantBids(tenantId, callback) {
    const sql = `
        SELECT b.*, h.description as house_description, h.address as house_address,
               CONCAT(u.username, ' - ', u.email) as landlord_contact
        FROM bids b 
        JOIN houses h ON b.house_id = h.id 
        JOIN users u ON h.landlord_id = u.id
        WHERE b.tenant_id = ? 
        ORDER BY b.created_at DESC
    `;
    db.query(sql, [tenantId], callback);
}

// Function to update bid status
function updateBidStatus(bidId, status, callback) {
    const sql = 'UPDATE bids SET status = ? WHERE id = ?';
    db.query(sql, [status, bidId], callback);
}

module.exports = {
    createBid,
    getLandlordBids,
    getTenantBids,
    updateBidStatus
};