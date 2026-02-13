# Code Review Checklist

Use this comprehensive checklist to ensure thorough code reviews.

## 1. Functionality

### Core Logic
- [ ] Code implements the intended functionality
- [ ] Requirements are met
- [ ] Edge cases are handled
- [ ] Error conditions are handled appropriately
- [ ] No obvious bugs or logic errors

### Input/Output
- [ ] Input validation is present
- [ ] Output format is correct
- [ ] Boundary conditions are handled
- [ ] Null/undefined cases are handled

---

## 2. Security

### Authentication & Authorization
- [ ] Authentication is required where needed
- [ ] Authorization checks are present
- [ ] User permissions are verified
- [ ] Session management is secure

### Input Validation
- [ ] All user input is validated
- [ ] Input sanitization is applied
- [ ] Type checking is performed
- [ ] Length limits are enforced

### Common Vulnerabilities
- [ ] No SQL injection vulnerabilities
- [ ] No XSS (Cross-Site Scripting) vulnerabilities
- [ ] No CSRF (Cross-Site Request Forgery) vulnerabilities
- [ ] No command injection vulnerabilities
- [ ] No path traversal vulnerabilities

### Sensitive Data
- [ ] No hardcoded secrets or credentials
- [ ] No API keys in code
- [ ] No passwords in plain text
- [ ] Sensitive data is encrypted
- [ ] Secrets use environment variables

### Dependencies
- [ ] No known vulnerable dependencies
- [ ] Dependencies are up to date
- [ ] Minimal dependencies used

---

## 3. Performance

### Database
- [ ] No N+1 query problems
- [ ] Appropriate indexes exist
- [ ] Queries are optimized
- [ ] Connection pooling is used
- [ ] Transactions are used appropriately

### Algorithms & Data Structures
- [ ] Appropriate data structures chosen
- [ ] Algorithm complexity is acceptable
- [ ] No unnecessary loops
- [ ] No redundant operations

### Caching
- [ ] Caching used where appropriate
- [ ] Cache invalidation is correct
- [ ] Cache keys are well-designed

### Resource Management
- [ ] Files/connections are closed
- [ ] Memory leaks are avoided
- [ ] Resources are released properly

---

## 4. Code Quality

### Naming
- [ ] Variable names are clear and descriptive
- [ ] Function names describe what they do
- [ ] Class names are appropriate
- [ ] Constants are named in UPPER_CASE
- [ ] Boolean variables use is/has/can prefix

### Functions
- [ ] Functions are small and focused (<50 lines)
- [ ] Functions do one thing well
- [ ] Function parameters are reasonable (<5)
- [ ] No side effects (when possible)
- [ ] Pure functions where appropriate

### Code Organization
- [ ] Code is logically organized
- [ ] Related code is grouped together
- [ ] Separation of concerns is maintained
- [ ] No code duplication (DRY principle)
- [ ] Appropriate abstraction levels

### Complexity
- [ ] Cyclomatic complexity is low
- [ ] Nesting depth is reasonable (<4 levels)
- [ ] No overly complex conditionals
- [ ] Complex logic is broken down

### Error Handling
- [ ] Errors are caught and handled
- [ ] Error messages are meaningful
- [ ] Errors are logged appropriately
- [ ] Resources are cleaned up on error
- [ ] Errors don't expose sensitive info

---

## 5. Testing

### Test Coverage
- [ ] Unit tests are present
- [ ] Integration tests exist (if needed)
- [ ] Critical paths are tested
- [ ] Edge cases are tested
- [ ] Error cases are tested

### Test Quality
- [ ] Tests are clear and readable
- [ ] Tests are independent
- [ ] Tests are deterministic
- [ ] Test names describe what they test
- [ ] Mocks/stubs are used appropriately

### Test Data
- [ ] Test data is realistic
- [ ] Test data doesn't contain real user data
- [ ] Test fixtures are well-organized

---

## 6. Documentation

### Code Comments
- [ ] Complex logic is explained
- [ ] Non-obvious decisions are documented
- [ ] Important assumptions are noted
- [ ] TODOs are tracked
- [ ] Comments are up to date

### API Documentation
- [ ] Public APIs are documented
- [ ] Parameters are described
- [ ] Return values are documented
- [ ] Exceptions are documented
- [ ] Examples are provided

### README/Docs
- [ ] README is updated (if needed)
- [ ] Configuration is documented
- [ ] Setup instructions are clear
- [ ] Dependencies are listed

---

## 7. Code Style

### Formatting
- [ ] Consistent indentation
- [ ] Consistent spacing
- [ ] Line length is reasonable (<120 chars)
- [ ] Consistent bracket style

### Conventions
- [ ] Follows project style guide
- [ ] Naming conventions are consistent
- [ ] File organization follows conventions
- [ ] Import/require statements are organized

### Linting
- [ ] No linter errors
- [ ] No linter warnings (or justified)
- [ ] Code passes static analysis

---

## 8. Architecture

### Design Patterns
- [ ] Appropriate patterns used
- [ ] No anti-patterns present
- [ ] SOLID principles followed
- [ ] Dependency injection used appropriately

### Coupling & Cohesion
- [ ] Low coupling between modules
- [ ] High cohesion within modules
- [ ] Dependencies are clear
- [ ] Circular dependencies avoided

### Scalability
- [ ] Code can handle growth
- [ ] No hardcoded limits
- [ ] Stateless where possible
- [ ] Horizontal scaling considered

---

## 9. Maintainability

### Readability
- [ ] Code is easy to understand
- [ ] Intent is clear
- [ ] No clever tricks
- [ ] Consistent style throughout

### Modularity
- [ ] Code is modular
- [ ] Modules have clear boundaries
- [ ] Easy to modify
- [ ] Easy to test

### Technical Debt
- [ ] No new technical debt added
- [ ] Existing debt is addressed (if possible)
- [ ] Workarounds are documented

---

## 10. Deployment

### Configuration
- [ ] Configuration is externalized
- [ ] Environment-specific config is separate
- [ ] Secrets are not in code
- [ ] Feature flags used appropriately

### Logging
- [ ] Appropriate logging level
- [ ] Sensitive data not logged
- [ ] Logs are structured
- [ ] Error context is logged

### Monitoring
- [ ] Metrics are collected
- [ ] Errors are tracked
- [ ] Performance is monitored
- [ ] Alerts are configured

---

## Priority Levels

### 🚨 Critical (Must Fix)
- Security vulnerabilities
- Data loss risks
- System crashes
- Incorrect functionality

### ⚠️ High (Should Fix)
- Performance issues
- Missing error handling
- Missing tests for critical code
- Major code quality issues

### 💡 Medium (Nice to Fix)
- Code duplication
- Minor performance improvements
- Missing documentation
- Style inconsistencies

### 📝 Low (Optional)
- Minor refactoring
- Additional tests
- Code comments
- Optimization opportunities

---

## Review Outcome

After completing the checklist:

- [ ] **Approve** - All critical and high priority items addressed
- [ ] **Approve with Comments** - Minor issues noted for future
- [ ] **Request Changes** - Critical or high priority issues found
- [ ] **Needs Discussion** - Architectural or design questions

---

## Tips for Effective Reviews

1. **Start with the big picture** - Understand the overall change first
2. **Check critical items first** - Security and correctness before style
3. **Be thorough but pragmatic** - Don't let perfect be the enemy of good
4. **Provide context** - Explain why something is important
5. **Suggest alternatives** - Don't just point out problems
6. **Acknowledge good work** - Positive feedback is valuable too
7. **Ask questions** - Seek to understand before criticizing
8. **Focus on impact** - Prioritize issues by their impact

Remember: The goal is to ship high-quality code, not to find every possible issue.
