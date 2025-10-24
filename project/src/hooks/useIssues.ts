import { useState, useEffect } from 'react';
import { supabase, Issue } from '../lib/supabase';

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addIssue(issue: Omit<Issue, 'id' | 'created_at' | 'status'>) {
    try {
      const { error } = await supabase
        .from('issues')
        .insert([{ ...issue, status: 'open' }]);

      if (error) throw error;
      await loadIssues();
    } catch (error) {
      console.error('Error adding issue:', error);
      throw error;
    }
  }

  return { issues, loading, addIssue };
}
