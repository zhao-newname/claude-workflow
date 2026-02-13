# Security Patterns

Essential security patterns and vulnerabilities to check during code review.

## OWASP Top 10 Quick Reference

### 1. Injection (SQL, NoSQL, Command)

**Vulnerability:**
```javascript
// SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Command Injection
exec(`ping ${userInput}`);
```

**Fix:**
```javascript
// Use parameterized queries
const query = `SELECT * FROM users WHERE id = ?`;
db.query(query, [userId]);

// Validate and sanitize input
const sanitizedInput = validator.escape(userInput);
```

---

### 2. Broken Authentication

**Check for:**
- [ ] Weak password requirements
- [ ] No rate limiting on login
- [ ] Session tokens in URLs
- [ ] No session timeout
- [ ] Predictable session IDs

**Best Practices:**
- Use strong password policies
- Implement rate limiting
- Use secure session management
- Implement MFA where appropriate
- Use HTTPS only

---

### 3. Sensitive Data Exposure

**Vulnerability:**
```javascript
// Logging sensitive data
logger.info(`User login: ${email}, password: ${password}`);

// Storing passwords in plain text
db.users.create({ email, password });
```

**Fix:**
```javascript
// Don't log sensitive data
logger.info(`User login: ${email}`);

// Hash passwords
const hashedPassword = await bcrypt.hash(password, 10);
db.users.create({ email, password: hashedPassword });
```

---

### 4. XML External Entities (XXE)

**Vulnerability:**
```javascript
// Parsing XML without disabling external entities
const parser = new XMLParser();
const data = parser.parse(userXML);
```

**Fix:**
```javascript
// Disable external entities
const parser = new XMLParser({
  resolveExternalEntities: false
});
```

---

### 5. Broken Access Control

**Vulnerability:**
```javascript
// No authorization check
app.delete('/users/:id', async (req, res) => {
  await User.delete(req.params.id);
});
```

**Fix:**
```javascript
// Check authorization
app.delete('/users/:id', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await User.delete(req.params.id);
});
```

---

### 6. Security Misconfiguration

**Check for:**
- [ ] Default credentials
- [ ] Unnecessary features enabled
- [ ] Detailed error messages in production
- [ ] Missing security headers
- [ ] Outdated software

**Best Practices:**
```javascript
// Set security headers
app.use(helmet());

// Hide detailed errors in production
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });
}
```

---

### 7. Cross-Site Scripting (XSS)

**Vulnerability:**
```javascript
// Directly inserting user input
element.innerHTML = userInput;
```

**Fix:**
```javascript
// Use textContent or sanitize
element.textContent = userInput;
// Or
element.innerHTML = DOMPurify.sanitize(userInput);
```

---

### 8. Insecure Deserialization

**Vulnerability:**
```javascript
// Deserializing untrusted data
const obj = JSON.parse(userInput);
eval(obj.code); // Never do this!
```

**Fix:**
```javascript
// Validate before deserializing
const schema = Joi.object({
  // Define expected structure
});
const { error, value } = schema.validate(JSON.parse(userInput));
```

---

### 9. Using Components with Known Vulnerabilities

**Check:**
```bash
# Check for vulnerable dependencies
npm audit

# Update dependencies
npm update
```

---

### 10. Insufficient Logging & Monitoring

**Best Practices:**
```javascript
// Log security events
logger.warn('Failed login attempt', {
  email,
  ip: req.ip,
  timestamp: new Date()
});

// Log access to sensitive data
logger.info('User accessed sensitive data', {
  userId,
  resource,
  timestamp: new Date()
});
```

---

## Additional Security Checks

### API Security
- [ ] Rate limiting implemented
- [ ] API keys rotated regularly
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] Authentication required

### Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit (HTTPS)
- [ ] Secure key management
- [ ] Data minimization
- [ ] Secure deletion

### Authentication & Authorization
- [ ] Strong password policy
- [ ] MFA available
- [ ] Session management secure
- [ ] Authorization checks on all resources
- [ ] Principle of least privilege

---

## Security Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Output encoding applied
- [ ] Authentication required
- [ ] Authorization checked
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] Dependencies up to date
- [ ] Logging implemented
- [ ] Error handling secure

---

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- CWE Top 25: https://cwe.mitre.org/top25/
