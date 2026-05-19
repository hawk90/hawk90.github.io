---
title: "Ch 10: 마이그레이션"
date: 2026-05-17T10:00:00
description: "QEMU 라이브 마이그레이션과 VMState를 이해한다."
tags: [QEMU, Migration, VMState, livemigrate]
series: "QEMU Internals"
seriesOrder: 10
draft: true
---

**Live migration**은 *실행 중인* VM을 *다른 host*로 *짧은 다운타임*에 옮기는 기능입니다. cloud의 *hardware maintenance·load balancing·rebalancing*에 핵심이고, QEMU의 가장 정교한 subsystem 중 하나입니다.

## 어떤 문제를 푸는가

cloud 환경에서:

- *Hardware 점검*에 VM을 *다른 server로*
- *Hot CPU/memory*에 따라 *재배치*
- *OS upgrade*에 *현재 VM 유지*
- *Workload migration*에 *zero downtime*

이 모두가 *Live migration*으로 가능합니다.

## 흐름 — 4단계

```text
1. Setup
   - Destination QEMU 시작 (incoming)
   - 양쪽 verifying capability

2. Iterative memory transfer
   - dirty page tracking
   - 변경된 page만 *반복 전송*
   - converge할 때까지

3. Stop & Copy
   - source VM 일시정지
   - 마지막 dirty pages + device state 전송
   - CPU state 전송

4. Switchover
   - destination 활성
   - source 종료
```

다운타임은 *3단계*에서만 발생. 보통 *수십~수백 ms*.

## 사용

```text
# Source
(qemu) migrate -d tcp:dest_host:4444

# Destination (먼저 시작)
qemu-system-x86_64 ... -incoming tcp:0:4444
```

`-d`(detach)로 background. progress 모니터링:

```text
(qemu) info migrate
Migration status: completed
total time: 5432 ms
downtime: 87 ms
setup: 12 ms
transferred ram: 4096 MB
```

## VMState — device 상태 직렬화

device의 *내부 상태*를 *binary stream*으로 dump/load.

```c
static const VMStateDescription vmstate_my_device = {
    .name = "my-device",
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_UINT32(ctrl,   MyDeviceState),
        VMSTATE_UINT32(status, MyDeviceState),
        VMSTATE_UINT64(count,  MyDeviceState),
        VMSTATE_TIMER_PTR(timer, MyDeviceState),
        VMSTATE_END_OF_LIST()
    }
};

static void class_init(...) {
    dc->vmsd = &vmstate_my_device;
}
```

QEMU가 *모든 device*의 vmstate를 *순회*해 전송. destination에서 *같은 순서*로 복원.

## 핵심 VMSTATE 매크로

| 매크로 | 의미 |
|--------|------|
| `VMSTATE_UINT32(field, struct)` | 32-bit unsigned |
| `VMSTATE_UINT64(field, struct)` | 64-bit |
| `VMSTATE_BUFFER(buf, struct)` | byte array |
| `VMSTATE_ARRAY(field, struct, num, ...)` | array |
| `VMSTATE_STRUCT(field, struct, ..., type)` | nested struct |
| `VMSTATE_TIMER_PTR(field, struct)` | QEMUTimer |
| `VMSTATE_END_OF_LIST()` | terminator (필수) |

## Versioning

```c
.version_id = 2,
.minimum_version_id = 1,
.fields = (VMStateField[]) {
    /* v1 fields */
    VMSTATE_UINT32(old_field, MyDeviceState),

    /* v2에 추가된 field */
    VMSTATE_UINT64_V(new_field, MyDeviceState, 2),

    VMSTATE_END_OF_LIST()
}
```

`_V(..., version)`로 *특정 버전에만* 존재. backward compat 보장.

## RAM transfer

memory가 *주 부분*. iterative copy로 *대부분의 RAM*을 *backround 전송*하고, *수렴*하면 stop & copy.

```text
Iteration 1: 모든 RAM 전송
Iteration 2: 변경된 page만 (dirty page)
Iteration 3: 더 적은 dirty
...
Iteration N: convergence
```

dirty page tracking은 *KVM* 또는 *userfaultfd*. `KVM_GET_DIRTY_LOG` ioctl로 *bitmap*.

## Post-copy migration

기본은 *pre-copy* — 메모리를 *먼저* 보낸 후 switchover. *Post-copy*는 *VM을 먼저* 옮기고 *page fault 시* 원격 fetch.

```text
(qemu) migrate_set_capability postcopy-ram on
(qemu) migrate_start_postcopy
```

장점: *짧은 다운타임* 보장. 단점: *page fault 시 latency*.

## Storage migration

VM 메모리 + *disk*도 함께 이전하려면 *NBD mirror* 또는 *built-in disk migrate*.

```text
(qemu) drive_mirror -n hd0 nbd:dest_host:10809:exportname=disk
(qemu) migrate -d tcp:dest_host:4444
```

destination이 *NBD server*로 disk write를 받음. 메모리 + 디스크가 *함께 sync*.

## TLS 암호화

production migration은 *TLS*로 암호화.

```text
(qemu) migrate_set_parameter tls-creds tls0
(qemu) migrate tcp:dest_host:4444
```

`tls0`은 미리 정의한 X509 credential.

## 압축

```text
(qemu) migrate_set_capability compress on
(qemu) migrate_set_parameter compress-threads 4
```

XBZRLE(같은 page의 patch만 전송)·multifd(다중 채널)·compression 등 다양한 가속.

## device 호환성

source와 destination이 *같은 QEMU 버전*·*같은 device 구성*이어야. 다르면 migration *fail*.

```text
(qemu) info qom-tree
```

양쪽이 *같은 tree*인지 확인. mainline에서는 *machine type*을 *고정*해 호환성 보장.

```bash
# v6.0 머신을 v8.0 QEMU에서 시작
qemu-system-x86_64 -M pc-i440fx-6.0 ...
```

## Migration failure recovery

migration 도중 fail하면 *source VM은 그대로* 살아 있음. *destination이 일찍 끝남*. 다시 시도 가능.

```text
(qemu) migrate_cancel
(qemu) info migrate
Migration status: cancelled
```

production은 *retry policy*와 *fallback*을 추가.

## Snapshot vs Migration

| 기능 | Snapshot | Migration |
|------|----------|-----------|
| 대상 | 같은 host | 다른 host |
| Disk | 보통 같은 path | NBD mirror |
| 사용 사례 | rollback·테스트 | rebalancing·maintenance |
| 시간 | 즉시 | 수 분 |

`savevm`/`loadvm`이 snapshot. Ch 22에서.

## 흔한 함정

- **machine type mismatch** — host A는 pc-i440fx-7.0, host B는 8.0. fail.
- **device 옵션 차이** — `-device my-device,size=...`가 다르면 vmstate 충돌.
- **clock drift** — host wall clock 차이로 guest time jump. NTP 후속 동기.
- **외부 storage 같은 path 가정** — NFS 같은 *공유* storage 또는 NBD mirror 명시.

## 정리

- **Live migration**으로 실행 중 VM을 다른 host에. 다운타임 *수십 ms*.
- 4단계: setup → iterative RAM → stop & copy → switchover.
- **VMState**가 device 상태 직렬화. `VMSTATE_*` 매크로로 field 명시.
- Versioning(`version_id`·`_V` 매크로)으로 backward compat.
- **Post-copy**가 다운타임 vs latency trade-off.
- Storage는 NBD mirror로 함께 sync.
- TLS·compress·multifd로 *production 가속*.
- Machine type·device 옵션이 *양쪽 일치*해야.

## 다음 장 예고

다음 장은 *내 SoC를 QEMU에 추가* — **custom machine type**.

## 관련 항목

- [Ch 9: 타이머와 클럭](/blog/tools/emulation/qemu-internals/chapter09-timers)
- [Ch 11: 커스텀 머신 타입](/blog/tools/emulation/qemu-internals/chapter11-custom-machine)
- [Ch 22: Snapshot vs Migration](/blog/tools/emulation/qemu-internals/chapter22-snapshot-vs-migration)
