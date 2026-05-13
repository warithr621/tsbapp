require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');

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
		max: 6,
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

app.post('/api/upload-csv', requireAuth, async (req, res) => {
	try {
		const { csvData, subject } = req.body;
		if (!csvData || !subject) {
			return res.status(400).json({ success: false, error: 'Missing CSV data or subject' });
		}

		parse(csvData, { relax_quotes: true, skip_empty_lines: true }, async (err, records) => {
			if (err) {
				console.error('CSV parse error:', err);
				return res.status(400).json({ success: false, error: 'CSV parse error: ' + err.message });
			}

			if (records.length < 2) {
				return res.status(400).json({ success: false, error: 'Invalid CSV format' });
			}

			const headers = records[0].map(h => h.trim());
			const questions = [];

			for (let i = 1; i < records.length; i++) {
				const values = records[i];
				if (values.length < headers.length) continue;
				const roundCell = values[0];
				const round = parseRound(roundCell);
				if (!round) continue;

				for (let j = 1; j < headers.length - 2; j++) {
					const header = headers[j];
					const questionText = values[j];
					if (!questionText || questionText.trim() === '') continue;
					const questionInfo = parseQuestionHeader(header);
					if (!questionInfo) continue;
					const parsedQuestion = parseQuestionText(questionText);
					if (!parsedQuestion) continue;
					const question = {
						subject: subject,
						round: round,
						questionType: parsedQuestion.type,
						question: parsedQuestion.question,
						answer: parsedQuestion.answer,
						choices: parsedQuestion.choices,
						questionRole: questionInfo.role,
						questionNumber: questionInfo.number
					};
					questions.push(question);
				}
				// Replacement questions - both go to questionNumber 6 (Replacement 1)
				if (headers.length >= 2) {
					const replacementTossup = values[headers.length - 2];
					const replacementBonus = values[headers.length - 1];
					if (replacementTossup && replacementTossup.trim() !== '') {
						const parsedTossup = parseQuestionText(replacementTossup);
						if (parsedTossup) {
							const question = {
								subject: subject,
								round: round,
								questionType: parsedTossup.type,
								question: parsedTossup.question,
								answer: parsedTossup.answer,
								choices: parsedTossup.choices,
								questionRole: 'Tossup',
								questionNumber: 6
							};
							questions.push(question);
						}
					}
					if (replacementBonus && replacementBonus.trim() !== '') {
						const parsedBonus = parseQuestionText(replacementBonus);
						if (parsedBonus) {
							const question = {
								subject: subject,
								round: round,
								questionType: parsedBonus.type,
								question: parsedBonus.question,
								answer: parsedBonus.answer,
								choices: parsedBonus.choices,
								questionRole: 'Bonus',
								questionNumber: 6
							};
							questions.push(question);
						}
					}
				}
			}

			const savedQuestions = [];
			for (const question of questions) {
				try {
					const newQuestion = new Question(question);
					await newQuestion.save();
					savedQuestions.push(newQuestion);
				} catch (error) {
					console.error('Error saving question:', error);
				}
			}
			res.json({ success: true, message: `Successfully uploaded ${savedQuestions.length} questions`, questions: savedQuestions });
		});
	} catch (error) {
		console.error('Error processing CSV:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

app.post('/api/preview-csv', requireAuth, async (req, res) => {
	try {
		const { csvData } = req.body;
		if (!csvData) {
			return res.status(400).json({ success: false, error: 'Missing CSV data' });
		}
		parse(csvData, { relax_quotes: true, skip_empty_lines: true }, (err, records) => {
			if (err) {
				console.error('CSV parse error:', err);
				return res.status(400).json({ success: false, error: 'CSV parse error: ' + err.message });
			}
			if (records.length < 2) {
				return res.status(400).json({ success: false, error: 'Invalid CSV format' });
			}
			const headers = records[0].map(h => h.trim());
			const previewQuestions = [];
			const firstRow = records[1];
			if (firstRow.length >= headers.length) {
				const roundCell = firstRow[0];
				const round = parseRound(roundCell);
				if (round) {
					for (let j = 1; j < headers.length - 2; j++) {
						const header = headers[j];
						const questionText = firstRow[j];
						if (!questionText || questionText.trim() === '') continue;
						const questionInfo = parseQuestionHeader(header);
						if (!questionInfo) continue;
						const parsedQuestion = parseQuestionText(questionText);
						if (!parsedQuestion) continue;
						const previewQuestion = {
							header: header,
							round: roundCell,
							questionType: parsedQuestion.type,
							question: parsedQuestion.question,
							answer: parsedQuestion.answer,
							choices: parsedQuestion.choices,
							questionRole: questionInfo.role,
							questionNumber: questionInfo.number
						};
						previewQuestions.push(previewQuestion);
						if (previewQuestions.length >= 3) break;
					}
					// Also preview replacement questions
					const replacementTossup = firstRow[headers.length - 2];
					const replacementBonus = firstRow[headers.length - 1];
					if (replacementTossup && replacementTossup.trim() !== '') {
						const parsedTossup = parseQuestionText(replacementTossup);
						if (parsedTossup) {
							const previewQuestion = {
								header: 'Replacement Toss-up',
								round: roundCell,
								questionType: parsedTossup.type,
								question: parsedTossup.question,
								answer: parsedTossup.answer,
								choices: parsedTossup.choices,
								questionRole: 'Tossup',
								questionNumber: 6
							};
							previewQuestions.push(previewQuestion);
						}
					}
					if (replacementBonus && replacementBonus.trim() !== '') {
						const parsedBonus = parseQuestionText(replacementBonus);
						if (parsedBonus) {
							const previewQuestion = {
								header: 'Replacement Bonus',
								round: roundCell,
								questionType: parsedBonus.type,
								question: parsedBonus.question,
								answer: parsedBonus.answer,
								choices: parsedBonus.choices,
								questionRole: 'Bonus',
								questionNumber: 6
							};
							previewQuestions.push(previewQuestion);
						}
					}
				}
			}
			res.json({ success: true, previewQuestions });
		});
	} catch (error) {
		console.error('Error previewing CSV:', error);
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

// Serve CSV upload page
app.get('/home/csv-upload.html', requireAuth, (req, res) => {
	res.sendFile(path.join(__dirname, 'home', 'csv-upload.html'));
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
		let latexContent;
		try {
			latexContent = await generateLatexContent(questions, round);
		} catch (error) {
			console.error('Error generating LaTeX content:', error);
			return res.status(500).json({ success: false, error: 'Failed to generate LaTeX content: ' + error.message });
		}
		
		// Write main round TeX file
		const texPath = path.join(generatedDir, `${round}.tex`);
		fs.writeFileSync(texPath, latexContent);
		console.log('LaTeX file written to:', texPath);

		// Write replacements TeX file if replacement questions exist
		const replacementQuestions = questions.filter(q => q.questionNumber === 6);
		if (replacementQuestions.length > 0) {
			console.log('Generating replacements LaTeX...');
			const replacementsLatex = await generateReplacementsLatexContent(replacementQuestions, round);
			const replacementsTexPath = path.join(generatedDir, `${round}-replacements.tex`);
			fs.writeFileSync(replacementsTexPath, replacementsLatex);
			console.log('Replacements LaTeX file written to:', replacementsTexPath);
		} else {
			console.log('No replacement questions found for this round; skipping replacements TeX.');
		}

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
		// For API endpoints, return JSON error instead of redirecting
		if (req.path.startsWith('/api/')) {
			return res.status(401).json({ success: false, error: 'Authentication required' });
		}
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
\\usepackage{amssymb}
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
				try {
					latexContent += questionTex(question.Tossup, latexNum, true) + '\n\n';
				} catch (error) {
					console.error('Error generating Tossup LaTeX for subject:', subject, 'question:', qNum, error);
					throw error;
				}
			}
			if (question.Bonus) {
				// console.log(question.Bonus);
				const latexNum = (qNum - 1) * 5 + subjects.indexOf(subject) + 1;
				try {
					latexContent += questionTex(question.Bonus, latexNum, false) + '\n\n';
				} catch (error) {
					console.error('Error generating Bonus LaTeX for subject:', subject, 'question:', qNum, error);
					throw error;
				}
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
		groupedReplacements[subject] = { 6: { Tossup: null, Bonus: null } };
	});

	questions.forEach(question => {
		console.log('Processing replacement question:', {
			subject: question.subject,
			number: question.questionNumber,
			role: question.questionRole
		});
		if (
			groupedReplacements[question.subject] &&
			groupedReplacements[question.subject][question.questionNumber]
		) {
			groupedReplacements[question.subject][question.questionNumber][question.questionRole] = question;
			console.log('Added replacement question to group');
		} else {
			console.warn('Replacement question not placed:', {
				subject: question.subject,
				number: question.questionNumber,
				role: question.questionRole
			});
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
\\usepackage{amssymb}
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

	// For each subject, print replacement questions (all use questionNumber 6)
	subjects.forEach(subject => {
		const question = groupedReplacements[subject][6];
		console.log(`Checking replacement questions for ${subject}:`, question);
		if (question && (question.Tossup || question.Bonus)) {
			console.log(`Found replacement questions for ${subject}`);
			if (question.Tossup) {
				console.log(`Adding Tossup replacement for ${subject}`);
				latexContent += questionTex(question.Tossup, 1, true) + '\n\n';
			}
			if (question.Bonus) {
				console.log(`Adding Bonus replacement for ${subject}`);
				latexContent += questionTex(question.Bonus, 2, false) + '\n\n';
			}
			latexContent += '\\sep\n\n';
		} else {
			console.log(`No replacement questions found for ${subject}`);
		}
	});

	latexContent += '\\end{document}';
	console.log('LaTeX (Replacements) content generation complete');
	return latexContent;
}

// Converts Unicode characters commonly found in science/math questions to their
// LaTeX equivalents. Pass mode='text' for text outside math delimiters (outputs
// wrap math sequences in $...$), or mode='math' for content already inside $...$.
function unicodeToLatex(text, mode) {
	// Each entry: [unicodeChar, textModeReplacement, mathModeReplacement]
	const conversions = [
		// Hyphens and dashes
		['­', '',    ''   ],  // soft hyphen → remove
		['‐', '-',   '-'  ],  // hyphen
		['‑', '-',   '-'  ],  // non-breaking hyphen
		['‒', '--',  '-'  ],  // figure dash
		['–', '--',  '-'  ],  // en dash
		['—', '---', '-'  ],  // em dash
		['−', '$-$', '-'  ],  // minus sign

		// Degree symbol
		['°', '$^{\\circ}$', '^{\\circ}'],

		// Subscript digits and signs
		['₀', '$_{0}$', '_{0}'], ['₁', '$_{1}$', '_{1}'],
		['₂', '$_{2}$', '_{2}'], ['₃', '$_{3}$', '_{3}'],
		['₄', '$_{4}$', '_{4}'], ['₅', '$_{5}$', '_{5}'],
		['₆', '$_{6}$', '_{6}'], ['₇', '$_{7}$', '_{7}'],
		['₈', '$_{8}$', '_{8}'], ['₉', '$_{9}$', '_{9}'],
		['₊', '$_{+}$', '_{+}'], ['₋', '$_{-}$', '_{-}'],
		['ₐ', '$_{a}$', '_{a}'], ['ₑ', '$_{e}$', '_{e}'],
		['ₒ', '$_{o}$', '_{o}'], ['ₓ', '$_{x}$', '_{x}'],
		['ₙ', '$_{n}$', '_{n}'],

		// Superscript digits and signs
		['⁰', '$^{0}$', '^{0}'], ['¹', '$^{1}$', '^{1}'],
		['²', '$^{2}$', '^{2}'], ['³', '$^{3}$', '^{3}'],
		['⁴', '$^{4}$', '^{4}'], ['⁵', '$^{5}$', '^{5}'],
		['⁶', '$^{6}$', '^{6}'], ['⁷', '$^{7}$', '^{7}'],
		['⁸', '$^{8}$', '^{8}'], ['⁹', '$^{9}$', '^{9}'],
		['⁺', '$^{+}$', '^{+}'], ['⁻', '$^{-}$', '^{-}'],

		// Greek lowercase
		['α', '$\\alpha$',      '\\alpha'     ],
		['β', '$\\beta$',       '\\beta'      ],
		['γ', '$\\gamma$',      '\\gamma'     ],
		['δ', '$\\delta$',      '\\delta'     ],
		['ε', '$\\varepsilon$', '\\varepsilon'],
		['ζ', '$\\zeta$',       '\\zeta'      ],
		['η', '$\\eta$',        '\\eta'       ],
		['θ', '$\\theta$',      '\\theta'     ],
		['ι', '$\\iota$',       '\\iota'      ],
		['κ', '$\\kappa$',      '\\kappa'     ],
		['λ', '$\\lambda$',     '\\lambda'    ],
		['μ', '$\\mu$',         '\\mu'        ],
		['ν', '$\\nu$',         '\\nu'        ],
		['ξ', '$\\xi$',         '\\xi'        ],
		['π', '$\\pi$',         '\\pi'        ],
		['ρ', '$\\rho$',        '\\rho'       ],
		['σ', '$\\sigma$',      '\\sigma'     ],
		['τ', '$\\tau$',        '\\tau'       ],
		['υ', '$\\upsilon$',    '\\upsilon'   ],
		['φ', '$\\varphi$',     '\\varphi'    ],
		['χ', '$\\chi$',        '\\chi'       ],
		['ψ', '$\\psi$',        '\\psi'       ],
		['ω', '$\\omega$',      '\\omega'     ],
		['µ', '$\\mu$',         '\\mu'        ],  // micro sign (U+00B5)

		// Greek uppercase
		['Γ', '$\\Gamma$',    '\\Gamma'   ],
		['Δ', '$\\Delta$',    '\\Delta'   ],
		['Θ', '$\\Theta$',    '\\Theta'   ],
		['Λ', '$\\Lambda$',   '\\Lambda'  ],
		['Ξ', '$\\Xi$',       '\\Xi'      ],
		['Π', '$\\Pi$',       '\\Pi'      ],
		['Σ', '$\\Sigma$',    '\\Sigma'   ],
		['Υ', '$\\Upsilon$',  '\\Upsilon' ],
		['Φ', '$\\Phi$',      '\\Phi'     ],
		['Ψ', '$\\Psi$',      '\\Psi'     ],
		['Ω', '$\\Omega$',    '\\Omega'   ],

		// Math operators and relations
		['×', '$\\times$',   '\\times'  ],
		['÷', '$\\div$',     '\\div'    ],
		['±', '$\\pm$',      '\\pm'     ],
		['∓', '$\\mp$',      '\\mp'     ],
		['≤', '$\\leq$',     '\\leq'    ],
		['≥', '$\\geq$',     '\\geq'    ],
		['≠', '$\\neq$',     '\\neq'    ],
		['≈', '$\\approx$',  '\\approx' ],
		['≡', '$\\equiv$',   '\\equiv'  ],
		['∝', '$\\propto$',  '\\propto' ],
		['∞', '$\\infty$',   '\\infty'  ],
		['·', '$\\cdot$',    '\\cdot'   ],
		['⋅', '$\\cdot$',    '\\cdot'   ],
		['∂', '$\\partial$', '\\partial'],
		['∇', '$\\nabla$',   '\\nabla'  ],
		['∑', '$\\sum$',     '\\sum'    ],
		['∫', '$\\int$',     '\\int'    ],
		['√', '$\\sqrt{}$',  '\\sqrt{}' ],
		['∈', '$\\in$',      '\\in'     ],
		['∉', '$\\notin$',   '\\notin'  ],
		['⊂', '$\\subset$',  '\\subset' ],
		['∪', '$\\cup$',     '\\cup'    ],
		['∩', '$\\cap$',     '\\cap'    ],
		['∅', '$\\emptyset$','\\emptyset'],
		['′', "$'$",         "'"        ],
		['″', "$''$",        "''"       ],
		['ℓ', '$\\ell$',     '\\ell'    ],

		// Arrows
		['→', '$\\rightarrow$',     '\\rightarrow'    ],
		['←', '$\\leftarrow$',      '\\leftarrow'     ],
		['↔', '$\\leftrightarrow$', '\\leftrightarrow'],
		['↑', '$\\uparrow$',        '\\uparrow'       ],
		['↓', '$\\downarrow$',      '\\downarrow'     ],
		['⇒', '$\\Rightarrow$',     '\\Rightarrow'    ],
		['⇐', '$\\Leftarrow$',      '\\Leftarrow'     ],
		['⇔', '$\\Leftrightarrow$', '\\Leftrightarrow'],

		// Special scientific units
		['℃', '$^{\\circ}$C',          '^{\\circ}\\text{C}'],  // ℃
		['℉', '$^{\\circ}$F',          '^{\\circ}\\text{F}'],  // ℉
		['Å', '\\AA{}',                '\\text{\\AA}'       ],  // Å (angstrom)

		// Miscellaneous text symbols
		['™', '\\texttrademark{}',  '\\texttrademark{}'  ],  // ™
		['©', '\\textcopyright{}',  '\\textcopyright{}'  ],  // ©
		['®', '\\textregistered{}', '\\textregistered{}' ],  // ®
	];

	for (const [from, textTo, mathTo] of conversions) {
		text = text.split(from).join(mode === 'text' ? textTo : mathTo);
	}
	return text;
}

function questionTex(question, number, tossup) {
	// Escape LaTeX characters
	const escapeLatex = (text) => {
		if (!text) return '';
		
		// First, handle escaped dollar signs by temporarily replacing them
		let processedText = text;
		const escapedDollarPlaceholder = '___ESCAPED_DOLLAR___';
		processedText = processedText.replace(/\\\$/g, escapedDollarPlaceholder);
		
		// Split text into math and non-math parts
		const parts = [];
		let inMath = false;
		let currentPart = '';
		
		for (let i = 0; i < processedText.length; i++) {
			const c = processedText[i];
			
			if (c === '$') {
				// This is a real math delimiter (escaped ones were replaced)
				if (currentPart) {
					parts.push({ text: currentPart, isMath: inMath });
					currentPart = '';
				}
				inMath = !inMath;
				currentPart += c;
			} else {
				currentPart += c;
			}
		}
		
		if (currentPart) {
			parts.push({ text: currentPart, isMath: inMath });
		}
		
		// Process each part
		return parts.map(part => {
			let result = part.text;
			
			if (!part.isMath) {
				// let's replace LaTeX commands in questions with placeholders
				const protectedCommands = [];
				let cmdIndex = 0;
				
				// match LaTeX commands: \command or \command{arg} (hopefully we never need anything more complex)
				result = result.replace(/\\([a-zA-Z]+)(\{[^}]*\})?/g, (match, cmd, arg) => {
					const placeholder = `LATEXCMDX${cmdIndex}X`;
					protectedCommands.push({ placeholder, original: match });
					cmdIndex++;
					return placeholder;
				});
				
				// Now escape special characters (including remaining backslashes)
				result = result
					.replace(/\\/g, '\\textbackslash{}')
					.replace(/[{}]/g, '\\$&')
					.replace(/\^/g, '\\^{}')
					.replace(/_/g, '\\_')
					.replace(/~/g, '\\~{}')
					.replace(/#/g, '\\#')
					.replace(/&/g, '\\&')
					.replace(/%/g, '\\%');
				
				// revert to original commands
				for (let i = protectedCommands.length - 1; i >= 0; i--) {
					const { placeholder, original } = protectedCommands[i];
					result = result.replace(placeholder, original);
				}
			}

			// Convert Unicode characters to LaTeX equivalents (after escaping so
			// that ^ and _ in the inserted sequences are not themselves escaped)
			result = unicodeToLatex(result, part.isMath ? 'math' : 'text');

			// Restore escaped dollar signs in both math and non-math parts
			result = result.replace(new RegExp(escapedDollarPlaceholder, 'g'), '\\$');
			
			return result;
		}).join('');
	};

	let tex = `\\question{${number}}`;
	tex += tossup ? '{\\ts}' : '{\\bs}';
	tex += `{${getSubjectCode(question.subject)}}`;
	tex += `{${question.questionType === 'Multiple Choice' ? '\\mc' : '\\sa'}}`;
	tex += `{${escapeLatex(question.question)}`;
	if (question.questionType === 'Multiple Choice') {
		tex += '\\wxyz';
		for (let i = 0; i < 4; i++) {
			tex += `{${escapeLatex(question.choices[i] || '')}}`;
		}
	} else if (question.choices && question.choices.length > 0) {
		tex += '\\mul{';
		for (let i = 0; i < question.choices.length; i++) {
			tex += `{${escapeLatex(question.choices[i] || '')}}`;
		}
		tex += '}';
	}
	tex += '}';
	tex += `{${escapeLatex(question.answer)}}`;
	// add pronunciation guides, but ensure not in math mode
	let result = '';
	let inMath = false;
	for (let i = 0; i < tex.length; i++) {
		const c = tex[i];
		if (c === '$' && (i === 0 || tex[i-1] !== '\\')) {
			// Toggle math mode (ignore escaped dollar signs)
			inMath = !inMath;
			result += c;
		} else if (c === '[' && !inMath) {
			result += '\\pron{';
		} else if (c === ']' && !inMath) {
			result += '}';
		} else {
			result += c;
		}
	}
	return result;
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

// Helper function to parse round from CSV
function parseRound(roundCell) {
	const roundMap = {
		'RR1': 1, 'RR2': 2, 'RR3': 3, 'RR4': 4, 'RR5': 5,
		'DE1': 6, 'DE2': 7, 'DE3': 8, 'DE4': 9, 'DE5': 10, 'DE6': 11, 'DE7': 12,
		'F1': 13, 'F2': 14
	};
	
	const round = roundMap[roundCell.toUpperCase()];
	return round || null;
}

// Helper function to parse question header (T1 Question, B2 Question, etc.)
function parseQuestionHeader(header) {
	const match = header.match(/^([TB])(\d+)\s+Question$/);
	if (!match) return null;
	
	return {
		role: match[1] === 'T' ? 'Tossup' : 'Bonus',
		number: parseInt(match[2])
	};
}

// Helper function to parse question text
function parseQuestionText(text) {
	// Remove quotes if present
	text = text.replace(/^"|"$/g, '');
	
	// Split into lines and filter out empty lines
	const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
	
	if (lines.length < 2) {
		return null; // Need at least question and answer
	}
	
	let questionType, question, answer, choices = [];
	
	// Check the structure based on number of lines
	if (lines.length === 2) {
		// Short answer with no ranking: question + answer
		questionType = 'Short Answer';
		question = lines[0];
		answer = lines[1].replace(/^Ans:\s*/, '');
	} else if (lines.length === 5) {
		// Short answer with ranking/select: question + 3 choices + answer
		questionType = 'Short Answer';
		question = lines[0];
		choices = [];
		for (let i = 1; i <= 3; i++) {
			const choiceLine = lines[i];
			if (choiceLine.startsWith(`${i})`)) {
				choices.push(choiceLine.replace(/^\d+\)\s*/, ''));
			} else {
				console.warn(`Expected line ${i+1} to start with "${i})" but got: ${choiceLine}`);
			}
		}
		answer = lines[4].replace(/^Ans:\s*/, '');
	} else if (lines.length === 6) {
		// Multiple choice: question + 4 choices + answer
		questionType = 'Multiple Choice';
		question = lines[0];
		choices = [];
		const choiceLetters = ['W', 'X', 'Y', 'Z'];
		for (let i = 1; i <= 4; i++) {
			const choiceLine = lines[i];
			const expectedLetter = choiceLetters[i-1];
			if (choiceLine.startsWith(`${expectedLetter})`)) {
				choices.push(choiceLine.replace(/^[WXYZ]\)\s*/, ''));
			} else {
				console.warn(`Expected line ${i+1} to start with "${expectedLetter})" but got: ${choiceLine}`);
			}
		}
		answer = lines[5].replace(/^Ans:\s*/, '');
	} else {
		console.warn(`Unexpected number of lines: ${lines.length}`);
		return null;
	}
	
	if (!question || !answer) {
		return null; // Invalid question format
	}
	
	return {
		type: questionType,
		question: question,
		answer: answer,
		choices: choices
	};
}
