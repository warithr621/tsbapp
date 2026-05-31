require('dotenv').config();

if (!process.env.RESET_KEY) {
	console.error('Error: RESET_KEY is not set in your .env file. Add RESET_KEY=<password> and restart.');
	process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const generatedDir = path.join(__dirname, 'generated');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsbapp');
mongoose.connection.on('error', err => {
	console.error('MongoDB connection error:', err.message);
});

if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(generatedDir));

// Return a clean error for any /api call when the database isn't connected
app.use('/api', (req, res, next) => {
	if (mongoose.connection.readyState !== 1) {
		return res.status(503).json({
			success: false,
			error: 'Database not connected. Make sure MongoDB is running and restart the server.',
		});
	}
	next();
});

app.use('/api', require('./routes/questions'));
app.use('/api', require('./routes/latex'));
app.use('/api', require('./routes/csv'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
