/**
 * Skill quiz: fetch MCQs + grade answers and store SkillEvaluation + EvaluationAnswer.
 */

const { getPool } = require('./db');
const { withTransaction } = require('./transactions');

const PASS_CORRECT_COUNT = 3; // min 3 correct answers

function groupQuizRows(rows) {
  const byQuestion = new Map();
  for (const r of rows) {
    const qid = Number(r.QuestionID);
    if (!byQuestion.has(qid)) {
      byQuestion.set(qid, {
        questionId: qid,
        questionText: r.QuestionText,
        points: Number(r.Points ?? 1),
        options: [],
      });
    }
    byQuestion.get(qid).options.push({
      optionKey: String(r.OptionKey),
      optionText: r.OptionText,
      isCorrect: Boolean(Number(r.IsCorrect)),
    });
  }
  return Array.from(byQuestion.values());
}

async function fetchQuizQuestions(skillId, maxQuestions = 5) {
  const [rows] = await getPool().query(
    `SELECT q.QuestionID, q.QuestionText, q.Points,
            opt.OptionKey, opt.OptionText, opt.IsCorrect
     FROM SkillQuestion q
     JOIN QuestionOption opt ON opt.QuestionID = q.QuestionID
     WHERE q.SkillID = ?
     ORDER BY q.QuestionID, opt.OptionKey`,
    [skillId]
  );

  const all = groupQuizRows(rows);
  const limited = all.slice(0, maxQuestions);

  return {
    questions: limited,
    totalPossible: limited.length,
  };
}

async function hasPassed(studentId, skillId) {
  // Pass criteria: graded evaluation with score >= 3 and totalPossible >= 3
  const [rows] = await getPool().query(
    `SELECT Score, TotalPossible
     FROM SkillEvaluation
     WHERE StudentID = ? AND SkillID = ? AND Status = 'graded'
     ORDER BY SubmittedAt DESC
     LIMIT 1`,
    [studentId, skillId]
  );
  const row = rows[0];
  if (!row) return false;
  const score = Number(row.Score ?? 0);
  const total = Number(row.TotalPossible ?? 0);
  return Number.isFinite(score) && Number.isFinite(total) && total >= PASS_CORRECT_COUNT && score >= PASS_CORRECT_COUNT;
}

async function gradeAndStore({ studentId, skillId, answers }) {
  const parsedAnswers = Array.isArray(answers) ? answers : [];

  return withTransaction(async (conn) => {
    const [skillRows] = await conn.query('SELECT SkillID FROM Skill WHERE SkillID = ?', [skillId]);
    if (!skillRows || skillRows.length === 0) {
      const err = new Error('Skill not found.');
      err.code = 'SKILL_NOT_FOUND';
      throw err;
    }

    // Load quiz question set (up to 5)
    const quiz = await (async () => {
      const [rows] = await conn.query(
        `SELECT q.QuestionID, q.QuestionText, q.Points,
                opt.OptionKey, opt.OptionText, opt.IsCorrect
         FROM SkillQuestion q
         JOIN QuestionOption opt ON opt.QuestionID = q.QuestionID
         WHERE q.SkillID = ?
         ORDER BY q.QuestionID, opt.OptionKey`,
        [skillId]
      );
      const all = groupQuizRows(rows);
      return { questions: all.slice(0, 5), totalPossible: all.slice(0, 5).length };
    })();

    if (quiz.totalPossible < PASS_CORRECT_COUNT) {
      const err = new Error('Not enough questions for this skill yet. Contact admin.');
      err.code = 'INSUFFICIENT_QUESTIONS';
      throw err;
    }

    const answersByQuestionId = new Map();
    for (const a of parsedAnswers) {
      const qid = Number(a?.questionId);
      const optionKey = a?.selectedOptionKey != null ? String(a.selectedOptionKey) : null;
      if (!Number.isFinite(qid) || !optionKey) continue;
      answersByQuestionId.set(qid, optionKey);
    }

    // Compute correctCount + store submitted evaluation
    let correctCount = 0;
    const evaluationAnswers = [];

    for (const q of quiz.questions) {
      const selected = answersByQuestionId.get(q.questionId);
      if (!selected) {
        const err = new Error('All questions must be answered.');
        err.code = 'MISSING_ANSWERS';
        throw err;
      }

      const chosenOption = q.options.find((o) => o.optionKey === selected);
      if (!chosenOption) {
        const err = new Error('Invalid option selection.');
        err.code = 'INVALID_OPTION';
        throw err;
      }

      if (chosenOption.isCorrect) correctCount += 1;

      evaluationAnswers.push({
        questionId: q.questionId,
        studentAnswer: selected,
      });
    }

    const [evalResult] = await conn.query(
      `INSERT INTO SkillEvaluation (StudentID, SkillID, AdminID, StartedAt, SubmittedAt, Score, TotalPossible, Status)
       VALUES (?, ?, NULL, NOW(), NOW(), ?, ?, 'graded')`,
      [studentId, skillId, correctCount, quiz.totalPossible]
    );
    const evaluationId = evalResult.insertId;

    for (const ans of evaluationAnswers) {
      await conn.query(
        'INSERT INTO EvaluationAnswer (EvaluationID, QuestionID, StudentAnswer) VALUES (?, ?, ?)',
        [evaluationId, ans.questionId, ans.studentAnswer]
      );
    }

    return {
      evaluationId: Number(evaluationId),
      passed: correctCount >= PASS_CORRECT_COUNT,
      score: correctCount,
      totalPossible: quiz.totalPossible,
    };
  });
}

module.exports = {
  fetchQuizQuestions,
  hasPassed,
  gradeAndStore,
  PASS_CORRECT_COUNT,
};

