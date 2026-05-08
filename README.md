# FillUp - Fuel & Mechanical Services Platform

FillUp is Ghana's leading platform for fuel delivery and mechanical services. Get fuel delivered to your location or book emergency roadside assistance with just a few taps.

## Features

- **Multi-Role Authentication**: Customer, Agent, Station, and Admin roles
- **Real-time Tracking**: Track your fuel delivery or mechanic in real-time
- **Secure Payments**: Integrated payment system with mobile money support
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Role-based Dashboards**: Tailored experiences for each user type

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Real-time)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Build Tool**: Vite

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deploying (Fix Google OAuth Redirecting to localhost)

If Google sign-in works locally but redirects to `http://localhost:...` after deploying, your Supabase Auth URL configuration is still pointing at localhost (or your live domain is not allowlisted).

In your Supabase project:

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your live site origin
   - Netlify default domain example: `https://your-site-name.netlify.app`
   - Custom domain example: `https://your-domain.com`
3. Add these to **Additional Redirect URLs** (include every domain you actually use):
   - `https://your-site-name.netlify.app`
   - `https://your-site-name.netlify.app/login`
   - `https://your-domain.com`
   - `https://your-domain.com/login`
   - Local dev (optional): `http://localhost:5173/login`

If you are using Netlify Deploy Previews (different subdomains per PR), prefer deploying from a stable domain (your main Netlify domain or a custom domain) so you don’t have to keep updating allowlists.

Google Cloud / OAuth provider checklist:

- In **Supabase → Authentication → Providers → Google**, ensure Google is enabled.
- In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (Web application)**:
  - **Authorized redirect URIs** must include your Supabase callback:
    - `https://<your-project-ref>.supabase.co/auth/v1/callback`
  - **Authorized JavaScript origins** should include your app origin(s):
    - `https://your-site-name.netlify.app`
    - `https://your-domain.com`

Notes:
- This app uses a stable OAuth return URL of `/login` (see `signInWithGoogle`). Allowlist the `/login` URL for each domain you use.
- Also make sure your Netlify environment variables point to the correct Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## User Roles

### Customer (`/dashboard`)
- Request fuel delivery
- Book mechanic services
- Track orders in real-time
- Manage vehicles and wallet

### Service Provider (`/agent/dashboard`)
- Accept fuel delivery or mechanic jobs
- Track earnings
- Update job status
- Navigate to customers

### Fuel Station (`/station/dashboard`)
- Manage fuel inventory
- Handle agent pickups
- Track sales and revenue

### Admin (`/admin/dashboard`)
- Monitor all platform activity
- Approve new agents and stations
- Handle support tickets
- Manage payments and commissions

## Database Schema

The platform uses Supabase with the following main tables:
- `users` - User accounts with role-based access
- `orders` - Service requests and deliveries
- `agents` - Service provider profiles
- `stations` - Fuel station information
- `wallets` - Payment and balance management
- `transactions` - Financial records
- `ratings` - Service quality feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is proprietary software. All rights reserved.