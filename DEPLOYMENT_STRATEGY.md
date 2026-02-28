# Deployment Strategy: Parallel + Gradual Migration

## Quick Reference

**Strategy:** Keep Next.js PWA running, deploy RN Web to beta, test, then switch gradually.

**Timeline:** 11 weeks total (4 weeks build + 7 weeks deployment)

**Zero Downtime:** ✅ Users never experience downtime

**Rollback:** < 5 minutes via Vercel dashboard

---

## Timeline Overview

```
Week 1-4: Build RN Web (Next.js live on kemana.app)
Week 5: Deploy to beta.kemana.app
Week 6: Beta testing + feedback
Week 7: Soft launch preparation
Week 8: Switch kemana.app to RN Web
Week 9-10: Stabilization
Week 11+: Cleanup (delete Next.js)
```

---

## Domain Configuration

### Current State
```
kemana.app → Next.js PWA (Vercel project: kemana-web)
```

### Week 5-7: Beta Period
```
kemana.app → Next.js PWA (stable)
beta.kemana.app → React Native Web (testing)
```

### Week 8+: After Switch
```
kemana.app → React Native Web (new)
beta.kemana.app → Redirect to kemana.app
```

### Week 11+: Final State
```
kemana.app → React Native Web (only)
(Next.js project deleted)
```

---

## Vercel Projects

### Project 1: kemana-web (Current)
- Framework: Next.js
- Domain: kemana.app
- Status: Keep until Week 11
- Purpose: Backup + rollback option

### Project 2: kemana-universal (New)
- Framework: Expo (React Native Web)
- Domains:
  - Week 5-7: beta.kemana.app
  - Week 8+: kemana.app
- Status: Active from Week 5

---

## User Impact

### Week 1-4: No Impact
- Users continue using Next.js PWA
- No changes visible

### Week 5-6: Optional Beta
- Users can try beta.kemana.app
- Banner on kemana.app (dismissible)
- Stable version still available

### Week 7: Notification
- Modal about upcoming upgrade
- Explain new features
- Reassure about data safety

### Week 8: Automatic Switch
- Users automatically use new version
- Data migrates seamlessly
- No action required

---

## Data Migration

**Good News:** Automatic!

```
User data is local (IndexedDB/SQLite)
- Same storage interface
- Same data structure
- No manual migration needed
- User opens app → data already there
```

---

## Rollback Procedure

### If Critical Issues Found:

**Step 1:** Remove domain from new project
```
Vercel Dashboard → kemana-universal
Settings → Domains → kemana.app → Remove
```

**Step 2:** Re-add domain to old project
```
Vercel Dashboard → kemana-web
Settings → Domains → Add → kemana.app
```

**Done!** Users see old version (< 5 minutes)

### Rollback Triggers:
- Error rate > 5%
- Critical bug in core features
- Performance degradation > 50%
- User complaints > 10%

---

## Success Criteria

Before full switch (Week 8), verify:
- [ ] Error rate < 1%
- [ ] Load time < 2s (p95)
- [ ] No critical bugs
- [ ] All core features working
- [ ] Gestures smooth (60fps)
- [ ] Positive feedback (if beta tested)

---

## Cost

**Vercel:**
- Current: $0-20/month (1 project)
- During migration: $0-20/month (2 projects)
- After migration: $0-20/month (1 project)

**Total extra cost: $0** ✅

---

## Communication Templates

### Week 5-6: Beta Banner
```
🎉 Try our new native app!
Faster, smoother, better experience
[Try Beta] [Dismiss]
```

### Week 7: Upgrade Modal
```
We've upgraded KeMana! 🚀

New features:
✓ Native iOS & Android apps
✓ Smoother gestures
✓ Better performance

Your data is safe and will migrate automatically.

[Continue to New Version]
```

---

## Monitoring

### Track These Metrics:

**Next.js (Old):**
- Daily active users
- Page load time
- Error rate
- Bounce rate

**RN Web (New):**
- Daily active users
- App load time
- Error rate
- Gesture performance
- User feedback

---

## Quick Commands

### Deploy to Beta
```bash
cd apps/universal
npx expo export --platform web
vercel --prod
```

### Switch Domain (Week 8)
```
Vercel Dashboard:
1. kemana-web → Remove kemana.app
2. kemana-universal → Add kemana.app
```

### Rollback (Emergency)
```
Vercel Dashboard:
1. kemana-universal → Remove kemana.app
2. kemana-web → Add kemana.app
```

---

## Checklist

### Before Migration
- [ ] Backup Vercel project settings
- [ ] Document current deployment
- [ ] Create beta subdomain
- [ ] Plan user communication

### During Migration
- [ ] Keep Next.js running
- [ ] Deploy to beta
- [ ] Test thoroughly
- [ ] Collect feedback

### After Switch
- [ ] Monitor for 2 weeks
- [ ] Keep Next.js backup
- [ ] Fix issues quickly
- [ ] Deprecate when stable

---

## Contact & Support

**If Issues During Migration:**
1. Check Vercel deployment logs
2. Check error monitoring (Sentry/etc)
3. Rollback if critical
4. Fix and redeploy

**Emergency Rollback:** < 5 minutes via Vercel dashboard

---

This strategy ensures zero downtime, safe migration, and easy rollback! 🚀
