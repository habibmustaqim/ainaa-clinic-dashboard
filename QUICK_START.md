# Quick Start Guide - Business Components

This guide shows you how to quickly get started using the new business components in your Ainaa Clinic Dashboard.

## Components Overview

| Component | Purpose | File |
|-----------|---------|------|
| **Layout** | Page wrapper with sidebar | `src/components/Layout.tsx` |
| **Sidebar** | Navigation menu | `src/components/Sidebar.tsx` |
| **DataUpload** | File upload interface | `src/components/DataUpload.tsx` |
| **CustomerSelector** | Customer search | `src/components/CustomerSelector.tsx` |

## Quick Import

```tsx
// Import individual components
import { Layout } from '@/components/Layout'
import { Sidebar } from '@/components/Sidebar'
import { DataUpload } from '@/components/DataUpload'
import { CustomerSelector } from '@/components/CustomerSelector'

// Or import from barrel export
import { Layout, Sidebar, DataUpload, CustomerSelector } from '@/components'
```

## 5-Minute Setup

### Step 1: Create a New Page

```tsx
// src/pages/MyNewPage.tsx
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'

const MyNewPage = () => {
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-4">My New Page</h1>
      <Card className="p-6">
        <p>Your content here</p>
      </Card>
    </Layout>
  )
}

export default MyNewPage
```

### Step 2: Add Route to App.tsx

```tsx
// src/App.tsx
import MyNewPage from './pages/MyNewPage'

// In your Routes:
<Route path="/my-page" element={<MyNewPage />} />
```

### Step 3: Done!

The sidebar automatically appears with navigation. Your page is now accessible at `/my-page`.

## Common Use Cases

### Use Case 1: Add Customer Search to a Page

```tsx
import { Layout } from '@/components/Layout'
import { CustomerSelector } from '@/components/CustomerSelector'

const SearchPage = () => {
  return (
    <Layout>
      <div className="max-w-md">
        <h2 className="text-xl font-semibold mb-4">Find Customer</h2>
        <CustomerSelector />
      </div>
    </Layout>
  )
}
```

**What happens:**
1. User clicks the selector
2. Popover opens with search
3. User types to filter customers
4. Clicks a customer
5. Navigates to `/patient/:customerId`

### Use Case 2: Create Upload Page

Already done! Navigate to `/upload` to see the DataUpload component in action.

```tsx
// src/pages/UploadPage.tsx (already created)
import { Layout } from '@/components/Layout'
import { DataUpload } from '@/components/DataUpload'

const UploadPage = () => {
  return (
    <Layout>
      <DataUpload />
    </Layout>
  )
}
```

### Use Case 3: Add Navigation Link

Edit `src/components/Sidebar.tsx` to add a new link:

```tsx
<NavLink
  to="/my-new-route"
  icon={<YourIcon size={20} />}
  label="My Feature"
  isActive={isActive('/my-new-route')}
/>
```

## Upload Workflow

### How to Upload Data

1. Navigate to `/upload` (or click "Upload Data" in sidebar)
2. Select all 5 required files:
   - Customer Info CSV
   - Sales Detailed CSV
   - Payment Excel
   - Item Sales Excel
   - Service Sales CSV
3. Click "Upload Data"
4. Watch the progress bar
5. View results when complete
6. Click "Download Logs" if needed

### File Requirements

```
Customer Info:     CSV file (no rows skipped)
Sales Detailed:    CSV file (skips first 15 rows)
Payment:           Excel file (no rows skipped)
Item Sales:        Excel file (skips first 18 rows)
Service Sales:     CSV file (skips first 15 rows)
```

## Customer Selection Workflow

### How to Select a Customer

1. Click the CustomerSelector button
2. Type to search by:
   - Name
   - Membership number
   - Phone number
3. Click a customer from results
4. Automatically navigate to their dashboard

### Integration with Context

The CustomerSelector uses the CustomerContext:

```tsx
const { selectedCustomer, selectCustomer } = useCustomer()
```

When a customer is selected:
- `selectCustomer(customer)` is called
- Customer is stored in context
- Navigation happens to `/patient/:customerId`

## Styling Tips

### Responsive Layout

```tsx
<Layout>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="p-6">Left column</Card>
    <Card className="p-6">Right column</Card>
  </div>
</Layout>
```

### Consistent Spacing

```tsx
<Layout>
  <div className="space-y-6">  {/* Vertical spacing */}
    <h1>Title</h1>
    <Card>Content 1</Card>
    <Card>Content 2</Card>
  </div>
</Layout>
```

## Troubleshooting

### Problem: Sidebar doesn't show
**Solution:** Wrap your page with `<Layout>`

### Problem: Customer search doesn't navigate
**Solution:** Ensure your app is wrapped with `<CustomerProvider>`

### Problem: Upload button disabled
**Solution:** Select all 5 files before uploading

### Problem: Routes not working
**Solution:** Check App.tsx has the route and is wrapped in `<Router>`

## Next Steps

1. **Read the full guide**: `COMPONENTS_GUIDE.md`
2. **Customize styling**: Edit component files or use Tailwind classes
3. **Add features**: Extend components based on your needs
4. **Test thoroughly**: Try all workflows with real data

## Available Routes

After setup, these routes are available:

- `/` - Homepage (with customer search)
- `/analytics` - Analytics dashboard
- `/upload` - Data upload interface
- `/patient/:customerId` - Patient dashboard

## Tips & Best Practices

1. **Always use Layout**: Wrap all page components with `<Layout>`
2. **Consistent spacing**: Use `space-y-6` for vertical layouts
3. **Card components**: Use `<Card>` for content sections
4. **Error handling**: Always handle loading and error states
5. **User feedback**: Show progress for long operations

## Example: Complete Feature Page

```tsx
import { Layout } from '@/components/Layout'
import { CustomerSelector } from '@/components/CustomerSelector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const FeaturePage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            My Feature Page
          </h1>
          <p className="text-slate-600 mt-2">
            Description of what this page does
          </p>
        </div>

        {/* Customer Search Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Find Customer
          </h2>
          <div className="max-w-md">
            <CustomerSelector />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button>Primary Action</Button>
          <Button variant="outline">Secondary Action</Button>
        </div>
      </div>
    </Layout>
  )
}

export default FeaturePage
```

## Getting Help

1. Check `COMPONENTS_GUIDE.md` for detailed documentation
2. Review component source code in `src/components/`
3. Look at example pages in `src/pages/`
4. Check console for error messages
5. Use "Download Logs" button in DataUpload for debugging

---

**Ready to build?** Start by creating a new page with the Layout component, then add the features you need!
