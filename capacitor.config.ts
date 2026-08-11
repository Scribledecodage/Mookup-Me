import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mookup.app',
  appName: 'Mookup',
  webDir: 'out',
  server: {
    url: 'https://mookup-main.vercel.app',
    cleartext: true
  }
};

export default config;
