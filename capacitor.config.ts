import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neofyq.classschedule',
  appName: '课表助手',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
