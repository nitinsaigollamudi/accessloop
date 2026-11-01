# AccessLoop
### Unlock Underused Equipment and Spaces

**Discover. Request. Share. Manage.**

AccessLoop is a resource-sharing platform designed to help institutions and communities discover, request, manage, and share underutilized equipment and spaces through a structured and trusted booking system.

---

## 🚀 Live Demo

**[OPEN ACCESSLOOP — LIVE APPLICATION](https://accessloop-three.vercel.app/)**

The application is publicly deployed. Judges can register independently and explore the platform without requiring an invitation from the development team.

- Self-registration is available.
- Users can choose their account role.
- Email verification is not required.
- Two separate accounts are recommended to experience both sides of the platform.

## 👨‍⚖️ Judge Quick Start Guide

Follow these steps to evaluate AccessLoop independently.

### Step 1 — Open the Application

Visit: https://accessloop-three.vercel.app/

Register a new account and select one of the available roles.

### Step 2 — Explore as a Resource Owner

1. Register with a new account.
2. Select the **Resource Owner** role.
3. Create a resource listing.
4. Add its availability and access conditions.
5. View incoming booking requests.
6. Review borrower eligibility information.
7. Approve or reject booking requests.
8. Manage resource bookings and related activities.

### Step 3 — Explore as a Borrower

1. Register using a separate account.
2. Select the **Borrower** role.
3. Discover available resources.
4. View resource details and availability.
5. Submit a booking request.
6. Provide the required eligibility information.
7. Track the booking status.
8. After approval, complete check-in during the permitted booking window.
9. Record the initial resource condition.
10. Complete check-out and record the final condition.

### Step 4 — Explore Additional Features

Judges can also explore:

- Resource waitlist management.
- Incident reporting and resolution.
- Notifications and booking reminders.
- Booking activity and transaction history.

**Important:** Use separate owner and borrower accounts to experience the complete workflow. Check-in is restricted to the approved booking window. Ensure that the booking is scheduled for a time you can actually test.

---

## ✨ Key Features

### Resource Discovery and Management
- Resource creation and listing.
- Resource discovery and browsing.
- Availability and access-condition management.

### Booking and Approval
- Borrower booking requests.
- Owner-controlled booking approval and rejection.
- Eligibility verification.
- Booking status management.

### Responsible Resource Usage
- Time-restricted booking check-in.
- Initial condition reporting.
- Check-out and return condition reporting.
- Booking activity and transaction history.

### Additional Platform Capabilities
- Resource waitlist management.
- Incident reporting and resolution.
- Notifications and booking reminders.
- Role-based access control.
- Database-level security using Supabase Row Level Security.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Authentication |
| Database Security | Row Level Security (RLS) |
| Deployment | Vercel |
| Version Control | GitHub |

---

## ⚙️ Local Development

### Prerequisites
- Node.js and npm
- Git
- A Supabase project with the required database configuration

### 1. Clone the Repository

```bash
git clone https://github.com/nitinsaigollamudi/accessloop.git
cd accessloop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file and configure the Supabase environment variables required by the application.

Never commit environment secrets, private credentials, or the Supabase service-role key to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Create a Production Build

```bash
npm run build
```

---

## 🔐 Security and Access Control

AccessLoop uses Supabase authentication and database-level access controls to support role-based operations.

Key security considerations include:

- Authenticated user access.
- Role-based permissions.
- Row Level Security policies.
- Controlled booking lifecycle operations.
- Owner-controlled approval and eligibility review.
- Booking-window restrictions for check-in.

---

## 🔮 Future Scope

Potential future improvements include:

- Advanced resource utilization analytics.
- Enhanced institutional administration.
- Improved reporting and insights.
- Additional integrations for institutional resource management.

---

## 📌 Project Information

**Project:** AccessLoop — Unlock Underused Equipment and Spaces

**Development:** 48-hour hackathon project

**Live Application:** https://accessloop-three.vercel.app/

**GitHub Repository:** https://github.com/nitinsaigollamudi/accessloop

**Built with:** React, Vite, Supabase and PostgreSQL.

AccessLoop aims to make existing institutional resources easier to discover, share, manage and use responsibly.

