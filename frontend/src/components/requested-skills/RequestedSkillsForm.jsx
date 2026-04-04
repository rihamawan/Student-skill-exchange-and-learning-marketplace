const PREFERRED_TIMES = ['Morning', 'Evenings', 'Weekdays', 'Weekends', 'Flexible'];

export function RequestedSkillsForm({
  editingId,
  skillId,
  setSkillId,
  preferredTime,
  setPreferredTime,
  preferredMode,
  setPreferredMode,
  status,
  setStatus,
  skillsForNew,
  editingSkillName,
  editingPreferredTime,
  editingPreferredMode,
  editingStatus,
  onSubmit,
  onCancelEdit,
  formError,
  actionError,
  saving,
}) {
  const isEdit = editingId != null;

  return (
    <section className="crud-form-card">
      <h2>{isEdit ? 'Update request status' : 'Add request'}</h2>
      {!isEdit ? (
        <p className="muted small">
          Pick a skill, when you prefer to learn, and whether you want free exchange or paid tutoring.
        </p>
      ) : (
        <p className="muted small">
          Skill and preferences are fixed after creation. Change <strong>status</strong> here, or delete and add a new
          request to change preferences.
        </p>
      )}

      <form className="stack" onSubmit={onSubmit}>
        {!isEdit ? (
          <>
            <div className="field">
              <label htmlFor="rs-skill">Skill</label>
              <select id="rs-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)} required>
                <option value="">Select a skill…</option>
                {skillsForNew.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.categoryName || '—'})
                  </option>
                ))}
              </select>
              {skillsForNew.length === 0 ? (
                <span className="muted small">You already have a request for each skill, or the list is empty.</span>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="rs-time">Preferred time</label>
              <select id="rs-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                {PREFERRED_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>I prefer</span>
              <label className="inline">
                <input
                  type="radio"
                  checked={preferredMode === 'Exchange'}
                  onChange={() => setPreferredMode('Exchange')}
                />
                Free exchange
              </label>
              <label className="inline">
                <input type="radio" checked={preferredMode === 'Paid'} onChange={() => setPreferredMode('Paid')} />
                Paid
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <span className="label-like">Skill</span>
              <p className="crud-readonly">{editingSkillName ?? '—'}</p>
            </div>
            <div className="field">
              <span className="label-like">Preferred time</span>
              <p className="crud-readonly">{editingPreferredTime ?? '—'}</p>
            </div>
            <div className="field">
              <span className="label-like">Mode</span>
              <p className="crud-readonly">{editingPreferredMode === 'Paid' ? 'Paid' : 'Free exchange'}</p>
            </div>
            <div className="field">
              <label htmlFor="rs-status">Status</label>
              <select id="rs-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="matched">matched</option>
                <option value="closed">closed</option>
              </select>
            </div>
            {editingStatus === 'matched' ? (
              <p className="muted small">Matched requests may be linked to an exchange; deleting can fail if the DB blocks it.</p>
            ) : null}
          </>
        )}

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        {actionError ? (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="crud-form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save status' : 'Add request'}
          </button>
          {isEdit ? (
            <button type="button" className="btn-secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
