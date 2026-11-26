'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type UserNotificationAction = 'mark_read' | 'archive' | 'delete';

/**
 * Applies a persisted action to notifications owned by the current user.
 * The database function also verifies auth.uid() and retains notification RLS.
 */
export async function updateUserNotifications(
  userId: string,
  notificationIds: string[],
  action: UserNotificationAction,
): Promise<number> {
  if (!notificationIds.length) return 0;

  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    throw new Error('You can only update notifications for your own account.');
  }

  const { data, error } = await supabase.rpc('update_own_notifications', {
    p_notification_ids: notificationIds,
    p_action: action,
  });
  if (error) throw error;
  return Number(data || 0);
}
