document.addEventListener('DOMContentLoaded', () => {
    const questionTypeSelect = document.getElementById('questionType');
    const choicesTextarea = document.getElementById('choices');

    function handleQuestionTypeChange() {
        if (questionTypeSelect.value === 'shortAnswer') {
            choicesTextarea.disabled = true;
        } else {
            choicesTextarea.disabled = false;
        }
    }

    handleQuestionTypeChange();
    questionTypeSelect.addEventListener('change', handleQuestionTypeChange);
});

const elements = [
    { area: 'question', preview: 'previewQ' },
    { area: 'choices', preview: 'previewC' },
    { area: 'answer', preview: 'previewA' }
];

elements.forEach(({ area, preview }) => {
    const areaElement = document.getElementById(area);
    const previewElement = document.getElementById(preview);

    areaElement.addEventListener('input', () => {
        const txt = areaElement.value;
        const sanitizedTxt = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        previewElement.innerHTML = sanitizedTxt;
        renderMathInElement(previewElement, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\(", right: "\\)", display: false },
                { left: "$", right: "$", display: false }
            ]
        });
    });
});

function sendQuestion() {
    const question = document.getElementById('question').value;
    const choices = document.getElementById('choices').value;
    const answer = document.getElementById('answer').value;
    const questionType = document.getElementById('questionType').value;
    const round = document.getElementById('round').value;

    if (!question || !answer) {
        alert('Question and answer are required!');
        return;
    }

    if (questionType === 'multipleChoice' && !choices) {
        alert('Choices are required for multiple choice questions!');
        return;
    }

    const sanitizedQuestion = question.replace(/\[/g, '*').replace(/\]/g, '*');
    const sanitizedChoices = choices.replace(/\[/g, '*').replace(/\]/g, '*');
    const sanitizedAnswer = answer.replace(/\[/g, '*').replace(/\]/g, '*');

    const data = `
# ${sanitizedQuestion}

${sanitizedChoices ? '\nChoices:\n' + sanitizedChoices.split('\n').map(choice => `- ${choice}`).join('\n') : ''}

Answer: ${sanitizedAnswer}

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`;

    // now how in the world do you export this? this is a future issue once we get backend
}