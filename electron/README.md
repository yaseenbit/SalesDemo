# SalesDemo Electron Wrapper

This directory contains the Electron wrapper for the SalesDemo POS web application.

## Project Structure

```
electron/
├── src/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # Preload script for context isolation
├── package.json         # Electron app dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
cd electron
npm install
```

## Development

Run the app in development mode with hot reload:

```bash
npm run dev
```

This will:
1. Start the Vite development server for the web app (on port 5173)
2. Automatically open the Electron app once the dev server is ready
3. Enable hot reload for React components
4. Enable DevTools in the Electron window

## Building

### Build for Development

Build the web app and run the Electron app:

```bash
npm start
```

### Build for Distribution

Create distributable packages:

```bash
npm run build
```

This will:
1. Build the React web app with Vite
2. Compile TypeScript for Electron
3. Run electron-builder to create platform-specific installers

### Platform-Specific Builds

The build configuration in `package.json` supports:

- **macOS**: DMG and ZIP distributions
- **Windows**: NSIS installer and portable EXE
- **Linux**: AppImage and DEB package

## Features

### Data Persistence

The app uses `electron-store` for persistent data storage. Access it from the React app via the `window.electronAPI.store` interface:

```typescript
// In your React components
const saveData = async (key: string, value: unknown) => {
  await window.electronAPI.store.set(key, value);
};

const loadData = async (key: string) => {
  return await window.electronAPI.store.get(key);
};
```

### Context Isolation

The Electron app uses context isolation for security. The preload script exposes only safe APIs to the renderer process.

## Development Tips

### DevTools

DevTools are automatically opened in development mode. You can toggle them with Ctrl+Shift+I (or Cmd+Option+I on macOS).

### Hot Reload

The React app will hot-reload when you save changes. The Electron window will need to be manually refreshed (Ctrl+R) for main process changes.

### Environment Variables

Set `NODE_ENV=development` to enable dev mode features:

```bash
NODE_ENV=development npm run dev
```

## Troubleshooting

### Port 5173 Already in Use

If port 5173 is already in use, you can change it in `frontend/vite.config.ts`:

```typescript
server: {
  port: 5174, // Change this
}
```

Then update the same port in `electron/src/main.ts`:

```typescript
const startUrl = isDev
  ? 'http://localhost:5174'
  : ...
```

### Build Fails

Ensure both the frontend and electron packages are installed:

```bash
npm install              # Install electron dependencies
cd ../frontend && npm install  # Install frontend dependencies
```

## License

Same as the main SalesDemo project.

