// ============================================================
// About Page Data
// Edit this file to customize your About page.
// ============================================================

export const ABOUT_DATA = {
  // Profile
  name: 'Hawk',
  photo: '/images/pic.jpg',
  title: 'System & Firmware Engineer',
  tagline:
    'System & firmware engineer working close to the hardware for 10+ years — ' +
    'embedded firmware, kernel-adjacent drivers, and parallel/HPC systems. ' +
    'This blog is where I keep what I learn so I can find it again.',

  // Skill badges shown on the hero section.
  // Each gets a complementary accent color + small icon.
  skills: [
    { label: 'Embedded Firmware', icon: '🔌', color: 'cyan' },
    { label: 'ARM / RISC-V',      icon: '🧠', color: 'amber' },
    { label: 'NVMe / Drivers',    icon: '⚡', color: 'green' },
    { label: 'CUDA / MPI',        icon: '🐧', color: 'violet' },
  ],

  // Content sections
  sections: [
    {
      icon: '👋',
      title: 'Background',
      content:
        "I started in systems software in 2013 during an integrated PhD program at Korea University, " +
        'researching parallel/distributed systems and deep-learning optimization. ' +
        'Since then I\'ve worked on SoC bring-up and IP driver verification at MetisX ' +
        '(ARM M0+ / A53, Zebu/HAPS, NVMe), VPN runtimes and kernel firewall modules at Future Systems, ' +
        'and tsunami-detection / hydrodynamics simulation at Marine Information Technology. ' +
        'Full project history is on the /resume page.',
    },
    {
      icon: '🔧',
      title: 'What I Work With',
      content:
        'Day-to-day I sit close to the hardware: ARM and RISC-V bring-up, ' +
        'low-level drivers (I2C/SPI/UART, NVMe, custom IPs), bootloaders, and SDK refactoring. ' +
        'I also keep one foot in parallel computing — CUDA, MPI, and deep-learning inference ' +
        'systems from earlier R&D work. C/C++ are my daily drivers; Python for tooling and ML.',
    },
    {
      icon: '✍️',
      title: 'Why This Blog Exists',
      content:
        'Most posts here are notes I wrote for *myself*: a chapter of a book I needed to ' +
        'internalize, a debugging session I want to remember, a pattern I kept re-deriving. ' +
        'Publishing them forces me to fix the loose ends I\'d otherwise leave hanging. ' +
        'If a post helps you too, that\'s a bonus.',
    },
    {
      icon: '📚',
      title: "What You'll Find",
      content:
        'Book-driven series (Effective Modern C++, GoF Design Patterns, Designing Data-Intensive ' +
        'Applications, Linear Algebra, and more), embedded standards walkthroughs (MISRA, Google C++ ' +
        'Style), tooling notes (Vim, perf, debuggers), and deep-dives into topics I\'ve hit at work. ' +
        'Korean is the primary language; some series carry English code and comments.',
    },
    {
      icon: '🤝',
      title: 'Get in Touch',
      content:
        'GitHub and email are linked in the footer. I happily read corrections, ' +
        'disagreements, and "you should also read X" notes. For longer conversations ' +
        'about firmware, drivers, or parallel systems, the /resume page has fuller context.',
    },
  ],

  // Hobbies
  hobbies: [
    { icon: '🎾', label: 'Tennis' },
    { icon: '🛹', label: 'Skateboard' },
    { icon: '🎻', label: 'Violin' },
  ],
};
