import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { amortize } from '@fixorreplace/calc-engine';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Financing'>;
type PaymentMethod = 'cash' | 'finance';

export default function FinancingScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [method, setMethod] = useState<PaymentMethod>(draft?.financeMethod ?? 'finance');
  const [downPayment, setDownPayment] = useState(draft?.downPayment ? String(draft.downPayment) : '');
  const [interestRate, setInterestRate] = useState(draft?.interestRate ? String(draft.interestRate) : '');
  const [loanTermMonths, setLoanTermMonths] = useState(draft ? String(draft.loanTermMonths) : '60');

  if (!draft) return null;

  const outTheDoorPrice =
    draft.replacementPrice + draft.salesTax + draft.titleRegistration + draft.docFee + draft.delivery + draft.otherFees;
  const netCurrentVehicleValue = draft.currentVehicleTradeValue - draft.loanPayoff;
  const netReplacementAcquisitionCost = outTheDoorPrice - netCurrentVehicleValue;

  const parsedDownPayment = Number(downPayment) || 0;
  const parsedInterestRate = Number(interestRate) || 0;
  const parsedTermMonths = parseInt(loanTermMonths, 10) || 0;
  const amountFinanced = Math.max(0, netReplacementAcquisitionCost - parsedDownPayment);

  const { monthlyPayment, totalInterest } =
    method === 'finance' ? amortize(amountFinanced, parsedInterestRate, parsedTermMonths) : { monthlyPayment: 0, totalInterest: 0 };

  const totalAcquisitionCost = netReplacementAcquisitionCost + totalInterest;

  function handleContinue() {
    updateDraft({
      financeMethod: method,
      downPayment: method === 'finance' ? parsedDownPayment : 0,
      interestRate: method === 'finance' ? parsedInterestRate : 0,
      loanTermMonths: method === 'finance' ? parsedTermMonths : 0,
    });
    navigation.navigate('Analysis');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>HOW WOULD YOU PAY?</Text>

      <View style={styles.optionsRow}>
        {(['cash', 'finance'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, method === option && styles.optionChipSelected]}
            onPress={() => setMethod(option)}
          >
            <Text style={[styles.optionChipText, method === option && styles.optionChipTextSelected]}>
              {option === 'cash' ? 'Cash' : 'Finance'}
            </Text>
          </Pressable>
        ))}
      </View>

      {method === 'finance' && (
        <>
          <Text style={styles.sectionLabel}>Down Payment</Text>
          <TextInput
            style={styles.input}
            placeholder="$ 0"
            keyboardType="decimal-pad"
            value={downPayment}
            onChangeText={setDownPayment}
          />

          <Text style={styles.sectionLabel}>Interest Rate</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0%"
            keyboardType="decimal-pad"
            value={interestRate}
            onChangeText={setInterestRate}
          />

          <Text style={styles.sectionLabel}>Loan Term (months)</Text>
          <TextInput
            style={styles.input}
            placeholder="60"
            keyboardType="number-pad"
            value={loanTermMonths}
            onChangeText={setLoanTermMonths}
          />

          <View style={styles.summaryCard}>
            <SummaryRow label="Amount financed" value={amountFinanced} />
            <SummaryRow label="Estimated payment" value={monthlyPayment} suffix="/month" />
            <SummaryRow label="Total interest" value={totalInterest} />
            <View style={styles.summaryDivider} />
            <SummaryRow label="Total acquisition cost" value={totalAcquisitionCost} bold />
          </View>
        </>
      )}

      {method === 'cash' && (
        <View style={styles.summaryCard}>
          <SummaryRow label="Total acquisition cost" value={netReplacementAcquisitionCost} bold />
        </View>
      )}

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>COMPARE</Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryRow({ label, value, suffix = '', bold = false }: { label: string; value: number; suffix?: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        {suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  optionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  optionChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  optionChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  optionChipText: { fontSize: 14, color: '#333' },
  optionChipTextSelected: { color: '#fff', fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  summaryCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: '#555' },
  summaryLabelBold: { fontWeight: '700', color: '#111' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  summaryValueBold: { fontSize: 18, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#ddd', marginVertical: 8 },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
