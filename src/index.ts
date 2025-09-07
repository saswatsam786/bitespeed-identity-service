import dotenv from 'dotenv';

// Load environment variables - try specific env file first, then fallback to .env
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
try {
  console.log(`Loading environment from: ${envFile}`);
  dotenv.config({ path: envFile, override: true });
} catch (error) {
  console.log('Error loading environment variables', error);
  // Fallback to default .env file if specific env file doesn't exist
  dotenv.config({ override: true });
}

import App from './app';

const app = new App();
app.start();
