require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsbapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Question Schema
const questionSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        enum: ['Physics', 'Chemistry', 'Biology', 'Earth Science', 'Energy', 'Math', 'General Science']
    },
    round: {
        type: Number,
        required: true,
        min: 1
    },
    questionType: {
        type: String,
        required: true,
        enum: ['Multiple Choice', 'Short Answer']
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    choices: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    questionRole: {
        type: String,
        enum: ['Tossup', 'Bonus'],
        required: true,
        default: 'Tossup'
    }
});

const Question = mongoose.model('Question', questionSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.redirect('/index.html');
    }
}

// Login endpoint
app.post('/login', (req, res) => {
    const { password } = req.body;
    // You may want to store this in an env variable
    const correctPassword = process.env.APP_PASSWORD || 'really simple password';
    if (password === correctPassword) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Protect /home and all API routes
app.use('/home', requireAuth, express.static(path.join(__dirname, 'home')));
app.use('/api/questions', requireAuth);
app.use('/api/reset-questions', requireAuth);

// Routes
app.post('/api/questions', async (req, res) => {
    try {
        const question = new Question(req.body);
        await question.save();
        res.json({ success: true, question });
    } catch (error) {
        console.error('Error saving question:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find().sort({ round: 1, subject: 1 });
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/questions/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json({ success: true, question });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/reset-questions', requireAuth, async (req, res) => {
    const { resetKey } = req.body;
    const correctResetKey = process.env.RESET_KEY || 'default_reset_key';
    if (resetKey !== correctResetKey) {
        return res.json({ success: false, error: 'Invalid reset key' });
    }
    try {
        await Question.deleteMany({});
        res.json({ success: true });
    } catch (error) {
        console.error('Error resetting questions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve home page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home', 'index.html'));
});

// Serve /home/index.html directly
app.get('/home/index.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'home', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 