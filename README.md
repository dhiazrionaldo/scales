# SCALES - Warehouse Management System

A production-grade, AI-powered Warehouse Management System designed for large-scale operations supporting 50,000+ pallet locations with real-time inventory tracking, HU label OCR scanning, and AI-based pallet location optimization.

## 🎯 Project Overview

SCALES is a comprehensive WMS built with modern technologies:
- **Frontend:** Next.js 15 with TypeScript, TailwindCSS, ShadCN UI
- **Backend:** Supabase (PostgreSQL + Authentication)
- **AI Services:** Python FastAPI with machine learning models
- **Workflows:** n8n for event-driven integrations

## ✨ Key Features

- 🎯 **HU Label OCR Scanning** - Real-time barcode/label verification
- 🤖 **AI-Based Location Suggestion** - Machine learning optimized pallet placement
- 📊 **Real-time Inventory Tracking** - Live location and quantity updates
- 📱 **Mobile-First Interface** - Warehouse operator scanning devices support
- 🔐 **Role-Based Access Control** - Admin, Manager, Operator, Viewer roles
- 📈 **Comprehensive Reporting** - Operations metrics and audit logs
- 🔄 **Multi-Warehouse Support** - Manage multiple facilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (PostgreSQL database)

### Installation

```bash
# Clone and install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Configure your Supabase credentials in .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development

```bash
# Start development server
npm run dev

# Open browser
# http://localhost:3000
```

### Build for Production

```bash
# Create optimized build
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
scales/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth routes (login, signup)
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── receiving/        # Receiving operations
│   │   │   ├── putaway/          # Putaway operations
│   │   │   ├── picking/          # Picking operations
│   │   │   ├── gate-out/         # Shipping operations
│   │   │   ├── warehouse-map/    # Visual layout
│   │   │   ├── reports/          # Analytics & reports
│   │   │   ├── settings/         # Admin settings
│   │   │   └── layout.tsx        # Dashboard layout with sidebar
│   │   ├── api/                  # API routes (backend)
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Root page (redirects)
│   │
│   ├── components/               # React components
│   │   ├── auth-provider.tsx     # Auth context provider
│   │   ├── providers.tsx         # App providers setup
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   ├── ui/                   # Reusable UI components
│   │   └── forms/                # Form components
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── useWarehouse.ts       # Warehouse data queries
│   │
│   ├── lib/                      # Utility libraries
│   │   └── supabase/
│   │       ├── client.ts         # Browser client
│   │       └── server.ts         # Server client
│   │
│   ├── store/                    # Zustand state stores
│   │   └── user.ts               # User store
│   │
│   ├── types/                    # TypeScript types
│   │   └── index.ts              # All type definitions
│   │
│   ├── utils/                    # Helper functions
│   │   └── helpers.ts            # Utility functions
│   │
│   └── middleware.ts             # Next.js middleware
│
├── public/                       # Static assets
├── docs/                         # Documentation
│   ├── blueprint.md              # System architecture
│   ├── database-schema.md        # Database design
│   ├── core-tables.md            # Table definitions
│   ├── warehouse-flow.md         # Operational workflows
│   ├── warehouse-layout.md       # Physical layout
│   ├── ai-services.md            # AI service specs
│   ├── api-spec.md               # API documentation
│   └── ui-guideline.md           # UI standards
│
├── .env.example                  # Environment template
├── .eslintrc.json               # ESLint config
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── next.config.ts               # Next.js config
└── package.json                 # Dependencies
```

## 🔐 Authentication

The system uses **Supabase Auth** with JWT tokens:

1. **Sign Up:** Users create account with email/password
2. **Sign In:** Email + password authentication
3. **Session Management:** Automatic token refresh
4. **Protected Routes:** Middleware redirects unauthenticated users to login

## 🗄️ Database

**Supabase PostgreSQL** with tables:
- `companies` - Multi-tenant support
- `warehouses` - Facility management
- `users` - User accounts and roles
- `locations` - Physical storage locations
- `pallets` - Pallet inventory
- `inventory_items` - SKU management
- `hu_scans` - OCR scan history
- `receiving_orders` - Inbound orders
- `putaway_tasks` - Put-away assignments
- `picking_tasks` - Pick assignments
- `stock_movements` - Inventory history
- `operations_log` - Audit trail

See `docs/database-schema.md` for complete schema.

## 📊 Dashboard Modules

### Finish Good Operations
- **Receiving:** Inbound goods processing
- **Putaway:** AI-optimized location assignment
- **Picking:** Order fulfillment
- **Gate Out:** Outbound verification

### Warehouse Management
- **Warehouse Map:** Visual location management
- **Stock Taking:** Physical inventory counts

### Admin Functions
- **Company Settings:** Multi-tenant configuration
- **Warehouse Settings:** Facility management
- **Users:** Access control
- **Roles:** Permission management

### Reports
- **Operations:** KPI metrics and performance
- **Audit Logs:** Complete activity trail

## 🤖 AI Services

### OCR Processing
- HU label recognition via image scanning
- 95%+ confidence threshold
- Python FastAPI backend

### Location Recommendation
- XGBoost ML model for optimal placement
- Considers: Capacity, Access patterns, SKU affinity, Rules compliance
- 3 suggestions with confidence scores

### Real-time Sync
- WebSocket updates for live inventory
- Redis caching for performance
- 50ms update latency target

## 🔌 Integrations

### n8n Workflows
- Event-driven automation
- Order processing
- Anomaly alerts
- Webhook notifications

### Mobile Scanning
- Barcode/QR code support
- Offline-capable
- Real-time verification
- Audio feedback

## 📱 UI/UX

- **Mobile-First Design:** Optimized for 7-10" scanning devices
- **Responsive Layout:** Works on all screen sizes
- **High Contrast:** WCAG 2.1 AA compliance
- **Minimal Interactions:** Reduce operator steps
- **Real-time Updates:** Live data refresh

See `docs/ui-guideline.md` for design standards.

## 🔒 Security

- **Row-Level Security (RLS):** Data isolated by warehouse/user
- **Role-Based Access:** Fine-grained permissions
- **HTTPS/TLS:** Data in transit encryption
- **JWT Authentication:** Secure tokens
- **Audit Logging:** Complete activity trail

## ⚡ Performance

- **Database Indexing:** Optimized queries
- **React Query Caching:** Smart data fetching
- **Virtual Scrolling:** Handle 50k+ records
- **Lazy Loading:** Progressive page loading
- **CDN Images:** Optimized asset delivery

## 📊 Monitoring & Analytics

Track KPIs:
- Receiving/Putaway/Picking throughput
- Pick accuracy and cycle time
- Location utilization
- System health and uptime
- Operator productivity

## 🚀 Deployment

### Environment Variables
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External Services
NEXT_PUBLIC_N8N_WEBHOOK_URL=
N8N_API_KEY=
NEXT_PUBLIC_AI_SERVICE_URL=

# App Config
NEXT_PUBLIC_APP_ENV=production
```

### Deployment Platforms
- **Vercel:** Recommended for Next.js
- **Self-Hosted:** Docker/Kubernetes
- **AWS:** EC2/ECS deployment

## 📚 Documentation

Complete documentation available in `/docs`:
- `blueprint.md` - System design and architecture
- `database-schema.md` - Database structure
- `warehouse-flow.md` - Operational processes
- `api-spec.md` - REST API documentation
- `ai-services.md` - ML model specifications
- `warehouse-layout.md` - Physical layout details
- `ui-guideline.md` - Design guidelines

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | TailwindCSS, ShadCN UI |
| State | Zustand, React Query |
| Backend | Supabase, PostgreSQL |
| Auth | Supabase Auth (JWT) |
| APIs | Next.js API Routes |
| AI/ML | Python FastAPI, PyTorch |
| Automation | n8n Webhooks |
| Caching | Redis |

## 📈 Scalability

Built to handle:
- 50,000+ pallet locations
- 100+ concurrent users
- 1000+ operations/hour
- Multi-warehouse facility

## 🤝 Contributing

Instructions for team members:
1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -m "description"`
3. Push to branch: `git push origin feature/feature-name`
4. Create Pull Request for review

## 📝 License

© 2024 SCALES WMS. All rights reserved.

## 📞 Support

For issues or questions:
- Check `/docs` for detailed documentation
- Review API specs in `docs/api-spec.md`
- Contact development team

---

**Built for modern warehouse operations** 🏭
