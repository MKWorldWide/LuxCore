# Contributing to LuxCore

First off, thank you for considering contributing to LuxCore! We appreciate your time and effort in helping us make this project better.

## 🎯 Ways to Contribute

There are many ways to contribute to LuxCore, including:

- 🐛 Reporting bugs
- 🚀 Suggesting new features
- 📝 Improving documentation
- 💻 Writing code (fixes, features, tests)
- 🧪 Testing the application
- 🔍 Code reviews
- 🔧 Helping with project maintenance

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/your-username/luxcore.git
   cd luxcore
   ```
3. **Set up the development environment**
   ```bash
   # Install pnpm if you haven't already
   npm install -g pnpm
   
   # Install dependencies
   pnpm install
   
   # Set up environment variables
   cp .env.example .env
   # Update the .env file with your configuration
   
   # Set up the database
   pnpm run db:migrate
   pnpm run db:seed
   ```

## 🔧 Development Workflow

1. **Create a new branch** for your changes
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b bugfix/fix-issue-123
   ```

2. **Make your changes** following the project's coding standards

3. **Run tests** to ensure everything works
   ```bash
   # Run all tests
   pnpm test
   
   # Run backend tests
   pnpm run test:backend
   
   # Run frontend tests
   pnpm run test:frontend
   ```

4. **Lint your code**
   ```bash
   pnpm run lint
   pnpm run format
   ```

5. **Commit your changes** with a descriptive message
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push your changes** to your fork
   ```bash
   git push origin your-branch-name
   ```

7. **Create a Pull Request** from your fork to the main repository

## 📝 Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Write clear, concise commit messages
- Reference any related issues in your PR description
- Ensure all tests pass
- Update documentation as needed
- Follow the project's coding standards

## 🧪 Testing

We use the following testing tools:
- **Backend**: Jest for unit and integration tests
- **Frontend**: Vitest for component and unit tests
- **End-to-End**: (Coming soon)

Run tests with:
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Generate test coverage
pnpm run test:coverage
```

## 🏗️ Code Style

- We use **TypeScript** for type safety
- Follow the existing code style and patterns
- Use **ESLint** and **Prettier** for consistent formatting
- Keep functions small and focused
- Write meaningful variable and function names
- Add comments for complex logic

## 📚 Documentation

Good documentation is crucial for the success of the project. When making changes:

- Update the relevant documentation
- Add JSDoc comments for new functions and classes
- Document any breaking changes
- Keep the README up to date

## 🐛 Reporting Bugs

Found a bug? Please let us know by [opening an issue](https://github.com/luxcore/luxcore/issues/new?template=bug_report.md).

Include the following in your bug report:
1. **Description** of the issue
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment** details (OS, Node.js version, etc.)
6. **Screenshots** (if applicable)

## 💡 Feature Requests

Have an idea for a new feature? [Open an issue](https://github.com/luxcore/luxcore/issues/new?template=feature_request.md) to discuss it with the maintainers.

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🙏 Thank You!

Your contributions make LuxCore better for everyone. Thank you for your time and effort!

---

*This contributing guide was inspired by [PurpleBooth's template](https://gist.github.com/PurpleBooth/b24679402957c63ec426).*
