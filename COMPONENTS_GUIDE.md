# Business Components Guide

This document provides a comprehensive guide to the four main business components created for the Ainaa Clinic Dashboard.

## Table of Contents

1. [Layout Component](#layout-component)
2. [Sidebar Component](#sidebar-component)
3. [DataUpload Component](#dataupload-component)
4. [CustomerSelector Component](#customerselector-component)
5. [Usage Examples](#usage-examples)

---

## Layout Component

**File:** `src/components/Layout.tsx`

### Purpose
Main layout wrapper that provides consistent page structure across the application with sidebar navigation and content area.

### Features
- Fixed sidebar on the left (64 units width / 256px)
- Responsive content area with proper padding
- Gradient background design
- Automatic sidebar integration

### Props

```typescript
interface LayoutProps {
  children: React.ReactNode
}
```

### Usage

```tsx
import { Layout } from '@/components/Layout'

const MyPage = () => {
  return (
    <Layout>
      <h1>Page Content</h1>
      {/* Your page content here */}
    </Layout>
  )
}
```

### Design Notes
- Uses Tailwind CSS classes for styling
- Background: Gradient from slate-50 to slate-100
- Main content has padding of 8 units (32px)
- Left margin of 64 units (256px) to account for fixed sidebar

---

## Sidebar Component

**File:** `src/components/Sidebar.tsx`

### Purpose
Navigation sidebar with branding, navigation links, and active state highlighting.

### Features
- **Logo/Branding**: Ainaa Clinic logo with gradient background
- **Navigation Links**:
  - Homepage (/)
  - Analytics (/analytics)
  - Upload Data (/upload)
- **Active Link Highlighting**: Automatically highlights the current route
- **Icons**: Lucide React icons for visual clarity
- **Footer**: Version information

### Navigation Links

| Route | Icon | Label | Description |
|-------|------|-------|-------------|
| `/` | Home | Homepage | Main dashboard and customer search |
| `/analytics` | BarChart3 | Analytics | Analytics and reports |
| `/upload` | Upload | Upload Data | Data upload interface |

### Active State Logic
- Homepage: Exact match for `/`
- Other routes: Path starts with the route (e.g., `/analytics*`)
- Active links have blue background with shadow
- Inactive links are gray with hover effects

### Customization

To add a new navigation link, add it to the `<nav>` section:

```tsx
<NavLink
  to="/new-route"
  icon={<YourIcon size={20} />}
  label="Your Label"
  isActive={isActive('/new-route')}
/>
```

---

## DataUpload Component

**File:** `src/components/DataUpload.tsx`

### Purpose
Comprehensive file upload interface for the 5-file upload process required by the clinic data system.

### Features

#### File Inputs (All Required)
1. **Customer Info CSV** - Customer demographics and information
2. **Sales Detailed CSV** - Transaction records (skips first 15 rows)
3. **Payment Excel** - Payment transaction details
4. **Item Sales Excel** - Item-level sales data (skips first 18 rows)
5. **Service Sales CSV** - Service sales and enhanced items (skips first 15 rows)

#### Upload Process
- **Validation**: All 5 files must be selected before upload
- **Progress Tracking**: Real-time progress bar with step-by-step updates
- **Statistics Display**: Shows counts of inserted records
- **Error Handling**: Displays detailed error messages
- **Log Capture**: Automatically captures and allows download of process logs

#### User Interface
- Clean, organized file input fields with descriptions
- Visual feedback for selected files (green checkmark)
- Upload button (disabled until all files selected)
- Reset button to clear all selections
- Download Logs button for debugging
- Progress card showing current step and percentage
- Result card with success/error status and statistics

### Usage

```tsx
import { DataUpload } from '@/components/DataUpload'
import { Layout } from '@/components/Layout'

const UploadPage = () => {
  return (
    <Layout>
      <DataUpload />
    </Layout>
  )
}
```

### Upload Statistics

After successful upload, the component displays:
- **Customers Inserted**: Number of customer records
- **Transactions Inserted**: Number of transaction records
- **Payments Inserted**: Number of payment records
- **Items Inserted**: Number of item records
- **Enhanced Items Inserted**: Number of service sales records

### Technical Details

Uses the following utilities from `uploadProcessor.ts`:
- `processAndUploadData()` - Main upload orchestrator
- `startLogCapture()` - Begin capturing console logs
- `stopLogCapture()` - Stop capturing console logs
- `downloadUploadLogs()` - Download captured logs as .txt file

### File Requirements

| File | Format | Skip Rows | Description |
|------|--------|-----------|-------------|
| Customer Info | CSV | 0 | Customer data with demographics |
| Sales Detailed | CSV | 15 | Transaction details (header at row 16) |
| Payment | Excel | 0 | Payment transaction records |
| Item Sales | Excel | 18 | Item-level sales (header at row 19) |
| Service Sales | CSV | 15 | Enhanced service data (header at row 16) |

---

## CustomerSelector Component

**File:** `src/components/CustomerSelector.tsx`

### Purpose
Command palette style customer search and selection interface using Radix UI components.

### Features

#### Search Functionality
- **Real-time filtering** by:
  - Customer name
  - Membership number
  - Contact number
- **Command palette UI** with keyboard navigation
- **Popover interface** that doesn't block the page

#### Display Information
Each customer item shows:
- Customer name (bold)
- Membership number
- Contact number
- Total spending (if > 0, in green)

#### Integration
- Uses `useCustomer()` hook from CustomerContext
- Calls `selectCustomer()` to navigate to patient dashboard
- Fetches customers from `fetchCustomers()` service

### Usage

```tsx
import { CustomerSelector } from '@/components/CustomerSelector'

const MyComponent = () => {
  return (
    <div>
      <h2>Search for a Customer</h2>
      <CustomerSelector />
    </div>
  )
}
```

### State Management

The component manages:
- **open**: Popover open/closed state
- **customers**: List of all customers
- **loading**: Loading state during fetch
- **error**: Error message if fetch fails

### User Flow

1. Click the selector button
2. Popover opens with search input
3. Start typing to filter customers
4. Click a customer from the list
5. `selectCustomer()` is called
6. User is navigated to `/patient/:customerId`
7. Popover closes automatically

### Empty States

- **No data uploaded**: Shows "No customers found" with suggestion to upload data
- **No search results**: Shows "No results" message
- **Loading**: Shows spinner with "Loading customers..." message
- **Error**: Shows error message with "Try Again" button

---

## Usage Examples

### Example 1: Basic Page with Layout and Sidebar

```tsx
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'

const MyPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Page</h1>
        <Card className="p-6">
          <p>Content goes here</p>
        </Card>
      </div>
    </Layout>
  )
}

export default MyPage
```

### Example 2: Page with Customer Search

```tsx
import { Layout } from '@/components/Layout'
import { CustomerSelector } from '@/components/CustomerSelector'
import { Card } from '@/components/ui/card'

const SearchPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Find Customer</h1>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Search</h2>
          <div className="max-w-md">
            <CustomerSelector />
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default SearchPage
```

### Example 3: Upload Page

```tsx
import { Layout } from '@/components/Layout'
import { DataUpload } from '@/components/DataUpload'

const UploadPage = () => {
  return (
    <Layout>
      <DataUpload />
    </Layout>
  )
}

export default UploadPage
```

### Example 4: Adding to App Routes

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CustomerProvider } from './context/CustomerContext'
import UploadPage from './pages/UploadPage'

function App() {
  return (
    <CustomerProvider>
      <Router>
        <Routes>
          {/* Other routes */}
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </Router>
    </CustomerProvider>
  )
}
```

---

## File Structure

```
src/
├── components/
│   ├── Layout.tsx              # Main layout wrapper
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── DataUpload.tsx          # File upload interface
│   ├── CustomerSelector.tsx    # Customer search component
│   ├── index.ts               # Barrel exports
│   └── ui/                    # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── command.tsx
│       ├── input.tsx
│       ├── popover.tsx
│       └── progress.tsx
├── context/
│   └── CustomerContext.tsx    # Customer state management
├── services/
│   └── supabaseDataService.ts # Data fetching functions
├── utils/
│   └── uploadProcessor.ts     # Upload processing logic
└── pages/
    ├── Homepage.tsx
    ├── Analytics.tsx
    ├── PatientDashboard.tsx
    └── UploadPage.tsx         # Upload page using DataUpload
```

---

## Dependencies

### Required Packages
- `react` - Core React library
- `react-router-dom` - Routing
- `lucide-react` - Icons
- `@radix-ui/react-*` - UI primitives
- `class-variance-authority` - CSS variants
- `tailwindcss` - Styling
- `cmdk` - Command palette
- `@supabase/supabase-js` - Database

### Internal Dependencies
- Customer Context (`@/context/CustomerContext`)
- Supabase Service (`@/services/supabaseDataService`)
- Upload Processor (`@/utils/uploadProcessor`)
- UI Components (`@/components/ui/*`)
- Utils (`@/lib/utils`)

---

## Best Practices

### Layout Component
- Always wrap page content with `<Layout>` for consistency
- Use semantic HTML within the layout
- Keep layout component simple and focused on structure

### Sidebar Component
- Keep navigation links organized and limited
- Use descriptive icons that match the page purpose
- Maintain consistent icon sizes (20px recommended)

### DataUpload Component
- Always validate file types before upload
- Display clear error messages to users
- Use log capture for debugging complex uploads
- Show progress to keep users informed

### CustomerSelector Component
- Place in logical locations (header, search pages)
- Ensure adequate width (400px recommended)
- Handle loading and error states gracefully
- Use within CustomerProvider context

---

## Styling Guide

### Color Scheme
- **Primary**: Blue-600 (active states, buttons)
- **Secondary**: Slate-600/700 (text)
- **Success**: Green-600 (success messages)
- **Error**: Red-600 (error messages)
- **Background**: Slate-50/100 gradient

### Spacing
- Page padding: 8 units (32px)
- Card padding: 6 units (24px)
- Gap between elements: 4-6 units (16-24px)

### Typography
- Page titles: text-3xl (30px) font-bold
- Section titles: text-xl (20px) font-semibold
- Body text: text-sm to text-base
- Descriptions: text-sm text-slate-600

---

## Troubleshooting

### Common Issues

**Issue**: Sidebar not showing
- **Solution**: Ensure you're using the `<Layout>` component

**Issue**: CustomerSelector not navigating
- **Solution**: Check that component is within `<CustomerProvider>`

**Issue**: Upload fails silently
- **Solution**: Check console logs, use "Download Logs" button

**Issue**: Routing doesn't work
- **Solution**: Verify routes are added to App.tsx and wrapped in `<Router>`

### Debug Mode

Enable detailed logging:
```tsx
// In DataUpload component
startLogCapture() // Already called automatically
// Check browser console for detailed logs
// Use "Download Logs" button to save logs
```

---

## Future Enhancements

Potential improvements for these components:

1. **Layout**: Add responsive mobile menu
2. **Sidebar**: Add collapsible state, user profile section
3. **DataUpload**: Add drag-and-drop, file validation preview
4. **CustomerSelector**: Add recent selections, favorites

---

## Support

For issues or questions:
1. Check this guide first
2. Review component source code
3. Check console logs and error messages
4. Use "Download Logs" feature for DataUpload issues

---

## Version History

- **v1.0.0** (2025-11-15): Initial component creation
  - Layout component with sidebar integration
  - Sidebar with navigation and active states
  - DataUpload with 5-file upload support
  - CustomerSelector with search functionality
