const express = require('express');
const path = require('path');
const fs = require('fs');
const Question = require('../models/question');
const { generateLatexContent, generateReplacementsLatexContent } = require('../lib/latex');

const router = express.Router();
const generatedDir = path.join(__dirname, '..', 'generated');

const ROUND_MAP = {
	'rr1': 1, 'rr2': 2, 'rr3': 3, 'rr4': 4, 'rr5': 5,
	'de1': 6, 'de2': 7, 'de3': 8, 'de4': 9, 'de5': 10, 'de6': 11, 'de7': 12,
	'f1': 13, 'f2': 14
};

router.post('/generate-latex', async (req, res) => {
	try {
		const { round } = req.body;
		const roundNumber = ROUND_MAP[round];
		if (!roundNumber) {
			return res.status(400).json({ success: false, error: 'Invalid round code' });
		}

		const questions = await Question.find({ round: roundNumber });
		if (questions.length === 0) {
			return res.status(404).json({ success: false, error: 'No questions found for this round' });
		}

		// Copy the logo so the generated .tex file is self-contained for local compilation
		const logoSrc = path.join(__dirname, '..', 'public', 'images', 'logo.png');
		const logoDst = path.join(generatedDir, 'logo.png');
		if (fs.existsSync(logoSrc)) fs.copyFileSync(logoSrc, logoDst);

		// Write main round TeX file
		const latexContent = await generateLatexContent(questions, round);
		fs.writeFileSync(path.join(generatedDir, `${round}.tex`), latexContent);
		console.log(`Generated ${round}.tex`);

		// Write replacements TeX file if any replacement questions exist
		const replacements = questions.filter(q => q.questionNumber === 6);
		if (replacements.length > 0) {
			const replacementsContent = await generateReplacementsLatexContent(replacements, round);
			fs.writeFileSync(path.join(generatedDir, `${round}-replacements.tex`), replacementsContent);
			console.log(`Generated ${round}-replacements.tex`);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error generating LaTeX:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

module.exports = router;
