

## 365-Day Discipline & Learning Streak Dashboard

A beautiful, interactive personal growth tracker with GitHub-style contribution grids, showcasing your daily consistency in AI/ML and DSA learning.

---

### 🎨 Visual Design & Theme

**Modern Glassmorphism Style with Cool Tones**
- Sleek gradient backgrounds transitioning from deep purple to soft blue to teal
- Glass-effect cards with subtle blur and glow effects
- Day boxes with rounded corners and soft glow on hover
- Smooth animations and micro-interactions throughout
- Light, airy color palette that feels calm yet motivating

---

### 📱 Homepage Layout

**Hero Section**
- Inspiring heading with your "Consistency" philosophy text (expandable dialog)
- Your name/brand as the dashboard owner
- Timeline display: Feb 4, 2026 → Feb 4, 2027

**Tabbed Navigation**
- Switch between AI/ML and DSA tracking grids
- Each tab shows the full 365-day contribution grid
- Mobile-friendly stacked layout

**Stats Bar (for each track)**
- 🔥 Current streak counter (days in a row)
- ✅ Total days completed
- 📊 Completion percentage with progress ring
- 🏆 Milestone badges (7 days, 30 days, 100 days, etc.)

**Inspirational Quotes Section**
- Rotating motivational quotes about consistency and discipline

---

### 📅 365-Day Streak Grid

**Day Box States (Clear Visual Distinction)**

| State | Appearance |
|-------|------------|
| **Completed** | Vibrant purple/blue gradient glow, filled color |
| **Inactive/Empty** | Subtle gray outline, muted/transparent, clearly different |
| **Today** | Special border highlight to show current day |
| **Future** | Slightly dimmed, not yet available |

**Visual Design**
- Calendar-style layout with months labeled
- All 365 boxes always visible (completed or not)
- Completed days glow with color intensity
- Empty/missed days remain visible but clearly muted
- Hover effects reveal date and quick status

---

### 📝 Day Detail Modal

**Information Display**
- Date header with completion status badge
- Description of work done (or "No activity recorded")
- Key learnings / progress summary
- Proof of work section:
  - Uploaded images/screenshots in a gallery
  - External links (GitHub, articles, etc.)

**For Viewers**: Read-only access
**For Owner**: Full edit capabilities

---

### 🔐 Access Control System

**Landing Experience**
- Clean modal asking: "How would you like to access?"
- Two options: Viewer or Owner

**Viewer Mode**
- Full read access to all grids and day details
- Cannot modify anything

**Owner Mode**
- Password-protected login (set up on first visit)
- Full control:
  - Add/edit daily descriptions
  - Upload proof screenshots and files
  - Mark days as complete/incomplete
  - Changes save immediately and visible to all

---

### 📈 Progress Analytics

**Weekly/Monthly Summary Views**
- Toggle between week and month views
- Visual charts showing consistency patterns
- Identify productive periods and gaps

**Achievement Milestones**
- Celebrate streak milestones (7, 14, 30, 60, 90, 180, 365 days)
- Visual badges on dashboard

---

### 🗄️ Backend (Lovable Cloud + Supabase)

**Data Storage**
- Daily entries with descriptions and learnings
- File uploads for proof of work
- Streak calculations and statistics

**Authentication**
- Secure owner login with password
- First-time credential setup

---

### 📱 Responsive Design

- Desktop: Full grid view with stats
- Mobile: Stacked layout with touch-friendly navigation

