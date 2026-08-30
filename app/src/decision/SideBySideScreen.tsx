import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from './explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'SideBySide'>;

export default function SideBySideScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { input, output } = result;

  const titleRegistration = input.replace.title + input.replace.registration;
  const dealerFees = input.replace.docFee + input.replace.delivery + input.replace.otherFees;

  const fixCost = input.keep.currentRepairCost;
  const replaceCost = output.totalAcquisitionCostIncludingFinancing;
  const diff = Math.abs(fixCost - replaceCost);
  const diffLabel = fixCost <= replaceCost ? 'Fixing preserves approximately' : 'Replacing saves approximately';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>YOUR TWO OPTIONS</Text>

      <View style={styles.headerRow}>
        <Text style={styles.headerCell} />
        <Text style={[styles.headerCell, styles.headerCellValue]}>FIX IT</Text>
        <Text style={[styles.headerCell, styles.headerCellValue]}>REPLACE IT</Text>
      </View>

      <TableRow label="Repair" fix={fixCost} />
      <TableRow label="Replacement vehicle" replace={input.replace.replacementPrice} />
      <TableRow label="Taxes" replace={input.replace.salesTax} />
      <TableRow label="Title/registration" replace={titleRegistration} />
      <TableRow label="Dealer/delivery fees" replace={dealerFees} />
      <TableRow label="Current vehicle credit" replace={-input.replace.tradeOrSaleValue} />
      <TableRow label="Financing interest" replace={output.totalInterest} />
      <TableRow label="Estimated cost" fix={fixCost} replace={replaceCost} bold />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>DIFFERENCE</Text>
        <Text style={styles.summaryValue}>
          {diffLabel} {formatCurrency(diff)}
        </Text>
      </View>

      <Text style={styles.caveat}>
        Repairing also carries greater future repair risk because of the vehicle's age and mileage. We shouldn't
        pretend this repair makes the old vehicle new.
      </Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Outlook', { result })}>
        <Text style={styles.primaryButtonText}>NEXT 24 MONTHS</Text>
      </Pressable>
    </ScrollView>
  );
}

function TableRow({ label, fix, replace, bold }: { label: string; fix?: number; replace?: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{fix !== undefined ? formatCurrency(fix) : '—'}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>
        {replace !== undefined ? formatCurrency(replace) : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  headerRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerCell: { flex: 1 },
  headerCellValue: { fontSize: 12, fontWeight: '800', textAlign: 'right' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowLabel: { flex: 1, fontSize: 13, color: '#555' },
  rowLabelBold: { fontWeight: '700', color: '#111' },
  rowValue: { flex: 1, fontSize: 13, color: '#333', textAlign: 'right' },
  rowValueBold: { fontWeight: '800', fontSize: 14 },
  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
  summaryValue: { fontSize: 17, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  caveat: { fontSize: 13, color: '#777', lineHeight: 19, marginTop: 20, textAlign: 'center' },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
