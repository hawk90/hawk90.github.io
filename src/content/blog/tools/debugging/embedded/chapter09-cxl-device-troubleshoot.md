---
title: "CXL 디바이스 트러블슈팅 — RAS 이벤트·Poison List·Media Error 추적"
date: 2026-06-18T09:02:00
description: "CXL 디바이스의 RAS(Reliability·Availability·Serviceability) 이벤트와 poison list·media error를 추적하는 진단 흐름."
series: "Embedded Debugging"
seriesOrder: 9
tags: [cxl, ras, poison, media-error, debugging, mailbox]
draft: false
---

## 왜 별도 진단이 필요한가

[Ch 8](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)에서 *링크 자체*를 봤습니다. 링크가 정상이어도 *디바이스 측에서 문제*가 발생할 수 있습니다. DRAM ECC error, refresh failure, media wear 같은 *디바이스 내부 이상*은 *링크 진단으로 안 보입니다*.

CXL는 *RAS 이벤트 채널*과 *poison list 메커니즘*으로 *디바이스 측 진단 정보*를 호스트에 노출합니다.

## RAS 이벤트 등급

CXL Spec이 정의하는 *4가지 등급*:

| 등급 | 의미 | 호스트 대응 |
|------|------|-----------|
| Information | 정보성 (mailbox completion 등) | log만 |
| Warning | Correctable error | counter 모니터링 |
| Failure | Uncorrectable, 단일 영역 | poison list 격리, page offline |
| Fatal | 디바이스 오류 | 디바이스 reset 또는 교체 |

Linux 6.2+는 *Failure 이상에서 자동 page offline + MCE 이벤트* 트리거.

## CXL Mailbox로 상태 확인

mailbox 명령으로 디바이스 health 조회:

```bash
# 1. Health Info (Mailbox opcode 0x4400)
$ cxl health -m mem0
{
  "memdev":"mem0",
  "health_status":"normal",
  "media_status":"normal",
  "ext_status":"normal",
  "life_used_percent":12,
  "temperature":42,
  "dirty_shutdown_count":3,
  "volatile_uncorrectable_errors":0,
  "persistent_uncorrectable_errors":0
}

# 2. Event Records (opcode 0x4500)
$ cxl monitor -m mem0
[2026-06-18 09:10:23] Info: Mailbox cmd 0x4400 completed in 1.2ms
[2026-06-18 09:11:45] Warning: Correctable ECC error at 0x80045000
[2026-06-18 09:12:01] Failure: Media error at 0x80067800 — added to poison list
```

## Poison List 추적

*Poison List*는 *디바이스가 bad media를 기록하는 리스트*입니다.

```bash
# Poison list 조회 (opcode 0x4800)
$ cxl list -m mem0 -P
{
  "poison":[
    {
      "address":"0x80012340",
      "length":64,
      "source":"injected"     # 테스트 주입
    },
    {
      "address":"0x80015800",
      "length":64,
      "source":"internal"     # 디바이스 자체 감지
    },
    {
      "address":"0x80067800",
      "length":4096,
      "source":"vendor"       # 펌웨어 감지
    }
  ]
}

# Poison 클리어 (보통 권장 안 함)
$ cxl clear-poison -m mem0 -a 0x80012340
```

*injected*는 *테스트용 주입*, *internal*은 *DRAM controller 자체 감지*, *vendor*는 *펌웨어 진단*. *source가 internal이 늘어남*은 *media wear 신호*.

## Linux 통합 — sysfs

`/sys/bus/cxl/devices/memX/`에 poison·event 통합:

```bash
# Poison list
$ ls /sys/bus/cxl/devices/mem0/poison/
list  inject  clear

$ cat /sys/bus/cxl/devices/mem0/poison/list
0x80012340 64 injected
0x80015800 64 internal
0x80067800 4096 vendor

# Events
$ ls /sys/bus/cxl/devices/mem0/events/
info  warning  failure  fatal

$ cat /sys/bus/cxl/devices/mem0/events/failure | tail -10
[2026-06-18 09:12:01] Media error at 0x80067800 (size=4096)
```

## bpftrace로 이벤트 추적

CXL 이벤트 발생 빈도 모니터링:

```bash
# 모든 CXL 이벤트
$ bpftrace -e '
  tracepoint:cxl:cxl_aer_uncorrectable_error {
    @ue[str(args->kind)] = count();
  }
  tracepoint:cxl:cxl_aer_correctable_error {
    @ce[str(args->kind)] = count();
  }
  interval:s:60 {
    print(@ue);
    print(@ce);
    clear(@ue);
    clear(@ce);
  }
'

# 출력 예
@ue[mailbox_timeout]: 2
@ce[ecc_error]: 145
```

## Page Offline 자동화

Failure 이벤트 시 *kernel이 자동 page offline*:

```bash
# Failure event 발생 후
$ cat /sys/devices/system/memory/auto_online_blocks
offline

# 영향 받은 page 확인
$ cat /sys/devices/system/node/node2/memoryX/state
offline

# offline pages 통계
$ cat /proc/meminfo | grep HardwareCorrupted
HardwareCorrupted: 4 kB

# Workload에 영향
$ dmesg | tail
[12345.6789] Memory failure: 0x80067800: recovery action for huge page: Sending SIGBUS
```

*offline된 page에 접근하는 워크로드*는 *SIGBUS*. *graceful recovery*가 필요.

## Performance vs RAS 트레이드오프

| 모드 | Latency 영향 | 정확도 |
|------|------------|--------|
| Polling | 없음 (별도 thread) | 5초 간격 정도 |
| Interrupt | 약간 (per event ~1μs) | 즉시 |
| Hybrid | 작음 | 즉시 + summary polling |

대부분 *Interrupt 권장*. *cxl set-event-irq -m memX -e all* 명령으로 활성.

## 운영 사례 — Poison Page 격리

실 상황의 *poison page 처리 흐름*:

```text
1. 디바이스가 internal media error 감지
2. Poison list에 추가, event log에 기록
3. Interrupt → host kernel 알림
4. Kernel이 affected page를 offline
5. 해당 page에 매핑되어 있던 process에 SIGBUS
6. Process가 정상 종료 또는 fault handler에서 복구
7. 운영팀이 cxl monitor 알림으로 인지
8. Poison rate 추적해 디바이스 교체 결정
```

이 흐름이 *데이터센터 운영 표준 절차*.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl health` 결과 "warning" | life_used_percent 또는 dirty_shutdown 증가 — 모니터링 |
| Poison rate 갑자기 증가 | media wear 진행 — 디바이스 교체 검토 |
| `cxl monitor` 응답 없음 | event interrupt 비활성. `cxl set-event-irq` 필요 |
| 영향 받은 page에 process 정지 | SIGBUS 처리 안 함 — graceful recovery 구현 필요 |
| Temperature 비현실적 (255 또는 0) | 디바이스 firmware bug — sensor 미초기화 |
| 갑작스러운 throughput 저하 | thermal throttling — `cxl health temperature` 확인 |
| Multi-host pool LD 접근 실패 | LD 할당 충돌 — Fabric Manager log 확인 |
| Page offline 빈번 | bad media 진행 — poison rate 임계 설정 |
| Failure event 후 region 정상 | partial failure — 영향 받은 page만 offline, 나머지 OK |
| Fatal event 후 메모리 사라짐 | 디바이스 offline 완료. region remove. |

## 진단 워크플로

1. `cxl health -m memX` — 디바이스 자체 상태 확인
2. `cxl list -m memX -P` — poison list 변화 추적
3. `cxl monitor -m memX` — 실시간 event log 모니터링
4. `dmesg | grep -E "cxl|memory_failure|mce"` — kernel 이벤트
5. `bpftrace`로 이벤트 빈도 patterns 분석
6. 장기 추적: poison rate, life_used_percent, dirty_shutdown_count

## 정리

- CXL 디바이스 트러블슈팅은 *링크 디버깅과 별개* — *디바이스 측 RAS 이벤트와 poison list*를 봐야 합니다.
- RAS 이벤트는 *Information·Warning·Failure·Fatal* 4단계. *Failure 이상에서 page offline*이 자동 trigger.
- *Poison list*는 *bad media를 추적하는 리스트*. *internal source가 늘어남*은 media wear 신호.
- *cxl health·monitor·list -P*가 표준 도구. `/sys/bus/cxl/devices/memX/poison/events/`로 통합.
- 운영에서는 *poison rate·life_used·dirty_shutdown* 세 지표를 *장기 추적*해 디바이스 교체 결정.

## 다음 장 예고

Embedded Debugging 시리즈에 *CXL 관련 추가 챕터는 여기까지*. 다음 깊이는 *Kernel Debugging Ch 8~9*의 *드라이버 코드 디버깅*과 *Memory Diagnostics Ch 6~7*의 *메모리 진단·tiered memory*로 자연 분산됩니다.

## 관련 항목

- [Ch 8: CXL Link Training 디버깅](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
