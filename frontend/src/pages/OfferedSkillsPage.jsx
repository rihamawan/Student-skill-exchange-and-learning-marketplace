import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfferedSkillsForm } from '../components/offered-skills/OfferedSkillsForm';
import { OfferedSkillsTable } from '../components/offered-skills/OfferedSkillsTable';
import { useOfferedSkills } from '../hooks/useOfferedSkills';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

export function OfferedSkillsPage() {
  const { items, skills, loading, error, saving, createOffer, updateOffer, removeOffer } = useOfferedSkills();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState(null);
  const [skillId, setSkillId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [pricePerHour, setPricePerHour] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const usedSkillIds = useMemo(() => new Set(items.map((o) => o.skillId)), [items]);
  const skillsForNew = useMemo(
    () => skills.filter((s) => !usedSkillIds.has(s.id)),
    [skills, usedSkillIds]
  );

  const editingSkillName = editingId != null ? items.find((o) => o.id === editingId)?.skillName : null;

  function resetForm() {
    setEditingId(null);
    setSkillId('');
    setIsPaid(false);
    setPricePerHour('');
    setFormError('');
  }

  function startEdit(row) {
    setEditingId(row.id);
    setSkillId(String(row.skillId));
    setIsPaid(Boolean(row.isPaid));
    setPricePerHour(row.pricePerHour != null ? String(row.pricePerHour) : '');
    setFormError('');
  }

  function validateForCreate() {
    const sid = Number(skillId);
    if (!Number.isFinite(sid) || sid < 1) {
      setFormError('Choose a skill.');
      return false;
    }
    if (isPaid) {
      const p = pricePerHour === '' ? NaN : Number(pricePerHour);
      if (!Number.isFinite(p) || p < 0) {
        setFormError('Paid offers need a valid price per hour (0 or more).');
        return false;
      }
    }
    setFormError('');
    return true;
  }

  function validateForUpdate() {
    if (isPaid) {
      const p = pricePerHour === '' ? NaN : Number(pricePerHour);
      if (!Number.isFinite(p) || p < 0) {
        setFormError('Paid offers need a valid price per hour (0 or more).');
        return false;
      }
    }
    setFormError('');
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setActionError('');
    if (editingId != null) {
      if (!validateForUpdate()) return;
      try {
        const sid = Number(skillId);
        if (!Number.isFinite(sid) || sid < 1) {
          setActionError('Invalid skill.');
          return;
        }
        const passRes = await api(`/api/v1/skill-quiz/passed?skillId=${sid}`);
        const passed = Boolean(passRes?.data?.passed);
        if (!passed) {
          setActionError('Pass the skill quiz before offering this skill.');
          navigate(`/student/quiz/${sid}?from=offer-create&isPaid=${isPaid ? '1' : '0'}&pricePerHour=${encodeURIComponent(pricePerHour)}`);
          return;
        }

        const updateBody = isPaid
          ? { isPaid, pricePerHour: Number(pricePerHour) }
          : { isPaid };
        await updateOffer(editingId, updateBody);
        resetForm();
      } catch (err) {
        setActionError(getUserFacingMessage(err, 'Update failed'));
      }
      return;
    }
    if (!validateForCreate()) return;
    try {
      const sid = Number(skillId);
      const passRes = await api(`/api/v1/skill-quiz/passed?skillId=${sid}`);
      const passed = Boolean(passRes?.data?.passed);
      if (!passed) {
        setActionError('Pass the skill quiz before offering this skill.');
        navigate(`/student/quiz/${sid}?from=offer-create&isPaid=${isPaid ? '1' : '0'}&pricePerHour=${encodeURIComponent(pricePerHour)}`);
        return;
      }

      const createBody = { skillId: Number(skillId), isPaid };
      if (isPaid) createBody.pricePerHour = Number(pricePerHour);
      await createOffer(createBody);
      resetForm();
    } catch (err) {
      setActionError(getUserFacingMessage(err, 'Could not create offer'));
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Remove your offer for “${row.skillName}”?`)) return;
    setActionError('');
    try {
      await removeOffer(row.id);
      if (editingId === row.id) resetForm();
    } catch (err) {
      setActionError(getUserFacingMessage(err, 'Delete failed'));
    }
  }

  if (loading) {
    return (
      <div className="crud-page">
        <h1>Offered skills</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crud-page">
        <h1>Offered skills</h1>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <h1>Offered skills</h1>
      <p className="muted">Skills you teach (free or PKR/hr).</p>

      <OfferedSkillsForm
        editingId={editingId}
        skillId={skillId}
        setSkillId={setSkillId}
        isPaid={isPaid}
        setIsPaid={setIsPaid}
        pricePerHour={pricePerHour}
        setPricePerHour={setPricePerHour}
        skillsForNew={skillsForNew}
        editingSkillName={editingSkillName}
        onSubmit={handleSubmit}
        onCancelEdit={resetForm}
        formError={formError}
        actionError={actionError}
        saving={saving}
      />

      <section>
        <h2>Your offers ({items.length})</h2>
        <OfferedSkillsTable items={items} onEdit={startEdit} onDelete={handleDelete} />
      </section>
    </div>
  );
}
