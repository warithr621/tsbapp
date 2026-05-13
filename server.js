require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const generatedDir = path.join(__dirname, 'generated');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsbapp');
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(generatedDir));

app.use('/api', require('./routes/questions'));
app.use('/api', require('./routes/latex'));
app.use('/api', require('./routes/csv'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
