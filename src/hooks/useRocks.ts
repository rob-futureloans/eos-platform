import { useState, useEffect } from 'react';
import { supabase, Rock, RockWithDetails, Milestone, ActionItem } from '../lib/supabase';

export function useRocks() {
  const [rocks, setRocks] = useState<RockWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRocks();
  }, []);

  async function loadRocks() {
    try {
      const { data: rocksData, error: rocksError } = await supabase
        .from('rocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (rocksError) throw rocksError;

      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .order('due_date');

      const { data: actionItemsData } = await supabase
        .from('action_items')
        .select('*');

      const rocksWithDetails: RockWithDetails[] = (rocksData || []).map(rock => ({
        ...rock,
        milestones: milestonesData?.filter(m => m.rock_id === rock.id) || [],
        actionItems: actionItemsData?.filter(a => a.rock_id === rock.id) || []
      }));

      setRocks(rocksWithDetails);
    } catch (error) {
      console.error('Error loading rocks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addRock(rock: Omit<Rock, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('rocks')
        .insert([rock])
        .select()
        .single();

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error adding rock:', error);
      throw error;
    }
  }

  async function updateRock(id: string, updates: Partial<Rock>) {
    try {
      const { error } = await supabase
        .from('rocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error updating rock:', error);
      throw error;
    }
  }

  async function deleteRock(id: string) {
    try {
      const { error } = await supabase
        .from('rocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error deleting rock:', error);
      throw error;
    }
  }

  async function toggleMilestone(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({ complete: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  }

  async function toggleActionItem(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('action_items')
        .update({ complete: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error toggling action item:', error);
    }
  }

  async function updateMilestone(id: string, updates: Partial<Milestone>) {
    try {
      const { error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  }

  async function updateActionItem(id: string, updates: Partial<ActionItem>) {
    try {
      const { error } = await supabase
        .from('action_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadRocks();
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  }

  return {
    rocks,
    loading,
    addRock,
    updateRock,
    deleteRock,
    toggleMilestone,
    toggleActionItem,
    updateMilestone,
    updateActionItem
  };
}
