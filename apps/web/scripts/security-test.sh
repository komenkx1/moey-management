#!/bin/bash

# Security Testing Script
# Runs automated security scans and tests

set -e

echo "🔒 KeMana Security Testing Suite"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ -z "$1" ]; then
  echo "${YELLOW}Usage: ./security-test.sh <url>${NC}"
  echo "Example: ./security-test.sh https://your-app.vercel.app"
  exit 1
fi

URL=$1
echo "Target URL: $URL"
echo ""

# 1. Check Security Headers
echo "📋 Step 1: Checking Security Headers..."
echo "---------------------------------------"

HEADERS=$(curl -sI "$URL")

check_header() {
  HEADER=$1
  if echo "$HEADERS" | grep -qi "$HEADER"; then
    echo "${GREEN}✓${NC} $HEADER present"
  else
    echo "${RED}✗${NC} $HEADER missing"
  fi
}

check_header "Content-Security-Policy"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
check_header "Permissions-Policy"
check_header "Strict-Transport-Security"
check_header "Cross-Origin-Embedder-Policy"
check_header "Cross-Origin-Opener-Policy"
check_header "Cross-Origin-Resource-Policy"

echo ""

# 2. Test Rate Limiting
echo "🚦 Step 2: Testing Rate Limiting..."
echo "-----------------------------------"

echo "Sending 10 rapid requests..."
SUCCESS_COUNT=0
RATE_LIMITED=0

for i in {1..10}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$STATUS" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$STATUS" = "429" ]; then
    RATE_LIMITED=$((RATE_LIMITED + 1))
  fi
done

echo "Success: $SUCCESS_COUNT, Rate Limited: $RATE_LIMITED"

if [ $RATE_LIMITED -gt 0 ]; then
  echo "${GREEN}✓${NC} Rate limiting is working"
else
  echo "${YELLOW}⚠${NC} Rate limiting may not be active (or limit is high)"
fi

echo ""

# 3. npm Audit
echo "📦 Step 3: Running npm audit..."
echo "-------------------------------"

cd "$(dirname "$0")/.."
npm audit --production || echo "${YELLOW}⚠${NC} Some vulnerabilities found"

echo ""

# 4. Check for common vulnerabilities
echo "🔍 Step 4: Checking for Common Vulnerabilities..."
echo "-------------------------------------------------"

# Check if HTTPS
if [[ $URL == https://* ]]; then
  echo "${GREEN}✓${NC} Using HTTPS"
else
  echo "${RED}✗${NC} Not using HTTPS"
fi

# Check for exposed secrets in public files
echo "Checking for exposed secrets..."
PUBLIC_FILES=("robots.txt" "sitemap.xml" ".env" ".git/config")
for file in "${PUBLIC_FILES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/$file")
  if [ "$STATUS" = "200" ]; then
    echo "${RED}✗${NC} $file is publicly accessible"
  else
    echo "${GREEN}✓${NC} $file is not accessible"
  fi
done

echo ""

# 5. Summary
echo "📊 Security Test Summary"
echo "========================"
echo ""
echo "✅ Security headers check: Complete"
echo "✅ Rate limiting test: Complete"
echo "✅ Dependency audit: Complete"
echo "✅ Common vulnerabilities: Complete"
echo ""
echo "${GREEN}Security testing completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Review any warnings or errors above"
echo "2. Run OWASP ZAP for deeper analysis:"
echo "   docker run -t owasp/zap2docker-stable zap-baseline.py -t $URL"
echo "3. Perform manual penetration testing"
echo "4. Review security audit documentation"
