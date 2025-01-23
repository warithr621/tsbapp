function handleButtonClick(event) {
    const buttonId = event.target.id;

    if (buttonId === 'uploadQuestion') {
        window.location.href = 'upload.html';
    } else if (buttonId === 'viewQuestions') {
        window.location.href = 'view.html';
    } else if (buttonId === 'resetQuestions') {
        const password = prompt("Please enter the password to reset questions:");
        const correctPassword = "really simple password";
        
        if (password === correctPassword) {
            alert("Questions have been reset!");
            // Add logic to reset questions here
        } else {
            alert("Password is incorrect!");
        }
    }
}

document.getElementById('uploadQuestion').addEventListener('click', handleButtonClick);
document.getElementById('viewQuestions').addEventListener('click', handleButtonClick);
document.getElementById('resetQuestions').addEventListener('click', handleButtonClick);