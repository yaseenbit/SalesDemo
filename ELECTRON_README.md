# SalesDemo Electron Project - Complete Setup

Welcome to the SalesDemo Electron wrapper! This document provides a complete overview of the Electron project structure and how to get started.

## What's Included

This project wraps the SalesDemo React/Vite web application inside an Electron desktop app, providing:

- ✅ **Native Desktop Experience** - Runs as a native macOS, Windows, and Linux application
- ✅ **Persistent Local Storage** - Built-in data persistence with `electron-store`
- ✅ **Hot Development** - React hot reload during development
- ✅ **Security** - Context isolation and secure IPC communication
- ✅ **Build Automation** - `electron-builder` for creating installers
- ✅ **Native Menus** - Application menu bar and context menus

## Project Structure

```
SalesDemo/
├── frontend/                          # React/Vite web app (unchanged)
│   ├── src/
│   │   ├── components/
│   │   │   └── ElectronStorageExample.tsx   # NEW: Example component
│   │   ├── hooks/
│   │   │   └── useElectronStore.ts          # NEW: Store hook
│   │   ├── types/
│   │   │   └── electron.d.ts                # NEW: Type definitions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   ├── ELECTRON_INTEGRATION.md        # NEW: Integration guide
│   └── ...
│
├── electron/                          # NEW: Electron app directory
│   ├── src/
│   │   ├── main.ts                    # Electron main process
│   │   └── preload.ts                 # Secure preload script
│   ├── package.json                   # Electron dependencies & scripts
│   ├── tsconfig.json
│   ├── .gitignore
│   ├── README.md
│   └── ...
│
├── ELECTRON_SETUP.md                  # NEW: Setup and build guide
├── start-electron.sh                  # NEW: Quick start script
├── build-electron.sh                  # NEW: Build script
└── ...
```

## Quick Start

### 1. Install and Run

From the SalesDemo root directory:

```bash
# Make scripts executable (macOS/Linux)
chmod +x start-electron.sh build-electron.sh

# Run the app
./start-electron.sh
```

Or manually:

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Install electron dependencies
cd electron && npm install

# Start development
npm run dev
```

### 2. Build Distribution

```bash
./build-electron.sh
```

Or manually:

```bash
cd electron
npm run build
```

Packages will be created in `electron/out/` for:
- **macOS**: `.dmg` and `.zip`
- **Windows**: `.exe` (NSIS installer and portable)
- **Linux**: `.AppImage` and `.deb`

## Available Commands

### From `electron/` directory:

**Development:**
```bash
npm run dev              # Start dev server + Electron with hot reload
npm run dev:vite        # Start only Vite dev server
npm run dev:electron    # Start only Electron app
npm start               # Build frontend and start Electron app
```

**Building:**
```bash
npm run build           # Build for distribution (all platforms)
npm run build:vite      # Build frontend only
npm run build:electron  # Compile Electron and run electron-builder
npm run pack            # Create installers without code signing
npm run dist            # Create signed, distributable packages
```

## Using Electron Features in React

### 1. Access Persistent Storage

```typescript
import { useElectronStore } from '../hooks/useElectronStore';

function MyComponent() {
  const { getStoreValue, setStoreValue } = useElectronStore();

  const handleSave = async () => {
    await setStoreValue('my-key', { data: 'value' });
  };

  const handleLoad = async () => {
    const data = await getStoreValue('my-key');
    console.log(data);
  };

  return (
    <>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleLoad}>Load</button>
    </>
  );
}
```

### 2. Check if Running in Electron

```typescript
import { isElectronApp, useElectronStore } from '../hooks/useElectronStore';

function MyComponent() {
  const { isElectronApp } = useElectronStore();

  if (!isElectronApp) {
    return <p>Browser mode only</p>;
  }

  return <div>Desktop app content</div>;
}
```

### 3. Auto-Save Invoice Drafts

See `frontend/ELECTRON_INTEGRATION.md` for complete examples of implementing:
- Auto-saving invoice drafts
- Remembering customer selection
- Storing user preferences
- Caching product catalog

## Configuration

### App Branding

Edit `electron/package.json` build configuration:

```json
{
  "build": {
    "appId": "com.salesdemo.pos",
    "productName": "SalesDemo POS",
    "mac": {
      "category": "public.app-category.business"
    }
  }
}
```

### Window Customization

Edit `electron/src/main.ts`:

```typescript
const mainWindow = new BrowserWindow({
  width: 1400,      // Change window width
  height: 900,      // Change window height
  minWidth: 900,    // Minimum width
  minHeight: 600,   // Minimum height
});
```

### Port Configuration

Default: `5173` (specified in `frontend/vite.config.ts`)

If port is in use, change it:

```typescript
// frontend/vite.config.ts
server: {
  port: 5174,  // Change this
}
```

Update in `electron/src/main.ts` as well:

```typescript
const startUrl = isDev
  ? 'http://localhost:5174'  // Match the port above
  : `file://${join(__dirname, '../frontend/dist/index.html')}`
```

## Development Workflow

### Making Changes to React Code

1. Edit files in `frontend/src/`
2. Changes automatically hot-reload in the Electron window
3. No restart needed

### Making Changes to Electron Main Process

1. Edit files in `electron/src/`
2. Manually reload: Ctrl+R (or Cmd+R on macOS)
3. Or restart the Electron app

### Making Changes to IPC/Storage API

1. Update `electron/src/main.ts` (handler)
2. Update `electron/src/preload.ts` (exposed API)
3. Update `frontend/src/types/electron.d.ts` (TypeScript types)
4. Restart the Electron app

## Data Persistence

Data is automatically saved to:

- **macOS**: `~/Library/Application Support/salesdemo-electron/config.json`
- **Windows**: `%APPDATA%/salesdemo-electron/config.json`
- **Linux**: `~/.config/salesdemo-electron/config.json`

To reset the store, delete the `config.json` file.

## Troubleshooting

### Port 5173 Already in Use

```bash
# Find process using port
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Electron App Won't Start

1. Check TypeScript compilation: `cd electron && npx tsc`
2. Verify port 5173 is accessible: `curl http://localhost:5173`
3. Check for errors in terminal output
4. Try deleting `node_modules` and reinstalling: `npm install`

### Build Fails

**macOS:**
```bash
# May need to allow app in System Preferences
xcode-select --install  # Install Xcode Command Line Tools
```

**Windows:**
- Requires Visual Studio Build Tools or full Visual Studio
- Or use `npm run pack` to skip signing

**Linux:**
- Install build dependencies:
```bash
sudo apt-get install build-essential python3
```

### DevTools Not Opening

DevTools should open automatically in development. If not:
- Check `NODE_ENV` environment variable
- Try manually opening: Ctrl+Shift+I (or Cmd+Option+I on macOS)
- Check browser console for errors

## Platform-Specific Notes

### macOS

- App runs on both Intel and Apple Silicon Macs
- Code signing optional for development, required for distribution
- To skip signing during development:
  ```bash
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
  ```

### Windows

- Creates NSIS installer and portable `.exe`
- Building on non-Windows requires Docker or WSL
- To skip installer and just create executable:
  ```bash
  npm run pack
  ```

### Linux

- Creates `.AppImage` (recommended) and `.deb` packages
- `.AppImage` is portable - no installation required
- To build `.deb`:
  ```bash
  sudo apt-get install rpm  # Required for build process
  ```

## Next Steps

1. **Review Documentation**: Read `ELECTRON_SETUP.md` and `frontend/ELECTRON_INTEGRATION.md`
2. **Try the Example**: Check `ElectronStorageExample.tsx` component
3. **Implement Features**: Add persistent storage to your components
4. **Test on macOS/Windows/Linux**: Use various machines or VMs
5. **Set Up Code Signing**: For production distribution
6. **Configure CI/CD**: Use GitHub Actions for automated builds

## Security Checklist

- ✅ Context isolation enabled (no direct Node.js access from React)
- ✅ Preload script validates all IPC calls
- ✅ Node integration disabled
- ✅ Only necessary APIs exposed through `electronAPI`

**Before distribution:**
- [ ] Code sign on macOS
- [ ] Code sign on Windows
- [ ] Test on each platform
- [ ] Review all exposed IPC APIs
- [ ] Enable auto-updates (optional)

## Resources

- **Electron Documentation**: https://www.electronjs.org/docs
- **Electron Builder**: https://www.electron.build/
- **Electron Store**: https://github.com/sindresorhus/electron-store
- **Context Isolation**: https://www.electronjs.org/docs/tutorial/context-isolation
- **IPC Communication**: https://www.electronjs.org/docs/api/ipc-main

## Support & Debugging

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 5173 in use | Kill process or change port in vite.config.ts |
| window.electronAPI undefined | Not running in Electron - check dev server is running |
| Data not persisting | Check file permissions in Application Support folder |
| Build fails | Ensure all dependencies installed: `npm install` |
| Hot reload not working | Check Vite dev server is running on port 5173 |

### Debug Commands

```bash
# Check for TypeScript errors
cd electron && npx tsc

# Check if Vite server is running
curl http://localhost:5173

# Check Electron logs
cd electron && npm run dev 2>&1 | head -50

# List Electron processes
ps aux | grep electron

# Clear cache
rm -rf electron/dist node_modules
npm install
```

## License

Same as main SalesDemo project.

---

**Happy Building! 🚀**

For detailed information, see:
- `ELECTRON_SETUP.md` - Setup and build guide
- `electron/README.md` - Electron-specific documentation
- `frontend/ELECTRON_INTEGRATION.md` - React integration guide

