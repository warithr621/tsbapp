// Get subject from URL
const urlParams = new URLSearchParams(window.location.search);
const subject = urlParams.get('subject');

// Update page title
const subjectMap = {
	biology: 'Biology',
	chemistry: 'Chemistry',
	physics: 'Physics',
	earth_space: 'Earth & Space',
	math: 'Math'
};
document.getElementById('subjectTitle').textContent = `${subjectMap[subject] || 'Subject'} Questions`;


// Fetch questions and populate table
fetch('/api/questions')
	.then(response => response.json())
	.then(data => {
		// data is an array
		const questions = data.filter(q => q.subject.toLowerCase() === subjectMap[subject].toLowerCase());
		const tableBody = document.getElementById('questionTableBody');

		ROUNDS.forEach(round => {
			const row = document.createElement('tr');
			row.className = 'border-b border-orange-100 hover:bg-orange-50 transition-colors';
			
			// Add round name cell
			const roundCell = document.createElement('td');
			roundCell.className = 'px-4 py-3 font-medium text-orange-900 text-center border-r border-orange-100';
			roundCell.textContent = round.name;
			row.appendChild(roundCell);

			// Add cells for each question number (1-5) as well as the replacement
			const isRoundRobin = ROUND_ROBIN_IDS.has(round.id);
			for (let num = 1; num <= 6; num++) {
				if (num === 5 && isRoundRobin) {
					const emptyCell = document.createElement('td');
					emptyCell.colSpan = 2;
					emptyCell.className = 'border-l border-orange-100 bg-orange-50';
					row.appendChild(emptyCell);
					continue;
				}
				// Tossup cell
				const tossupCell = createQuestionCell(questions, round.num, 'Tossup', num);
				row.appendChild(tossupCell);

				// Bonus cell
				const bonusCell = createQuestionCell(questions, round.num, 'Bonus', num);
				row.appendChild(bonusCell);
			}

			tableBody.appendChild(row);
		});
		// Render LaTeX in all table cells
		if (window.renderMathInElement) {
			renderMathInElement(document.getElementById('questionTableBody'), {
				delimiters: [
					{left: '$', right: '$', display: false},
					{left: '\\(', right: '\\)', display: false}
				]
			});
		}
	})
	.catch(error => {
		console.error('Error fetching questions:', error);
		alert('Error loading questions. Please try again.');
	});

function createQuestionCell(questions, roundNum, role, number) {
	const cell = document.createElement('td');
	cell.className = 'px-4 py-3 border-l border-orange-100 align-top';

	// Find the question for this cell
	const question = questions.find(q => 
		q.round === roundNum && 
		q.questionRole === role && 
		q.questionNumber === number
	);

	if (question) {
		// Create a container for the question content
		const content = document.createElement('div');
		content.className = 'space-y-2';

		// Question text
		const questionText = document.createElement('div');
		questionText.className = 'text-xs text-orange-900';
		questionText.innerHTML = question.question.length > 100 
			? question.question.substring(0, 100) + '...' 
			: question.question;
		content.appendChild(questionText);

		// Answer text
		const answerText = document.createElement('div');
		answerText.className = 'text-xs text-orange-600';
		answerText.innerHTML = `Answer: ${question.answer.length > 50 
			? question.answer.substring(0, 50) + '...' 
			: question.answer}`;
		content.appendChild(answerText);

		// Edit link
		const editLink = document.createElement('a');
		editLink.href = `upload.html?subject=${subject}&round=${ROUND_MAP_REVERSE[roundNum]}&role=${role}&number=${number}&id=${question._id}`;
		editLink.className = 'text-orange-500 hover:text-orange-700 text-xs inline-block mt-2 underline mr-4';
		editLink.textContent = 'Edit';
		content.appendChild(editLink);

		// Delete button
		const deleteButton = document.createElement('button');
		deleteButton.className = 'text-red-500 hover:text-red-700 text-xs inline-block mt-2 underline';
		deleteButton.textContent = 'Delete';
		deleteButton.onclick = (e) => {
			e.preventDefault();
			if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
				fetch(`/api/questions/${question._id}`, {
					method: 'DELETE'
				})
				.then(response => {
					if (response.ok) {
						// Remove the cell's content and show the "Add Question" link
						cell.innerHTML = '';
						const addLink = document.createElement('a');
						addLink.href = `upload.html?subject=${subject}&round=${roundNum}&role=${role}&number=${number}`;
						addLink.className = 'text-orange-400 hover:text-orange-600 text-xs block underline';
						addLink.textContent = '+ Add Question';
						cell.appendChild(addLink);
					} else {
						throw new Error('Failed to delete question');
					}
				})
				.catch(error => {
					console.error('Error deleting question:', error);
					alert('Failed to delete question. Please try again.');
				});
			}
		};
		content.appendChild(deleteButton);

		cell.appendChild(content);
	} else {
		// Add new question link
		const addLink = document.createElement('a');
		addLink.href = `upload.html?subject=${subject}&round=${roundNum}&role=${role}&number=${number}`;
		addLink.className = 'text-orange-400 hover:text-orange-600 text-xs block underline';
		addLink.textContent = '+ Add Question';
		cell.appendChild(addLink);
	}

	return cell;
} 