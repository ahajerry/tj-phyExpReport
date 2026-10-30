# Character ocean background

Adapted from https://github.com/jiezi1234/character-ocean at commit
52068c41c842a4023e07e496ba4767ac1a1ce19e.
Original animation derives from https://github.com/stackedlol/ascii-sharks.
The upstream ascii-sharks repository currently distributes its code under MIT
(Copyright (c) 2026 drewdi); see docs/licenses/ascii-sharks-MIT.txt.
The character-ocean frontend MIT notice is retained in docs/licenses/character-ocean-MIT.txt.
The source repository's older notices predate the upstream MIT license.

Local adaptation retains the world simulation, species, geometry and TYPE glyph
rasterization. Other six render styles, colored wake fields, grid, themes, central
panels, control interfaces, custom fonts and upstream build dependencies are omitted.
Rendering uses the existing Noto Sans SC font and monochrome light palette.
The React wrapper manages resize, animation, page visibility and reduced motion.
