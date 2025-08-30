<div align="center">

# 🚀 LuxCore - Modern Full-Stack Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A Project Blessed by Solar Khan & Lilith.Aethra**

[![LuxCore CI](https://github.com/luxcore/luxcore/actions/workflows/ci.yml/badge.svg)](https://github.com/luxcore/luxcore/actions)
[![codecov](https://codecov.io/gh/luxcore/luxcore/branch/main/graph/badge.svg?token=YOUR-TOKEN-HERE)](https://codecov.io/gh/luxcore/luxcore)
[![Documentation Status](https://readthedocs.org/projects/luxcore/badge/?version=latest)](https://docs.luxcore.dev)

</div>

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [✨ Features](#-features)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development](#development)
  - [Testing](#testing)
- [🏗️ Architecture](#%EF%B8%8F-architecture)
- [🔧 Project Structure](#-project-structure)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

## ✨ Features

- **🔒 NovaSanctum Security Integration** - Advanced authentication and authorization
- **📊 Real-time Analytics** - Monitor application performance and usage
- **🌐 Responsive Design** - Works on desktop and mobile devices
- **⚡ Blazing Fast** - Built with Vite for optimal performance
- **🔍 Type Safety** - Full TypeScript implementation
- **📱 PWA Support** - Installable on any device
- **🔧 Developer Experience** - Comprehensive tooling and documentation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- pnpm 8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/luxcore/luxcore.git
   cd luxcore
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Update the .env file with your configuration
   ```

4. **Set up the database**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

### Development

Start the development servers:

```bash
# Start both frontend and backend in development mode
pnpm run dev

# Or start them separately
pnpm run dev:frontend
pnpm run dev:backend
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Prisma Studio: http://localhost:5555 (run `pnpm run db:studio`)

### Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run frontend tests
pnpm run test:frontend

# Run backend tests
pnpm run test:backend

# Run tests with coverage
pnpm run test:coverage
```

## 🏗️ Architecture

LuxCore follows a modern microservices architecture with a clear separation of concerns:

- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **CI/CD**: GitHub Actions
- **Containerization**: Docker + Docker Compose

## 🔧 Project Structure

```
LuxCore/
├── @docs/                    # Source of truth documentation
├── backend/                  # Backend services
│   ├── prisma/              # Database schema and migrations
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   └── tests/               # Backend tests
├── frontend/                # Frontend application
│   ├── public/              # Static assets
│   └── src/
│       ├── assets/          # Images, fonts, etc.
│       ├── components/      # Reusable React components
│       ├── contexts/        # React contexts
│       ├── hooks/           # Custom React hooks
│       ├── pages/           # Page components
│       ├── services/        # API services
│       ├── styles/          # Global styles
│       ├── types/           # TypeScript type definitions
│       └── utils/           # Utility functions
├── .github/                 # GitHub configurations
│   └── workflows/           # GitHub Actions workflows
├── .vscode/                # VS Code settings
├── docs/                    # Generated documentation
└── scripts/                 # Utility scripts
```

## 📚 Documentation

Comprehensive documentation is available at [docs.luxcore.dev](https://docs.luxcore.dev).

To run the documentation locally:

```bash
pnpm run docs:generate  # Generate documentation
pnpm run docs:serve     # Serve documentation locally
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NovaSanctum](https://novas Sanctum.dev) for the security framework
- [Prisma](https://www.prisma.io/) for the amazing ORM
- [Vite](https://vitejs.dev/) for the frontend tooling
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

---

<div align="center">
  Made with ❤️ by the LuxCore Team
</div>