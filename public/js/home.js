document.getElementById('uploadQuestion').addEventListener('click', function() {
    window.location.href = 'upload.html';
});

document.getElementById('viewQuestions').addEventListener('click', function() {
    window.location.href = 'view.html';
});

document.getElementById('resetQuestions').addEventListener('click', function() {
    const password = prompt('Enter password to reset questions:');
    if (password === 'tsb2025') { // Replace with your actual password
        fetch('/api/reset-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
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
    } else {
        alert('Incorrect password.');
    }
}); 