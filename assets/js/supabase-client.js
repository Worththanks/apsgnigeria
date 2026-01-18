// supabase-client.js
// Initializes Supabase client with error handling

// === CONFIGURATION ===
// Replace these with your actual Supabase project values
 const SUPABASE_URL = 'https://hamjvcaacrctnmbkwlag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODk4MzUsImV4cCI6MjA4NDI2NTgzNX0.xvShOYZcSmLoneev4Su8ATzNpGo3sJgC62DrcBpmLw0your-anon-key-here';

try {
    const { createClient } = supabase;  // Assumes Supabase JS is loaded in HTML
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Expose globally
    window.supabase = supabaseClient;
    
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Supabase initialization failed:', error.message);
    alert('Supabase setup error: Check console for details. Verify URL, key, and that Supabase JS CDN is loaded.');
}

export default window.supabase;