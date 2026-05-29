const { ROUND_MAP } = require('./rounds');

function parseRound(roundCell) {
	return ROUND_MAP[roundCell.toLowerCase()] || null;
}

// Parses column headers like "T1 Question" or "B3 Question"
function parseQuestionHeader(header) {
	const match = header.match(/^([TB])(\d+)\s+Question$/);
	if (!match) return null;
	return {
		role: match[1] === 'T' ? 'Tossup' : 'Bonus',
		number: parseInt(match[2])
	};
}

// Parses a question cell from the CSV.
// Supported formats:
//   2 lines:  Short Answer — question + "Ans: answer"
//   5 lines:  Short Answer with ranked choices — question + 3 numbered choices + "Ans: answer"
//   6 lines:  Multiple Choice — question + W/X/Y/Z choices + "Ans: answer"
function parseQuestionText(text) {
	text = text.replace(/^"|"$/g, '');
	const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

	if (lines.length < 2) return null;

	let questionType, question, answer, choices = [];

	if (lines.length === 2) {
		questionType = 'Short Answer';
		question = lines[0];
		answer = lines[1].replace(/^Ans(?:wer)?:\s*/i, '');
	} else if (lines.length === 5) {
		questionType = 'Short Answer';
		question = lines[0];
		for (let i = 1; i <= 3; i++) {
			choices.push(lines[i].replace(/^\d+\)\s*/, ''));
		}
		answer = lines[4].replace(/^Ans(?:wer)?:\s*/i, '');
	} else if (lines.length === 6) {
		if (/^1\)/.test(lines[1])) {
			questionType = 'Short Answer';
			question = lines[0];
			for (let i = 1; i <= 4; i++) {
				choices.push(lines[i].replace(/^\d+\)\s*/, ''));
			}
			answer = lines[5].replace(/^Ans(?:wer)?:\s*/i, '');
		} else {
			questionType = 'Multiple Choice';
			question = lines[0];
			for (let i = 1; i <= 4; i++) {
				choices.push(lines[i].replace(/^[WXYZ]\)\s*/, ''));
			}
			answer = lines[5].replace(/^Ans(?:wer)?:\s*/i, '');
		}
	} else {
		return null;
	}

	if (!question || !answer) return null;

	return { type: questionType, question, answer, choices };
}

module.exports = { parseRound, parseQuestionHeader, parseQuestionText };
