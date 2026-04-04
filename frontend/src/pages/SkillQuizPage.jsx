import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

function parseSkillId(skillId) {
  const n = Number(skillId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function SkillQuizPage() {
  const { skillId: skillIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const skillId = useMemo(() => parseSkillId(skillIdParam), [skillIdParam]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [totalPossible, setTotalPossible] = useState(0);

  const [answers, setAnswers] = useState({}); // { [questionId]: optionKey }
  const [submitting, setSubmitting] = useState(false);

  const [resultMsg, setResultMsg] = useState('');
  const [passed, setPassed] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const intent = query.get('from') ?? '';
  const intentIsPaid = query.get('isPaid');
  const intentPricePerHour = query.get('pricePerHour');

  async function loadQuiz() {
    if (!skillId) {
      setError('Invalid skill id.');
      setQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setResultMsg('');
    setPassed(null);

    try {
      const res = await api(`/api/v1/skill-quiz?skillId=${skillId}`);
      const data = res?.data ?? {};
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setTotalPossible(Number(data.totalPossible ?? 0));
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load quiz'));
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillIdParam]);

  const allAnswered = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q) => answers[String(q.questionId)] != null);
  }, [questions, answers]);

  async function handleSubmit(e) {
    e.preventDefault();
    setResultMsg('');
    setPassed(null);
    setError('');

    if (!skillId) {
      setError('Invalid skill id.');
      return;
    }
    if (!allAnswered) {
      setError('Answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionKey: answers[String(q.questionId)],
      }));
      const res = await api('/api/v1/skill-quiz/submit', {
        method: 'POST',
        body: { skillId, answers: payloadAnswers },
      });
      const data = res?.data ?? {};
      setPassed(Boolean(data.passed));
      if (data.passed) {
        setResultMsg(`Passed! Score: ${data.score}/${data.totalPossible}.`);

        // If quiz was launched because the student wanted to "offer" this skill,
        // auto-create the offer once they pass.
        if (intent === 'offer-create') {
          setAutoSaving(true);
          try {
            const isPaid = intentIsPaid === '1' || intentIsPaid === 'true';
            const createBody = { skillId, isPaid };
            if (isPaid) {
              const p = Number(intentPricePerHour);
              if (Number.isFinite(p)) createBody.pricePerHour = p;
            }
            await api('/api/v1/offered-skills', { method: 'POST', body: createBody });
            navigate('/student/offered-skills');
            return;
          } catch (e2) {
            setError(getUserFacingMessage(e2, 'Could not create offer after quiz pass'));
          } finally {
            setAutoSaving(false);
          }
        }
      } else {
        setResultMsg(`Not passed. Score: ${data.score}/${data.totalPossible}. Try again.`);
      }
    } catch (e2) {
      setError(getUserFacingMessage(e2, 'Quiz submit failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Skill quiz</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crud-page">
        <h1>Skill quiz</h1>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/student/offered-skills')}>
          Back to offers
        </button>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Skill quiz</h1>
      <p className="muted">
        Answer the MCQs and pass with at least <strong>3 correct</strong> answers.
      </p>
      <p className="muted small">SkillID: {skillId}</p>

      {!questions.length ? (
        <p className="muted">No questions available for this skill yet.</p>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          {questions.map((q, idx) => (
            <section key={q.questionId} className="crud-form-card">
              <h2>
                Question {idx + 1}
              </h2>
              <p className="muted small">{q.questionText}</p>

              <div className="stack">
                {q.options.map((o) => {
                  const name = `q-${q.questionId}`;
                  const checked = answers[String(q.questionId)] === o.optionKey;
                  return (
                    <label key={o.optionKey} className="inline">
                      <input
                        type="radio"
                        name={name}
                        checked={checked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [String(q.questionId)]: o.optionKey }))}
                      />
                      {o.optionText}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {resultMsg ? (
            <p className={passed ? 'match-ok' : 'form-error'} role="status">
              {resultMsg}
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={submitting || !allAnswered}>
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </button>

          {passed ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/student/offered-skills')}
            >
              Go to offered skills
            </button>
          ) : null}
        </form>
      )}
    </div>
  );
}

