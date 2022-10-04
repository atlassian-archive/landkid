import { WidgetSettings } from '../../../types';
import { proxyRequestBare } from './RequestProxy';
import { useEffect, useState } from 'react';

const defaultSettings = {
  refreshInterval: 10000,
  refreshOnlyWhenInViewport: false,
};

export default function useWidgetSettings(): WidgetSettings {
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(defaultSettings);

  useEffect(() => {
    proxyRequestBare<WidgetSettings>('/settings', 'POST')
      .then((settings) => {
        setWidgetSettings({ ...defaultSettings, ...settings });
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return widgetSettings;
}
