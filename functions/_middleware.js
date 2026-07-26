export async function onRequest(context) {
  const { request } = context;
  const acceptHeader = request.headers.get("Accept") || "";

  // If the requesting agent explicitly requests markdown
  if (acceptHeader.includes("text/markdown")) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    let title = "AudioMultiTool Web Audio Suite";
    let body = "Welcome to AudioMultiTool. This is a client-side suite of browser audio calibration and utility tools.";

    if (path.includes("/tuner")) {
      title = "Chromatic Instrument Tuner - AudioMultiTool";
      body = `
# Chromatic Instrument Tuner - AudioMultiTool
This utility uses microphone auto-correlation algorithm pitch tracking to identify notes and cents offsets in browser.

## Specifications:
- Auto-correlation pitch tracker (FFT).
- Custom Mic permissions wrapper.
- Cents offsets and standard reference note displays.
- Visual needle calibration indicator.
`;
    } else if (path.includes("/tapper")) {
      title = "BPM Tapper - AudioMultiTool";
      body = `
# BPM Tapper & Beats Counter - AudioMultiTool
This tool calculates tempo in Beats Per Minute (BPM) based on keystroke or click intervals.

## Specifications:
- Dynamic tap-averaging calculation.
- Genre recommendation engine based on BPM values.
- History log of previous taps.
`;
    } else if (path.includes("/sweep")) {
      title = "Speaker Sweep Tester - AudioMultiTool";
      body = `
# Speaker Sweep Tester - AudioMultiTool
This tool sweeps audio pitches logarithmically between start and end frequencies.

## Specifications:
- Custom sweep bounds (e.g. 20Hz - 20,000Hz).
- Logarithmic frequency progressions.
- Dynamic sweep duration controller.
`;
    } else if (path.includes("/recorder")) {
      title = "Online Audio Recorder - AudioMultiTool";
      body = `
# Online Audio Recorder - AudioMultiTool
This tool records voice microphone signals or system sound loopbacks.

## Specifications:
- Multi-source options (microphone vs system sound loopback).
- Client-side WebM encoding container.
- Local play preview and download generator.
`;
    } else {
      title = "Tone Generator & Oscillator - AudioMultiTool";
      body = `
# Tone Generator - AudioMultiTool
This tool generates pure audio frequencies with geometric waveforms.

## Specifications:
- Oscillators: Sine, Square, Sawtooth, Triangle.
- Custom numerical frequency input.
- Preset frequency shortcuts (100Hz, 440Hz, 1kHz, 10kHz).
`;
    }

    const markdown = `
# ${title}
${body}

## Global Catalog:
Discover all available APIs and tools at: https://audiomultitool.com/.well-known/api-catalog.json
`;

    return new Response(markdown.trim(), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Otherwise, proceed to standard static HTML/CSS file delivery
  return await context.next();
}
