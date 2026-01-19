# PokeShop

**Live Site:** https://chrillspoketcg.click

A Pokemon card shop web application built with React, Express, Prisma, and the Pokemon TCG API. Browse real card data with market prices, manage your profile with Pokemon avatars, and explore a modern dark-themed interface.

## Features

### Landing Page
- **Hero Card Carousel** - Rotating display of 5 iconic Base Set cards (Charizard, Blastoise, Venusaur, Mewtwo, Zapdos) with auto-advancement, market prices, and navigation dots
- **Set Carousel** - Infinite scrolling showcase of 7 featured Pokemon TCG sets with gradient fade edges
- **Modern UI** - Dark theme with glass morphism effects and amber accent colors

### User System
- **Auth0 Authentication** - Secure login/signup flow
- **User Profiles** - Customizable usernames with Pokemon avatar selection (Gen 1-4 starters + Pikachu/Mew)
- **Role-Based Access** - Buyer, Seller, and Admin roles
- **Seller Requests** - Users can request seller status with admin approval workflow

### Admin Dashboard
- **User Management** - View all users, change roles, activate/deactivate accounts
- **Seller Request Management** - Approve or reject seller requests with optional reasons

### Technical Features
- **Real-time Market Prices** - TCGPlayer pricing data for cards
- **Frontend Caching** - Fast page navigation with cached API responses
- **Server-side Caching** - Efficient Pokemon TCG API proxy with retry logic
- **JWT Authentication** - Secure API endpoints with RBAC middleware

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Frontend       | React 19, React Router 7, TailwindCSS     |
| Backend        | Node.js, Express                          |
| Database       | PostgreSQL, Prisma ORM                    |
| Authentication | Auth0, JWT, RBAC                          |
| API            | Pokemon TCG API                           |
| Build Tool     | Vite                                      |
| Icons          | Iconify React                             |
| Hosting        | AWS (S3, CloudFront, Lambda, RDS)         |
| Caching        | React Query with localStorage persistence |

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)
- Auth0 account
- Pokemon TCG API key

### Installation

```bash
# Clone the repository
git clone https://github.com/captainPeanutbuttter495/PokeShop.git
cd PokeShop

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and Auth0 config
```

### Database Setup

```bash
# Start PostgreSQL container
docker-compose up -d

# Run Prisma migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio
npx prisma studio
```

### Development

```bash
# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Project Structure

```
PokeShop/
├── prisma/              # Database schema and migrations
├── server/              # Express backend
│   ├── middleware/      # JWT and RBAC middleware
│   └── routes/          # API endpoints
├── src/                 # React frontend
│   ├── Components/      # Hero, Navbar, Footer, SetCarousel
│   ├── Pages/           # HomePage, Shop, Profile, AdminDashboard
│   ├── context/         # UserContext for shared state
│   ├── hooks/           # useCard, useCards, useSets
│   └── services/        # API clients
└── Pokemon Card Shop Documentation/  # Detailed docs (Obsidian)
```

## Documentation

Detailed documentation is available in the `Pokemon Card Shop Documentation/PokeShop/` folder (Obsidian-compatible):

- **Architecture**: Tech Stack, Project Structure, API Flow
- **Backend**: API Endpoints, Caching Strategy, Server Setup
- **Frontend**: Components, Hooks, Services, Auth0 Setup, UserContext

## Roadmap

- [ ] Shop page with card browsing and search
- [ ] Filter and sort functionality
- [ ] Shopping cart
- [x] AWS deployment (S3, CloudFront, Lambda, RDS, Route 53)

## Credits

- Card data and images from [Pokemon TCG API](https://pokemontcg.io/)
- Market prices from TCGPlayer

---

**Status**: Active Development
