import { useMemo, useState } from 'react';
import { useSkillsAdmin } from '../../hooks/useSkillsAdmin';

export function SkillsManagePage() {
  const {
    categories,
    skills,
    loading,
    error,
    reload,
    createSkill,
    updateSkill,
    removeSkill,
    busy,
    difficultyOptions,
  } = useSkillsAdmin();

  const [categoryId, setCategoryId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [filterCat, setFilterCat] = useState('');
  const [formErr, setFormErr] = useState('');

  const filtered = useMemo(() => {
    if (!filterCat) return skills;
    const n = Number(filterCat);
    return skills.filter((s) => Number(s.categoryId) === n);
  }, [skills, filterCat]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    const cid = Number(categoryId);
    if (!Number.isFinite(cid) || cid < 1) {
      setFormErr('Choose a category.');
      return;
    }
    if (!skillName.trim()) {
      setFormErr('Skill name is required.');
      return;
    }
    try {
      await createSkill({
        categoryId: cid,
        skillName: skillName.trim(),
        description: description.trim() || undefined,
        difficultyLevel: difficulty,
      });
      setSkillName('');
      setDescription('');
      setDifficulty('beginner');
    } catch {
      /* hook error */
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Skills catalog</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Skills catalog</h1>
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

      <div className="field">
        <label htmlFor="sk-filter">Filter by category</label>
        <select id="sk-filter" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <section className="crud-form-card">
        <h2>Add skill</h2>
        <form className="stack" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="sk-cat">Category</label>
            <select id="sk-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sk-name">Skill name</label>
            <input id="sk-name" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sk-desc">Description (optional)</label>
            <input id="sk-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sk-diff">Difficulty</label>
            <select id="sk-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {difficultyOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {formErr ? (
            <p className="form-error" role="alert">
              {formErr}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Create skill'}
          </button>
        </form>
      </section>

      {!filtered.length ? (
        <p className="muted">No skills in this filter.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <SkillEditRow
                key={s.id}
                skill={s}
                categories={categories}
                difficultyOptions={difficultyOptions}
                busy={busy}
                onSave={(body) => updateSkill(s.id, body)}
                onDelete={() => removeSkill(s.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SkillEditRow({ skill, categories, difficultyOptions, busy, onSave, onDelete }) {
  const [name, setName] = useState(skill.name ?? '');
  const [categoryId, setCategoryId] = useState(String(skill.categoryId ?? ''));
  const [description, setDescription] = useState(skill.description ?? '');
  const [difficulty, setDifficulty] = useState(skill.difficultyLevel ?? 'beginner');

  return (
    <tr>
      <td>{skill.id}</td>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Skill name" />
        <input
          className="skill-desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          aria-label="Description"
        />
      </td>
      <td>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {difficultyOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </td>
      <td>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            const body = {
              skillName: name.trim(),
              categoryId: Number(categoryId),
              description: description.trim(),
              difficultyLevel: difficulty,
            };
            void onSave(body);
          }}
        >
          Save
        </button>{' '}
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Delete this skill? Fails if in use.')) void onDelete();
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
