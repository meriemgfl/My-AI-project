// Run the app against data/demo/skincare-demo.sqlite, never the personal database.
process.env.SKINCARE_DEMO = '1';
process.env.PORT ||= '3002';
await import('./index.js');
