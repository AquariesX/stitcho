# Stitcho Web Dashboard

Welcome to the **Stitcho Web Dashboard** repository! Stitcho is a modern, comprehensive platform designed to bridge the gap between tailored clothing shops and customers. This web dashboard provides powerful management interfaces for Admins and Tailors, handling everything from user authentication and shop profiles to custom measurements and order management.

## 🚀 Features

- **Multi-role Authentication:** Secure login and registration for Admins and Tailors via Firebase Authentication.
- **Admin Dashboard:** Centralized management for the entire platform, including user/tailor approvals, system settings, and notifications.
- **Tailor Dashboard:** Dedicated portal for tailors to manage their shop profiles, handle customer orders, update order status, and manage their shop's measurements and styles.
- **Order Management:** Complete lifecycle management of customized clothing orders, tracking details like fabrics, colors, custom styles, measurements, and payment status.
- **Shop Profiles:** Detailed shop pages including location, working hours, specialization, delivery parameters, and contact info.
- **Notifications:** In-app notification system (including email alerts) for new signups, order status updates, and system alerts.

## 🛠 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Frontend Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) for animations, [Lucide React](https://lucide.dev/) for icons
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Database:** MySQL
- **Authentication Services:** [Firebase](https://firebase.google.com/) & Firebase Admin
- **Email Service:** [Nodemailer](https://nodemailer.com/about/)

## 📂 Project Structure

```text
├── prisma/             # Prisma schema, migrations, and seed scripts
├── public/             # Static assets
├── src/
│   └── app/            # Next.js App Router (Pages, Layouts, API Routes)
│       ├── actions/    # Server Actions for handling form submissions and DB queries
│       ├── ...
│   ...
├── package.json        # Dependencies and scripts
└── tailwind.config.ts  # TailwindCSS configuration
```

## ⚙️ Prerequisites

Ensure you have the following installed on your local machine:
- **Node.js** (v18.17+ recommended)
- **MySQL** instance running locally or hosted
- A **Firebase** project for Authentication

## 🚦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/AquariesX/stitcho.git
cd stitcho/webdashboard
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Set up environment variables
Create a `.env` file in the root directory and add all the necessary environment variables. The variables typically look like this:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/stitch_db"

# Firebase Client Configuration (Next.js Public)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"

# Firebase Admin Configuration (Backend)
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PRIVATE_KEY="your-private-key"

# Nodemailer Configuration (For email notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
```

### 4. Setup Prisma (Database)
Run the following commands to generate the Prisma client and push the schema to your database.
```bash
npm run postinstall
npx prisma db push
```
*(Optional)* If you have a seed script available, you can populate the database:
```bash
npx prisma db seed
```

### 5. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎨 UI/UX Note
The platform focuses heavily on a premium, modern aesthetic, utilizing TailwindCSS alongside Framer Motion to provide engaging micro-interactions, sophisticated gradients, and sleek layouts.

## 🤝 Contributing
Contributions are welcome! Please ensure that your pull requests are detailed and address specific features or bug fixes.

---
_Developed for Final Year Project (Intelligent Healthcare / Tailor Management Sys integrations) by Qasim._
