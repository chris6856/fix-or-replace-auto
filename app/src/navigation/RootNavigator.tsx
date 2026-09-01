import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import SignInScreen from '../auth/SignInScreen';
import WelcomeScreen from '../onboarding/WelcomeScreen';
import GarageScreen from '../garage/GarageScreen';
import AddVehicleScreen from '../garage/AddVehicleScreen';
import ScanVinScreen from '../garage/ScanVinScreen';
import ConfirmVehicleScreen from '../garage/ConfirmVehicleScreen';
import VehicleProfileScreen from '../garage/VehicleProfileScreen';
import VehicleDetailScreen from '../garage/VehicleDetailScreen';
import type { DecodedVehicle } from '../garage/vinDecode';
import MileageCheckScreen from '../decision/MileageCheckScreen';
import RepairEstimateScreen from '../decision/RepairEstimateScreen';
import ConfirmRepairScreen from '../decision/ConfirmRepairScreen';
import VehicleHistoryScreen from '../decision/VehicleHistoryScreen';
import FinancialsScreen from '../decision/FinancialsScreen';
import CurrentValueScreen from '../decision/CurrentValueScreen';
import ReplacementQuestionScreen from '../decision/ReplacementQuestionScreen';
import ReplacementPriceScreen from '../decision/ReplacementPriceScreen';
import ReplacementCostsScreen from '../decision/ReplacementCostsScreen';
import TradeInScreen from '../decision/TradeInScreen';
import FinancingScreen from '../decision/FinancingScreen';
import AnalysisScreen from '../decision/AnalysisScreen';
import ResultScreen from '../decision/ResultScreen';
import SideBySideScreen from '../decision/SideBySideScreen';
import OutlookScreen from '../decision/OutlookScreen';
import ThresholdScreen from '../decision/ThresholdScreen';
import WhatIfScreen from '../decision/WhatIfScreen';
import WhyScreen from '../decision/WhyScreen';
import QuestionsScreen from '../decision/QuestionsScreen';
import SaveDecisionScreen from '../decision/SaveDecisionScreen';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import type { AnalysisResult } from '../decision/buildCalcInput';
import SymptomCheckScreen from '../symptomCheck/SymptomCheckScreen';
import SymptomResultScreen from '../symptomCheck/SymptomResultScreen';
import type { PossibleIssue } from '@fixorreplace/types';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
};

export type VehicleDraft = {
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

export type AppStackParamList = {
  Garage: undefined;
  AddVehicle: { prefill?: VehicleDraft } | undefined;
  ScanVin: undefined;
  ConfirmVehicle: { decoded: DecodedVehicle };
  VehicleProfile: { draft: VehicleDraft };
  VehicleDetail: { vehicleId: string };
  SymptomCheck: { vehicleId: string };
  SymptomResult: {
    vehicleId: string;
    symptomDescription: string;
    possibleIssues: PossibleIssue[];
    urgentSafetyNote: string | null;
  };
  MileageCheck: undefined;
  RepairEstimate: undefined;
  ConfirmRepair: undefined;
  VehicleHistory: undefined;
  Financials: undefined;
  CurrentValue: undefined;
  ReplacementQuestion: undefined;
  ReplacementPrice: undefined;
  ReplacementCosts: undefined;
  TradeIn: undefined;
  Financing: undefined;
  Analysis: undefined;
  Result: { result: AnalysisResult };
  SideBySide: { result: AnalysisResult };
  Outlook: { result: AnalysisResult };
  Threshold: { result: AnalysisResult };
  WhatIf: { result: AnalysisResult };
  Why: { result: AnalysisResult };
  Questions: { result: AnalysisResult; explanation: string };
  SaveDecision: { result: AnalysisResult; explanation?: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/**
 * Shown in the header of every screen in the repair-vs-replace decision
 * flow (Screens 9-28) so the user is never stuck having to tap back
 * through a dozen-plus screens to get out. Confirms first since it
 * discards everything typed so far -- nothing is persisted until Save.
 * Always returns to the Garage (home) screen, never mid-flow.
 */
function CancelDecisionButton() {
  const { clearDraft } = useDecisionDraft();

  function handlePress() {
    Alert.alert('Cancel this decision?', 'Your progress on this repair-vs-replace decision will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel Decision',
        style: 'destructive',
        onPress: () => {
          clearDraft();
          rootNavigationRef?.navigate('Garage');
        },
      },
    ]);
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.cancelButton}>
      <Text style={styles.cancelButtonText}>Cancel</Text>
    </Pressable>
  );
}

/**
 * Once the analysis has actually run (Screens 21-27, from the result
 * onward), the user shouldn't have to click through Why/Questions just to
 * save -- Save sits next to Cancel from here on, going to the same
 * confirm-and-save screen the end-of-flow Save button already uses.
 */
function SaveAndCancelButtons({ result, explanation }: { result: AnalysisResult; explanation?: string }) {
  return (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => rootNavigationRef?.navigate('SaveDecision', { result, explanation })}
        hitSlop={12}
        style={styles.saveButton}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
      <CancelDecisionButton />
    </View>
  );
}

/** Set once NavigationContainer mounts -- see the ref wiring below. */
let rootNavigationRef: {
  navigate: {
    (name: 'Garage'): void;
    (name: 'SaveDecision', params: { result: AnalysisResult; explanation?: string }): void;
  };
} | null = null;

function decisionScreenOptions(title: string): NativeStackNavigationOptions {
  return { title, headerRight: () => <CancelDecisionButton /> };
}

/** Same as decisionScreenOptions, plus the Save shortcut described above. */
function decisionScreenOptionsWithSave(
  title: string,
): (props: { route: { params?: { result?: AnalysisResult; explanation?: string } } }) => NativeStackNavigationOptions {
  return ({ route }) => ({
    title,
    headerRight: () =>
      route.params?.result ? (
        <SaveAndCancelButtons result={route.params.result} explanation={route.params.explanation} />
      ) : (
        <CancelDecisionButton />
      ),
  });
}

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={(instance) => {
        rootNavigationRef = instance as typeof rootNavigationRef;
      }}
    >
      {session ? (
        <AppStack.Navigator>
          <AppStack.Screen name="Garage" component={GarageScreen} options={{ title: 'My Garage' }} />
          <AppStack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add a Vehicle' }} />
          <AppStack.Screen name="ScanVin" component={ScanVinScreen} options={{ title: 'Scan VIN' }} />
          <AppStack.Screen
            name="ConfirmVehicle"
            component={ConfirmVehicleScreen}
            options={{ title: 'Confirm Vehicle' }}
          />
          <AppStack.Screen
            name="VehicleProfile"
            component={VehicleProfileScreen}
            options={{ title: 'Vehicle Profile' }}
          />
          <AppStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle' }} />
          <AppStack.Screen
            name="SymptomCheck"
            component={SymptomCheckScreen}
            options={{ title: 'Check a Symptom' }}
          />
          <AppStack.Screen
            name="SymptomResult"
            component={SymptomResultScreen}
            options={{ title: 'Possible Causes' }}
          />
          <AppStack.Screen
            name="MileageCheck"
            component={MileageCheckScreen}
            options={decisionScreenOptions('Current Mileage')}
          />
          <AppStack.Screen
            name="RepairEstimate"
            component={RepairEstimateScreen}
            options={decisionScreenOptions('What Did the Shop Say?')}
          />
          <AppStack.Screen
            name="ConfirmRepair"
            component={ConfirmRepairScreen}
            options={decisionScreenOptions("Here's What We Heard")}
          />
          <AppStack.Screen
            name="VehicleHistory"
            component={VehicleHistoryScreen}
            options={decisionScreenOptions('Vehicle History')}
          />
          <AppStack.Screen
            name="Financials"
            component={FinancialsScreen}
            options={decisionScreenOptions('Financials')}
          />
          <AppStack.Screen
            name="CurrentValue"
            component={CurrentValueScreen}
            options={decisionScreenOptions('Vehicle Value')}
          />
          <AppStack.Screen
            name="ReplacementQuestion"
            component={ReplacementQuestionScreen}
            options={decisionScreenOptions('If You Replace It')}
          />
          <AppStack.Screen
            name="ReplacementPrice"
            component={ReplacementPriceScreen}
            options={decisionScreenOptions('Replacement Vehicle')}
          />
          <AppStack.Screen
            name="ReplacementCosts"
            component={ReplacementCostsScreen}
            options={decisionScreenOptions('Real Cost to Replace')}
          />
          <AppStack.Screen
            name="TradeIn"
            component={TradeInScreen}
            options={decisionScreenOptions('Your Current Vehicle')}
          />
          <AppStack.Screen
            name="Financing"
            component={FinancingScreen}
            options={decisionScreenOptions('Financing')}
          />
          <AppStack.Screen name="Analysis" component={AnalysisScreen} options={{ title: '', headerShown: false }} />
          <AppStack.Screen
            name="Result"
            component={ResultScreen}
            options={decisionScreenOptionsWithSave('Fix or Replace?')}
          />
          <AppStack.Screen
            name="SideBySide"
            component={SideBySideScreen}
            options={decisionScreenOptionsWithSave('Your Two Options')}
          />
          <AppStack.Screen
            name="Outlook"
            component={OutlookScreen}
            options={decisionScreenOptionsWithSave('Next 24 Months')}
          />
          <AppStack.Screen
            name="Threshold"
            component={ThresholdScreen}
            options={decisionScreenOptionsWithSave('Repair Threshold')}
          />
          <AppStack.Screen
            name="WhatIf"
            component={WhatIfScreen}
            options={decisionScreenOptionsWithSave('Change the Numbers')}
          />
          <AppStack.Screen name="Why" component={WhyScreen} options={decisionScreenOptionsWithSave('Why?')} />
          <AppStack.Screen
            name="Questions"
            component={QuestionsScreen}
            options={decisionScreenOptionsWithSave('Before You Say Yes')}
          />
          <AppStack.Screen
            name="SaveDecision"
            component={SaveDecisionScreen}
            options={decisionScreenOptions('Save This Decision?')}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cancelButton: { paddingHorizontal: 4, paddingVertical: 4 },
  cancelButtonText: { fontSize: 15, color: '#c62828', fontWeight: '600' },
  saveButton: { paddingHorizontal: 4, paddingVertical: 4 },
  saveButtonText: { fontSize: 15, color: '#111', fontWeight: '700' },
});
