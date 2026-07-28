---
name: audiomultitool-tuner
description: Pitch detection and instrument tuning using time-domain auto-correlation microphone tracking.
---
# Chromatic Instrument Tuner Skill

Exposes capabilities to analyze fundamental pitch frequencies in real-time from a microphone input stream.

## Parameters
- **Tuning Configuration**: Customizable string arrays targeting custom Hz frequencies (supports up to 12 strings).
- **Instrument Presets**: Standard default templates for:
  - Guitar (6-String: E2, A2, D3, G3, B3, E4)
  - Bass (4-String: E1, A1, D2, G2)
  - Ukulele (G4, C4, E4, A4)
  - Violin (G3, D4, A4, E5)
- **Reference Pitch**: A4 calibration frequency (default: 440 Hz).
- **Cents Offset**: Offset indicator range relative to the nearest target note.
