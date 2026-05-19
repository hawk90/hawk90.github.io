// Procedural OG theme generator.
//
// Every series in the blog gets its own card design without a per-series
// hand-tuned palette. The hue comes from the series' *category* (so the
// C++ books, the math books, the embedded books each share a color
// family), and a small deterministic hash of the series name shifts the
// hue within that family so siblings stay distinct.
//
// Consumed by:
//   • src/lib/og-themes.ts   (Astro runtime — typed wrapper)
//   • scripts/build-og.mjs   (pre-build social-card generator)
//
// Adding a new series? Add an entry to SERIES_CATEGORY. New entries
// without a mapping fall back to the `default` category (neutral violet),
// which is fine but a real category looks better.

// ─── Category palettes ─────────────────────────────────────────
// Each category picks a base hue on the HSL wheel. The procedural
// generator derives bg/accent/text from this hue, with sensible saturation
// and lightness defaults that can be overridden per category if needed.
const CATEGORIES = {
  cpp:         { hue: 270 },                       // violet
  python:      { hue: 95,  accentSat: 60, accentLight: 55 }, // lime
  design:      { hue: 350 },                       // rose
  engineering: { hue: 165 },                       // sea green
  algorithms:  { hue: 45,  accentLight: 60 },      // amber
  git:         { hue: 18 },                        // red-orange
  systems:     { hue: 220 },                       // slate-blue
  embedded:    { hue: 135 },                       // forest green
  standards:   { hue: 235, accentSat: 55 },        // formal blue-gray
  avionics:    { hue: 5,   accentSat: 70 },        // crimson
  parallel:    { hue: 185 },                       // teal
  math:        { hue: 250 },                       // indigo
  statistics:  { hue: 285 },                       // royal purple
  ml:          { hue: 305 },                       // magenta-violet
  tools:       { hue: 200 },                       // sky-blue
  media:       { hue: 325 },                       // fuchsia
  writing:     { hue: 50,  accentLight: 60 },      // warm gold
  philosophy:  { hue: 30,  accentSat: 55 },        // sand
  default:     { hue: 265, accentSat: 55 },        // muted violet (fallback)
};

// ─── Series → category mapping ────────────────────────────────
const SERIES_CATEGORY = {
  // C++ language
  'Effective Modern C++': 'cpp',
  'Effective C++': 'cpp',
  'Beautiful C++': 'cpp',
  'C++ Software Design': 'cpp',
  '전문가를 위한 C': 'cpp',
  '전문가를 위한 C++': 'cpp',
  'Abseil C++ 라이브러리': 'cpp',
  'Folly C++ 라이브러리': 'cpp',

  // Python
  'Fluent Python': 'python',

  // Design / Architecture
  'GoF Design Patterns': 'design',
  'UML 2.5.1': 'design',
  'Object-Oriented Software Construction': 'design',
  'Object-Oriented Analysis and Design with Applications': 'design',
  'Refactoring': 'design',
  'Refactoring Catalog (Fowler 2nd ed)': 'design',
  'Clean Architecture': 'design',
  'Domain-Driven Design': 'design',
  'The Design of Everyday Things': 'design',

  // Software engineering
  'Clean Code': 'engineering',
  'Code Complete': 'engineering',
  'The Pragmatic Programmer': 'engineering',
  'The Mythical Man-Month': 'engineering',
  'The Art of UNIX Programming': 'engineering',
  'Peopleware': 'engineering',
  'Hackers and Painters': 'engineering',
  'Khorikov Unit Testing': 'engineering',
  'Growing Object-Oriented Software': 'engineering',
  'Working Effectively with Legacy Code': 'engineering',
  'TDD by Example': 'engineering',
  'TDD by Example — Patterns Deep Dive': 'engineering',
  'Agile & Lean Software Engineering': 'engineering',
  'gtest 심화': 'engineering',
  'pytest 심화': 'engineering',

  // Algorithms
  'SICP': 'algorithms',
  'Programming Pearls': 'algorithms',
  'Data Structures and Algorithms': 'algorithms',

  // Git
  'Git Conventions': 'git',
  'Git Flow': 'git',
  'Pro Git': 'git',

  // Systems
  'Operating Systems: Three Easy Pieces': 'systems',
  'APUE': 'systems',
  'Linux Device Drivers (LDD3)': 'systems',
  'Code: The Hidden Language': 'systems',
  "Computer Systems: A Programmer's Perspective": 'systems',
  '리눅스 커널의 구조와 원리': 'systems',
  'ARMv8-A Architecture Reference Manual': 'systems',
  'RISC-V Vector Extension': 'systems',
  'RISC-V ISA 해부': 'systems',
  'RISC-V 베어메탈 부트': 'systems',

  // Embedded
  'Embedded C++ for Real Systems': 'embedded',
  'NVMe Deep Dive': 'embedded',
  'The Zynq Book': 'embedded',
  'BoW 개요': 'embedded',
  'CXL 심화': 'embedded',
  'HBM·GDDR 심화': 'embedded',
  'CXL 4.0 Spec Full Review': 'embedded',
  'UCIe 심화': 'embedded',
  'DDR Memory Deep Dive': 'embedded',
  'UALink 심화': 'embedded',
  'PCIe Deep Dive': 'embedded',
  'Embedded Security': 'embedded',
  'Yocto Deep Dive': 'embedded',
  'Bootloader Internals': 'embedded',
  'Embedded Performance Engineering': 'embedded',
  'BSP Development': 'embedded',
  'Getting Started with BLE': 'embedded',
  'Modern Embedded Recipes': 'embedded',
  'RISC-V 임베디드 실습': 'embedded',
  'Buildroot Practical': 'embedded',
  'Mastering the FreeRTOS Real Time Kernel': 'embedded',
  'Practical RTOS Internals': 'embedded',
  'ESP32-C3 Mastering': 'embedded',
  'MIPI 심화': 'embedded',
  'CAN Bus 심화': 'embedded',
  'Industrial Ethernet 심화': 'embedded',
  'Embedded Protocols 심화': 'embedded',

  // Coding standards
  'Linux Kernel Coding Style': 'standards',
  'Python Style Guide (PEP 8)': 'standards',
  'Google C++ Style': 'standards',
  'CERT C': 'standards',
  'AUTOSAR C++14': 'standards',
  'MISRA C': 'standards',

  // Avionics / safety-critical
  'Launch Vehicle Flight Software': 'avionics',
  'Developing Safety-Critical Software': 'avionics',
  'Digital Avionics Handbook': 'avionics',
  'ECSS-Q-ST-80C': 'avionics',
  'DO-178C': 'avionics',
  'JSF C++': 'avionics',
  'NASA JPL Power of 10': 'avionics',

  // Parallel / Concurrency
  'C++ Concurrency in Action': 'parallel',
  'Seven Concurrency Models in Seven Weeks': 'parallel',
  'The Art of Multiprocessor Programming': 'parallel',
  'Designing Data-Intensive Applications': 'parallel',
  'A Primer on Memory Consistency and Cache Coherence': 'parallel',

  // Pure math
  'Linear Algebra': 'math',
  'Set Theory': 'math',
  'Convex Optimization (Boyd)': 'math',
  'Mathematics and Plausible Reasoning, Vol I': 'math',
  'Mathematics and Plausible Reasoning, Vol II': 'math',
  'Elements of Information Theory': 'math',

  // Statistics / Probability
  'Information Theory, Inference, and Learning Algorithms': 'statistics',
  'Probability Theory: The Logic of Science': 'statistics',
  'The Bayesian Choice': 'statistics',
  'All of Statistics': 'statistics',
  'High-Dimensional Probability': 'statistics',
  'Probabilistic Graphical Models (Koller & Friedman)': 'statistics',
  'Statistical Inference': 'statistics',
  'The Algebra of Probable Inference': 'statistics',
  'Doing Bayesian Data Analysis (2nd ed, core)': 'statistics',
  'Reasoning About Uncertainty': 'statistics',
  'A First Course in Bayesian Statistical Methods': 'statistics',
  'Bayesian Data Analysis (3rd ed)': 'statistics',
  'Introduction to Probability': 'statistics',
  'Statistical Rethinking': 'statistics',
  'Probability: Theory and Examples': 'statistics',

  // Machine Learning
  'NPU 드라이버 개발': 'ml',
  'NPU 아키텍처': 'ml',
  'TinyML·Edge AI': 'ml',
  'Probabilistic Reasoning in Intelligent Systems': 'ml',
  'Causality: Models, Reasoning, and Inference': 'ml',
  'Probabilistic Machine Learning: Advanced Topics': 'ml',
  'Probabilistic Machine Learning: An Introduction': 'ml',
  'Pattern Recognition and Machine Learning': 'ml',
  'ONNX 실전': 'ml',
  'ONNX Runtime 심화': 'ml',
  'Core ML 심화': 'ml',
  'TensorRT 심화': 'ml',
  'Designing Machine Learning Systems': 'ml',
  'ML 시스템 프로파일링': 'ml',
  'ML 디자인 패턴': 'ml',
  'PyTorch Internals': 'ml',
  'Triton DSL': 'ml',
  'Apple Metal Stack': 'ml',
  'MLIR 심화': 'ml',
  'XLA·OpenXLA 심화': 'ml',
  'ML 컴파일러': 'ml',

  // Tools (debug, build, vim, emulation, tracing)
  'Vim 마스터하기': 'tools',
  'perf and FlameGraph': 'tools',
  'FPGA Driver via QEMU+VFIO': 'tools',
  'RISC-V QEMU 심화': 'tools',
  'QEMU Internals': 'tools',
  'QEMU Fake Device Driver': 'tools',
  'Driver-RTL Co-simulation': 'tools',
  'QEMU Embedded Emulation': 'tools',
  'Postmortem Debugging': 'tools',
  'Sanitizers': 'tools',
  'Memory Diagnostics': 'tools',
  'Python Debugging': 'tools',
  'DWARF and ELF Internals': 'tools',
  'GDB and LLDB': 'tools',
  'Concurrency Debugging': 'tools',
  'GDB Extension and IDE': 'tools',
  'Valgrind': 'tools',
  'Embedded Debugging': 'tools',
  'Kernel Debugging': 'tools',
  'Debugging: The 9 Indispensable Rules': 'tools',
  'Practical Vim': 'tools',
  'System Tracing': 'tools',
  'CMake': 'tools',
  'GNU Make': 'tools',

  // Media
  'AV1': 'media',

  // Writing
  'The Elements of Style': 'writing',
  'Science Research Writing': 'writing',
  '고종석의 문장': 'writing',
  "The Only Grammar Book You'll Ever Need": 'writing',
  'On Writing Well': 'writing',
  'Style: Lessons in Clarity and Grace': 'writing',
  'Academic Writing for Graduate Students': 'writing',
  '우리글 바로쓰기': 'writing',

  // Philosophy
  'The Structure of Scientific Revolutions': 'philosophy',
  'Understanding Philosophy of Science': 'philosophy',
  '비판적 사고를 위한 논리': 'philosophy',
};

// ─── Badge overrides ──────────────────────────────────────────
// When the auto-derived badge from the title isn't ideal — typically
// because the book has a well-known abbreviation that the algorithm can't
// guess, or because the auto result is awkward.
const BADGE_OVERRIDES = {
  "Computer Systems: A Programmer's Perspective": 'CSAPP',
  'Operating Systems: Three Easy Pieces': 'OSTEP',
  'The Pragmatic Programmer': 'TPP',
  'The Mythical Man-Month': 'MMM',
  'The Art of UNIX Programming': 'TAOUP',
  'Working Effectively with Legacy Code': 'WELC',
  'Information Theory, Inference, and Learning Algorithms': 'ITILA',
  'Mathematics and Plausible Reasoning, Vol I': 'MPR1',
  'Mathematics and Plausible Reasoning, Vol II': 'MPR2',
  'Linux Device Drivers (LDD3)': 'LDD3',
  'Probabilistic Graphical Models (Koller & Friedman)': 'PGM',
  'Designing Data-Intensive Applications': 'DDIA',
  'TDD by Example': 'TDD',
  'TDD by Example — Patterns Deep Dive': 'TDDP',
  'Mastering the FreeRTOS Real Time Kernel': 'FRTOS',
  'Pattern Recognition and Machine Learning': 'PRML',
  'Bayesian Data Analysis (3rd ed)': 'BDA3',
  'Doing Bayesian Data Analysis (2nd ed, core)': 'DBDA',
  'Probability Theory: The Logic of Science': 'PTLS',
  'The Algebra of Probable Inference': 'API',
  'Probability: Theory and Examples': 'PTE',
  'Probabilistic Reasoning in Intelligent Systems': 'PRIS',
  'Probabilistic Machine Learning: An Introduction': 'PML1',
  'Probabilistic Machine Learning: Advanced Topics': 'PML2',
  'Reasoning About Uncertainty': 'RAU',
  'Causality: Models, Reasoning, and Inference': 'CMRI',
  'Pro Git': 'GIT',
  'Convex Optimization (Boyd)': 'CVX',
  'Code: The Hidden Language': 'CODE',
  'Effective Modern C++': 'EMC++',
  'Effective C++': 'EC++',
  'Beautiful C++': 'BC++',
  'GoF Design Patterns': 'GoF',
  'Linear Algebra': 'LA',
  'Set Theory': 'ST',
  'Data Structures and Algorithms': 'DSA',
  'UML 2.5.1': 'UML',
  'C++ Concurrency in Action': 'CCiA',
  'C++ Software Design': 'C++SD',
  'Hackers and Painters': 'H&P',
  'Practical Vim': 'VIM',
  'Vim 마스터하기': 'VIM',
  'Domain-Driven Design': 'DDD',
  'Clean Architecture': 'CA',
  'Clean Code': 'CC',
  'Code Complete': 'CC2',
  'The Bayesian Choice': 'TBC',
  'All of Statistics': 'AoS',
  'High-Dimensional Probability': 'HDP',
  'Statistical Inference': 'StatI',
  'A First Course in Bayesian Statistical Methods': 'FCBSM',
  'Statistical Rethinking': 'SR',
  'Introduction to Probability': 'IntP',
  'Elements of Information Theory': 'EoIT',
  'The Art of Multiprocessor Programming': 'TAMP',
  'Seven Concurrency Models in Seven Weeks': '7C7W',
  'A Primer on Memory Consistency and Cache Coherence': 'MC&CC',
  'NASA JPL Power of 10': 'JPL10',
  'The Structure of Scientific Revolutions': 'TSSR',
  'The Elements of Style': 'EoS',
  'Style: Lessons in Clarity and Grace': 'STYLE',
  'Academic Writing for Graduate Students': 'AWGS',
  'Science Research Writing': 'SRW',
  'On Writing Well': 'OWW',
  "The Only Grammar Book You'll Ever Need": 'GRAM',
  'The Design of Everyday Things': 'DOET',
  'Refactoring Catalog (Fowler 2nd ed)': 'RFCT',
  'Object-Oriented Software Construction': 'OOSC',
  'Object-Oriented Analysis and Design with Applications': 'OOAD',
  'Khorikov Unit Testing': 'KUT',
  'Growing Object-Oriented Software': 'GOOS',
  'Agile & Lean Software Engineering': 'A&L',
  'Programming Pearls': 'PP',
  'Bootloader Internals': 'BOOT',
  'BSP Development': 'BSP',
  'Buildroot Practical': 'BR',
  'Modern Embedded Recipes': 'MER',
  'Embedded Performance Engineering': 'EPE',
  'Embedded C++ for Real Systems': 'EC++R',
  'Embedded Security': 'SEC',
  'Embedded Debugging': 'EDBG',
  'Embedded Protocols 심화': 'EPS',
  'Practical RTOS Internals': 'PRI',
  'Developing Safety-Critical Software': 'DSCS',
  'Digital Avionics Handbook': 'DAH',
  'Launch Vehicle Flight Software': 'LVFS',
  'Postmortem Debugging': 'POST',
  'Memory Diagnostics': 'MEM',
  'Python Debugging': 'PYDB',
  'Kernel Debugging': 'KDBG',
  'Concurrency Debugging': 'CDBG',
  'System Tracing': 'TRACE',
  'GDB and LLDB': 'GDB',
  'GDB Extension and IDE': 'GDBX',
  'DWARF and ELF Internals': 'DWARF',
  'Sanitizers': 'SAN',
  'Valgrind': 'VG',
  'perf and FlameGraph': 'PERF',
  'QEMU Internals': 'QEMU',
  'QEMU Fake Device Driver': 'QFDD',
  'QEMU Embedded Emulation': 'QEE',
  'FPGA Driver via QEMU+VFIO': 'FPGA',
  'Driver-RTL Co-simulation': 'COSIM',
  'RISC-V QEMU 심화': 'RVQ',
  'RISC-V Vector Extension': 'RVV',
  'RISC-V ISA 해부': 'RVI',
  'RISC-V 베어메탈 부트': 'RVB',
  'RISC-V 임베디드 실습': 'RV',
  'ESP32-C3 Mastering': 'ESP32',
  'ARMv8-A Architecture Reference Manual': 'ARMv8',
  'Getting Started with BLE': 'BLE',
  'CAN Bus 심화': 'CAN',
  'Industrial Ethernet 심화': 'IE',
  'MIPI 심화': 'MIPI',
  'NVMe Deep Dive': 'NVMe',
  'The Zynq Book': 'ZYNQ',
  'BoW 개요': 'BoW',
  'CXL 심화': 'CXL',
  'CXL 4.0 Spec Full Review': 'CXL4',
  'HBM·GDDR 심화': 'HBM',
  'UCIe 심화': 'UCIe',
  'DDR Memory Deep Dive': 'DDR',
  'UALink 심화': 'UAL',
  'PCIe Deep Dive': 'PCIe',
  'Yocto Deep Dive': 'YOCTO',
  '리눅스 커널의 구조와 원리': 'LKI',
  '전문가를 위한 C': 'PROC',
  '전문가를 위한 C++': 'PROC++',
  'Abseil C++ 라이브러리': 'ABSL',
  'Folly C++ 라이브러리': 'FOLLY',
  'Fluent Python': 'FP',
  'Python Style Guide (PEP 8)': 'PEP8',
  'Google C++ Style': 'GCS',
  'Linux Kernel Coding Style': 'LKCS',
  'AUTOSAR C++14': 'AUTSR',
  'CERT C': 'CERT',
  'MISRA C': 'MISRA',
  'JSF C++': 'JSF',
  'DO-178C': '178C',
  'ECSS-Q-ST-80C': 'ECSS',
  'TinyML·Edge AI': 'TML',
  'ONNX 실전': 'ONNX',
  'ONNX Runtime 심화': 'ORT',
  'Core ML 심화': 'CML',
  'TensorRT 심화': 'TRT',
  'Designing Machine Learning Systems': 'DMLS',
  'ML 시스템 프로파일링': 'MLSP',
  'ML 디자인 패턴': 'MLDP',
  'PyTorch Internals': 'PT',
  'Triton DSL': 'TRI',
  'Apple Metal Stack': 'METAL',
  'MLIR 심화': 'MLIR',
  'XLA·OpenXLA 심화': 'XLA',
  'ML 컴파일러': 'MLC',
  'NPU 드라이버 개발': 'NPUd',
  'NPU 아키텍처': 'NPUa',
  'Refactoring': 'RFCT',
  'SICP': 'SICP',
  'APUE': 'APUE',
  'AV1': 'AV1',
  'CMake': 'CMake',
  'GNU Make': 'MAKE',
  'Git Conventions': 'GIT',
  'Git Flow': 'GFLOW',
  'gtest 심화': 'GTEST',
  'pytest 심화': 'PYTST',
  'Debugging: The 9 Indispensable Rules': 'D9R',
  'Peopleware': 'PEOPL',
  'TDD by Example — Patterns Deep Dive': 'TDDP',
  'Understanding Philosophy of Science': 'UPS',
  '비판적 사고를 위한 논리': '논리',
  '고종석의 문장': '문장',
  '우리글 바로쓰기': '글쓰기',
};

// ─── Small deterministic hash → variant index ─────────────────
function variantHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 4;
}
const VARIANT_SHIFTS = [-12, -4, 5, 13]; // degrees on the hue wheel

// ─── HSL → hex / rgba ─────────────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  const hex = (v) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function rgbaFromHsl(h, s, l, a) {
  const [r, g, b] = hslToRgb(h, s, l);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─── Auto-derived badge from series title ─────────────────────
const EN_STOP = new Set([
  'a','an','and','as','at','by','for','in','is','of','on','or','the','to',
  'with','vol','ed','st','nd','rd','th','core','book','intro','introduction',
  'about','from','into','via','your','you',
]);
const KO_STOP = new Set([
  '의','를','을','는','은','가','이','와','과','위한','한','에','로','으로',
  '및','및','된','된다','되는','하는','하기','하라','함','것','수','및',
]);

function autoBadge(series) {
  if (BADGE_OVERRIDES[series]) return BADGE_OVERRIDES[series];

  // Strip parentheticals like "(Boyd)", "(3rd ed)"
  let s = series.replace(/\s*\([^)]*\)/g, '');
  // Strip trailing colon-suffix or em-dash-suffix
  s = s.replace(/\s*[:—–]\s+.*$/, '');

  let words = s.split(/[\s,.\-\/]+/).filter(Boolean);
  words = words.filter(
    (w) => !EN_STOP.has(w.toLowerCase()) && !KO_STOP.has(w),
  );

  // Prefer Latin-character words if any are present (drops Korean stopwords
  // and leaves the English/abbreviation portion).
  const latin = words.filter((w) => /[A-Za-z0-9]/.test(w));
  if (latin.length) words = latin;

  // Case 1: a word is an all-caps acronym (≥2 letters, optional digits/+)
  for (const w of words) {
    if (/^[A-Z]{2,}[A-Z0-9+]*$/.test(w) && w.length <= 7) return w;
  }

  // Case 2: a mixed-case acronym-like word (≥2 caps + lowercase, ≤6 chars)
  for (const w of words) {
    const caps = (w.match(/[A-Z]/g) || []).length;
    if (caps >= 2 && /[a-z]/.test(w) && w.length <= 6) return w;
  }

  // Case 3: take first character of each significant word; preserve C++ etc.
  let badge = '';
  for (const w of words) {
    const m = w.match(/^([A-Za-z])([+]*)/);
    if (m) badge += m[1].toUpperCase() + m[2];
    else if (/^[\uAC00-\uD7A3]/.test(w)) badge += w[0];
    if (badge.length >= 5) break;
  }
  return badge || s.slice(0, 3).toUpperCase();
}

// ─── Build a theme from a category + series name ──────────────
function buildTheme(catKey, series) {
  const cat = CATEGORIES[catKey] ?? CATEGORIES.default;
  const shift = series ? VARIANT_SHIFTS[variantHash(series)] : 0;
  const hue = (cat.hue + shift + 360) % 360;

  const accentSat = cat.accentSat ?? 70;
  const accentLight = cat.accentLight ?? 65;

  return {
    bgFrom:    hslToHex(hue, 60, 9),
    bgTo:      hslToHex(hue, 50, 17),
    accent:    hslToHex(hue, accentSat, accentLight),
    accentSoft: rgbaFromHsl(hue, accentSat, accentLight, 0.22),
    text:      hslToHex(hue, 18, 95),
    subtext:   hslToHex(hue, 14, 72),
    badge:     series ? autoBadge(series) : undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────
export const DEFAULT_THEME = buildTheme('default', null);

export function themeForSeriesName(series) {
  if (!series) return DEFAULT_THEME;
  const cat = SERIES_CATEGORY[series] ?? 'default';
  return buildTheme(cat, series);
}

// Back-compat shim — the typed wrapper expected a THEMES object before;
// callers should switch to themeForSeriesName, but a stub keeps the import
// surface stable in case anything else references it.
export const THEMES = {};
