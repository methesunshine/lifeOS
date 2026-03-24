
import { createClient } from '@/lib/supabase-server';

export async function sendTelegramNotification(userId: string, title: string, body: string) {
    try {
        const supabase = await createClient();
        
        // Fetch user profile to get token and chat id
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('telegram_bot_token, telegram_chat_id, notifications_enabled')
            .eq('user_id', userId)
            .single();

        const isEnabled = profile?.notifications_enabled !== false;
        
        if (error || !profile || !profile.telegram_bot_token || !profile.telegram_chat_id || !isEnabled) {
            const reason = error ? error.message : (!profile ? 'Profile not found' : 'Telegram credentials missing or notifications disabled');
            console.log(`Telegram: Notification skipped for user ${userId}. ${reason}`);
            return { success: false, error: reason };
        }

        // Escape Markdown characters for better reliability
        const escapedTitle = title.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
        const escapedBody = body.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
        
        const message = `*${escapedTitle}*\n\n${escapedBody}`;

        const apiUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: profile.telegram_chat_id,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Telegram API error:', responseData);
            return { 
                success: false, 
                error: responseData.description || 'Telegram API rejected the request.'
            };
        }

        return { success: true, data: responseData };
    } catch (error: any) {
        console.error('Failed to send Telegram notification:', error);
        return { success: false, error: error.message || 'Network error while contacting Telegram.' };
    }
}
