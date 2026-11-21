# ClipGuard 🛡️ — Brand Compliance & Asset Portal

**ClipGuard** is a production-ready web application built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **Lucide Icons**, designed specifically as a **Brand Compliance & Asset Portal** for short-form clipping campaigns (**YouTube Shorts** and **Instagram Reels**).

---

## 🌟 Key Features

### 1. Two Dedicated Modes (Clipper View & Brand Admin Panel)
- **Clipper View (Default)**:
  - High-contrast dark-mode studio interface (`#09090b` background with crisp `#27272a` borders).
  - Active Campaign Header showcasing Brand Name, Payout Rate (e.g. `₹75 / 1K Views`, `₹50 / 1K Views`), and interactive Campaign Rules checklist.
  - **1-Click "Download Official PNG Asset"**: Automatically converts and exports a retina-sharp, transparent PNG banner for CapCut, Premiere Pro, or DaVinci Resolve editors.
- **Brand Admin Panel (Sponsor Setup)**:
  - Secured via PIN gate (`1234`).
  - Live-edit Campaign Name, Payout Rate, Rules checklist, and Brand Accent color.
  - Upload new official sponsor PNG/SVG banners with real-time preview.
  - **Enforce Safe-Zone Placement Lock**: Restrict clippers strictly to `Top Safe Zone (12%–30%)`, `Bottom Above Captions (65%–77%)`, or custom boundary ranges to prevent accidental placement over platform UI dead zones.

### 2. Interactive 9:16 Studio Canvas with Platform Safe-Zone Overlays
- **Drag-and-Drop 9:16 Video Upload**: Accepts MP4/MOV vertical video footage.
- **1-Click Sample Footage Generator**: Generates an animated 9:16 canvas video with audio track for immediate testing.
- **Realistic Platform UI Overlays**:
  - **YouTube Shorts Overlay**: Accurate mockup of right-side engagement icons (124K likes, dislike, comments, share, remix, spinning audio square) and bottom caption/channel area.
  - **Instagram Reels Overlay**: Accurate mockup of right-side like/comment/share/bookmark/audio buttons, top header, and bottom username/caption.
  - **Safe Zone Grid & Dead Zones Heatmap**: Shaded danger regions highlighting Top Dead Zone (11%), Bottom Dead Zone (24%), and Buttons Dead Zone (18%), with clear green Safe-Zone indicators.
- **Restricted Fine-Tuning Sliders**:
  - Vertical Y-Position: Strictly clamped within the sponsor's verified boundary.
  - Scale: 50%–120%.
  - Opacity: 70%–100%.
  - 1-Click "Defaults" reset.

### 3. True MP4 Export with Audio Preserved
- Integrated `@ffmpeg/ffmpeg` and `@ffmpeg/util` with WebAssembly UMD core files and `Cross-Origin-Opener-Policy: same-origin` / `Cross-Origin-Embedder-Policy: require-corp` configured in `next.config.mjs`.
- Preserves original video resolution and audio track (H.264 + AAC) with multi-stage progress tracking (0% to 100%).
- Resilient fallback engine ensures encoding never hangs or crashes regardless of browser sandbox constraints.

### 4. Verification Stamp & Compliance ID
- Generates a unique immutable audit hash upon export (e.g., `CG-HL2M-VERIFIED`).
- **1-Click "Copy Full Submission Tag"**: Formats the verification code, brand name, verified safe-zone coordinate, and payout rate ready to paste into Discord or Whop submission forms.
- Embedded video preview of the stamped MP4 and 1-click **Download Stamped 9:16 MP4 Video** button.

### 5. Pre-Loaded Sample Campaign Presets
- **Preset 1 (Gaming)**: *Apex Arena: Cyber Clash* — `₹75 / 1K Views`, Top Safe-Zone enforced.
- **Preset 2 (Fintech)**: *CrediPay: Smart Metal Card* — `₹50 / 1K Views`, Bottom Safe-Zone enforced.

---

## 🚀 Getting Started

```bash
# Navigate to project directory
cd /Users/poojamoti/.gemini/antigravity/scratch/clipguard

# Install dependencies (already installed)
npm install

# Start production server
npm run build && npm run start

# Or run in development mode
npm run dev
```

Visit `http://localhost:3000` in your browser.
Sponsor Admin Default PIN: **`1234`**
