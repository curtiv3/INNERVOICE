import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

type HistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type HistoryListProps = {
  data?: HistoryItem[];
};

const defaultData: HistoryItem[] = [
  { id: '1', title: 'Morning reflection', subtitle: '3 prompts • Today' },
  { id: '2', title: 'Coaching session', subtitle: '5 prompts • Yesterday' },
];

export const HistoryList: React.FC<HistoryListProps> = ({ data = defaultData }) => {
  const theme = useAppTheme();

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          {item.subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          ) : null}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
});
