// environment.ts (Разработка)
const bizzarUrl = 'https://bizzar-kline-data-fetcher.onrender.com';
const bazzarUrl = 'https://bazzar-kline-data-fetcher.onrender.com';

const coinSifterUrl = 'https://coin-sifter-server.onrender.com';
//const alertsHubUrl = 'https://alert-hub-server.onrender.com';
const alertsHubUrl = 'https://alerts-superhub-deno.deno.dev';
export const BUFFER_MS = 3 * 60 * 1000;
export const PIXEL_TOLERANCE = 5;

export const environment = {
  coinsUrl: coinSifterUrl + '/coins/filtered',
  alertsUrl: alertsHubUrl + '/api/alerts',
  lineAlertsUrl: alertsHubUrl + '/api/alerts/line',
  vwapAlertsUrl: alertsHubUrl + '/api/alerts/vwap',
  workingCoinsUrl: alertsHubUrl + '/api/coins/working',
  authCheckUrl: alertsHubUrl + '/api/auth/check-email',
  token: 'O0hrTGEd3meImdof/H0Hj2XOKuVgQAbr+D9w0DRZvtA=',
  klineDataUrls: {
    '1h': bazzarUrl + '/api/cache/1h',
    '4h': bizzarUrl + '/api/cache/4h',
    '8h': bizzarUrl + '/api/cache/8h',
    '12h': bazzarUrl + '/api/cache/12h',
    D: bazzarUrl + '/api/cache/D',
    '1d': bazzarUrl + '/api/cache/D', // Alias for D
  },
  firebaseConfig: {
    apiKey: 'AIzaSyDxLJ_y7fcn-bGA0Ls9Xn3u8YRzz9pD7RQ',
    authDomain: 'crypto-market-vibe.firebaseapp.com',
    projectId: 'crypto-market-vibe',
    storageBucket: 'crypto-market-vibe.firebasestorage.app',
    messagingSenderId: '941033449875',
    appId: '1:941033449875:web:f29d657d4b53ac8e60e066',
  },
  serverBaseUrls: {
    '1h': bazzarUrl,
    '4h': bizzarUrl,
    '8h': bizzarUrl,
    '12h': bazzarUrl,
    D: bazzarUrl,
    '1d': bazzarUrl,
  } as Record<string, string>, // Type casting для удобства в
  // Ngrok unified data source configuration
  ngrokBaseUrl: 'https://loyal-yearly-jawfish.ngrok-free.app',
  ngrokKlineDataUrls: {
    '1h': 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/1h',
    '4h': 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/4h',
    '8h': 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/8h',
    '12h': 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/12h',
    D: 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/D',
    '1d': 'https://loyal-yearly-jawfish.ngrok-free.app/api/cache/D', // Alias for D
  },
  defaultDataSource: 'ngrok' as 'render' | 'ngrok', // Default to Ngrok servers
};
