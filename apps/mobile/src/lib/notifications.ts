import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { api } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kanavu AI',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    })
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'kanavu-ai-app',
  })

  // Register token with backend
  try {
    await api.post('/notifications/register-push', { token: token.data, platform: Platform.OS })
  } catch {}

  return token.data
}
