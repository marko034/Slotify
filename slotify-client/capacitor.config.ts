import type { CapacitorConfig } from '@capacitor/cli';

// Za razvoj na telefonu: $env:CAP_DEV = "true" pre cap sync
const dev = process.env['CAP_DEV'] === 'true';

const config: CapacitorConfig = {
  appId: 'rs.slotify.app', // zameni svojim obrnutim domenom, posle objave na Play-u se ne menja
  appName: 'Slotify',
  webDir: 'www',
  server: dev ? { androidScheme: 'http', cleartext: true } : { androidScheme: 'https' },
};

export default config;