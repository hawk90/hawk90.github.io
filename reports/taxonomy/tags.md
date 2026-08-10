# Tag vocabulary baseline

> Informational. Measured against published posts and the real routing rule,
> not raw frontmatter. Nothing here is applied automatically.

- Published posts: 726 of 3387
- Tag URL keys in published content: 1465
- Tag pages actually generated (2+ published posts): 468
- Keys below the page threshold (no page generated, by design): 997
- Keys appearing only in drafts (will render when published): 3311

- **Concepts split across different URLs: 10**
- Label inconsistencies inside one URL: 30
- Tags containing whitespace: 11

## Concepts split across different URLs

One concept, two tag pages, readers landing on whichever the article chose.
The first key holds the most posts and is the obvious merge target.

- `/tags/cpp` (219) · `/tags/c++` (9) — 228 uses
- `/tags/bare-metal` (14) · `/tags/baremetal` (2) — 16 uses
- `/tags/device-tree` (3) · `/tags/devicetree` (3) — 6 uses
- `/tags/riscv` (4) · `/tags/risc-v` (2) — 6 uses
- `/tags/async-io` (1) · `/tags/asyncio` (1) — 2 uses
- `/tags/debug-info` (1) · `/tags/debuginfo` (1) — 2 uses
- `/tags/hot-plug` (1) · `/tags/hotplug` (1) — 2 uses
- `/tags/stack-trace` (1) · `/tags/stacktrace` (1) — 2 uses
- `/tags/tf-m` (1) · `/tags/tfm` (1) — 2 uses
- `/tags/type-id` (1) · `/tags/typeid` (1) — 2 uses

## Label inconsistencies inside one URL

These already resolve to a single page holding every post; only the displayed
label depends on which spelling the build happened to see first.

- `/tags/debugging` (36) — `Debugging`, `debugging`
- `/tags/memory` (23) — `Memory`, `memory`
- `/tags/arm` (19) — `ARM`, `arm`
- `/tags/cmake` (15) — `CMake`, `cmake`
- `/tags/python` (12) — `Python`, `python`
- `/tags/c` (11) — `C`, `c`
- `/tags/concurrency` (11) — `Concurrency`, `concurrency`
- `/tags/optimization` (8) — `Optimization`, `optimization`
- `/tags/elf` (7) — `ELF`, `elf`
- `/tags/dwarf` (6) — `DWARF`, `dwarf`
- `/tags/jtag` (5) — `JTAG`, `jtag`
- `/tags/trustzone` (5) — `TrustZone`, `trustzone`
- `/tags/openocd` (4) — `OpenOCD`, `openocd`
- `/tags/ota` (4) — `OTA`, `ota`
- `/tags/stack` (4) — `Stack`, `stack`
- `/tags/stl` (4) — `STL`, `stl`
- `/tags/ci` (3) — `CI`, `ci`
- `/tags/mcu` (3) — `MCU`, `mcu`
- `/tags/breakpoint` (2) — `Breakpoint`, `breakpoint`
- `/tags/crash` (2) — `Crash`, `crash`
- `/tags/dap` (2) — `DAP`, `dap`
- `/tags/frontend` (2) — `Frontend`, `frontend`
- `/tags/gitlab` (2) — `GitLab`, `gitlab`
- `/tags/iot` (2) — `IoT`, `iot`
- `/tags/mcuboot` (2) — `MCUboot`, `mcuboot`
- `/tags/mender` (2) — `Mender`, `mender`
- `/tags/op-tee` (2) — `OP-TEE`, `op-tee`
- `/tags/sbom` (2) — `SBOM`, `sbom`
- `/tags/scripting` (2) — `Scripting`, `scripting`
- `/tags/tui` (2) — `TUI`, `tui`

## Tags containing whitespace

- `embedded security`
- `firmware update`
- `iec 62443`
- `power analysis`
- `remote debug`
- `reverse engineering`
- `root of trust`
- `supply chain`
- `threat model`
- `threat modeling`
- `timing attack`
