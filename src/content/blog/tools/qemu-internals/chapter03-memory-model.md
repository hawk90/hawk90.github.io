---
title: "Ch 3: 메모리 모델"
date: 2025-10-01T03:00:00
description: "MemoryRegion과 AddressSpace로 QEMU의 메모리 시스템을 이해한다."
tags: [QEMU, Memory, AddressSpace]
series: "QEMU Internals"
seriesOrder: 3
draft: true
---

## QEMU 메모리 모델

QEMU의 메모리 시스템은 두 가지 핵심 개념으로 구성됩니다:

- **MemoryRegion**: 메모리 영역 정의
- **AddressSpace**: 주소 공간 뷰

---

## MemoryRegion

```c
MemoryRegion mr;
memory_region_init_io(&mr, owner, &ops, opaque, "name", size);
memory_region_init_ram(&mr, owner, "name", size, &error_fatal);
```

타입:
- I/O (`init_io`): 콜백으로 읽기/쓰기 처리
- RAM (`init_ram`): 실제 메모리
- ROM (`init_rom`): 읽기 전용 메모리
- Alias (`init_alias`): 다른 영역 참조
- Container (`init`): 하위 영역 그룹화

---

## AddressSpace

```c
address_space_memory  // 시스템 메모리 공간
address_space_io      // I/O 포트 공간
```

---

## FlatView

AddressSpace를 평면화한 뷰로, 실제 메모리 접근에 사용됩니다.

---

## 정리

- MemoryRegion으로 메모리 영역을 정의한다.
- AddressSpace는 CPU/디바이스가 보는 주소 공간이다.
- FlatView로 평면화해 실제 접근을 처리한다.

---

## 관련 항목

- [Ch 2: QOM 심화](/blog/tools/qemu-internals/chapter02-qom-deep-dive)
- [Ch 4: 이벤트 루프](/blog/tools/qemu-internals/chapter04-event-loop)
