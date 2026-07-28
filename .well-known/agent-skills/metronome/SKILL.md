---
name: audiomultitool-metronome
description: Precision sample-accurate audio metronome, tap tempo calculator, and network-synced sessions.
---
# Audio Metronome & Tap Tempo Skill

Exposes capability to configure a high-precision audio metronome using the Web Audio API scheduler loop, calculate BPM via manual keystrokes or click events, and synchronize beat grids across the network.

## Parameters
- **BPM**: Tempo in Beats Per Minute (range: 10 - 300).
- **Time Signature**: Beats per measure (e.g. 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, or custom value up to 32).
- **Subdivision**: Subdivisions per beat (1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x).
- **Sound Profile**: Click sound types (Classic Woodblock, Digital Beep, Acoustic Rimshot).
- **Sync mode**: Absolute Unix Epoch time-grid alignment for cross-device synchronized metronome sessions.
