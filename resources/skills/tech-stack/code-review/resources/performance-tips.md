# Performance Tips

Performance optimization guidelines for code review.

## Database Performance

### 1. Avoid N+1 Queries

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

---

### 2. Use Indexes

```sql
-- Add index for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Composite index for multiple columns
CREATE INDEX idx_posts_user_status ON posts(user_id, status);
```

---

### 3. Limit Query Results

❌ **Bad:**
```javascript
const allUsers = await User.findAll(); // Could be millions
```

✅ **Good:**
```javascript
const users = await User.findAll({
  limit: 100,
  offset: page * 100
});
```

---

### 4. Use Connection Pooling

```javascript
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Algorithm & Data Structure

### 5. Choose Right Data Structure

❌ **Bad:**
```javascript
// O(n) lookup
const user = users.find(u => u.id === targetId);
```

✅ **Good:**
```javascript
// O(1) lookup
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(targetId);
```

---

### 6. Avoid Nested Loops

❌ **Bad:**
```javascript
// O(n²)
for (const user of users) {
  for (const post of posts) {
    if (post.userId === user.id) {
      user.posts.push(post);
    }
  }
}
```

✅ **Good:**
```javascript
// O(n)
const postsByUser = posts.reduce((acc, post) => {
  if (!acc[post.userId]) acc[post.userId] = [];
  acc[post.userId].push(post);
  return acc;
}, {});

users.forEach(user => {
  user.posts = postsByUser[user.id] || [];
});
```

---

## Caching

### 7. Cache Expensive Operations

```javascript
const cache = new Map();

async function getExpensiveData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await expensiveOperation(key);
  cache.set(key, data);
  return data;
}
```

---

### 8. Use Memoization

```javascript
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const expensiveFunction = memoize((n) => {
  // Expensive calculation
  return result;
});
```

---

## Frontend Performance

### 9. Lazy Loading

```javascript
// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Lazy load images
<img loading="lazy" src="image.jpg" />
```

---

### 10. Debounce/Throttle

```javascript
// Debounce search input
const debouncedSearch = debounce((query) => {
  searchAPI(query);
}, 300);

// Throttle scroll handler
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

---

## Memory Management

### 11. Avoid Memory Leaks

❌ **Bad:**
```javascript
// Event listener never removed
element.addEventListener('click', handler);
```

✅ **Good:**
```javascript
element.addEventListener('click', handler);
// Later...
element.removeEventListener('click', handler);
```

---

### 12. Stream Large Files

❌ **Bad:**
```javascript
// Loads entire file into memory
const data = await fs.readFile('large-file.txt');
```

✅ **Good:**
```javascript
// Streams file
const stream = fs.createReadStream('large-file.txt');
stream.pipe(response);
```

---

## Network Performance

### 13. Batch API Requests

❌ **Bad:**
```javascript
for (const id of ids) {
  await fetchUser(id); // N requests
}
```

✅ **Good:**
```javascript
const users = await fetchUsers(ids); // 1 request
```

---

### 14. Use Compression

```javascript
app.use(compression());
```

---

## Performance Checklist

- [ ] No N+1 queries
- [ ] Database indexes present
- [ ] Appropriate data structures
- [ ] Caching implemented
- [ ] No memory leaks
- [ ] Large files streamed
- [ ] API requests batched
- [ ] Compression enabled
- [ ] Lazy loading used
- [ ] Debounce/throttle applied

---

## When to Optimize

1. **Profile first** - Don't guess, measure
2. **Focus on bottlenecks** - 80/20 rule applies
3. **Maintain readability** - Don't sacrifice clarity
4. **Test performance** - Verify improvements

Remember: "Premature optimization is the root of all evil" - Donald Knuth
