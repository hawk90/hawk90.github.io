---
title: "Ch 22: Snapshot vs Live Migration"
date: 2026-05-17T22:00:00
description: "savevm·migrate·VMState — 두 메커니즘의 차이."
tags: [QEMU, snapshot, live-migration, vmstate]
series: "QEMU Internals"
seriesOrder: 22
draft: true
---

## 이 챕터의 의도

QEMU에서 snapshot과 live migration은 같은 토대(VMState serialization)를 공유한다. snapshot은 single-host에서 파일로 저장하고, migration은 cross-host로 네트워크 너머에 옮긴다. 이 장에서는 두 메커니즘을 같은 frame으로 보고, dirty page tracking·precopy·postcopy 같은 high-end 기법까지 정리한다.

## 핵심 항목

- ✦ **Snapshot** = single-host save/restore
  - `savevm <name>` / `loadvm <name>` (monitor 명령)
  - Internal: qcow2 안에 metadata + memory dump
  - External: 별도 파일
- ✦ **Live migration** = cross-host save + restore
  - `migrate -d tcp:dest:4444`, `migrate -d unix:/tmp/sock`
  - 실행 중 guest 그대로 다른 host로
- ✦ **VMState framework** — device state 직렬화 표준
  - `VMStateDescription` — field별 (name, size, version) 명시
  - `VMSTATE_UINT32`, `VMSTATE_BUFFER`, `VMSTATE_STRUCT` 등 매크로
  - 버전 호환성 — `version_id`, `minimum_version_id`, `post_load` hook
- ✦ **Pre-copy migration** (default)
  1. Memory 전체 send (round 1)
  2. dirty page 추적 후 다시 send (round 2, 3, ...)
  3. dirty rate가 충분히 작아지면 VM pause + 마지막 dirty + register state
  4. dest에서 resume
- ✦ **Post-copy migration**
  - source에서 pause + minimal state만 send
  - dest 즉시 resume — page fault 시 source에서 lazy fetch
  - downtime 짧음 vs network failure 시 위험
- ✦ **Memory dirty tracking** — KVM `KVM_GET_DIRTY_LOG`, dirty bitmap
- ✦ KVM ring buffer dirty tracking — high-perf 대체
- ✦ **Storage migration** — `migrate -b` (block) or `nbd_server_start` + drive_mirror
- ✦ **RDMA migration** — InfiniBand zero-copy 전송 (`migrate -d rdma:...`)
- ✦ Multifd — multi-thread/multi-stream 동시 전송
- ✦ Compress / zero page detection / xbzrle (dirty page delta)
- ✦ **Snapshot이 migration의 single-host special case** — 같은 VMState로 file에 저장
- ✦ Pass-through device (VFIO) + migration 어려움 — vDPA로 해결 시도 (PCIe Ch 13)
- ✦ Confidential VM migration — encrypted state 전송 (SEV-SNP migration ABI)
- ◦ Migration test framework — `tests/migration/`

## 다이어그램 (4)

1. Snapshot vs Migration — single-host file vs cross-host network
2. Pre-copy 흐름 (N round dirty → pause → resume)
3. Post-copy 흐름 (pause → resume + lazy page fault)
4. VMState 직렬화 — device struct → field array → byte stream

## 코드 sketch

```c
/* VMStateDescription 정의 예 (단순 device) */
static const VMStateDescription vmstate_my_dev = {
    .name = "my-dev",
    .version_id = 2,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_UINT32(reg_ctrl, MyDev),
        VMSTATE_UINT32(reg_status, MyDev),
        VMSTATE_BUFFER(internal_buf, MyDev),    /* version 1 */
        VMSTATE_UINT64_V(extra_counter, MyDev, 2),  /* version 2 추가 */
        VMSTATE_END_OF_LIST()
    },
    .post_load = my_dev_post_load,   /* version migration hook */
};

static int my_dev_post_load(void *opaque, int version_id) {
    MyDev *s = opaque;
    if (version_id < 2) s->extra_counter = 0;   /* migration backward compat */
    /* reinit HW state from loaded */
    return 0;
}
```

```bash
# Snapshot
(qemu) savevm s1
(qemu) loadvm s1
(qemu) info snapshots

# Live migration — source
(qemu) migrate_set_capability multifd on
(qemu) migrate_set_parameter multifd-channels 4
(qemu) migrate_set_capability postcopy-ram on
(qemu) migrate -d tcp:dest.example.com:4444

(qemu) info migrate
# Status: completed, downtime: 38ms, transferred: 4.2GiB

# Live migration — dest 먼저 시작
qemu-system-x86_64 -M q35 -m 4G ... -incoming tcp:0:4444

# Post-copy 전환 — pre-copy 중 dirty가 안 줄어들면
(qemu) migrate_start_postcopy
```

```python
# Migration test 자동화
import qemu.qmp as qmp

src = qmp.QEMUMonitorProtocol(('src', 4444)); src.connect()
dst = qmp.QEMUMonitorProtocol(('dst', 4444)); dst.connect()

# dest 먼저 incoming 시작
dst.command('migrate-incoming', uri='tcp:0:5000')

# src migrate
src.command('migrate', uri='tcp:dst:5000')

# 진행 확인
while True:
    s = src.command('query-migrate')
    if s['status'] == 'completed': break
    time.sleep(1)
print(f"downtime: {s['downtime']}ms")
```

## 레퍼런스

- QEMU `Documentation/devel/migration.rst`
- QEMU `migration/`, `migration/savevm.c`, `migration/ram.c`
- "Live Migration of Virtual Machines" — Clark et al. NSDI 2005 (classic)
- "Post-copy live migration of virtual machines" — Hines & Gopalan
- "Multifd live migration" — KVM Forum 2018
- "Migrating confidential VMs" — Linux Plumbers 2024

## 관련 항목

- [Ch 17: 블록 I/O lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
- [Ch 18: VirtIO impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [Ch 20: microvm](/blog/tools/emulation/qemu-internals/chapter20-microvm)
- [Ch 21: Confidential computing](/blog/tools/emulation/qemu-internals/chapter21-confidential)
- [PCIe Ch 13: vDPA + live migration](/blog/embedded/hardware/pcie/)
