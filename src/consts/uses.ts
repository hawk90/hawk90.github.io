/**
 * /uses page data — the gear, software, and workflow.
 * Convention: https://uses.tech
 */
export const USES_DATA = {
  sections: [
    {
      title: 'Hardware',
      items: [
        { name: 'MacBook Pro 16"', detail: 'M4 Max, 64GB, 2TB' },
        { name: 'LG 32" 4K display', detail: 'main editor pane' },
        { name: 'Logitech MX Keys', detail: 'low-profile keyboard' },
        { name: 'Sony WH-1000XM5', detail: 'noise-cancelling headphones' },
      ],
    },
    {
      title: 'Editor',
      items: [
        { name: 'Neovim', detail: 'config in dotfiles repo' },
        { name: 'VS Code', detail: 'for debugging and notebooks' },
        { name: 'tmux', detail: 'session-per-project' },
        { name: 'Ghostty', detail: 'GPU-accelerated terminal' },
      ],
    },
    {
      title: 'Toolchain',
      items: [
        { name: 'CMake + Ninja', detail: 'C++ builds' },
        { name: 'cargo / rustup', detail: 'Rust projects' },
        { name: 'OpenOCD + gdb', detail: 'embedded debugging' },
        { name: 'JTAG ICE', detail: 'hardware tracing' },
      ],
    },
    {
      title: 'Workflow',
      items: [
        { name: 'GitHub', detail: 'projects + this blog' },
        { name: 'Linear', detail: 'tasks and tracking' },
        { name: 'Things 3', detail: 'personal todos' },
        { name: 'Obsidian', detail: 'long-form notes' },
      ],
    },
  ],
};
