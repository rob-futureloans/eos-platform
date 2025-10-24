import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Issue {
  id: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  owner: string;
  status: 'open' | 'in-progress' | 'solved';
  is_rock?: boolean;
  is_metric?: boolean;
  related_metric_id?: string;
  related_rock_id?: string;
}

interface MeetingSaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  onConfirm: (issuesToKeep: string[], issuesToRemove: string[]) => Promise<void>;
  users: Array<{ id: string; name: string }>;
}

export function MeetingSaveConfirmationModal({
  isOpen,
  onClose,
  issues,
  onConfirm,
  users
}: MeetingSaveConfirmationModalProps) {
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleIssue = (issueId: string) => {
    const newSelected = new Set(selectedToRemove);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedToRemove(newSelected);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const issuesToKeep = issues
        .filter(issue => !selectedToRemove.has(issue.id))
        .map(issue => issue.id);
      
      const issuesToRemove = Array.from(selectedToRemove);
      
      await onConfirm(issuesToKeep, issuesToRemove);
      setSelectedToRemove(new Set()); // Reset selection
      onClose();
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('Failed to save meeting. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Categorize issues by status
  const solvedIssues = issues.filter(i => i.status === 'solved');
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in-progress');

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unassigned';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Review Issues Before Saving Meeting</h2>
            <p className="text-sm text-blue-100 mt-1">
              Select issues to remove from the Issues list
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-lg p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {issues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No issues to review</p>
              <p className="text-sm mt-2">Your Issues list is empty</p>
            </div>
          ) : (
            <>
              {/* Solved Issues Section */}
              {solvedIssues.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      ✅ Solved Issues ({solvedIssues.length})
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    These issues were solved during the meeting. Consider archiving them:
                  </p>
                  <div className="space-y-3">
                    {solvedIssues.map(issue => (
                      <label
                        key={issue.id}
                        className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedToRemove.has(issue.id)
                            ? 'border-green-500 bg-green-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedToRemove.has(issue.id)}
                          onChange={() => toggleIssue(issue.id)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mt-0.5 flex-shrink-0"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-gray-900 font-medium">{issue.issue}</p>
                            {selectedToRemove.has(issue.id) && (
                              <span className="text-xs text-green-700 font-semibold whitespace-nowrap bg-green-100 px-2 py-1 rounded">
                                Will Archive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                              {issue.priority}
                            </span>
                            <span>Owner: {getUserName(issue.owner)}</span>
                            {issue.is_rock && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                Rock-related
                              </span>
                            )}
                            {issue.is_metric && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                Metric-related
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Issues Section */}
              {openIssues.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      📋 Open Issues ({openIssues.length})
                    </h3>
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    These issues are still open. Only remove if no longer relevant:
                  </p>
                  <div className="space-y-3">
                    {openIssues.map(issue => (
                      <label
                        key={issue.id}
                        className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedToRemove.has(issue.id)
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedToRemove.has(issue.id)}
                          onChange={() => toggleIssue(issue.id)}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mt-0.5 flex-shrink-0"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-gray-900 font-medium">{issue.issue}</p>
                            {selectedToRemove.has(issue.id) && (
                              <span className="text-xs text-red-700 font-semibold whitespace-nowrap bg-red-100 px-2 py-1 rounded">
                                Will Remove
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                              {issue.priority}
                            </span>
                            <span>Owner: {getUserName(issue.owner)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              issue.status === 'in-progress' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {issue.status}
                            </span>
                            {issue.is_rock && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                Rock-related
                              </span>
                            )}
                            {issue.is_metric && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                Metric-related
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-700">
              {selectedToRemove.size > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600">{selectedToRemove.size}</span>
                  <span>issue{selectedToRemove.size !== 1 ? 's' : ''} will be removed</span>
                </div>
              ) : (
                <span className="text-gray-600">All issues will be kept</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {issues.length - selectedToRemove.size} of {issues.length} will remain
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving Meeting...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save Meeting
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
