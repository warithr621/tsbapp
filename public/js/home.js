document.getElementById('uploadQuestion').addEventListener('click', () => {
	window.location.href = 'subject-select.html';
});

document.getElementById('viewQuestions').addEventListener('click', () => {
	window.location.href = 'view.html';
});

document.getElementById('resetQuestions').addEventListener('click', () => {
	const resetKey = prompt('Enter reset key to reset questions:');
	fetch('/api/reset-questions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ resetKey })
	})
	.then(res => res.json())
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
