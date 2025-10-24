import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User, Metric, RockWithDetails } from '../lib/supabase';

interface AddIssueModalProps {
  onClose: () => void;
  onAdd: (issue: {
    issue: string;
    priority: 'high' | 'medium' | 'low';
    owner: string;
    is_rock: boolean;
    is_metric: boolean;
    related_metric_id: string | null;
    related_rock_id: string | null;
  }) => void;
  users: User[];
  metrics: Metric[];
  rocks: RockWithDetails[];
}

export function AddIssueModal({ onClose, onAdd, users, metrics, rocks }: AddIssueModalProps) {
  const [issueText, setIssueText] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedOwner, setSelectedOwner] = useState('Unassigned');
  const [issueType, setIssueType] = useState<'none' | 'metric' | 'rock' | 'both'>('none');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [selectedRockId, setSelectedRockId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueText.trim()) {
      alert('Please enter an issue description');
      return;
    }

    if (issueType === 'metric' && !selectedMetricId) {
      alert('Please select a metric');
      return;
    }

    if (issueType === 'rock' && !selectedRockId) {
      alert('Please select a rock');
      return;
    }

    if (issueType === 'both' && (!selectedMetricId || !selectedRockId)) {
      alert('Please select both a metric and a rock');
      return;
    }

    onAdd({
      issue: issueText,
      priority,
      owner: selectedOwner,
      is_metric: issueType === 'metric' || issueType === 'both',
      is_rock: issueType === 'rock' || issueType === 'both',
      related_metric_id: (issueType === 'metric' || issueType === 'both') ? selectedMetricId : null,
      related_rock_id: (issueType === 'rock' || issueType === 'both') ? selectedRockId : null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add New Issue</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Description
            </label>
            <input
              type="text"
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter issue description..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Unassigned">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={`${user.first_name} ${user.last_name}`}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIssueType('none')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  issueType === 'none'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setIssueType('metric')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  issueType === 'metric'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => setIssueType('rock')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  issueType === 'rock'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                Rock
              </button>
              <button
                type="button"
                onClick={() => setIssueType('both')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  issueType === 'both'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-700 hover:from-blue-200 hover:to-purple-200'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {(issueType === 'metric' || issueType === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Metric
              </label>
              <select
                value={selectedMetricId}
                onChange={(e) => setSelectedMetricId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select a Metric --</option>
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.metric_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(issueType === 'rock' || issueType === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Rock
              </label>
              <select
                value={selectedRockId}
                onChange={(e) => setSelectedRockId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select a Rock --</option>
                {rocks.map((rock) => (
                  <option key={rock.id} value={rock.id}>
                    {rock.rock}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
