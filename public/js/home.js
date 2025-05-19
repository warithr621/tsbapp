document.getElementById('uploadQuestion').addEventListener('click', function() {
    window.location.href = 'upload.html';
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