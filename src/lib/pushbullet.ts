import { createClient } from '@/lib/supabase-server';

export async function sendPushNotification(userId: string, title: string, body: string) {
    try {
        const supabase = await createClient();
        
        // Fetch user profile to get token
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('pushbullet_token, notifications_enabled')
            .eq('user_id', userId)
            .single();

        if (error || !profile || !profile.pushbullet_token || !profile.notifications_enabled) {
            console.log(`Pushbullet: Notification skipped for user ${userId}. Token missing or disabled.`);
            return false;
        }

        const response = await fetch('https://api.pushbullet.com/v2/pushes', {
            method: 'POST',
            headers: {
                'Access-Token': profile.pushbullet_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'note',
                title: title,
                body: body
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Pushbullet API error:', errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to send Pushbullet notification:', error);
        return false;
    }
}
