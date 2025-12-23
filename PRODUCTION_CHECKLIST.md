# MetaBlackjack Production Deployment Checklist

## Pre-Deployment Checklist

### ✓ Environment Configuration
- [ ] `.env.local` exists with all required variables
- [ ] `.env.local` is in `.gitignore` (not committed to git)
- [ ] `DATABASE_URL` uses managed PostgreSQL URL (not local)
- [ ] `REDIS_URL` uses managed Redis URL (not local)
- [ ] `POLYGON_AMOY_RPC_URL` is live and accessible
- [ ] `BACKEND_PRIVATE_KEY` is generated (64 hex chars + 0x prefix)
- [ ] `INTERNAL_API_KEY` is generated (32+ characters, random)
- [ ] All contract addresses are valid and deployed
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` or `error` (not debug)
- [ ] Redis and PostgreSQL connection strings are tested

### ✓ Security
- [ ] No private keys exposed in source code
- [ ] No API keys committed to git history
- [ ] Backend private key is in correct format (0x + 64 hex)
- [ ] Internal API key is unique (not using example)
- [ ] CORS origins are restricted to production domains
- [ ] Rate limiting is enabled
- [ ] SSL/TLS certificates are configured
- [ ] Security headers are set (Helmet.js)
- [ ] .dockerignore excludes sensitive files
- [ ] Non-root user configured in Dockerfile
- [ ] Secrets managed via environment variables or vault
- [ ] Database credentials are strong and unique
- [ ] Redis authentication configured (if applicable)
- [ ] Input validation on all API endpoints
- [ ] Web3 connection uses secure RPC endpoints (HTTPS)

### ✓ Application Configuration
- [ ] All dependencies installed (`npm ci` runs successfully)
- [ ] Next.js build completes without errors (`npm run build`)
- [ ] Prisma client is generated (`npx prisma generate`)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Health check endpoint (`/health`) returns 200
- [ ] Readiness endpoint (`/ready`) returns 200
- [ ] Socket.IO properly configured with CORS
- [ ] Redis caching is functional
- [ ] Database connection pooling configured
- [ ] Blockchain event listeners are running
- [ ] WebSocket connections are established
- [ ] Application starts without errors
- [ ] All API routes respond correctly
- [ ] No console errors or warnings in production mode

### ✓ Docker Configuration
- [ ] Multi-stage build configured correctly
- [ ] Health check in Dockerfile is functional
- [ ] Non-root user (`nextjs`) is used
- [ ] Only production dependencies in final image
- [ ] Port 3000 exposed and accessible
- [ ] Volume mounts are correct (logs, cache)
- [ ] `.dockerignore` properly configured
- [ ] Image size is optimized (<500MB)
- [ ] No secrets in Docker image layers
- [ ] Dockerfile passes security scan

### ✓ Database Configuration
- [ ] PostgreSQL version 15.x recommended
- [ ] Connection pooling configured (PgBouncer optional)
- [ ] Indexes created for common queries
- [ ] Database backup strategy in place
- [ ] Migration scripts tested
- [ ] Connection limits appropriate for load
- [ ] Slow query monitoring enabled
- [ ] Table statistics up-to-date (ANALYZE run)
- [ ] Row-level security configured (if needed)
- [ ] Database encryption at rest (if supported)

### ✓ Redis Configuration
- [ ] Redis version 7.x recommended
- [ ] Memory limit configured (maxmemory policy)
- [ ] Persistence enabled (RDB or AOF)
- [ ] Cache TTL values configured for different data types
- [ ] Connection pooling configured
- [ ] Redis monitoring enabled
- [ ] Cache invalidation strategy defined
- [ ] Redis authentication configured

### ✓ Blockchain Configuration
- [ ] Polygon Amoy RPC endpoint is live
- [ ] All deployed contract addresses are accurate
- [ ] Backend wallet has sufficient MATIC for gas
- [ ] Event listeners configured for all contracts
- [ ] Gas price estimation configured
- [ ] Transaction retry logic implemented
- [ ] Web3 provider timeout configured
- [ ] Fallback RPC endpoints configured (optional)
- [ ] Blockchain data caching enabled
- [ ] Transaction monitoring active

### ✓ Performance
- [ ] Bundle size analyzed and optimized
- [ ] Code splitting implemented
- [ ] Images optimized (WebP format, lazy loading)
- [ ] API response times <200ms (p95)
- [ ] Database query times <100ms (p95)
- [ ] Cache hit rate >80%
- [ ] WebSocket message processing latency <50ms
- [ ] Concurrent user load tested (target: 1000+ users)
- [ ] Database connection pool size appropriate
- [ ] Redis memory limit sufficient
- [ ] Load testing completed

### ✓ Logging & Monitoring
- [ ] Application logs are structured (JSON format)
- [ ] Error tracking configured (Sentry, Logtail, etc.)
- [ ] Performance metrics collected
- [ ] Health checks run every 30 seconds
- [ ] Slow query logging enabled
- [ ] Request logging with response times
- [ ] WebSocket connection monitoring
- [ ] Custom business metrics defined
- [ ] Alert thresholds configured
- [ ] Log aggregation set up
- [ ] Dashboards created (Grafana, etc.)

### ✓ Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] End-to-end tests pass
- [ ] Load tests completed
- [ ] Security scans pass (npm audit, Docker scan)
- [ ] Smart contract audits completed
- [ ] Database migration tests pass
- [ ] API contract tests pass
- [ ] WebSocket tests pass
- [ ] Blockchain integration tests pass
- [ ] Performance benchmarks met
- [ ] Compatibility tests (multiple browsers)
- [ ] Accessibility checks pass

## Deployment Verification

### ✓ Pre-Deployment Validation
- [ ] Run `./scripts/validate-env.sh` (no errors)
- [ ] Run `./scripts/healthcheck.sh` (exit code 0)
- [ ] Run `./scripts/migrate.sh test` (connection successful)
- [ ] Run `docker-compose config` (no configuration errors)
- [ ] Verify all secrets present in Railway dashboard
- [ ] Confirm backup strategy is active
- [ ] Verify rollback plan is documented
- [ ] Check domain DNS configuration
- [ ] Verify SSL/TLS certificate is valid
- [ ] Confirm monitoring alerts are working
- [ ] Test incident response procedures

### ✓ Railway-Specific Checks (if applicable)
- [ ] Railway project created and linked
- [ ] Production environment configured
- [ ] PostgreSQL service provisioned
- [ ] Redis service provisioned
- [ ] Domain configured (custom or Railway)
- [ ] SSL certificate provisioned automatically
- [ ] Deploy hook configured
- [ ] Auto-deploy on push enabled
- [ ] Environment variables synchronized
- [ ] Scaling configuration set (min/max replicas)
- [ ] Resource limits configured
- [ ] Health check path configured (/health)
- [ ] Build command configured
- [ ] Start command configured (node server.js)
- [ ] Secrets managed through Railway dashboard

### ✓ Docker-Specific Checks (if applicable)
- [ ] Docker image builds successfully
- [ ] Image passes security scan (no critical vulnerabilities)
- [ ] Image size is under 500MB (compressed)
- [ ] Multi-stage build optimized
- [ ] Non-root user configured
- [ ] Health check works correctly
- [ ] Readiness check works correctly
- [ ] Environment variables passed correctly
- [ ] Volumes mounted correctly
- [ ] Network configuration secure
- [ ] Resource limits configured (memory, CPU)
- [ ] Restart policy configured (unless-stopped)
- [ ] Log driver configured

## Post-Deployment Checklist

### ✓ Immediate Post-Deployment (0-30 minutes)
- [ ] Application loads without errors
- [ ] Health check returns 200 OK
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] WebSocket connections establish
- [ ] API endpoints respond correctly
- [ ] User registration/login works
- [ ] Game creation works
- [ ] Blockchain deposits work
- [ ] Withdrawals process correctly
- [ ] Real-time updates working
- [ ] No errors in application logs
- [ ] No errors in database logs
- [ ] No errors in Redis logs
- [ ] Response times are acceptable
- [ ] All monitoring systems reporting

### ✓ Short-Term Monitoring (30 minutes - 2 hours)
- [ ] No 5xx errors in logs
- [ ] No database connection errors
- [ ] No Redis connection errors
- [ ] No WebSocket disconnections
- [ ] CPU usage is stable
- [ ] Memory usage is stable
- [ ] Disk usage is stable
- [ ] Network traffic is normal
- [ ] User registration working
- [ ] Games are being created
- [ ] Transactions are processing
- [ ] Cache hit rate >80%
- [ ] API response times <200ms
- [ ] Database query times <100ms
- [ ] No unusual error patterns
- [ ] Alert system is working

### ✓ Mid-Term Monitoring (2-24 hours)
- [ ] No memory leaks detected
- [ ] No database locks
- [ ] No Redis evictions
- [ ] No orphaned connections
- [ ] Backup completed successfully
- [ ] Log rotation working
- [ ] No disk space issues
- [ ] User feedback positive
- [ ] No performance degradation
- [ ] All scheduled jobs running
- [ ] Blockchain events syncing
- [ ] No stale WebSocket connections
- [ ] No cache stampede issues
- [ ] Database replication (if applicable)
- [ ] SSL certificate renewal working

### ✓ Long-Term Monitoring (24+ hours)
- [ ] Week-over-week performance stable
- [ ] Monthly backup verification
- [ ] Disaster recovery test completed
- [ ] Security audit passed
- [ ] Compliance checks passed
- [ ] Cost analysis completed
- [ ] Capacity planning updated
- [ ] Update strategy defined
- [ ] Incident post-mortems completed
- [ ] Documentation updated
- [ ] Runbook updated with actual values
- [ ] Team training completed
- [ ] Onboarding process ready
- [ ] Support escalation paths defined

## Rollback Plan

### When to Rollback
- [ ] Application fails health checks for >5 minutes
- [ ] Critical 5xx errors >10% of requests
- [ ] Database corruption detected
- [ ] Security breach confirmed
- [ ] Complete system failure
- [ ] Blockchain integration broken
- [ ] User funds at risk

### Rollback Procedures
1. **Immediate actions** (0-5 minutes):
   - Disable auto-deploy
   - Post incident status
   - Isolate faulty deployment

2. **Assessment** (5-15 minutes):
   - Identify root cause
   - Determine if rollback needed
   - Prepare rollback environment

3. **Rollback execution** (15-30 minutes):
   - Restore previous container/image version
   - Restore database from backup
   - Verify functionality
   - Conduct smoke tests

4. **Post-rollback** (30+ minutes):
   - Monitor for issues
   - Document incident and recovery
   - Diagnose root cause
   - Plan fix and re-deployment

5. **Recovery**:
   - Create incident post-mortem
   - Update documentation
   - Improve monitoring and alerts
   - Conduct team training
   - Update deployment pipeline

## Incident Response

### Severity Levels
- **P1 (Critical)**: Complete system outage, security breach, funds at risk
- **P2 (High)**: Major feature broken, significant impact on users
- **P3 (Medium)**: Minor feature broken, moderate impact on users
- **P4 (Low)**: Non-critical issues, low impact

### Incident Response Team
- Primary: 
- Secondary: 
- Escalation: 
- On-call rotation: 
- Escalation path: 
- Communication channels: 

### Communication Plan
- **Internal**: Slack #incidents, phone tree, email
- **External**: Status page, Twitter, Discord, email to users
- **Stakeholders**: Email, conference call, status reports
- **Regulatory**: Immediate notification as required

## Documentation Handoff

### For Development Team
- [ ] Code architecture documented
- [ ] API documentation complete
- [ ] Environment setup guide complete
- [ ] Testing guidelines documented
- [ ] Code review process defined
- [ ] CI/CD pipeline documented
- [ ] Deployment procedures documented
- [ ] Git workflow established
- [ ] Coding standards defined
- [ ] Performance guidelines documented
- [ ] Security best practices documented

### For Operations Team
- [ ] Infrastructure architecture documented
- [ ] Runbook created and tested
- [ ] Incident response procedures documented
- [ ] Monitoring and alerting documented
- [ ] Backup and recovery procedures documented
- [ ] Scaling procedures documented
- [ ] Maintenance windows scheduled
- [ ] Patching schedule defined
- [ ] Access management documented
- [ ] Vendor contact information collected
- [ ] Escalation procedures documented

### For Support Team
- [ ] User FAQ created
- [ ] Troubleshooting guide created
- [ ] Common issues documented
- [ ] Support ticket templates created
- [ ] User communication templates created
- [ ] Feature documentation created
- [ ] API reference created
- [ ] Integration guides created
- [ ] Video tutorials created (optional)
- [ ] Community forum established (optional)

### For Business Stakeholders
- [ ] Business overview documented
- [ ] Key performance indicators defined
- [ ] Financial metrics documented
- [ ] Compliance requirements documented
- [ ] Risk assessment completed
- [ ] Business continuity plan documented
- [ ] Success metrics defined
- [ ] Reporting schedule established
- [ ] Stakeholder communication plan established
- [ ] Budget tracking processes established

## Legal & Compliance

### Regulatory
- [ ] Terms of Service reviewed by legal
- [ ] Privacy Policy reviewed by legal
- [ ] Gambling regulations reviewed (if applicable)
- [ ] KYC/AML procedures reviewed (if applicable)
- [ ] Age verification implemented (if applicable)
- [ ] Jurisdiction restrictions implemented
- [ ] Responsible gambling features implemented
- [ ] Audit trail requirements met
- [ ] Data retention policies defined
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] International data transfer compliance

### Technical Compliance
- [ ] SOC 2 Type II audit completed (if applicable)
- [ ] ISO 27001 certification (if applicable)
- [ ] PCI DSS compliance (if applicable)
- [ ] Smart contract audits completed
- [ ] Security penetration tests completed
- [ ] Third-party security reviews completed
- [ ] Vulnerability scanning implemented
- [ ] Dependency scanning implemented
- [ ] Code scanning implemented
- [ ] Container scanning implemented
- [ ] Infrastructure scanning implemented
- [ ] Secrets scanning implemented

## Sign-Off

### Technical Approval
- [ ] Architecture review completed
- [ ] Security review completed
- [ ] Performance review completed
- [ ] Code review completed
- [ ] Testing review completed
- [ ] Monitoring review completed
- [ ] Documentation review completed

### Business Approval
- [ ] Product owner approval
- [ ] Stakeholder approval
- [ ] Legal approval
- [ ] Compliance approval
- [ ] Security team approval
- [ ] Finance approval (budget)
- [ ] Executive approval

### Deployment Authorization
- [ ] Change approval obtained
- [ ] Deployment window confirmed
- [ ] Rollback plan approved
- [ ] Incident response team notified
- [ ] Stakeholders notified
- [ ] Monitoring team prepared
- [ ] Support team prepared

---

**Note**: This checklist should be completed before every production deployment. Some items may not apply to all deployments but should be reviewed to ensure they don't apply.

**Warning**: Do not deploy to production without completing all critical checks (marked with [✓]). Failure to do so may result in service downtime, data loss, or security breaches.

**Support**: If you encounter blocking issues, consult the troubleshooting guide or escalate to the development team before proceeding with deployment.