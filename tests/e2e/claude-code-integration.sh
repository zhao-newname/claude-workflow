#!/bin/bash
set -e

# Claude Workflow - End-to-End Integration Test
# Tests the complete workflow from init to Claude Code integration

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Claude Workflow - End-to-End Integration Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${GREEN}✓${NC} $1"
}

fail_test() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${RED}✗${NC} $1"
    echo -e "${RED}  Error: $2${NC}"
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${YELLOW}━━━ $1 ━━━${NC}"
    echo ""
}

# Configuration
TEST_DIR="/tmp/cw-e2e-test-$(date +%s)"
CW_BIN="$(pwd)/dist/cli/index.mjs"

# Check if cw is built
if [ ! -f "$CW_BIN" ]; then
    echo -e "${RED}Error: cw CLI not found at $CW_BIN${NC}"
    echo "Please run: npm run build"
    exit 1
fi

# ============================================================================
# Phase 1: Project Setup
# ============================================================================

section "Phase 1: Project Setup"

info "Creating test project at $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create a minimal Node.js project
npm init -y > /dev/null 2>&1
if [ $? -eq 0 ]; then
    pass_test "Created test project"
else
    fail_test "Failed to create test project" "npm init failed"
    exit 1
fi

# Create some test files to make it look like a real project
mkdir -p src tests
cat > src/index.ts <<EOF
export function hello(name: string): string {
    return \`Hello, \${name}!\`;
}
EOF

cat > tests/index.test.ts <<EOF
import { hello } from '../src/index';

describe('hello', () => {
    it('should greet by name', () => {
        expect(hello('World')).toBe('Hello, World!');
    });
});
EOF

pass_test "Created test source files"

# ============================================================================
# Phase 2: CW Initialization
# ============================================================================

section "Phase 2: CW Initialization"

info "Running: cw init --yes"
node "$CW_BIN" init --yes

# Verify .claude directory structure
if [ -d ".claude" ]; then
    pass_test ".claude directory created"
else
    fail_test ".claude directory not created" "Expected .claude/ to exist"
fi

# Verify settings.json
if [ -f ".claude/settings.json" ]; then
    pass_test ".claude/settings.json created"

    # Check if hooks are registered
    if grep -q "skill-activation-prompt" ".claude/settings.json"; then
        pass_test "skill-activation-prompt hook registered"
    else
        fail_test "skill-activation-prompt hook not registered" "Hook not found in settings.json"
    fi
else
    fail_test ".claude/settings.json not created" "Expected .claude/settings.json to exist"
fi

# Verify hooks directory
if [ -d ".claude/hooks" ]; then
    pass_test ".claude/hooks directory created"

    # Check for hook files
    if [ -f ".claude/hooks/skill-activation-prompt.ts" ]; then
        pass_test "skill-activation-prompt.ts exists"
    else
        fail_test "skill-activation-prompt.ts not found" "Expected hook file to exist"
    fi

    if [ -f ".claude/hooks/post-tool-use-tracker.sh" ]; then
        pass_test "post-tool-use-tracker.sh exists"
    else
        fail_test "post-tool-use-tracker.sh not found" "Expected hook file to exist"
    fi
else
    fail_test ".claude/hooks directory not created" "Expected .claude/hooks/ to exist"
fi

# Verify skills directory
if [ -d ".claude/skills" ]; then
    pass_test ".claude/skills directory created"

    if [ -f ".claude/skills/skill-rules.json" ]; then
        pass_test "skill-rules.json created"
    else
        fail_test "skill-rules.json not created" "Expected .claude/skills/skill-rules.json to exist"
    fi
else
    fail_test ".claude/skills directory not created" "Expected .claude/skills/ to exist"
fi

# Verify commands directory
if [ -d ".claude/commands" ]; then
    pass_test ".claude/commands directory created"

    if [ -f ".claude/commands/dev-docs.md" ]; then
        pass_test "dev-docs.md command exists"
    else
        fail_test "dev-docs.md not found" "Expected /dev-docs command to exist"
    fi

    if [ -f ".claude/commands/dev-docs-update.md" ]; then
        pass_test "dev-docs-update.md command exists"
    else
        fail_test "dev-docs-update.md not found" "Expected /dev-docs-update command to exist"
    fi
else
    fail_test ".claude/commands directory not created" "Expected .claude/commands/ to exist"
fi

# ============================================================================
# Phase 3: Skills Verification
# ============================================================================

section "Phase 3: Skills Verification"

info "Running: cw skills list"
SKILLS_OUTPUT=$(node "$CW_BIN" skills list 2>&1)

# Check if skills are listed
if echo "$SKILLS_OUTPUT" | grep -q "skill-developer"; then
    pass_test "skill-developer found in skills list"
else
    fail_test "skill-developer not found" "Expected skill-developer in output"
fi

# Count skills
SKILLS_COUNT=$(echo "$SKILLS_OUTPUT" | grep -c "✓" || echo "0")
if [ "$SKILLS_COUNT" -ge 1 ]; then
    pass_test "At least 1 skill available (found $SKILLS_COUNT)"
else
    fail_test "No skills found" "Expected at least 1 skill"
fi

# ============================================================================
# Phase 4: Hook Execution Test
# ============================================================================

section "Phase 4: Hook Execution Test"

info "Testing skill-activation-prompt hook"

# Create test input for hook
TEST_PROMPT='{"session_id":"test","cwd":"'$TEST_DIR'","prompt":"help me review this code"}'

# Test hook execution
if [ -f ".claude/hooks/skill-activation-prompt.ts" ]; then
    # Check if hook is executable (TypeScript needs to be compiled or run with tsx)
    if command -v tsx &> /dev/null; then
        HOOK_OUTPUT=$(echo "$TEST_PROMPT" | tsx .claude/hooks/skill-activation-prompt.ts 2>&1 || echo "")

        if [ -n "$HOOK_OUTPUT" ]; then
            pass_test "Hook executed successfully"

            # Check if hook suggests relevant skills
            if echo "$HOOK_OUTPUT" | grep -qi "skill"; then
                pass_test "Hook suggests skills"
            else
                info "Hook output: $HOOK_OUTPUT"
                fail_test "Hook doesn't suggest skills" "Expected skill suggestions in output"
            fi
        else
            fail_test "Hook execution failed" "No output from hook"
        fi
    else
        info "tsx not available, skipping hook execution test"
        info "Install tsx with: npm install -g tsx"
    fi
else
    fail_test "Hook file not found" "Cannot test hook execution"
fi

# ============================================================================
# Phase 5: Dev Docs Structure
# ============================================================================

section "Phase 5: Dev Docs Structure"

info "Verifying dev/ directory structure"

if [ -d "dev" ]; then
    pass_test "dev/ directory exists"

    if [ -f "dev/README.md" ]; then
        pass_test "dev/README.md exists"

        # Check if README contains key sections
        if grep -q "Dev Docs Pattern" "dev/README.md"; then
            pass_test "dev/README.md contains Dev Docs Pattern documentation"
        else
            fail_test "dev/README.md incomplete" "Missing Dev Docs Pattern section"
        fi
    else
        fail_test "dev/README.md not found" "Expected dev/README.md to exist"
    fi

    if [ -d "dev/active" ]; then
        pass_test "dev/active/ directory exists"
    else
        fail_test "dev/active/ directory not found" "Expected dev/active/ to exist"
    fi
else
    fail_test "dev/ directory not created" "Expected dev/ directory to exist"
fi

# ============================================================================
# Phase 6: Configuration Validation
# ============================================================================

section "Phase 6: Configuration Validation"

info "Validating configuration files"

# Validate settings.json
if [ -f ".claude/settings.json" ]; then
    if python3 -m json.tool .claude/settings.json > /dev/null 2>&1; then
        pass_test "settings.json is valid JSON"
    else
        fail_test "settings.json is invalid JSON" "JSON parsing failed"
    fi
fi

# Validate skill-rules.json
if [ -f ".claude/skills/skill-rules.json" ]; then
    if python3 -m json.tool .claude/skills/skill-rules.json > /dev/null 2>&1; then
        pass_test "skill-rules.json is valid JSON"
    else
        fail_test "skill-rules.json is invalid JSON" "JSON parsing failed"
    fi
fi

# ============================================================================
# Test Summary
# ============================================================================

section "Test Summary"

echo ""
echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

# Calculate success rate
if [ $TESTS_TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""
echo "Test project location: $TEST_DIR"
echo ""

# Cleanup prompt
read -p "Delete test project? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd /
    rm -rf "$TEST_DIR"
    echo "Test project deleted"
else
    echo "Test project preserved at: $TEST_DIR"
    echo "You can manually test in Claude Code by running:"
    echo "  cd $TEST_DIR"
    echo "  claude"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
