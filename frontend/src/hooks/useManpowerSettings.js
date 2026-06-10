import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { getDefaultSettings } from '../utils/roleFilters';

/**
 * Custom hook to fetch and manage manpower settings
 * Handles caching and error states
 */
export function useManpowerSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/hr/manpower-settings/settings/');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates) => {
    try {
      setError(null);
      const updated = { ...settings, ...updates };
      const res = await api.post('/hr/manpower-settings/settings/', updated);
      setSettings(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err);
      throw err;
    }
  }, [settings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings: settings || getDefaultSettings(),
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}
