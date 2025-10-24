import { useState, useEffect } from 'react';
import { supabase, MeetingOffTrackMetric } from '../lib/supabase';

export function useMeetingOffTrackMetrics(meetingTimestamp: string | null) {
  const [offTrackMetrics, setOffTrackMetrics] = useState<MeetingOffTrackMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (meetingTimestamp) {
      loadOffTrackMetrics();
    } else {
      setOffTrackMetrics([]);
      setLoading(false);
    }
  }, [meetingTimestamp]);

  async function loadOffTrackMetrics() {
    try {
      const { data, error } = await supabase
        .from('meeting_off_track_metrics')
        .select('*')
        .eq('meeting_timestamp', meetingTimestamp)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOffTrackMetrics(data || []);
    } catch (error) {
      console.error('Error loading off-track metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addOffTrackMetrics(metrics: Omit<MeetingOffTrackMetric, 'id' | 'created_at'>[]) {
    try {
      const { error } = await supabase
        .from('meeting_off_track_metrics')
        .insert(metrics);

      if (error) throw error;
      await loadOffTrackMetrics();
    } catch (error) {
      console.error('Error adding off-track metrics:', error);
      throw error;
    }
  }

  async function removeOffTrackMetric(id: string) {
    try {
      const { error } = await supabase
        .from('meeting_off_track_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadOffTrackMetrics();
    } catch (error) {
      console.error('Error removing off-track metric:', error);
      throw error;
    }
  }

  return {
    offTrackMetrics,
    loading,
    addOffTrackMetrics,
    removeOffTrackMetric,
    refresh: loadOffTrackMetrics
  };
}
