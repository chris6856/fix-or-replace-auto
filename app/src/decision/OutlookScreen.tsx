import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReliabilityBucket } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from './explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'Outlook'>;

const RELIABILITY_LABEL: Record<ReliabilityBucket, string> = {
  reliable: 'Good',
  some_problems: 'Fair',
  problem_vehicle: 'Poor',
};

const REPAIR_RISK_LABEL: Record<ReliabilityBucket, string> = {
  reliable: 'Lower',
  some_problems: 'Moderate',
  problem_vehicle: 'Elevated',
};

export default function OutlookScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { input, output } = result;

  const monthsFinanced = Math.min(24, input.replace.loanTermMonths);
  const paymentsOver24Months = input.replace.financeMethod === 'finance' ? output.monthlyPayment * monthsFinanced : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>NEXT 24 MONTHS</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>FIX CURRENT VEHICLE</Text>
        <Row label="Repair now" value={formatCurrency(input.keep.currentRepairCost)} />
        <Row label="Recent repair history" value={formatCurrency(input.keep.recentRepairsSum)} />
        <Row label="Vehicle" value={`${input.keep.ageYears} years / ${input.keep.mileage.toLocaleString()} miles`} />
        <Row label="Reliability" value={RELIABILITY_LABEL[input.keep.reliabilityBucket]} />
        <Row label="Additional repair risk" value={REPAIR_RISK_LABEL[input.keep.reliabilityBucket]} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>REPLACE VEHICLE</Text>
        <Row label="Initial net acquisition" value={formatCurrency(output.netReplacementAcquisitionCost)} />
        <Row
          label="Monthly payment"
          value={input.replace.financeMethod === 'finance' ? `${formatCurrency(output.monthlyPayment)}/mo` : 'N/A (cash)'}
        />
        <Row label="Payments over 24 months" value={formatCurrency(paymentsOver24Months)} />
        <Row label="Potential insurance increase" value="Not included" muted />
        <Row label="Maintenance" value="Not included unless reliable data available" muted />
      </View>

      <Text style={styles.disclosure}>We're being transparent about what isn't included above.</Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Threshold', { result })}>
        <Text style={styles.primaryButtonText}>YOUR REPAIR THRESHOLD</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowValueMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#555', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  rowValueMuted: { color: '#999', fontWeight: '400', fontStyle: 'italic' },
  disclosure: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 8 },
  primaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
