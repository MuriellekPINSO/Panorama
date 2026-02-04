# 🚀 Quick Start Guide: Panorama Stitching

## 5-Minute Setup

### Step 1: Start Backend (Terminal 1)
```bash
cd backend-stitching
npm install
npm start
```

**Expected output:**
```
🌐 Panorama Stitching Server Started
Port: 3000
Endpoint: POST /api/stitch-panorama
```

✅ Backend ready!

### Step 2: Start App (Terminal 2)
```bash
cd ..
npm start
```

Choose your platform (iOS/Android/Web)

✅ App ready!

### Step 3: Test It

1. Open app
2. Tap "Create" (+ button)
3. Tap camera permission: **Allow**
4. Capture 8 photos (turn phone 45° between each)
5. Wait for processing (30-60s)
6. View panorama! 🎉

---

## What You'll See

### Capture Screen
```
PHOTO 360°
Capturez 8 photos en tournant

[Circular indicator with 8 dots]
  1 ✓
2 ← next (blue)
3-8 (gray)

[Capture button in center]

Photo 1/8 • Tournez progressivement
```

### Processing Screen
```
Assemblage 360°

         [100%]
    
Fusion panoramique avancée...
[======== 50% ========]

✓ Photos capturées (8)
● Détection des points de repère
  Alignement géométrique
  Correction de distorsion
  Fusion des bords seamless
```

### Result
Seamless 360° panorama ready to view! 🌐

---

## Troubleshooting

### "Server unreachable"
```bash
# Make sure backend is running
# Terminal 1: cd backend-stitching && npm start
```

### "Python not found"
```bash
# Check Python installation
python3 --version

# Install OpenCV
pip install opencv-python
```

### "Not enough images"
- Ensure you captured all 8 photos
- Each photo must be at 45° increment

### Slow Processing
- Normal: 30-60 seconds
- Check server CPU in terminal
- May be faster on powerful machine

---

## Environment Variables

### Optional: Local .env
Create `.env.local` in app root:
```env
EXPO_PUBLIC_STITCHING_SERVER=http://localhost:3000
```

(This is already the default)

### For Production
```env
EXPO_PUBLIC_STITCHING_SERVER=https://your-server.onrender.com
```

---

## File Locations

```
myApp/
├── app/(tabs)/create.tsx           ← Capture & upload
├── utils/panorama-assembler.ts     ← Stitching logic
├── backend-stitching/
│   ├── server.js                   ← Backend server
│   └── package.json                ← Dependencies
└── Documentation/
    ├── COMPLETION_SUMMARY.md       ← Full summary
    ├── PANORAMA_STITCHING_ARCHITECTURE.md
    ├── PANORAMA_INTEGRATION_GUIDE.md
    └── backend-stitching/SETUP.md
```

---

## Common Commands

### Start Everything
```bash
# Terminal 1
cd backend-stitching && npm start

# Terminal 2
npm start
```

### Test Backend Health
```bash
curl http://localhost:3000/api/health
```

### Clear Cache & Rebuild
```bash
expo start --clear
```

### View Stitched Panoramas
```bash
# On Mac/Linux
open backend-stitching/outputs/

# On Windows
start backend-stitching\outputs\
```

---

## Next: Production Deployment

When ready to deploy:

1. **Deploy Backend**
   - See `backend-stitching/SETUP.md`
   - Recommended: Render.com (free)

2. **Update App Config**
   - Create `.env.local`
   - Set `EXPO_PUBLIC_STITCHING_SERVER`

3. **Test End-to-End**
   - Capture 8 photos
   - Verify stitching works
   - Check panorama quality

---

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stitch-panorama` | POST | Send 8 photos, get stitched panorama |
| `/api/health` | GET | Check server status |
| `/panoramas/*` | GET | Download stitched panoramas |

---

## Performance Tips

- **Faster stitching:** Server CPU matters most
- **Faster upload:** Good wifi connection
- **Better quality:** Good lighting, steady hands
- **More reliable:** 30-50% overlap between photos

---

## File Locations

### Output Panoramas
```
backend-stitching/outputs/
├── panorama_1234567890.jpg (stitched result)
└── ...
```

### App Storage
```
FileSystem.documentDirectory/
└── stitched-panoramas/
    └── panorama_1234567890.jpg
```

---

## What's New

✅ **Backend stitching** - No more simple concatenation  
✅ **Feature matching** - Intelligent overlap detection  
✅ **Distortion correction** - Professional quality  
✅ **Seamless blending** - Invisible seams  
✅ **Production ready** - Full error handling  

---

## Questions?

See detailed documentation:
- `COMPLETION_SUMMARY.md` - Full overview
- `PANORAMA_STITCHING_ARCHITECTURE.md` - Technical details
- `backend-stitching/SETUP.md` - Backend setup
- `PANORAMA_INTEGRATION_GUIDE.md` - Integration reference

---

**Ready?** Start with "Step 1: Start Backend" above! 🚀

Good luck! 📸🌐
