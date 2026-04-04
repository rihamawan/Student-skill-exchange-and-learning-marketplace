import { useEffect, useState } from 'react';
import { useAdminEvaluations } from '../../hooks/useAdminEvaluations';

export function AdminEvaluationsPage() {
  const {
    evaluations,
    students,
    skills,
    loading,
    error,
    reload,
    createEvaluation,
    updateEvaluation,
    busyId,
    statusOptions,
  } = useAdminEvaluations();

  const [studentId, setStudentId] = useState('');
  const [skillId, setSkillId] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateErr('');
    const sid = Number(studentId);
    const sk = Number(skillId);
    if (!Number.isFinite(sid) || sid < 1 || !Number.isFinite(sk) || sk < 1) {
      setCreateErr('Choose a student and a skill.');
      return;
    }
    setCreating(true);
    try {
      await createEvaluation(sid, sk);
      setStudentId('');
      setSkillId('');
    } catch (err) {
      setCreateErr(err.message || 'Could not create evaluation');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Skill evaluations</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Skill evaluations</h1>
      <p className="muted">Evaluations for students at your university. Create new ones and update status or scores.</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <p>
        <button type="button" className="btn-secondary" onClick={() => reload()}>
          Refresh
        </button>
      </p>

      <section className="crud-form-card">
        <h2>Start evaluation</h2>
        <form className="stack" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="ae-stu">Student</label>
            <select id="ae-stu" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} (#{s.id})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ae-sk">Skill</label>
            <select id="ae-sk" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              <option value="">Select…</option>
              {skills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name} (#{sk.id})
                </option>
              ))}
            </select>
          </div>
          {createErr ? (
            <p className="form-error" role="alert">
              {createErr}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create evaluation'}
          </button>
        </form>
      </section>

      {!evaluations.length ? (
        <p className="muted">No evaluations yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Skill</th>
              <th>Status</th>
              <th>Score</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev) => (
              <EvaluationRow
                key={ev.id}
                ev={ev}
                statusOptions={statusOptions}
                busy={busyId === ev.id}
                onSave={(patch) => updateEvaluation(ev.id, patch)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EvaluationRow({ ev, statusOptions, busy, onSave }) {
  const [status, setStatus] = useState(ev.status ?? 'pending');
  const [score, setScore] = useState(ev.score != null ? String(ev.score) : '');
  const [total, setTotal] = useState(ev.totalPossible != null ? String(ev.totalPossible) : '');

  useEffect(() => {
    setStatus(ev.status ?? 'pending');
    setScore(ev.score != null ? String(ev.score) : '');
    setTotal(ev.totalPossible != null ? String(ev.totalPossible) : '');
  }, [ev.id, ev.status, ev.score, ev.totalPossible]);

  return (
    <tr>
      <td>{ev.id}</td>
      <td>{ev.studentName ?? ev.studentId}</td>
      <td>{ev.skillName ?? ev.skillId}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          min="0"
          className="inline-num"
          placeholder="score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          aria-label="Score"
        />
        {' / '}
        <input
          type="number"
          min="0"
          className="inline-num"
          placeholder="max"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          aria-label="Total possible"
        />
      </td>
      <td>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            const patch = { status };
            if (score !== '') {
              const n = Number(score);
              if (Number.isFinite(n) && n >= 0) patch.score = n;
            }
            if (total !== '') {
              const n = Number(total);
              if (Number.isFinite(n) && n >= 0) patch.totalPossible = n;
            }
            void onSave(patch);
          }}
        >
          {busy ? '…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
