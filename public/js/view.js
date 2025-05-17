document.addEventListener('DOMContentLoaded', function() {
    const displayTypeSelect = document.getElementById('displayType');
    const submitButton = document.getElementById('submit');
    const questionsContainer = document.getElementById('questionsContainer');

    submitButton.addEventListener('click', function() {
        const displayType = displayTypeSelect.value;
        fetchQuestions(displayType);
    });
});

function fetchQuestions(displayType) {
    fetch(`/questions?displayType=${displayType}`)
        .then(response => response.json())
        .then(data => {
            displayQuestions(data, displayType);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to fetch questions.');
        });
}

function displayQuestions(questions, displayType) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    if (displayType === 'subject') {
        // Group by subject
        const groupedQuestions = groupBySubject(questions);
        Object.entries(groupedQuestions).forEach(([subject, subjectQuestions]) => {
            const subjectSection = createSubjectSection(subject, subjectQuestions);
            container.appendChild(subjectSection);
        });
    } else {
        // Group by round
        const groupedQuestions = groupByRound(questions);
        Object.entries(groupedQuestions).forEach(([round, roundQuestions]) => {
            const roundSection = createRoundSection(round, roundQuestions);
            container.appendChild(roundSection);
        });
    }
}

function groupBySubject(questions) {
    return questions.reduce((acc, question) => {
        if (!acc[question.subject]) {
            acc[question.subject] = [];
        }
        acc[question.subject].push(question);
        return acc;
    }, {});
}

function groupByRound(questions) {
    return questions.reduce((acc, question) => {
        if (!acc[question.round]) {
            acc[question.round] = [];
        }
        acc[question.round].push(question);
        return acc;
    }, {});
}

function createSubjectSection(subject, questions) {
    const section = document.createElement('div');
    section.className = 'subject-section';
    
    const header = document.createElement('h2');
    header.textContent = subject;
    section.appendChild(header);

    const questionsList = document.createElement('div');
    questionsList.className = 'questions-list';
    
    questions.sort((a, b) => a.round - b.round).forEach(question => {
        const questionElement = createQuestionElement(question);
        questionsList.appendChild(questionElement);
    });

    section.appendChild(questionsList);
    return section;
}

function createRoundSection(round, questions) {
    const section = document.createElement('div');
    section.className = 'round-section';
    
    const header = document.createElement('h2');
    header.textContent = `Round ${round}`;
    section.appendChild(header);

    const questionsList = document.createElement('div');
    questionsList.className = 'questions-list';
    
    questions.sort((a, b) => a.subject.localeCompare(b.subject)).forEach(question => {
        const questionElement = createQuestionElement(question);
        questionsList.appendChild(questionElement);
    });

    section.appendChild(questionsList);
    return section;
}

function createQuestionElement(question) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-card';
    questionDiv.innerHTML = `
        <div class="question-header">
            <span class="subject">${question.subject}</span>
            <span class="round">Round ${question.round}</span>
        </div>
        <div class="question-content">
            <p class="question-text">${question.question}</p>
            <p class="answer">Answer: ${question.answer}</p>
        </div>
        <div class="question-actions">
            <button onclick="editQuestion('${question._id}')" class="edit-btn">Edit</button>
            <button onclick="deleteQuestion('${question._id}')" class="delete-btn">Delete</button>
        </div>
    `;
    return questionDiv;
}

function editQuestion(questionId) {
    fetch(`/questions/${questionId}`)
        .then(response => response.json())
        .then(question => {
            showEditModal(question);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to fetch question details.');
        });
}

function showEditModal(question) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Question</h3>
            <form id="editForm">
                <input type="hidden" name="id" value="${question._id}">
                <div class="form-group">
                    <label>Subject:</label>
                    <input type="text" name="subject" value="${question.subject}" required>
                </div>
                <div class="form-group">
                    <label>Round:</label>
                    <input type="number" name="round" value="${question.round}" required>
                </div>
                <div class="form-group">
                    <label>Question:</label>
                    <textarea name="question" required>${question.question}</textarea>
                </div>
                <div class="form-group">
                    <label>Answer:</label>
                    <input type="text" name="answer" value="${question.answer}" required>
                </div>
                <div class="modal-actions">
                    <button type="submit">Save</button>
                    <button type="button" onclick="closeModal()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
}

function handleEditSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    fetch(`/questions/${data.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            closeModal();
            const displayType = document.getElementById('displayType').value;
            fetchQuestions(displayType);
        } else {
            alert('Failed to update question.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while updating the question.');
    });
}

function deleteQuestion(questionId) {
    if (confirm('Are you sure you want to delete this question?')) {
        fetch(`/questions/${questionId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const displayType = document.getElementById('displayType').value;
                fetchQuestions(displayType);
            } else {
                alert('Failed to delete question.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the question.');
        });
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
} 