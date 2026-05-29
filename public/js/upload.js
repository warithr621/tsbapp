// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
	const questionTypeSelect = document.getElementById('questionType');
	const shortOptionsDiv = document.getElementById('shortOptions');
	const choiceBlanksDiv = document.getElementById('choiceBlanks');
	const optionBlanksDiv = document.getElementById('optionBlanks');
	const shortTypeSelect = document.getElementById('shortType');

	// Get URL parameters
	const urlParams = new URLSearchParams(window.location.search);
	const subject = urlParams.get('subject');
	const round = urlParams.get('round');
	const role = urlParams.get('role');
	const number = urlParams.get('number');

	// Set pre-filled values if they exist
	if (subject) document.getElementById('subject').value = subject;
	if (round && ROUND_MAP[round]) document.getElementById('round').value = round;
	if (role) document.getElementById('questionRole').value = role;

	// Update question number options based on round
	const roundSelect = document.getElementById('round');
	const questionNumberSelect = document.getElementById('questionNumber');

	function updateQuestionNumberOptions() {
		const current = questionNumberSelect.value;
		questionNumberSelect.innerHTML = '';
		for (let i = 1; i <= 5; i++) {
			const opt = document.createElement('option');
			opt.value = i;
			opt.textContent = i;
			questionNumberSelect.appendChild(opt);
		}
		const replOpt = document.createElement('option');
		replOpt.value = 6;
		replOpt.textContent = 'Replacement';
		questionNumberSelect.appendChild(replOpt);
		// Restore previous selection if still valid, else default to 1
		if ([...questionNumberSelect.options].some(o => o.value === current)) {
			questionNumberSelect.value = current;
		}
	}

	roundSelect.addEventListener('change', updateQuestionNumberOptions);
	updateQuestionNumberOptions();
	if (number) questionNumberSelect.value = number;

	// Function to update form display based on question type
	function updateFormDisplay() {
		const questionType = questionTypeSelect.value;
		
		if (questionType === 'multipleChoice') {
			shortOptionsDiv.style.display = 'none';
			choiceBlanksDiv.style.display = 'block';
			optionBlanksDiv.style.display = 'none';
		} else if (questionType === 'shortAnswer') {
			shortOptionsDiv.style.display = 'block';
			const shortType = shortTypeSelect.value;
			
			if (shortType === 'Yes') {
				choiceBlanksDiv.style.display = 'none';
				optionBlanksDiv.style.display = 'block';
			} else {
				choiceBlanksDiv.style.display = 'none';
				optionBlanksDiv.style.display = 'none';
			}
		}
	}

	// Add event listeners
	questionTypeSelect.addEventListener('change', updateFormDisplay);
	shortTypeSelect.addEventListener('change', updateFormDisplay);

	// Initial display setup
	updateFormDisplay();

	// LaTeX preview logic
	function renderLatexSegments(input, target) {
		if (!input) {
			target.innerHTML = '';
			return;
		}
		// Regex for $...$ and \(...\) (non-greedy)
		const regex = /(\$[^$]+\$|\\\([^\\)]+\\\))/g;
		let lastIndex = 0;
		let result = '';
		let match;
		while ((match = regex.exec(input)) !== null) {
			// Add plain text before match
			if (match.index > lastIndex) {
				result += escapeHtml(input.slice(lastIndex, match.index));
			}
			let tex = match[0];
			// Remove delimiters
			if (tex.startsWith('$')) {
				tex = tex.slice(1, -1);
			} else if (tex.startsWith('\\(')) {
				tex = tex.slice(2, -2);
			}
			try {
				result += katex.renderToString(tex, {throwOnError: false});
			} catch (e) {
				result += '<span style="color:red">Invalid LaTeX</span>';
			}
			lastIndex = regex.lastIndex;
		}
		// Add remaining plain text
		if (lastIndex < input.length) {
			result += escapeHtml(input.slice(lastIndex));
		}
		target.innerHTML = result;
	}
	const pairs = [
		['question', 'previewQ'],
		['choiceW', 'previewW'],
		['choiceX', 'previewX'],
		['choiceY', 'previewY'],
		['choiceZ', 'previewZ'],
		['choice1', 'preview1'],
		['choice2', 'preview2'],
		['choice3', 'preview3'],
		['answer', 'previewA']
	];
	pairs.forEach(([inputId, previewId]) => {
		const input = document.getElementById(inputId);
		const preview = document.getElementById(previewId);
		if (input && preview) {
			renderLatexSegments(input.value, preview);
			input.addEventListener('input', () => {
				renderLatexSegments(input.value, preview);
			});
		}
	});

	// Fetch and pre-fill form if editing
	const questionId = urlParams.get('id');
	if (questionId) {
		fetch(`/api/questions/${questionId}`)
			.then(res => res.json())
			.then(q => {
				if (q && q._id) {
					document.getElementById('subject').value = (q.subject || '').toLowerCase().replace(/ /g, '_');
					document.getElementById('round').value = ROUND_MAP_REVERSE[q.round] || '';
					updateQuestionNumberOptions();
					document.getElementById('questionRole').value = q.questionRole || '';
					document.getElementById('questionNumber').value = q.questionNumber || 1;
					document.getElementById('questionType').value = (q.questionType === 'Multiple Choice') ? 'multipleChoice' : 'shortAnswer';
					document.getElementById('question').value = q.question || '';
					document.getElementById('answer').value = q.answer || '';
					// Fill choices
					if (q.questionType === 'Multiple Choice') {
						document.getElementById('choiceW').value = q.choices[0] || '';
						document.getElementById('choiceX').value = q.choices[1] || '';
						document.getElementById('choiceY').value = q.choices[2] || '';
						document.getElementById('choiceZ').value = q.choices[3] || '';
					} else if (q.questionType === 'Short Answer') {
						document.getElementById('shortType').value = (q.choices && q.choices.length > 0) ? 'Yes' : 'No';
						document.getElementById('choice1').value = q.choices[0] || '';
						document.getElementById('choice2').value = q.choices[1] || '';
						document.getElementById('choice3').value = q.choices[2] || '';
					}
					// Trigger form display update
					if (typeof updateFormDisplay === 'function') updateFormDisplay();
					
					// Re-render LaTeX previews after populating form fields
					pairs.forEach(([inputId, previewId]) => {
						const input = document.getElementById(inputId);
						const preview = document.getElementById(previewId);
						if (input && preview) {
							renderLatexSegments(input.value, preview);
						}
					});
				}
			});
	}
});

// Function to send question to server
function sendQuestion(event) {
	if (event) event.preventDefault();
	const form = document.querySelector('form');
	const formData = new FormData(form);

	// Map subject to backend expected value
	const subjectMap = {
		biology: 'Biology',
		chemistry: 'Chemistry',
		physics: 'Physics',
		earth_space: 'Earth & Space',
		math: 'Math'
	};
	// Map questionType to backend expected value
	const typeMap = {
		multipleChoice: 'Multiple Choice',
		shortAnswer: 'Short Answer'
	};

	const subject = subjectMap[formData.get('subject')] || 'General Science';
	const round = ROUND_MAP[formData.get('round')] || 1;
	const questionType = typeMap[formData.get('questionType')] || 'Short Answer';
	const question = formData.get('question') || '';
	const answer = formData.get('answer') || '';
	const questionRole = formData.get('questionRole') || 'Tossup';
	const questionNumber = parseInt(formData.get('questionNumber')) || 1;

	// Build choices array for multiple choice
	let choices = [];
	if (questionType === 'Multiple Choice') {
		choices = [
			formData.get('choiceW') || '',
			formData.get('choiceX') || '',
			formData.get('choiceY') || '',
			formData.get('choiceZ') || ''
		].filter(c => c.trim() !== '');
	} else if (questionType === 'Short Answer' && formData.get('shortType') === 'Yes') {
		choices = [
			formData.get('choice1') || '',
			formData.get('choice2') || '',
			formData.get('choice3') || ''
		].filter(c => c.trim() !== '');
	}

	const data = {
		subject,
		round,
		questionType,
		question,
		answer,
		choices,
		questionRole,
		questionNumber
	};

	// Get the question ID from URL if it exists (for editing)
	const urlParams = new URLSearchParams(window.location.search);
	const questionId = urlParams.get('id');

	const url = questionId ? `/api/questions/${questionId}` : '/api/questions';
	const method = questionId ? 'PUT' : 'POST';

	fetch(url, {
		method: method,
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	})
	.then(response => response.json())
	.then(data => {
		if (data.success) {
			alert('Question saved successfully!');
			// Redirect back to the question table
			const subject = urlParams.get('subject');
			window.location.href = `question-table.html?subject=${subject}`;
		} else {
			alert('Failed to save question.');
		}
	})
	.catch(error => {
		console.error('Error:', error);
		alert('An error occurred while saving the question.');
	});
} 