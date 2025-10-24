import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Metric } from '../lib/supabase';
import { useUsers } from '../hooks/useUsers';
import { useRocks } from '../hooks/useRocks';
import { QUARTERS, QUARTER_MONTHS, type Quarter } from '../utils/metricPeriods';

const CATEGORIES = [
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Customer Success',
  'Product',
  'Engineering'
];

interface EditMetricModalProps {
  metric: Metric;
  onClose: () => void;
  onSave: (metricId: string, updates: Partial<Metric>) => Promise<void>;
}

export function EditMetricModal({ metric, onClose, onSave }: EditMetricModalProps) {
  const { users } = useUsers();
  const { rocks } = useRocks();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const leadershipUsers = users.filter(u => u.role === 'super_user');

  const [formData, setFormData] = useState({
    metric_name: metric.metric_name,
    category: metric.category || '',
    owner_id: metric.owner_id || '',
    collaborator_id: metric.collaborator_id || '',
    measurement_type: metric.measurement_type,
    quarterly_goal: metric.quarterly_goal,
    time_period_type: metric.time_period_type,
    quarter: metric.quarter,
    year: metric.year,
    related_rock_id: metric.related_rock_id || ''
  });

  function validateForm(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!formData.metric_name.trim()) {
      newErrors.metric_name = 'Metric name is required';
    }
    if (formData.quarterly_goal <= 0) {
      newErrors.quarterly_goal = 'Quarterly goal must be greater than 0';
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
      await onSave(metric.id, {
        metric_name: formData.metric_name,
        category: formData.category || null,
        owner_id: formData.owner_id || null,
        collaborator_id: formData.collaborator_id || null,
        measurement_type: formData.measurement_type,
        quarterly_goal: formData.quarterly_goal,
        time_period_type: formData.time_period_type,
        quarter: formData.quarter,
        year: formData.year,
        related_rock_id: formData.related_rock_id || null
      });
      onClose();
    } catch (error) {
      console.error('Error updating metric:', error);
      alert('Failed to update metric. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Edit Metric</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
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
              list="collaborators-edit"
            />
            <datalist id="collaborators-edit">
              {users.map(user => (
                <option key={user.id} value={user.name} />
              ))}
            </datalist>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quarterly Goal
            </label>
            <div className="relative">
              {getGoalPrefix() && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {getGoalPrefix()}
                </span>
              )}
              <input
                type="number"
                value={formData.quarterly_goal}
                onChange={(e) => setFormData({ ...formData, quarterly_goal: parseFloat(e.target.value) || 0 })}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getGoalPrefix() ? 'pl-6' : ''
                } ${getGoalSuffix() ? 'pr-6' : ''} ${
                  errors.quarterly_goal ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={getGoalPlaceholder()}
                step={formData.measurement_type === 'percentage' ? '0.1' : '1'}
              />
              {getGoalSuffix() && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {getGoalSuffix()}
                </span>
              )}
            </div>
            {errors.quarterly_goal && <p className="text-red-500 text-xs mt-1">{errors.quarterly_goal}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Rock <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              value={formData.related_rock_id}
              onChange={(e) => setFormData({ ...formData, related_rock_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Rock --</option>
              {rocks.map(rock => (
                <option key={rock.id} value={rock.id}>{rock.rock}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-600 mb-2">
              <span className="font-semibold">Note:</span> Time period settings (Quarter, Year, Period Type) cannot be changed after creation.
              To change these settings, please create a new metric.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quarter</label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                  {formData.quarter}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                  {formData.year}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Period Type</label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 capitalize">
                  {formData.time_period_type}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
