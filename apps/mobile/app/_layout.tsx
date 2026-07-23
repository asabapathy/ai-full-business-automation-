import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../src/stores/auth.store'
import LoginScreen from '../src/screens/LoginScreen'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore()

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}
