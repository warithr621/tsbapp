const express = require('express');
const Question = require('../models/question');

const router = express.Router();

router.get('/questions', async (req, res) => {
	try {
		const questions = await Question.find().sort({ round: 1, subject: 1 });
		res.json(questions);
	} catch (error) {
		console.error('Error fetching questions:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.post('/questions', async (req, res) => {
	try {
		const question = new Question(req.body);
		await question.save();
		res.json({ success: true, question });
	} catch (error) {
		console.error('Error saving question:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.get('/questions/:id', async (req, res) => {
	try {
		const question = await Question.findById(req.params.id);
		if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
		res.json(question);
	} catch (error) {
		console.error('Error fetching question:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.put('/questions/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const updateData = req.body;

		const questionToUpdate = await Question.findById(id);
		if (!questionToUpdate) {
			return res.status(404).json({ success: false, message: 'Question not found' });
		}

		// If the target slot is already occupied by a different question, swap them
		const occupant = await Question.findOne({
			_id: { $ne: id },
			subject: updateData.subject,
			round: updateData.round,
			questionRole: updateData.questionRole,
			questionNumber: updateData.questionNumber
		});

		if (occupant) {
			occupant.subject        = questionToUpdate.subject;
			occupant.round          = questionToUpdate.round;
			occupant.questionRole   = questionToUpdate.questionRole;
			occupant.questionNumber = questionToUpdate.questionNumber;
			await occupant.save();
		}

		const updated = await Question.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
		res.json({ success: true, question: updated });
	} catch (error) {
		console.error('Error updating question:', error);
		res.status(500).json({ success: false, message: 'Error updating question' });
	}
});

router.delete('/questions/:id', async (req, res) => {
	try {
		const question = await Question.findByIdAndDelete(req.params.id);
		if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting question:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.post('/reset-questions', async (req, res) => {
	const { resetKey } = req.body;
	if (resetKey !== (process.env.RESET_KEY || 'default_reset_key')) {
		return res.json({ success: false, error: 'Invalid reset key' });
	}
	try {
		await Question.deleteMany({});
		res.json({ success: true });
	} catch (error) {
		console.error('Error resetting questions:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

module.exports = router;
