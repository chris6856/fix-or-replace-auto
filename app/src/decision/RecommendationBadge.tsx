import { StyleSheet, Text, View } from 'react-native';
import type { Recommendation } from '@fixorreplace/types';

const RECOMMENDATION_DISPLAY: Record<Recommendation, { emoji: string; label: string; color: string }> = {
  fix: { emoji: '\u{1F7E2}', label: 'FIX IT', color: '#2e7d32' },
  get_quote: { emoji: '\u{1F7E1}', label: 'GET ANOTHER QUOTE', color: '#b8860b' },
  replace: { emoji: '\u{1F534}', label: 'REPLACE IT', color: '#c62828' },
  too_close: { emoji: '\u{26AA}', label: 'TOO CLOSE TO CALL', color: '#555' },
};

export function recommendationLabel(recommendation: Recommendation): string {
  const { emoji, label } = RECOMMENDATION_DISPLAY[recommendation];
  return `${emoji} ${label}`;
}

export default function RecommendationBadge({ recommendation }: { recommendation: Recommendation }) {
  const { emoji, label, color } = RECOMMENDATION_DISPLAY[recommendation];
  return (
    <View style={styles.badge}>
      <Text style={[styles.text, { color }]}>
        {emoji} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', marginVertical: 12 },
  text: { fontSize: 20, fontWeight: '800' },
});
