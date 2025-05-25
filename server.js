require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
		enum: ['Physics', 'Chemistry', 'Biology', 'Earth & Space', 'Energy', 'Math', 'General Science'] // keep energy and gen sci, even though TSB will not use them
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
	},
	questionNumber: {
		type: Number,
		required: true,
		min: 1,
		max: 7,
		default: 1
	}
});

const Question = mongoose.model('Question', questionSchema);

const generatedDir = path.join(__dirname, 'generated'); // to ensure generated directory exists
if (!fs.existsSync(generatedDir)) {
	fs.mkdirSync(generatedDir, { recursive: true });
}

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

// Serve generated files
app.use('/generated', express.static(path.join(__dirname, 'generated')));

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
		const { id } = req.params;
		const updateData = req.body;
		
		// Find the question being updated
		const questionToUpdate = await Question.findById(id);
		if (!questionToUpdate) {
			return res.status(404).json({ success: false, message: 'Question not found' });
		}

		// Check if there's an existing question at the target location
		const existingQuestion = await Question.findOne({
			_id: { $ne: id }, // Exclude the current question
			subject: updateData.subject,
			round: updateData.round,
			questionRole: updateData.questionRole,
			questionNumber: updateData.questionNumber
		});

		if (existingQuestion) {
			// Swap positions by updating the existing question with the current question's position
			existingQuestion.subject = questionToUpdate.subject;
			existingQuestion.round = questionToUpdate.round;
			existingQuestion.questionRole = questionToUpdate.questionRole;
			existingQuestion.questionNumber = questionToUpdate.questionNumber;
			await existingQuestion.save();
		}

		// Update the current question with the new position
		const updatedQuestion = await Question.findByIdAndUpdate(
			id,
			updateData,
			{ new: true, runValidators: true }
		);
		
		res.json({ success: true, question: updatedQuestion });
	} catch (error) {
		console.error('Error updating question:', error);
		res.status(500).json({ success: false, message: 'Error updating question' });
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

// LaTeX generation endpoint
app.post('/api/generate-latex', requireAuth, async (req, res) => {
	try {
		console.log('Starting LaTeX generation for round:', req.body.round);
		const { round } = req.body;
		
		// Map round code to number
		const roundMap = {
			'rr1': 1, 'rr2': 2, 'rr3': 3, 'rr4': 4, 'rr5': 5,
			'de1': 6, 'de2': 7, 'de3': 8, 'de4': 9, 'de5': 10, 'de6': 11, 'de7': 12,
			'f1': 13, 'f2': 14
		};
		
		const roundNumber = roundMap[round];
		if (!roundNumber) {
			return res.status(400).json({ success: false, error: 'Invalid round code' });
		}
		
		console.log('Fetching questions for round:', roundNumber);
		// Get all questions for the round
		const questions = await Question.find({ round: roundNumber });
		console.log('Found questions:', questions.length);
		
		if (questions.length === 0) {
			return res.status(404).json({ success: false, error: 'No questions found for this round' });
		}
		
		// Generate LaTeX content
		console.log('Generating LaTeX content...');
		const latexContent = await generateLatexContent(questions, round);
		
		// Write LaTeX file
		console.log('Writing LaTeX file...');
		const texPath = path.join(generatedDir, `${round}.tex`);
		fs.writeFileSync(texPath, latexContent);
		
		// Copy logo file to generated directory
		const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
		const generatedLogoPath = path.join(generatedDir, 'logo.png');
		fs.copyFileSync(logoPath, generatedLogoPath);

		// --- Generate replacements TeX as well ---
		try {
			const replacementQuestions = questions.filter(q => q.questionNumber === 6 || q.questionNumber === 7);
			if (replacementQuestions.length > 0) {
				console.log('Generating replacements LaTeX/PDF...');
				const replacementsLatex = await generateReplacementsLatexContent(replacementQuestions, round);
				const replacementsTexPath = path.join(generatedDir, `${round}-replacements.tex`);
				fs.writeFileSync(replacementsTexPath, replacementsLatex);
			} else {
				console.log('No replacement questions found for this round; skipping replacements PDF.');
			}
		} catch (err) {
			console.error('Error generating replacements TeX/PDF:', err);
		}
		// --- End replacements generation ---

		res.json({ success: true });
	} catch (error) {
		console.error('Error generating LaTeX:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
}); 

// Authentication middleware
function requireAuth(req, res, next) {
	if (req.session && req.session.authenticated) {
		next();
	} else {
		res.redirect('/index.html');
	}
}

// Function to generate LaTeX content
async function generateLatexContent(questions, round) {
	console.log('Starting LaTeX content generation...');
	const subjects = ['Biology', 'Chemistry', 'Math', 'Physics', 'Earth & Space'];

	const roundMap = {
		'rr1': 'Round Robin 1', 'rr2': 'Round Robin 2', 'rr3': 'Round Robin 3', 'rr4': 'Round Robin 4', 'rr5': 'Round Robin 5',
		'de1': 'Double Elimination 1', 'de2': 'Double Elimination 2', 'de3': 'Double Elimination 3', 'de4': 'Double Elimination 4', 'de5': 'Double Elimination 5', 'de6': 'Double Elimination 6', 'de7': 'Double Elimination 7',
		'f1': 'Finals 1', 'f2': 'Finals 2'
	};
	
	// Group questions by subject and question number
	const groupedQuestions = {};
	subjects.forEach(subject => {
		groupedQuestions[subject] = {};
		for (let i = 1; i <= 5; i++) {
			groupedQuestions[subject][i] = {
				Tossup: null,
				Bonus: null
			};
		}
	});

	// Fill in the questions
	questions.forEach(question => {
		console.log('Processing question:', {
			subject: question.subject,
			number: question.questionNumber,
			role: question.questionRole
		});
		
		if (groupedQuestions[question.subject] && 
			groupedQuestions[question.subject][question.questionNumber]) {
			groupedQuestions[question.subject][question.questionNumber][question.questionRole] = question;
		} else {
			console.warn('Question not placed:', {
				subject: question.subject,
				number: question.questionNumber,
				role: question.questionRole
			});
		}
	});

	// Generate questions in the correct order
	let latexContent = `% \\documentclass[addpoints]{exam}
\\documentclass[12pt]{article}
\\newcommand{\\roundnumber}{${round.replace(/[^0-9]/g, '')}}

\\usepackage{geometry}
\\geometry{bottom=3cm}
\\usepackage{csvsimple}
\\usepackage{xfp}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage[T1]{fontenc}
\\usepackage{xcolor}

\\ifdefined\\draftmode
  \\usepackage{draftwatermark}
  \\SetWatermarkScale{3}
\\fi

\\usepackage[version=4]{mhchem}
\\usepackage{amsmath}
\\usepackage{braket}
\\usepackage{xparse}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{array}
\\usepackage{comment}
\\usepackage{adjustbox}
\\usepackage{float}
\\usepackage[parfill]{parskip}
\\usepackage{makecell}

\\setlength{\\parindent}{0pt}
\\newcommand{\\wxyz}[4]{
  \\begin{enumerate}[label={\\Alph*})]
	\\itemsep-5.5px
	\\setcounter{enumi}{22}
	\\item {#1}
	\\item {#2}
	\\item {#3}
	\\item {#4}
  \\end{enumerate}
}
\\newcommand{\\ts}{TOSS UP}
\\newcommand{\\bs}{BONUS}
\\newcommand{\\ma}{MATH}
\\newcommand{\\ph}{PHYSICS}
\\newcommand{\\ch}{CHEMISTRY}
\\newcommand{\\es}{EARTH AND SPACE}
\\newcommand{\\bi}{BIOLOGY}
\\newcommand{\\sa}{Short Answer}
\\newcommand{\\mc}{Multiple Choice}
\\newcommand{\\sep}{\\vspace*{-4mm}
	\\rule{\\textwidth}{0.1mm}}

\\NewDocumentCommand{\\mul}{>{\\SplitList{}}m}{%
  \\begin{enumerate}[label=\\arabic*), noitemsep]
	\\ProcessList{#1}{\\ordereditem}
  \\end{enumerate}
}

% Helper command to process each item
\\newcommand{\\ordereditem}[1]{\\item #1}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\lfoot{\\texttt{Texas Science Bowl Invitational Round \\roundnumber}}
\\rfoot{\\texttt{Page \\thepage}}

\\newcommand{\\pron}[1]{[\\textit{#1}]}
\\newcommand{\\readas}[1]{[READ: \\textit{#1}]}
\\newcommand{\\readernote}[1]{[\\textit{#1}]}

\\newcommand{\\question}[6]
{\\begin{center} {\\textbf{\\MakeUppercase{#2}}}
  \\end{center}

  #1)  \\MakeUppercase{#3} \\textit{#4} \\hspace{0.5em} #5
  
  \\vspace{5pt}
  ANSWER: #6 \\vspace{15pt}}

\\begin{document}

\\begin{center}

\\textbf{{\\Huge 2025 Texas Science Bowl Invitational}} 
\\vspace{7mm}

\\textbf{ {\\Large ${roundMap[round]}}}
\\vspace{5mm}

\\includegraphics[width=3.15in]{logo.png} 
\\vspace{5mm}

\\textbf{{\\Large Authors}}

Biology: [Add Writers]

Chemistry: [Add Writers]

Earth and Space: [Add Writers]

Math: [Add Writers]

Physics: [Add Writers]

\\end{center}
\\newpage\n\n`;

	// Generate questions in the correct order
	for (let qNum = 1; qNum <= 5; qNum++) {
		subjects.forEach(subject => {
			const question = groupedQuestions[subject][qNum];
			// console.log(question);
			if (question.Tossup) {
				// console.log(question.Tossup);
				const latexNum = (qNum - 1) * 5 + subjects.indexOf(subject) + 1;
				latexContent += questionTex(question.Tossup, latexNum, true) + '\n\n';
			}
			if (question.Bonus) {
				// console.log(question.Bonus);
				const latexNum = (qNum - 1) * 5 + subjects.indexOf(subject) + 1;
				latexContent += questionTex(question.Bonus, latexNum, false) + '\n\n';
			}
			latexContent += '\\sep\n\n';
		});
	}

	latexContent += '\\end{document}';
	console.log('LaTeX (Main Round) content generation complete');
	return latexContent;
}

// Function to generate LaTeX for replacement questions only
async function generateReplacementsLatexContent(questions, round) {
	const subjects = ['Biology', 'Chemistry', 'Math', 'Physics', 'Earth & Space'];
	const roundMap = {
		'rr1': 'Round Robin 1', 'rr2': 'Round Robin 2', 'rr3': 'Round Robin 3', 'rr4': 'Round Robin 4', 'rr5': 'Round Robin 5',
		'de1': 'Double Elimination 1', 'de2': 'Double Elimination 2', 'de3': 'Double Elimination 3', 'de4': 'Double Elimination 4', 'de5': 'Double Elimination 5', 'de6': 'Double Elimination 6', 'de7': 'Double Elimination 7',
		'f1': 'Finals 1', 'f2': 'Finals 2'
	};

	// Group replacement questions by subject and question number
	const groupedReplacements = {};
	subjects.forEach(subject => {
		groupedReplacements[subject] = { 6: { Tossup: null, Bonus: null }, 7: { Tossup: null, Bonus: null } };
	});

	questions.forEach(question => {
		if (
			groupedReplacements[question.subject] &&
			groupedReplacements[question.subject][question.questionNumber]
		) {
			groupedReplacements[question.subject][question.questionNumber][question.questionRole] = question;
		}
	});

	let latexContent = `% \\documentclass[addpoints]{exam}
\\documentclass[12pt]{article}
\\newcommand{\\roundnumber}{${round.replace(/[^0-9]/g, '')}}

\\usepackage{geometry}
\\geometry{bottom=3cm}
\\usepackage{csvsimple}
\\usepackage{xfp}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage[T1]{fontenc}
\\usepackage{xcolor}

\\ifdefined\\draftmode
  \\usepackage{draftwatermark}
  \\SetWatermarkScale{3}
\\fi

\\usepackage[version=4]{mhchem}
\\usepackage{amsmath}
\\usepackage{braket}
\\usepackage{xparse}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{array}
\\usepackage{comment}
\\usepackage{adjustbox}
\\usepackage{float}
\\usepackage[parfill]{parskip}
\\usepackage{makecell}

\\setlength{\\parindent}{0pt}
\\newcommand{\\wxyz}[4]{
  \\begin{enumerate}[label={\\Alph*})]
	\\itemsep-5.5px
	\\setcounter{enumi}{22}
	\\item {#1}
	\\item {#2}
	\\item {#3}
	\\item {#4}
  \\end{enumerate}
}
\\newcommand{\\ts}{TOSS UP}
\\newcommand{\\bs}{BONUS}
\\newcommand{\\ma}{MATH}
\\newcommand{\\ph}{PHYSICS}
\\newcommand{\\ch}{CHEMISTRY}
\\newcommand{\\es}{EARTH AND SPACE}
\\newcommand{\\bi}{BIOLOGY}
\\newcommand{\\sa}{Short Answer}
\\newcommand{\\mc}{Multiple Choice}
\\newcommand{\\sep}{\\vspace*{-4mm}
	\\rule{\\textwidth}{0.1mm}}

\\NewDocumentCommand{\\mul}{>{\\SplitList{}}m}{%
  \\begin{enumerate}[label=\\arabic*), noitemsep]
	\\ProcessList{#1}{\\ordereditem}
  \\end{enumerate}
}

% Helper command to process each item
\\newcommand{\\ordereditem}[1]{\\item #1}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\lfoot{\\texttt{Texas Science Bowl Invitational Round \\roundnumber}}
\\rfoot{\\texttt{Page \\thepage}}

\\newcommand{\\pron}[1]{[\\textit{#1}]}
\\newcommand{\\readas}[1]{[READ: \\textit{#1}]}
\\newcommand{\\readernote}[1]{[\\textit{#1}]}

\\newcommand{\\question}[6]
{\\begin{center} {\\textbf{\\MakeUppercase{#2}}}
  \\end{center}

  #1)  \\MakeUppercase{#3} \\textit{#4} \\hspace{0.5em} #5
  
  \\vspace{5pt}
  ANSWER: #6 \\vspace{15pt}}

\\begin{document}

\\begin{center}

\\textbf{{\\Huge 2025 Texas Science Bowl Invitational}} 
\\vspace{7mm}

\\textbf{ {\\Large ${roundMap[round]} (Replacements)}}
\\vspace{5mm}

\\includegraphics[width=3.15in]{logo.png} 
\\vspace{5mm}

\\textbf{{\\Large Authors}}

Biology: [Add Writers]

Chemistry: [Add Writers]

Earth and Space: [Add Writers]

Math: [Add Writers]

Physics: [Add Writers]

\\end{center}
\\newpage\n\n`;

	// For each subject, print replacements 6 and 7
	subjects.forEach(subject => {
		[6, 7].forEach(num => {
			const question = groupedReplacements[subject][num];
			if (question.Tossup || question.Bonus) {
				if (question.Tossup) {
					latexContent += questionTex(question.Tossup, num-5, true) + '\n\n';
				}
				if (question.Bonus) {
					latexContent += questionTex(question.Bonus, num-5, false) + '\n\n';
				}
				latexContent += '\\sep\n\n';
			}
		});
	});

	latexContent += '\\end{document}';
	console.log('LaTeX (Replacements) content generation complete');
	return latexContent;
}

function questionTex(question, number, tossup) {
	let tex = `\\question{${number}}`;
	tex += tossup ? '{\\ts}' : '{\\bs}';
	tex += `{${getSubjectCode(question.subject)}}`;
	tex += `{${question.questionType === 'Multiple Choice' ? '\\mc' : '\\sa'}}`;
	tex += `{${question.question}`;
	if (question.questionType === 'Multiple Choice') {
		tex += '\\wxyz';
		for (let i = 0; i < 4; i++) {
			tex += `{${question.choices[i]}}`;
		}
	} else if (question.choices && question.choices.length > 0) {
		tex += '\\mul{';
		for (let i = 0; i < question.choices.length; i++) {
			tex += `{${question.choices[i]}}`;
		}
		tex += '}';
	}
	tex += '}';
	tex += `{${question.answer}}`;
	return tex;
}

function getSubjectCode(subject) {
	const codes = {
		'Biology': '\\bi',
		'Chemistry': '\\ch',
		'Math': '\\ma',
		'Physics': '\\ph',
		'Earth & Space': '\\es'
	};
	return codes[subject] || subject;
}
