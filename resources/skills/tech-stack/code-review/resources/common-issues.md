# Common Code Review Issues

This document catalogs frequently found issues during code reviews with examples and solutions.

## Security Issues

### 1. Hardcoded Secrets

❌ **Bad:**
```javascript
const API_KEY = "sk-1234567890abcdef";
const DB_PASSWORD = "mypassword123";
```

✅ **Good:**
```javascript
const API_KEY = process.env.API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;
```

**Why:** Hardcoded secrets can be exposed in version control, logs, or error messages.

---

### 2. SQL Injection

❌ **Bad:**
```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);
```

✅ **Good:**
```javascript
const query = `SELECT * FROM users WHERE id = ?`;
db.query(query, [userId]);
```

**Why:** User input can contain malicious SQL code.

---

### 3. XSS (Cross-Site Scripting)

❌ **Bad:**
```javascript
element.innerHTML = userInput;
```

✅ **Good:**
```javascript
element.textContent = userInput;
// Or use a sanitization library
element.innerHTML = DOMPurify.sanitize(userInput);
```

**Why:** User input can contain malicious JavaScript.

---

### 4. Missing Input Validation

❌ **Bad:**
```javascript
function updateUser(userId, data) {
  return db.users.update(userId, data);
}
```

✅ **Good:**
```javascript
function updateUser(userId, data) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID');
  }
  const validatedData = validateUserData(data);
  return db.users.update(userId, validatedData);
}
```

**Why:** Unvalidated input can cause security issues or data corruption.

---

## Performance Issues

### 5. N+1 Query Problem

❌ **Bad:**
```javascript
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findByUserId(user.id); // N queries
}
```

✅ **Good:**
```javascript
const users = await User.findAll({
  include: [Post] // 1 query with JOIN
});
```

**Why:** Makes N+1 database queries instead of 1, causing severe performance issues.

---

### 6. Missing Database Indexes

❌ **Bad:**
```sql
-- Frequently queried column without index
SELECT * FROM users WHERE email = 'user@example.com';
```

✅ **Good:**
```sql
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
```

**Why:** Queries without indexes perform full table scans.

---

### 7. Inefficient Loops

❌ **Bad:**
```javascript
for (let i = 0; i < array.length; i++) {
  if (array[i].id === targetId) {
    return array[i];
  }
}
```

✅ **Good:**
```javascript
const map = new Map(array.map(item => [item.id, item]));
return map.get(targetId);
```

**Why:** O(n) lookup vs O(1) with proper data structure.

---

### 8. Unnecessary API Calls

❌ **Bad:**
```javascript
function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser); // Fetches on every render
  });
}
```

✅ **Good:**
```javascript
function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []); // Only fetch once
}
```

**Why:** Unnecessary API calls waste resources and slow down the app.

---

## Code Quality Issues

### 9. Magic Numbers

❌ **Bad:**
```javascript
if (status === 3) {
  // What does 3 mean?
}

setTimeout(callback, 86400000); // What is this number?
```

✅ **Good:**
```javascript
const STATUS_ACTIVE = 3;
if (status === STATUS_ACTIVE) {
  // Clear meaning
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(callback, ONE_DAY_MS);
```

**Why:** Magic numbers are hard to understand and maintain.

---

### 10. Poor Variable Names

❌ **Bad:**
```javascript
function p(u) {
  const x = u.a;
  const y = u.b;
  return x && y;
}
```

✅ **Good:**
```javascript
function isUserProfileComplete(user) {
  const hasName = user.name;
  const hasEmail = user.email;
  return hasName && hasEmail;
}
```

**Why:** Clear names make code self-documenting.

---

### 11. Functions Too Long

❌ **Bad:**
```javascript
function processOrder(order) {
  // 200 lines of code doing everything
  // validation, calculation, database updates,
  // email sending, logging, etc.
}
```

✅ **Good:**
```javascript
function processOrder(order) {
  validateOrder(order);
  const total = calculateTotal(order);
  updateDatabase(order, total);
  sendConfirmationEmail(order);
  logOrderProcessed(order);
}
```

**Why:** Small functions are easier to understand, test, and maintain.

---

### 12. Code Duplication

❌ **Bad:**
```javascript
function getUserById(id) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found');
  return user;
}

function getPostById(id) {
  const post = await db.query('SELECT * FROM posts WHERE id = ?', [id]);
  if (!post) throw new Error('Post not found');
  return post;
}
```

✅ **Good:**
```javascript
function getEntityById(table, id, entityName) {
  const entity = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!entity) throw new Error(`${entityName} not found`);
  return entity;
}

const getUserById = (id) => getEntityById('users', id, 'User');
const getPostById = (id) => getEntityById('posts', id, 'Post');
```

**Why:** DRY (Don't Repeat Yourself) principle reduces maintenance burden.

---

## Error Handling Issues

### 13. Swallowing Errors

❌ **Bad:**
```javascript
try {
  await riskyOperation();
} catch (error) {
  // Silent failure
}
```

✅ **Good:**
```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Risky operation failed', { error, context });
  throw error; // Or handle appropriately
}
```

**Why:** Silent failures make debugging impossible.

---

### 14. Generic Error Messages

❌ **Bad:**
```javascript
throw new Error('Error');
throw new Error('Something went wrong');
```

✅ **Good:**
```javascript
throw new Error(`Failed to update user ${userId}: ${reason}`);
throw new ValidationError('Email must be a valid email address');
```

**Why:** Specific error messages help with debugging.

---

### 15. Not Cleaning Up Resources

❌ **Bad:**
```javascript
const file = await fs.open('data.txt');
const data = await file.read();
// File never closed
return data;
```

✅ **Good:**
```javascript
const file = await fs.open('data.txt');
try {
  const data = await file.read();
  return data;
} finally {
  await file.close();
}
```

**Why:** Resource leaks can cause system issues.

---

## Testing Issues

### 16. No Tests for Critical Code

❌ **Bad:**
```javascript
// Payment processing function with no tests
function processPayment(amount, cardToken) {
  // Critical business logic
}
```

✅ **Good:**
```javascript
function processPayment(amount, cardToken) {
  // Critical business logic
}

// tests/payment.test.js
describe('processPayment', () => {
  it('should process valid payment', () => {
    // Test implementation
  });

  it('should reject invalid card', () => {
    // Test implementation
  });
});
```

**Why:** Critical code must be tested to prevent bugs in production.

---

### 17. Tests That Don't Test Anything

❌ **Bad:**
```javascript
it('should work', () => {
  const result = myFunction();
  expect(result).toBeDefined();
});
```

✅ **Good:**
```javascript
it('should return sum of two numbers', () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
```

**Why:** Tests should verify specific behavior.

---

## Architecture Issues

### 18. God Objects/Functions

❌ **Bad:**
```javascript
class UserManager {
  createUser() { }
  deleteUser() { }
  sendEmail() { }
  processPayment() { }
  generateReport() { }
  // 50 more methods...
}
```

✅ **Good:**
```javascript
class UserService {
  createUser() { }
  deleteUser() { }
}

class EmailService {
  sendEmail() { }
}

class PaymentService {
  processPayment() { }
}
```

**Why:** Single Responsibility Principle - each class should do one thing.

---

### 19. Tight Coupling

❌ **Bad:**
```javascript
class OrderService {
  processOrder(order) {
    const db = new MySQLDatabase(); // Tightly coupled
    db.save(order);
  }
}
```

✅ **Good:**
```javascript
class OrderService {
  constructor(database) {
    this.database = database; // Dependency injection
  }

  processOrder(order) {
    this.database.save(order);
  }
}
```

**Why:** Loose coupling makes code more testable and flexible.

---

### 20. Premature Optimization

❌ **Bad:**
```javascript
// Overly complex optimization without profiling
function complexOptimization() {
  // 100 lines of micro-optimizations
  // that make code unreadable
}
```

✅ **Good:**
```javascript
// Simple, readable code
function simpleImplementation() {
  // Clear, straightforward logic
}

// Optimize only if profiling shows it's needed
```

**Why:** "Premature optimization is the root of all evil" - Donald Knuth

---

## Summary

Common themes in code review issues:
1. **Security** - Always validate input and protect sensitive data
2. **Performance** - Avoid N+1 queries and use appropriate data structures
3. **Readability** - Use clear names and keep functions small
4. **Error Handling** - Never swallow errors, always log and handle properly
5. **Testing** - Critical code must have tests
6. **Architecture** - Follow SOLID principles and avoid tight coupling

Remember: These are patterns to watch for, not absolute rules. Context matters!
