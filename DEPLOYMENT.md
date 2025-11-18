# BlackJack Game Deployment Guide

## 🚀 Deployment Options

### 1. Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 2. Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

### 3. Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 4. DigitalOcean App Platform
```bash
# Install doctl
curl -sL https://github.com/digitalocean/doctl/releases/latest/download/doctl-linux-amd64.tar.gz | tar xz
sudo mv doctl /usr/local/bin

# Deploy
doctl apps create --spec .do/app.yaml
```

### 5. Docker Deployment
```bash
# Build and run Docker container
docker build -t blackjack-game .
docker run -p 3000:3000 blackjack-game
```

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git repository
- Prisma CLI (`npm install -g prisma`)
- Environment variables configured
- Database setup (Prisma + SQLite/PostgreSQL)

## 🔧 Environment Setup

1. Copy environment template:
```bash
cp .env.example .env.local
```

2. Configure required variables:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL` (SQLite for local, PostgreSQL for production)

3. Setup database:
```bash
npm run db:push    # Push schema to database
npm run db:generate # Generate Prisma client
```

## 🌐 Domain Configuration

After deployment, update your domain:
1. Add custom domain in deployment platform
2. Update NEXTAUTH_URL to match your domain
3. Configure SSL certificates

## 📊 Monitoring

Set up monitoring for:
- Application performance
- Error tracking
- User analytics
- Database performance

## 🔒 Security Considerations

- Enable HTTPS
- Configure CORS properly
- Set up rate limiting
- Monitor for suspicious activity
- Regular security updates

## 📱 Mobile Optimization

The app is fully optimized for mobile devices:
- Touch-friendly interface
- Responsive design
- Pull-to-refresh functionality
- Optimized performance

## 🎯 Production Features

- Real-time game updates
- Secure payment processing
- User authentication
- Game history tracking
- Mobile-optimized UI

## 🚨 Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] Environment variables configured
- [ ] Prisma CLI installed globally
- [ ] Database connected and schema pushed
- [ ] Prisma client generated
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Performance optimization
- [ ] Security measures in place
- [ ] Mobile testing completed
- [ ] Load testing performed

## 🛠️ Troubleshooting

### Common Issues:
1. **Build failures**: Check Node.js version and dependencies
2. **Database connection**: Verify DATABASE_URL and run `npm run db:push`
3. **Prisma errors**: Run `npm run db:generate` to update client
4. **Authentication issues**: Ensure NEXTAUTH_URL is correct
5. **Mobile problems**: Test on actual devices, not just emulators

### Support:
- Check deployment platform logs
- Review error messages
- Test API endpoints individually
- Verify environment configuration