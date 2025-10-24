import React, { useState } from 'react';
import { Users, Plus, Trash2, Save, X, Settings, Key } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { supabase } from '../lib/supabase';

export function AdminPage() {
  const { users, loading, refresh } = useUsers();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserRole, setNewUserRole] = useState<'super_user' | 'user'>('user');
  const [editData, setEditData] = useState({ first_name: '', last_name: '', email: '', title: '', role: 'user' });
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userRocks, setUserRocks] = useState<any[]>([]);
  const [reassignToUserId, setReassignToUserId] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    );
  }

  async function handleAddUser() {
    if (!newUserFirstName.trim() || !newUserLastName.trim() || !newUserEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          name: `${newUserFirstName} ${newUserLastName}`,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          email: newUserEmail,
          title: newUserTitle,
          role: newUserRole
        }]);

      if (error) throw error;

      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserTitle('');
      setNewUserRole('user');
      setShowAddUser(false);
      await refresh();
      alert('User added successfully! Remember to set their password so they can log in.');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetPassword() {
    if (!passwordUserId || !newPassword) {
      alert('Please enter a password');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsSettingPassword(true);
    try {
      const user = users.find(u => u.id === passwordUserId);
      if (!user) throw new Error('User not found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-auth-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: user.email,
          password: newPassword
        })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to set password');
      }

      setShowPasswordModal(false);
      setPasswordUserId(null);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password set successfully! User can now log in.');
    } catch (error: any) {
      console.error('Error setting password:', error);
      alert(error.message || 'Failed to set password. Please try again.');
    } finally {
      setIsSettingPassword(false);
    }
  }

  async function handleUpdateUser(userId: string) {
    if (!editData.first_name.trim() || !editData.last_name.trim() || !editData.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: `${editData.first_name} ${editData.last_name}`,
          first_name: editData.first_name,
          last_name: editData.last_name,
          email: editData.email,
          title: editData.title,
          role: editData.role as 'super_user' | 'user'
        })
        .eq('id', userId);

      if (error) throw error;

      setEditingUserId(null);
      await refresh();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUserClick(userId: string) {
    const userName = users.find(u => u.id === userId)?.name;

    const { data: rocks } = await supabase
      .from('rocks')
      .select('*')
      .eq('owner', userName);

    setUserRocks(rocks || []);
    setUserToDelete(userId);
    setReassignToUserId('');
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;

    try {
      const userName = users.find(u => u.id === userToDelete)?.name;

      if (userRocks.length > 0 && reassignToUserId) {
        const newOwner = users.find(u => u.id === reassignToUserId)?.name;
        if (newOwner) {
          await supabase
            .from('rocks')
            .update({ owner: newOwner })
            .eq('owner', userName);
        }
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete);

      if (error) throw error;

      setUserToDelete(null);
      setUserRocks([]);
      setReassignToUserId('');
      await refresh();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  }

  function startEdit(user: any) {
    setEditingUserId(user.id);
    setEditData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      title: user.title || '',
      role: user.role
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Administration</h2>
        <p className="text-gray-600">Manage users and system settings</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({users.length})
          </h3>
          <button
            onClick={() => setShowAddUser(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="space-y-3">
          {users.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              {editingUserId === user.id ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    type="text"
                    value={editData.first_name}
                    onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={editData.last_name}
                    onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Last Name"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Title (optional)"
                  />
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="super_user">Super User</option>
                    <option value="user">User</option>
                  </select>
                  <div className="flex gap-2 md:col-span-5">
                    <button
                      onClick={() => handleUpdateUser(user.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingUserId(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    {user.title && <p className="text-sm text-gray-500">{user.title}</p>}
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'super_user'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'super_user' ? 'Super User' : 'User'}
                    </span>
                    <button
                      onClick={() => {
                        setPasswordUserId(user.id);
                        setShowPasswordModal(true);
                      }}
                      className="text-green-600 hover:text-green-800 transition"
                      title="Set Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(user)}
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Edit User"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUserClick(user.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CEO, Developer, Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'super_user' | 'user')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="super_user">Super User</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete User?</h3>

            {userRocks.length > 0 ? (
              <>
                <p className="text-gray-600 mb-4">
                  This user has {userRocks.length} rock{userRocks.length !== 1 ? 's' : ''} assigned to them:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-1">
                    {userRocks.map((rock) => (
                      <li key={rock.id} className="text-sm text-gray-700">• {rock.rock}</li>
                    ))}
                  </ul>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reassign rocks to: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reassignToUserId}
                    onChange={(e) => setReassignToUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a user...</option>
                    {users
                      .filter(u => u.id !== userToDelete)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setUserToDelete(null);
                  setUserRocks([]);
                  setReassignToUserId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={userRocks.length > 0 && !reassignToUserId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && passwordUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Set Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordUserId(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                Set login password for <strong>{users.find(u => u.id === passwordUserId)?.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ({users.find(u => u.id === passwordUserId)?.email})
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordUserId(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPassword}
                disabled={isSettingPassword || !newPassword || !confirmPassword}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {isSettingPassword ? 'Setting...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
