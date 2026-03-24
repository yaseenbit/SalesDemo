# Electron Project - Complete Documentation Index

## 📚 Documentation Files

### Start Here
1. **[ELECTRON_QUICK_REFERENCE.md](./ELECTRON_QUICK_REFERENCE.md)** ⭐
   - Quick overview of what was created
   - Fast setup instructions
   - Common use cases
   - Troubleshooting

2. **[ELECTRON_README.md](./ELECTRON_README.md)** 📖
   - Complete project overview
   - Configuration options
   - Platform-specific notes
   - Security checklist

3. **[ELECTRON_SETUP.md](./ELECTRON_SETUP.md)** 🔧
   - Detailed setup instructions
   - Build instructions
   - Development workflow
   - Environment configuration

### For React Developers
4. **[frontend/ELECTRON_INTEGRATION.md](./frontend/ELECTRON_INTEGRATION.md)** ⚛️
   - How to use Electron APIs in React
   - `useElectronStore` hook documentation
   - Data persistence patterns
   - Complete code examples
   - Security considerations

### For Electron Developers
5. **[electron/README.md](./electron/README.md)** ⚡
   - Electron-specific documentation
   - Main process details
   - IPC communication
   - Build configuration
   - Development tips

### Code Examples
6. **[frontend/src/components/ElectronStorageExample.tsx](./frontend/src/components/ElectronStorageExample.tsx)** 💻
   - Working example component
   - Shows how to use persistent storage
   - Demonstrates error handling
   - Includes browser fallback

## 📁 Project Structure

### New Electron Directory
```
electron/
├── src/
│   ├── main.ts           # Electron main process
│   └── preload.ts        # Secure preload script
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript config
├── .gitignore
└── README.md
```

### Enhanced Frontend
```
frontend/
├── src/
│   ├── components/
│   │   └── ElectronStorageExample.tsx  (new)
│   ├── hooks/
│   │   └── useElectronStore.ts         (new)
│   ├── types/
│   │   └── electron.d.ts               (new)
│   └── ...
├── ELECTRON_INTEGRATION.md             (new)
└── ...
```

### Root Level
```
SalesDemo/
├── ELECTRON_README.md          (new)
├── ELECTRON_SETUP.md           (new)
├── ELECTRON_QUICK_REFERENCE.md (new)
├── start-electron.sh           (new)
├── build-electron.sh           (new)
└── ...
```

## 🚀 Quick Start Commands

### Development
```bash
# From SalesDemo root directory
./start-electron.sh

# Or manually from electron directory
cd electron
npm install
npm run dev
```

### Production Build
```bash
cd electron
npm install
npm run build
```

### Installation from Distribution Package
See build output in `electron/out/` for:
- **macOS**: Double-click .dmg file
- **Windows**: Run .exe installer
- **Linux**: Install .deb or run .AppImage

## 📖 How to Use This Documentation

### If you want to...

**Get started quickly**
- → Read: ELECTRON_QUICK_REFERENCE.md (5 min)
- → Run: `./start-electron.sh`

**Understand the full architecture**
- → Read: ELECTRON_README.md (15 min)
- → Read: electron/README.md (10 min)

**Build features into your React app**
- → Read: frontend/ELECTRON_INTEGRATION.md (20 min)
- → Copy patterns from ElectronStorageExample.tsx

**Configure Electron settings**
- → Read: ELECTRON_SETUP.md
- → Edit: electron/package.json & electron/src/main.ts

**Build and distribute**
- → Run: build-electron.sh or `npm run build` from electron/
- → Read: ELECTRON_SETUP.md (Build section)

**Debug or troubleshoot**
- → See: Troubleshooting in ELECTRON_README.md
- → Check: Debug Commands in ELECTRON_SETUP.md

## 🎯 Common Tasks

### 1. Add Persistent Storage to a Component

```typescript
// See frontend/ELECTRON_INTEGRATION.md for full examples
import { useElectronStore } from '../hooks/useElectronStore';

function MyComponent() {
  const { getStoreValue, setStoreValue } = useElectronStore();
  
  const handleSave = async () => {
    await setStoreValue('my-key', data);
  };
  
  const handleLoad = async () => {
    const data = await getStoreValue('my-key');
  };
}
```

### 2. Auto-Save Invoice Drafts

See: `frontend/ELECTRON_INTEGRATION.md` → "Caching Invoice Data" section

### 3. Build for Distribution

```bash
cd electron
npm run build
# Installers created in electron/out/
```

### 4. Add a New Electron API

See: `frontend/ELECTRON_INTEGRATION.md` → "Security Considerations" section

### 5. Run in Browser Mode (Web App)

```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

### 6. Configure App Icon

Place icon at `electron/assets/icon.png` (256x256 or larger)

### 7. Change Window Size

Edit `electron/src/main.ts` → `createWindow()` function

### 8. Change App Name

Edit `electron/package.json` → `"productName"`

## 🔑 Key Files to Know

### Critical Files
| File | Purpose |
|------|---------|
| `electron/src/main.ts` | Electron app entry point, window management, IPC handlers |
| `electron/src/preload.ts` | Exposes safe APIs to React app |
| `electron/package.json` | Dependencies, build config, app metadata |
| `frontend/src/hooks/useElectronStore.ts` | React hook for persistent storage |
| `electron/tsconfig.json` | TypeScript configuration |

### Configuration Files
| File | Purpose |
|------|---------|
| `electron/package.json` → `"build"` | Electron-builder configuration (app icon, installers) |
| `electron/package.json` → `"scripts"` | Available commands |
| `frontend/vite.config.ts` | Vite dev server configuration (port 5173) |

### Documentation
| File | Purpose |
|------|---------|
| `ELECTRON_QUICK_REFERENCE.md` | Quick guide (start here) |
| `ELECTRON_README.md` | Full overview & configuration |
| `ELECTRON_SETUP.md` | Setup & build instructions |
| `frontend/ELECTRON_INTEGRATION.md` | React integration guide |
| `electron/README.md` | Electron-specific docs |

## 💡 Tips & Best Practices

### Development
- ✅ Use `npm run dev` from electron/ for hot reload
- ✅ Check browser DevTools: Ctrl+Shift+I
- ✅ Changes to React code auto-reload
- ✅ Main process changes need app restart

### Performance
- ✅ Use debounced saves for frequent updates
- ✅ Batch store operations when possible
- ✅ Consider caching for large datasets

### Security
- ✅ Never expose sensitive APIs directly
- ✅ Always validate IPC messages in main process
- ✅ Keep preload script minimal

### Distribution
- ✅ Test on target platforms before release
- ✅ Code sign for macOS and Windows
- ✅ Include release notes and changelog
- ✅ Set up auto-updates for easy distribution

## 🐛 Troubleshooting Quick Links

| Problem | See |
|---------|-----|
| Port 5173 in use | ELECTRON_README.md → Troubleshooting |
| window.electronAPI undefined | ELECTRON_QUICK_REFERENCE.md → Common Issues |
| App won't start | ELECTRON_README.md → Troubleshooting |
| Data not persisting | ELECTRON_SETUP.md → Data Persistence |
| Build fails | ELECTRON_README.md → Platform-Specific Notes |

## 📚 External Resources

- [Electron Official Docs](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Electron Store](https://github.com/sindresorhus/electron-store)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## ✅ Checklist for First-Time Setup

- [ ] Read ELECTRON_QUICK_REFERENCE.md (5 min)
- [ ] Run `./start-electron.sh` from root
- [ ] App starts and loads web interface
- [ ] Open DevTools (Ctrl+Shift+I or Cmd+Option+I)
- [ ] Try ElectronStorageExample component
- [ ] Save/load data successfully
- [ ] Examine ElectronStorageExample.tsx code
- [ ] Read frontend/ELECTRON_INTEGRATION.md
- [ ] Try modifying React code (should hot-reload)
- [ ] Try modifying electron/src/main.ts (restart app)
- [ ] Build distribution: `cd electron && npm run build`
- [ ] Check installers in electron/out/

## ✅ Checklist Before Distribution

- [ ] Test on macOS, Windows, and Linux
- [ ] Update version in electron/package.json
- [ ] Set up code signing (macOS & Windows)
- [ ] Create app icon (electron/assets/icon.png)
- [ ] Update app metadata in electron/package.json
- [ ] Test installers from electron/out/
- [ ] Create release notes
- [ ] Consider setting up auto-updates
- [ ] Tag release in git

## 📞 Getting Help

1. **Check the documentation** - Most answers are in one of the docs above
2. **Search your code** - Look for similar patterns in ElectronStorageExample.tsx
3. **Check error messages** - Full stack traces usually point to the issue
4. **Review console output** - Both DevTools and terminal output are important
5. **Electron Docs** - https://www.electronjs.org/docs is comprehensive

## 📝 Version Information

- **Created**: March 2026
- **Electron Version**: 27.0.0
- **Node.js Required**: 16+
- **React**: 18.3.1
- **Vite**: 5.4.10

---

**Happy Building! 🚀**

Start here: [ELECTRON_QUICK_REFERENCE.md](./ELECTRON_QUICK_REFERENCE.md)

Or run: `./start-electron.sh`

