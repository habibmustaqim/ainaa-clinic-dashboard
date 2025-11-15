# AINAA Clinic Dashboard

A modern, comprehensive healthcare management dashboard built for AINAA Clinic to streamline patient data management, analytics, and administrative operations.

## Description

AINAA Clinic Dashboard is a web-based application designed to help healthcare providers efficiently manage patient information, track clinic metrics, and visualize healthcare data through interactive charts and analytics. The dashboard provides a user-friendly interface for uploading patient records, monitoring key performance indicators, and accessing detailed patient information in real-time.

## Features

### File Upload System
- Bulk patient data import via CSV file upload
- Support for multiple file formats
- Data validation and error handling
- Real-time upload progress tracking
- Automatic data parsing and database synchronization

### Analytics Dashboard
- Interactive data visualizations using Recharts
- Real-time patient statistics and metrics
- Trend analysis for patient visits and demographics
- Customizable date range filtering
- Gender distribution charts
- Age group analytics
- Monthly/yearly patient trends

### Patient Dashboard
- Comprehensive patient list view
- Advanced search and filtering capabilities
- Sortable columns for easy data organization
- Detailed patient profile cards
- Quick access to patient medical information
- Pagination for large datasets
- Patient statistics overview (total patients, new patients, appointments)

### Additional Features
- Responsive design for desktop and mobile devices
- Secure authentication and authorization
- Real-time data synchronization with Supabase
- Modern, intuitive user interface with Tailwind CSS
- Smooth animations with Framer Motion
- Type-safe development with TypeScript

## Tech Stack

- **Frontend Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Backend/Database:** Supabase (PostgreSQL)
- **UI Styling:** Tailwind CSS
- **Charts/Visualizations:** Recharts
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Routing:** React Router DOM
- **HTTP Client:** Supabase Client

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account (free tier available)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ainaa-clinic-dashboard.git
   cd ainaa-clinic-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**

   Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to configure your Supabase project, database schema, and Row Level Security policies.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

6. **Build for production**
   ```bash
   npm run build
   ```

   The production-ready files will be generated in the `dist` directory.

## Environment Variables

The following environment variables are required for the application to function:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key | Yes |

See `.env.example` for a template configuration file.

## Usage Guide

### Getting Started

1. **Login/Authentication**
   - Navigate to the login page
   - Enter your credentials (configured in Supabase Auth)
   - Access the dashboard upon successful authentication

2. **Dashboard Overview**
   - View key metrics on the home dashboard
   - Monitor patient statistics in real-time
   - Access quick links to various features

3. **Uploading Patient Data**
   - Navigate to the Upload section
   - Click "Choose File" or drag and drop a CSV file
   - Ensure your CSV file contains the required columns (name, age, gender, contact, etc.)
   - Click "Upload" to process the file
   - View upload status and any validation errors
   - Successful uploads will automatically sync to the database

4. **Viewing Analytics**
   - Navigate to the Analytics section
   - View various charts and graphs showing patient trends
   - Use date filters to analyze specific time periods
   - Export charts or data as needed

5. **Managing Patients**
   - Navigate to the Patients section
   - Browse the patient list with pagination
   - Use the search bar to find specific patients
   - Click on a patient card to view detailed information
   - Sort by various columns (name, age, date added, etc.)

### CSV File Format

When uploading patient data, ensure your CSV file follows this format:

```csv
name,age,gender,contact,address,medical_history
John Doe,45,Male,+60123456789,123 Main St,Diabetes Type 2
Jane Smith,32,Female,+60198765432,456 Oak Ave,Hypertension
```

Required columns:
- `name`: Patient full name
- `age`: Patient age (numeric)
- `gender`: Male/Female/Other
- `contact`: Phone number
- `address`: Full address
- `medical_history`: Brief medical history

## Project Structure

```
ainaa-clinic-dashboard/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── lib/             # Utility functions and configurations
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── .env.example         # Environment variable template
├── index.html           # HTML template
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

This project uses:
- ESLint for code linting
- TypeScript for type safety
- Prettier (recommended) for code formatting

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Deploying to Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Issue: Supabase connection error**
- Verify your `.env` file has the correct Supabase URL and anon key
- Check if your Supabase project is active
- Ensure Row Level Security policies are properly configured

**Issue: CSV upload fails**
- Check CSV file format matches the expected structure
- Ensure all required columns are present
- Verify file size is under the maximum limit

**Issue: Charts not displaying**
- Check if data is being fetched from Supabase
- Verify Recharts is properly installed
- Check browser console for errors

## Support

For support, please contact:
- Email: support@ainaaclinic.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/ainaa-clinic-dashboard/issues)

## License

MIT License

Copyright (c) 2025 AINAA Clinic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Made with care for AINAA Clinic
