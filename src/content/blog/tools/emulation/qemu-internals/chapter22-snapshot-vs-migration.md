---
title: "Ch 22: Snapshot vs Live Migration"
date: 2026-05-17T22:00:00
description: "savevm·migrate·VMState — 두 메커니즘의 차이."
tags: [QEMU, snapshot, live-migration, vmstate, savevm]
series: "QEMU Internals"
seriesOrder: 22
draft: true
---

시리즈 마지막 장입니다. Ch 10에서 본 *live migration*과 *snapshot*은 *비슷한 메커니즘*을 사용하지만 *용도와 흐름이 다릅니다*. 둘의 *공통점*과 *차이*를 한 자리에 정리하며 시리즈를 닫습니다.

## 비교 한 표

| 측면 | Snapshot | Live Migration |
|------|----------|-----------------|
| 대상 | 같은 host | 다른 host |
| Storage | 같은 disk | 새 storage 또는 NBD mirror |
| 사용 사례 | rollback·테스트·debugging | rebalancing·maintenance |
| 시간 | 즉시(internal qcow2) | 수 분 |
| Memory transfer | 같은 host RAM 또는 file | network transfer |
| Pause time | 거의 0(internal) 또는 ~ms | ~ms (stop & copy) |
| 명령 | `savevm`·`loadvm` | `migrate` |

둘 다 *VMState*를 사용해 device state 직렬화 → 차이는 *어디로 보내는가*.

## 공통 메커니즘 — VMState

```c
static const VMStateDescription vmstate_my_device = {
    .name = "my-device",
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_UINT32(ctrl, MyDeviceState),
        VMSTATE_UINT32(status, MyDeviceState),
        VMSTATE_END_OF_LIST()
    }
};
```

device의 *내부 상태*를 *byte stream*으로. snapshot은 *file에*, migration은 *network에 write*.

## QEMU file abstraction

```c
typedef struct QEMUFile QEMUFile;

/* file 기반 */
QEMUFile *f = qemu_file_open(...);
qemu_savevm_state_complete_precopy(f, ...);

/* network 기반 */
QEMUFile *f = qemu_file_get_buffered_socket(fd);
qemu_savevm_state_complete_precopy(f, ...);
```

*같은* `qemu_savevm_state_*` 함수가 *file·socket·NBD·RDMA* 등 *어떤 destination*에도. backend 추상화.

## Internal qcow2 snapshot

qcow2 image 안에 *snapshot*을 저장. `savevm`/`loadvm` 명령.

```text
(qemu) savevm checkpoint-1
(qemu) (... 작업 ...)
(qemu) loadvm checkpoint-1
```

내부적으로:
1. VM 일시정지
2. VMState를 qcow2의 *snapshot 영역*에 write
3. L1 table을 *copy*해 *active L1*을 새로 시작
4. VM 재개

*수 ms 안에* 완료. 가장 빠른 snapshot.

## External snapshot

qcow2 *backing chain* 사용.

```text
(qemu) snapshot_blkdev hd0 /new/snap.qcow2
```

기존 image를 *base*로 하고 *새 qcow2를 active*로. write가 새 qcow2에. base는 *read-only* 보존.

```text
base.qcow2 (read-only) ← snap.qcow2 (active write)
```

backing chain이 깊어질수록 *read latency 누적*. 정리: `block-stream`으로 chain 통합.

## Live migration vs Snapshot — 메모리 처리

| 단계 | Snapshot (same host) | Live Migration |
|------|-----------------------|-----------------|
| Memory | 한 번에 dump 또는 incremental | iterative copy (pre-copy) |
| Convergence | 즉시 | 수 분 (dirty page tracking) |
| Pause | <100ms | ~10~100ms (stop & copy) |
| Network | 없음 | 네트워크 BW가 bottleneck |

snapshot은 *host RAM 공유*이므로 빠름. migration은 *RAM을 network로 전송*해야 해서 느림.

## Restore from snapshot

```text
(qemu) loadvm checkpoint-1
```

1. 현재 VM 일시정지·discard
2. snapshot의 VMState를 *모든 device에 inject*
3. memory를 *snapshot 상태*로 복원
4. VM 재개

*수십 ms~수 초*에 완료.

## Snapshot 활용

| 시나리오 | 흐름 |
|----------|------|
| **테스트 환경 reset** | 한 번 setup → savevm clean → 매 test 후 loadvm |
| **Debug** | bug 재현 직전에 savevm → fix·재시도 |
| **Pre-warmed VM** | application 실행 후 savevm → request마다 loadvm |
| **Time-travel debugging** | record + replay (icount + snapshot) |

## Live migration 활용

| 시나리오 | 흐름 |
|----------|------|
| **HW maintenance** | host A 종료 전에 VM을 B로 |
| **Load balancing** | host A 부하 ↑일 때 VM을 B로 |
| **OS upgrade** | A의 kernel 업그레이드 시 VM을 *그대로* B로 |
| **Capacity rebalancing** | 데이터센터 단위 자원 최적화 |

cloud의 *자동 작업*. 사용자에게 보이지 않음.

## QMP API 차이

```text
# Snapshot
{ "execute": "snapshot-save",
  "arguments": { "tag": "snap1" } }

{ "execute": "snapshot-load",
  "arguments": { "tag": "snap1" } }

# Migration
{ "execute": "migrate",
  "arguments": { "uri": "tcp:dest:4444" } }

{ "execute": "query-migrate" }
```

같은 *VMState 메커니즘*에 다른 *control plane*.

## Performance — bandwidth needed

```text
migration BW = (RAM size) / (target downtime + iteration count)
```

20GB VM을 100ms downtime으로 migrate하려면 *수십 Gbps* network 필요. 보통:

| RAM | Network | Migration time |
|-----|---------|-----------------|
| 4 GB | 1 Gbps | ~40초 |
| 16 GB | 10 Gbps | ~15초 |
| 64 GB | 10 Gbps | ~1분 |
| 256 GB | 25 Gbps | ~2분 |

dirty page rate가 높으면 convergence가 안 되어 downtime이 *길어지거나* migration fail.

## VMState compatibility

snapshot은 *같은 QEMU 버전*이라 자유. migration은 *source·destination 다른 QEMU* 가능 — version compatibility table 따라야.

| QEMU | machine type compat |
|------|---------------------|
| v8.0 | pc-i440fx-8.0, 7.x, 6.x, ... |
| v7.0 | pc-i440fx-7.0, 6.x, ... |

이전 머신 타입을 *명시*하면 backward migration 가능.

## Cross-architecture migration

*같은 architecture*만. ARM → x86 같은 cross migration은 *불가능*.

같은 architecture라도 *CPU feature*가 다르면 fail. host A는 AVX-512, B는 없으면 *AVX-512 disable* guest로만 migrate 가능.

## Recoverable snapshot

```text
(qemu) loadvm checkpoint-1
... (실행 중 발견된 bug)
(qemu) loadvm checkpoint-1  # 다시 같은 시점부터
```

snapshot의 *반복 사용*이 *bug 재현*의 핵심. *동일한 input*이 *동일한 output*을 *재현 가능*.

icount(Ch 9) + snapshot 결합으로 *time-travel debugging*.

## 시리즈 종합

22장에 걸친 *QEMU Internals*의 지도를 정리.

| 영역 | 장 |
|------|----|
| 기본 어휘 | 1~2 (architecture, QOM) |
| 메모리·시간·이벤트 | 3~4, 9 (memory, event loop, timer) |
| Storage·Network | 5~6, 17 (block, network, block I/O) |
| Device·IRQ·PCI | 7~8, 18~19 (PCI, IC, VirtIO, vhost) |
| Migration·Machine | 10~11 (migration, custom machine) |
| Contributing | 12 |
| CPU acceleration | 13~14 (TCG, KVM) |
| Async I/O | 15~16 (coroutine, AIO) |
| Special VMs | 20~21 (microvm, confidential) |
| State management | 22 (snapshot vs migration) |

이 어휘로 QEMU mainline *어느 곳*이든 *읽고 수정* 가능.

## 다음 단계

- *내 SoC* QEMU에 추가 (Ch 11 + 11)
- *driver-RTL cosim* (Driver-RTL Co-simulation 시리즈)
- *FPGA driver* (FPGA Driver via QEMU+VFIO 시리즈)
- *embedded workflow* (QEMU Embedded Emulation 시리즈)
- *RISC-V 심화* (RISC-V QEMU 심화 시리즈)
- *mainline 기여* (Ch 12 따라서 시작)

이 5개 시리즈가 *임베디드 + 시스템 + 시뮬레이션*의 다음 깊이.

## 흔한 함정

- **snapshot vs disk snapshot** — `savevm`은 *memory + device state*, `snapshot_blkdev`는 *disk*. 둘 다 필요할 수도.
- **migration 도중 storage stale** — destination이 *source disk*에 못 접근. NFS 또는 NBD mirror.
- **VMState field 누락** — savevm OK, loadvm 후 *device state 부족*. 미묘한 bug 가능.
- **dirty page convergence 실패** — write-heavy guest는 *iterative copy*가 끝나지 않음. *post-copy* 시도.

## 정리

- Snapshot과 Migration은 *같은 VMState 메커니즘* + *다른 destination*.
- **Internal qcow2 snapshot**이 가장 빠름(수 ms). 같은 image 안에.
- **External snapshot**은 backing chain. 깊이 누적 주의.
- **Live migration**은 iterative RAM transfer + stop&copy. 네트워크 BW가 bottleneck.
- *같은 architecture·CPU feature*만 migration 가능.
- Snapshot 반복으로 *bug 재현*. icount 결합 → time-travel debugging.
- QMP `snapshot-save`/`-load`·`migrate`가 control plane.

## 시리즈 마무리

22장 끝까지 와 주셔서 감사합니다. QEMU는 *복잡한 시스템*이지만 *각 layer*가 *명확한 역할*을 갖고 있어, 이 어휘만 정리되면 *어디든 들어갈* 수 있습니다.

다음 시리즈에서 만나거나, mainline QEMU에서 *기여자*로 만나길 바랍니다.

## 관련 항목

- [Ch 21: Confidential Computing](/blog/tools/emulation/qemu-internals/chapter21-confidential)
- [Ch 1: QEMU 아키텍처 개요](/blog/tools/emulation/qemu-internals/chapter01-architecture) — 시리즈 처음으로
- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)

## 관련 시리즈

- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview)
- [QEMU Embedded](/blog/tools/emulation/qemu-embedded/chapter01-overview)
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge)
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim)
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview)

## 참고 자료

- QEMU Documentation — qemu.org/docs/master/
- QEMU GitLab — gitlab.com/qemu-project/qemu
- qemu-devel mailing list
- Linux KVM documentation — Documentation/virt/kvm/
- "Understanding the Linux Kernel"·"Virtual Machine Internals" (books)
