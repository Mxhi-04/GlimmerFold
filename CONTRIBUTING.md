# Contributing to GlimmerFold

Thank you for your interest in improving GlimmerFold! We welcome additions of new card themes, foil effects, paper materials, and shader enhancements.

## Development Workflow

1. Clone or pull the repository:
   ```bash
   git clone https://github.com/Mxhi-04/GlimmerFold.git
   cd GlimmerFold
   ```

2. Start the local development server:
   ```bash
   python3 serve.py 5173
   # or via npm script:
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Adding New Presets or Occasions

- **New Presets**: Define preset card parameters in `js/presets.js`. Provide unique IDs, default foil types, message layouts, and lighting settings.
- **New Occasion Categories**: Add category entries to `js/occasions.js`.
- **Foil Surface Tuning**: Adjust specular roughness and normal map response in `js/surface.js`.

## Code Guidelines

- Keep the core engine pure vanilla ES modules.
- Ensure all resources (textures, geometries, materials) are properly disposed of when switching presets to maintain stable WebGL memory.
- Verify touch events and pointer kinematics on mobile devices.
