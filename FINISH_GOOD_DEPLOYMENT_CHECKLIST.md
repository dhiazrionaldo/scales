# Finish Good Module - Deployment & Integration Checklist

## Pre-Deployment Verification Checklist

Complete this checklist before deploying to production. All items must be ✓ completed.

---

## 1. Environment Configuration

### 1.1 Environment Variables

- [ ] `.env.local` file created in project root
- [ ] `NEXT_PUBLIC_OCR_SERVICE_URL` set to self-hosted VM IP/domain
  - Current value: `_____________________`
  - Verified accessible: [ ] Yes [ ] No
- [ ] `OCR_API_KEY` set (if authentication required)
  - Authentication enabled on OCR service: [ ] Yes [ ] No
- [ ] `OCR_TIMEOUT` set to 30000ms or custom value
- [ ] `OCR_RETRY_ATTEMPTS` set to 3 or custom value
- [ ] Supabase environment variables present:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (for server operations)
- [ ] All sensitive keys secured (not in Git, .gitignore updated)
- [ ] Production environment variables documented

### 1.2 Network Configuration

- [ ] OCR service VM is accessible from NextJS server
  - Test command: `ping {OCR_SERVICE_URL}`
  - Result: ✓ Successful
- [ ] Port 8000 (or configured) is open on OCR service VM
  - Test command: `Test-NetConnection -ComputerName {URL} -Port 8000`
  - Result: ✓ Successfully connected
- [ ] Firewall rules allow communication between servers
  - Inbound rule on OCR VM: ✓ Configured
  - No blocking proxies/firewalls: [ ] Verified
- [ ] CORS configured on OCR service for NextJS domain
  - NextJS domain added to allowed_origins: [ ] Yes
- [ ] SSL/TLS ready (if using HTTPS for OCR service)
  - Certificate valid until: _______________
  - Certificate auto-renewal: [ ] Configured

---

## 2. Database Setup

### 2.1 Supabase Tables

All required tables must exist in Supabase with correct schema:

- [ ] `hu_labels` table exists
  - Columns: id, hu_code, company_id, warehouse_id, product_name, qty, net_weight, batch, created_at
  - Primary key: id (UUID)
  - Indices: (company_id, warehouse_id), (hu_code)

- [ ] `pallets` table exists
  - Columns: id, hu_id, location_id, status, received_at, stored_at, shipped_at
  - Primary key: id (UUID)
  - Foreign key: hu_id → hu_labels.id
  - Indices: (status), (location_id)

- [ ] `receiving` table exists
  - Columns: id, hu_id, operator_id, received_time, status
  - Foreign key: hu_id → hu_labels.id

- [ ] `putaway_tasks` table exists
  - Columns: id, pallet_id, suggested_location, confirmed_location, operator_id, status, completed_at
  - Foreign key: pallet_id → pallets.id

- [ ] `warehouse_locations` table exists
  - Columns: id, warehouse_id, location_code, current_volume, capacity_volume, status
  - Indices: (warehouse_id, location_code)

- [ ] `delivery_orders` table exists
  - Columns: id, company_id, warehouse_id, document_number, status, created_at
  - Indices: (company_id, warehouse_id), (document_number)

- [ ] `picking_tasks` table exists
  - Columns: id, delivery_order_id, pallet_id, location_id, qty, operator_id, status
  - Foreign key: delivery_order_id → delivery_orders.id
  - Foreign key: pallet_id → pallets.id

- [ ] `outbound` table exists
  - Columns: id, delivery_order_id, pallet_id, shipped_at
  - Foreign key: delivery_order_id → delivery_orders.id

- [ ] `inventory` table exists
  - Columns: id, company_id, warehouse_id, product_name, batch, total_qty, available_qty, reserved_qty
  - Indices: (company_id, warehouse_id, product_name, batch)

- [ ] `stock_transactions` table exists
  - Columns: id, delivery_order_id, product_name, batch, transaction_type, qty, created_at
  - Indices: (delivery_order_id), (transaction_type)

- [ ] `audit_logs` table exists
  - Columns: id, company_id, warehouse_id, operation_type, operator_id, details (JSONB), created_at
  - Indices: (company_id, warehouse_id), (operation_type), (created_at)

- [ ] `inventory_locations` table exists
  - Columns: id, pallet_id, location_id, stored_at
  - Foreign key: pallet_id → pallets.id
  - Foreign key: location_id → warehouse_locations.id

### 2.2 Row Level Security (RLS) Policies

- [ ] RLS enabled on all tables requiring multi-tenant isolation
- [ ] Policies for `company_id` isolation:
  - [ ] Users can only see data from their company
  - [ ] Policy: `auth.jwt() ->> 'company_id' = company_id`
- [ ] Policies for `warehouse_id` isolation:
  - [ ] Users can only access their assigned warehouse
  - [ ] Policy: `warehouse_id IN (SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid())`
- [ ] SELECT policies allow reading own data
- [ ] INSERT policies allow creating records
- [ ] UPDATE policies allow modifying own operations only
- [ ] DELETE policies restricted appropriately

### 2.3 Database Backups

- [ ] Automated backup enabled on Supabase
  - Backup frequency: [ ] Daily [ ] Weekly [ ] Custom: _______
  - Retention period: _______
- [ ] Backup tested and verified restorable
- [ ] Backup location/disaster recovery plan documented

---

## 3. Self-Hosted OCR Service Setup

### 3.1 OCR Service Deployment

- [ ] Python AI OCR service deployed on VM
  - VM IP Address: ________________________
  - OS: [ ] Linux [ ] Windows [ ] Other: _______
  - Python version: 3.10 or higher
- [ ] Dependencies installed:
  - [ ] FastAPI
  - [ ] PaddleOCR or Tesseract
  - [ ] OpenCV
  - [ ] Pillow
  - [ ] NumPy
  - [ ] All requirements from requirements.txt
- [ ] Service running and accessible:
  - [ ] Health endpoint responds: `GET /health`
  - [ ] OCR endpoint responds: `POST /api/v1/ocr/hu-label`
  - [ ] Response time: < 300ms for typical image

### 3.2 OCR Service Configuration

- [ ] CORS middleware configured
  - Allowed origins include: NextJS production domain
  - Allowed methods: GET, POST, OPTIONS
  - Allowed headers: *, Content-Type, Authorization
- [ ] Request timeout: 30 seconds or configured
- [ ] Max file size: 5MB (matches NextJS validation)
- [ ] API documentation available: `GET /docs` (Swagger)
- [ ] Authentication (if applicable):
  - [ ] API key validation implemented
  - [ ] Keys rotated and secured
- [ ] Logging enabled:
  - [ ] Request logging: [ ] Yes [ ] No
  - [ ] Error logging: [ ] Yes [ ] No
  - [ ] Log rotation configured: [ ] Yes [ ] No
  - [ ] Log location: ____________________

### 3.3 OCR Service Monitoring

- [ ] Health check endpoint working: `GET /health`
- [ ] Metrics available for monitoring:
  - [ ] Request count
  - [ ] Average response time
  - [ ] Error rate
  - [ ] Model accuracy
- [ ] Alerting configured for:
  - [ ] Service down
  - [ ] Response time > threshold
  - [ ] Error rate > threshold
- [ ] Performance baseline established:
  - Average response time: _________ ms
  - 95th percentile response time: _________ ms
  - Throughput: _________ requests/second

---

## 4. NextJS Application Setup

### 4.1 Code Deployment

- [ ] All Finish Good files created:
  - [ ] `src/services/ocr.service.ts`
  - [ ] `src/app/api/finish-good/receiving/route.ts`
  - [ ] `src/app/api/finish-good/putaway/route.ts`
  - [ ] `src/app/api/finish-good/picking/route.ts`
  - [ ] `src/app/api/finish-good/gate-out/route.ts`
  - [ ] `src/components/finish-good/ReceivingComponent.tsx`
  - [ ] `src/components/finish-good/PutawayComponent.tsx`
  - [ ] `src/components/finish-good/PickingComponent.tsx`
  - [ ] `src/components/finish-good/GateOutComponent.tsx`
  - [ ] `src/app/(dashboard)/finish-good/page.tsx`
- [ ] All imports and dependencies resolved
- [ ] No TypeScript compilation errors: `npm run build`
  - Build successful: [ ] Yes [ ] No
  - Build time: _________ seconds
- [ ] Code linting passes: `npm run lint`
  - No critical issues: [ ] Yes [ ] No
- [ ] Code reviewed and approved: [ ] Yes [ ] No

### 4.2 Build & Optimization

- [ ] Development build works: `npm run dev`
  - Dev server starts successfully: [ ] Yes
  - Dev server port: 3000 (or configured: ____)
- [ ] Production build works: `npm run build`
  - Total build size acceptable: [ ] Yes
  - Build output optimized: [ ] Yes
- [ ] Next.js bundle analysis completed:
  - Finish Good module bundle size: _______ KB
  - No code splitting issues: [ ] Yes
- [ ] Image optimization configured
- [ ] CSS optimization configured

### 4.3 Testing

- [ ] Unit tests written and passing
  - Test coverage for OCR service: [ ] Yes [ ] No
  - Test coverage for API routes: [ ] Yes [ ] No
  - Test coverage for components: [ ] Yes [ ] No
- [ ] Integration tests completed
  - End-to-end workflow tested: [ ] Yes [ ] No
  - All 4 steps (RCV→PUT→PICK→GATE) working: [ ] Yes
- [ ] Performance tests completed
  - Load testing done: [ ] Yes [ ] No
  - Concurrent user testing: [ ] Yes [ ] No

### 4.4 Security

- [ ] Sensitive variables not hardcoded
  - All secrets in `.env.local`: [ ] Verified
  - No secrets in Git history: [ ] Verified
- [ ] API authentication enforced
  - Supabase JWT validation: [ ] Yes
  - API key validation (if applicable): [ ] Yes
- [ ] CORS properly configured
  - Only trusted origins allowed: [ ] Yes
- [ ] Input validation implemented
  - File upload validation: [ ] Yes
  - JSON payload validation: [ ] Yes
  - OCR data validation: [ ] Yes
- [ ] Error messages don't leak sensitive info
  - Error logging: [ ] Verified
  - User-facing errors generic: [ ] Verified
- [ ] Rate limiting implemented
  - OCR service calls limited: [ ] Yes
  - API routes rate-limited: [ ] Yes

---

## 5. Integration Testing

### 5.1 OCR Service Integration

- [ ] NextJS can reach OCR service
  - Test from prod server: curl/wget to OCR health endpoint
  - Response: ✓ Successful [ ] Failed
- [ ] Image upload to OCR working
  - Sample image uploaded successfully: [ ] Yes [ ] No
  - Response time acceptable: [ ] Yes
  - Response format correct: [ ] Yes
- [ ] Retry logic working
  - Simulated failure, retry succeeded: [ ] Yes [ ] No
  - Retry backoff increases: [ ] Yes
  - Max retries respected: [ ] Yes
- [ ] Error handling for OCR failures
  - Timeout handled gracefully: [ ] Yes
  - Service unavailable handled: [ ] Yes
  - Invalid response handled: [ ] Yes

### 5.2 Supabase Integration

- [ ] Supabase connection working
  - Connection string verified: [ ] Yes
  - Credentials tested: [ ] Yes
- [ ] Authentication working
  - JWT tokens validated: [ ] Yes
  - Token refresh working: [ ] Yes
  - Session timeout handled: [ ] Yes
- [ ] Database operations working
  - INSERT operations tested: [ ] Yes
  - UPDATE operations tested: [ ] Yes
  - SELECT operations tested: [ ] Yes
  - Foreign keys enforced: [ ] Yes
- [ ] RLS policies enforced
  - User sees own company data only: [ ] Yes
  - User sees own warehouse data only: [ ] Yes
  - Cross-company data access prevented: [ ] Yes

### 5.3 End-to-End Workflow Testing

**Test Case 1: Complete Workflow**
- [ ] Receiving: HU label → OCR → pallet created
- [ ] Putaway: Location selection → pallet stored
- [ ] Picking: DO → picking list → items picked
- [ ] Gate Out: Shipment released → inventory updated
- [ ] Result: ✓ All steps completed successfully

**Test Case 2: Partial Fulfillment**
- [ ] DO with insufficient inventory processed correctly
- [ ] Partial shipment created
- [ ] Backorder handling working
- [ ] Result: ✓ Partial workflow handled

**Test Case 3: Error Scenarios**
- [ ] OCR service down → graceful error + retry
- [ ] Network timeout → proper error handling
- [ ] Invalid data → validation errors shown
- [ ] Database error → transaction rollback
- [ ] Result: ✓ All errors handled

### 5.4 Multi-User Testing

- [ ] Multiple users accessing different warehouses simultaneously
  - Data isolation verified: [ ] Yes
  - No cross-user data leakage: [ ] Yes
- [ ] Concurrent operations on same warehouse
  - Locking/concurrency handled: [ ] Yes
  - No race conditions: [ ] Yes
- [ ] Audit logs correctly attribute to users
  - Each operation shows correct operator_id: [ ] Yes

---

## 6. Performance & Scalability

### 6.1 Performance Benchmarks

All timings should meet targets:

- [ ] Image upload: < 2 seconds
  - Measured: _________ seconds
- [ ] OCR processing: < 300ms (excluding network)
  - Measured: _________ ms
- [ ] API response: < 1 second
  - Measured: _________ seconds
- [ ] Database insert: < 500ms
  - Measured: _________ ms
- [ ] UI update: < 500ms
  - Measured: _________ ms
- **Total per workflow step: < 5 seconds**
  - Measured: _________ seconds
- **Total workflow: < 20 seconds**
  - Measured: _________ seconds

### 6.2 Load Testing

- [ ] Load test completed with concurrent users
  - Test tool used: [ ] JMeter [ ] Gatling [ ] Other: _______
  - Concurrent users tested: _________ 
  - Requests per second: _________
  - Response time under load: _________ ms
  - Error rate: _________ %
  - Result: [ ] PASS [ ] FAIL
- [ ] OCR service load tested
  - Sustained throughput: _________ req/sec
  - Max throughput: _________ req/sec
  - Resource utilization:
    - CPU: _________ %
    - Memory: _________ MB
    - Disk: _________ MB/s
- [ ] Database load tested
  - Query performance under load: [ ] Acceptable
  - Connection pool adequate: [ ] Yes
  - Lock contention minimal: [ ] Yes

### 6.3 Resource Allocation

- [ ] NextJS server resources:
  - CPU cores allocated: _________
  - Memory allocated: _________ GB
  - Sufficient for load: [ ] Yes
- [ ] OCR service VM resources:
  - CPU cores: _________
  - Memory: _________ GB
  - GPU (if available): [ ] Yes [ ] No
  - Sufficient for sustained load: [ ] Yes
- [ ] Database resources:
  - Connection pool size: _________
  - Query timeout (seconds): _________
  - Sufficient for peak load: [ ] Yes

---

## 7. Monitoring & Alerting

### 7.1 Application Monitoring

- [ ] Application health monitoring enabled
  - Tool used: [ ] DataDog [ ] New Relic [ ] Sentry [ ] Custom
- [ ] Error tracking configured
  - All errors logged: [ ] Yes
  - Error notifications: [ ] Yes
  - Error dashboard available: [ ] Yes
- [ ] Performance monitoring configured
  - Response time tracked: [ ] Yes
  - Resource usage tracked: [ ] Yes
  - Database query performance tracked: [ ] Yes
- [ ] User behavior tracking (optional)
  - Workflow completion rate tracked: [ ] Yes [ ] N/A
  - Step failure rates tracked: [ ] Yes [ ] N/A

### 7.2 OCR Service Monitoring

- [ ] OCR service health monitored
  - Health check interval: every 30 seconds
  - Alert on service down: [ ] Configured
- [ ] OCR performance metrics tracked
  - Average response time: [ ] Tracked
  - P95 response time: [ ] Tracked
  - Throughput: [ ] Tracked
  - Error rate: [ ] Tracked
- [ ] OCR resource monitoring
  - CPU usage: [ ] Tracked
  - Memory usage: [ ] Tracked
  - Disk usage: [ ] Tracked
  - GPU usage (if applicable): [ ] Tracked
- [ ] Alerting rules configured
  - Alert on response time > 1s: [ ] Yes
  - Alert on error rate > 1%: [ ] Yes
  - Alert on service unavailable: [ ] Yes
- [ ] Alert destinations configured
  - Email: [ ] ___________________
  - Slack/Teams: [ ] __________________
  - PagerDuty: [ ] Yes [ ] No

### 7.3 Database Monitoring

- [ ] Database performance monitored
  - Slow query detection: [ ] Enabled
  - Connection pool monitoring: [ ] Enabled
  - Replication lag (if applicable): [ ] Monitored
- [ ] Database alerts configured
  - Storage usage alert: [ ] Yes
  - Replication lag alert: [ ] Yes
  - Query performance alert: [ ] Yes
- [ ] Automated backups verified
  - Last backup time: ___________________
  - Backup size: _________ MB
  - Restore test completed: [ ] Yes

### 7.4 Logging

- [ ] Centralized logging enabled
  - Log aggregation tool: [ ] ELK [ ] Splunk [ ] CloudWatch [ ] Other: _______
- [ ] Log levels appropriate
  - Debug logs in dev only: [ ] Yes
  - Info logs for important events: [ ] Yes
  - Error logs for failures: [ ] Yes
- [ ] Log retention configured
  - Retention period: _________ days
  - Searchable retention: _________ days
- [ ] Audit logging configured
  - All operations logged: [ ] Yes
  - Audit logs protected from deletion: [ ] Yes

---

## 8. Disaster Recovery & Business Continuity

### 8.1 Backup & Recovery

- [ ] Supabase backups automated
  - Frequency: [ ] Daily [ ] Hourly [ ] Custom: _______
  - Retention: _________ days
  - Last backup verified: [ ] Yes
  - Restore test completed: [ ] Yes
- [ ] Application code backed up
  - Git repository up to date: [ ] Yes
  - Release tags created: [ ] Yes
- [ ] Database restore procedure documented
  - Estimated recovery time: _________ minutes
- [ ] Recovery runbook created and tested
  - Document location: ____________________

### 8.2 High Availability

- [ ] OCR service redundancy planned
  - Backup OCR service configured: [ ] Yes [ ] N/A
  - Load balancing setup: [ ] Yes [ ] N/A
  - Failover automatic: [ ] Yes [ ] N/A
- [ ] Database failover plan
  - Standby database ready: [ ] Yes [ ] N/A
  - Automatic failover: [ ] Yes [ ] N/A
- [ ] Application server redundancy
  - Multiple instances deployed: [ ] Yes [ ] N/A
  - Load balancer configured: [ ] Yes [ ] N/A

### 8.3 Incident Response

- [ ] Incident response plan documented
  - Contact list: [ ] Created
  - Escalation procedures: [ ] Defined
  - Runbooks created for common issues: [ ] Yes
  - Location: ____________________
- [ ] Communication plan
  - Internal escalation: [ ] Defined
  - Customer notification: [ ] Planned
  - Status page: [ ] Configured [ ] N/A

---

## 9. Documentation

### 9.1 User Documentation

- [ ] User guide created
  - Workflow diagram: [ ] Included
  - Step-by-step instructions: [ ] Included
  - Screenshots: [ ] Included
  - Common issues section: [ ] Included
  - Location: ____________________
- [ ] Training materials prepared
  - Video tutorial: [ ] Yes [ ] N/A
  - Live training scheduled: [ ] Yes [ ] Date: _______
- [ ] Help desk/support info shared
  - Support contact info: [ ] Provided
  - Support SLA: _________ hours

### 9.2 Technical Documentation

- [ ] Architecture documentation
  - System diagram: [ ] Included
  - Data flow diagram: [ ] Included
  - Integration points documented: [ ] Yes
  - Location: ____________________
- [ ] API documentation
  - Endpoint documentation: [ ] Complete
  - Request/response examples: [ ] Included
  - Error codes documented: [ ] Yes
  - Location: ____________________
- [ ] Database documentation
  - Schema diagram: [ ] Included
  - Table relationships: [ ] Documented
  - RLS policies documented: [ ] Yes
  - Location: ____________________
- [ ] Deployment documentation
  - Deployment procedure: [ ] Documented
  - Configuration steps: [ ] Documented
  - Rollback procedure: [ ] Documented
  - Location: ____________________
- [ ] Troubleshooting guide
  - Common issues: [ ] Listed
  - Resolution steps: [ ] Provided
  - Escalation paths: [ ] Defined
  - Location: ____________________

---

## 10. Production Readiness Sign-Off

### 10.1 Final Verification

- [ ] All checklist items completed
- [ ] All critical items marked complete
- [ ] No blockers identified
- [ ] Performance testing passed
- [ ] Security review passed
- [ ] User acceptance testing (UAT) passed: [ ] Yes [ ] N/A
- [ ] Load testing passed
- [ ] Disaster recovery tested

### 10.2 Approval

**Development Team Lead**
- Name: ____________________
- Signature: ____________________
- Date: ____________________

**QA Lead**
- Name: ____________________
- Signature: ____________________
- Date: ____________________

**Operations Lead**
- Name: ____________________
- Signature: ____________________
- Date: ____________________

**Project Manager/Client Representative**
- Name: ____________________
- Signature: ____________________
- Date: ____________________

### 10.3 Deployment Authorization

- [ ] Approved for production deployment
- [ ] Deployment date/time: ____________________
- [ ] Deployment window: From __________ To __________
- [ ] Rollback plan verified: [ ] Yes
- [ ] On-call support assigned: [ ] ____________________

---

## 11. Post-Deployment

### 11.1 Deployment Verification

- [ ] All services running in production
- [ ] Health checks passing
- [ ] Monitoring/alerting active
- [ ] Sample workflow tested in production
- [ ] Audit logs showing operations
- [ ] No errors in error logs

### 11.2 Production Monitoring (First 24 Hours)

- [ ] Check error rate: _________ %
- [ ] Check response times: _________ ms avg
- [ ] Check OCR service: _________ req/sec throughput
- [ ] Check database performance: _________ ms avg query time
- [ ] No critical issues found: [ ] Yes [ ] No

### 11.3 Post-Deployment Sign-Off

- [ ] Production deployment successful: [ ] Yes
- [ ] Monitoring alerts functioning: [ ] Yes
- [ ] User access enabled: [ ] Yes
- [ ] Training completed: [ ] Yes
- [ ] Support ready: [ ] Yes

---

**Deployment Date**: ____________________  
**Deployed By**: ____________________  
**Status**: [ ] Ready for Production [ ] Issues Found [ ] Rollback Required

---

## Next Steps

1. Schedule post-deployment review meeting (48 hours after go-live)
2. Monitor error rates and performance metrics daily for first week
3. Gather user feedback and document any improvements needed
4. Plan for optimization and enhancements in next release

Good luck with your production deployment! 🚀
