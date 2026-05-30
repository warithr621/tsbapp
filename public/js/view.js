// SUBJECTS is provided as a global by /js/rounds.js, loaded before this script in view.html

const DEFAULT_COUNT = 4;
const selectedCounts = {};
for (const s of SUBJECTS) selectedCounts[s] = DEFAULT_COUNT;

let shuffledOrder = null;
let pollInterval = null;

function readCounts() {
	return { ...selectedCounts };
}

const BTN_UNSELECTED = 'bg-burnt-light text-white hover:bg-burnt';
const BTN_SELECTED   = 'bg-burnt-dark text-white';
const BTN_BASE       = 'w-8 h-8 rounded text-sm font-semibold transition-colors duration-150';

function buildCountGrid() {
	const grid = document.getElementById('subjectCountsGrid');
	for (const subject of SUBJECTS) {
		const row = document.createElement('div');
		row.className = 'flex items-center justify-between';

		const label = document.createElement('span');
		label.className = 'text-sm font-medium text-gray-700';
		label.textContent = subject;
		row.appendChild(label);

		const btnGroup = document.createElement('div');
		btnGroup.className = 'flex gap-1';

		for (let v = 0; v <= 5; v++) {
			const btn = document.createElement('button');
			btn.textContent = v;
			btn.dataset.value = v;
			const isSelected = v === DEFAULT_COUNT;
			btn.className = `${BTN_BASE} ${isSelected ? BTN_SELECTED : BTN_UNSELECTED}`;
			btn.addEventListener('click', () => {
				selectedCounts[subject] = v;
				btnGroup.querySelectorAll('button').forEach(b => {
					const selected = parseInt(b.dataset.value) === v;
					b.className = `${BTN_BASE} ${selected ? BTN_SELECTED : BTN_UNSELECTED}`;
				});
			});
			btnGroup.appendChild(btn);
		}

		row.appendChild(btnGroup);
		grid.appendChild(row);
	}
}

function fisherYates(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function shuffleSubjects(counts) {
	const active = SUBJECTS.filter(s => counts[s] > 0);
	if (active.length <= 1) return active;

	fisherYates(active);

	const countValues = active.map(s => counts[s]);
	const minCount = Math.min(...countValues);
	const maxCount = Math.max(...countValues);

	if (maxCount > minCount) {
		const extraSubjects = new Set(active.filter(s => counts[s] === maxCount));
		const last = active.length - 1;

		if (extraSubjects.has(active[last])) {
			const swapCandidates = [];
			for (let i = 0; i < last; i++) {
				if (!extraSubjects.has(active[i])) swapCandidates.push(i);
			}
			if (swapCandidates.length > 0) {
				const swapPos = swapCandidates[Math.floor(Math.random() * swapCandidates.length)];
				[active[last], active[swapPos]] = [active[swapPos], active[last]];
			}
		}
	}

	return active;
}

function updateWriterInputs(counts) {
	const container = document.getElementById('writerInputs');
	// Preserve values entered before a re-roll
	const existing = {};
	container.querySelectorAll('input').forEach(inp => {
		existing[inp.dataset.subject] = inp.value;
	});
	container.innerHTML = '';

	// Two-column grid: fixed label column | input column
	container.style.cssText = 'display:grid;grid-template-columns:8rem 1fr;row-gap:0.5rem;column-gap:0.75rem;align-items:center;';

	for (const subject of SUBJECTS) {
		if (!counts[subject] || counts[subject] === 0) continue;

		const label = document.createElement('label');
		label.className = 'text-sm font-semibold text-gray-700';
		label.textContent = subject;

		const input = document.createElement('input');
		input.type = 'text';
		input.dataset.subject = subject;
		input.style.cssText = 'width:100%;border:2px solid #B25D22;border-radius:0;padding:0.375rem 0.625rem;font-size:0.875rem;outline:none;';
		input.placeholder = '';
		input.value = existing[subject] || '';
		input.addEventListener('focus', () => { input.style.boxShadow = '0 0 0 3px rgba(178,93,34,0.15)'; });
		input.addEventListener('blur',  () => { input.style.boxShadow = ''; });

		container.appendChild(label);
		container.appendChild(input);
	}
}

function spinnerHtml() {
	return `<div class="flex items-center gap-2 text-sm text-gray-500 py-1" style="margin-top:0.75rem;">
		<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-burnt flex-shrink-0"></div>
		<span>Compiling PDF…</span>
	</div>`;
}

function pdfButtonHtml(href) {
	return `<a href="${href}" style="display:flex;align-items:center;justify-content:center;width:100%;height:2.75rem;background-color:#B25D22;color:#fff;border-radius:0.5rem;font-weight:500;text-decoration:none;margin-top:0.75rem;">
		Download PDF
	</a>`;
}

function pdfErrorHtml() {
	return `<div class="flex items-center gap-2 text-sm text-red-600 py-1" style="margin-top:0.75rem;">
		<span>⚠️</span>
		<span>Compilation failed — see errors below</span>
	</div>`;
}

function updatePdfArea(areaId, statusObj, pdfHref) {
	if (!statusObj || statusObj.status === 'pending') return;
	const area = document.getElementById(areaId);
	if (statusObj.status === 'success') {
		area.innerHTML = pdfButtonHtml(pdfHref);
	} else if (statusObj.status === 'error') {
		area.innerHTML = pdfErrorHtml();
	}
}

function startPolling(round, hasReplacements) {
	if (pollInterval) clearInterval(pollInterval);

	pollInterval = setInterval(async () => {
		try {
			const res = await fetch(`/api/pdf-status/${round}`);
			const status = await res.json();

			updatePdfArea('roundPdfArea', status.round, `/generated/${round}.pdf`);
			if (hasReplacements) {
				updatePdfArea('replacementsPdfArea', status.replacements, `/generated/${round}-replacements.pdf`);
			}

			// Collect any errors and display them
			const allErrors = [
				...(status.round?.errors || []),
				...(hasReplacements ? (status.replacements?.errors || []) : []),
			];
			if (allErrors.length > 0) {
				const errDiv = document.getElementById('pdfErrors');
				errDiv.classList.remove('hidden');
				errDiv.innerHTML = '<strong>Compilation Errors:</strong><ul class="mt-2 space-y-1 list-disc list-inside">' +
					allErrors.map(e =>
						`<li>${e.question ? `<strong>${escapeHtml(e.question)}:</strong> ` : ''}${escapeHtml(e.error)}</li>`
					).join('') +
					'</ul>';
			}

			// Stop when both are done
			const roundDone = status.round?.status !== 'pending';
			const repDone = !hasReplacements || status.replacements?.status !== 'pending';
			if (roundDone && repDone) {
				clearInterval(pollInterval);
				pollInterval = null;
			}
		} catch {
			// ignore transient poll errors
		}
	}, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
	buildCountGrid();

	const shuffleBtn          = document.getElementById('shuffleBtn');
	const shuffleResult       = document.getElementById('shuffleResult');
	const shuffleOrderDisplay = document.getElementById('shuffleOrderDisplay');
	const rerollBtn           = document.getElementById('rerollBtn');
	const generateBtn         = document.getElementById('generateBtn');
	const outputButtons       = document.getElementById('outputButtons');
	const downloadRoundTexBtn        = document.getElementById('downloadRoundTexBtn');
	const downloadReplacementsTexBtn = document.getElementById('downloadReplacementsTexBtn');

	function runShuffle() {
		const counts = readCounts();
		const active = SUBJECTS.filter(s => counts[s] > 0);
		if (active.length === 0) {
			alert('Please set at least one subject count above 0.');
			return;
		}
		shuffledOrder = shuffleSubjects(counts);
		shuffleOrderDisplay.textContent = shuffledOrder.join(' → ');
		shuffleResult.classList.remove('hidden');
		outputButtons.classList.add('hidden');
		if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
		updateWriterInputs(counts);
	}

	shuffleBtn.addEventListener('click', runShuffle);
	rerollBtn.addEventListener('click', runShuffle);

	generateBtn.addEventListener('click', async () => {
		if (!shuffledOrder) return;
		const round = document.getElementById('round').value;
		const counts = readCounts();
		outputButtons.classList.add('hidden');
		document.getElementById('pdfErrors').classList.add('hidden');
		if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

		// Collect writers
		const writers = {};
		document.querySelectorAll('#writerInputs input').forEach(inp => {
			if (inp.value.trim()) writers[inp.dataset.subject] = inp.value.trim();
		});

		try {
			const response = await fetch('/api/generate-latex', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ round, counts, subjectOrder: shuffledOrder, writers })
			});

			const data = await response.json();
			if (!response.ok) {
				alert(`Error generating LaTeX: ${data.error || 'Unknown error'}`);
				return;
			}

			// Show output section — .tex downloads are available immediately
			outputButtons.classList.remove('hidden');
			downloadRoundTexBtn.onclick = () => { window.location.href = `/generated/${round}.tex`; };

			if (data.hasReplacements) {
				downloadReplacementsTexBtn.style.display = '';
				downloadReplacementsTexBtn.onclick = () => { window.location.href = `/generated/${round}-replacements.tex`; };
			} else {
				downloadReplacementsTexBtn.style.display = 'none';
			}

			// Show spinners while PDFs compile
			document.getElementById('roundPdfArea').innerHTML = spinnerHtml();
			document.getElementById('replacementsPdfArea').innerHTML = data.hasReplacements
				? spinnerHtml()
				: '<p class="text-sm text-gray-400 py-1">No replacements for this round</p>';

			startPolling(round, data.hasReplacements);
		} catch (error) {
			alert(`Error generating LaTeX: ${error.message}`);
		}
	});
});
