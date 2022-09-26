import { WidgetSettings } from '../../../types';

export default function getWidgetSettings(): WidgetSettings {
  return {
    refreshInterval: 10000,
    refreshOnlyWhenInViewport: false,
    // @ts-ignore -- this is a global variable that may be set by the server
    ...window.__WIDGET_SETTINGS__,
  };
}
