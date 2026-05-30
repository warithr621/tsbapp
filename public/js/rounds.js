const ROUNDS = [
	{ id: 'rr1', name: 'Round Robin 1',        num: 1  },
	{ id: 'rr2', name: 'Round Robin 2',        num: 2  },
	{ id: 'rr3', name: 'Round Robin 3',        num: 3  },
	{ id: 'rr4', name: 'Round Robin 4',        num: 4  },
	{ id: 'rr5', name: 'Round Robin 5',        num: 5  },
	{ id: 'de1', name: 'Double Elimination 1', num: 6  },
	{ id: 'de2', name: 'Double Elimination 2', num: 7  },
	{ id: 'de3', name: 'Double Elimination 3', num: 8  },
	{ id: 'de4', name: 'Double Elimination 4', num: 9  },
	{ id: 'de5', name: 'Double Elimination 5', num: 10 },
	{ id: 'de6', name: 'Double Elimination 6', num: 11 },
	{ id: 'de7', name: 'Double Elimination 7', num: 12 },
	{ id: 'f1',  name: 'Finals 1',             num: 13 },
	{ id: 'f2',  name: 'Finals 2',             num: 14 },
];

const ROUND_MAP         = Object.fromEntries(ROUNDS.map(r => [r.id,  r.num]));
const ROUND_MAP_REVERSE = Object.fromEntries(ROUNDS.map(r => [r.num, r.id]));

const SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'Earth & Space', 'Math', 'Energy'];
