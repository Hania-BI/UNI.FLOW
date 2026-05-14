import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { COLORS } from './src/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateIssueScreen from './src/screens/CreateIssueScreen';
import IssueDetailScreen from './src/screens/IssueDetailScreen';
import AssignedIssuesScreen from './src/screens/AssignedIssuesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CMTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary }}>
      <Tab.Screen name="My Issues" component={HomeScreen} />
      <Tab.Screen name="Report Issue" component={CreateIssueScreen} />
    </Tab.Navigator>
  );
}

function FMTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary }}>
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      {/* Add Worker Mgmt later */}
    </Tab.Navigator>
  );
}

function WorkerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary }}>
      <Tab.Screen name="My Tasks" component={AssignedIssuesScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user } = useAuth();

  if (user.role === 'community_member') return <CMTabs />;
  if (user.role === 'facility_manager') return <FMTabs />;
  if (user.role === 'worker') return <WorkerTabs />;
  
  return <CMTabs />; // Default
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="App" component={AppNavigator} />
          <Stack.Screen name="IssueDetail" component={IssueDetailScreen} options={{ headerShown: true, title: 'Issue Details' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
