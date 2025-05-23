let questions = [];
let currentEditId = null;
const editModal = new bootstrap.Modal(document.getElementById('editModal'));

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Upload form submission
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    
    // Question type change
    document.querySelector('select[name="questionType"]').addEventListener('change', handleQuestionTypeChange);
    
    // View filter change
    document.getElementById('viewFilter').addEventListener('change', () => {
        displayQuestions();
    });
    
    // Reset form submission
    document.getElementById('resetForm').addEventListener('submit', handleReset);
}

// Load questions from the server
async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        displayQuestions();
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
    }
}

// Display questions based on current filter
function displayQuestions() {
    const filter = document.getElementById('viewFilter').value;
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';

    let groupedQuestions = {};
    
    if (filter === 'subject') {
        // Group by subject
        questions.forEach(q => {
            if (!groupedQuestions[q.subject]) {
                groupedQuestions[q.subject] = [];
            }
            groupedQuestions[q.subject].push(q);
        });
    } else {
        // Group by round
        questions.forEach(q => {
            if (!groupedQuestions[q.round]) {
                groupedQuestions[q.round] = [];
            }
            groupedQuestions[q.round].push(q);
        });
    }

    // Sort groups
    const sortedGroups = Object.keys(groupedQuestions).sort((a, b) => {
        if (filter === 'subject') return a.localeCompare(b);
        return Number(a) - Number(b);
    });

    // Create HTML for each group
    sortedGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-4';
        
        const groupTitle = document.createElement('h6');
        groupTitle.className = 'mb-2';
        groupTitle.textContent = filter === 'subject' ? group : `Round ${group}`;
        groupDiv.appendChild(groupTitle);

        const questionsList = document.createElement('div');
        questionsList.className = 'list-group';
        
        groupedQuestions[group].forEach(q => {
            const questionItem = createQuestionItem(q);
            questionsList.appendChild(questionItem);
        });

        groupDiv.appendChild(questionsList);
        document.getElementById('questionsList').appendChild(groupDiv);
    });
}

// Create a question item element
function createQuestionItem(question) {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    
    const choicesText = question.choices && question.choices.length > 0 
        ? `<br><small class="text-muted">Choices: ${question.choices.join(', ')}</small>`
        : '';
    
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-1">${question.question}</h6>
                <small class="text-muted">
                    Type: ${question.questionType} | 
                    Answer: ${question.answer} | 
                    Subject: ${question.subject} | 
                    Round: ${question.round}
                </small>
                ${choicesText}
            </div>
            <div>
                <button class="btn btn-sm btn-primary me-2" onclick="editQuestion('${question._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${question._id}')">Delete</button>
            </div>
        </div>
    `;
    return div;
}

// Handle question upload
async function handleUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const questionData = {
        subject: formData.get('subject'),
        round: Number(formData.get('round')),
        questionType: formData.get('questionType'),
        question: formData.get('question'),
        answer: formData.get('answer'),
        choices: formData.get('questionType') === 'Multiple Choice' ? 
            Array.from(document.querySelectorAll('.choice-input')).map(input => input.value) : 
            []
    };

    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(questionData)
        });

        if (response.ok) {
            e.target.reset();
            document.getElementById('choicesContainer').style.display = 'none';
            document.getElementById('choicesList').innerHTML = '';
            loadQuestions();
        } else {
            throw new Error('Failed to upload question');
        }
    } catch (error) {
        console.error('Error uploading question:', error);
        alert('Error uploading question. Please try again.');
    }
}

// Handle question type change
function handleQuestionTypeChange(e) {
    const choicesContainer = document.getElementById('choicesContainer');
    const choicesList = document.getElementById('choicesList');
    
    if (e.target.value === 'Multiple Choice') {
        choicesContainer.style.display = 'block';
        choicesList.innerHTML = '';
        addChoice();
    } else {
        choicesContainer.style.display = 'none';
        choicesList.innerHTML = '';
    }
}

// Add a choice input field
function addChoice() {
    const choicesList = document.getElementById('choicesList');
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'input-group mb-2';
    choiceDiv.innerHTML = `
        <input type="text" class="form-control choice-input" placeholder="Enter choice" required>
        <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    choicesList.appendChild(choiceDiv);
}

// Edit a question
async function editQuestion(id) {
    const question = questions.find(q => q._id === id);
    if (!question) return;

    currentEditId = id;
    const editForm = document.getElementById('editForm');
    editForm.innerHTML = `
        <div class="mb-3">
            <label class="form-label">Subject</label>
            <select class="form-select" name="subject" required>
                <option value="">Select Subject</option>
                <option value="Physics" ${question.subject === 'Physics' ? 'selected' : ''}>Physics</option>
                <option value="Chemistry" ${question.subject === 'Chemistry' ? 'selected' : ''}>Chemistry</option>
                <option value="Biology" ${question.subject === 'Biology' ? 'selected' : ''}>Biology</option>
                <option value="Earth & Space" ${question.subject === 'Earth & Space' ? 'selected' : ''}>Earth & Space</option>
                <option value="Energy" ${question.subject === 'Energy' ? 'selected' : ''}>Energy</option>
                <option value="Math" ${question.subject === 'Math' ? 'selected' : ''}>Math</option>
                <option value="General Science" ${question.subject === 'General Science' ? 'selected' : ''}>General Science</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Round Number</label>
            <input type="number" class="form-control" name="round" value="${question.round}" required min="1">
        </div>
        <div class="mb-3">
            <label class="form-label">Question Type</label>
            <select class="form-select" name="questionType" required>
                <option value="">Select Type</option>
                <option value="Multiple Choice" ${question.questionType === 'Multiple Choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="Short Answer" ${question.questionType === 'Short Answer' ? 'selected' : ''}>Short Answer</option>
                <option value="True/False" ${question.questionType === 'True/False' ? 'selected' : ''}>True/False</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Question</label>
            <textarea class="form-control" name="question" required>${question.question}</textarea>
        </div>
        <div class="mb-3">
            <label class="form-label">Answer</label>
            <input type="text" class="form-control" name="answer" value="${question.answer}" required>
        </div>
        <div class="mb-3" id="editChoicesContainer" style="display: ${question.questionType === 'Multiple Choice' ? 'block' : 'none'};">
            <label class="form-label">Choices</label>
            <div id="editChoicesList"></div>
            <button type="button" class="btn btn-secondary btn-sm mt-2" onclick="addEditChoice()">Add Choice</button>
        </div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
    `;

    if (question.questionType === 'Multiple Choice' && question.choices) {
        question.choices.forEach(choice => {
            addEditChoice(choice);
        });
    }

    editModal.show();
}

// Add a choice input field to the edit form
function addEditChoice(value = '') {
    const choicesList = document.getElementById('editChoicesList');
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'input-group mb-2';
    choiceDiv.innerHTML = `
        <input type="text" class="form-control edit-choice-input" value="${value}" placeholder="Enter choice" required>
        <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    choicesList.appendChild(choiceDiv);
}

// Save edited question
async function saveEdit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const questionData = {
        subject: formData.get('subject'),
        round: Number(formData.get('round')),
        questionType: formData.get('questionType'),
        question: formData.get('question'),
        answer: formData.get('answer'),
        choices: formData.get('questionType') === 'Multiple Choice' ? 
            Array.from(document.querySelectorAll('.edit-choice-input')).map(input => input.value) : 
            []
    };

    try {
        const response = await fetch(`/api/questions/${currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(questionData)
        });

        if (response.ok) {
            editModal.hide();
            loadQuestions();
        } else {
            throw new Error('Failed to update question');
        }
    } catch (error) {
        console.error('Error updating question:', error);
        alert('Error updating question. Please try again.');
    }
}

// Delete a question
async function deleteQuestion(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
        const response = await fetch(`/api/questions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadQuestions();
        } else {
            throw new Error('Failed to delete question');
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('Error deleting question. Please try again.');
    }
}

// Handle reset
async function handleReset(e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to reset all questions? This cannot be undone.')) return;

    try {
        const response = await fetch('/api/reset-questions', {
            method: 'POST'
        });

        if (response.ok) {
            loadQuestions();
        } else {
            throw new Error('Failed to reset questions');
        }
    } catch (error) {
        console.error('Error resetting questions:', error);
        alert('Error resetting questions. Please try again.');
    }
} 