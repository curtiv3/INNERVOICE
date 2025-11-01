import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../i18n';

export type OnboardingScreenProps = {
  onFinish: () => void;
};

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { t } = useI18n();
  const slides = useMemo(
    () => [
      {
        key: 'slide1',
        title: t('onboarding.slide1.title'),
        body: t('onboarding.slide1.body')
      },
      {
        key: 'slide2',
        title: t('onboarding.slide2.title'),
        body: t('onboarding.slide2.body')
      },
      {
        key: 'slide3',
        title: t('onboarding.slide3.title'),
        body: t('onboarding.slide3.body')
      }
    ],
    [t]
  );
  const [index, setIndex] = useState(0);
  const last = index === slides.length - 1;

  const handleNext = () => {
    if (last) {
      onFinish();
      return;
    }
    setIndex(i => Math.min(slides.length - 1, i + 1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={onFinish}>
          <Text style={styles.skip}>{t('onboarding.actions.skip')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{slides[index].title}</Text>
        <Text style={styles.body}>{slides[index].body}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, position) => (
            <View key={slide.key} style={[styles.dot, position === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={handleNext}>
          <Text style={styles.primaryLabel}>
            {last ? t('onboarding.actions.start') : t('onboarding.actions.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1117',
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  header: {
    alignItems: 'flex-end'
  },
  skip: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 16
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700'
  },
  body: {
    color: '#CBD5F5',
    fontSize: 16,
    lineHeight: 24
  },
  footer: {
    gap: 24
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1F2937'
  },
  dotActive: {
    backgroundColor: '#38BDF8'
  },
  primary: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryLabel: {
    color: '#BFDBFE',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default OnboardingScreen;
