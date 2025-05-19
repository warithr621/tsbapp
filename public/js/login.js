function pwcheck() {
    const password = document.getElementById('passwordInput').value;
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = '../home/index.html';
        } else {
            alert('Password is incorrect!');
        }
    })
    .catch(() => alert('Login failed.'));
}

document.getElementById('checkPassword').addEventListener('click', pwcheck);