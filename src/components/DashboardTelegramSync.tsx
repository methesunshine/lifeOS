'use client';

import { useEffect } from 'react';

type DashboardSnapshot = {
    overallLifeScore: number;
    latestJourneyActivity: {
        action?: string;
        detail?: string;
        time?: string;
    } | null;
    latestReflection: string;
    topAlertTitle: string;
    topAlertMessage: string;
};

const SNAPSHOT_KEY = 'dashboardTelegramSnapshot';

async function sendDashboardNotification(title: string, body: string) {
    try {
        await fetch('/api/dashboard/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body })
        });
    } catch (error) {
        console.error('Failed to send dashboard notification', error);
    }
}

export default function DashboardTelegramSync({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
    useEffect(() => {
        let mounted = true;

        const syncDashboard = async () => {
            try {
                const [dashboardRes, insightsRes] = await Promise.all([
                    fetch('/api/dashboard'),
                    fetch('/api/insights')
                ]);

                if (!dashboardRes.ok || !insightsRes.ok || !mounted) return;

                const dashboardData = await dashboardRes.json();
                const insightsData = await insightsRes.json();
                const topAlert = insightsData.alerts?.[0];

                const nextSnapshot: DashboardSnapshot = {
                    overallLifeScore: dashboardData.vitals?.overallLifeScore || 0,
                    latestJourneyActivity: dashboardData.vitals?.latestJourneyActivity || null,
                    latestReflection: dashboardData.vitals?.latestReflection || '',
                    topAlertTitle: topAlert?.title || '',
                    topAlertMessage: topAlert?.message || ''
                };

                const savedRaw = localStorage.getItem(SNAPSHOT_KEY);
                if (!savedRaw) {
                    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
                    return;
                }

                const savedSnapshot: DashboardSnapshot = JSON.parse(savedRaw);

                if (savedSnapshot.overallLifeScore !== nextSnapshot.overallLifeScore) {
                    await sendDashboardNotification(
                        '✈️ Logic Center: Overall Life Score Updated',
                        `Overall Life Score is now ${nextSnapshot.overallLifeScore}.`
                    );
                }

                if (savedSnapshot.latestReflection !== nextSnapshot.latestReflection && nextSnapshot.latestReflection) {
                    await sendDashboardNotification(
                        '✈️ Logic Center: Daily Reflection Updated',
                        nextSnapshot.latestReflection.length > 120
                            ? `${nextSnapshot.latestReflection.substring(0, 120)}...`
                            : nextSnapshot.latestReflection
                    );
                }

                const savedJourneyTime = savedSnapshot.latestJourneyActivity?.time || '';
                const nextJourneyTime = nextSnapshot.latestJourneyActivity?.time || '';
                if (savedJourneyTime !== nextJourneyTime && nextSnapshot.latestJourneyActivity) {
                    await sendDashboardNotification(
                        '✈️ Logic Center: Latest Journey Activity',
                        `${nextSnapshot.latestJourneyActivity.action || 'Journey update'} • ${nextSnapshot.latestJourneyActivity.detail || ''}`.trim()
                    );
                }

                const savedAlert = `${savedSnapshot.topAlertTitle}|${savedSnapshot.topAlertMessage}`;
                const nextAlert = `${nextSnapshot.topAlertTitle}|${nextSnapshot.topAlertMessage}`;
                if (savedAlert !== nextAlert && nextSnapshot.topAlertTitle && nextSnapshot.topAlertMessage) {
                    await sendDashboardNotification(
                        `✈️ Logic Center: ${nextSnapshot.topAlertTitle}`,
                        nextSnapshot.topAlertMessage
                    );
                }

                localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
            } catch (error) {
                console.error('Failed to sync dashboard snapshot', error);
            }
        };

        const seed = localStorage.getItem(SNAPSHOT_KEY);
        if (!seed) {
            localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(initialSnapshot));
        }

        syncDashboard();
        const interval = setInterval(syncDashboard, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [initialSnapshot]);

    return null;
}
