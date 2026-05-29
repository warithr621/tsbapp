const SUBJECTS = ['Biology', 'Chemistry', 'Math', 'Physics', 'Earth & Space', 'Energy'];

const DEFAULT_COUNT = 4;
const selectedCounts = {};
for (const s of SUBJECTS) selectedCounts[s] = DEFAULT_COUNT;

let shuffledOrder = null;

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
	}

	shuffleBtn.addEventListener('click', runShuffle);
	rerollBtn.addEventListener('click', runShuffle);

	generateBtn.addEventListener('click', async () => {
		if (!shuffledOrder) return;
		const round = document.getElementById('round').value;
		const counts = readCounts();
		outputButtons.classList.add('hidden');

		try {
			const response = await fetch('/api/generate-latex', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ round, counts, subjectOrder: shuffledOrder })
			});

			const data = await response.json();
			if (response.ok) {
				outputButtons.classList.remove('hidden');
				downloadRoundTexBtn.onclick = () => {
					window.location.href = `/generated/${round}.tex`;
				};
				downloadReplacementsTexBtn.onclick = () => {
					window.location.href = `/generated/${round}-replacements.tex`;
				};
			} else {
				alert(`Error generating LaTeX file: ${data.error || 'Unknown error'}`);
			}
		} catch (error) {
			alert(`Error generating LaTeX file: ${error.message}`);
		}
	});
});
