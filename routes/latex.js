const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Question = require('../models/question');
const { generateLatexContent, generateReplacementsLatexContent } = require('../lib/latex');

const { ROUND_MAP } = require('../lib/rounds');

const router = express.Router();
const generatedDir = path.join(__dirname, '..', 'generated');

// Tracks pdflatex compilation status per round code.
// shape: { round: { status, errors? }, replacements: { status, errors? } }
// status: 'pending' | 'success' | 'error' | 'n/a'
const compilationStatus = new Map();
// Prevents stale pdflatex processes from overwriting a newer generation's status.
const generationId = {};

function parseLatexLog(texBasename) {
	const logBase = texBasename.replace(/\.tex$/, '');
	const logPath = path.join(generatedDir, `${logBase}.log`);
	const texPath = path.join(generatedDir, texBasename);

	let logContent, texLines;
	try {
		logContent = fs.readFileSync(logPath, 'utf8');
		texLines = fs.readFileSync(texPath, 'utf8').split('\n');
	} catch {
		return [{ error: 'Could not read log or tex file', question: null }];
	}

	const errors = [];
	const logLines = logContent.split('\n');

	for (let i = 0; i < logLines.length; i++) {
		const line = logLines[i];
		if (!line.startsWith('! ')) continue;

		const errorMsg = line.slice(2).trim();
		let questionLabel = null;
		let lineNum = null;

		for (let j = i + 1; j < Math.min(i + 10, logLines.length); j++) {
			const m = logLines[j].match(/^l\.(\d+)/);
			if (m) { lineNum = parseInt(m[1]); break; }
		}

		if (lineNum !== null) {
			for (let k = lineNum - 1; k >= 0; k--) {
				if (texLines[k] && texLines[k].trim().startsWith('% Q:')) {
					questionLabel = texLines[k].trim().slice(4).trim();
					break;
				}
			}
		}

		errors.push({ error: errorMsg, question: questionLabel });
	}

	return errors.length > 0
		? errors
		: [{ error: 'Compilation failed (no specific error found in log)', question: null }];
}

function spawnPdf(round, texFile, key, genId) {
	const proc = spawn('pdflatex', ['-interaction=nonstopmode', texFile], {
		cwd: generatedDir,
		shell: true,
	});
	proc.on('close', (code) => {
		if (generationId[round] !== genId) return;
		const status = compilationStatus.get(round);
		if (!status) return;
		if (code === 0) {
			status[key] = { status: 'success' };
		} else {
			status[key] = { status: 'error', errors: parseLatexLog(texFile) };
		}
	});
}

router.post('/generate-latex', async (req, res) => {
	try {
		const { round, counts, subjectOrder, writers = {} } = req.body;
		const roundNumber = ROUND_MAP[round];
		if (!roundNumber) {
			return res.status(400).json({ success: false, error: 'Invalid round code' });
		}
		if (!subjectOrder || !Array.isArray(subjectOrder) || subjectOrder.length === 0) {
			return res.status(400).json({ success: false, error: 'subjectOrder is required' });
		}
		if (!counts || typeof counts !== 'object') {
			return res.status(400).json({ success: false, error: 'counts is required' });
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
		const latexContent = await generateLatexContent(questions, round, subjectOrder, counts, writers);
		fs.writeFileSync(path.join(generatedDir, `${round}.tex`), latexContent);
		console.log(`Generated ${round}.tex`);

		// Write replacements TeX file if any replacement questions exist
		const replacements = questions.filter(q => q.questionNumber === 6);
		const hasReplacements = replacements.length > 0;
		if (hasReplacements) {
			const replacementsContent = await generateReplacementsLatexContent(replacements, round, subjectOrder, writers);
			fs.writeFileSync(path.join(generatedDir, `${round}-replacements.tex`), replacementsContent);
			console.log(`Generated ${round}-replacements.tex`);
		}

		// Set up compilation status and kick off pdflatex for both files in parallel
		const genId = Date.now();
		generationId[round] = genId;
		compilationStatus.set(round, {
			round: { status: 'pending' },
			replacements: hasReplacements ? { status: 'pending' } : { status: 'n/a' },
		});
		spawnPdf(round, `${round}.tex`, 'round', genId);
		if (hasReplacements) spawnPdf(round, `${round}-replacements.tex`, 'replacements', genId);

		res.json({ success: true, hasReplacements });
	} catch (error) {
		console.error('Error generating LaTeX:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.get('/pdf-status/:round', (req, res) => {
	const { round } = req.params;
	const status = compilationStatus.get(round);
	if (!status) {
		return res.json({
			round: { status: 'unknown' },
			replacements: { status: 'unknown' },
		});
	}
	res.json(status);
});

module.exports = router;
