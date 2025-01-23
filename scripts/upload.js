document.addEventListener('DOMContentLoaded', () => {
    const questionTypeSelect = document.getElementById('questionType');
    const choiceBlanksDiv = document.getElementById('choiceBlanks');
    const shortTypeSelect = document.getElementById('shortType');
    const shortBlanksDiv = document.getElementById('shortOptions');
    const optionBlanksDiv = document.getElementById('optionBlanks');

    function handleQuestionTypeChange() {
        const isShortAnswer = questionTypeSelect.value === 'shortAnswer';
        choiceBlanksDiv.style.display = isShortAnswer ? 'none' : 'block';
        shortBlanksDiv.style.display = isShortAnswer ? 'block' : 'none';
        optionBlanksDiv.style.display = (isShortAnswer && shortTypeSelect.value === 'Yes') ? 'block' : 'none';
    }

    handleQuestionTypeChange();
    questionTypeSelect.addEventListener('change', handleQuestionTypeChange);
    shortTypeSelect.addEventListener('change', handleQuestionTypeChange);
});

const elements = [
    { area: 'question', preview: 'previewQ' },
    { area: 'choiceW', preview: 'previewW' },
    { area: 'choiceX', preview: 'previewX' },
    { area: 'choiceY', preview: 'previewY' },
    { area: 'choiceZ', preview: 'previewZ' },
    { area: 'choice1', preview: 'preview1' },
    { area: 'choice2', preview: 'preview2' },
    { area: 'choice3', preview: 'preview3' },
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

    // now how in the world do you export this? this is a future issue once we get backend
}