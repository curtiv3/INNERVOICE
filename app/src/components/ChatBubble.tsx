import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

type ChatBubbleProps = {
  role?: 'user' | 'assistant';
  message: string;
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role = 'assistant', message }) => {
  const theme = useAppTheme();
  const isUser = role === 'user';

  return (
    <View
      style={[
        styles.container,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? theme.primary : theme.surface,
        },
      ]}
    >
      <Text style={[styles.text, { color: isUser ? theme.surface : theme.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginVertical: 4,
    maxWidth: '80%',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
});
