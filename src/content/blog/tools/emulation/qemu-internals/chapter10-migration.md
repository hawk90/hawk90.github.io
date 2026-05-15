---
title: "Ch 10: 마이그레이션"
date: 2025-10-01T10:00:00
description: "QEMU 라이브 마이그레이션과 VMState를 이해한다."
tags: [QEMU, Migration, VMState]
series: "QEMU Internals"
seriesOrder: 10
draft: true
---

## 라이브 마이그레이션

실행 중인 VM을 다른 호스트로 이동:

1. 메모리 페이지 전송 (iterative)
2. 디바이스 상태 전송
3. CPU 상태 전송
4. 스위치오버

---

## VMState

디바이스 상태 직렬화:

```c
static const VMStateDescription vmstate_my_device = {
    .name = "my_device",
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_UINT32(reg0, MyDeviceState),
        VMSTATE_UINT32(reg1, MyDeviceState),
        VMSTATE_END_OF_LIST()
    }
};
```

---

## 마이그레이션 명령

```bash
# 소스
(qemu) migrate tcp:dest:4444

# 목적지
qemu-system-x86_64 ... -incoming tcp:0:4444
```

---

## 정리

- 라이브 마이그레이션으로 실행 중인 VM을 이동한다.
- VMState로 디바이스 상태를 직렬화한다.
- 버전 관리로 호환성을 유지한다.

---

## 관련 항목

- [Ch 9: 타이머와 클럭](/blog/tools/qemu-internals/chapter09-timers)
- [Ch 11: 커스텀 머신 타입](/blog/tools/qemu-internals/chapter11-custom-machine)
