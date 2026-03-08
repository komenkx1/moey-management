# Security Hardening Phase 1 Bugfix Design

## Overview

This design addresses six critical security vulnerabilities in the KeMana expense tracking application. The bugs span credential exposure, data privacy, input validation, production logging, and data integrity. The fix strategy employs defense-in-depth principles: preventing credential leaks through git configuration, encrypting sensitive localStorage data with AES-256, validating CSV inputs to prevent DoS attacks, removing production console logs, and enforcing split transaction validation. The implementation is minimal and surgical, targeting only the vulnerable code paths while preserving all existing functionality for valid inputs.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger each security vulnerability
- **Property (P)**: The desired secure behavior when the bug condition is met
- **Preservation**: Existing functionality that must remain unchanged (valid inputs, development logging, performance)
- **AES-256**: Advanced Encryption Standard with 256-bit key, industry-standard symmetric encryption
- **XSS**: Cross-Site Scripting attack where malicious scripts access localStorage
- **DoS**: Denial of Service attack that crashes the browser through resource exhaustion
- **localStorage**: Browser storage API that persists data across sessions (vulnerable to XSS)
- **Zustand persist middleware**: Library mechanism that automatically syncs store state to localStorage
- **CSV Parser**: Custom implementation in `dashboard-page-entry-utils.ts` that processes CSV rows
- **Split Transaction**: Expense shared among multiple people with individual share amounts
- **Rounding Tolerance**: ±1 unit allowance for floating-point arithmetic errors in split calculations

## Bug Details

### Bug Condition 1: Credential Exposure via Git

The bug manifests when `.env.local` containing Supabase credentials and OAuth keys exists in the workspace without proper git exclusion. The repository configuration allows sensitive environment files to be committed.

**Formal Specification:**
```
FUNCTION isBugCondition1(repoState)
  INPUT: repoState containing files and .gitignore rules
  OUTPUT: boolean
  
  RETURN fileExists('.env.local')
         AND containsSensitiveData('.env.local')
         AND NOT isIgnoredByGit('.env.local')
END FUNCTION
```

**Examples:**
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co` is committed → Credentials exposed in git history
- `.env.local` with `GOOGLE_CLIENT_SECRET=xxx` is committed → OAuth secrets leaked publicly
- `.env.local.example` template is committed → Safe, contains placeholder values only

### Bug Condition 2: Unencrypted localStorage

The bug manifests when user data (userName, preferences, dateFilter) is stored in localStorage without encryption. The Zustand persist middleware writes plain text JSON, making it vulnerable to XSS attacks.

**Formal Specification:**
```
FUNCTION isBugCondition2(storageOperation)
  INPUT: storageOperation with key, value, and encryption status
  OUTPUT: boolean
  
  RETURN storageOperation.key == 'kemana.ui.zustand.v1'
         AND containsSensitiveData(storageOperation.value)
         AND NOT isEncrypted(storageOperation.value)
END FUNCTION
```

**Examples:**
- `localStorage.setItem('kemana.ui.zustand.v1', '{"userName":"John"}')` → Plain text, XSS can read it
- `localStorage.setItem('kemana.ui.zustand.v1', 'U2FsdGVkX1...')` → Encrypted, XSS gets ciphertext only
- Session data in memory only → Safe, not persisted to vulnerable storage

### Bug Condition 3: CSV File Size DoS

The bug manifests when a CSV file larger than 10MB is imported. The `importEntriesFromCsv` function accepts files of any size, causing browser memory exhaustion and tab crashes.

**Formal Specification:**
```
FUNCTION isBugCondition3(csvImport)
  INPUT: csvImport with file object
  OUTPUT: boolean
  
  RETURN csvImport.file.size > 10_485_760  // 10MB in bytes
         AND NOT hasFileSizeValidation(csvImport)
END FUNCTION
```

**Examples:**
- 15MB CSV file imported → Browser tab crashes, data lost
- 5MB CSV file imported → Processes successfully
- 10.1MB CSV file imported → Should be rejected with friendly error message

### Bug Condition 4: CSV Row Count DoS

The bug manifests when a CSV file with more than 10,000 rows is imported. The parser processes unlimited rows, causing UI freezing and potential browser crashes.

**Formal Specification:**
```
FUNCTION isBugCondition4(csvImport)
  INPUT: csvImport with parsed row count
  OUTPUT: boolean
  
  RETURN csvImport.rowCount > 10_000
         AND NOT hasRowCountValidation(csvImport)
END FUNCTION
```

**Examples:**
- CSV with 50,000 rows imported → Browser freezes for 30+ seconds
- CSV with 5,000 rows imported → Processes smoothly
- CSV with 10,001 rows imported → Should be rejected before parsing

### Bug Condition 5: Production Console Logging

The bug manifests when authentication errors occur in production builds. The `supabase.ts` and `useAuth.ts` files log sensitive error details to the browser console, exposing internal implementation details.

**Formal Specification:**
```
FUNCTION isBugCondition5(logOperation)
  INPUT: logOperation with message and environment
  OUTPUT: boolean
  
  RETURN logOperation.environment == 'production'
         AND containsSensitiveInfo(logOperation.message)
         AND isConsoleLog(logOperation)
END FUNCTION
```

**Examples:**
- `console.error("Error getting session:", error)` in production → Exposes auth implementation details
- `console.log('🔄 Starting sync worker')` in production → Reveals sync architecture
- `console.warn('⚠️ Supabase URL missing')` in production → Exposes configuration issues
- Same logs in development → Acceptable, needed for debugging

### Bug Condition 6: Invalid Split Transaction Totals

The bug manifests when split transactions are created where the sum of shares does not equal the total amount. The `SmartSplitCalculator` allows saving splits like 100k split into 60k + 30k = 90k, causing data inconsistency.

**Formal Specification:**
```
FUNCTION isBugCondition6(splitTransaction)
  INPUT: splitTransaction with totalAmount and shares array
  OUTPUT: boolean
  
  LET sumOfShares = SUM(share.amount FOR share IN splitTransaction.shares)
  LET difference = ABS(sumOfShares - splitTransaction.totalAmount)
  
  RETURN difference > 1  // Allow ±1 rounding tolerance
         AND NOT hasValidationCheck(splitTransaction)
END FUNCTION
```

**Examples:**
- Total: 100,000, Shares: [60,000, 30,000] → Invalid, difference = 10,000
- Total: 100,000, Shares: [50,000, 50,000] → Valid, difference = 0
- Total: 100,000, Shares: [33,333, 33,333, 33,334] → Valid, difference = 0 (within tolerance)
- Total: 100,000, Shares: [33,333, 33,333, 33,333] → Valid, difference = 1 (within ±1 tolerance)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Environment variables must continue to be read from `.env.local` during development
- User data retrieved from localStorage must provide the same data structure and API to components
- Valid CSV files (<10MB, <10k rows) must process successfully with identical results
- Development builds must continue logging errors to console for debugging
- Split transactions with correct totals must save successfully without validation errors
- Non-sensitive operations must function normally without encryption overhead affecting performance
- Existing Zustand store API must remain unchanged (no breaking changes to `useKemanaStore` interface)
- CSV export functionality must remain unchanged
- Authentication flow must work identically for end users

**Scope:**
All inputs that do NOT trigger the six bug conditions should be completely unaffected by this fix. This includes:
- Valid environment file usage in development
- Non-sensitive data storage operations
- Small CSV imports with valid data
- Development environment logging
- Correctly balanced split transactions
- All other application features (habits, insights, dashboard, etc.)

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

1. **Missing Git Configuration**: The `.gitignore` file does not explicitly exclude `.env.local`, allowing developers to accidentally commit sensitive credentials. The repository was likely initialized without proper environment file exclusion rules.

2. **Unencrypted Zustand Persistence**: The `useKemanaStore` uses Zustand's `persist` middleware with default `createJSONStorage(() => localStorage)`, which stores data as plain JSON. No encryption layer was implemented, leaving user data vulnerable to XSS attacks that can read localStorage.

3. **Missing CSV Input Validation**: The `importEntriesFromCsv` function in `dashboard-page-entry-utils.ts` immediately calls `parseCsvRows(raw)` without checking file size or row count. The validation logic was never implemented, allowing arbitrarily large files to be processed.

4. **Unconditional Console Logging**: The `supabase.ts` and `useAuth.ts` files use `console.log`, `console.warn`, and `console.error` without environment checks. These logs were added during development and never gated behind `process.env.NODE_ENV !== 'production'` checks.

5. **Missing Split Validation**: The `SmartSplitCalculator` component calculates shares but does not validate that the sum equals the total before calling `onSharesCalculated`. The validation logic was assumed to exist elsewhere but was never implemented.

6. **Lack of Security Review**: The application was developed with a focus on functionality, and security hardening was deferred. No systematic security audit was performed before production deployment.

## Correctness Properties

Property 1: Bug Condition - Credential Protection

_For any_ repository state where `.env.local` exists with sensitive credentials, the fixed git configuration SHALL ensure the file is excluded from version control, preventing credential exposure in commit history.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Data Encryption

_For any_ localStorage write operation containing sensitive user data (userName, preferences), the fixed storage layer SHALL encrypt the data using AES-256 before persisting, protecting against XSS attacks.

**Validates: Requirements 2.2**

Property 3: Bug Condition - CSV File Size Validation

_For any_ CSV import where the file size exceeds 10MB, the fixed import function SHALL reject the file before parsing and display a user-friendly error message, preventing browser crashes.

**Validates: Requirements 2.3**

Property 4: Bug Condition - CSV Row Count Validation

_For any_ CSV import where the row count exceeds 10,000, the fixed import function SHALL reject the file during parsing and display a user-friendly error message, preventing UI freezing.

**Validates: Requirements 2.4**

Property 5: Bug Condition - Production Logging Suppression

_For any_ authentication error or sensitive operation in production builds, the fixed code SHALL not log any information to the browser console, preventing exposure of implementation details.

**Validates: Requirements 2.5**

Property 6: Bug Condition - Split Transaction Validation

_For any_ split transaction where the sum of shares differs from the total amount by more than ±1, the fixed calculator SHALL reject the split and display a validation error, preventing data inconsistency.

**Validates: Requirements 2.6**

Property 7: Preservation - Environment Variable Access

_For any_ environment variable access during development, the fixed configuration SHALL continue reading from `.env.local` exactly as before, preserving the development workflow.

**Validates: Requirements 3.1**

Property 8: Preservation - localStorage API Compatibility

_For any_ component reading user data from the store, the fixed storage layer SHALL provide the same data structure and API, preserving component compatibility.

**Validates: Requirements 3.2**

Property 9: Preservation - Valid CSV Processing

_For any_ CSV import with valid size (<10MB) and row count (<10k), the fixed import function SHALL process the file identically to the original implementation, preserving import functionality.

**Validates: Requirements 3.3**

Property 10: Preservation - Development Logging

_For any_ error or debug operation in development builds, the fixed code SHALL continue logging to the console exactly as before, preserving debugging capabilities.

**Validates: Requirements 3.4**

Property 11: Preservation - Valid Split Transactions

_For any_ split transaction where the sum of shares equals the total (within ±1 tolerance), the fixed calculator SHALL save the transaction successfully without validation errors, preserving normal operation.

**Validates: Requirements 3.5**

Property 12: Preservation - Performance

_For any_ non-sensitive operation, the fixed code SHALL execute with no measurable performance degradation, preserving application responsiveness.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `.gitignore` (root directory)

**Changes**:
1. **Add Environment File Exclusion**: Append `.env.local` to `.gitignore` if not already present
   - Prevents future commits of sensitive credentials
   - Preserves `.env.local.example` for template distribution

**File 2**: `apps/web/src/lib/crypto.ts` (new file)

**Changes**:
1. **Create Encryption Utility**: Implement `encrypt(data: string, key: string): string` using `crypto-js` AES-256
2. **Create Decryption Utility**: Implement `decrypt(ciphertext: string, key: string): string | null` with error handling
3. **Create Key Derivation**: Implement `deriveEncryptionKey(userId: string): string` using SHA-256 hash of user ID
   - Uses deterministic key derivation so the same user always gets the same key
   - Allows decryption across sessions without storing the key

**File 3**: `apps/web/src/store/use-kemana-store.ts`

**Changes**:
1. **Replace Storage Implementation**: Replace `createJSONStorage(() => localStorage)` with custom encrypted storage
2. **Implement Encrypted Storage Adapter**: Create storage object with `getItem`, `setItem`, `removeItem` methods
   - `getItem`: Read from localStorage, decrypt, parse JSON
   - `setItem`: Stringify JSON, encrypt, write to localStorage
   - Handle encryption key from auth context (use anonymous key for logged-out users)
3. **Maintain API Compatibility**: Ensure the store interface remains unchanged for consuming components

**File 4**: `apps/web/src/lib/dashboard-page-entry-utils.ts`

**Function**: `importEntriesFromCsv`

**Specific Changes**:
1. **Add File Size Parameter**: Add `fileSize: number` to function parameters
2. **Add File Size Validation**: Check `fileSize > 10_485_760` before calling `parseCsvRows`
   - Return error: `{ ok: false, message: "File terlalu besar. Maksimal 10MB.", ... }`
3. **Add Row Count Validation**: Count rows during parsing, reject if exceeds 10,000
   - Modify `parseCsvRows` to accept optional `maxRows` parameter
   - Return error: `{ ok: false, message: "File terlalu banyak baris. Maksimal 10,000 baris.", ... }`
4. **Preserve Existing Logic**: All other parsing and validation logic remains unchanged

**File 5**: `apps/web/src/lib/supabase.ts`

**Changes**:
1. **Add Environment Check**: Wrap `console.warn` in `if (process.env.NODE_ENV !== 'production')`
   - Preserves development debugging
   - Removes production console output

**File 6**: `apps/web/src/hooks/useAuth.ts`

**Changes**:
1. **Add Environment Checks**: Wrap all `console.log`, `console.error`, `console.warn` calls in `if (process.env.NODE_ENV !== 'production')`
   - Approximately 15 console statements to gate
   - Preserves development debugging
   - Removes production console output

**File 7**: `apps/web/src/components/kemana-ui/SmartSplitCalculator.tsx`

**Changes**:
1. **Add Validation Function**: Create `validateSplitTotal(totalAmount: number, shares: Array<{amount: number}>): boolean`
   - Calculate sum of shares
   - Check `Math.abs(sum - totalAmount) <= 1`
2. **Add Validation Before Save**: Call validation before `onSharesCalculated`
   - Display error toast if validation fails: "Total pembagian tidak sesuai. Selisih: Rp X"
   - Prevent save operation
3. **Preserve Calculation Logic**: All share calculation logic remains unchanged

**File 8**: Component that handles CSV file input (likely `DataToolsSheet.tsx`)

**Changes**:
1. **Pass File Size**: Extract `file.size` from the File object before reading
2. **Pass to Import Function**: Include `fileSize` parameter when calling `importEntriesFromCsv`

## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach: first, demonstrate each bug on unfixed code to confirm root causes; second, verify fixes work correctly for all buggy inputs; third, ensure preservation of existing functionality for all valid inputs. This systematic approach provides confidence that the security hardening is complete and introduces no regressions.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing fixes. Confirm or refute the root cause analysis for all six vulnerabilities.

**Test Plan**: Create test scenarios that trigger each bug condition on the UNFIXED codebase. Document the failures to validate our understanding of the vulnerabilities.

**Test Cases**:

1. **Credential Exposure Test**: Attempt to commit `.env.local` with mock credentials (will succeed on unfixed code, exposing credentials)
   - Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co`
   - Run `git add .env.local` and verify it's staged
   - Expected: File is staged for commit (demonstrates vulnerability)

2. **Unencrypted Storage Test**: Inspect localStorage after setting user preferences (will show plain text on unfixed code)
   - Set `userName` in the store
   - Open DevTools → Application → localStorage
   - Expected: `kemana.ui.zustand.v1` contains plain JSON like `{"userName":"Test"}`

3. **Large CSV Test**: Import a 15MB CSV file (will crash browser on unfixed code)
   - Generate CSV with 200,000 rows (~15MB)
   - Attempt import through UI
   - Expected: Browser tab becomes unresponsive and crashes

4. **High Row Count Test**: Import CSV with 50,000 rows (will freeze UI on unfixed code)
   - Generate CSV with 50,000 valid transaction rows
   - Attempt import through UI
   - Expected: UI freezes for 30+ seconds, browser may crash

5. **Production Logging Test**: Trigger auth error in production build (will log to console on unfixed code)
   - Build production bundle: `npm run build`
   - Start production server: `npm start`
   - Trigger auth error (invalid credentials)
   - Open DevTools → Console
   - Expected: Console shows error messages with implementation details

6. **Invalid Split Test**: Create split transaction with mismatched total (will save incorrectly on unfixed code)
   - Open SmartSplitCalculator with total: 100,000
   - Set shares: Person A: 60,000, Person B: 30,000
   - Attempt to save
   - Expected: Transaction saves with inconsistent data (sum = 90,000 ≠ 100,000)

**Expected Counterexamples**:
- Git allows staging `.env.local` → Confirms missing `.gitignore` rule
- localStorage contains plain JSON → Confirms no encryption layer
- Large CSV crashes browser → Confirms missing file size validation
- High row count freezes UI → Confirms missing row count validation
- Production console shows logs → Confirms missing environment checks
- Invalid split saves → Confirms missing validation logic

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected secure behavior.

**Pseudocode:**
```
FOR EACH bugCondition IN [C1, C2, C3, C4, C5, C6] DO
  FOR ALL input WHERE bugCondition(input) DO
    result := fixedFunction(input)
    ASSERT expectedSecureBehavior(result)
  END FOR
END FOR
```

**Test Cases**:

1. **Credential Protection Verification**:
   - Create `.env.local` with sensitive data
   - Run `git add .env.local`
   - Assert: File is not staged (ignored by git)
   - Assert: `.env.local` appears in `.gitignore`

2. **Encryption Verification**:
   - Set `userName: "TestUser"` in store
   - Read `localStorage.getItem('kemana.ui.zustand.v1')`
   - Assert: Value starts with `U2FsdGVkX1` (crypto-js encrypted format)
   - Assert: Value does not contain plain text "TestUser"
   - Retrieve from store: `useKemanaStore.getState().userName`
   - Assert: Returns "TestUser" (decryption works)

3. **File Size Validation Verification**:
   - Create File object with size = 11MB
   - Call `importEntriesFromCsv({ raw: "...", fileSize: 11_534_336, ... })`
   - Assert: Returns `{ ok: false, message: "File terlalu besar..." }`
   - Assert: No parsing occurs (performance check)

4. **Row Count Validation Verification**:
   - Create CSV string with 10,001 rows
   - Call `importEntriesFromCsv({ raw: csvString, fileSize: 500_000, ... })`
   - Assert: Returns `{ ok: false, message: "File terlalu banyak baris..." }`
   - Assert: Parsing stops at row 10,001

5. **Production Logging Suppression Verification**:
   - Set `NODE_ENV=production`
   - Mock console methods to track calls
   - Trigger auth error
   - Assert: No console.log/warn/error calls occurred
   - Set `NODE_ENV=development`
   - Trigger auth error
   - Assert: Console methods were called (development logging preserved)

6. **Split Validation Verification**:
   - Set total: 100,000, shares: [60,000, 30,000]
   - Call save handler
   - Assert: Validation error displayed
   - Assert: `onSharesCalculated` not called
   - Set total: 100,000, shares: [50,000, 50,000]
   - Call save handler
   - Assert: No validation error
   - Assert: `onSharesCalculated` called with correct data

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces exactly the same results as the original code.

**Pseudocode:**
```
FOR EACH bugCondition IN [C1, C2, C3, C4, C5, C6] DO
  FOR ALL input WHERE NOT bugCondition(input) DO
    ASSERT originalFunction(input) = fixedFunction(input)
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs
- It validates the "do no harm" principle of security fixes

**Test Plan**: Document current behavior on UNFIXED code for valid inputs, then write property-based tests capturing that behavior to run on FIXED code.

**Test Cases**:

1. **Environment Variable Preservation**: Observe that development builds read `.env.local` correctly on unfixed code
   - Property: `process.env.NEXT_PUBLIC_SUPABASE_URL` equals value from `.env.local`
   - Generate random valid environment configurations
   - Verify all are read correctly after fix

2. **localStorage API Preservation**: Observe that components access store data correctly on unfixed code
   - Property: `useKemanaStore.getState().dateFilter` returns correct value
   - Generate random store states
   - Verify all are accessible with identical API after fix
   - Verify no breaking changes to store interface

3. **Valid CSV Preservation**: Observe that small, valid CSVs import correctly on unfixed code
   - Property: CSV with N rows (<10k) produces N entries
   - Generate random valid CSVs (varying sizes: 10 rows, 100 rows, 5000 rows)
   - Verify all produce identical results after fix
   - Verify parsing logic unchanged

4. **Development Logging Preservation**: Observe that development builds log correctly on unfixed code
   - Property: In development, console methods are called for errors
   - Generate random error scenarios
   - Verify all log correctly in development after fix

5. **Valid Split Preservation**: Observe that balanced splits save correctly on unfixed code
   - Property: Split with sum = total saves successfully
   - Generate random valid splits (2-person, 3-person, equal, custom)
   - Verify all save identically after fix

6. **Performance Preservation**: Measure operation times on unfixed code
   - Property: Encryption overhead < 5ms for typical store operations
   - Generate random store operations
   - Verify performance within acceptable bounds after fix

### Unit Tests

- Test `encrypt` and `decrypt` functions with various inputs (empty string, special characters, large data)
- Test `deriveEncryptionKey` produces consistent keys for same user ID
- Test CSV file size validation edge cases (exactly 10MB, 10MB + 1 byte)
- Test CSV row count validation edge cases (exactly 10,000 rows, 10,001 rows)
- Test split validation with rounding edge cases (difference = 0, ±1, ±2)
- Test environment check logic for all NODE_ENV values
- Test encrypted storage adapter methods (getItem, setItem, removeItem)
- Test git ignore rules with various file patterns

### Property-Based Tests

- Generate random user data and verify encryption/decryption round-trip preserves data
- Generate random CSV files (varying sizes, row counts) and verify correct accept/reject behavior
- Generate random split configurations and verify validation logic correctness
- Generate random store states and verify localStorage API compatibility
- Generate random error scenarios and verify logging behavior in both environments
- Test encryption key derivation with many user IDs to ensure uniqueness and consistency

### Integration Tests

- E2E test: Sign in, set preferences, sign out, sign in again → Verify preferences persist (encrypted)
- E2E test: Import valid CSV (5MB, 5000 rows) → Verify successful import
- E2E test: Attempt import of large CSV (15MB) → Verify rejection with error message
- E2E test: Create split transaction with correct total → Verify saves successfully
- E2E test: Attempt split with incorrect total → Verify validation error displayed
- E2E test: Production build → Verify no console output during normal operation
- E2E test: Development build → Verify console output for debugging
- E2E test: Multi-device sync with encrypted data → Verify data consistency
- Manual test: Inspect localStorage in DevTools → Verify encrypted format
- Manual test: Attempt to commit `.env.local` → Verify git rejects it
