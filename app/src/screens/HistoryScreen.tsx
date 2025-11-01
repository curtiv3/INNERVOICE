import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HistoryList } from '../components/HistoryList';
import { useAppTheme } from '../theme/ThemeContext';

export const HistoryScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View>
        <Text style={[styles.heading, { color: theme.text }]}>History</Text>
      </View>
      <HistoryList />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
});
