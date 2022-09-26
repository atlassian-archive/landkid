import { WidgetSettings } from '../../../types';

export default function getWidgetSettings(): WidgetSettings {
  return {
    refreshInterval: 30000,
    refreshOnlyWhenInViewport: true,
    // @ts-ignore -- this is a global variable that may be set by the server
    ...window.__WIDGET_SETTINGS__,
  };
}
