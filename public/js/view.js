document.addEventListener('DOMContentLoaded', () => {
    const roundForm = document.getElementById('roundForm');
    const outputButtons = document.getElementById('outputButtons');
    const viewPdfBtn = document.getElementById('viewPdfBtn');
    const downloadTexBtn = document.getElementById('downloadTexBtn');

    if (roundForm) {
        roundForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const round = document.getElementById('round').value;
            console.log('Submitting round:', round);
            
            // Only hide output buttons, no loading spinner
            outputButtons.classList.add('hidden');
            
            try {
                console.log('Sending request to generate LaTeX...');
                const response = await fetch('/api/generate-latex', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ round })
                });
                
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
                
                if (response.ok) {
                    outputButtons.classList.remove('hidden');
                    
                    // Set up the buttons
                    viewPdfBtn.onclick = () => {
                        window.open(`/generated/${round}.pdf`, '_blank');
                    };
                    
                    downloadTexBtn.onclick = () => {
                        window.location.href = `/generated/${round}.tex`;
                    };
                } else {
                    outputButtons.classList.add('hidden');
                    alert(`Error generating LaTeX file: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
                outputButtons.classList.add('hidden');
                console.error('Error:', error);
                alert(`Error generating LaTeX file: ${error.message}`);
            }
        });
    }
}); 