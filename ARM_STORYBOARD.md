# ARM Architecture Spec 풀 리뷰 스토리보드

ARM ARM (Architecture Reference Manual) 및 위성 스펙 전체를 *driver·NPU·aerospace SW 관점*에서 풀 리뷰. 8 sub-series, 121 sections.

---

## 1. 비전

ARM 스펙은 ML/NPU·datacenter·mobile·avionics·automotive 모든 영역의 *공통 기반*이다. PAR/MMU·GIC·SMMU·SVE·CCA·TrustZone 등 핵심을 *스펙 페이지 단위로 리뷰*하면 driver dev·firmware·SW assurance 모두에 통한다.

---

## 2. 진행 상태

| Sub-series | 위치 | sections |
|---|---|---|
| ARMv8-A Architecture Reference Manual | `systems/arm/armv8-a-spec/` | 40 |
| GIC v3/v4 Specification | `systems/arm/gic-spec/` | 10 |
| SMMU v3 Specification | `systems/arm/smmu-spec/` | 10 |
| AMBA AXI·CHI Specification | `systems/arm/amba-spec/` | 10 |
| PSCI·SCMI Specification | `systems/arm/psci-scmi-spec/` | 8 |
| SBSA·BSA Server Standards | `systems/arm/sbsa-bsa-spec/` | 8 |
| ARMv9-A Extensions | `systems/arm/armv9-a-spec/` | 15 |
| ARMv8-M·v8.1-M Architecture | `systems/arm/armv8-m-spec/` | 20 |

**총 121 sections.** 모두 stub — 사용자가 스펙 PDF 보면서 채우는 base.

---

## 3. 시리즈별 챕터 매트릭스

### 3.1 ARMv8-A ARM (40 sections)

**Part A — Foundational (1-8)**

1. ARMv8-A overview·variants·history
2. AArch64 application-level programmers' model
3. AArch64 application-level memory model
4. AArch64 application-level FP·SIMD support
5. AArch64 application-level SVE support
6. AArch32 application-level programmers' model
7. AArch32 application-level memory model
8. Architectural concepts·security model (EL·SS)

**Part B — AArch64 System Level (9-16)**

9. AArch64 System programmers' model — EL0-3·SPSR·PSTATE
10. AArch64 System memory model — MMU·VMSA·**PAR_EL1** ⭐
11. AArch64 system configuration·capabilities
12. AArch64 power·reset
13. Exception model·handling
14. Virtualization — EL2·VTTBR
15. Generic Timer
16. Self-hosted debug·trace

**Part C — A64 Instruction Set (17-22)**

17. A64 instruction encoding·overview
18. A64 data processing (register·immediate)
19. A64 branches·exceptions·system instructions
20. A64 loads·stores
21. A64 FP·SIMD operations
22. A64 SVE operations

**Part D — AArch32 (23-25, brief)**

23. AArch32 system model
24. A32·T32 instruction set overview
25. AArch32 ↔ AArch64 interop

**Part F — Architectural Support for System Features (26-33)**

26. Memory ordering — DMB·DSB·ISB·atomics·acquire/release
27. Cache architecture — DC·IC·cache maintenance
28. PAC·BTI — pointer authentication·branch target identification
29. RAS extension — SError·ECC
30. SPE — statistical profiling
31. Activity Monitors (AMU)
32. Performance Monitors (PMU)
33. Trace — ETM·ETE

**Part G — External Debug (34-36)**

34. External debug interface
35. CoreSight architecture overview
36. Halt-mode·breakpoint·watchpoint

**Wrap-up (37-40)**

37. ARMv8 extensions enumeration (8.1·8.2·...·8.9)
38. Errata handling·implementation defined behavior
39. ARMv9-A overview·migration from v8 (→ v9 series)
40. Spec reading guide·official docs map

### 3.2 GIC v3/v4 (10 sections)

1. GIC overview — distributor·redistributor·CPU interface
2. GICv3 register map·system register access
3. SPI·PPI·SGI·LPI interrupt classes
4. Affinity routing·priority·grouping
5. ITS (Interrupt Translation Service)
6. LPI tables — pending·configuration
7. GICv4 direct injection — vSGI·vPE
8. Power management for GIC
9. Security states — Group 0·1S·1NS
10. Errata·implementation pitfalls

### 3.3 SMMU v3 (10 sections)

1. SMMU overview — IOMMU position
2. Stream Table·STE
3. Context Descriptor (CD)·page tables
4. Translation flow — stage 1·2
5. Command·event·prefetcher queues
6. Configuration registers·discovery
7. Caches·TLB·invalidation
8. Interrupts·error handling
9. PMCG (performance counter)
10. SMMUv3 vs v2 차이

### 3.4 AMBA AXI·CHI (10 sections)

1. AMBA family — AXI·AHB·APB·CHI
2. AXI4 channels — AR·R·AW·W·B
3. AXI4 transaction·burst·outstanding
4. AXI4-Lite·AXI4-Stream
5. AXI Coherency Extensions (ACE)
6. CHI overview
7. CHI request·snoop·data·response
8. CHI interconnect topology
9. AMBA debug·trace bus
10. AXI bridges·design patterns

### 3.5 PSCI·SCMI (8 sections)

1. PSCI overview
2. PSCI CPU on·off·suspend
3. PSCI system off·reset·migrate
4. PSCI hierarchical power state
5. SCMI overview
6. SCMI Base·Power·Performance
7. SCMI Sensor·Voltage·Clock
8. SCMI transport — mailbox·shared mem·virtio

### 3.6 SBSA·BSA Server Standards (8 sections)

1. SBSA overview — server base system arch
2. SBSA mandatory hardware
3. SBSA UEFI requirements
4. BSA overview·split from SBSA
5. BSA software requirements
6. Compliance test suite
7. TBSA — trusted base system arch
8. SystemReady programs·roadmap

### 3.7 ARMv9-A Extensions (15 sections)

1. ARMv9-A overview·motivation
2. SVE2 — scalable vector v2
3. SME — scalable matrix extension
4. SME ZA·streaming SVE mode
5. CCA — Confidential Compute Architecture overview
6. Realm Management Extension (RME)
7. Realm Management Monitor (RMM)
8. PAC v2·enhancements
9. MTE — Memory Tagging Extension
10. BRBE — Branch Record Buffer
11. TRBE — Trace Buffer Extension
12. SPE v1.3+
13. RNG Extension
14. SystemReady — IR·SR·ES·LS
15. ARMv9.x roadmap (9.1·9.2·...)

### 3.8 ARMv8-M·v8.1-M (20 sections)

1. ARMv8-M overview vs v7-M
2. Cortex-M family — M23·M33·M55·M85
3. ARMv8-M register file·exception model
4. NVIC·priority·tail-chaining
5. MPU v8
6. TrustZone-M
7. ARMv8-M Mainline vs Baseline
8. ARMv8.1-M Helium MVE overview
9. Helium MVE registers·instructions
10. Helium MVE for ML — int8·fp16
11. ARMv8-M FPU
12. SysTick·DWT·ITM·debug
13. CoreSight·ETM for Cortex-M
14. ARMv8-M memory ordering
15. MPU vs Cortex-A MMU 차이
16. Custom Datapath Extension (CDE) — M55
17. ARMv8-M security extensions
18. Errata·implementation defined behavior
19. Programming model — interrupt-driven RTOS
20. v7-M → v8-M migration

---

## 4. 참고 자료 (모두 무료)

- [ARMv8-A ARM (DDI 0487)](https://developer.arm.com/documentation/ddi0487/latest/)
- [ARMv8-M ARM (DDI 0553)](https://developer.arm.com/documentation/ddi0553/latest/)
- [GIC v3/v4 spec (IHI 0069)](https://developer.arm.com/documentation/ihi0069/latest/)
- [SMMU v3 spec (IHI 0070)](https://developer.arm.com/documentation/ihi0070/latest/)
- [AMBA AXI/CHI spec](https://developer.arm.com/documentation/ihi0022/latest/)
- [PSCI spec (DEN 0022)](https://developer.arm.com/documentation/den0022/latest/)
- [SCMI spec (DEN 0056)](https://developer.arm.com/documentation/den0056/latest/)
- [SBSA·BSA](https://developer.arm.com/architectures/system-architectures/server-systems)
- [ARM Cortex-A Programmer's Guide for ARMv8-A](https://developer.arm.com/documentation/den0024/latest/) — 보조 자료
- [Joseph Yiu Cortex-M books](https://www.elsevier.com/books/the-definitive-guide-to-arm-cortex-m23-and-cortex-m33-processors/yiu/978-0-12-820735-2) — Cortex-M 보조

---

## 5. 사용 시나리오

- **NPU driver dev** — MMU·PAR·SMMU·GIC·CCA·SVE 핵심
- **Aerospace firmware** — Cortex-M·MPU·TrustZone-M·errata
- **Embedded Linux** — Cortex-A·EL2·PSCI·virtualization
- **Datacenter Arm server** — SBSA·BSA·SystemReady·SMMU·GIC
- **Confidential compute** — CCA·RME·MTE·PAC

각 section의 outline 한 줄은 *스펙 페이지 번호 reference*를 안내. 사용자가 PDF 보면서 채워 넣는 base.
