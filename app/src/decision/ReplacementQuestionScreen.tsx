import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'ReplacementQuestion'>;

export default function ReplacementQuestionScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();

  if (!draft) return null;

  function choose(condition: 'used' | 'new') {
    updateDraft({ replacementCondition: condition });
    navigation.navigate('ReplacementPrice');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IF YOU DON'T FIX IT...</Text>
      <Text style={styles.subtitle}>What would you realistically replace it with?</Text>

      <Pressable style={styles.optionButton} onPress={() => choose('used')}>
        <Text style={styles.optionButtonText}>USED VEHICLE</Text>
      </Pressable>
      <Pressable style={styles.optionButton} onPress={() => choose('new')}>
        <Text style={styles.optionButtonText}>NEW VEHICLE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 32 },
  optionButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
