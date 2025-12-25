# Freelancers Promotions - Next.js Website

## About

Freelancers Promotions is owned and operated by Martine Broderick & Liz Gossan. Martine has been part of the business for 20 years and prior was a freelance Production Manager. Liz Gossan brings her finance skills to the business having worked with larger companies as an accountant and is a fully qualified CPA.

Freelancers is Melbourne's primary portal to employment on screen productions, providing experienced film technicians to longform drama, television commercials and online content.

## Tech Stack

- **Framework:** Next.js 16.05
- **Styling:** SCSS Modules
- **Architecture:** Component-based
- **Database:** Microsoft Access (ODBC connection)
- **Storage:** Azure Blob Storage

## SCSS Modules

This project uses **SCSS Modules** for all component styling. SCSS Modules provide automatic CSS scoping, preventing style conflicts while giving you the full power of Sass preprocessing.

### How SCSS Modules Work

SCSS Module files follow the naming convention `componentName.module.scss`. When imported, class names are automatically transformed into unique identifiers scoped to that component.

**Example:**

```jsx
import styles from "../styles/serviceCard.module.scss";

export default function ServiceCard({ title }) {
  return <div className={styles.card}>{title}</div>;
}
```

```scss
/* serviceCard.module.scss */
.card {
  padding: 1.5rem;
  background: white;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
```

The `.card` class is automatically scoped to this component (e.g., `ServiceCard_card__a1b2c`), preventing any naming conflicts with other components.

## Global Variables

Where possible all colors, font elements and spacing are declared with global variables in the root globals.css file.

### Benefits

- **Automatic Scoping:** No manual BEM naming or unique prefixes needed
- **No Global Conflicts:** Multiple components can safely use the same class names
- **Sass Features:** Full access to variables, nesting, mixins, and functions
- **Tree Shaking:** Unused styles are eliminated in production
- **Global Variables:** Allow for quick changes to the entire codebase and maintain UI consistency across pages.

## Component-Based Architecture

This project follows a **component-based architecture** to reduce code repetition and improve maintainability.

## Required Packages

This project uses minimal external dependencies to maximize performance:

```json
{
  "dependencies": {
    "axios": "^1.13.2",
    "cheerio": "^1.1.2",
    "imghash": "^1.1.1",
    "json2csv": "^6.0.0-alpha.2",
    "mssql": "^12.2.0",
    "next": "16.0.5",
    "next-sitemap": "^1.6.16",
    "puppeteer": "^24.31.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "sass": "^1.97.0"
  }
}
```

Additional packages will be added as needed for specific functionality (Azure SDK, ODBC drivers, authentication, email services).

## Core Features

### Public Site

- Service listings with filterable display
- Crew directory
- Public contact form with email notifications
- Company information and booking guidelines

### Client Portal (Authenticated)

- User registration and authentication
- Profile management
- Image and document uploads
- Password management

## Database Integration

### Azure Blob Storage

Images and PDF documents are stored in Azure Blob Storage and retrieved asynchronously. Media files are matched to database records using IDs, with slugs serving as a single source of truth for routing.

_[Details to be added during implementation]_

### Microsoft Access Database (ODBC)

The site connects to an existing Microsoft Access database via ODBC to retrieve:

- Services list
- Crew directories
- Booking management data

_[Connection details, query patterns, and security implementation to be documented]_

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=

# Access Database
DATABASE_CONNECTION_STRING=

# Additional configuration as needed
```

---

**Contact:** Freelancers Promotions  
**Location:** Melbourne, Australia
**Developer:** Daniel Thomas - dan@officeexperts.com.au
