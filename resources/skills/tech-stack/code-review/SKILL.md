---
name: code-review
description: Universal code review principles and best practices. Use when reviewing code, checking quality, analyzing patterns, or improving code maintainability. Covers security, performance, readability, testing, and common anti-patterns across all programming languages.
type: domain
enforcement: suggest
priority: high
keywords:
  - review
  - check
  - analyze
  - quality
  - code review
  - pr review
  - audit
intentPatterns:
  - (review|check|analyze).*?code
  - (how to|best practice).*?review
  - (code|pr).*?(review|quality|audit)
---


# Code Review Guidelines

## Purpose

Establish consistent code review practices across all projects and programming languages. This skill provides a comprehensive framework for reviewing code quality, security, performance, and maintainability.

## When to Use This Skill

Automatically activates when:
- Reviewing pull requests or code changes
- Checking code quality and maintainability
- Analyzing code patterns and architecture
- Identifying bugs or potential issues
- Discussing best practices
- Refactoring or improving existing code
- Conducting security audits
- Optimizing performance

## Quick Start

### Essential Code Review Checklist

- [ ] **Logic Correctness**: Does the code do what it's supposed to?
- [ ] **Error Handling**: Are errors handled gracefully?
- [ ] **Security**: Any security vulnerabilities (XSS, SQL injection, etc.)?
- [ ] **Performance**: Any obvious performance bottlenecks?
- [ ] **Readability**: Is the code easy to understand?
- [ ] **Testing**: Are there adequate tests?
- [ ] **Documentation**: Is complex logic documented?
- [ ] **Code Style**: Does it follow project conventions?

### Quick Decision Tree

```
Is the code correct? → No → Request changes
    ↓ Yes
Is it secure? → No → Request changes
    ↓ Yes
Is it tested? → No → Request tests
    ↓ Yes
Is it readable? → No → Suggest improvements
    ↓ Yes
Approve ✓
```

---

## Core Principles

### 1. Correctness First
Code must work correctly before anything else matters. Verify:
- Logic implements requirements
- Edge cases are handled
- Error conditions are managed
- No obvious bugs

### 2. Security Matters
Always consider security implications:
- No hardcoded secrets or credentials
- Input validation present
- SQL injection prevented
- XSS vulnerabilities addressed
- Authentication/authorization correct

### 3. Readability Counts
Code is read more than written:
- Clear variable and function names
- Consistent formatting
- Appropriate comments
- Logical organization

### 4. Test Coverage
Critical paths must be tested:
- Unit tests for business logic
- Integration tests for workflows
- Edge cases covered
- Error cases tested

### 5. Performance Awareness
Avoid obvious bottlenecks:
- No N+1 queries
- Appropriate data structures
- Efficient algorithms
- Caching where appropriate

### 6. Maintainability
Code should be easy to change:
- Small, focused functions
- Low coupling, high cohesion
- No code duplication
- Clear abstractions

### 7. Consistency
Follow project conventions:
- Code style guidelines
- Naming conventions
- File organization
- Architecture patterns

---

## Navigation Guide

This skill provides detailed guidance through resource files:

### For Quick Reviews
- Start with [Review Checklist](resources/checklist.md)
- Check [Common Issues](resources/common-issues.md)

### For Security Focus
- Review [Security Patterns](resources/security-patterns.md)
- Check for common vulnerabilities

### For Performance Focus
- Review [Performance Tips](resources/performance-tips.md)
- Look for optimization opportunities

### For Code Quality
- Check [Common Issues](resources/common-issues.md)
- Apply [Review Checklist](resources/checklist.md)

---

## Resource Files

- **[Review Checklist](resources/checklist.md)** - Comprehensive review checklist covering all aspects
- **[Common Issues](resources/common-issues.md)** - Frequently found problems with examples
- **[Security Patterns](resources/security-patterns.md)** - Security best practices and vulnerabilities
- **[Performance Tips](resources/performance-tips.md)** - Performance optimization guidelines

---

## Quick Reference

### Red Flags (Request Changes)

🚨 **Critical Issues:**
- Hardcoded credentials or API keys
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing authentication/authorization
- Unhandled errors in critical paths

⚠️ **Major Issues:**
- No error handling
- Missing input validation
- Obvious performance problems (N+1 queries)
- No tests for critical functionality
- Security vulnerabilities

### Yellow Flags (Suggest Improvements)

💡 **Code Quality:**
- Unclear variable names
- Functions too long (>50 lines)
- Code duplication
- Missing comments for complex logic
- Inconsistent code style

### Green Flags (Good Practices)

✅ **Excellent Code:**
- Clear, descriptive names
- Small, focused functions
- Comprehensive error handling
- Good test coverage
- Clear comments where needed
- Consistent style
- Security best practices followed

---

## Review Process

### 1. First Pass - High Level
- Understand the purpose
- Check overall architecture
- Verify requirements met

### 2. Second Pass - Details
- Review logic line by line
- Check error handling
- Verify security
- Assess performance

### 3. Third Pass - Quality
- Check readability
- Verify tests
- Review documentation
- Check consistency

### 4. Provide Feedback
- Be specific and constructive
- Explain the "why"
- Suggest alternatives
- Acknowledge good work

---

## Language-Agnostic Patterns

### Good Function Design
```
✅ Small and focused
✅ Single responsibility
✅ Clear name
✅ Few parameters (<5)
✅ No side effects (when possible)
✅ Proper error handling
```

### Good Variable Names
```
❌ Bad: x, tmp, data, info
✅ Good: userId, totalPrice, isAuthenticated, userEmail
```

### Good Error Handling
```
✅ Catch specific exceptions
✅ Log errors with context
✅ Provide meaningful error messages
✅ Clean up resources
✅ Don't swallow errors
```

### Good Comments
```
✅ Explain "why", not "what"
✅ Document complex algorithms
✅ Note important assumptions
✅ Warn about gotchas
❌ Don't state the obvious
```

---

## Common Anti-Patterns

### 1. God Objects/Functions
Functions or classes that do too much. Break them down.

### 2. Magic Numbers
Use named constants instead of hardcoded values.

### 3. Premature Optimization
Optimize only when needed, after profiling.

### 4. Copy-Paste Programming
Extract common code into reusable functions.

### 5. Error Swallowing
Always handle or propagate errors properly.

### 6. Tight Coupling
Depend on abstractions, not concrete implementations.

### 7. No Tests
Critical code must have tests.

---

## Review Etiquette

### Do:
- ✅ Be respectful and constructive
- ✅ Explain reasoning
- ✅ Suggest alternatives
- ✅ Ask questions
- ✅ Acknowledge good work
- ✅ Focus on the code, not the person

### Don't:
- ❌ Be dismissive or rude
- ❌ Nitpick style without reason
- ❌ Block on personal preferences
- ❌ Make it personal
- ❌ Assume malice
- ❌ Demand perfection

---

## Examples

### Example 1: Security Issue

❌ **Problem:**
```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

✅ **Solution:**
```javascript
const query = `SELECT * FROM users WHERE id = ?`;
db.query(query, [userId]);
```

**Feedback:** "This code is vulnerable to SQL injection. Please use parameterized queries."

### Example 2: Performance Issue

❌ **Problem:**
```javascript
for (const user of users) {
  user.posts = await fetchPosts(user.id); // N+1 query
}
```

✅ **Solution:**
```javascript
const userIds = users.map(u => u.id);
const posts = await fetchPostsByUserIds(userIds);
// Map posts to users
```

**Feedback:** "This creates an N+1 query problem. Consider fetching all posts in one query."

### Example 3: Readability Issue

❌ **Problem:**
```javascript
function p(u) {
  return u.a && u.b && u.c;
}
```

✅ **Solution:**
```javascript
function isUserProfileComplete(user) {
  return user.hasName && user.hasEmail && user.hasPhone;
}
```

**Feedback:** "Please use descriptive names to improve readability."

---

## Summary

Code review is about:
1. **Ensuring correctness** - Code works as intended
2. **Maintaining security** - No vulnerabilities
3. **Preserving quality** - Readable and maintainable
4. **Sharing knowledge** - Learning opportunity
5. **Building trust** - Collaborative process

Remember: The goal is to ship high-quality code, not to find fault. Be constructive, be kind, and focus on continuous improvement.
