// Function to generate LaTeX
async function generateLatex(round) {
    try {
        showLoading('Generating LaTeX file...');
        const response = await fetch('/api/generate-latex', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ round })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate LaTeX');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to generate LaTeX');
        }
        
        hideLoading();
        showSuccess('LaTeX file generated successfully!');
        
        // Show download/view buttons
        const buttonsDiv = document.getElementById('latexButtons');
        buttonsDiv.innerHTML = `
            <button onclick="viewLatex('${round}')" class="btn btn-primary">View LaTeX</button>
            <button onclick="downloadLatex('${round}')" class="btn btn-success">Download LaTeX</button>
            <button onclick="viewPDF('${round}')" class="btn btn-info">View PDF</button>
            <button onclick="downloadPDF('${round}')" class="btn btn-warning">Download PDF</button>
        `;
    } catch (error) {
        hideLoading();
        showError(error.message);
        console.error('Error generating LaTeX:', error);
    }
}

// Function to show loading message
function showLoading(message) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-spinner fa-spin"></i> ${message}
        </div>
    `;
    loadingDiv.style.display = 'block';
}

// Function to hide loading message
function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'none';
}

// Function to show success message
function showSuccess(message) {
    const alertDiv = document.getElementById('alert');
    alertDiv.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> ${message}
        </div>
    `;
    alertDiv.style.display = 'block';
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Function to show error message
function showError(message) {
    const alertDiv = document.getElementById('alert');
    alertDiv.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </div>
    `;
    alertDiv.style.display = 'block';
} 