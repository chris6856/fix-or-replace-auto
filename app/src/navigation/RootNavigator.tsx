import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

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
    <NavigationContainer>
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
          <AppStack.Screen name="MileageCheck" component={MileageCheckScreen} options={{ title: 'Current Mileage' }} />
          <AppStack.Screen
            name="RepairEstimate"
            component={RepairEstimateScreen}
            options={{ title: 'What Did the Shop Say?' }}
          />
          <AppStack.Screen
            name="ConfirmRepair"
            component={ConfirmRepairScreen}
            options={{ title: "Here's What We Heard" }}
          />
          <AppStack.Screen
            name="VehicleHistory"
            component={VehicleHistoryScreen}
            options={{ title: 'Vehicle History' }}
          />
          <AppStack.Screen name="Financials" component={FinancialsScreen} options={{ title: 'Financials' }} />
          <AppStack.Screen name="CurrentValue" component={CurrentValueScreen} options={{ title: 'Vehicle Value' }} />
          <AppStack.Screen
            name="ReplacementQuestion"
            component={ReplacementQuestionScreen}
            options={{ title: 'If You Replace It' }}
          />
          <AppStack.Screen
            name="ReplacementPrice"
            component={ReplacementPriceScreen}
            options={{ title: 'Replacement Vehicle' }}
          />
          <AppStack.Screen
            name="ReplacementCosts"
            component={ReplacementCostsScreen}
            options={{ title: 'Real Cost to Replace' }}
          />
          <AppStack.Screen name="TradeIn" component={TradeInScreen} options={{ title: 'Your Current Vehicle' }} />
          <AppStack.Screen name="Financing" component={FinancingScreen} options={{ title: 'Financing' }} />
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
