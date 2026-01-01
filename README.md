# UIForge

A browser-based visual WYSIWYG editor for EverQuest custom UIs.

## Features

- **Visual Canvas** - Real-time WYSIWYG editing with drag/drop, resize handles
- **Element Tree** - Hierarchical view of all UI components
- **Property Inspector** - Edit positions, colors, styles, templates
- **Texture Manager** - Import textures, define frame regions
- **Full Import/Export** - Load existing EQ UIs, save valid XML

## Tech Stack

- Vue 3 + TypeScript
- Konva.js (vue-konva) for canvas rendering
- Pinia for state management
- Vite for builds
- Caddy for production serving (Railway deployment)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment

The app is configured for deployment on Railway using Docker + Caddy:

1. Push to GitHub
2. Connect repository in Railway dashboard
3. Railway auto-detects Dockerfile and builds
4. Generate domain in service settings

## Project Structure

```
src/
├── components/       # Vue components
│   ├── canvas/       # Visual editor canvas
│   ├── layout/       # App shell
│   └── panels/       # Side panels
├── core/             # Engine modules
│   ├── parser/       # SIDL & EQUI XML parsing
│   ├── renderer/     # Canvas rendering
│   └── texture/      # Texture management
├── models/           # TypeScript types
│   ├── base/         # Primitives (RGB, Point, Size)
│   ├── elements/     # UI element interfaces
│   └── project/      # Project structure
└── stores/           # Pinia state management
```

## EverQuest UI Reference

- [Custom User Interfaces Wiki](https://wiki.project1999.com/Custom_User_Interfaces)
- SIDL.xml defines the element schema
- EQUI_*.xml files contain individual window definitions

## License

See [LICENSE](LICENSE) for details.
