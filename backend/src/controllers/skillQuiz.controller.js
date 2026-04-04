/**
 * Skill quiz endpoints.
 */

const quizService = require('../services/skillQuiz.service');

function getStudentId(req) {
  if (String(req.user?.role ?? '').toLowerCase() !== 'student') return null;
  const id = req.user?.UserID ?? req.user?.userId ?? req.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

async function getQuiz(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ success: false, error: 'Student only' });

    const skillId = Number(req.query.skillId);
    if (!Number.isFinite(skillId) || skillId < 1) {
      return res.status(400).json({ success: false, error: 'skillId query is required' });
    }

    const { questions, totalPossible } = await quizService.fetchQuizQuestions(skillId, 5);

    if (!questions.length) {
      return res.status(404).json({ success: false, error: 'No quiz questions for this skill yet.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        skillId,
        totalPossible,
        questions: questions.map((q) => ({
          questionId: q.questionId,
          questionText: q.questionText,
          options: q.options.map((o) => ({
            optionKey: o.optionKey,
            optionText: o.optionText,
          })),
        })),
      },
    });
  } catch (err) {
    console.error('skillQuiz.getQuiz', err);
    res.status(500).json({ success: false, error: 'Failed to load quiz' });
  }
}

async function getPassed(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ success: false, error: 'Student only' });

    const skillId = Number(req.query.skillId);
    if (!Number.isFinite(skillId) || skillId < 1) {
      return res.status(400).json({ success: false, error: 'skillId query is required' });
    }
    const passed = await quizService.hasPassed(studentId, skillId);
    res.status(200).json({ success: true, data: { passed } });
  } catch (err) {
    console.error('skillQuiz.getPassed', err);
    res.status(500).json({ success: false, error: 'Failed to check quiz status' });
  }
}

async function submit(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ success: false, error: 'Student only' });

    const skillId = Number(req.body?.skillId);
    const answers = req.body?.answers;

    if (!Number.isFinite(skillId) || skillId < 1) {
      return res.status(400).json({ success: false, error: 'skillId is required' });
    }
    if (!Array.isArray(answers) || answers.length < 1) {
      return res.status(400).json({ success: false, error: 'answers is required' });
    }

    const result = await quizService.gradeAndStore({
      studentId,
      skillId,
      answers,
    });

    if (result.passed) {
      return res.status(200).json({
        success: true,
        data: { passed: true, score: result.score, totalPossible: result.totalPossible, evaluationId: result.evaluationId },
      });
    }

    return res.status(200).json({
      success: true,
      data: { passed: false, score: result.score, totalPossible: result.totalPossible, evaluationId: result.evaluationId },
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_QUESTIONS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'MISSING_ANSWERS' || err.code === 'INVALID_OPTION') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('skillQuiz.submit', err);
    res.status(500).json({ success: false, error: 'Quiz submission failed' });
  }
}

module.exports = { getQuiz, getPassed, submit };

