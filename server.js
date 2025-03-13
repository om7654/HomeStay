const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const cookieParser = require('cookie-parser');
// Add dotenv configuration
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MySQL Database connection using environment variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL database
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the MySQL database');
});

// Setup EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'project/views')); // Set the views directory


// Middleware to handle file uploads
app.use(fileUpload());

// Session middleware
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files like CSS, JavaScript, and images from the public directory
app.use(express.static(path.join(__dirname, 'project/public')));


// Middleware to parse incoming form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Pass the database connection to routes
app.use((req, res, next) => {
    req.db = db; // Attach the db connection to the request object
    next();
});

// Import routes
const routes = require('./project/routes/routes');
app.use('/', routes);

function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
}

// Start the server
findAvailablePort(port)
    .then(availablePort => {
        app.listen(availablePort, () => {
            console.log(`Server is running on http://localhost:${availablePort}`);
        });
    })
    .catch(err => {
        console.error('Failed to find an available port:', err);
        process.exit(1);
    });
