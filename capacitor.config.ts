import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.MOOKUP_APP_URL?.trim() || 'https://mookup-me.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.mookup.app',
  appName: 'Mookup',
  webDir: 'out',
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith('http://')
  }
};

export default config;
