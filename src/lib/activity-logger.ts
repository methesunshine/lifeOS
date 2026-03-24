import { createClient } from './supabase-server';
import { sendTelegramNotification } from './telegram';
 
export type ActivityArea = 
  | 'Dashboard' 
  | 'Reminders' 
  | 'Physical Health' 
  | 'Mental Health' 
  | 'Finance' 
  | 'Goals' 
  | 'Skills' 
  | 'Journey'
  | 'Settings'
  | 'Focus Mode';

export interface ActivityParams {
  userId: string;
  area: ActivityArea;
  action: string;
  detail: string;
  icon: string;
  reference_id?: string;
  target_url?: string;
}

export async function logActivity(params: ActivityParams) {
  try {
    const supabase = await createClient();

    const { data: insertedRows, error } = await supabase
      .from('system_activity_logs')
      .insert([{
        user_id: params.userId,
        area: params.area,
        action: params.action,
        detail: params.detail,
        icon: params.icon,
        reference_id: params.reference_id
      }])
      .select();

    if (error) {
      console.error('Failed to log activity:', error);
    }

    const data = insertedRows ? insertedRows[0] : null;

    // Proceed to Telegram even if DB log failed (as long as we have userId)
    const targetUserId = params.userId;
    if (targetUserId) {
      const pushTitle = `${params.icon} ${params.area}: ${params.action}`;
      const pushBody = params.detail;

      // Telegram mirror
      try {
        const result = await sendTelegramNotification(targetUserId, pushTitle, pushBody);
        if (!result.success && result.error !== 'Telegram credentials missing or notifications disabled') {
          console.error(`Telegram mirror failed for activity [${params.area}]:`, result.error);
        }
      } catch (err: any) {
        console.error('Telegram bridge critical error:', err);
      }
    }

    return data;
  } catch (error: any) {
    console.error('Activity logger error:', error);
    return null;
  }
}
