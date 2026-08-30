import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { computeDecision } from '@fixorreplace/calc-engine';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import RecommendationBadge from './RecommendationBadge';
import { formatCurrency } from './explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'WhatIf'>;

/**
 * A sandbox, not a re-entry into the saved flow -- editing here never
 * writes back to DecisionDraft. Recalculation is instant because
 * computeDecision() is a pure, dependency-free function (see build plan
 * section 3); there's nothing to await. Continuing always carries the
 * ORIGINAL (unedited) result forward -- what gets saved later is the real
 * analysis, not whatever the user was exploring here.
 */
export default function WhatIfScreen({ route, navigation }: Props) {
  const { result: original } = route.params;

  const [repairCost, setRepairCost] = useState(String(original.input.keep.currentRepairCost));
  const [replacementPrice, setReplacementPrice] = useState(String(original.input.replace.replacementPrice));
  const [tradeValue, setTradeValue] = useState(String(original.input.replace.tradeOrSaleValue));
  const [downPayment, setDownPayment] = useState(String(original.input.replace.downPayment));
  const [interestRate, setInterestRate] = useState(String(original.input.replace.interestRate));

  const output = useMemo(() => {
    const input = {
      keep: { ...original.input.keep, currentRepairCost: numberOr(repairCost, original.input.keep.currentRepairCost) },
      replace: {
        ...original.input.replace,
        replacementPrice: numberOr(replacementPrice, original.input.replace.replacementPrice),
        tradeOrSaleValue: numberOr(tradeValue, original.input.replace.tradeOrSaleValue),
        downPayment: numberOr(downPayment, original.input.replace.downPayment),
        interestRate: numberOr(interestRate, original.input.replace.interestRate),
      },
    };
    return computeDecision(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairCost, replacementPrice, tradeValue, downPayment, interestRate]);

  function handleReset() {
    setRepairCost(String(original.input.keep.currentRepairCost));
    setReplacementPrice(String(original.input.replace.replacementPrice));
    setTradeValue(String(original.input.replace.tradeOrSaleValue));
    setDownPayment(String(original.input.replace.downPayment));
    setInterestRate(String(original.input.replace.interestRate));
  }

  function handleContinue() {
    navigation.navigate('Why', { result: original });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>CHANGE THE NUMBERS</Text>

      <RecommendationBadge recommendation={output.recommendation} />
      <View style={styles.compareRow}>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Repair</Text>
          <Text style={styles.compareValue}>{formatCurrency(numberOr(repairCost, 0))}</Text>
        </View>
        <Text style={styles.versus}>vs</Text>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Net Cost to Replace</Text>
          <Text style={styles.compareValue}>{formatCurrency(output.netReplacementAcquisitionCost)}</Text>
        </View>
      </View>

      <Field label="Repair Cost" value={repairCost} onChangeText={setRepairCost} />
      <Field label="Replacement Vehicle" value={replacementPrice} onChangeText={setReplacementPrice} />
      <Field label="Trade Value" value={tradeValue} onChangeText={setTradeValue} />
      <Field label="Down Payment" value={downPayment} onChangeText={setDownPayment} />
      <Field label="Interest Rate (%)" value={interestRate} onChangeText={setInterestRate} />

      <Text style={styles.helperText}>Change anything above and the recommendation recalculates instantly.</Text>

      <Pressable style={styles.secondaryButton} onPress={handleReset}>
        <Text style={styles.secondaryButtonText}>RESET TO ORIGINAL</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={onChangeText} />
    </>
  );
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  compareColumn: { alignItems: 'center', flex: 1 },
  compareLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  compareValue: { fontSize: 18, fontWeight: '800' },
  versus: { fontSize: 12, color: '#999', marginHorizontal: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helperText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 20 },
  primaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    marginTop: 20,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '700', color: '#333' },
});
