// supabase-clients.js — CLEAN, SAFE, GLOBAL (2026)

const SUPABASE_URL = 'https://hamjvcaacrctnmbkwlag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODk4MzUsImV4cCI6MjA4NDI2NTgzNX0.xvShOYZcSmLoneev4Su8ATzNpGo3sJgC62DrcBpmLw0'; // ← Replace with your FULL anon key
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY4OTgzNSwiZXhwIjoyMDg0MjY1ODM1fQ.0WfSIxstXl7OSgvZL6umEoiiyNs2uL-bleFVwVLASU0'; // ← Replace with real service key (keep secret!)

      
const { createClient } = supabase;

// Expose globally
window.supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
