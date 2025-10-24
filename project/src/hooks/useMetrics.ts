import { useState, useEffect } from 'react';
import { supabase, Metric, MetricGoal } from '../lib/supabase';

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<MetricGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      const { data: metricsData, error: metricsError } = await supabase
        .from('metrics')
        .select('*')
        .is('deleted_at', null)
        .order('category', { ascending: true });

      if (metricsError) throw metricsError;

      const { data: goalsData, error: goalsError } = await supabase
        .from('metric_goals')
        .select('*')
        .order('period_number', { ascending: true });

      if (goalsError) throw goalsError;

      setMetrics(metricsData || []);
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addMetric(
    metric: Omit<Metric, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>,
    metricGoals: Omit<MetricGoal, 'id' | 'metric_id' | 'created_at'>[]
  ) {
    try {
      const metricToInsert = {
        metric_name: metric.metric_name,
        category: metric.category,
        owner_id: metric.owner_id,
        collaborator_id: metric.collaborator_id,
        time_period_type: metric.time_period_type,
        quarter: metric.quarter,
        year: metric.year,
        quarterly_goal: metric.quarterly_goal,
        related_rock_id: metric.related_rock_id,
        measurement_type: metric.measurement_type
      };

      const { data: newMetric, error: metricError } = await supabase
        .from('metrics')
        .insert([metricToInsert])
        .select()
        .single();

      if (metricError) throw metricError;

      if (metricGoals.length > 0) {
        const goalsToInsert = metricGoals.map(goal => ({
          metric_id: newMetric.id,
          period_type: goal.period_type,
          period_number: goal.period_number,
          goal_value: goal.goal_value,
          date_start: goal.date_start,
          date_end: goal.date_end
        }));

        const { error: goalsError } = await supabase
          .from('metric_goals')
          .insert(goalsToInsert);

        if (goalsError) throw goalsError;
      }

      await loadMetrics();
    } catch (error) {
      console.error('Error adding metric:', error);
      throw error;
    }
  }

  async function updateMetricGoal(goalId: string, actualValue: number) {
    try {
      const { error } = await supabase
        .from('metric_goals')
        .update({ actual_value: actualValue })
        .eq('id', goalId);

      if (error) throw error;
      await loadMetrics();
    } catch (error) {
      console.error('Error updating metric goal:', error);
      throw error;
    }
  }

  async function createOrUpdateGoal(
    metricId: string,
    periodType: 'week' | 'month' | 'quarter',
    periodNumber: number,
    goalValue: number,
    actualValue: number,
    dateStart: string,
    dateEnd: string
  ) {
    try {
      const existingGoal = goals.find(
        g => g.metric_id === metricId &&
        g.period_type === periodType &&
        g.period_number === periodNumber
      );

      if (existingGoal) {
        const { error } = await supabase
          .from('metric_goals')
          .update({ actual_value: actualValue })
          .eq('id', existingGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('metric_goals')
          .insert([{
            metric_id: metricId,
            period_type: periodType,
            period_number: periodNumber,
            goal_value: goalValue,
            actual_value: actualValue,
            date_start: dateStart,
            date_end: dateEnd
          }]);
        if (error) throw error;
      }

      await loadMetrics();
    } catch (error) {
      console.error('Error creating/updating goal:', error);
      throw error;
    }
  }

  async function deleteMetric(metricId: string) {
    try {
      const { error } = await supabase
        .from('metrics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', metricId);

      if (error) throw error;
      await loadMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
      throw error;
    }
  }

  async function updateMetric(metricId: string, updates: Partial<Metric>) {
    try {
      const { error } = await supabase
        .from('metrics')
        .update(updates)
        .eq('id', metricId);

      if (error) throw error;
      await loadMetrics();
    } catch (error) {
      console.error('Error updating metric:', error);
      throw error;
    }
  }

  return {
    metrics,
    goals,
    loading,
    addMetric,
    updateMetric,
    updateMetricGoal,
    createOrUpdateGoal,
    deleteMetric,
    refresh: loadMetrics
  };
}
