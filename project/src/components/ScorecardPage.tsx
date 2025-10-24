import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Check, AlertCircle, Edit2 } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { useUsers } from '../hooks/useUsers';
import { AddMetricModal } from './AddMetricModal';
import { EditMetricModal } from './EditMetricModal';
import { Metric } from '../lib/supabase';
import {
  calculateVariance,
  calculateVariancePercent,
  calculateStatus,
  formatMetricValue,
  getCurrentWeekNumber,
  getWeekDateRange,
  formatDateRange,
  type MetricStatus
} from '../utils/scorecardCalculations';
import { getYearOptions } from '../utils/metricPeriods';

export function ScorecardPage() {
  const { metrics, goals, loading, addMetric, updateMetric, updateMetricGoal, createOrUpdateGoal } = useMetrics();
  const { users } = useUsers();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<Metric | null>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentWeekNumber());
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  const [editingMetric, setEditingMetric] = useState<any>(null);

  useEffect(() => {
    setSelectedPeriod(getCurrentWeekNumber());
  }, []);

  const getUserName = (userId: string | null): string => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const getMetricGoal = (metricId: string) => {
    return goals.find(
      g => g.metric_id === metricId &&
      g.period_number === selectedPeriod &&
      g.period_type === timePeriod.replace('ly', '') as 'week' | 'month' | 'quarter'
    );
  };

  const metricsWithData = useMemo(() => {
    const getQuarterFromPeriod = (): string => {
      if (timePeriod === 'quarterly') {
        return `Q${selectedPeriod}`;
      } else if (timePeriod === 'monthly') {
        if (selectedPeriod <= 3) return 'Q1';
        if (selectedPeriod <= 6) return 'Q2';
        if (selectedPeriod <= 9) return 'Q3';
        return 'Q4';
      } else {
        const weekNum = selectedPeriod;
        if (weekNum <= 13) return 'Q1';
        if (weekNum <= 26) return 'Q2';
        if (weekNum <= 39) return 'Q3';
        return 'Q4';
      }
    };

    const currentQuarter = getQuarterFromPeriod();

    return metrics
      .filter(m =>
        m.time_period_type === timePeriod &&
        m.year === selectedYear &&
        m.quarter === currentQuarter
      )
      .map(metric => {
        const goal = getMetricGoal(metric.id);
        const actual = goal?.actual_value ?? null;
        const goalValue = goal?.goal_value ?? metric.quarterly_goal;

        return {
          ...metric,
          currentGoal: goal || null,
          goalValue,
          actual,
          variance: calculateVariance(actual, goalValue),
          variancePercent: calculateVariancePercent(actual, goalValue),
          status: calculateStatus(actual, goalValue, metric.measurement_type)
        };
      });
  }, [metrics, goals, timePeriod, selectedPeriod, selectedYear]);

  const filteredMetrics = useMemo(() => {
    return metricsWithData.filter(metric => {
      if (ownerFilter !== 'all' && metric.owner_id !== ownerFilter) return false;
      if (categoryFilter !== 'all' && metric.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && metric.status !== statusFilter) return false;
      return true;
    });
  }, [metricsWithData, ownerFilter, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredMetrics.length;
    const onTrack = filteredMetrics.filter(m => m.status === 'on-track').length;
    const offTrack = filteredMetrics.filter(m => m.status === 'off-track').length;
    const noData = filteredMetrics.filter(m => m.status === 'no-data').length;

    return {
      total,
      onTrack,
      offTrack,
      noData,
      onTrackPercent: total > 0 ? Math.round((onTrack / total) * 100) : 0,
      offTrackPercent: total > 0 ? Math.round((offTrack / total) * 100) : 0
    };
  }, [filteredMetrics]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set(metrics.map(m => m.owner_id).filter(Boolean) as string[]);
    return Array.from(owners).map(id => ({
      id,
      name: getUserName(id)
    }));
  }, [metrics, users]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(metrics.map(m => m.category).filter(Boolean) as string[]);
    return Array.from(categories).sort();
  }, [metrics]);

  const periodOptions = useMemo(() => {
    if (timePeriod === 'weekly') {
      return Array.from({ length: 52 }, (_, i) => {
        const weekNum = i + 1;
        const { start, end } = getWeekDateRange(weekNum, selectedYear);
        return {
          value: weekNum,
          label: `Week ${weekNum} (${formatDateRange(start, end)})`
        };
      });
    } else if (timePeriod === 'monthly') {
      return Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(selectedYear, i).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }));
    } else {
      return [
        { value: 1, label: 'Q1 (Jan-Mar)' },
        { value: 2, label: 'Q2 (Apr-Jun)' },
        { value: 3, label: 'Q3 (Jul-Sep)' },
        { value: 4, label: 'Q4 (Oct-Dec)' }
      ];
    }
  }, [timePeriod, selectedYear]);

  const handleCellEdit = (metric: any, currentValue: number | null) => {
    setEditingCell(metric.id);
    setEditingMetric(metric);
    setEditValue(currentValue?.toString() || '');
  };

  const handleOpenEditModal = (metric: any) => {
    const fullMetric = metrics.find(m => m.id === metric.id);
    if (fullMetric) {
      setMetricToEdit(fullMetric);
      setShowEditModal(true);
    }
  };

  const handleSaveMetric = async (metricId: string, updates: Partial<Metric>) => {
    await updateMetric(metricId, updates);
    setShowEditModal(false);
    setMetricToEdit(null);
  };

  const handleCellSave = async () => {
    if (!editingMetric) return;

    const numValue = parseFloat(editValue);
    if (!isNaN(numValue)) {
      try {
        const periodType = timePeriod.replace('ly', '') as 'week' | 'month' | 'quarter';
        const { start, end } = getWeekDateRange(selectedPeriod, selectedYear);

        const dateStart = start.toISOString().split('T')[0];
        const dateEnd = end.toISOString().split('T')[0];

        if (editingMetric.currentGoal) {
          await updateMetricGoal(editingMetric.currentGoal.id, numValue);
        } else {
          await createOrUpdateGoal(
            editingMetric.id,
            periodType,
            selectedPeriod,
            editingMetric.goalValue,
            numValue,
            dateStart,
            dateEnd
          );
        }

        setSavedCells(prev => new Set([...prev, editingMetric.id]));
        setTimeout(() => {
          setSavedCells(prev => {
            const next = new Set(prev);
            next.delete(editingMetric.id);
            return next;
          });
        }, 2000);
      } catch (error) {
        console.error('Error saving:', error);
        alert('Failed to save. Please try again.');
      }
    }
    setEditingCell(null);
    setEditingMetric(null);
    setEditValue('');
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditingMetric(null);
      setEditValue('');
    }
  };


  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading scorecard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-blue-600 text-white px-6 py-4 -mx-6 -mt-6 mb-6">
        <h2 className="text-2xl font-bold">EOS Scorecard - Track Metrics</h2>
        <p className="text-blue-100 mt-1">Update weekly actuals and monitor performance against goals</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 text-sm space-y-1">
            <p><span className="font-semibold">How to Update Metrics:</span></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click any "Actual" value to edit it inline</li>
              <li>Press Enter to save or Escape to cancel</li>
              <li>Variance and Status calculate automatically</li>
              <li>Off-track metrics (below 90% of goal) will be flagged when you start your L10 Meeting</li>
              <li>Use filters to focus on your metrics or view only off-track items</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
          <select
            value={timePeriod}
            onChange={(e) => {
              setTimePeriod(e.target.value as any);
              setSelectedPeriod(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">Week</option>
            <option value="monthly">Month</option>
            <option value="quarterly">Quarter</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Owner</label>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Owners</option>
            {uniqueOwners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="on-track">On Track</option>
            <option value="off-track">Off Track</option>
            <option value="no-data">No Data Yet</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Metric
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Total Metrics</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">On Track</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.onTrack} <span className="text-lg text-green-500">({stats.onTrackPercent}%)</span>
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Off Track</p>
          <p className="text-3xl font-bold text-red-600">
            {stats.offTrack} <span className="text-lg text-red-500">({stats.offTrackPercent}%)</span>
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">No Data Yet</p>
          <p className="text-3xl font-bold text-gray-400">
            {stats.noData} <span className="text-lg text-gray-400">({Math.round((stats.noData / (stats.total || 1)) * 100)}%)</span>
          </p>
        </div>
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No metrics found. {metrics.length === 0 ? 'Add your first metric to get started.' : 'Try adjusting your filters.'}</p>
          {metrics.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add First Metric
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Goal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.map(metric => {
                  const isEditing = editingCell === metric.id;
                  const isSaved = savedCells.has(metric.id);

                  return (
                    <tr key={metric.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{metric.metric_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getUserName(metric.owner_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {metric.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                        {formatMetricValue(metric.goalValue, metric.measurement_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleCellKeyDown}
                            autoFocus
                            step={metric.measurement_type === 'percentage' ? '0.1' : '1'}
                            className="w-24 px-2 py-1 text-sm border-2 border-blue-500 rounded text-right focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => handleCellEdit(metric, metric.actual)}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Click to edit"
                          >
                            {formatMetricValue(metric.actual, metric.measurement_type)}
                            {isSaved && (
                              <span className="ml-2 text-green-600 text-xs">
                                <Check className="w-3 h-3 inline" /> Saved
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {metric.variance !== null ? (
                          <div>
                            <div className={`font-semibold ${metric.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {metric.variance >= 0 ? '+' : ''}{formatMetricValue(metric.variance, metric.measurement_type)}
                            </div>
                            <div className={`text-xs ${metric.variancePercent! >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({metric.variancePercent! >= 0 ? '+' : ''}{metric.variancePercent?.toFixed(1)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {metric.status === 'on-track' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" /> On Track
                          </span>
                        )}
                        {metric.status === 'off-track' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✕ Off Track
                          </span>
                        )}
                        {metric.status === 'no-data' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            No Data
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleOpenEditModal(metric)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition inline-flex items-center gap-1"
                          title="Edit metric"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddMetricModal
          onClose={() => setShowAddModal(false)}
          onSave={addMetric}
        />
      )}

      {showEditModal && metricToEdit && (
        <EditMetricModal
          metric={metricToEdit}
          onClose={() => {
            setShowEditModal(false);
            setMetricToEdit(null);
          }}
          onSave={handleSaveMetric}
        />
      )}
    </div>
  );
}
