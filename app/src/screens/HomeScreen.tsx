import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RecordButton } from '../components/RecordButton';
import { HistoryList } from '../components/HistoryList';
import { useAppTheme } from '../theme/ThemeContext';

export const HomeScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: theme.text }]}>InnerVoice</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Explore the conversation with yourself.</Text>
        <View style={styles.recordButtonWrapper}>
          <RecordButton onPress={() => undefined} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent sessions</Text>
        <HistoryList />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  recordButtonWrapper: {
    marginTop: 24,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});
