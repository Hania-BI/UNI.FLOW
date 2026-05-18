import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { COLORS } from './src/theme';

// Auth screens
import SplashScreen          from './src/screens/SplashScreen';
import LoginScreen           from './src/screens/LoginScreen';
import SignupScreen          from './src/screens/SignupScreen';
import ForgotPasswordScreen  from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen   from './src/screens/ResetPasswordScreen';

// App screens
import HomeScreen            from './src/screens/HomeScreen';
import CreateIssueScreen     from './src/screens/CreateIssueScreen';
import IssueDetailScreen     from './src/screens/IssueDetailScreen';
import AssignedIssuesScreen  from './src/screens/AssignedIssuesScreen';
import FMDashboardScreen     from './src/screens/FMDashboardScreen';
import WorkersScreen         from './src/screens/WorkersScreen';
import AdminDashboardScreen  from './src/screens/AdminDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function CMTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tab.Screen name="My Issues"    component={HomeScreen} />
      <Tab.Screen name="Report Issue" component={CreateIssueScreen} />
    </Tab.Navigator>
  );
}

function FMTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tab.Screen name="Dashboard" component={FMDashboardScreen} />
      <Tab.Screen name="Workers"   component={WorkersScreen} />
    </Tab.Navigator>
  );
}

function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tab.Screen name="My Tasks" component={AssignedIssuesScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarStyle: { backgroundColor: '#1A1A22', borderTopColor: '#2E2E3E' },
        tabBarLabelStyle: { color: '#8888A8' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Users"
        component={AdminDashboardScreen}
        options={{ tabBarLabel: 'Users', title: 'User Management' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user } = useAuth();
  if (user.role === 'community_member') return <CMTabs />;
  if (user.role === 'facility_manager') return <FMTabs />;
  if (user.role === 'worker')           return <WorkerTabs />;
  if (user.role === 'admin')            return <AdminTabs />;
  return <CMTabs />;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // Ensure splash shows for at least 2.5s (covers auth loading too)
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (loading || !splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="App"         component={AppNavigator} />
          <Stack.Screen
            name="IssueDetail"
            component={IssueDetailScreen}
            options={{ headerShown: true, title: 'Issue Details' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login"           component={LoginScreen} />
          <Stack.Screen name="Signup"          component={SignupScreen} />
          <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword"   component={ResetPasswordScreen} />
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
