import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  texts: {
    flexShrink: 1
  },
  title: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600'
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2
  },
  action: {
    marginLeft: 12
  }
});

export default SectionHeader;
