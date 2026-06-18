---
title: "CXL Fabric Postmortem — 분산 디바이스·Multi-Host Pool 장애 추적"
date: 2026-06-18T09:08:00
description: "CXL 2.0/3.x fabric에서 multi-host pooled 디바이스 fail 분석 — Fabric Manager log·LD 상태·cross-host correlation."
series: "Postmortem Debugging"
seriesOrder: 6
tags: [cxl, fabric, postmortem, multi-host, pooling, fabric-manager]
draft: true
---

> Outline — [Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)에서 *단일 디바이스* postmortem을 봤다. CXL 2.0 pooling·CXL 3.0 fabric에서는 *한 호스트의 vmcore만으로는 부족*하다.
>
> 다룰 것:
>
> - **Fabric의 추가 자료**:
>   - *Fabric Manager (FM) 로그* — out-of-band 컨트롤 채널 이벤트
>   - *Logical Device (LD) 할당 이력* — host A → B로 transfer 시점
>   - *Switch routing 테이블* — fabric 토폴로지
>   - *Coherency domain ID* — 어느 host가 어느 영역을 owning
> - **Multi-host correlation 어려움** — 같은 디바이스·다른 host vmcore가 *시간 동기화 안 됨*. NTP·PTP 기반 시간 매핑
> - **시나리오 1 — Switch failure**:
>   - 모든 attached host에서 *동시 access 실패*
>   - 각 host vmcore의 *AER + cxl_pci err handler* 추적
>   - FM 로그에서 *switch port down 이벤트*
> - **시나리오 2 — LD 충돌**:
>   - 같은 LD를 *두 host가 동시 owning*
>   - FM 로그에서 *allocation 충돌*
>   - kernel은 *normal로 보이지만 데이터 corruption* 의심
> - **시나리오 3 — Coherent Fabric의 Cache invalidation 폭증**:
>   - CXL 3.0의 *peer-to-peer coherency*에서 *cache line ping-pong*
>   - Performance 저하 후 watchdog timeout
>   - bpftrace로 *snoop 빈도 추적*
> - **시나리오 4 — Fabric Manager 자체 failure**:
>   - FM이 다운되면 *런타임 동적 할당 정지*
>   - 기존 할당은 동작하지만 *hot-plug·재할당 불가*
>   - FM 자체 process core dump 분석
> - **drgn 확장 — fabric helper**:
>   ```python
>   from drgn.helpers.linux.cxl_fabric import for_each_logical_device
>   for ld in for_each_logical_device(prog):
>       print(f"LD {ld.id}: owner_host={ld.owner_host_id}")
>   ```
> - **Correlation 도구** — Lustre·Ceph 분산 trace 분석 기법을 *CXL fabric에 적용*
> - **모범 사례** — *분산 logging*, *centralized event collection*, *FM redundancy*
> - **시리즈 마무리** — Postmortem Debugging이 *프로세스 core 단일 분석에서 분산 CXL fabric까지* 완주
>
> CXL 시리즈 *분산 추가의 마무리*. 본 시리즈에 이어 *기존 시리즈 어디에 어떤 챕터를 더할지*는 *실 운영 사례 누적*에 따라 자연 결정.
