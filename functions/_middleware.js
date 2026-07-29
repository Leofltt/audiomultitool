export async function onRequest(context) {
  const { request } = context;
  const acceptHeader = request.headers.get("Accept") || "";
  const url = new URL(request.url);
  const path = url.pathname;

  // Health & OpenAPI Spec endpoints
  if (path === "/health") {
    return new Response(JSON.stringify({ "status": "ok" }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  }

  if (path === "/openapi.json") {
    const openapi = {
      "openapi": "3.0.3",
      "info": {
        "title": "AudioMultiTool API",
        "version": "1.0.0",
        "description": "API endpoints for AudioMultiTool tools, including DNS-AID resolution and API catalog discovery."
      },
      "paths": {
        "/health": {
          "get": {
            "summary": "Check API health",
            "responses": {
              "200": {
                "description": "Healthy"
              }
            }
          }
        }
      }
    };
    return new Response(JSON.stringify(openapi), {
      headers: {
        "Content-Type": "application/openapi+json",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // 1. DNS-over-HTTPS (DoH) & JSON DNS resolver for DNS-AID
  if (path === "/dns-query" || path === "/resolve") {
    let name = "";
    let type = 64; // default SVCB
    let id = 0;
    let isBinary = false;

    try {
      if (request.method === "POST") {
        isBinary = true;
        const arrayBuffer = await request.arrayBuffer();
        const view = new DataView(arrayBuffer);
        if (arrayBuffer.byteLength >= 12) {
          id = view.getUint16(0);
          let offset = 12;
          const nameParts = [];
          while (offset < arrayBuffer.byteLength) {
            const len = view.getUint8(offset);
            if (len === 0) {
              offset += 1;
              break;
            }
            const chars = [];
            for (let i = 0; i < len; i++) {
              chars.push(String.fromCharCode(view.getUint8(offset + 1 + i)));
            }
            nameParts.push(chars.join(""));
            offset += 1 + len;
          }
          name = nameParts.join(".");
          if (offset + 2 <= arrayBuffer.byteLength) {
            type = view.getUint16(offset);
          }
        }
      } else {
        // GET request
        const dnsParam = url.searchParams.get("dns");
        if (dnsParam) {
          isBinary = true;
          let base64 = dnsParam.replace(/-/g, "+").replace(/_/g, "/");
          while (base64.length % 4) base64 += "=";
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const view = new DataView(bytes.buffer);
          if (len >= 12) {
            id = view.getUint16(0);
            let offset = 12;
            const nameParts = [];
            while (offset < len) {
              const labelLen = view.getUint8(offset);
              if (labelLen === 0) {
                offset += 1;
                break;
              }
              const chars = [];
              for (let i = 0; i < labelLen; i++) {
                chars.push(String.fromCharCode(view.getUint8(offset + 1 + i)));
              }
              nameParts.push(chars.join(""));
              offset += 1 + labelLen;
            }
            name = nameParts.join(".");
            if (offset + 2 <= len) {
              type = view.getUint16(offset);
            }
          }
        } else {
          name = url.searchParams.get("name") || "";
          const typeStr = url.searchParams.get("type") || "SVCB";
          if (typeStr.toUpperCase() === "HTTPS" || typeStr === "65") {
            type = 65;
          } else {
            type = 64;
          }
        }
      }
    } catch (e) {
      return new Response("DNS parse error", { status: 400 });
    }

    if (name.endsWith(".")) {
      name = name.slice(0, -1);
    }

    let baseDomain = "audiomultitool.com";
    if (name.includes("_agents.")) {
      baseDomain = name.substring(name.indexOf("_agents.") + 8);
    } else {
      baseDomain = url.hostname;
    }

    let capText = "";
    try {
      const capRes = await context.env.ASSETS.fetch(new Request(url.origin + "/.well-known/mcp/server-card.json"));
      capText = await capRes.text();
    } catch (e) {
      capText = JSON.stringify({
        "serverInfo": {
          "name": "AudioMultiTool MCP Server",
          "version": "1.0.0"
        },
        "endpoint": `https://${baseDomain}/mcp`,
        "capabilities": {
          "tools": {},
          "resources": {},
          "prompts": {}
        }
      });
    }

    const capUrl = `https://${baseDomain}/.well-known/mcp/server-card.json`;
    const capHash = await getSha256Base64Url(capText);

    if (isBinary) {
      const responseBuffer = buildDnsResponse(id, name, type, baseDomain, capUrl, capHash);
      return new Response(responseBuffer, {
        headers: {
          "Content-Type": "application/dns-message",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } else {
      const jsonResponse = handleJsonDnsQuery(name, type, baseDomain, capUrl, capHash);
      return new Response(JSON.stringify(jsonResponse), {
        headers: {
          "Content-Type": "application/dns-json",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
  }

  // 2. RFC 9727 API Catalog Endpoint
  if (path === "/.well-known/api-catalog") {
    const apiCatalog = {
      "linkset": [
        {
          "anchor": `${url.origin}/`,
          "service-desc": [
            {
              "href": `${url.origin}/openapi.json`,
              "type": "application/openapi+json"
            }
          ],
          "service-doc": [
            {
              "href": `${url.origin}/`,
              "type": "text/html"
            }
          ],
          "status": [
            {
              "href": `${url.origin}/health`,
              "type": "application/json"
            }
          ]
        }
      ]
    };
    return new Response(JSON.stringify(apiCatalog), {
      headers: {
        "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // 3. OAuth Protected Resource Metadata
  if (path === "/.well-known/oauth-protected-resource") {
    const oauthProtectedResource = {
      "resource": "https://audiomultitool.com",
      "authorization_servers": [
        "https://audiomultitool.com"
      ],
      "scopes_supported": ["read", "write"],
      "bearer_methods_supported": ["header"]
    };
    return new Response(JSON.stringify(oauthProtectedResource), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // 4. OAuth Authorization Server Metadata & OpenID Connect Discovery Metadata
  if (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration") {
    const authServerMetadata = {
      "issuer": "https://audiomultitool.com",
      "authorization_endpoint": "https://audiomultitool.com/oauth/authorize",
      "token_endpoint": "https://audiomultitool.com/oauth/token",
      "jwks_uri": "https://audiomultitool.com/oauth/jwks",
      "grant_types_supported": ["authorization_code", "client_credentials"],
      "response_types_supported": ["code"],
      "agent_auth": {
        "skill": "https://audiomultitool.com/.well-known/agent-skills/index.json",
        "register_uri": "https://audiomultitool.com/agent/register",
        "identity_types_supported": ["anonymous"],
        "anonymous": {
          "credential_types_supported": ["api_key"]
        },
        "claim_uri": "https://audiomultitool.com/agent/claim"
      }
    };
    return new Response(JSON.stringify(authServerMetadata), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Bypass assets (css, js, images, metadata)
  const isAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|json|xml|txt|webmanifest)$/i.test(path);

  // If the requesting agent explicitly requests markdown and it's not an asset
  if (acceptHeader.includes("text/markdown") && !isAsset) {
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
    } else if (path.includes("/noise")) {
      title = "Sound Level Meter & Noise Generator - AudioMultiTool";
      body = `
# Sound Level Meter & Noise Generator - AudioMultiTool
This tool provides decibel volume level tracking and white, pink, and brown noise playback.

## Specifications:
- Decibel meter with real-time mic amplitude RMS calculations.
- Live min/max dB peak counters.
- Procedural audio buffer generation for white, pink, and brownian sound noise.
`;
    } else if (path.includes("/converter")) {
      title = "Online Client-Side Audio Converter - AudioMultiTool";
      body = `
# Online Client-Side Audio Converter - AudioMultiTool
This tool provides secure, browser-native audio transcoding to MP3 and WAV without server uploads.

## Specifications:
- Local browser file decoding (AudioContext PCM unpack).
- 100% private processing (no remote uploads).
- Fast WAV byte writer and chunk-encoded LAME MP3 conversion.
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

    const tokenEstimate = Math.ceil(markdown.trim().length / 4);

    return new Response(markdown.trim(), {
      headers: {
        "Content-Type": "text/markdown",
        "x-markdown-tokens": tokenEstimate.toString(),
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Otherwise, proceed to standard static HTML/CSS file delivery
  return await context.next();
}

// Helpers for DNS-AID SVCB parameter encoding
function domainToBytes(domain) {
  const parts = domain.split(".");
  const bytes = [];
  for (const part of parts) {
    if (part.length === 0) continue;
    bytes.push(part.length);
    for (let i = 0; i < part.length; i++) {
      bytes.push(part.charCodeAt(i));
    }
  }
  bytes.push(0);
  return bytes;
}

function stringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

function uint8ToBase64Url(uint8) {
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getSha256Base64Url(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return uint8ToBase64Url(new Uint8Array(hashBuffer));
}

// DoH response builder for SVCB/HTTPS
function buildDnsResponse(id, name, type, baseDomain, capUrl, capHash) {
  const nameParts = name.split(".");
  const nameBytes = [];
  for (const part of nameParts) {
    if (part.length === 0) continue;
    nameBytes.push(part.length);
    for (let i = 0; i < part.length; i++) {
      nameBytes.push(part.charCodeAt(i));
    }
  }
  nameBytes.push(0);

  const targetBytes = domainToBytes("agent." + baseDomain);

  const capUrlBytes = stringToBytes(capUrl);
  const capHashBytes = stringToBytes(capHash);

  const paramBytes = [
    // key 0 (mandatory)
    0, 0,
    // len 8
    0, 8,
    // value: [1, 3, 65400, 65401]
    0, 1,
    0, 3,
    255, 120,
    255, 121,
    
    // key 1 (alpn)
    0, 1,
    // len 4
    0, 4,
    // value (length-prefixed strings: 3, 'a', '2', 'a')
    3, 97, 50, 97,
    
    // key 3 (port)
    0, 3,
    // len 2
    0, 2,
    // value 443 (0x01bb)
    1, 187,

    // key 65400 (cap)
    255, 120,
    // len
    (capUrlBytes.length >> 8) & 0xff, capUrlBytes.length & 0xff,
    ...capUrlBytes,

    // key 65401 (cap-sha256)
    255, 121,
    // len
    (capHashBytes.length >> 8) & 0xff, capHashBytes.length & 0xff,
    ...capHashBytes
  ];

  const rdata = [...[0, 1], ...targetBytes, ...paramBytes];
  const rdlength = rdata.length;

  const packetLength = 12 + nameBytes.length + 4 + 2 + 2 + 2 + 4 + 2 + rdlength;
  const buffer = new ArrayBuffer(packetLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Header
  view.setUint16(0, id);
  view.setUint16(2, 0x81a0); // Flags: QR=1, AA=1, RD=1, RA=1, AD=1 (DNSSEC Authentic Data)
  view.setUint16(4, 1);
  view.setUint16(6, 1);
  view.setUint16(8, 0);
  view.setUint16(10, 0);

  // Question Section
  let offset = 12;
  for (const b of nameBytes) {
    bytes[offset++] = b;
  }
  view.setUint16(offset, type);
  offset += 2;
  view.setUint16(offset, 1); // Class IN
  offset += 2;

  // Answer Section
  view.setUint16(offset, 0xc00c); // Pointer to Question Name
  offset += 2;
  view.setUint16(offset, type);
  offset += 2;
  view.setUint16(offset, 1); // Class IN
  offset += 2;
  view.setUint32(offset, 3600); // TTL
  offset += 4;
  view.setUint16(offset, rdlength);
  offset += 2;
  for (const b of rdata) {
    bytes[offset++] = b;
  }

  return buffer;
}

// JSON DoH responder
function handleJsonDnsQuery(name, type, baseDomain, capUrl, capHash) {
  const isHttps = type === 65;
  const typeCode = isHttps ? 65 : 64;
  const typeStr = isHttps ? "HTTPS" : "SVCB";

  return {
    "Status": 0,
    "TC": false,
    "RD": true,
    "RA": true,
    "AD": true, // DNSSEC Authentic Data flag
    "Question": [
      {
        "name": name + ".",
        "type": typeCode
      }
    ],
    "Answer": [
      {
        "name": name + ".",
        "type": typeCode,
        "TTL": 3600,
        "data": `1 agent.${baseDomain}. alpn="a2a" port=443 mandatory=alpn,port,key65400,key65401 key65400="${capUrl}" key65401="${capHash}"`
      }
    ]
  };
}
