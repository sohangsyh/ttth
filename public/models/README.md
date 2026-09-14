Place Draco-compressed GLTF models here:

- `bedroom-environment.glb` — walls, floor base, bed, old-man figure (see src/scene/models/Room.tsx)
- `floorboards.glb` — 16 plank nodes named `Plank_00`..`Plank_15` (see src/scene/models/Floorboards.tsx)
- `props.glb` — nodes named `Lantern`, `TreasureChest`, `PoliceHat` (see src/scene/models/Props.tsx)

None of these are required — every loader has a primitive-geometry fallback
if the file is missing or fails to load.
