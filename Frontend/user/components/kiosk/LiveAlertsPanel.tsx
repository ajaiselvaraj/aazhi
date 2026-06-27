import React, { useEffect, useState } from 'react';
import AlertsPanel from './AlertsPanel';
import { CityAlert, Language } from '../../types';
import { startAlertPolling } from '../../services/civicAlertService';

interface Props {
    staticAlerts: CityAlert[];
    language?: Language;
}

const LiveAlertsPanel: React.FC<Props> = ({ staticAlerts, language = Language.ENGLISH }) => {
    const [alerts, setAlerts] = useState<CityAlert[]>(staticAlerts);

    useEffect(() => {
        // Start polling for live alerts, using staticAlerts as a fallback
        const cleanup = startAlertPolling((newAlerts) => {
            if (newAlerts && newAlerts.length > 0) {
                setAlerts(newAlerts);
            }
        }, staticAlerts);

        return cleanup;
    }, [staticAlerts]);

    return <AlertsPanel alerts={alerts} language={language} />;
};

export default LiveAlertsPanel;
