/**
 * Platform adapter — detects runtime environment and provides
 * a unified interface for platform-specific operations.
 */

export type Platform = 'electron' | 'capacitor' | 'web';

let _platform: Platform | null = null;

export function getPlatform(): Platform {
  if (_platform) return _platform;

  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    _platform = 'electron';
  } else {
    // Check if running in Capacitor native environment
    const nav = navigator as any;
    if (nav.userAgent?.includes('Capacitor') || (window as any).Capacitor?.isNative?.()) {
      _platform = 'capacitor';
    } else {
      _platform = 'web';
    }
  }
  return _platform;
}

export const isElectron = () => getPlatform() === 'electron';
export const isCapacitor = () => getPlatform() === 'capacitor';
export const isMobile = () => getPlatform() === 'capacitor' || getPlatform() === 'web';
