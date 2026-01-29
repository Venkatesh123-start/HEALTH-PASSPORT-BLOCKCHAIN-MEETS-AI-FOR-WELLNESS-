# Contributing to Health Passport

Thank you for your interest in contributing to Health Passport! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/HEALTH-PASSPORT-BLOCKCHAIN-MEETS-AI-FOR-WELLNESS-.git
   cd HEALTH-PASSPORT-BLOCKCHAIN-MEETS-AI-FOR-WELLNESS-
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Venkatesh123-start/HEALTH-PASSPORT-BLOCKCHAIN-MEETS-AI-FOR-WELLNESS-.git
   ```
4. **Create a branch** for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Process

1. **Keep your fork updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Make your changes** following our coding standards

4. **Test your changes** thoroughly

5. **Commit your changes** with meaningful commit messages

## Coding Standards

### General Principles

- Write clean, readable, and maintainable code
- Follow the DRY (Don't Repeat Yourself) principle
- Comment your code where necessary, especially for complex logic
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names

### JavaScript/TypeScript

- Follow ESLint configuration
- Use ES6+ features
- Use async/await instead of callbacks
- Add JSDoc comments for public APIs
- Format code with Prettier

Example:
```javascript
/**
 * Validates patient health data
 * @param {Object} data - Patient health data
 * @returns {boolean} - True if valid, false otherwise
 */
async function validateHealthData(data) {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings for all functions and classes
- Format code with Black
- Use virtual environments

Example:
```python
def calculate_health_score(metrics: dict) -> float:
    """
    Calculate overall health score from metrics.
    
    Args:
        metrics: Dictionary containing health metrics
        
    Returns:
        float: Calculated health score (0-100)
    """
    # Implementation
```

### Solidity (Smart Contracts)

- Follow Solidity style guide
- Add NatSpec comments
- Implement security best practices
- Use SafeMath for arithmetic operations
- Write comprehensive tests

Example:
```solidity
/**
 * @notice Stores patient health record
 * @param _recordHash IPFS hash of the health record
 * @param _patientId Unique patient identifier
 */
function storeHealthRecord(string memory _recordHash, uint256 _patientId) public {
    // Implementation
}
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```
feat(blockchain): add patient record encryption

Implement end-to-end encryption for patient records
before storing on blockchain using AES-256.

Closes #123
```

```
fix(ai): correct health score calculation

Fix bug where BMI was not being factored correctly
in the overall health score calculation.
```

```
docs(readme): update installation instructions

Add Docker setup instructions and clarify prerequisites.
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**:
   ```bash
   npm test
   pytest
   ```
4. **Update CHANGELOG.md** if applicable
5. **Fill out the PR template** completely
6. **Request review** from maintainers
7. **Address review feedback** promptly

### PR Title Format

Use the same format as commit messages:
```
feat(blockchain): add patient record encryption
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings generated
```

## Testing

### Unit Tests

Write unit tests for all new functions:

**JavaScript:**
```bash
npm test
```

**Python:**
```bash
pytest tests/
```

### Integration Tests

Test interactions between components:
```bash
npm run test:integration
```

### Smart Contract Tests

Test all contract functions:
```bash
truffle test
# or
hardhat test
```

### Test Coverage

Maintain >80% code coverage:
```bash
npm run coverage
```

## Documentation

- Update README.md if adding new features
- Add JSDoc/docstring comments for all public APIs
- Update architecture documentation if making structural changes
- Add examples for new functionality
- Keep API documentation up to date

### Documentation Structure

- **README.md**: Project overview and quick start
- **docs/ARCHITECTURE.md**: System architecture
- **docs/API.md**: API reference
- **docs/SETUP.md**: Detailed setup guide
- **Code comments**: Inline documentation

## Questions or Need Help?

- 💬 Join our Discord community
- 📧 Email: contribute@healthpassport.io
- 📝 Open a discussion on GitHub

## Recognition

Contributors will be recognized in:
- README.md acknowledgments
- CONTRIBUTORS.md file
- Release notes

Thank you for contributing to Health Passport! Your efforts help make healthcare data more secure and accessible for everyone.
