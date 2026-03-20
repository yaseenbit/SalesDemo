# SalesDemo

A frontend-only sales management demo built with React and Vite.

## What it includes

- Navigation sidebar with separate views for overview, customers, orders, and POS
- Expandable accordion sidebar groups with hide/open support
- Full-width layout shell with no gap between sidebar and main content
- Sales order workspace with editable line items and live totals
- Customer add, edit, search, and list flows
- POS sales screen with large order-item area and barcode scan entry
- Re-scanning the same barcode increments quantity automatically
- Modern colorful UI for faster daily workflows
- Browser-based persistence with `localStorage` so the demo keeps your changes locally

## Project structure

- `frontend/` - React application
- `SalesDemo.slnx` - existing solution placeholder kept unchanged

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Then open the local URL shown in the terminal, usually `http://localhost:5173`.

## Build for production

```bash
cd frontend
npm run build
```

The production files are generated in `frontend/dist`.

## Notes

- No backend is included right now.
- Customer and draft order data are stored only in the browser.

