import { useState, useEffect } from 'react';
import { supabase, L10Note } from '../lib/supabase';

export function useL10Notes(meetingDate: string, meetingTimestamp: string | null) {
  const [notes, setNotes] = useState<L10Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (meetingTimestamp) {
      loadNotes();
    } else {
      setNotes([]);
      setLoading(false);
    }
  }, [meetingDate, meetingTimestamp]);

  async function loadNotes() {
    try {
      const { data, error } = await supabase
        .from('l10_notes')
        .select('*')
        .eq('meeting_date', meetingDate)
        .eq('meeting_timestamp', meetingTimestamp || '');

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateNote(section: string, noteText: string) {
    try {
      const { error } = await supabase
        .from('l10_notes')
        .upsert({
          section,
          notes: noteText,
          meeting_date: meetingDate,
          meeting_timestamp: meetingTimestamp || new Date().toISOString()
        });

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  return { notes, loading, updateNote };
}
