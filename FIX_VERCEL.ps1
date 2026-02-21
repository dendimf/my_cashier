# FIX_VERCEL.ps1
# This script helps sync your local environment variables to Vercel.

Write-Host "🚀 Preparing Vercel Environment Sync..." -ForegroundColor Cyan

# Check for Vercel CLI
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found! Please install it: npm install -g vercel" -ForegroundColor Red
    exit
}

# Values to set (Add your actual live backend URL here)
$BACKEND_URL = "https://kasirku-backend.railway.app" # GANTI DENGAN URL BACKEND LIVE ANDA

$envVars = @{
    "SUPABASE_URL" = "https://doqhzscuejqlsfbvljqn.supabase.co"
    "SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcWh6c2N1ZWpxbHNmYnZsanFuIiwicm9sZSI6ImRvcWh6c2N1ZWpxbHNmYnZsanFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTM1MDEsImV4cCI6MjA4MjMyOTUwMX0.jJbuRUdU10qJUWpY1eNDsavd9BMYp876s3YdaJtcpsI"
    "JWT_SECRET" = "your-super-secret-jwt-key-min-32-characters"
    "NEXT_PUBLIC_API_URL" = "$BACKEND_URL/api"
}

Write-Host "📡 Adding environment variables to Vercel..."
foreach ($key in $envVars.Keys) {
    Write-Host "Setting $key..."
    $val = $envVars[$key]
    echo $val | vercel env add $key production
}

Write-Host "✅ Done! Re-deploy to apply changes: vercel --prod" -ForegroundColor Green
