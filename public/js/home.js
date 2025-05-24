document.getElementById('uploadQuestion').addEventListener('click', function() {
	window.location.href = 'subject-select.html';
});

document.getElementById('viewQuestions').addEventListener('click', function() {
	window.location.href = 'view.html';
});

document.getElementById('resetQuestions').addEventListener('click', function() {
	const resetKey = prompt('Enter reset key to reset questions:');
	fetch('/api/reset-questions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ resetKey })
	})
	.then(response => response.json())
	.then(data => {
		if (data.success) {
			alert('Questions reset successfully!');
		} else {
			alert('Failed to reset questions.');
		}
	})
	.catch(error => {
		console.error('Error:', error);
		alert('An error occurred while resetting questions.');
	});
});

// Subject select page logic
if (window.location.pathname.endsWith('subject-select.html')) {
	document.querySelectorAll('button[data-subject]').forEach(btn => {
		btn.addEventListener('click', function() {
			const subject = btn.getAttribute('data-subject');
			window.location.href = `question-table.html?subject=${subject}`;
		});
	});
} 