import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Student's offered skills: list (mine), skills catalog, create / update / delete.
 */
export function useOfferedSkills() {
  const [items, setItems] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setError('');
    try {
      const res = await api('/api/v1/offered-skills?mine=true');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load your offers');
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

  const createOffer = useCallback(
    async (body) => {
      setSaving(true);
      try {
        await api('/api/v1/offered-skills', { method: 'POST', body });
        await loadItems();
      } finally {
        setSaving(false);
      }
    },
    [loadItems]
  );

  const updateOffer = useCallback(
    async (id, body) => {
      setSaving(true);
      try {
        await api(`/api/v1/offered-skills/${id}`, { method: 'PUT', body });
        await loadItems();
      } finally {
        setSaving(false);
      }
    },
    [loadItems]
  );

  const removeOffer = useCallback(
    async (id) => {
      setSaving(true);
      try {
        await api(`/api/v1/offered-skills/${id}`, { method: 'DELETE' });
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
    createOffer,
    updateOffer,
    removeOffer,
  };
}
