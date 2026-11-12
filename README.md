# ✨ GlimmerFold

> **Living foil-embossed greeting cards in 3D.** Turn any picture into an interactive foil card that opens, catches light, shimmers, and comes alive — shareable with a single link or offline single-file download.

---

## 🌟 Highlights

- **Real-time 3D Foil Shaders**: Dynamic metallic reflection, micro-embossing depth, and multi-angle specular gleam (Gold, Silver, Rose Gold, Holographic, Emerald, and Copper).
- **Physical Paper Substrates**: Realistic paper tactile textures including Cotton Rag, Textured Linen, Matte Kraft, and Fine Vellum.
- **Interactive Card Kinematics**: Drag to inspect at any angle; tap or click to realistically unfold the card and reveal personal messages.
- **Occasions & Presets**: Built-in library of curated templates for Birthdays, Celebrations, Weddings, Expressions of Love, and Thank You notes.
- **Ambient Life & Particle Dynamics**: Atmospheric particle systems with floating petals, confetti, sparkles, and light ribbons.
- **Zero-Backend Sharing**:
  - **Shareable Links**: Encodes complete card layouts, personal notes, and photo data directly into URL hashes.
  - **Standalone File Bundle**: Packages the entire 3D WebGL runtime, card data, and textures into an offline `.html` file that opens anywhere with zero dependencies.

---

## 🚀 Quick Start

Run the local development server (Python 3.8+ required):

```bash
# Start the multi-threaded dev server
python3 serve.py 5173
```

Then visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Architecture

```
GlimmerFold/
├── index.html        # Main studio stage, 3D viewport & control deck
├── brand.html        # Brand identity, typography, and logo system
├── serve.py          # Multi-threaded zero-cache HTTP server
├── assets/           # Vector branding, icons, and marks
│   ├── glimmerfold-icon.svg
│   └── glimmerfold-mark.svg
├── js/
│   ├── main.js       # App lifecycle, scene graph, event listeners
│   ├── surface.js    # WebGL card mesh, fold physics, foil shaders
│   ├── presets.js    # Preset collection, foil profiles & paletted themes
│   ├── gallery.js    # Template picker and preview card renderers
│   ├── fx.js         # Particle emitters, confetti & celebratory effects
│   ├── shapes.js     # Procedural foil stamping masks and outlines
│   ├── life.js       # Dynamic ambient card animations
│   ├── occasions.js  # Occasion categories and metadata
│   ├── share.js      # Compact URL state serializer & unpacker
│   └── package.js    # Self-contained offline HTML card bundler
└── sample-cards/     # Pre-packaged interactive sample cards
```

---

## 🌐 Browser Compatibility

| Browser | Status | Features Supported |
| :--- | :---: | :--- |
| **Chrome / Edge / Chromium** | ✅ | Full WebGL2 foil shaders, RoomEnvironment PBR, offline export |
| **Safari / WebKit (iOS & macOS)** | ✅ | Full PBR, touch kinematics, offline single-file cards |
| **Firefox** | ✅ | Full WebGL shaders, particle systems, zero-dependency share |
| **Mobile Browsers** | ✅ | Unified touch gestures, tilt response, responsive viewport |

---

## 🛠️ Tech Stack

- **Graphics**: [Three.js](https://threejs.org/) (WebGL), custom GLSL surface illumination shaders
- **Frontend**: Vanilla ES modules, modern CSS custom properties
- **Packaging**: Base64 data streaming, Blob compilation, offline Data URI import maps
- **Deploy**: Static file architecture, zero backend requirement — ready for Vercel, Netlify, or GitHub Pages

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
