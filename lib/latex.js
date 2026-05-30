const { unicodeToLatex } = require('./unicode');
const { ROUND_NAMES, SUBJECTS } = require('./rounds');

const SUBJECT_DISPLAY = { 'Earth & Space': 'Earth and Space' };

const SUBJECT_CODES = {
	'Biology':     '\\bi',
	'Chemistry':   '\\ch',
	'Math':        '\\ma',
	'Physics':     '\\ph',
	'Earth & Space': '\\es',
	'Energy':      '\\en'
};

// Builds the shared LaTeX preamble used by both the main and replacements documents.
function buildPreamble(round, title, writers = {}, subjectOrder = [], branding = {}) {
	const tournamentName = branding.tournamentName || 'Texas Science Bowl Invitational';
	const edition = branding.edition || '';

	const activeSubjects = SUBJECTS.filter(s => subjectOrder.includes(s));
	const writerBlock = activeSubjects
		.map(s => `${SUBJECT_DISPLAY[s] || s}: ${writers[s] || '[Add Writers]'}`)
		.join('\n\n');

	return `% \\documentclass[addpoints]{exam}
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
\t\\itemsep-5.5px
\t\\setcounter{enumi}{22}
\t\\item {#1}
\t\\item {#2}
\t\\item {#3}
\t\\item {#4}
  \\end{enumerate}
}
\\newcommand{\\ts}{TOSS UP}
\\newcommand{\\bs}{BONUS}
\\newcommand{\\ma}{MATH}
\\newcommand{\\ph}{PHYSICS}
\\newcommand{\\ch}{CHEMISTRY}
\\newcommand{\\es}{EARTH AND SPACE}
\\newcommand{\\bi}{BIOLOGY}
\\newcommand{\\en}{ENERGY}
\\newcommand{\\sa}{Short Answer}
\\newcommand{\\mc}{Multiple Choice}
\\newcommand{\\sep}{\\vspace*{-4mm}
\t\\rule{\\textwidth}{0.1mm}}

\\NewDocumentCommand{\\mul}{>{\\SplitList{}}m}{%
  \\begin{enumerate}[label=\\arabic*), noitemsep]
\t\\ProcessList{#1}{\\ordereditem}
  \\end{enumerate}
}

% Helper command to process each item
\\newcommand{\\ordereditem}[1]{\\item #1}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\lfoot{\\texttt{${tournamentName} Round \\roundnumber}}
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

\\textbf{{\\Huge ${tournamentName}}}
\\vspace{4mm}

{\\large ${edition}}
\\vspace{5mm}

\\textbf{ {\\Large ${title}}}
\\vspace{5mm}

\\includegraphics[width=3.15in]{logo.png}
\\vspace{5mm}

\\textbf{{\\Large Authors}}

${writerBlock}

\\end{center}
\\newpage\n\n`;
}

function missingTex(number, tossup, subject) {
	const subjectCode = SUBJECT_CODES[subject] || subject;
	let tex = `\\question{${number}}`;
	tex += tossup ? '{\\ts}' : '{\\bs}';
	tex += `{${subjectCode}}`;
	tex += `{\\sa}`;
	tex += `{\\textbf{[MISSING]}}`;
	tex += `{\\textbf{[MISSING]}}`;
	return tex;
}

async function generateLatexContent(questions, round, subjectOrder, counts, writers = {}, branding = {}) {
	const grouped = {};
	for (const subject of subjectOrder) {
		grouped[subject] = {};
		for (let i = 1; i <= counts[subject]; i++) {
			grouped[subject][i] = { Tossup: null, Bonus: null };
		}
	}
	for (const q of questions) {
		if (grouped[q.subject] && grouped[q.subject][q.questionNumber]) {
			grouped[q.subject][q.questionNumber][q.questionRole] = q;
		}
	}

	let content = buildPreamble(round, ROUND_NAMES[round], writers, subjectOrder, branding);
	const maxCount = Math.max(...subjectOrder.map(s => counts[s]));
	let latexNum = 1;

	for (let qNum = 1; qNum <= maxCount; qNum++) {
		for (const subject of subjectOrder) {
			if (counts[subject] < qNum) continue;
			const slot = grouped[subject][qNum];
			content += `% Q: ${subject} Tossup ${qNum}\n`;
			if (slot.Tossup) content += questionTex(slot.Tossup, latexNum, true)  + '\n\n';
			else             content += missingTex(latexNum, true, subject)        + '\n\n';
			content += `% Q: ${subject} Bonus ${qNum}\n`;
			if (slot.Bonus)  content += questionTex(slot.Bonus,  latexNum, false) + '\n\n';
			else             content += missingTex(latexNum, false, subject)       + '\n\n';
			content += '\\sep\n\n';
			latexNum++;
		}
	}

	return content + '\\end{document}';
}

async function generateReplacementsLatexContent(questions, round, subjectOrder, writers = {}, branding = {}) {
	const grouped = {};
	for (const subject of subjectOrder) {
		grouped[subject] = { Tossup: null, Bonus: null };
	}
	for (const q of questions) {
		if (grouped[q.subject]) {
			grouped[q.subject][q.questionRole] = q;
		}
	}

	let content = buildPreamble(round, `${ROUND_NAMES[round]} (Replacements)`, writers, subjectOrder, branding);

	for (const subject of subjectOrder) {
		const slot = grouped[subject];
		if (slot.Tossup || slot.Bonus) {
			if (slot.Tossup) {
				content += `% Q: ${subject} Tossup Replacement\n`;
				content += questionTex(slot.Tossup, 1, true)  + '\n\n';
			}
			if (slot.Bonus) {
				content += `% Q: ${subject} Bonus Replacement\n`;
				content += questionTex(slot.Bonus,  2, false) + '\n\n';
			}
			content += '\\sep\n\n';
		}
	}

	return content + '\\end{document}';
}

function questionTex(question, number, tossup) {
	const escapeLatex = (text) => {
		if (!text) return '';

		// Protect escaped dollar signs before splitting on math delimiters
		const DOLLAR_PLACEHOLDER = '___ESCAPED_DOLLAR___';
		let processed = text.replace(/\\\$/g, DOLLAR_PLACEHOLDER);

		// Split into math ($...$) and text segments
		const parts = [];
		let inMath = false;
		let current = '';
		for (const c of processed) {
			if (c === '$') {
				if (current) parts.push({ text: current, isMath: inMath });
				inMath = !inMath;
				current = c;
			} else {
				current += c;
			}
		}
		if (current) parts.push({ text: current, isMath: inMath });

		return parts.map(part => {
			let result = part.text;

			if (!part.isMath) {
				// Protect existing LaTeX commands from being escaped
				const savedCommands = [];
				result = result.replace(/\\([a-zA-Z]+)(\{[^}]*\})?/g, (match) => {
					const placeholder = `LATEXCMD${savedCommands.length}`;
					savedCommands.push(match);
					return placeholder;
				});

				// Escape LaTeX special characters
				result = result
					.replace(/\\/g, '\\textbackslash{}')
					.replace(/[{}]/g, '\\$&')
					.replace(/\^/g, '\\^{}')
					.replace(/_/g, '\\_')
					.replace(/~/g, '\\~{}')
					.replace(/#/g, '\\#')
					.replace(/&/g, '\\&')
					.replace(/%/g, '\\%');

				// Restore protected commands
				for (let i = savedCommands.length - 1; i >= 0; i--) {
					result = result.replace(`LATEXCMD${i}`, savedCommands[i]);
				}
			}

			// Convert Unicode to LaTeX after escaping (so ^ and _ aren't double-escaped)
			result = unicodeToLatex(result, part.isMath ? 'math' : 'text');

			return result.replace(new RegExp(DOLLAR_PLACEHOLDER, 'g'), '\\$');
		}).join('');
	};

	let tex = `\\question{${number}}`;
	tex += tossup ? '{\\ts}' : '{\\bs}';
	tex += `{${SUBJECT_CODES[question.subject] || question.subject}}`;
	tex += `{${question.questionType === 'Multiple Choice' ? '\\mc' : '\\sa'}}`;
	tex += `{${escapeLatex(question.question)}`;

	if (question.questionType === 'Multiple Choice') {
		tex += '\\wxyz';
		for (let i = 0; i < 4; i++) {
			tex += `{${escapeLatex(question.choices[i] || '')}}`;
		}
	} else if (question.choices && question.choices.length > 0) {
		tex += '\\mul{';
		for (const choice of question.choices) {
			tex += `{${escapeLatex(choice)}}`;
		}
		tex += '}';
	}

	tex += '}';
	tex += `{${escapeLatex(question.answer)}}`;

	// Convert [text] to \pron{text} but only outside math mode
	let result = '';
	let inMath = false;
	for (let i = 0; i < tex.length; i++) {
		const c = tex[i];
		if (c === '$' && tex[i - 1] !== '\\') {
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

module.exports = { generateLatexContent, generateReplacementsLatexContent };
