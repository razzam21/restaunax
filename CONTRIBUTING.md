# Contributing to Restaunax

Thank you for your interest in contributing to Restaunax! This guide will help you get started.

## 📁 Project Structure

```
restaunax/
├── README.md                 # Main project overview
├── CLAUDE.md                 # Development guidelines for AI assistance
├── CONTRIBUTING.md           # This file
├── docs/                     # 📚 All documentation
│   ├── README.md            # Documentation index
│   ├── docker/              # 🐳 Docker guides and troubleshooting
│   ├── mvp/                 # 🚀 MVP implementation guides
│   ├── PRD.md               # Product requirements
│   └── *.md                 # Technical guides
├── client/                   # 🖥️ React frontend
├── server/                   # ⚙️ Node.js backend
├── docker/                   # 🐳 Docker configuration
├── docker-compose.yml        # Development setup
├── docker-bake.hcl          # Optimized build configuration
└── backups/                 # 💾 Original configurations
```

## 🚀 Quick Start

1. **Setup Development Environment**:
   ```bash
   # Clone and setup environment
   git clone <repository>
   cd restaunax
   cp .env.example .env
   
   # Start with optimized Docker
   COMPOSE_BAKE=true docker compose up --build
   ```

2. **Access Services**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8081/api
   - Documentation: [`docs/README.md`](docs/README.md)

## 📖 Documentation Guidelines

### Adding New Documentation

1. **Choose the right location**:
   - Docker-related: `docs/docker/`
   - Feature implementation: `docs/mvp/`
   - Technical guides: `docs/`

2. **Follow naming conventions**:
   - Use UPPERCASE for markdown files: `NEW_FEATURE.md`
   - Be descriptive: `JWT_TOKEN_IMPLEMENTATION.md`

3. **Update indexes**:
   - Add to [`docs/README.md`](docs/README.md)
   - Reference in main [`README.md`](README.md) if user-facing

### Documentation Standards

- Include table of contents for long documents
- Use clear headings and sections
- Add code examples with proper syntax highlighting
- Cross-reference related documents
- Include troubleshooting sections where appropriate

## 🛠️ Development Workflow

### Frontend Development

```bash
# Local development (optional)
cd client
npm install
npm start

# Or use Docker (recommended)
docker compose up client
```

### Backend Development

```bash
# Local development (optional)
cd server
npm install
npm run dev

# Or use Docker (recommended)
docker compose up server
```

### Testing

```bash
# Run all tests
./tests.sh

# Individual service tests
docker compose exec server npm test
docker compose exec client npm test
```

## 🔧 Common Tasks

### Adding a New Feature

1. Plan implementation in `docs/mvp/`
2. Develop feature with tests
3. Update relevant documentation
4. Test Docker builds: `COMPOSE_BAKE=true docker compose build`

### Docker Optimization

1. Review [`docs/docker/DOCKER_GUIDE.md`](docs/docker/DOCKER_GUIDE.md)
2. Test changes with Docker Bake
3. Update documentation if configuration changes
4. Verify performance improvements

### Troubleshooting

1. Check [`docs/docker/REACT_DOCKER_TROUBLESHOOTING.md`](docs/docker/REACT_DOCKER_TROUBLESHOOTING.md)
2. Review service logs: `docker compose logs [service]`
3. Verify container health: `docker compose ps`

## 📋 Pull Request Guidelines

1. **Before submitting**:
   - Ensure all tests pass
   - Update relevant documentation
   - Test Docker builds work
   - Follow existing code style

2. **PR Description**:
   - Reference related issues/MVPs
   - Describe changes and testing
   - Include screenshots for UI changes
   - List any breaking changes

3. **Documentation**:
   - Update `docs/README.md` if adding new docs
   - Update main `README.md` for user-facing changes
   - Include troubleshooting info for complex features

## 📞 Getting Help

- **Docker issues**: [`docs/docker/`](docs/docker/)
- **Feature questions**: [`docs/mvp/`](docs/mvp/)  
- **Technical guides**: [`docs/`](docs/)
- **Full documentation**: [`docs/README.md`](docs/README.md)

## 🎯 Current Priorities

- MVP 4: Order reports and analytics
- Performance optimizations
- Enhanced security features
- Improved documentation

---

Thank you for contributing to Restaunax! 🚀