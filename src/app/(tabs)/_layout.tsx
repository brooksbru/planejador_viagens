import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'index', title: 'Mapa', icon: 'map-outline', iconFocused: 'map' },
  { name: 'viagens', title: 'Viagens', icon: 'airplane-outline', iconFocused: 'airplane' },
  { name: 'conquistas', title: 'Conquistas', icon: 'trophy-outline', iconFocused: 'trophy' },
  { name: 'perfil', title: 'Perfil', icon: 'person-outline', iconFocused: 'person' },
];

export default function TabLayout() {
  const { colors, typography } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Aba ativa usa --action: navegar é ação, não conquista.
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // 11px (micro) só vale pra rótulo maiúsculo; aba usa label (13px).
        tabBarLabelStyle: typography.label,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                color={focused ? colors.action : colors.textSecondary}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
