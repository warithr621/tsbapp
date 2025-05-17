function pwcheck() {
    const password = document.getElementById('passwordInput').value;
    const correctPassword = "really simple password";
    
    if (password === correctPassword) {
        window.location.href = '../home/index.html';
    } else {
        alert("Password is incorrect!");
    }
}

document.getElementById('checkPassword').addEventListener('click', pwcheck);