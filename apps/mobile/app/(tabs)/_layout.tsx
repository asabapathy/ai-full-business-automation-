import { Tabs } from 'expo-router'
import { StyleSheet } from 'react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: styles.tabLabel,
        headerTintColor: '#f8fafc',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="brain"
        options={{
          title: 'AI Brain',
          tabBarLabel: 'Brain',
          tabBarIcon: ({ color }) => <TabIcon icon="🧠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: 'CRM',
          tabBarLabel: 'CRM',
          tabBarIcon: ({ color }) => <TabIcon icon="👥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color }) => <TabIcon icon="🧾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <TabIcon icon="🔔" color={color} />,
        }}
      />
    </Tabs>
  )
}

function TabIcon({ icon, color: _color }: { icon: string; color: string }) {
  const { Text } = require('react-native') as typeof import('react-native')
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 17 },
  tabBar: { backgroundColor: '#0f172a', borderTopColor: '#1e293b', borderTopWidth: 1, height: 60, paddingBottom: 8 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
})
