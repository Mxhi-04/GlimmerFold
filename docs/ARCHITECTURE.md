# GlimmerFold Architecture Specification

## 1. Graphics Pipeline

```
User Input (Image / Preset)
         │
         ▼
  Foil Mask Generation (shapes.js / canvas thresholding)
         │
         ▼
  Multi-layer Material Mesh (surface.js)
  ├── Diffuse / Paper Texture (substrate albedo)
  ├── Micro-emboss Normal Map (height indentation)
  ├── Specular Foil Layer (anisotropic specular sheen)
  └── Iridescence Modulation (fresnel view-angle color shift)
         │
         ▼
  Kinematic Rigging (Two-leaf hinge model with angular limits)
         │
         ▼
  Three.js WebGL Renderer (Camera, RoomEnvironment, shadow mapping)
```

## 2. Card Serialization Schema

Share links compress state using base64-encoded JSON or URL hash keys:
- `v`: Schema version integer (`1`)
- `p`: Preset ID string (e.g. `"happiness"`, `"botanical"`)
- `img`: Base64 compressed image payload for custom uploads
- `s`: Selected state object containing foil tint, paper substrate, message typography, and particle settings.

