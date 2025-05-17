// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const questionTypeSelect = document.getElementById('questionType');
    const shortOptionsDiv = document.getElementById('shortOptions');
    const choiceBlanksDiv = document.getElementById('choiceBlanks');
    const optionBlanksDiv = document.getElementById('optionBlanks');
    const shortTypeSelect = document.getElementById('shortType');

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
        earth_space: 'Earth Science',
        math: 'Math'
    };
    // Map round to number (extract number from rr1, de2, etc. or use a mapping)
    const roundMap = {
        rr1: 1, rr2: 2, rr3: 3, rr4: 4, rr5: 5,
        de1: 6, de2: 7, de3: 8, de4: 9, de5: 10, de6: 11, de7: 12,
        f1: 13, f2: 14
    };
    // Map questionType to backend expected value
    const typeMap = {
        multipleChoice: 'Multiple Choice',
        shortAnswer: 'Short Answer'
    };

    const subject = subjectMap[formData.get('subject')] || 'General Science';
    const round = roundMap[formData.get('round')] || 1;
    const questionType = typeMap[formData.get('questionType')] || 'Short Answer';
    const question = formData.get('question') || '';
    const answer = formData.get('answer') || '';

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
        choices
    };

    fetch('/api/questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Question uploaded successfully!');
            window.location.href = 'index.html';
        } else {
            alert('Failed to upload question.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while uploading the question.');
    });
} 