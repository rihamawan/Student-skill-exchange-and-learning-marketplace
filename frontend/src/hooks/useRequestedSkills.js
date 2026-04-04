import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

/**
 * Student's requested skills: list mine, skills catalog, create, PATCH status, delete.
 */
export function useRequestedSkills() {
  const [items, setItems] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setError('');
    try {
      const res = await api('/api/v1/requested-skills?mine=true');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(getUserFacingMessage(e, 'Failed to load your requests'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      const res = await api('/api/v1/skills');
      setSkills(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSkills([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadItems();
    loadSkills();
  }, [loadItems, loadSkills]);

  const createRequest = useCallback(
    async (body) => {
      setSaving(true);
      try {
        await api('/api/v1/requested-skills', { method: 'POST', body });
        await loadItems();
      } finally {
        setSaving(false);
      }
    },
    [loadItems]
  );

  const updateStatus = useCallback(
    async (id, status) => {
      setSaving(true);
      try {
        await api(`/api/v1/requested-skills/${id}/status`, {
          method: 'PATCH',
          body: { status },
        });
        await loadItems();
      } finally {
        setSaving(false);
      }
    },
    [loadItems]
  );

  const removeRequest = useCallback(
    async (id) => {
      setSaving(true);
      try {
        await api(`/api/v1/requested-skills/${id}`, { method: 'DELETE' });
        await loadItems();
      } finally {
        setSaving(false);
      }
    },
    [loadItems]
  );

  return {
    items,
    skills,
    loading,
    error,
    saving,
    reload: loadItems,
    createRequest,
    updateStatus,
    removeRequest,
  };
}
