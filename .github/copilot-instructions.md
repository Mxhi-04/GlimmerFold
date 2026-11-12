# GitHub Copilot Instructions for GlimmerFold

## Architectural Overview
GlimmerFold is an interactive 3D foil-embossed greeting card web application built with vanilla JavaScript, modern WebGL, and Three.js. It lets users turn photos into realistic embossed cards that open, catch dynamic lighting, shimmer with multi-layer foil effects, and can be shared as offline self-contained HTML files or URL hashes.

## Core Module Guidelines
- **`js/main.js`**: Core state orchestrator, UI binding, event loops, and 3D card lifecycle.
- **`js/surface.js`**: Three.js card mesh geometry, folding kinematics, material pipelines, and custom foil shaders.
- **`js/presets.js`**: Curated card designs, textures, foil patterns, and typographic layouts.
- **`js/fx.js`**: Confetti, particle emitters, sparkles, and ambient physics effects.
- **`js/package.js`**: Standalone card compiler that bundles shaders, Three.js modules, and assets into an offline single-file card.
- **`js/share.js`**: LZW/Deflate card state encoder/decoder for compact `#c=...` URL sharing.

## Shader & Math Conventions
- When writing custom fragment or vertex shaders for foil reflection, maintain energy conservation across metallic/roughness values.
- Foil highlights should blend normal map perturbation with view vector grazing angles (Schlick Fresnel approximation) for genuine iridescent sheen.
