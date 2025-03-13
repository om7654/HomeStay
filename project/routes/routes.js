const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Bid = require('../models/Bid');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware to check if user is a landlord
const isLandlord = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'landlord') {
        next();
    } else {
        res.status(403).send('Access denied. Only landlords can access this feature.');
    }
};

// Render login page
router.get('/login', (req, res) => {
    res.render('login', { error: null, user: req.session.user || null });
});

// Handle login form submission
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.render('login', { error: 'Please fill in all fields', user: req.session.user || null });
    }

    // Query the database to check user credentials
    const sql = 'SELECT * FROM users WHERE username = ? AND role = ?';
    req.db.query(sql, [username, role], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('login', { error: 'An error occurred during login', user: req.session.user || null });
        }

        if (results.length === 0) {
            return res.render('login', { error: 'Invalid username or role', user: req.session.user || null });
        }

        const user = results[0];
        const bcrypt = require('bcrypt');
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.render('login', { error: 'An error occurred during login', user: req.session.user || null });
            }

            if (!isMatch) {
                return res.render('login', { error: 'Invalid password' });
            }

            // Set up user session
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            res.redirect('/');
        });
    });

});

// Render signup page
router.get('/signup', (req, res) => {
    res.render('signup', { error: null, user: req.session.user || null });
});

// Handle bid submission
router.post('/submit-bid', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'tenant') {
        return res.status(403).send('Only tenants can submit bids');
    }

    const { house_id, bid_amount } = req.body;
    const tenant_id = req.session.user.id;

    // Validate bid amount
    if (bid_amount < 0) {
        return res.status(400).json({ error: 'Bid amount cannot be negative' });
    }

    // Get house details to validate against original rent
    House.findById(house_id)
        .then(house => {
            if (!house) {
                return res.status(404).json({ error: 'House not found' });
            }

            const minBidAmount = house.rent / 2;
            if (bid_amount < minBidAmount) {
                return res.status(400).json({ 
                    error: `Bid amount cannot be less than half of the original rent (₹${minBidAmount})`
                });
            }

            const bidData = {
                house_id,
                tenant_id,
                bid_amount,
                status: 'pending'
            };

            // Continue with bid creation
            new Bid(bidData).save()
                .then(() => res.json({ success: true }))
                .catch(err => res.status(500).json({ error: err.message }));
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Handle bid status update
router.post('/update-bid-status/:bidId', isLandlord, (req, res) => {
    const { bidId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    Bid.updateBidStatus(bidId, status, (err, result) => {
        if (err) {
            console.error('Error updating bid status:', err);
            return res.status(500).json({ success: false, error: 'Failed to update bid status' });
        }
        res.json({ success: true });
    });
});

// Render inbox page for landlords
router.get('/inbox', isLandlord, (req, res) => {
    Bid.getLandlordBids(req.session.user.id, (err, bids) => {
        if (err) {
            console.error('Error fetching bids:', err);
            return res.status(500).send('Error loading inbox');
        }
        res.render('inbox', { user: req.session.user, bids });
    });
});

// Render inbox page for tenants
router.get('/tenant-inbox', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'tenant') {
        return res.status(403).send('Access denied. Only tenants can access this feature.');
    }
    
    Bid.getTenantBids(req.session.user.id, (err, bids) => {
        if (err) {
            console.error('Error fetching bids:', err);
            return res.status(500).send('Error loading inbox');
        }
        res.render('tenant-inbox', { user: req.session.user, bids });
    });
});

// Handle signup form submission
router.post('/signup', (req, res) => {
    const { username, email, password, confirmPassword, role } = req.body;

    // Basic validation
    if (!username || !email || !password || !confirmPassword || !role) {
        return res.render('signup', { error: 'Please fill in all fields', user: req.session.user || null });
    }

    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match', user: req.session.user || null });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('signup', { error: 'Please enter a valid email address', user: req.session.user || null });
    }

    // Check if username already exists
    const checkUserSql = 'SELECT * FROM users WHERE username = ?';
    req.db.query(checkUserSql, [username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('signup', { error: 'An error occurred during registration' });
        }

        if (results.length > 0) {
            return res.render('signup', { error: 'Username already exists', user: req.session.user || null });
        }

        // Hash password and insert new user
        const bcrypt = require('bcrypt');
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Password hashing error:', err);
                return res.render('signup', { error: 'An error occurred during registration' });
            }

            // Insert new user into database
            const insertUserSql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
            req.db.query(insertUserSql, [username, email, hashedPassword, role], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.render('signup', { error: 'An error occurred during registration' });
                }

                res.redirect('/login');
            });
        });
    });

});

// Route to display all houses on the index page
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM houses';
    req.db.query(sql, (err, result) => {
        if (err) throw err;
        
        // Filter sensitive information for unauthorized users
        const processedResults = result.map(house => {
            if (!req.session.user) {
                return {
                    id: house.id,
                    image: house.image,
                    description: house.description
                };
            }
            return house;
        });

        res.render('index', { 
            houses: processedResults,
            user: req.session.user || null,
            limitedView: !req.session.user
        });
    });
});

// Handle the Search Request
router.get("/search", (req, res) => {
    let query = req.query.query?.trim().toLowerCase();

    if (!query || !/^[a-zA-Z\s]+$/.test(query)) {
        return res.status(400).send("Invalid search query. Please enter a valid city name.");
    }

    req.db.query("SELECT * FROM houses WHERE LOWER(address) LIKE ?", [`%${query}%`], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("An error occurred while searching.");
        }

        // Filter sensitive information for unauthorized users
        const processedResults = results.map(house => {
            if (!req.session.user) {
                return {
                    id: house.id,
                    image: house.image,
                    description: house.description
                    // Removed address and rent fields for unauthorized users
                };
            }
            return house;
        });

        res.render("search-results", { 
            houses: processedResults, 
            query,
            user: req.session.user || null,
            limitedView: !req.session.user
        });
    });
});

// Render form to create a new house listing (protected route for landlords only)
router.get('/create-house', isAuthenticated, isLandlord, (req, res) => {
    res.render('create-house');
});

// Handle form submission for creating a new house (protected route for landlords only)
router.post('/create-house', isAuthenticated, isLandlord, (req, res) => {
    const { description, address, contact, rent } = req.body;
    const image = req.files ? req.files.image : null;
    const landlord_id = req.session.user.id; // Get landlord_id from session

    if (image) {
        // Save the image to the "public/images" folder
        const imagePath = path.join(__dirname, '../public/images', image.name);
        image.mv(imagePath, (err) => {
            if (err) {
                console.error('Error uploading image:', err);
                return res.status(500).send('Error uploading image');
            }
            console.log('Image uploaded successfully');
        });
    }

    // Insert house details into the database
    const sql = 'INSERT INTO houses (image, description, address, contact, rent, landlord_id) VALUES (?, ?, ?, ?, ?, ?)';
    req.db.query(sql, [
        image ? `images/${image.name}` : null, // Store relative path to the image
        description,
        address,
        contact,
        rent,
        landlord_id // Add landlord_id to the query parameters
    ], (err, result) => {
        if (err) {
            console.error('Error inserting data into database:', err);
            return res.status(500).send('Error saving house details');
        }
        res.redirect(`/house/${result.insertId}`); // Redirect to the house details page
    });
});

// Render house details based on ID
router.get('/house/:id', (req, res) => {
    const houseId = req.params.id;
    const sql = 'SELECT * FROM houses WHERE id = ?';

    req.db.query(sql, [houseId], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const house = result[0];
            // If user is not authenticated, show limited information
            if (!req.session.user) {
                return res.render('house', { 
                    house: {
                        id: house.id,
                        image: house.image,
                        description: house.description
                        // Removed address field
                    },
                    user: null,
                    limitedView: true
                });
            }
            // Show full details for authenticated users
            res.render('house', { house, user: req.session.user, limitedView: false });
        } else {
            res.status(404).send('House not found');
        }
    });
});

// Route to delete a house
router.delete('/house/delete/:id', (req, res) => {
    const houseId = req.params.id;

    // First, get the image path from the database
    const getImageSql = "SELECT image FROM houses WHERE id = ?";
    req.db.query(getImageSql, [houseId], (err, results) => {
        if (err) {
            console.error("Error fetching house:", err);
            return res.status(500).json({ success: false, error: "Error fetching house details." });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: "House not found." });
        }

        const imagePath = results[0].image ? path.join(__dirname, "../public", results[0].image) : null;

        // Delete the house from the database
        const deleteSql = "DELETE FROM houses WHERE id = ?";
        req.db.query(deleteSql, [houseId], (deleteErr) => {
            if (deleteErr) {
                console.error("Error deleting house:", deleteErr);
                return res.status(500).json({ success: false, error: "Error deleting house from database." });
            }

            // If an image exists, delete it from the folder
            if (imagePath && fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error("Error deleting image:", unlinkErr);
                    }
                });
            }

            res.json({ success: true });
        });
    });
});

// Serve login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../login/login.html'));
});

// Handle login form submission
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Please fill in all fields' });
    }

    // Query the database to check user credentials
    const sql = 'SELECT * FROM users WHERE username = ? AND role = ?';
    req.db.query(sql, [username, role], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'An error occurred during login' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid username or role' });
        }

        const user = results[0];
        // In a real application, you would hash the password and compare with the hashed version
        if (password !== user.password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Set up user session here (in a real app, use express-session)
        res.json({ success: true, redirect: '/' });
    });
});

// Handle the Search Request
router.get("/search", (req, res) => {
    let query = req.query.query?.trim().toLowerCase();

    if (!query || !/^[a-zA-Z\s]+$/.test(query)) {
        return res.status(400).send("Invalid search query. Please enter a valid city name.");
    }

    req.db.query("SELECT * FROM houses WHERE LOWER(address) LIKE ?", [`%${query}%`], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("An error occurred while searching.");
        }

        // Filter sensitive information for unauthorized users
        const processedResults = results.map(house => {
            if (!req.session.user) {
                return {
                    id: house.id,
                    image: house.image,
                    description: house.description
                };
            }
            return house;
        });

        res.render("search-results", { 
            houses: processedResults, 
            query,
            user: req.session.user || null,
            limitedView: !req.session.user
        });
    });
});

// Logout route
router.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        // Redirect to home page after logout
        res.redirect('/');
    });
});

// Handle bid submission
router.post('/submit-bid', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'tenant') {
        return res.status(403).send('Only tenants can submit bids');
    }

    const { house_id, bid_amount } = req.body;
    const tenant_id = req.session.user.id;

    const bidData = {
        house_id,
        tenant_id,
        bid_amount,
        status: 'pending'
    };

    const Bid = require('../models/Bid');
    Bid.createBid(bidData, (err, result) => {
        if (err) {
            console.error('Error creating bid:', err);
            return res.status(500).send('Error submitting bid');
        }
        res.redirect(`/house/${house_id}`);
    });
});

// Render inbox page for landlords
router.get('/inbox', isAuthenticated, isLandlord, (req, res) => {
    const Bid = require('../models/Bid');
    Bid.getLandlordBids(req.session.user.id, (err, bids) => {
        if (err) {
            console.error('Error fetching bids:', err);
            return res.status(500).send('Error loading inbox');
        }
        res.render('inbox', { bids, user: req.session.user });
    });
});

// Handle bid status update
router.post('/bid/update-status', isAuthenticated, isLandlord, (req, res) => {
    const { bid_id, status } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const Bid = require('../models/Bid');
    Bid.updateBidStatus(bid_id, status, (err) => {
        if (err) {
            console.error('Error updating bid status:', err);
            return res.status(500).json({ success: false, error: 'Error updating bid status' });
        }
        res.json({ success: true });
    });
});

// Render tenant's bid history
router.get('/my-bids', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'tenant') {
        return res.status(403).send('Access denied. Only tenants can view their bids.');
    }

    Bid.getTenantBids(req.session.user.id, (err, bids) => {
        if (err) {
            console.error('Error fetching bids:', err);
            return res.status(500).send('Error loading bids');
        }
        res.render('my-bids', { user: req.session.user, bids });
    });
});

// Render edit house form
router.get('/house/edit/:id', isAuthenticated, isLandlord, (req, res) => {
    const houseId = req.params.id;
    const sql = 'SELECT * FROM houses WHERE id = ? AND landlord_id = ?';
    
    req.db.query(sql, [houseId, req.session.user.id], (err, result) => {
        if (err) {
            console.error('Error fetching house:', err);
            return res.status(500).send('Error loading house details');
        }
        if (result.length === 0) {
            return res.status(404).send('House not found or unauthorized');
        }
        res.render('edit-house', { house: result[0], user: req.session.user });
    });
});

// Handle house update
router.post('/house/update/:id', isAuthenticated, isLandlord, (req, res) => {
    const houseId = req.params.id;
    const { description, address, contact, rent } = req.body;
    const image = req.files ? req.files.image : null;
    
    // First verify ownership
    req.db.query('SELECT * FROM houses WHERE id = ? AND landlord_id = ?', 
        [houseId, req.session.user.id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(403).send('Unauthorized or house not found');
        }
        
        let updateData = { description, address, contact, rent };
        let imagePath = null;
        
        // Handle image upload if provided
        if (image) {
            imagePath = `images/${Date.now()}-${image.name}`;
            const uploadPath = path.join(__dirname, '../public/', imagePath);
            
            image.mv(uploadPath, (err) => {
                if (err) {
                    console.error('Error uploading image:', err);
                    return res.status(500).send('Error uploading image');
                }
                
                // Delete old image if exists
                if (result[0].image) {
                    const oldImagePath = path.join(__dirname, '../public/', result[0].image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                
                updateData.image = imagePath;
                updateHouse();
            });
        } else {
            updateHouse();
        }
        
        function updateHouse() {
            const sql = 'UPDATE houses SET ? WHERE id = ? AND landlord_id = ?';
            req.db.query(sql, [updateData, houseId, req.session.user.id], (err) => {
                if (err) {
                    console.error('Error updating house:', err);
                    return res.status(500).send('Error updating house details');
                }
                res.redirect(`/house/${houseId}`);
            });
        }
    });
});

// Export the router
module.exports = router;
