const express = require('express');
const { parse } = require('csv-parse');
const Question = require('../models/question');
const { parseRound, parseQuestionHeader, parseQuestionText } = require('../lib/csv');

const router = express.Router();

// Parses all questions from CSV records into a flat array of question objects.
function extractQuestionsFromRecords(records, subject) {
	const headers = records[0].map(h => h.trim());
	const questions = [];

	for (let i = 1; i < records.length; i++) {
		const values = records[i];
		if (values.length < headers.length) continue;

		const round = parseRound(values[0]);
		if (!round) continue;

		// Parse regular questions (all columns except first and last two)
		for (let j = 1; j < headers.length - 2; j++) {
			const cell = values[j];
			if (!cell || !cell.trim()) continue;
			const questionInfo = parseQuestionHeader(headers[j]);
			if (!questionInfo) continue;
			const parsed = parseQuestionText(cell);
			if (!parsed) continue;
			questions.push({
				subject,
				round,
				questionType: parsed.type,
				question: parsed.question,
				answer: parsed.answer,
				choices: parsed.choices,
				questionRole: questionInfo.role,
				questionNumber: questionInfo.number
			});
		}

		// Parse replacement questions (last two columns: tossup then bonus)
		const replacementCells = [
			{ cell: values[headers.length - 2], role: 'Tossup' },
			{ cell: values[headers.length - 1], role: 'Bonus'  }
		];
		for (const { cell, role } of replacementCells) {
			if (!cell || !cell.trim()) continue;
			const parsed = parseQuestionText(cell);
			if (!parsed) continue;
			questions.push({
				subject,
				round,
				questionType: parsed.type,
				question: parsed.question,
				answer: parsed.answer,
				choices: parsed.choices,
				questionRole: role,
				questionNumber: 6
			});
		}
	}

	return questions;
}

router.post('/upload-csv', async (req, res) => {
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

			const questions = extractQuestionsFromRecords(records, subject);
			const saved = [];
			const failed = [];
			for (const q of questions) {
				try {
					saved.push(await new Question(q).save());
				} catch (error) {
					failed.push({
						label: `${q.subject} ${q.questionRole} ${q.questionNumber} (Round ${q.round})`,
						reason: error.message,
					});
				}
			}
			res.json({ success: true, saved: saved.length, failed });
		});
	} catch (error) {
		console.error('Error processing CSV:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.post('/preview-csv', async (req, res) => {
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

			// Preview: parse only the first data row, cap at 5 questions
			const headers = records[0].map(h => h.trim());
			const firstRow = records[1];
			if (firstRow.length < headers.length) {
				return res.json({ success: true, previewQuestions: [] });
			}

			const round = parseRound(firstRow[0]);
			const preview = [];

			if (round) {
				for (let j = 1; j < headers.length - 2 && preview.length < 3; j++) {
					const cell = firstRow[j];
					if (!cell || !cell.trim()) continue;
					const questionInfo = parseQuestionHeader(headers[j]);
					if (!questionInfo) continue;
					const parsed = parseQuestionText(cell);
					if (!parsed) continue;
					preview.push({
						header: headers[j],
						round: firstRow[0],
						questionType: parsed.type,
						question: parsed.question,
						answer: parsed.answer,
						choices: parsed.choices,
						questionRole: questionInfo.role,
						questionNumber: questionInfo.number
					});
				}

				// Also preview replacement questions
				const replacementPreview = [
					{ cell: firstRow[headers.length - 2], header: 'Replacement Toss-up', role: 'Tossup' },
					{ cell: firstRow[headers.length - 1], header: 'Replacement Bonus',   role: 'Bonus'  }
				];
				for (const { cell, header, role } of replacementPreview) {
					if (!cell || !cell.trim()) continue;
					const parsed = parseQuestionText(cell);
					if (!parsed) continue;
					preview.push({
						header,
						round: firstRow[0],
						questionType: parsed.type,
						question: parsed.question,
						answer: parsed.answer,
						choices: parsed.choices,
						questionRole: role,
						questionNumber: 6
					});
				}
			}

			res.json({ success: true, previewQuestions: preview });
		});
	} catch (error) {
		console.error('Error previewing CSV:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

module.exports = router;
