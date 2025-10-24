import { useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedUsers = data?.map(user => ({
        ...user,
        name: `${user.first_name} ${user.last_name}`
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  return { users, loading, refresh: loadUsers };
}
