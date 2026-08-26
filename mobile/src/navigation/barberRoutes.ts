import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Route names and cross-tab navigation for the barber section.
 *
 * This lives apart from BarberNavigator on purpose: the navigator imports every
 * screen, so a screen importing a *value* back from it closes a require cycle.
 * Types alone are erased at compile time and would have been fine; the helper
 * below is not.
 */

export type BarberStackParamList = {
  Home: undefined;
  Agenda: undefined;
  WalkIn: undefined;
  Payments: undefined;
  Stats: undefined;
  Reports: undefined;
  Schedule: undefined;
  ScheduleTemplates: undefined;
  Portfolio: undefined;
  BeforeAfter: undefined;
  Messages: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  ShopSelector: undefined;
  BugReport: undefined;
  Availability: undefined;
  Profile: undefined;
  Reviews: undefined;
  FrequentClients: undefined;
  CommissionSettings: undefined;
};

export type BarberTabParamList = {
  HomeTab: undefined;
  AgendaTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
  MoreTab: undefined;
};

/**
 * Which tab's stack owns each screen.
 *
 * `navigate()` only searches the current navigator and its ancestors, never a
 * sibling tab's stack — so `navigate('Schedule')` from the agenda silently
 * failed with "was not handled by any navigator". Jumping between tabs has to
 * name the tab first, which is what goToBarberScreen() does.
 *
 * Typed as a total Record, so adding a screen without assigning it a tab is a
 * compile error rather than a button that quietly does nothing.
 */
const SCREEN_TAB: Record<keyof BarberStackParamList, keyof BarberTabParamList> = {
  Home: 'HomeTab',
  Notifications: 'HomeTab',
  Agenda: 'AgendaTab',
  WalkIn: 'AgendaTab',
  Payments: 'AgendaTab',
  ShopSelector: 'AgendaTab',
  Stats: 'StatsTab',
  Reports: 'StatsTab',
  Profile: 'ProfileTab',
  Availability: 'MoreTab',
  Schedule: 'MoreTab',
  ScheduleTemplates: 'MoreTab',
  Portfolio: 'MoreTab',
  BeforeAfter: 'MoreTab',
  Reviews: 'MoreTab',
  FrequentClients: 'MoreTab',
  Messages: 'MoreTab',
  NotificationSettings: 'MoreTab',
  BugReport: 'MoreTab',
  CommissionSettings: 'MoreTab',
};

/** Navigate to any barber screen, whichever tab it lives in. */
export function goToBarberScreen(
  navigation: { getParent: <T>() => T | undefined },
  screen: keyof BarberStackParamList,
): void {
  const parent = navigation.getParent<BottomTabNavigationProp<BarberTabParamList>>();
  parent?.navigate(SCREEN_TAB[screen], { screen } as never);
}
