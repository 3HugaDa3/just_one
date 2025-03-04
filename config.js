// Configuration file that loads environment variables or uses defaults
const config = {
    // Default values will be replaced in production environment
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};

// In development, load from local .env-config.js
try {
    if (typeof envConfig !== 'undefined') {
        config.SUPABASE_URL = envConfig.SUPABASE_URL;
        config.SUPABASE_ANON_KEY = envConfig.SUPABASE_ANON_KEY;
    }
} catch (error) {
    console.log('No env-config.js found, using default config');
}
