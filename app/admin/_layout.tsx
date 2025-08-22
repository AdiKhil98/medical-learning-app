import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text } from 'react-native';

export default function AdminLayout() {
  const { user } = useAuth();

  // Protect admin routes
  if (!user || user.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Admin Dashboard',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="test-simulation" 
        options={{ 
          title: 'Test Simulation',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="add-update" 
        options={{ 
          title: 'Post Update',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="manage-users" 
        options={{ 
          title: 'Manage Users',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="analytics" 
        options={{ 
          title: 'Analytics',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="content" 
        options={{ 
          title: 'Content Management',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="database" 
        options={{ 
          title: 'Database Management',
          headerShown: true 
        }} 
      />
    </Stack>
  );
}