---
title: "CXL 디바이스 트러블슈팅 — RAS 이벤트·Poison List·Media Error 추적"
date: 2026-06-18T09:02:00
description: "CXL 디바이스의 RAS(Reliability·Availability·Serviceability) 이벤트와 poison list·media error를 추적하는 진단 흐름."
series: "Embedded Debugging"
seriesOrder: 9
tags: [cxl, ras, poison, media-error, debugging, mailbox]
draft: true
---

> Outline — [Ch 8](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)에서 *링크 자체*를 봤다. 이 장은 *링크 위에서 동작하는 디바이스의 상태 이상*을 본다.
>
> 다룰 것:
>
> - **CXL RAS 이벤트 분류** — Correctable·Uncorrectable·Fatal. AER (Advanced Error Reporting)와의 관계
> - **Poison List** — 디바이스가 *bad media를 추적하는 리스트*. `cxl list -P`로 확인
> - **Media Error 종류** — DRAM ECC·persistent media corruption·refresh failure
> - **CXL Mailbox 명령** — `Get Health Info`, `Get Event Records`, `Clear Event Records`. `cxl set-event-irq` 사용
> - **이벤트 로그 종류** — Information·Warning·Failure·Fatal. 각각 별도 log
> - **Linux 통합** — `/sys/bus/cxl/devices/memX/poison/`, `/sys/bus/cxl/devices/memX/events/`
> - **bpftrace로 CXL 이벤트 추적**:
>   ```bash
>   bpftrace -e 'tracepoint:cxl:cxl_poison { printf("%s addr=%llx\n", str(args->kind), args->addr); }'
>   ```
> - **Performance vs RAS 트레이드오프** — 이벤트 처리가 *throughput에 미치는 영향*. polling vs interrupt
> - **실 사례** — 운영 사례에서의 *poison page 격리*, *bad block 회피*, *디바이스 교체 결정*
>
> 다음 단계는 *Kernel Debugging의 CXL 드라이버 디버깅* 또는 *Memory Diagnostics의 CXL 메모리 진단*으로 자연 연결된다.
