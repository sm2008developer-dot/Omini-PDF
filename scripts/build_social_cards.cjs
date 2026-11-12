const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 1. Master 1200x630 Social Share Banner SVG
const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="45%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#2a081a"/>
    </linearGradient>

    <!-- Crimson Rose Radial Glow -->
    <radialGradient id="roseGlow" cx="30%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#e11d48" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="#e11d48" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="purpleGlow" cx="80%" cy="25%" r="45%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Badge 3D Gradient -->
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="35%" stop-color="#e11d48"/>
      <stop offset="100%" stop-color="#9f1239"/>
    </linearGradient>

    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>

    <linearGradient id="foldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#e11d48" flood-opacity="0.4"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>

    <filter id="sheetShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#881337" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <rect width="1200" height="630" fill="url(#roseGlow)"/>
  <rect width="1200" height="630" fill="url(#purpleGlow)"/>

  <!-- Subtle Blueprint Matrix Grid Lines -->
  <g opacity="0.07" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="90" x2="1200" y2="90"/>
    <line x1="0" y1="180" x2="1200" y2="180"/>
    <line x1="0" y1="270" x2="1200" y2="270"/>
    <line x1="0" y1="360" x2="1200" y2="360"/>
    <line x1="0" y1="450" x2="1200" y2="450"/>
    <line x1="0" y1="540" x2="1200" y2="540"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Left: Circular 3D Brand Badge -->
  <g transform="translate(190, 315)">
    <!-- Outer Glow Rings -->
    <circle cx="0" cy="0" r="176" fill="none" stroke="#e11d48" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="8 6"/>
    <circle cx="0" cy="0" r="165" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.2"/>

    <!-- Main Badge Circle with Shadow -->
    <circle cx="0" cy="0" r="150" fill="url(#badgeGrad)" filter="url(#badgeShadow)"/>
    <circle cx="0" cy="0" r="148" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.35"/>

    <!-- Inner PDF Document Sheet -->
    <g filter="url(#sheetShadow)" transform="translate(-75, -95)">
      <!-- Document Body with Folded Top-Right Corner -->
      <path d="M12 0 C5 0 0 5 0 12 L0 186 C0 193 5 198 12 198 L138 198 C145 198 150 193 150 186 L150 50 L100 0 Z" fill="#ffffff"/>
      <!-- Corner Flap -->
      <path d="M100 0 L150 50 L100 50 Z" fill="url(#foldGrad)"/>
      <path d="M100 0 L100 50 L150 50 Z" fill="#f1f5f9" opacity="0.95"/>

      <!-- PDF Text Badge Bar on Sheet -->
      <rect x="0" y="125" width="150" height="52" rx="8" fill="#e11d48"/>
      <text x="75" y="163" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">PDF</text>

      <!-- Accent Lines on Paper -->
      <rect x="24" y="42" width="60" height="10" rx="5" fill="#e11d48" opacity="0.85"/>
      <rect x="24" y="66" width="102" height="9" rx="4.5" fill="#94a3b8" opacity="0.55"/>
      <rect x="24" y="88" width="86" height="9" rx="4.5" fill="#94a3b8" opacity="0.4"/>
    </g>

    <!-- AI Sparkle Emblem on Top-Left of Sheet -->
    <g transform="translate(-85, -100)">
      <path d="M18 0 C18 0 23 18 41 23 C23 28 18 46 18 46 C18 46 13 28 -5 23 C13 18 18 0 18 0 Z" fill="url(#amberGrad)"/>
      <circle cx="48" cy="8" r="5" fill="#fde047"/>
    </g>
  </g>

  <!-- Right: Typography & Brand Content -->
  <g transform="translate(430, 140)">
    <!-- Top Pill: AI Suite -->
    <rect x="0" y="0" width="280" height="36" rx="18" fill="#1e1b4b" stroke="#7c3aed" stroke-width="1.5"/>
    <text x="18" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#fbbf24" letter-spacing="1.5">✨ NEXT-GEN AI PDF SUITE</text>

    <!-- Big Bold Brand Title -->
    <text x="0" y="105" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="68" font-weight="900" fill="#ffffff" letter-spacing="-1.5">
      Omini<tspan fill="#f43f5e">PDF</tspan>
    </text>

    <!-- Subtitle / Value Proposition -->
    <text x="0" y="160" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#cbd5e1" letter-spacing="-0.5">
      Fast, Free &amp; Private Document Intelligence
    </text>

    <!-- Key Tools Pill Row -->
    <g transform="translate(0, 195)">
      <!-- Pill 1: Merge -->
      <rect x="0" y="0" width="112" height="34" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="56" y="22" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#f1f5f9" text-anchor="middle">Merge PDF</text>

      <!-- Pill 2: Split -->
      <rect x="124" y="0" width="105" height="34" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="176" y="22" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#f1f5f9" text-anchor="middle">Split PDF</text>

      <!-- Pill 3: Compress -->
      <rect x="241" y="0" width="135" height="34" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="308" y="22" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#f1f5f9" text-anchor="middle">Compress PDF</text>

      <!-- Pill 4: AI Summarizer -->
      <rect x="388" y="0" width="150" height="34" rx="10" fill="#31102f" stroke="#be123c" stroke-width="1.5"/>
      <text x="463" y="22" font-family="-apple-system, sans-serif" font-size="13" font-weight="800" fill="#f43f5e" text-anchor="middle">AI Summarizer</text>

      <!-- Pill 5: Chat with PDF -->
      <rect x="550" y="0" width="145" height="34" rx="10" fill="#1e1b4b" stroke="#7c3aed" stroke-width="1.5"/>
      <text x="622" y="22" font-family="-apple-system, sans-serif" font-size="13" font-weight="800" fill="#a78bfa" text-anchor="middle">Chat with PDF</text>
    </g>

    <!-- Bottom Feature Badges Bar -->
    <g transform="translate(0, 260)">
      <rect x="0" y="0" width="690" height="52" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      
      <text x="24" y="31" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#10b981">✓ 100% Client-Side Safe</text>
      <text x="220" y="31" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#f59e0b">⚡ Zero Wait Speed</text>
      <text x="400" y="31" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="#38bdf8">🌐 ominipdf.ai.studio</text>
      <text x="590" y="31" font-family="-apple-system, sans-serif" font-size="13" font-weight="800" fill="#fbbf24">🇮🇳 ₹99 Pass</text>
    </g>
  </g>
</svg>`;

// 2. Master Square 600x600 WhatsApp / Messenger Preview Card SVG
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="sqBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="45%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#2a081a"/>
    </linearGradient>

    <radialGradient id="sqGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#e11d48" stop-opacity="0.38"/>
      <stop offset="60%" stop-color="#7c3aed" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="sqBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="35%" stop-color="#e11d48"/>
      <stop offset="100%" stop-color="#9f1239"/>
    </linearGradient>

    <linearGradient id="sqAmber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>

    <linearGradient id="sqFold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <filter id="sqShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#e11d48" flood-opacity="0.45"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="600" height="600" fill="url(#sqBg)"/>
  <rect width="600" height="600" fill="url(#sqGlow)"/>

  <!-- Centered Circular 3D Badge -->
  <g transform="translate(300, 245)">
    <!-- Outer Glow Rings -->
    <circle cx="0" cy="0" r="176" fill="none" stroke="#e11d48" stroke-width="2" stroke-opacity="0.4" stroke-dasharray="8 6"/>
    <circle cx="0" cy="0" r="165" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25"/>

    <!-- Main Badge Circle -->
    <circle cx="0" cy="0" r="150" fill="url(#sqBadge)" filter="url(#sqShadow)"/>
    <circle cx="0" cy="0" r="148" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.4"/>

    <!-- Document Sheet inside Badge -->
    <g transform="translate(-75, -95)">
      <!-- Sheet Body -->
      <path d="M12 0 C5 0 0 5 0 12 L0 186 C0 193 5 198 12 198 L138 198 C145 198 150 193 150 186 L150 50 L100 0 Z" fill="#ffffff"/>
      <!-- Folded Flap -->
      <path d="M100 0 L150 50 L100 50 Z" fill="url(#sqFold)"/>
      <path d="M100 0 L100 50 L150 50 Z" fill="#f1f5f9" opacity="0.95"/>

      <!-- PDF Banner -->
      <rect x="0" y="125" width="150" height="52" rx="8" fill="#e11d48"/>
      <text x="75" y="163" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">PDF</text>

      <!-- Paper Lines -->
      <rect x="24" y="42" width="60" height="10" rx="5" fill="#e11d48" opacity="0.85"/>
      <rect x="24" y="66" width="102" height="9" rx="4.5" fill="#94a3b8" opacity="0.55"/>
      <rect x="24" y="88" width="86" height="9" rx="4.5" fill="#94a3b8" opacity="0.4"/>
    </g>

    <!-- Golden AI Sparkle -->
    <g transform="translate(-85, -100)">
      <path d="M18 0 C18 0 23 18 41 23 C23 28 18 46 18 46 C18 46 13 28 -5 23 C13 18 18 0 18 0 Z" fill="url(#sqAmber)"/>
      <circle cx="48" cy="8" r="5" fill="#fde047"/>
    </g>
  </g>

  <!-- Typography below the Badge -->
  <g transform="translate(300, 445)">
    <!-- Brand Name -->
    <text x="0" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">
      Omini<tspan fill="#f43f5e">PDF</tspan>
    </text>

    <!-- Subtitle -->
    <text x="0" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#fbbf24" text-anchor="middle" letter-spacing="2">
      SMART AI DOCUMENT SUITE
    </text>

    <!-- Feature Row Pill -->
    <rect x="-190" y="62" width="380" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="0" y="85" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="#cbd5e1" text-anchor="middle">
      Merge • Split • Compress • Gemini AI Chat
    </text>

    <!-- Domain -->
    <text x="0" y="125" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="middle">
      ominipdf.ai.studio
    </text>
  </g>
</svg>`;

const pubDir = path.resolve(__dirname, '../public');

// Render 1200x630 banner
const resvgBanner = new Resvg(bannerSvg, { fitTo: { mode: 'width', value: 1200 } });
const bannerPng = resvgBanner.render().asPng();
fs.writeFileSync(path.join(pubDir, 'og-image.png'), bannerPng);
console.log('✅ Generated public/og-image.png (1200x630)');

// Render 600x600 square card
const resvgSquare = new Resvg(squareSvg, { fitTo: { mode: 'width', value: 600 } });
const squarePng = resvgSquare.render().asPng();
fs.writeFileSync(path.join(pubDir, 'og-image-square.png'), squarePng);
console.log('✅ Generated public/og-image-square.png (600x600)');

// Render high-res favicons
const resvg192 = new Resvg(squareSvg, { fitTo: { mode: 'width', value: 192 } });
fs.writeFileSync(path.join(pubDir, 'favicon-192x192.png'), resvg192.render().asPng());

const resvg96 = new Resvg(squareSvg, { fitTo: { mode: 'width', value: 96 } });
fs.writeFileSync(path.join(pubDir, 'favicon-96x96.png'), resvg96.render().asPng());

const resvg48 = new Resvg(squareSvg, { fitTo: { mode: 'width', value: 48 } });
fs.writeFileSync(path.join(pubDir, 'favicon-48x48.png'), resvg48.render().asPng());

console.log('✅ Successfully generated all high-resolution social cards and favicons!');
