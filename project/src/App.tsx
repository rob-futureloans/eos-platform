import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Calendar, TrendingUp, Users, Plus, Download, Trash2, Clock, Target, BarChart3, FileText, X, Settings, Save, Copy, Sparkles, Play, Pause, ChevronRight, LogOut } from 'lucide-react';
import { useRocks } from './hooks/useRocks';
import { useScorecard } from './hooks/useScorecard';
import { useMetrics } from './hooks/useMetrics';
import { useIssues } from './hooks/useIssues';
import { useL10Notes } from './hooks/useL10Notes';
import { useUsers } from './hooks/useUsers';
import { useActiveSession } from './hooks/useActiveSession';
import { useMeetingOffTrackMetrics } from './hooks/useMeetingOffTrackMetrics';
import { useAuth } from './contexts/AuthContext';
import { AddRockModal } from './components/AddRockModal';
import { AddIssueModal } from './components/AddIssueModal';
import { MeetingSaveConfirmationModal } from './components/MeetingSaveConfirmationModal';
import { AdminPage } from './components/AdminPage';
import { ScorecardPage } from './components/ScorecardPage';
import { LoginPage } from './components/LoginPage';
import SetupAuthPage from './components/SetupAuthPage';
import { RockWithDetails, supabase, MeetingOffTrackMetric } from './lib/supabase';
import { calculateVariance, calculateVariancePercent, calculateStatus } from './utils/scorecardCalculations';

function App() {
  if (window.location.pathname === '/setup') {
    return <SetupAuthPage />;
  }

  return <MainApp />;
}

function MainApp() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp user={user} signOut={signOut} />;
}

function AuthenticatedApp({ user, signOut }: { user: any; signOut: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddRock, setShowAddRock] = useState(false);
  const [selectedRockForDetail, setSelectedRockForDetail] = useState<RockWithDetails | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMeetingTimestamp, setSelectedMeetingTimestamp] = useState<string | null>(null);
  const [l10Notes, setL10Notes] = useState<Record<string, string>>({});
  const [savedMeetings, setSavedMeetings] = useState<Array<{date: string, timestamp: string, displayName: string}>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [sectionTime, setSectionTime] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [issuesForReview, setIssuesForReview] = useState<any[]>([]);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [meetingSaved, setMeetingSaved] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<{date: string, timestamp: string} | null>(null);
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  const [trendingSelections, setTrendingSelections] = useState<Record<string, 'red' | 'yellow' | 'green'>>({});
  const [isSavingTrending, setIsSavingTrending] = useState(false);
  const [trendingSummary, setTrendingSummary] = useState<string>('');
  const [showOffTrackModal, setShowOffTrackModal] = useState(false);
  const [selectedOffTrackMetrics, setSelectedOffTrackMetrics] = useState<Set<string>>(new Set());
  const [issueFilter, setIssueFilter] = useState<'all' | 'metric' | 'rock' | 'both'>('all');
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMetrics, setDuplicateMetrics] = useState<string[]>([]);

  const { rocks, loading: rocksLoading, addRock, updateRock, deleteRock, toggleMilestone, toggleActionItem, updateMilestone, updateActionItem } = useRocks();
  const { users } = useUsers();
  const { scorecard, loading: scorecardLoading } = useScorecard();
  const { metrics, goals } = useMetrics();
  const { issues, addIssue } = useIssues();
  const { notes: l10NotesData, updateNote } = useL10Notes(selectedMeetingDate, selectedMeetingTimestamp);
  const { isSuperUser } = useActiveSession();
  const { offTrackMetrics, addOffTrackMetrics, removeOffTrackMetric } = useMeetingOffTrackMetrics(selectedMeetingTimestamp);

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  }

  const meetingSections = [
    { key: 'segue', title: '1. Segue (5 min)', desc: 'Share good news - personal and professional', timeLimit: 5 },
    { key: 'scorecard', title: '2. Scorecard Review (5 min)', desc: 'Review key metrics, identify trends (no discussion)', timeLimit: 5 },
    { key: 'rockReview', title: '3. Rock Review (5 min)', desc: 'On track / off track only - no discussion', timeLimit: 5 },
    { key: 'customerEmployee', title: '4. Customer/Employee Headlines (5 min)', desc: 'Share customer and employee feedback highlights', timeLimit: 5 },
    { key: 'todo', title: '5. To-Do List (5 min)', desc: 'Review action items from last week', timeLimit: 5 },
    { key: 'ids', title: '6. IDS - Identify, Discuss, Solve (60 min)', desc: 'Focus on top 3 issues. Use IDS methodology.', timeLimit: 60 },
    { key: 'conclude', title: '7. Conclude (5 min)', desc: 'Recap todos, rate meeting 1-10, confirm next meeting', timeLimit: 5 },
  ];

  const filteredRocks = useMemo(() => {
    if (selectedUserFilter === 'all') return rocks;
    return rocks.filter(rock => rock.owner === selectedUserFilter);
  }, [rocks, selectedUserFilter]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'on-track': return 'bg-green-100 text-green-800 border-green-300';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'off-track': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const calculateMilestoneProgress = (rock: RockWithDetails) => {
    if (!rock.milestones || rock.milestones.length === 0) return 0;
    const completed = rock.milestones.filter(m => m.complete).length;
    return Math.round((completed / rock.milestones.length) * 100);
  };

  async function handleUpdateDueDate(rockId: string, newDueDate: string) {
    try {
      await updateRock(rockId, { due_date: newDueDate });
      setEditingDueDate(null);
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  }

  useEffect(() => {
    const notesObj: Record<string, string> = {};
    l10NotesData.forEach((note) => {
      notesObj[note.section] = note.notes;
    });
    setL10Notes(notesObj);
  }, [l10NotesData]);

  useEffect(() => {
    loadSavedMeetings();
  }, []);

  async function loadSavedMeetings() {
    try {
      const { data } = await supabase
        .from('l10_notes')
        .select('meeting_date, meeting_timestamp')
        .order('meeting_timestamp', { ascending: false });

      if (data) {
        const uniqueMeetings = new Map<string, {date: string, timestamp: string, displayName: string}>();

        data.forEach((item) => {
          const key = `${item.meeting_date}-${item.meeting_timestamp}`;
          if (!uniqueMeetings.has(key)) {
            const timestamp = new Date(item.meeting_timestamp);
            const displayName = `${item.meeting_date} at ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            uniqueMeetings.set(key, {
              date: item.meeting_date,
              timestamp: item.meeting_timestamp,
              displayName
            });
          }
        });

        setSavedMeetings(Array.from(uniqueMeetings.values()));
      }
    } catch (error) {
      console.error('Failed to load saved meetings:', error);
    }
  }

  async function handleSaveMeeting() {
    // Show the confirmation modal with current issues
    setIssuesForReview(issues);
    setShowSaveConfirmation(true);
  }

  async function handleConfirmSave(issuesToKeep: string[], issuesToRemove: string[]) {
    setIsSaving(true);
    try {
      // 1. Remove selected issues from database
      if (issuesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('issues')
          .delete()
          .in('id', issuesToRemove);
        
        if (deleteError) throw deleteError;
      }

      // 2. Save meeting notes to database
      const timestamp = selectedMeetingTimestamp || new Date().toISOString();

      if (selectedMeetingTimestamp) {
        await supabase
          .from('l10_notes')
          .delete()
          .eq('meeting_timestamp', selectedMeetingTimestamp);
      }

      const insertData = Object.entries(l10Notes).map(([section, notes]) => ({
        section,
        notes: notes || '',
        meeting_date: selectedMeetingDate,
        meeting_timestamp: timestamp
      }));

      if (insertData.length > 0) {
        const { error } = await supabase
          .from('l10_notes')
          .insert(insertData);

        if (error) throw error;
      }

      // 3. Save off-track metrics
      if (selectedOffTrackMetrics.size > 0) {
        await addOffTrackMetrics(Array.from(selectedOffTrackMetrics));
      }

      // 4. Success - reload and notify
      setSelectedMeetingTimestamp(timestamp);
      await loadSavedMeetings();
      setIsSaving(false);
      setMeetingSaved(true);
      alert('Meeting saved successfully! Issues have been updated.');
      
    } catch (error) {
      console.error('Error saving meeting:', error);
      throw error; // Let the modal handle the error
    } finally {
      setIsSaving(false);
      setShowSaveConfirmation(false);
    }
  }

  async function handleGenerateSummaryAfterSave() {
    setShowSaveConfirmation(false);
    await handleSummarizeMeeting();
  }

  function handleSkipSummary() {
    setShowSaveConfirmation(false);
    clearMeetingData();
    alert('Meeting saved successfully!');
  }

  function clearMeetingData() {
    setL10Notes({});
    if (meetingStarted) {
      stopMeeting();
    }
    setCurrentSectionIndex(0);
    setSectionTime(0);
    setTotalTime(0);
    setMeetingSaved(false);
  }

  async function handleSummarizeMeeting() {
    setIsSummarizing(true);
    setShowSummary(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-meeting`;
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const onTrackRocks = rocks.filter(r => r.status === 'on-track');
      const offTrackRocks = rocks.filter(r => r.status === 'off-track');

      const meetingData = {
        date: selectedMeetingDate,
        sections: l10Notes,
        issues: issues,
        rocks: [
          ...onTrackRocks.map(r => ({ title: r.rock, owner: r.owner || 'Unassigned', status: 'On Track' })),
          ...offTrackRocks.map(r => ({ title: r.rock, owner: r.owner || 'Unassigned', status: 'Off Track' }))
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingData }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }

      const data = await response.json();
      setMeetingSummary(data.summary);

      if (!data.isAiGenerated) {
        console.log('Using basic summary format (AI not available)');
      }
    } catch (error) {
      console.error('Failed to summarize meeting:', error);
      alert('Failed to generate summary. Please try again.');
      setShowSummary(false);
    } finally {
      setIsSummarizing(false);
    }
  }

  function handleCopySummary() {
    navigator.clipboard.writeText(meetingSummary);
    setSummaryCopied(true);
    alert('Summary copied to clipboard!');
  }

  function handleCloseSummary() {
    if (!summaryCopied) {
      setShowCloseConfirmation(true);
    } else {
      closeSummaryAndClear();
    }
  }

  function closeSummaryAndClear() {
    setShowSummary(false);
    setShowCloseConfirmation(false);
    setMeetingSummary('');
    setSummaryCopied(false);
    clearMeetingData();
    alert('Meeting saved successfully!');
  }

  function cancelCloseSummary() {
    setShowCloseConfirmation(false);
  }

  function handleMeetingDateChange(meeting: {date: string, timestamp: string}) {
    setSelectedMeetingDate(meeting.date);
    setSelectedMeetingTimestamp(meeting.timestamp);
    setShowSummary(false);
    setMeetingSummary('');
    setMeetingSaved(false);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getCurrentOffTrackMetrics() {
    const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000);
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    const offTrackMetrics = metrics
      .map(metric => {
        let goal;
        let periodNumber;

        if (metric.time_period_type === 'weekly') {
          goal = goals.find(
            g => g.metric_id === metric.id &&
            g.period_number === currentWeek &&
            g.period_type === 'week'
          );
          periodNumber = currentWeek;
        } else if (metric.time_period_type === 'monthly') {
          goal = goals.find(
            g => g.metric_id === metric.id &&
            g.period_number === currentMonth &&
            g.period_type === 'month'
          );
          periodNumber = currentMonth;
        } else if (metric.time_period_type === 'quarterly') {
          goal = goals.find(
            g => g.metric_id === metric.id &&
            g.period_number === currentQuarter &&
            g.period_type === 'quarter'
          );
          periodNumber = currentQuarter;
        }

        const actual = goal?.actual_value ?? null;
        const goalValue = goal?.goal_value ?? metric.quarterly_goal;
        const variance = calculateVariance(actual, goalValue);
        const variancePercent = calculateVariancePercent(actual, goalValue);
        const status = calculateStatus(actual, goalValue, metric.measurement_type);

        return {
          metric,
          goal,
          actual,
          goalValue,
          variance,
          variancePercent,
          status,
          periodNumber: periodNumber || 0
        };
      })
      .filter(m => m.status === 'off-track');

    return offTrackMetrics;
  }

  function startMeeting() {
    const offTrackMetrics = getCurrentOffTrackMetrics();

    if (offTrackMetrics.length > 0) {
      setShowOffTrackModal(true);
    } else {
      proceedWithMeetingStart();
    }
  }

  function proceedWithMeetingStart() {
    setMeetingStarted(true);
    setTotalTime(0);
    setSectionTime(0);
    setCurrentSectionIndex(0);

    if (!selectedMeetingTimestamp) {
      setSelectedMeetingTimestamp(new Date().toISOString());
    }

    const interval = setInterval(() => {
      setTotalTime(prev => prev + 1);
      setSectionTime(prev => prev + 1);
    }, 1000);

    setTimerInterval(interval);
  }

  async function handleConfirmOffTrackMetrics() {
    const offTrackMetrics = getCurrentOffTrackMetrics();
    const metricsToAdd = offTrackMetrics.filter(m => selectedOffTrackMetrics.has(m.metric.id));

    if (metricsToAdd.length > 0) {
      const duplicates: string[] = [];
      const nonDuplicates = [];

      for (const m of metricsToAdd) {
        const existingIssue = issues.find(issue =>
          issue.related_metric_id === m.metric.id && issue.status === 'open'
        );
        if (existingIssue) {
          duplicates.push(m.metric.metric_name);
        } else {
          nonDuplicates.push(m);
        }
      }

      if (duplicates.length > 0) {
        setDuplicateMetrics(duplicates);
        setShowDuplicateWarning(true);
      }

      if (nonDuplicates.length > 0) {
        const timestamp = selectedMeetingTimestamp || new Date().toISOString();
        const meetingDate = selectedMeetingDate;

        const metricsData = nonDuplicates.map(m => ({
          meeting_date: meetingDate,
          meeting_timestamp: timestamp,
          metric_id: m.metric.id,
          metric_name: m.metric.metric_name,
          goal_value: m.goalValue,
          actual_value: m.actual || 0,
          variance: m.variance || 0,
          variance_percent: m.variancePercent || 0,
          period_type: 'week' as const,
          period_number: m.periodNumber,
          owner_id: m.metric.owner_id || ''
        }));

        try {
          await addOffTrackMetrics(metricsData);

          for (const m of nonDuplicates) {
            const ownerUser = users.find(u => u.id === m.metric.owner_id);
            const ownerName = ownerUser ? `${ownerUser.first_name} ${ownerUser.last_name}` : 'Unassigned';
            const hasRelatedRock = !!m.metric.related_rock_id;

            await addIssue({
              issue: `${m.metric.metric_name} (Off Track: ${m.variancePercent?.toFixed(1)}%)`,
              priority: 'high',
              owner: ownerName,
              is_metric: true,
              is_rock: hasRelatedRock,
              related_metric_id: m.metric.id,
              related_rock_id: m.metric.related_rock_id
            });
          }
        } catch (error) {
          console.error('Error adding off-track metrics:', error);
          alert('Failed to add off-track metrics. Please try again.');
        }
      }
    }

    setShowOffTrackModal(false);
    setSelectedOffTrackMetrics(new Set());
    proceedWithMeetingStart();
  }

  function handleSkipOffTrackMetrics() {
    setShowOffTrackModal(false);
    setSelectedOffTrackMetrics(new Set());
    proceedWithMeetingStart();
  }

  function handleStopMeeting() {
    if (!meetingSaved && Object.values(l10Notes).some(note => note.trim())) {
      setShowStopConfirmation(true);
    } else {
      stopMeeting();
    }
  }

  function stopMeeting() {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setMeetingStarted(false);
    setCurrentSectionIndex(0);
    setTotalTime(0);
    setSectionTime(0);
  }

  function confirmStopWithoutSaving() {
    setShowStopConfirmation(false);
    stopMeeting();
  }

  function cancelStop() {
    setShowStopConfirmation(false);
  }

  function handleDeleteMeeting(meeting: {date: string, timestamp: string}) {
    setMeetingToDelete(meeting);
    setShowDeleteConfirmation(true);
  }

  async function confirmDeleteMeeting() {
    if (!meetingToDelete) return;

    try {
      const { error: notesError } = await supabase
        .from('l10_notes')
        .delete()
        .eq('meeting_date', meetingToDelete.date)
        .eq('meeting_timestamp', meetingToDelete.timestamp);

      if (notesError) throw notesError;

      const { error: trendingError } = await supabase
        .from('scorecard_trending')
        .delete()
        .eq('meeting_timestamp', meetingToDelete.timestamp);

      if (trendingError) throw trendingError;

      await loadSavedMeetings();

      if (selectedMeetingTimestamp === meetingToDelete.timestamp) {
        clearMeetingData();
      }

      setShowDeleteConfirmation(false);
      setMeetingToDelete(null);
      alert('Meeting deleted successfully!');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      alert('Failed to delete meeting. Please try again.');
    }
  }

  function cancelDeleteMeeting() {
    setShowDeleteConfirmation(false);
    setMeetingToDelete(null);
  }

  async function loadTrendingData() {
    if (!selectedMeetingTimestamp) return;

    try {
      const { data, error } = await supabase
        .from('scorecard_trending')
        .select('*, scorecard_metrics(metric)')
        .eq('meeting_timestamp', selectedMeetingTimestamp);

      if (error) throw error;

      const selections: Record<string, 'red' | 'yellow' | 'green'> = {};
      data?.forEach((item) => {
        selections[item.metric_id] = item.status;
      });
      setTrendingSelections(selections);

      if (data && data.length > 0) {
        setTrendingSummary(JSON.stringify(data));
      } else {
        setTrendingSummary('');
      }
    } catch (error) {
      console.error('Failed to load trending data:', error);
    }
  }

  async function handleSaveTrending() {
    if (!selectedMeetingTimestamp) {
      alert('Please select or start a meeting first.');
      return;
    }

    const oldScorecard = scorecard;
    const metricsToCheck = metrics.length > 0 ? metrics : oldScorecard;

    const unselectedMetrics = metricsToCheck.filter(
      metric => !trendingSelections[metric.id]
    );

    if (unselectedMetrics.length > 0) {
      const metricNames = unselectedMetrics.map(m => m.name || m.metric).join(', ');
      alert(`Please select a trending status for all metrics. Missing: ${metricNames}`);
      return;
    }

    setIsSavingTrending(true);
    try {
      const promises = Object.entries(trendingSelections).map(([metricId, status]) => {
        return supabase
          .from('scorecard_trending')
          .upsert({
            meeting_date: selectedMeetingDate,
            meeting_timestamp: selectedMeetingTimestamp,
            metric_id: metricId,
            status: status,
          }, {
            onConflict: 'meeting_timestamp,metric_id',
          });
      });

      await Promise.all(promises);
      await loadTrendingData();
      setShowTrendingModal(false);
      alert('Trending data saved successfully!');
    } catch (error) {
      console.error('Failed to save trending data:', error);
      alert('Failed to save trending data. Please try again.');
    } finally {
      setIsSavingTrending(false);
    }
  }

  useEffect(() => {
    if (showTrendingModal) {
      loadTrendingData();
    }
  }, [showTrendingModal, selectedMeetingTimestamp]);

  useEffect(() => {
    loadTrendingData();
  }, [selectedMeetingTimestamp]);

  function nextSection() {
    if (currentSectionIndex < meetingSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setSectionTime(0);
    }
  }

  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'on-track': return <CheckCircle className="w-5 h-5" />;
      case 'at-risk': return <AlertCircle className="w-5 h-5" />;
      case 'off-track': return <XCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(rocks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eos-rocks-export.json';
    link.click();
  };

  const onTrackCount = rocks.filter(r => r.status === 'on-track').length;
  const atRiskCount = rocks.filter(r => r.status === 'at-risk').length;
  const offTrackCount = rocks.filter(r => r.status === 'off-track').length;
  const avgProgress = rocks.length > 0 ? Math.round(rocks.reduce((acc, r) => acc + r.progress, 0) / rocks.length) : 0;

  if (rocksLoading || scorecardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EOS Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation continues in next part... */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-blue-600">EOS Platform</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('scorecard')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'scorecard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Scorecard
              </button>
              <button
                onClick={() => setActiveTab('rocks')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'rocks'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                All Rocks
              </button>
              <button
                onClick={() => setActiveTab('l10')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'l10'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                L10 Meeting
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Admin
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user.name}</span>
              {user.role === 'super_user' && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 inline mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Q4 2025 Rocks Dashboard</h2>
              <p className="text-gray-600">Week 4 of 13 - Track quarterly priorities and accountability</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Rocks</p>
                    <p className="text-3xl font-bold text-gray-900">{rocks.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">On Track</p>
                    <p className="text-3xl font-bold text-green-600">{onTrackCount}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">At Risk</p>
                    <p className="text-3xl font-bold text-yellow-600">{atRiskCount}</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
                    <p className="text-3xl font-bold text-purple-600">{avgProgress}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rocks.map((rock) => (
                <div
                  key={rock.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedRockForDetail(rock)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {rock.owner}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getStatusColor(rock.status)}`}>
                        {getStatusIcon(rock.status)}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{rock.progress}%</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{rock.rock}</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${rock.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{rock.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scorecard' && <ScorecardPage />}

        {activeTab === 'rocks' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Rocks - Detailed View</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddRock(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Rock
                </button>
                <label className="text-sm font-medium text-gray-700">Filter by User:</label>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {filteredRocks.map((rock) => (
                <div key={rock.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {rock.owner}
                          </span>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full border flex items-center gap-1 ${getStatusColor(rock.status)}`}>
                            {getStatusIcon(rock.status)}
                            {rock.status.replace('-', ' ').toUpperCase()}
                          </span>
                          {editingDueDate === rock.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                defaultValue={rock.due_date}
                                onBlur={(e) => handleUpdateDueDate(rock.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateDueDate(rock.id, e.currentTarget.value);
                                  } else if (e.key === 'Escape') {
                                    setEditingDueDate(null);
                                  }
                                }}
                                className="text-xs border border-blue-500 rounded px-2 py-1"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span
                              className="text-xs text-gray-500 cursor-pointer hover:text-blue-600"
                              onClick={() => setEditingDueDate(rock.id)}
                              title="Click to edit due date"
                            >
                              Due: {rock.due_date}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{rock.rock}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Measurable:</span> {rock.measurable}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex items-start gap-2">
                        <div>
                          <div className="text-3xl font-bold text-gray-900">{calculateMilestoneProgress(rock)}%</div>
                          <div className="text-xs text-gray-500">Week {rock.week_number}/13</div>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this Rock?')) {
                              await deleteRock(rock.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress:</span>
                        <span className="text-sm text-gray-600">{calculateMilestoneProgress(rock)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${calculateMilestoneProgress(rock)}%` }}
                        ></div>
                      </div>
                    </div>

                    {rock.milestones && rock.milestones.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Milestones:</p>
                        <div className="space-y-2">
                          {rock.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={milestone.complete}
                                onChange={() => toggleMilestone(milestone.id, milestone.complete)}
                                className="w-4 h-4 text-blue-600 rounded flex-shrink-0"
                              />
                              <input
                                type="text"
                                value={milestone.task}
                                onChange={(e) => updateMilestone(milestone.id, { task: e.target.value })}
                                className={`text-sm flex-1 border-0 border-b border-gray-200 focus:border-blue-500 focus:outline-none ${milestone.complete ? 'line-through text-gray-500' : 'text-gray-700'}`}
                              />
                              <input
                                type="date"
                                value={milestone.due_date}
                                onChange={(e) => updateMilestone(milestone.id, { due_date: e.target.value })}
                                className="text-xs text-gray-500 border-0 border-b border-gray-200 focus:border-blue-500 focus:outline-none w-32"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rock.actionItems && rock.actionItems.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Action Items:</p>
                        <div className="space-y-2">
                          {rock.actionItems.map((action) => (
                            <div key={action.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={action.complete}
                                onChange={() => toggleActionItem(action.id, action.complete)}
                                className="w-4 h-4 text-green-600 rounded flex-shrink-0"
                              />
                              <input
                                type="text"
                                value={action.task}
                                onChange={(e) => updateActionItem(action.id, { task: e.target.value })}
                                className={`text-sm flex-1 border-0 border-b border-gray-200 focus:border-blue-500 focus:outline-none ${action.complete ? 'line-through text-gray-500' : 'text-gray-700'}`}
                              />
                              <input
                                type="text"
                                value={action.owner}
                                onChange={(e) => updateActionItem(action.id, { owner: e.target.value })}
                                className="text-xs text-gray-500 border-0 border-b border-gray-200 focus:border-blue-500 focus:outline-none w-32"
                                list="action-collaborators"
                              />
                              <datalist id="action-collaborators">
                                {users.map((user) => (
                                  <option key={user.id} value={user.name} />
                                ))}
                              </datalist>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Latest Update:</p>
                      <textarea
                        value={rock.notes}
                        onChange={(e) => updateRock(rock.id, { notes: e.target.value })}
                        className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRock(rock.id, { status: 'on-track' })}
                        className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
                      >
                        On Track
                      </button>
                      <button
                        onClick={() => updateRock(rock.id, { status: 'at-risk' })}
                        className="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition"
                      >
                        At Risk
                      </button>
                      <button
                        onClick={() => updateRock(rock.id, { status: 'off-track' })}
                        className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                      >
                        Off Track
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* L10 Meeting Tab - Will continue in next section */}
        {activeTab === 'l10' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Weekly L10 Meeting</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Meeting Date:</label>
                  <select
                    value={selectedMeetingTimestamp || 'new'}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        handleMeetingDateChange({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() });
                      } else {
                        const meeting = savedMeetings.find(m => m.timestamp === e.target.value);
                        if (meeting) {
                          handleMeetingDateChange(meeting);
                        }
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">
                      New Meeting ({new Date().toISOString().split('T')[0]})
                    </option>
                    {savedMeetings.map((meeting) => (
                      <option key={meeting.timestamp} value={meeting.timestamp}>
                        {meeting.displayName}
                      </option>
                    ))}
                  </select>
                  {isSuperUser && selectedMeetingTimestamp && selectedMeetingTimestamp !== '' && (
                    <button
                      onClick={() => handleDeleteMeeting({ date: selectedMeetingDate, timestamp: selectedMeetingTimestamp })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!meetingStarted ? (
                  <button
                    onClick={startMeeting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Meeting
                  </button>
                ) : (
                  <button
                    onClick={handleStopMeeting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Stop Meeting
                  </button>
                )}
                <button
                  onClick={handleSaveMeeting}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Meeting'}
                </button>
                <button
                  onClick={handleSummarizeMeeting}
                  disabled={isSummarizing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSummarizing ? 'Summarizing...' : 'Summarize'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-blue-900">90-Minute Meeting Agenda</h3>
                  <p className="text-sm text-blue-700">Same day, same time, same agenda every week</p>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-3xl font-bold ${totalTime > 5400 ? 'text-red-600' : 'text-blue-900'}`}>
                    {formatTime(totalTime)}
                  </div>
                  <p className="text-sm text-blue-700">Total Time (90:00 limit)</p>
                </div>
              </div>
            </div>

            {meetingStarted && (
              <div className="bg-white border border-blue-500 rounded-lg p-6 mb-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {meetingSections[currentSectionIndex].title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {meetingSections[currentSectionIndex].desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${
                        sectionTime > meetingSections[currentSectionIndex].timeLimit * 60
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {formatTime(sectionTime)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {meetingSections[currentSectionIndex].timeLimit}:00 limit
                      </p>
                    </div>
                    {currentSectionIndex < meetingSections.length - 1 && (
                      <button
                        onClick={nextSection}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {meetingSections.map((section, index) => (
                <div key={section.key} className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{section.title}</h4>
                      {section.key === 'scorecard' && trendingSummary && (() => {
                        try {
                          const trendingData = JSON.parse(trendingSummary);
                          return (
                            <div className="flex flex-wrap gap-2">
                              {trendingData.map((item: any) => {
                                const bgColor = item.status === 'green' ? 'bg-green-100 text-green-800' :
                                               item.status === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                               'bg-red-100 text-red-800';
                                return (
                                  <span key={item.metric_id} className={`px-2 py-1 rounded text-xs font-medium ${bgColor}`}>
                                    {item.scorecard_metrics?.metric || 'Unknown'}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                    {section.key === 'scorecard' && (
                      <button
                        onClick={() => setShowTrendingModal(true)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        Trending
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{section.desc}</p>
                  <textarea
                    value={l10Notes[section.key] || ''}
                    onChange={(e) => setL10Notes({ ...l10Notes, [section.key]: e.target.value })}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded p-2"
                    rows={2}
                    placeholder="Take notes here..."
                  />
                </div>
              ))}
            </div>

            {offTrackMetrics.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-red-300 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Company Metrics Off Track ({offTrackMetrics.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {offTrackMetrics.map((metric) => {
                    const user = users.find(u => u.id === metric.owner_id);
                    return (
                      <div key={metric.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-semibold text-gray-900">{metric.metric_name}</h5>
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                Week {metric.period_number}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Owner:</span>
                                <span className="ml-1 font-medium text-gray-900">{user?.name || 'Unassigned'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Goal:</span>
                                <span className="ml-1 font-medium text-gray-900">{metric.goal_value.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Actual:</span>
                                <span className="ml-1 font-medium text-gray-900">{metric.actual_value.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Variance:</span>
                                <span className="ml-1 font-medium text-red-600">
                                  {metric.variance.toFixed(2)} ({metric.variance_percent.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeOffTrackMetric(metric.id)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition"
                            title="Remove from list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  These metrics were flagged as off-track at the start of this meeting and should be discussed during IDS.
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-900">Issues List</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIssueFilter('all')}
                      className={`px-2 py-1 text-xs font-medium rounded transition ${
                        issueFilter === 'all'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setIssueFilter('metric')}
                      className={`px-2 py-1 text-xs font-medium rounded transition ${
                        issueFilter === 'metric'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      Metric
                    </button>
                    <button
                      onClick={() => setIssueFilter('rock')}
                      className={`px-2 py-1 text-xs font-medium rounded transition ${
                        issueFilter === 'rock'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      Rock
                    </button>
                    <button
                      onClick={() => setIssueFilter('both')}
                      className={`px-2 py-1 text-xs font-medium rounded transition ${
                        issueFilter === 'both'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-700 hover:from-blue-200 hover:to-purple-200'
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {issues
                  .filter((issue) => {
                    if (issueFilter === 'all') return true;
                    if (issueFilter === 'metric') return issue.is_metric && !issue.is_rock;
                    if (issueFilter === 'rock') return issue.is_rock && !issue.is_metric;
                    if (issueFilter === 'both') return issue.is_metric && issue.is_rock;
                    return true;
                  })
                  .map((issue) => {
                    const relatedMetric = issue.related_metric_id ? metrics.find(m => m.id === issue.related_metric_id) : null;
                    const relatedRock = relatedMetric?.related_rock_id ? rocks.find(r => r.id === relatedMetric.related_rock_id) : null;

                    return (
                  <div key={issue.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      issue.priority === 'high' ? 'bg-red-100 text-red-800' :
                      issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{issue.priority}</span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">{issue.issue}</div>
                      {(issue.is_rock || issue.is_metric || relatedRock) && (
                        <div className="flex gap-1 mt-1">
                          {issue.is_metric && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              Metric
                            </span>
                          )}
                          {issue.is_rock && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Rock
                            </span>
                          )}
                          {relatedRock && !issue.is_rock && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-600 rounded border border-purple-200">
                              → {relatedRock.rock}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{issue.owner}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      issue.status === 'solved' ? 'bg-green-100 text-green-800' :
                      issue.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{issue.status}</span>
                  </div>
                    );
                  })}
              </div>
              <button
                onClick={() => setShowAddIssueModal(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Add Issue
              </button>
            </div>

            {/* L10 Meeting Modals */}
            {showAddIssueModal && (
              <AddIssueModal
                onClose={() => setShowAddIssueModal(false)}
                onAdd={addIssue}
                users={users}
                metrics={metrics}
                rocks={rocks}
              />
            )}
            {showSummary && meetingSummary && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
                <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 text-xl">Meeting Summary</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopySummary}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Summary
                      </button>
                      <button
                        onClick={handleCloseSummary}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {meetingSummary}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {showTrendingModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Scorecard Trending</h3>
                    <button
                      onClick={() => setShowTrendingModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {scorecardLoading ? (
                    <p className="text-gray-600">Loading scorecard...</p>
                  ) : (metrics.length === 0 && scorecard.length === 0) ? (
                    <p className="text-gray-600">No scorecard elements yet. Add elements in the Company Scorecard tab.</p>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6">
                        {(metrics.length > 0 ? metrics : scorecard).map((metric) => {
                          const selected = trendingSelections[metric.id];
                          const metricName = 'name' in metric ? metric.name : metric.metric;
                          return (
                            <div key={metric.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{metricName}</h4>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                                      selected === 'green'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                    onClick={() => setTrendingSelections({ ...trendingSelections, [metric.id]: 'green' })}
                                  >
                                    Green
                                  </button>
                                  <button
                                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                                      selected === 'yellow'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    }`}
                                    onClick={() => setTrendingSelections({ ...trendingSelections, [metric.id]: 'yellow' })}
                                  >
                                    Yellow
                                  </button>
                                  <button
                                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                                      selected === 'red'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    onClick={() => setTrendingSelections({ ...trendingSelections, [metric.id]: 'red' })}
                                  >
                                    Red
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setShowTrendingModal(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTrending}
                          disabled={isSavingTrending}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {isSavingTrending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && <AdminPage />}
      </div>

      {showAddRock && (
        <AddRockModal
          onClose={() => setShowAddRock(false)}
          onAdd={addRock}
        />
      )}

      {selectedRockForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Rock Details</h3>
              <button onClick={() => setSelectedRockForDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {selectedRockForDetail.owner}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedRockForDetail.status)}`}>
                  {selectedRockForDetail.status.toUpperCase()}
                </span>
              </div>
              <h4 className="text-lg font-semibold">{selectedRockForDetail.rock}</h4>
              <p className="text-sm text-gray-600"><strong>Measurable:</strong> {selectedRockForDetail.measurable}</p>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-700"><strong>Progress:</strong> {selectedRockForDetail.progress}%</p>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${selectedRockForDetail.progress}%` }}></div>
                </div>
              </div>
              {selectedRockForDetail.milestones && selectedRockForDetail.milestones.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Milestones:</p>
                  {selectedRockForDetail.milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 mb-1">
                      <CheckCircle className={`w-4 h-4 ${m.complete ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${m.complete ? 'line-through text-gray-500' : 'text-gray-700'}`}>{m.task}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Latest Update:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedRockForDetail.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Saved Successfully</h3>
            <p className="text-gray-600 mb-6">Would you like to generate an AI summary of this meeting?</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={handleSkipSummary}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                No, Thanks
              </button>
              <button
                onClick={handleGenerateSummaryAfterSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Yes, Generate Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Close Without Copying?</h3>
            <p className="text-gray-600 mb-6">You haven't copied the summary yet. Are you sure you want to close without copying?</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelCloseSummary}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={closeSummaryAndClear}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Close Without Copying
              </button>
            </div>
          </div>
        </div>
      )}

      {showStopConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Not Saved</h3>
            <p className="text-gray-600 mb-6">This meeting hasn't been saved yet. Are you sure you want to stop without saving?</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelStop}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopWithoutSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Stop Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && meetingToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Meeting?</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete this meeting?</p>
            <p className="text-gray-800 font-medium mb-6">
              {savedMeetings.find(m => m.timestamp === meetingToDelete.timestamp)?.displayName}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelDeleteMeeting}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMeeting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {showOffTrackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Off-Track Metrics Detected</h3>
            <p className="text-gray-600 mb-6">
              Would you like to add any off-track metrics to this meeting for discussion?
            </p>

            {getCurrentOffTrackMetrics().length > 0 ? (
              <div className="space-y-3 mb-6">
                {getCurrentOffTrackMetrics().map(m => {
                  const user = users.find(u => u.id === m.metric.owner_id);
                  const isSelected = selectedOffTrackMetrics.has(m.metric.id);

                  return (
                    <div
                      key={m.metric.id}
                      onClick={() => {
                        const newSelection = new Set(selectedOffTrackMetrics);
                        if (isSelected) {
                          newSelection.delete(m.metric.id);
                        } else {
                          newSelection.add(m.metric.id);
                        }
                        setSelectedOffTrackMetrics(newSelection);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <h4 className="font-semibold text-gray-900">{m.metric.metric_name}</h4>
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Off Track
                            </span>
                          </div>
                          <div className="ml-6 text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Owner:</span> {user?.name || 'Unassigned'}</p>
                            <p><span className="font-medium">Goal:</span> {m.goalValue.toFixed(2)}</p>
                            <p><span className="font-medium">Actual:</span> {m.actual?.toFixed(2) || 'No data'}</p>
                            <p className="text-red-600 font-medium">
                              <span>Variance:</span> {m.variance?.toFixed(2)} ({m.variancePercent?.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No off-track metrics found.</p>
            )}

            <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSkipOffTrackMetrics}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Skip
              </button>
              <button
                onClick={handleConfirmOffTrackMetrics}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {selectedOffTrackMetrics.size > 0
                  ? `Add ${selectedOffTrackMetrics.size} Metric${selectedOffTrackMetrics.size > 1 ? 's' : ''}`
                  : 'Continue Without Adding'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirmation && (
        <MeetingSaveConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          issues={issuesForReview}
          onConfirm={handleConfirmSave}
          users={users}
        />
      )}

      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">You have selected a duplicate</h3>
            <p className="text-gray-700 mb-3">The following metrics are already on the Issues List:</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1">
                {duplicateMetrics.map((metric, index) => (
                  <li key={index} className="text-sm text-gray-800">{metric}</li>
                ))}
              </ul>
            </div>
            <p className="text-gray-600 text-sm mb-6">These will be skipped. Other metrics will be added.</p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setDuplicateMetrics([]);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
