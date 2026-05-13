const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
	subject: {
		type: String,
		required: true,
		// Energy and General Science are included even though TSB does not use them
		enum: ['Physics', 'Chemistry', 'Biology', 'Earth & Space', 'Energy', 'Math', 'General Science']
	},
	round: {
		type: Number,
		required: true,
		min: 1
	},
	questionType: {
		type: String,
		required: true,
		enum: ['Multiple Choice', 'Short Answer']
	},
	question: {
		type: String,
		required: true
	},
	answer: {
		type: String,
		required: true
	},
	choices: [{ type: String }],
	questionRole: {
		type: String,
		enum: ['Tossup', 'Bonus'],
		required: true,
		default: 'Tossup'
	},
	questionNumber: {
		type: Number,
		required: true,
		min: 1,
		max: 6,  // 6 = replacement question
		default: 1
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
