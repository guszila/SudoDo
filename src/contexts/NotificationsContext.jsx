/**
 * NotificationsContext — context definition + hook only.
 * Kept separate from NotificationsProvider to satisfy React Fast Refresh rules
 * (a file must export only components OR only non-component values, not both).
 */

import { createContext, useContext } from 'react';

export const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}
