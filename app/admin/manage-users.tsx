import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Users, Shield, UserX, Search, ChevronDown, RefreshCw } from 'lucide-react-native';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  push_notifications_enabled?: boolean;
  sound_vibration_enabled?: boolean;
}

export default function ManageUsers() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const roleOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'Admins', value: 'admin' },
    { label: 'Regular Users', value: 'user' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const changeUserRole = async (userId: string, newRole: string, userName: string) => {
    Alert.alert(
      'Change User Role',
      `Are you sure you want to change ${userName}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', `User role updated to ${newRole}`);
              await fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to update user role: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const toggleUserNotifications = async (userId: string, field: 'push_notifications_enabled' | 'sound_vibration_enabled', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: !currentValue })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update notification settings: ' + error.message);
    }
  };

  const showRolePicker = () => {
    Alert.alert(
      'Filter by Role',
      '',
      [
        ...roleOptions.map(option => ({
          text: option.label,
          onPress: () => setSelectedRole(option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#EF4444';
      case 'user': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Users size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Manage Users</Text>
        <TouchableOpacity onPress={() => fetchUsers()}>
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filters, { backgroundColor: colors.card }]}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Benutzer durchsuchen..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity 
          style={[styles.roleFilter, { backgroundColor: colors.background }]}
          onPress={showRolePicker}
        >
          <Text style={[styles.roleFilterText, { color: colors.text }]}>
            {roleOptions.find(option => option.value === selectedRole)?.label}
          </Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{users.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Benutzer Gesamt</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>
            {users.filter(u => u.role === 'admin').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Admins</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {filteredUsers.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Filtered</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Lade Benutzer...</Text>
          </View>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <View key={user.id} style={[styles.userCard, { backgroundColor: colors.card }]}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                        {user.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                  
                  <View style={styles.userDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Created: {formatDate(user.created_at)}
                    </Text>
                    {user.last_sign_in_at && (
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Last login: {formatDate(user.last_sign_in_at)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.notificationSettings}>
                    <TouchableOpacity
                      style={[styles.notificationToggle, { 
                        backgroundColor: user.push_notifications_enabled ? '#10B981' : colors.background 
                      }]}
                      onPress={() => toggleUserNotifications(user.id, 'push_notifications_enabled', user.push_notifications_enabled || false)}
                    >
                      <Text style={[styles.toggleText, { 
                        color: user.push_notifications_enabled ? 'white' : colors.text 
                      }]}>
                        Push
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.notificationToggle, { 
                        backgroundColor: user.sound_vibration_enabled ? '#10B981' : colors.background 
                      }]}
                      onPress={() => toggleUserNotifications(user.id, 'sound_vibration_enabled', user.sound_vibration_enabled || false)}
                    >
                      <Text style={[styles.toggleText, { 
                        color: user.sound_vibration_enabled ? 'white' : colors.text 
                      }]}>
                        Sound
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.userActions}>
                  {user.role === 'admin' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => changeUserRole(user.id, 'user', user.name)}
                    >
                      <UserX size={16} color="white" />
                      <Text style={styles.actionButtonText}>Remove Admin</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => changeUserRole(user.id, 'admin', user.name)}
                    >
                      <Shield size={16} color="white" />
                      <Text style={styles.actionButtonText}>Make Admin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {filteredUsers.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Users size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No users found matching your criteria
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  roleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  roleFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  userDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 2,
  },
  notificationSettings: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userActions: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});