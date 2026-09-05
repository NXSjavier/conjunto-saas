import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conjuntos.app',
  appName: 'Conjuntos App',
  webDir: 'dist',
  server: {
    url: 'https://conjuntos-app-pwa.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
