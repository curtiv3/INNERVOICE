import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChatBubble } from '../components/ChatBubble';
import { useAppTheme } from '../theme/ThemeContext';

const demoConversation = [
  { id: '1', role: 'assistant' as const, message: 'Welcome back! What is on your mind today?' },
  { id: '2', role: 'user' as const, message: "I want to reflect on today's coaching session." },
  { id: '3', role: 'assistant' as const, message: 'Great! What moment felt most impactful?' },
];

export const DialogScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: theme.text }]}>Dialog</Text>
      <View>
        {demoConversation.map((item) => (
          <ChatBubble key={item.id} role={item.role} message={item.message} />
        ))}
      </View>
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
