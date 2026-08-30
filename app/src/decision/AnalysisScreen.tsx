import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeDecision } from '@fixorreplace/calc-engine';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { buildCalcInput } from './buildCalcInput';

type Props = NativeStackScreenProps<AppStackParamList, 'Analysis'>;

const CHECKLIST = [
  'Current vehicle value',
  'Current repair',
  'Recent repair history',
  'Mileage and age',
  'Vehicle reliability input',
  'Remaining loan',
  'Replacement cost',
  'Taxes, title, and fees',
  'Trade/sale value',
  'Financing cost',
];

export default function AnalysisScreen({ navigation }: Props) {
  const { draft } = useDecisionDraft();
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!draft) return;

    const interval = setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, CHECKLIST.length));
    }, 90);

    const input = buildCalcInput(draft);
    const output = computeDecision(input);

    const timeout = setTimeout(() => {
      navigation.replace('Result', { result: { input, output } });
    }, 1100);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RUNNING THE NUMBERS...</Text>
      <View style={styles.checklist}>
        {CHECKLIST.map((item, index) => (
          <Text key={item} style={[styles.checklistItem, index >= visibleCount && styles.checklistItemHidden]}>
            {'✓'} {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 24 },
  checklist: { alignSelf: 'stretch' },
  checklistItem: { fontSize: 15, color: '#333', marginBottom: 8, textAlign: 'center' },
  checklistItemHidden: { opacity: 0 },
});
