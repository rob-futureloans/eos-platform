import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Metric, MetricGoal } from '../lib/supabase';
import { useUsers } from '../hooks/useUsers';
import { useRocks } from '../hooks/useRocks';
import {
  MetricPeriodType,
  Quarter,
  QUARTERS,
  getCurrentQuarter,
  getCurrentYear,
  getYearOptions,
  calculatePeriods,
  PeriodRange,
  QUARTER_MONTHS
} from '../utils/metricPeriods';

type AddMetricModalProps = {
  onClose: () => void;
  onSave: (
    metric: Omit<Metric, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>,
    goals: Omit<MetricGoal, 'id' | 'metric_id' | 'created_at'>[]
  ) => Promise<void>;
};

const CATEGORIES = [
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'Technology',
  'Customer Service',
  'Leadership'
];

export function AddMetricModal({ onClose, onSave }: AddMetricModalProps) {
  const { users } = useUsers();
  const { rocks } = useRocks();

  const [formData, setFormData] = useState({
    category: '',
    owner_id: '',
    metric_name: '',
    collaborator_id: '',
    measurement_type: 'count' as 'currency' | 'count' | 'percentage',
    time_period_type: 'quarterly' as MetricPeriodType,
    quarter: getCurrentQuarter() as Quarter,
    year: getCurrentYear(),
    quarterly_goal: 0,
    related_rock_id: ''
  });

  const [periodGoals, setPeriodGoals] = useState<{ [key: number]: number }>({});
  const [periods, setPeriods] = useState<PeriodRange[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const leadershipUsers = users.filter(user => user.role === 'super_user');

  function formatGoalValue(value: number): string {
    if (value === 0) return '';

    switch (formData.measurement_type) {
      case 'currency':
        return Math.round(value).toLocaleString('en-US');
      case 'percentage':
        return Math.round(value).toString();
      case 'count':
      default:
        return Math.round(value).toString();
    }
  }

  function parseGoalValue(input: string): number {
    const cleanedInput = input.replace(/[$,%]/g, '');
    const parsed = parseFloat(cleanedInput);
    return isNaN(parsed) ? 0 : parsed;
  }

  function getGoalPlaceholder(): string {
    switch (formData.measurement_type) {
      case 'currency':
        return '$0';
      case 'percentage':
        return '0%';
      case 'count':
      default:
        return '0';
    }
  }

  function getGoalPrefix(): string {
    return formData.measurement_type === 'currency' ? '$' : '';
  }

  function getGoalSuffix(): string {
    return formData.measurement_type === 'percentage' ? '%' : '';
  }

  useEffect(() => {
    const calculatedPeriods = calculatePeriods(
      formData.time_period_type,
      formData.quarter,
      formData.year
    );
    setPeriods(calculatedPeriods);

    const defaultGoals: { [key: number]: number } = {};
    calculatedPeriods.forEach((_, index) => {
      defaultGoals[index + 1] = 0;
    });
    setPeriodGoals(defaultGoals);
  }, [formData.time_period_type, formData.quarter, formData.year]);

  function validateForm(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!formData.metric_name.trim()) newErrors.metric_name = 'Metric name is required';
    if (formData.quarterly_goal <= 0) newErrors.quarterly_goal = 'Quarterly goal must be greater than 0';

    if (formData.time_period_type !== 'quarterly') {
      const allGoalsSet = Object.values(periodGoals).every(val => val > 0);
      if (!allGoalsSet) {
        newErrors.period_goals = 'All period goals must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    if (formData.related_rock_id) {
      const selectedRock = rocks.find(r => r.id === formData.related_rock_id);
      const metricOwner = leadershipUsers.find(u => u.id === formData.owner_id);

      if (selectedRock && formData.owner_id && selectedRock.owner !== metricOwner?.name) {
        const confirmed = window.confirm(
          `The metric owner (${metricOwner?.name || 'Unassigned'}) and rock owner (${selectedRock.owner}) are different. Do you want to proceed with this association?`
        );
        if (!confirmed) return;
      }
    }

    setIsSaving(true);

    try {
      const metric: Omit<Metric, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'> = {
        category: formData.category || null,
        metric_name: formData.metric_name,
        owner_id: formData.owner_id || null,
        collaborator_id: formData.collaborator_id || null,
        measurement_type: formData.measurement_type,
        time_period_type: formData.time_period_type,
        quarter: formData.quarter,
        year: formData.year,
        quarterly_goal: formData.quarterly_goal,
        related_rock_id: formData.related_rock_id || null
      };

      const goals: Omit<MetricGoal, 'id' | 'metric_id' | 'created_at'>[] = [];

      if (formData.time_period_type !== 'quarterly') {
        periods.forEach((period) => {
          goals.push({
            period_type: formData.time_period_type === 'weekly' ? 'week' : 'month',
            period_number: period.periodNumber,
            goal_value: periodGoals[period.periodNumber],
            date_start: period.startDate,
            date_end: period.endDate
          });
        });
      }

      await onSave(metric, goals);
      onClose();
    } catch (error: any) {
      console.error('Error saving metric:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to save metric: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  const showPeriodFields = formData.time_period_type !== 'quarterly';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Metric</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Category --</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Owner --</option>
                {leadershipUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric Name
            </label>
            <input
              type="text"
              value={formData.metric_name}
              onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.metric_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., New Leads Generated"
            />
            {errors.metric_name && <p className="text-red-500 text-xs mt-1">{errors.metric_name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Measurement Type
            </label>
            <select
              value={formData.measurement_type}
              onChange={(e) => setFormData({ ...formData, measurement_type: e.target.value as 'currency' | 'count' | 'percentage' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="currency">Currency</option>
              <option value="count">Count</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collaborator <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.collaborator_id ? users.find(u => u.id === formData.collaborator_id)?.name || '' : ''}
              onChange={(e) => {
                const user = users.find(u => u.name.toLowerCase().includes(e.target.value.toLowerCase()));
                setFormData({ ...formData, collaborator_id: user?.id || '' });
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select from list or type name"
              list="collaborators"
            />
            <datalist id="collaborators">
              {users.map(user => (
                <option key={user.id} value={user.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Period Type
              </label>
              <select
                value={formData.time_period_type}
                onChange={(e) => setFormData({ ...formData, time_period_type: e.target.value as MetricPeriodType })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Quarter
              </label>
              <select
                value={formData.quarter}
                onChange={(e) => setFormData({ ...formData, quarter: e.target.value as Quarter })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {QUARTERS.map(q => {
                  const months = QUARTER_MONTHS[q];
                  return <option key={q} value={q}>{q} ({months})</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Goal Configuration</h3>

            <div className="border border-blue-300 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quarterly Goal
              </label>
              <div className="relative">
                {getGoalPrefix() && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {getGoalPrefix()}
                  </span>
                )}
                <input
                  type="text"
                  value={formatGoalValue(formData.quarterly_goal)}
                  onChange={(e) => setFormData({ ...formData, quarterly_goal: parseGoalValue(e.target.value) })}
                  className={`w-full border rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.quarterly_goal ? 'border-red-500' : 'border-gray-300'
                  } ${getGoalPrefix() ? 'pl-7 pr-3' : getGoalSuffix() ? 'pl-3 pr-8' : 'px-3'}`}
                  placeholder={getGoalPlaceholder()}
                />
                {getGoalSuffix() && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {getGoalSuffix()}
                  </span>
                )}
              </div>
              {errors.quarterly_goal && <p className="text-red-500 text-xs mt-1">{errors.quarterly_goal}</p>}
            </div>

            {!showPeriodFields && (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                    Quarterly Tracking
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    No breakdown needed. The Quarterly Goal above will be tracked as a single metric for the entire quarter.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Rock <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.related_rock_id ? rocks.find(r => r.id === formData.related_rock_id)?.rock || '' : ''}
                    onChange={(e) => {
                      const rock = rocks.find(r => r.rock.toLowerCase().includes(e.target.value.toLowerCase()));
                      setFormData({ ...formData, related_rock_id: rock?.id || '' });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Select from list or type rock name"
                    list="rocks"
                  />
                  <datalist id="rocks">
                    {rocks.map(rock => (
                      <option key={rock.id} value={rock.rock} />
                    ))}
                  </datalist>
                </div>
              </>
            )}

            {showPeriodFields && (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                    {formData.time_period_type === 'weekly' ? 'Weekly' : 'Monthly'} Tracking
                  </h4>
                  {errors.period_goals && (
                    <p className="text-red-500 text-sm mb-3">{errors.period_goals}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {periods.map((period) => (
                      <div key={period.periodNumber}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {period.label}
                        </label>
                        <div className="relative">
                          {getGoalPrefix() && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                              {getGoalPrefix()}
                            </span>
                          )}
                          <input
                            type="text"
                            value={formatGoalValue(periodGoals[period.periodNumber] || 0)}
                            onChange={(e) => setPeriodGoals({
                              ...periodGoals,
                              [period.periodNumber]: parseGoalValue(e.target.value)
                            })}
                            className={`w-full border border-gray-300 rounded-md py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              getGoalPrefix() ? 'pl-5 pr-2' : getGoalSuffix() ? 'pl-2 pr-6' : 'px-2'
                            }`}
                            placeholder={getGoalPlaceholder()}
                          />
                          {getGoalSuffix() && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                              {getGoalSuffix()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {period.startDate} - {period.endDate}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Rock <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.related_rock_id ? rocks.find(r => r.id === formData.related_rock_id)?.rock || '' : ''}
                    onChange={(e) => {
                      const rock = rocks.find(r => r.rock.toLowerCase().includes(e.target.value.toLowerCase()));
                      setFormData({ ...formData, related_rock_id: rock?.id || '' });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Select from list or type rock name"
                    list="rocks"
                  />
                  <datalist id="rocks">
                    {rocks.map(rock => (
                      <option key={rock.id} value={rock.rock} />
                    ))}
                  </datalist>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium text-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              disabled={isSaving}
            >
              {isSaving ? 'Adding...' : 'Add Metric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
