import { useState, useEffect } from 'react';
import { supabase, ScorecardMetric } from '../lib/supabase';

export function useScorecard() {
  const [scorecard, setScorecard] = useState<ScorecardMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScorecard();
  }, []);

  async function loadScorecard() {
    try {
      const { data, error } = await supabase
        .from('scorecard_metrics')
        .select('*')
        .order('category');

      if (error) throw error;
      setScorecard(data || []);
    } catch (error) {
      console.error('Error loading scorecard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addMetric(metric: Omit<ScorecardMetric, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { error } = await supabase
        .from('scorecard_metrics')
        .insert([metric]);

      if (error) throw error;
      await loadScorecard();
    } catch (error) {
      console.error('Error adding metric:', error);
      throw error;
    }
  }

  async function updateMetric(id: string, updates: Partial<ScorecardMetric>) {
    try {
      const { error } = await supabase
        .from('scorecard_metrics')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadScorecard();
    } catch (error) {
      console.error('Error updating metric:', error);
      throw error;
    }
  }

  async function deleteMetric(id: string) {
    try {
      const { error } = await supabase
        .from('scorecard_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadScorecard();
    } catch (error) {
      console.error('Error deleting metric:', error);
      throw error;
    }
  }

  return {
    scorecard,
    loading,
    addMetric,
    updateMetric,
    deleteMetric
  };
}
