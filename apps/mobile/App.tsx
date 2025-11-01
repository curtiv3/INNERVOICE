import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import HomeScreen from './src/screens/Home';
import DialogScreen from './src/screens/Dialog';
import HistoryScreen from './src/screens/History';
import SettingsScreen from './src/screens/Settings';
import { I18nProvider, useI18n } from './src/i18n';
import { useDatabaseReady } from './src/hooks/useDatabaseReady';
import { useOnboardingStatus } from './src/hooks/useOnboardingStatus';
import { OnboardingScreen } from './src/screens/Onboarding';
import type { ConversationResult } from './src/hooks/useConversationFlow';

const TABS: Array<{ key: TabKey; icon: string }> = [
  { key: 'home', icon: '●' },
  { key: 'dialog', icon: '◆' },
  { key: 'history', icon: '☰' },
  { key: 'settings', icon: '⚙︎' }
];

type TabKey = 'home' | 'dialog' | 'history' | 'settings';

type ShellProps = {
  ready: boolean;
};

function Shell({ ready }: ShellProps) {
  const { t, ready: translationsReady } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [latestConversation, setLatestConversation] = useState<ConversationResult | null>(null);
  const { completed, loading, markComplete } = useOnboardingStatus(ready);

  if (!ready || !translationsReady || loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#6CC3F7" />
      </View>
    );
  }

  if (!completed) {
    return (
      <OnboardingScreen
        onFinish={async () => {
          await markComplete();
          setActiveTab('home');
        }}
      />
    );
  }

  const navItems = useMemo(
    () => [
      { key: 'home' as TabKey, label: t('nav.home'), icon: TABS[0].icon },
      { key: 'dialog' as TabKey, label: t('nav.dialog'), icon: TABS[1].icon },
      { key: 'history' as TabKey, label: t('nav.history'), icon: TABS[2].icon },
      { key: 'settings' as TabKey, label: t('nav.settings'), icon: TABS[3].icon }
    ],
    [t]
  );

  const renderScreen = () => {
    switch (activeTab) {
      case 'dialog':
        return (
          <DialogScreen
            entryId={latestConversation?.entryId}
            fileUri={latestConversation?.fileUri}
            transcription={latestConversation?.transcription}
            initialResponse={latestConversation?.response}
          />
        );
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'home':
      default:
        return (
          <HomeScreen
            onConversationFinished={result => {
              setLatestConversation(result);
              setActiveTab('dialog');
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.body}>{renderScreen()}</View>
      <View style={styles.navbar}>
        {navItems.map(item => {
          const active = item.key === activeTab;
          return (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => setActiveTab(item.key)}
            >
              <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const ready = useDatabaseReady();
  return (
    <I18nProvider ready={ready}>
      <Shell ready={ready} />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1016'
  },
  body: {
    flex: 1
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-around'
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  navItemActive: {
    backgroundColor: '#1E3A8A'
  },
  navIcon: {
    color: '#64748B',
    fontSize: 14
  },
  navIconActive: {
    color: '#BFDBFE'
  },
  navLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  navLabelActive: {
    color: '#F8FAFC'
  },
  loader: {
    flex: 1,
    backgroundColor: '#0B1016',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
