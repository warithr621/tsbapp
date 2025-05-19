document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the form submit
    const form = document.querySelector('form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        showQuestions();
    });
});

function showQuestions() {
    // Get display type and value
    const displayType = document.getElementById('type').value;
    let value;
    if (displayType === 'subj') {
        value = document.querySelector('#subject-container select').value;
    } else {
        value = document.querySelector('#round-container select').value;
    }

    // Map form values to backend values
    const subjectMap = {
        biology: 'Biology',
        chemistry: 'Chemistry',
        physics: 'Physics',
        earth_space: 'Earth Science',
        math: 'Math'
    };
    const roundMap = {
        rr1: 1, rr2: 2, rr3: 3, rr4: 4, rr5: 5,
        de1: 6, de2: 7, de3: 8, de4: 9, de5: 10, de6: 11, de7: 12,
        f1: 13, f2: 14
    };

    fetch('/api/questions')
        .then(response => response.json())
        .then(questions => {
            let filtered = [];
            if (displayType === 'subj') {
                const subject = subjectMap[value];
                filtered = questions.filter(q => q.subject === subject);
                filtered.sort((a, b) => a.round - b.round);
            } else {
                const round = roundMap[value];
                filtered = questions.filter(q => q.round === round);
                filtered.sort((a, b) => a.subject.localeCompare(b.subject));
            }
            renderQuestions(filtered);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to fetch questions.');
        });
}

// Helper to render mixed text and LaTeX (same as upload.js)
function renderLatexSegments(input) {
    if (!input) return '';
    const regex = /(\$[^$]+\$|\\\([^\\)]+\\\))/g;
    let lastIndex = 0;
    let result = '';
    let match;
    while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
            result += escapeHtml(input.slice(lastIndex, match.index));
        }
        let tex = match[0];
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
    if (lastIndex < input.length) {
        result += escapeHtml(input.slice(lastIndex));
    }
    return result;
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

function renderQuestions(questions) {
    let container = document.getElementById('questionsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'questionsContainer';
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    if (questions.length === 0) {
        container.innerHTML = '<p>No questions found.</p>';
        return;
    }
    // Map round number to full round name
    const roundNameMap = {
        1: 'Round Robin 1', 2: 'Round Robin 2', 3: 'Round Robin 3', 4: 'Round Robin 4', 5: 'Round Robin 5',
        6: 'Double Elim 1', 7: 'Double Elim 2', 8: 'Double Elim 3', 9: 'Double Elim 4', 10: 'Double Elim 5', 11: 'Double Elim 6', 12: 'Double Elim 7',
        13: 'Finals 1', 14: 'Finals 2'
    };
    questions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-card';
        let choicesHtml = '';
        const type = q.questionType || 'Multiple Choice';
        const role = q.questionRole || 'Tossup';
        if (Array.isArray(q.choices) && q.choices.length > 0) {
            if (type === 'Multiple Choice') {
                const labels = ['W', 'X', 'Y', 'Z'];
                choicesHtml = `<div><strong>Choices / Options:</strong><br>${q.choices.map((c, i) => `${labels[i]}) <span class='latex-choice'>${renderLatexSegments(c)}</span>`).join('<br>')}</div>`;
            } else if (type === 'Short Answer') {
                choicesHtml = `<div><strong>Choices / Options:</strong><br>${q.choices.map((c, i) => `${i+1}) <span class='latex-choice'>${renderLatexSegments(c)}</span>`).join('<br>')}</div>`;
            }
        } else if (typeof q.choices === 'string' && q.choices.trim() !== '') {
            choicesHtml = `<div><strong>Choices / Options:</strong><br><span class='latex-choice'>${renderLatexSegments(q.choices)}</span></div>`;
        }
        div.innerHTML = `
            <div><strong>Subject:</strong> ${q.subject} (${role}) | <strong>Round:</strong> ${roundNameMap[q.round] || q.round}</div>
            <div><strong>Question Type:</strong> ${type}</div>
            <div><strong>Question:</strong> <span class='latex-question'>${renderLatexSegments(q.question)}</span></div>
            ${choicesHtml}
            <div><strong>Answer:</strong> <span class='latex-answer'>${renderLatexSegments(q.answer)}</span></div>
            <hr>
        `;
        container.appendChild(div);
    });
}

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
            <p class="question-text">${renderLatexSegments(question.question)}</p>
            <p class="answer">Answer: ${renderLatexSegments(question.answer)}</p>
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