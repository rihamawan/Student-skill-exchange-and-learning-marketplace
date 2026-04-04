import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

const DIFFICULTY = ['beginner', 'intermediate', 'advanced'];

/**
 * Superadmin: skill categories (read) + skills CRUD.
 */
export function useSkillsAdmin() {
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [catRes, skRes] = await Promise.all([
        api('/api/v1/skill-categories'),
        api('/api/v1/skills'),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setSkills(Array.isArray(skRes.data) ? skRes.data : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load skills'));
      setCategories([]);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createSkill = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      try {
        await api('/api/v1/skills', { method: 'POST', body });
        await load();
      } catch (e) {
        setError(getUserFacingMessage(e, 'Create failed'));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const updateSkill = useCallback(
    async (id, body) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/skills/${id}`, { method: 'PUT', body });
        await load();
      } catch (e) {
        setError(getUserFacingMessage(e, 'Update failed'));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const removeSkill = useCallback(
    async (id) => {
      setBusy(true);
      setError('');
      try {
        await api(`/api/v1/skills/${id}`, { method: 'DELETE' });
        await load();
      } catch (e) {
        setError(getUserFacingMessage(e, 'Delete failed'));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return {
    categories,
    skills,
    loading,
    error,
    reload: load,
    createSkill,
    updateSkill,
    removeSkill,
    busy,
    difficultyOptions: DIFFICULTY,
  };
}
