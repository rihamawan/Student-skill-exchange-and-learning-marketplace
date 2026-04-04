export function OfferedSkillsForm({
  editingId,
  skillId,
  setSkillId,
  isPaid,
  setIsPaid,
  pricePerHour,
  setPricePerHour,
  skillsForNew,
  editingSkillName,
  onSubmit,
  onCancelEdit,
  formError,
  actionError,
  saving,
}) {
  return (
    <section className="crud-form-card">
      <h2>{editingId != null ? 'Edit offer' : 'Add offer'}</h2>
      <form className="stack" onSubmit={onSubmit}>
        {editingId == null ? (
          <div className="field">
            <label htmlFor="os-skill">Skill</label>
            <select id="os-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)} required>
              <option value="">Select a skill…</option>
              {skillsForNew.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.categoryName || '—'})
                </option>
              ))}
            </select>
            {skillsForNew.length === 0 ? (
              <span className="muted small">You already have an offer for each skill, or the list is empty.</span>
            ) : null}
          </div>
        ) : (
          <div className="field">
            <span className="label-like">Skill</span>
            <p className="crud-readonly">{editingSkillName ?? '—'}</p>
          </div>
        )}

        <div className="field">
          <span>Offer as</span>
          <label className="inline">
            <input type="radio" checked={!isPaid} onChange={() => setIsPaid(false)} />
            Free exchange
          </label>
          <label className="inline">
            <input type="radio" checked={isPaid} onChange={() => setIsPaid(true)} />
            Paid
          </label>
        </div>

        {isPaid ? (
          <div className="field">
            <label htmlFor="os-price">Price per hour (PKR)</label>
            <input
              id="os-price"
              type="number"
              min="0"
              step="0.01"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
            />
          </div>
        ) : null}

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
            {saving ? 'Saving…' : editingId != null ? 'Save changes' : 'Add offer'}
          </button>
          {editingId != null ? (
            <button type="button" className="btn-secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
