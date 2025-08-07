document.addEventListener('DOMContentLoaded', function() {
	const form = document.getElementById('csvUploadForm');
	const fileInput = document.getElementById('csvFile');
	const previewSection = document.getElementById('previewSection');
	const previewContent = document.getElementById('previewContent');
	const alertDiv = document.getElementById('alert');

	// Handle file selection and preview
	fileInput.addEventListener('change', function(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function(e) {
			const csvData = e.target.result;
			showParsedPreview(csvData);
		};
		reader.readAsText(file);
	});

	// Handle form submission
	form.addEventListener('submit', function(event) {
		event.preventDefault();
		uploadCSV();
	});

	function showParsedPreview(csvData) {
		showLoading('Parsing CSV...');
		
		fetch('/api/preview-csv', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				csvData: csvData
			})
		})
		.then(response => response.json())
		.then(data => {
			hideLoading();
			if (data.success) {
				displayParsedQuestions(data.previewQuestions);
			} else {
				showError(data.error || 'Failed to parse CSV');
			}
		})
		.catch(error => {
			hideLoading();
			showError('An error occurred while parsing the CSV: ' + error.message);
			console.error('Error:', error);
		});
	}

	function displayParsedQuestions(questions) {
		if (questions.length === 0) {
			previewContent.innerHTML = '<div class="text-red-600">No valid questions found in CSV</div>';
			previewSection.classList.remove('hidden');
			return;
		}

		let previewHTML = '<div class="space-y-6">';
		previewHTML += '<div class="text-lg font-semibold text-burnt">Parsed Questions Preview:</div>';
		
		questions.forEach((question, index) => {
			previewHTML += '<div class="bg-white p-4 rounded-lg border border-gray-200">';
			previewHTML += '<div class="mb-2"><strong class="text-burnt">' + question.header + ' (' + question.round + ')</strong></div>';
			previewHTML += '<div class="mb-2"><strong>Type:</strong> ' + question.questionType + ' | <strong>Role:</strong> ' + question.questionRole + ' #' + question.questionNumber + '</div>';
			
			// Question text
			previewHTML += '<div class="mb-3"><strong>Question:</strong><br><div class="ml-4 mt-1 text-sm">' + escapeHtml(question.question) + '</div></div>';
			
			// Choices if present
			if (question.choices && question.choices.length > 0) {
				previewHTML += '<div class="mb-3"><strong>Choices:</strong><br>';
				question.choices.forEach((choice, choiceIndex) => {
					const choiceLabel = question.questionType === 'Multiple Choice' ? ['W', 'X', 'Y', 'Z'][choiceIndex] : (choiceIndex + 1);
					previewHTML += '<div class="ml-4 mt-1 text-sm">' + choiceLabel + ') ' + escapeHtml(choice) + '</div>';
				});
				previewHTML += '</div>';
			}
			
			// Answer
			previewHTML += '<div><strong>Answer:</strong> <span class="text-green-600">' + escapeHtml(question.answer) + '</span></div>';
			previewHTML += '</div>';
		});
		
		previewHTML += '</div>';
		previewContent.innerHTML = previewHTML;
		previewSection.classList.remove('hidden');
	}

	function escapeHtml(str) {
		return str.replace(/[&<>"']/g, function(tag) {
			const charsToReplace = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			};
			return charsToReplace[tag] || tag;
		});
	}

	function uploadCSV() {
		const subject = document.getElementById('subject').value;
		const file = fileInput.files[0];

		if (!subject) {
			showError('Please select a subject.');
			return;
		}

		if (!file) {
			showError('Please select a CSV file.');
			return;
		}

		showLoading('Uploading CSV...');

		const reader = new FileReader();
		reader.onload = function(e) {
			const csvData = e.target.result;
			
			fetch('/api/upload-csv', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					csvData: csvData,
					subject: subject
				})
			})
			.then(response => response.json())
			.then(data => {
				hideLoading();
				if (data.success) {
					showSuccess(data.message);
					// Reset form
					form.reset();
					previewSection.classList.add('hidden');
				} else {
					showError(data.error || 'Failed to upload CSV');
				}
			})
			.catch(error => {
				hideLoading();
				showError('An error occurred while uploading the CSV: ' + error.message);
				console.error('Error:', error);
			});
		};
		reader.readAsText(file);
	}

	function showLoading(message) {
		alertDiv.innerHTML = `
			<div class="alert alert-info">
				<i class="fas fa-spinner fa-spin"></i> ${message}
			</div>
		`;
		alertDiv.style.display = 'block';
	}

	function hideLoading() {
		alertDiv.style.display = 'none';
	}

	function showSuccess(message) {
		alertDiv.innerHTML = `
			<div class="alert alert-success">
				<i class="fas fa-check-circle"></i> ${message}
			</div>
		`;
		alertDiv.style.display = 'block';
		setTimeout(() => {
			alertDiv.style.display = 'none';
		}, 5000);
	}

	function showError(message) {
		alertDiv.innerHTML = `
			<div class="alert alert-danger">
				<i class="fas fa-exclamation-circle"></i> ${message}
			</div>
		`;
		alertDiv.style.display = 'block';
	}
}); 