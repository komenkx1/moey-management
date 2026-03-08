# Security Hardening Phase 1 - Implementation Tasks

## Overview

This task list implements fixes for six critical security vulnerabilities using the exploratory bugfix workflow. Tasks are ordered to follow the bug condition methodology: explore bugs first, write preservation tests, then implement fixes with validation.

## Prerequisites

- Run `nvm use 22` before executing any npm commands
- Ensure development environment is set up with all dependencies installed
- Have access to `.env.local` for testing (do not commit this file)

---

## Phase 1: Bug Condition Exploration Tests

### Task 1: Write Bug Condition Exploration Tests

- [x] 1. Write bug condition exploration tests for all six vulnerabilities
  - **Property 1: Bug Condition** - Security Vulnerabilities Demonstration
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected secure behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each vulnerability exists
  - Create test file: `apps/web/tests/unit/security/bug-condition-exploration.test.ts`
  - Test 1: Credential Exposure - Verify `.env.local` can be staged by git (demonstrates missing .gitignore rule)
  - Test 2: Unencrypted Storage - Verify localStorage contains plain JSON for user data (demonstrates no encryption)
  - Test 3: Large CSV DoS - Verify 15MB CSV file is not rejected (demonstrates missing file size validation)
  - Test 4: High Row Count DoS - Verify 50,000 row CSV is not rejected (demonstrates missing row count validation)
  - Test 5: Production Logging - Verify console logs appear in production build (demonstrates missing environment checks)
  - Test 6: Invalid Split - Verify mismatched split totals can be saved (demonstrates missing validation)
  - Run tests on UNFIXED code using: `cd apps/web && nvm use 22 && npm test -- bug-condition-exploration.test.ts`
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found for each vulnerability
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

---

## Phase 2: Preservation Property Tests

### Task 2: Write Preservation Property Tests

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Existing Functionality Protection
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file: `apps/web/tests/unit/security/preservation.test.ts`
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Environment variables are read correctly in development
    - Store data is accessible with current API
    - Valid CSVs (<10MB, <10k rows) import successfully
    - Development builds log errors to console
    - Valid split transactions (sum = total) save successfully
    - Non-sensitive operations perform normally
  - Write property-based tests capturing observed behavior patterns:
    - Property: Development environment reads `.env.local` correctly
    - Property: Store API returns correct data structure for all valid states
    - Property: Valid CSV files produce identical import results
    - Property: Development console logging works for all error types
    - Property: Balanced split transactions save without errors
    - Property: Encryption overhead < 5ms for typical operations
  - Run tests on UNFIXED code using: `cd apps/web && nvm use 22 && npm test -- preservation.test.ts`
  - **EXPECTED OUTCOME**: All tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Phase 3: Implementation

### Task 3: Fix Security Vulnerabilities

- [x] 3. Implement security hardening fixes

  - [x] 3.1 Fix Bug 1: Add .gitignore rule for .env.local
    - Open `.gitignore` in root directory
    - Add `.env.local` to the file if not already present
    - Verify `.env.local.example` is NOT ignored (template should be committed)
    - Test: Run `git add .env.local` and verify file is ignored
    - _Bug_Condition: isBugCondition1(repoState) where fileExists('.env.local') AND NOT isIgnoredByGit('.env.local')_
    - _Expected_Behavior: Git configuration SHALL exclude .env.local from version control_
    - _Preservation: Environment variables must continue to be read from .env.local during development_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Fix Bug 2: Implement encrypted localStorage
    - Create new file: `apps/web/src/lib/crypto.ts`
    - Install crypto-js: `cd apps/web && nvm use 22 && npm install crypto-js && npm install --save-dev @types/crypto-js`
    - Implement `encrypt(data: string, key: string): string` using AES-256
    - Implement `decrypt(ciphertext: string, key: string): string | null` with error handling
    - Implement `deriveEncryptionKey(userId: string): string` using SHA-256 hash
    - Update `apps/web/src/store/use-kemana-store.ts`:
      - Replace `createJSONStorage(() => localStorage)` with custom encrypted storage adapter
      - Implement storage adapter with `getItem`, `setItem`, `removeItem` methods
      - `getItem`: Read from localStorage → decrypt → parse JSON
      - `setItem`: Stringify JSON → encrypt → write to localStorage
      - Use anonymous key for logged-out users, user-specific key for authenticated users
    - Maintain exact same store API (no breaking changes to `useKemanaStore` interface)
    - Test: Set userName in store, verify localStorage contains encrypted data (starts with "U2FsdGVkX1")
    - Test: Retrieve userName from store, verify decryption works correctly
    - _Bug_Condition: isBugCondition2(storageOperation) where containsSensitiveData AND NOT isEncrypted_
    - _Expected_Behavior: localStorage write operations SHALL encrypt data using AES-256_
    - _Preservation: Components reading store data must receive same data structure and API_
    - _Requirements: 2.2, 3.2_

  - [x] 3.3 Fix Bug 3 & 4: Add CSV import validation
    - Update `apps/web/src/lib/dashboard-page-entry-utils.ts`:
      - Add `fileSize: number` parameter to `importEntriesFromCsv` function
      - Add file size validation before parsing: `if (fileSize > 10_485_760) return { ok: false, message: "File terlalu besar. Maksimal 10MB." }`
      - Modify `parseCsvRows` to accept optional `maxRows: number` parameter (default: 10,000)
      - Add row count validation during parsing: count rows and reject if exceeds maxRows
      - Return error: `{ ok: false, message: "File terlalu banyak baris. Maksimal 10,000 baris." }`
    - Update component that handles CSV file input (likely `apps/web/src/components/kemana-ui/DataToolsSheet.tsx`):
      - Extract `file.size` from File object before reading
      - Pass `fileSize` parameter when calling `importEntriesFromCsv`
    - Test: Import 15MB CSV, verify rejection with error message
    - Test: Import CSV with 50,000 rows, verify rejection with error message
    - Test: Import valid 5MB CSV with 5,000 rows, verify successful import
    - _Bug_Condition: isBugCondition3(csvImport) where file.size > 10MB OR rowCount > 10,000_
    - _Expected_Behavior: Import function SHALL reject oversized files before parsing_
    - _Preservation: Valid CSV files (<10MB, <10k rows) must process identically_
    - _Requirements: 2.3, 2.4, 3.3_

  - [x] 3.4 Fix Bug 5: Remove production console logs
    - Update `apps/web/src/lib/supabase.ts`:
      - Wrap `console.warn` in `if (process.env.NODE_ENV !== 'production')` check
    - Update `apps/web/src/hooks/useAuth.ts`:
      - Wrap all `console.log`, `console.error`, `console.warn` calls in `if (process.env.NODE_ENV !== 'production')` checks
      - Approximately 15 console statements to gate
    - Test: Build production bundle: `cd apps/web && nvm use 22 && npm run build`
    - Test: Start production server and trigger auth error, verify no console output
    - Test: Run development build and trigger auth error, verify console logs appear
    - _Bug_Condition: isBugCondition5(logOperation) where environment == 'production' AND isConsoleLog_
    - _Expected_Behavior: Production builds SHALL not log to browser console_
    - _Preservation: Development builds must continue logging for debugging_
    - _Requirements: 2.5, 3.4_

  - [x] 3.5 Fix Bug 6: Add split transaction validation
    - Update `apps/web/src/components/kemana-ui/SmartSplitCalculator.tsx`:
      - Create validation function: `validateSplitTotal(totalAmount: number, shares: Array<{amount: number}>): boolean`
      - Calculate sum of shares: `const sum = shares.reduce((acc, s) => acc + s.amount, 0)`
      - Check tolerance: `return Math.abs(sum - totalAmount) <= 1`
      - Add validation before `onSharesCalculated` call
      - Display error toast if validation fails: "Total pembagian tidak sesuai. Selisih: Rp {difference}"
      - Prevent save operation when validation fails
    - Test: Create split with total 100,000 and shares [60,000, 30,000], verify validation error
    - Test: Create split with total 100,000 and shares [50,000, 50,000], verify successful save
    - Test: Create split with total 100,000 and shares [33,333, 33,333, 33,334], verify successful save (within tolerance)
    - _Bug_Condition: isBugCondition6(splitTransaction) where ABS(sumOfShares - totalAmount) > 1_
    - _Expected_Behavior: Calculator SHALL reject splits with mismatched totals_
    - _Preservation: Valid split transactions (sum = total) must save without errors_
    - _Requirements: 2.6, 3.5_

  - [x] 3.6 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Security Vulnerabilities Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected secure behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run: `cd apps/web && nvm use 22 && npm test -- bug-condition-exploration.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms bugs are fixed)
    - Verify each fix:
      - Test 1: `.env.local` is now ignored by git
      - Test 2: localStorage now contains encrypted data
      - Test 3: Large CSV files are now rejected
      - Test 4: High row count CSVs are now rejected
      - Test 5: Production builds no longer log to console
      - Test 6: Invalid split transactions are now rejected
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run: `cd apps/web && nvm use 22 && npm test -- preservation.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Verify all preservation properties:
      - Development environment still reads `.env.local` correctly
      - Store API still provides same data structure
      - Valid CSV files still import successfully
      - Development console logging still works
      - Valid split transactions still save successfully
      - Performance is within acceptable bounds
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Phase 4: Comprehensive Testing

### Task 4: Run Full Test Suite

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full unit test suite: `cd apps/web && nvm use 22 && npm test`
  - Run E2E tests: `cd apps/web && nvm use 22 && npm run test:e2e`
  - Verify no test failures or regressions
  - If any tests fail, investigate and fix before proceeding
  - Ask user if questions arise about test failures

---

## Phase 5: Manual Verification

### Task 5: Manual Security Verification

- [x] 5. Perform manual security verification
  - **Git Ignore Verification**:
    - Create test `.env.local` with mock credentials
    - Run `git status` and verify file is not listed
    - Run `git add .env.local` and verify git ignores it
  - **Encryption Verification**:
    - Sign in to the app
    - Set user preferences (userName, dateFilter)
    - Open DevTools → Application → localStorage
    - Verify `kemana.ui.zustand.v1` value starts with "U2FsdGVkX1" (encrypted)
    - Verify plain text data is NOT visible in localStorage
    - Refresh page and verify preferences persist correctly
  - **CSV Validation Verification**:
    - Generate or obtain a 15MB CSV file
    - Attempt import through DataToolsSheet
    - Verify error message: "File terlalu besar. Maksimal 10MB."
    - Generate CSV with 15,000 rows
    - Attempt import and verify error message: "File terlalu banyak baris. Maksimal 10,000 baris."
    - Import valid 5MB CSV with 5,000 rows and verify success
  - **Production Logging Verification**:
    - Build production bundle: `cd apps/web && nvm use 22 && npm run build`
    - Start production server: `cd apps/web && npm start`
    - Open DevTools → Console
    - Trigger various operations (auth, sync, errors)
    - Verify NO console output appears
    - Stop production server and run dev build: `npm run dev`
    - Trigger same operations and verify console logs appear in development
  - **Split Validation Verification**:
    - Open SmartSplitCalculator with total: 100,000
    - Set shares: Person A: 60,000, Person B: 30,000
    - Attempt save and verify error toast appears
    - Set shares: Person A: 50,000, Person B: 50,000
    - Verify save succeeds without error
  - Document any issues found and report to user

---

## Phase 6: Production Build Verification

### Task 6: Production Build Testing

- [x] 6. Verify production build integrity
  - Clean build artifacts: `cd apps/web && nvm use 22 && npm run clean` (if clean script exists, otherwise `rm -rf .next`)
  - Build production bundle: `npm run build`
  - Verify build completes without errors
  - Check build output for any warnings about console logs
  - Start production server: `npm start`
  - Test critical user flows:
    - Sign in / sign out
    - Create expense entry
    - Import valid CSV
    - Create split transaction
    - View dashboard and insights
  - Verify all flows work correctly
  - Stop production server

---

## Phase 7: Documentation

### Task 7: Update Documentation

- [x] 7. Update project documentation
  - Update `README.md` if needed to document:
    - Security features (encrypted localStorage)
    - CSV import limits (10MB, 10k rows)
    - Environment variable handling
  - Create or update `.env.local.example` with placeholder values
  - Add comments in code explaining security measures:
    - Encryption key derivation strategy
    - CSV validation limits rationale
    - Production logging suppression
  - Document any breaking changes (should be none for this bugfix)

---

## Notes

- **Critical**: Always run `nvm use 22` before npm commands
- **Testing**: Run tests after each implementation task to catch issues early
- **Encryption**: The encryption key is derived from user ID, so it's consistent across sessions
- **CSV Limits**: 10MB and 10k rows are reasonable limits for browser-based processing
- **Console Logs**: Only suppressed in production; development logging is preserved
- **Split Validation**: ±1 tolerance accounts for floating-point rounding errors
- **No Breaking Changes**: All fixes maintain backward compatibility with existing code

---

## Success Criteria

All tasks are complete when:
- [ ] All bug condition exploration tests pass (bugs are fixed)
- [ ] All preservation tests pass (no regressions)
- [ ] Full test suite passes without failures
- [ ] Manual verification confirms all six vulnerabilities are fixed
- [ ] Production build completes successfully with no console logs
- [ ] Documentation is updated
- [ ] User confirms all security requirements are met
