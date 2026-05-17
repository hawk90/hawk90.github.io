# QEMU 딥 트랙 스토리보드

QEMU 3 sub-series의 *deep* 확장 계획. 기존 12장씩 36편은 유지하고, 심화 28편 추가로 총 64편.

---

## 1. 비전

세 가지 시각으로 QEMU를 본다.

1. **드라이버 개발자 시각** — 실 HW 없이 driver 개발·테스트. (26.1)
2. **임베디드 개발자 시각** — 펌웨어·RTOS·Linux를 가상 보드에서. (26.2)
3. **QEMU 기여자 시각** — QEMU 자체의 소스를 읽고 고치고 패치. (26.3)

이 셋이 모이면 *NPU 가속기·항우주 펌웨어·자율주행 ECU* 등 미공개 HW를 *상상 가능한 가장 빠른 검증 사이클*로 다룰 수 있다.

### 1.1 최종 목표 — FPGA 드라이버 개발·검증

이 트랙의 *실제 목적*. QEMU는 도구, *FPGA 드라이버*가 결과물.

```
[FPGA HW 없음] → QEMU fake FPGA 디바이스 모델 → driver 작성 → 단위·통합 테스트
       ↓
[FPGA HW 있음] → VFIO-PCI 패스스루 → 실 보드에 driver 검증
       ↓
[프로덕션]      → SR-IOV·mdev로 multi-tenant·CXL.cache로 가속기 coherency
```

`26.1` (fake device)로 *driver를 짜고*, `26.4` (passthrough)로 *실 FPGA에 연결*.

---

## 2. 진행 상태

| Sub-series | 위치 | 기존 | 심화 추가 | 총계 |
|---|---|---|---|---|
| 26.1 Fake Device Driver | `tools/emulation/qemu-fake-device/` | 12 (content) | 10 (stub) | **22** |
| 26.2 Embedded Emulation | `tools/emulation/qemu-embedded/` | 12 (content) | 8 (stub) | **20** |
| 26.3 QEMU Internals | `tools/emulation/qemu-internals/` | 12 (content) | 10 (stub) | **22** |
| 26.4 FPGA Driver via QEMU+VFIO | `tools/emulation/qemu-fpga-driver/` | — | 14 (stub) | **14** |

기존 36편은 일반 content. 신규 stub 42편.

---

## 3. 26.1 Fake Device Driver — 심화 10편 (ch13-22)

```
[기존 1-12] overview → install → QOM → simple PCI → MMIO → IRQ → DMA →
              Linux driver → debugging → CI automation → fault injection → NVMe
              ↓
[심화 13-22] register bank → SG-DMA deep → virtio basics → virtio adv →
              fuzzing → perf modeling → multi-function → hotplug → AER → cross-arch
```

| # | 주제 | 핵심 |
|---|------|------|
| 13 | 레지스터 뱅크 패턴 — multi-region 디바이스 | doorbell/CSR/queue 분리 BAR |
| 14 | Scatter-Gather DMA 깊이 | descriptor ring·prep/post·partial xfer |
| 15 | VirtIO 디바이스 기초 | virtio-pci·virtqueue·feature bits |
| 16 | VirtIO 디바이스 심화 | split·packed ring·in-order·indirect descriptors |
| 17 | 디바이스 퍼징 | Syzkaller·QEMU device fuzzing·corpus |
| 18 | 성능 모델링 | latency·throughput injection·QoS test |
| 19 | Multi-function PCI 디바이스 | function 분리·shared resource·MFD 패턴 |
| 20 | 핫플러그/핫언플러그 | PCI_BUSADD·rmmod 시퀀스·refcount 안전 |
| 21 | PCIe AER 에뮬레이션 | correctable·uncorrectable error 주입 |
| 22 | 크로스 아키텍처 | 동일 model을 x86/ARM/RISC-V에서 |

---

## 4. 26.2 Embedded Emulation — 심화 8편 (ch13-20)

```
[기존 1-12] overview → ARM virt → RISC-V virt → U-Boot → kernel → rootfs →
              DT → peripherals → networking → GDB → baremetal → RTOS
              ↓
[심화 13-20] vendor machine → semihosting → OpenAMP → TrustZone →
              hypervisor → board bringup → fault injection → CI matrix
```

| # | 주제 | 핵심 |
|---|------|------|
| 13 | 벤더 머신 — STM32·i.MX·BCM2710 | machine 옵션·DT 차이 |
| 14 | Semihosting | host I/O on bare-metal·printf without UART |
| 15 | OpenAMP/RPMsg on QEMU | AMP — Cortex-A + Cortex-M 동시 |
| 16 | TrustZone secure world | EL3/EL1 분리·OP-TEE 부팅 |
| 17 | ARM hypervisor (EL2) | KVM nested·Xen on QEMU |
| 18 | 보드 bringup workflow | DTB → kernel → rootfs → driver bring-up |
| 19 | 임베디드 fault injection | clock skew·power glitch·watchdog test |
| 20 | 크로스 플랫폼 CI 매트릭스 | ARM·RISC-V·x86 동시 검증 |

---

## 5. 26.3 QEMU Internals — 심화 10편 (ch13-22)

```
[기존 1-12] architecture → QOM → memory → event loop → block → net →
              PCI → IRQ controller → timer → migration → custom machine → contributing
              ↓
[심화 13-22] TCG deep → KVM accel → coroutine → AIO → block I/O →
              virtio impl → vhost → microvm → secure VM → snapshot vs migration
```

| # | 주제 | 핵심 |
|---|------|------|
| 13 | TCG 심화 | block translation·intermediate ops·frontend/backend |
| 14 | KVM accelerator | accel ops·KVM_RUN·IRQ injection·MMIO trap |
| 15 | Coroutine 서브시스템 | qemu_coroutine_*·yield/resume·use cases |
| 16 | AIO 서브시스템 | fd handler·io_uring·linux-aio backend |
| 17 | 블록 I/O lifecycle | BDS·request stack·throttling·caching |
| 18 | virtio 구현 심화 | virtio-blk·virtio-net 호스트 측 |
| 19 | vhost-net·vhost-user | kernel·userspace backend offload |
| 20 | microvm machine | virtio-mmio·minimal boot·serverless VM |
| 21 | Confidential computing | SEV·SEV-SNP·TDX·secure execution |
| 22 | Snapshot vs live migration | savevm·migrate-incoming·VMState 차이 |

---

## 5.5. 26.4 FPGA Driver via QEMU+VFIO — 신규 14편 (FPGA 진로 핵심)

이 시리즈의 *최종 목적*. QEMU `fake-device`(26.1)로 *FPGA-like 디바이스*를 만들어 driver 짜고, VFIO/SR-IOV로 *실 FPGA*에 같은 driver 검증.

```
[Step 1 — driver dev]      QEMU + AXI/PCIe-bridge model → 가상 FPGA → Linux driver
[Step 2 — sharing path]    SR-IOV·mdev·DFL  → multi-tenant FPGA
[Step 3 — passthrough]     VFIO-PCI → bare-metal driver를 VM에서
[Step 4 — coherent]        CXL.cache·CCI-P → FPGA가 host cache에 직접
```

| # | 주제 | 핵심 |
|---|------|------|
| 1 | FPGA driver 개발의 과제 | 실 보드 없는 상태에서 검증 |
| 2 | FPGA 아키텍처 review | shell·user logic·AXI·PCIe bridge |
| 3 | QEMU fake FPGA 디바이스 | minimal PCIe FPGA model 구성 |
| 4 | AXI ↔ PCIe bridge 모방 | register map·DMA engine emulation |
| 5 | FPGA 인터럽트 모델 | MSI-X·user IRQ multiplexing |
| 6 | FPGA DMA — descriptor ring | SG·bidirectional·zero-copy |
| 7 | 비트스트림 로딩 | driver의 firmware push·FPGA Manager |
| 8 | Partial Reconfiguration | runtime sub-region 교체·driver 측 |
| 9 | VFIO 기초 | userspace driver framework·IOMMU group |
| 10 | VFIO-PCI 패스스루 | 실 FPGA를 VM에 — bind·unbind·reset |
| 11 | SR-IOV·mdev | FPGA 공유 — PF/VF·virtual function |
| 12 | OPAE·DFL framework | Intel FPGA management infrastructure |
| 13 | Xilinx XRT 스택 | Alveo·Versal driver 스택 시각 |
| 14 | CXL.cache·CCI-P | FPGA host-coherent cache·NPU 확장 |

---

## 6. 진행 순서

1. **스토리보드 (이 문서)** — 작성 완료.
2. **roadmap §26 업데이트** — 표에 기존/심화 분리·각 sub-series 챕터 수 갱신.
3. **stub 양산** — 28편 모두 frontmatter + outline 한 줄, `draft: true`.
4. **양산 후 build 검증** — `npm run build` green 확인.

기존 12편 content는 *건드리지 않는다* (사용자 인 진행 중 가능성).

---

## 7. 참고 (책·문서·소스)

**책**
- *QEMU/KVM Source Explained* — Junlin (Apress, 2024) — Internals 직접 참고.
- *Mastering QEMU* — 공식 docs 종합 학습.
- *Embedded Linux Systems with the Yocto Project* — embedded 컨텍스트.

**문서·소스**
- [QEMU Official Docs](https://www.qemu.org/docs/master/)
- [QEMU Developer Docs](https://www.qemu.org/docs/master/devel/index.html)
- [QEMU Source on GitLab](https://gitlab.com/qemu-project/qemu)
- [QEMU QOM Reference](https://www.qemu.org/docs/master/devel/qom.html)
- [QEMU mailing list archive](https://lists.gnu.org/archive/html/qemu-devel/)
- [Bootlin QEMU Tutorial Slides](https://bootlin.com/docs/)
- [Linaro QEMU Wiki](https://linaro.atlassian.net/wiki/spaces/QEMU/overview)

**커뮤니티 정리·블로그**
- [airbus-seclab QEMU device fuzzer](https://github.com/airbus-seclab/qemu_blog) — fuzzing·security 관점
- [Stefan Hajnoczi blog](https://blog.vmsplice.net/) — QEMU coroutine·AIO 저자
- [Alex Bennée blog](https://www.bennee.com/~alex/blog/) — QEMU/ARM/TCG 관련

---

## 8. 사용자 의사결정 포인트

- 기존 12편 content는 *건드리지 않음* — 사용자가 진행 중이면 conflict 회피.
- 28편 심화는 *stub only* — 양산 전 톤·예시 깊이 확인.
- 카테고리 변경 없음 — `tools/emulation` 그대로.
