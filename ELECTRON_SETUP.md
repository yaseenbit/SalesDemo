# Electron Setup Guide for SalesDemo

This guide explains how to set up and use the Electron wrapper for the SalesDemo web application.

## Overview

The Electron wrapper allows you to run the SalesDemo POS application as a native desktop app on macOS, Windows, and Linux. It wraps the existing React/Vite web app and provides desktop-specific features like native menus, application menu bar, and persistent local storage.

## Directory Structure

```
SalesDemo/
├── frontend/              # Existing React/Vite web app
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── electron/              # New Electron wrapper (this guide)
│   ├── src/
│   │   ├── main.ts        # Electron main process
│   │   └── preload.ts     # Context isolation preload
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install electron dependencies
cd ../electron
npm install
```

### 2. Run in Development

From the `electron` directory:

```bash
npm run dev
```

This will:
- Start the Vite dev server on `http://localhost:5173`
- Automatically launch the Electron app
- Enable hot-reload for React components
- Open DevTools for debugging

### 3. Build for Production

```bash
npm run build
```

This creates distributable packages in `electron/out/` directory.

## Available Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server + Electron app with hot reload |
| `npm run dev:vite` | Start only the Vite dev server |
| `npm run dev:electron` | Start only the Electron app |

### Building

| Command | Description |
|---------|-------------|
| `npm start` | Build frontend and start Electron app |
| `npm run build` | Build for distribution |
| `npm run build:vite` | Build frontend only |
| `npm run build:electron` | Compile Electron code and run electron-builder |
| `npm run pack` | Create installers without signing |
| `npm run dist` | Create signed, distributable packages |

## Configuration

### Application Settings

Edit `electron/src/main.ts` to customize:

- **Window size**: Change `width` and `height` in `createWindow()`
- **Dev mode behavior**: Modify the `isDev` check
- **File paths**: Adjust paths based on your structure

### Build Configuration

Edit `electron/package.json` under the `"build"` section to customize:

- **Application name**: `"productName"`
- **Target platforms**: `"mac"`, `"win"`, `"linux"`
- **Build output locations**: `"directories"`
- **Assets**: Icon and resource files

### Persisting Data

The Electron app provides persistent storage through IPC:

```typescript
// Save data
await window.electronAPI.store.set('my-key', { data: 'value' });

// Load data
const data = await window.electronAPI.store.get('my-key');

// Delete data
await window.electronAPI.store.delete('my-key');
```

Data is stored in:
- **macOS**: `~/Library/Application Support/salesdemo-electron/`
- **Windows**: `%APPDATA%/salesdemo-electron/`
- **Linux**: `~/.config/salesdemo-electron/`

## Development Workflow

### Making Changes to React Components

1. Edit files in `frontend/src/`
2. Changes automatically hot-reload in the Electron window
3. No need to restart the Electron app

### Making Changes to Electron Main Process

1. Edit files in `electron/src/`
2. These changes won't hot-reload
3. Manually reload the window with Ctrl+R (or Cmd+R)
4. Or restart the Electron app

### Making Changes to IPC APIs

1. Update `electron/src/main.ts` (main process)
2. Update `electron/src/preload.ts` (exposed APIs)
3. Update any TypeScript types if needed
4. Restart the Electron app

## Troubleshooting

### Port 5173 Already in Use

Change the port in `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,  // Change this number
  },
});
```

### Electron App Won't Start

Check that:
1. Frontend build succeeded: `cd frontend && npm run build`
2. Port 5173 is accessible
3. No TypeScript compilation errors: `cd electron && npx tsc`

### DevTools Won't Open

DevTools are automatically opened in development mode. If they don't appear:
1. Check that `isDev` is being detected correctly
2. Try manually opening with Ctrl+Shift+I

### Build Fails on Windows

Windows builds may require:
- Visual Studio Build Tools
- Windows SDK
- Latest Node.js LTS

## Platform-Specific Notes

### macOS

- Builds create `.dmg` (installer) and `.zip` (portable)
- Requires `electron-builder` configuration for code signing
- Set `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip signing during development

### Windows

- Builds create NSIS installer and portable `.exe`
- Requires `inno-setup` for NSIS builds (optional, can skip with `--dir`)
- Building on non-Windows requires Docker or WSL

### Linux

- Builds create `.AppImage` and `.deb` packages
- AppImage is recommended for distribution
- DEB requires additional build tools

## Next Steps

1. **Customize the app icon**: Add an icon to `electron/assets/icon.png`
2. **Update application info**: Edit `productName` and other fields in `electron/package.json`
3. **Configure signing**: Set up code signing for macOS and Windows releases
4. **Set up CI/CD**: Use GitHub Actions or similar for automated builds
5. **Add auto-updates**: Consider using `electron-updater` for automatic updates

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Context Isolation in Electron](https://www.electronjs.org/docs/tutorial/context-isolation)
- [IPC in Electron](https://www.electronjs.org/docs/api/ipc)

## Support

For issues specific to:
- **React/Vite**: See `frontend/README.md`
- **Electron wrapper**: Check `electron/README.md`
- **Overall app**: See main `README.md`

