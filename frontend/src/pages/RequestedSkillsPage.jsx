import { useMemo, useState } from 'react';
import { RequestedSkillsForm } from '../components/requested-skills/RequestedSkillsForm';
import { RequestedSkillsTable } from '../components/requested-skills/RequestedSkillsTable';
import { useRequestedSkills } from '../hooks/useRequestedSkills';

export function RequestedSkillsPage() {
  const { items, skills, loading, error, saving, createRequest, updateStatus, removeRequest } = useRequestedSkills();

  const [editingId, setEditingId] = useState(null);
  const [skillId, setSkillId] = useState('');
  const [preferredTime, setPreferredTime] = useState('Flexible');
  const [preferredMode, setPreferredMode] = useState('Exchange');
  const [status, setStatus] = useState('open');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const usedSkillIds = useMemo(() => new Set(items.map((r) => r.skillId)), [items]);
  const skillsForNew = useMemo(
    () => skills.filter((s) => !usedSkillIds.has(s.id)),
    [skills, usedSkillIds]
  );

  const editingRow = editingId != null ? items.find((r) => r.id === editingId) : null;

  function resetForm() {
    setEditingId(null);
    setSkillId('');
    setPreferredTime('Flexible');
    setPreferredMode('Exchange');
    setStatus('open');
    setFormError('');
  }

  function startEdit(row) {
    setEditingId(row.id);
    setStatus(row.status || 'open');
    setFormError('');
  }

  function validateCreate() {
    const sid = Number(skillId);
    if (!Number.isFinite(sid) || sid < 1) {
      setFormError('Choose a skill.');
      return false;
    }
    setFormError('');
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setActionError('');
    if (editingId != null) {
      try {
        await updateStatus(editingId, status);
        resetForm();
      } catch (err) {
        setActionError(err.message || 'Could not update status');
      }
      return;
    }
    if (!validateCreate()) return;
    try {
      await createRequest({
        skillId: Number(skillId),
        preferredTime,
        preferredMode,
      });
      resetForm();
    } catch (err) {
      setActionError(err.message || 'Could not create request');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete your request for “${row.skillName}”?`)) return;
    setActionError('');
    try {
      await removeRequest(row.id);
      if (editingId === row.id) resetForm();
    } catch (err) {
      setActionError(err.message || 'Delete failed (it may be linked to an exchange).');
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Requested skills</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crud-page">
        <h1>Requested skills</h1>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Requested skills</h1>
      <p className="muted">Skills you want to learn. Match profile (Form 1) uses the same ideas.</p>

      <RequestedSkillsForm
        editingId={editingId}
        skillId={skillId}
        setSkillId={setSkillId}
        preferredTime={preferredTime}
        setPreferredTime={setPreferredTime}
        preferredMode={preferredMode}
        setPreferredMode={setPreferredMode}
        status={status}
        setStatus={setStatus}
        skillsForNew={skillsForNew}
        editingSkillName={editingRow?.skillName}
        editingPreferredTime={editingRow?.preferredTime}
        editingPreferredMode={editingRow?.preferredMode}
        editingStatus={editingRow?.status}
        onSubmit={handleSubmit}
        onCancelEdit={resetForm}
        formError={formError}
        actionError={actionError}
        saving={saving}
      />

      <section>
        <h2>Your requests ({items.length})</h2>
        <RequestedSkillsTable items={items} onEdit={startEdit} onDelete={handleDelete} />
      </section>
    </div>
  );
}
