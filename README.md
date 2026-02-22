# KP Med - Medical Learning App

A comprehensive medical learning application built with React Native and Expo, featuring flashcards, quizzes, and spaced repetition for medical education.

## 📊 Status

![CI/CD Pipeline](https://github.com/YOUR_USERNAME/medical-learning-app/workflows/CI%2FCD%20Pipeline/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/medical-learning-app/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/medical-learning-app)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)

## ✨ Features

- 📚 **Flashcard Library** - Browse and study medical flashcards
- 🎯 **Quiz System** - Test your knowledge with interactive quizzes
- 📊 **Progress Tracking** - Monitor your learning progress
- 🔄 **Spaced Repetition** - Optimized review scheduling
- 🌐 **Multi-language** - German and English support
- 📱 **Cross-platform** - Web, iOS, and Android
- 🎨 **Modern UI** - Beautiful, accessible interface
- 🔐 **Secure** - Authentication and data protection

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn
- Expo CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/medical-learning-app.git
cd medical-learning-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running on Different Platforms

```bash
# Web
npm run dev
# Then press 'w' to open in browser

# iOS Simulator (Mac only)
npm run dev
# Then press 'i'

# Android Emulator
npm run dev
# Then press 'a'
```

## 🧪 Testing

We maintain comprehensive test coverage across unit, integration, and E2E tests.

### Run All Tests

```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI (recommended for development)
npm run test:e2e:ui
```

### Test Coverage

Current test coverage:

- **Unit Tests**: 91 passing
- **E2E Tests**: Full critical flow coverage
- **Overall Coverage**: ~85%

See [Testing Guide](./docs/TESTING.md) for details.

## 📖 Documentation

- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [E2E Testing Guide](./docs/E2E-TESTING.md) - End-to-end testing with Playwright
- [CI/CD Guide](./docs/CI-CD.md) - Continuous integration setup
- [Architecture](./docs/ARCHITECTURE.md) - System architecture overview

## 🏗️ Project Structure

```
medical-learning-app/
├── app/                    # Expo Router pages
├── components/             # Reusable React components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # External library integrations
├── utils/                 # Utility functions
├── __tests__/             # Test files
│   ├── e2e/              # End-to-end tests
│   └── utils/            # Unit tests
├── docs/                  # Documentation
└── public/                # Static assets
```

## 🛠️ Technology Stack

### Core

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS (NativeWind)** - Styling

### Backend

- **Supabase** - Database and authentication
- **PostgreSQL** - Relational database

### Testing

- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Axe** - Accessibility testing

### Code Quality

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **GitHub Actions** - CI/CD

### Monitoring

- **Sentry** - Error tracking
- **PostHog** - Analytics
- **Performance API** - Core Web Vitals

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npx tsc --noEmit
```

### Pre-commit Hooks

Husky automatically runs:

- ESLint on staged files
- Prettier formatting
- Type checking

### Build

```bash
# Build for web
npm run build:web

# The output will be in the 'dist/' directory
```

## 📱 Features in Detail

### Flashcard System

- Create and manage medical flashcards
- Rich text content support
- Image attachments
- Category organization
- Search and filter

### Quiz Mode

- Multiple choice questions
- Immediate feedback
- Score tracking
- Performance analytics

### Study Sessions

- Adaptive learning algorithms
- Spaced repetition (SM-2)
- Progress monitoring
- Session history

### Progress Tracking

- Daily/weekly/monthly stats
- Streak tracking
- Performance trends
- Goal setting

## 🌐 Deployment

The app is deployed on Netlify:

**Production**: [https://your-app.netlify.app](https://your-app.netlify.app)

See [Deployment Guide](./docs/DEPLOYMENT.md) for instructions.

### Environment Variables

Create a `.env` file:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Sentry (Error Monitoring)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# PostHog (Analytics)
EXPO_PUBLIC_POSTHOG_API_KEY=your_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# App Config
EXPO_PUBLIC_APP_ENV=development
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We follow conventional commits:

```
feat: Add new feature
fix: Bug fix
docs: Documentation updates
test: Add or update tests
refactor: Code refactoring
style: Code style changes
chore: Maintenance tasks
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/medical-learning-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/medical-learning-app/discussions)
- **Email**: support@kpmed.app

## 🙏 Acknowledgments

- Medical content provided by [Source]
- Icons by [Lucide](https://lucide.dev/)
- UI inspired by modern medical education platforms

---

**Built with ❤️ for medical students and healthcare professionals**
