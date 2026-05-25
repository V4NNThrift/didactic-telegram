# Nexus AI - Premium AI Platform

Modern fullstack AI website dengan fitur lengkap, built with Next.js 14, PostgreSQL, dan TailwindCSS.

![Nexus AI](https://img.shields.io/badge/Nexus-AI-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan?style=flat-square)

## Features

### Authentication System
- Telegram OTP verification
- JWT-based session management
- Secure password hashing (bcrypt)
- Anti brute-force protection
- Rate limiting
- Login notifications via Telegram

### AI Chat
- 5 AI modes: Fast, Smart, Thinking, Creative, Focus
- Real-time typing indicators
- Markdown support with syntax highlighting
- Code block copying
- Chat history management
- Pin/archive/delete chats
- Response regeneration

### AI Tool Hub
- Text Summarizer
- Text Rewriter (formal/casual/simple)
- Multi-language Translator
- Code Explainer
- Grammar Checker
- Caption Generator
- Username Generator
- Bio Generator
- Prompt Enhancer
- Article Idea Generator
- Regex Helper
- JSON Formatter

### Mobile Legends Checker
- Account validation by User ID + Server ID
- Region detection
- Check history
- Rate limiting protection

### Personal Hub
- Notes with colors and pinning
- Todo list with priorities and due dates
- Activity tracking

### Admin Panel
- Dashboard statistics
- User management (ban/unban/delete)
- Login logs
- Broadcast messaging

### Security
- CORS protection
- XSS prevention
- SQL injection protection
- Rate limiting
- Secure cookies
- Input sanitization

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** TailwindCSS
- **Authentication:** JWT + Telegram OTP
- **UI Components:** Custom components with Framer Motion
- **Icons:** React Icons
- **Notifications:** React Hot Toast

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, register)
│   ├── api/              # API routes
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # Chat endpoints
│   │   ├── hub/          # Notes & todos endpoints
│   │   ├── ml-checker/   # ML checker endpoints
│   │   ├── profile/      # Profile endpoints
│   │   ├── telegram/     # Telegram webhook
│   │   ├── tools/        # AI tools endpoints
│   │   └── health/       # Health check
│   ├── dashboard/        # Dashboard pages
│   └── page.tsx          # Landing page
├── components/
│   ├── chat/             # Chat components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/
│   ├── ai-engine.ts      # AI response generator
│   ├── auth.ts           # Auth utilities
│   ├── ml-checker.ts     # ML account checker
│   ├── prisma.ts         # Prisma client
│   ├── rate-limit.ts     # Rate limiting
│   ├── telegram.ts       # Telegram bot utilities
│   └── utils.ts          # General utilities
└── middleware.ts         # Auth middleware
```

## Environment Variables

Create `.env` file with:

```env
# Database (Railway provides this automatically)
DATABASE_URL=postgresql://user:password@host:5432/database

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_OWNER_ID=your_telegram_user_id

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars

# App URL (Railway provides this)
APP_URL=https://your-app.up.railway.app
NODE_ENV=production
```

## Railway Deployment

### Step 1: Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the instructions
3. Copy the bot token (format: `123456789:ABC...`)
4. Send `/setcommands` to BotFather and set:
   ```
   start - Start the bot
   help - Get help
   id - Get your Telegram ID
   status - Check account status
   ```

### Step 2: Get Your Telegram ID

1. Search for `@userinfobot` on Telegram
2. Send any message
3. Copy your user ID (number)

### Step 3: Deploy to Railway

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/nexus-ai.git
   cd nexus-ai
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select the repo

3. **Add PostgreSQL**
   - In Railway dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Wait for provisioning

4. **Configure Environment Variables**
   - Go to your service settings
   - Add the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_OWNER_ID=your_telegram_id
   JWT_SECRET=generate_a_strong_32_char_secret
   NODE_ENV=production
   ```
   - Railway automatically adds `DATABASE_URL`

5. **Set Domain**
   - Go to Settings → Domains
   - Generate a Railway domain or add custom domain
   - Copy the URL for `APP_URL`

6. **Deploy**
   - Railway will automatically deploy on push
   - Wait for build to complete
   - Check logs for any errors

### Step 4: Setup Telegram Webhook

After deployment, set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.up.railway.app/api/telegram/webhook"
```

Or visit in browser:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.up.railway.app/api/telegram/webhook
```

### Step 5: Verify Deployment

1. Visit your Railway URL
2. Test Telegram bot with `/start`
3. Register an account
4. Login and explore features

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/your-username/nexus-ai.git
   cd nexus-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Setup database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get session

### Chat
- `GET /api/chat` - List chats
- `POST /api/chat` - Create chat
- `GET /api/chat/:id` - Get chat
- `PATCH /api/chat/:id` - Update chat
- `DELETE /api/chat/:id` - Delete chat
- `GET /api/chat/:id/messages` - Get messages
- `POST /api/chat/:id/messages` - Send message

### Tools
- `POST /api/tools/process` - Process tool

### ML Checker
- `POST /api/ml-checker/check` - Check account
- `GET /api/ml-checker/history` - Get history
- `DELETE /api/ml-checker/history` - Clear history

### Profile
- `GET /api/profile` - Get profile
- `PATCH /api/profile` - Update profile
- `POST /api/profile/change-password` - Change password
- `GET /api/profile/sessions` - Get sessions
- `DELETE /api/profile/sessions` - Revoke all sessions
- `DELETE /api/profile/sessions/:id` - Revoke session
- `GET /api/profile/login-logs` - Get login logs

### Hub
- `GET/POST /api/hub/notes` - Notes CRUD
- `PATCH/DELETE /api/hub/notes/:id` - Note operations
- `GET/POST /api/hub/todos` - Todos CRUD
- `PATCH/DELETE /api/hub/todos/:id` - Todo operations
- `GET /api/hub/activities` - Get activities

### Admin (Admin only)
- `GET /api/admin/check` - Check admin status
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/users` - List users
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/ban` - Ban/unban user
- `GET /api/admin/logs` - Get login logs
- `POST /api/admin/broadcast` - Send broadcast

### Health
- `GET /api/health` - Health check
- `GET /api/telegram/webhook` - Webhook status
- `POST /api/telegram/webhook` - Telegram webhook

## Troubleshooting

### Common Issues

**1. Bot not responding**
- Check if webhook is set correctly
- Verify bot token is valid
- Check Railway logs for errors

**2. Database connection failed**
- Verify DATABASE_URL is correct
- Check PostgreSQL service is running
- Run `npx prisma db push` again

**3. OTP not received**
- Make sure you sent `/start` to the bot first
- Verify TELEGRAM_BOT_TOKEN is correct
- Check Telegram ID is numeric

**4. Login fails**
- Clear browser cookies
- Check if account is banned
- Verify credentials

### Logs

View Railway logs:
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" → "View Logs"

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues or questions:
- Open GitHub issue
- Contact via Telegram bot

---

Built with ❤️ using Next.js, PostgreSQL, and TailwindCSS
