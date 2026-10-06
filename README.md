# EarnHub money-making web app

## Run locally
1. Install Node.js 18+.
2. In this folder run `npm install`.
3. Set a strong admin password and session secret:
   - Linux/macOS: `ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='YourStrongPassword' SESSION_SECRET='long-random-secret' npm start`
   - Windows PowerShell: `$env:ADMIN_EMAIL='admin@example.com'; $env:ADMIN_PASSWORD='YourStrongPassword'; $env:SESSION_SECRET='long-random-secret'; npm start`
4. Open http://localhost:3000

The SQLite database is created as `app.db`.

## Included
- Signup/login with bcrypt password hashing
- Session authentication
- User wallet balance
- Demo earning endpoint
- Withdrawal requests with minimum 5.00
- Admin dashboard
- Admin approve/reject flow
- SQLite persistence

## Before real-money launch
Replace the demo earning endpoint with verified tasks/ad/referral revenue, add rate limiting, CSRF protection, HTTPS, secure cookies, audit logs, KYC/AML and age/eligibility checks where required, and connect an authorized payment provider. Never put bank credentials or secrets in client-side code.

## Publish online

### Render
This project includes `render.yaml` and a `Dockerfile`. Create a Render account, connect the project repository, and create the service from the included configuration. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in the service environment. The included persistent disk keeps the SQLite database from disappearing on restarts.

### Important production work
This is a functional starter, not a finished regulated financial service. Before accepting real deposits or promising real earnings, add an authorized payment provider, verified revenue-generating tasks, HTTPS/secure cookies, rate limiting, CSRF protection, audit logs, fraud controls, and any required KYC/AML/consumer-protection compliance.
