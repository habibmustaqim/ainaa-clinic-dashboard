# Component Structure

## File Tree

```
ainaa-clinic-dashboard/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              ← Main layout wrapper
│   │   ├── Sidebar.tsx             ← Navigation sidebar
│   │   ├── DataUpload.tsx          ← File upload interface
│   │   ├── CustomerSelector.tsx    ← Customer search
│   │   ├── index.ts                ← Barrel exports
│   │   └── ui/                     ← Shadcn UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── command.tsx
│   │       ├── input.tsx
│   │       ├── popover.tsx
│   │       └── progress.tsx
│   │
│   ├── pages/
│   │   ├── Homepage.tsx
│   │   ├── Analytics.tsx
│   │   ├── PatientDashboard.tsx
│   │   └── UploadPage.tsx          ← NEW! Upload route
│   │
│   ├── context/
│   │   └── CustomerContext.tsx     ← Customer state management
│   │
│   ├── services/
│   │   └── supabaseDataService.ts  ← Data fetching
│   │
│   ├── utils/
│   │   └── uploadProcessor.ts      ← Upload logic
│   │
│   └── App.tsx                     ← Routes (updated)
│
├── COMPONENTS_GUIDE.md             ← Comprehensive documentation
├── QUICK_START.md                  ← Quick reference
└── COMPONENT_STRUCTURE.md          ← This file
```

## Component Hierarchy

```
App
├── CustomerProvider (Context)
│   └── Router
│       └── Routes
│           ├── Route "/" → Homepage
│           │   └── (custom layout)
│           │
│           ├── Route "/analytics" → Analytics
│           │   └── (custom layout)
│           │
│           ├── Route "/upload" → UploadPage
│           │   └── Layout ←────────────────┐
│           │       ├── Sidebar             │
│           │       └── DataUpload          │
│           │                               │
│           └── Route "/patient/:id" → PatientDashboard
│               └── (custom layout)         │
│                                           │
└── Layout component structure: ────────────┘
    ├── <div className="min-h-screen bg-gradient...">
    │   └── <div className="flex">
    │       ├── Sidebar (fixed, left)
    │       │   ├── Logo/Branding
    │       │   ├── Navigation
    │       │   │   ├── NavLink (Homepage)
    │       │   │   ├── NavLink (Analytics)
    │       │   │   └── NavLink (Upload)
    │       │   └── Footer
    │       │
    │       └── <main> (flex-1, ml-64)
    │           └── {children} (page content)
```

## Component Dependencies

```
Layout.tsx
└── imports:
    ├── React
    ├── Sidebar (internal)
    └── No external props required

Sidebar.tsx
└── imports:
    ├── React
    ├── react-router-dom (Link, useLocation)
    ├── lucide-react (Home, BarChart3, Upload icons)
    └── @/lib/utils (cn helper)

DataUpload.tsx
└── imports:
    ├── React (useState)
    ├── lucide-react (Upload, Download, CheckCircle2, AlertCircle, Loader2)
    ├── @/components/ui/* (Button, Card, Progress)
    └── @/utils/uploadProcessor
        ├── processAndUploadData()
        ├── startLogCapture()
        ├── stopLogCapture()
        └── downloadUploadLogs()

CustomerSelector.tsx
└── imports:
    ├── React (useState, useEffect)
    ├── lucide-react (Check, ChevronsUpDown, Search, User)
    ├── @/components/ui/* (Button, Command, Popover)
    ├── @/context/CustomerContext (useCustomer hook)
    ├── @/services/supabaseDataService (fetchCustomers)
    └── @/lib/supabase (Customer type)
```

## Data Flow

### Customer Selection Flow
```
CustomerSelector
    ↓ (user types)
fetchCustomers() → Filter results
    ↓ (user clicks)
selectCustomer(customer)
    ↓
CustomerContext.selectCustomer()
    ↓
├── setSelectedCustomer(customer)
└── navigate(`/patient/${customer.id}`)
    ↓
PatientDashboard renders
```

### File Upload Flow
```
DataUpload
    ↓ (user selects 5 files)
Validate all files selected
    ↓ (user clicks Upload)
startLogCapture()
    ↓
processAndUploadData(files, onProgress)
    ├── Parse files
    ├── Clean data
    ├── Delete old data
    ├── Insert customers
    ├── Insert transactions
    ├── Insert payments
    ├── Insert items
    └── Insert enhanced items
    ↓
Update progress bar (via callback)
    ↓
Display results (success/error)
    ↓
stopLogCapture()
    ↓
User can download logs
```

## Route Structure

```
/
├── Homepage
│   └── Custom layout (no Layout component)
│       ├── Stats cards
│       ├── Upload area
│       └── Customer search
│
├── /analytics
│   └── Analytics
│       └── Custom layout (no Layout component)
│
├── /upload ← NEW!
│   └── UploadPage
│       └── Layout
│           ├── Sidebar
│           └── DataUpload
│
└── /patient/:customerId
    └── PatientDashboard
        └── Custom layout (no Layout component)
```

## Styling Architecture

```
Tailwind CSS (utility-first)
    ↓
Component-level styling
    ├── Layout: bg-gradient-to-br from-slate-50 to-slate-100
    ├── Sidebar: fixed, bg-white, border-r
    ├── DataUpload: Cards with conditional styling
    └── CustomerSelector: Popover with command palette

Color System:
    ├── Primary: blue-600 (buttons, active states)
    ├── Secondary: slate-600/700 (text)
    ├── Success: green-600 (success states)
    ├── Error: red-600 (error states)
    └── Background: slate-50/100
```

## State Management

```
Global State (Context):
└── CustomerContext
    ├── selectedCustomer (Customer | null)
    ├── setSelectedCustomer(customer)
    ├── selectCustomer(customer) → navigate to dashboard
    └── clearCustomer() → navigate to homepage

Component State:
├── DataUpload
│   ├── files (5 file objects)
│   ├── uploading (boolean)
│   ├── progress (UploadProgress | null)
│   └── result (success/error object)
│
└── CustomerSelector
    ├── open (boolean)
    ├── customers (Customer[])
    ├── loading (boolean)
    └── error (string | null)
```

## Integration Points

```
DataUpload → uploadProcessor.ts
    ├── processAndUploadData()
    │   ├── csvParser.ts (Customer Info, Sales, Service)
    │   ├── excelParser.ts (Payment, Item Sales)
    │   ├── customerInfoCleaner.ts
    │   ├── salesDetailedCleaner.ts
    │   ├── serviceSalesCleaner.ts
    │   └── supabase (database inserts)
    │
    ├── startLogCapture()
    ├── stopLogCapture()
    └── downloadUploadLogs()

CustomerSelector → supabaseDataService.ts
    └── fetchCustomers()
        └── supabase.from('customers').select('*')

All components → CustomerContext
    ├── useCustomer() hook
    └── selectCustomer() navigation
```

## Usage Patterns

### Pattern 1: Basic Page with Layout
```tsx
<Layout>
  <YourContent />
</Layout>
```

### Pattern 2: Page with Customer Search
```tsx
<Layout>
  <CustomerSelector />
  <YourContent />
</Layout>
```

### Pattern 3: Data Upload Page
```tsx
<Layout>
  <DataUpload />
</Layout>
```

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Layout wrapper | `/src/components/Layout.tsx` |
| Navigation | `/src/components/Sidebar.tsx` |
| File upload | `/src/components/DataUpload.tsx` |
| Customer search | `/src/components/CustomerSelector.tsx` |
| Barrel exports | `/src/components/index.ts` |
| Upload page | `/src/pages/UploadPage.tsx` |
| Routes | `/src/App.tsx` |
| Customer context | `/src/context/CustomerContext.tsx` |
| Data service | `/src/services/supabaseDataService.ts` |
| Upload logic | `/src/utils/uploadProcessor.ts` |
| Full docs | `/COMPONENTS_GUIDE.md` |
| Quick start | `/QUICK_START.md` |

---

**Visual Component Map:**

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Window                        │
│ ┌───────────────────────────────────────────────────────┐ │
│ │                  Ainaa Clinic Dashboard                │ │
│ ├─────────┬─────────────────────────────────────────────┤ │
│ │ SIDEBAR │              MAIN CONTENT                   │ │
│ │         │                                             │ │
│ │  [A]    │  ┌─────────────────────────────────────┐   │ │
│ │ Ainaa   │  │                                     │   │ │
│ │ Clinic  │  │         Page Content Area           │   │ │
│ │         │  │         (children prop)             │   │ │
│ │ ──────  │  │                                     │   │ │
│ │         │  │  Examples:                          │   │ │
│ │ [H] Home│  │  • DataUpload component             │   │ │
│ │ [A] Ana.│  │  • CustomerSelector                 │   │ │
│ │ [U] Upl.│  │  • Your custom content              │   │ │
│ │         │  │                                     │   │ │
│ │         │  └─────────────────────────────────────┘   │ │
│ │         │                                             │ │
│ │ ──────  │                                             │ │
│ │ v1.0.0  │                                             │ │
│ └─────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
  ← 256px →  ← Flexible width (flex-1) →
  Fixed      Scrollable content
```

