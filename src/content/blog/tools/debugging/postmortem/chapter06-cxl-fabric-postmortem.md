---
title: "CXL Fabric Postmortem — 분산 디바이스·Multi-Host Pool 장애 추적"
slug: "tools/debugging/postmortem/chapter06-cxl-fabric-postmortem"
date: 2026-06-18T09:08:00
description: "CXL 2.0/3.x fabric에서 multi-host pooled 디바이스 fail 분석 — Fabric Manager log·LD 상태·cross-host correlation."
series: "Postmortem Debugging"
seriesOrder: 6
tags: [cxl, fabric, postmortem, multi-host, pooling, fabric-manager]
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 한 host의 vmcore만으로는 부족한가

[Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)의 vmcore는 한 host 커널이 본 세계입니다. 그 host의 region, decoder, memdev 객체와 printk 버퍼가 들어 있지만, 같은 장치를 나눠 쓰는 다른 host와 장치를 나눠 준 쪽의 기록은 없습니다. fabric 장애를 추적하려면 그 바깥의 기록을 따로 모아 맞춰야 합니다. 이 장은 무엇이 어디에 남는지를 [CXL 3.1 사양](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)(Revision 3.1, Version 1.0)의 정의로 정리하고, 여러 출처의 시각을 비교하는 함수를 실행해 봅니다. multi-host 하드웨어나 Fabric Manager 구현을 돌린 기록은 없습니다.

사양에서 이 장의 전제가 되는 정의는 세 가지입니다.

- **Fabric Manager(FM)는 논리적 프로세스입니다.** §7.6.1은 FM을 "재구성이 필요한 때를 정하고 명령을 내리는 논리적 프로세스"로 정의하고, host에서 도는 소프트웨어, BMC의 임베디드 소프트웨어, 다른 CXL 장치나 스위치의 펌웨어, 장치 안의 상태 기계 모두 될 수 있다고 적습니다. FM 로그가 어디 있는지는 그 구현을 보기 전에는 알 수 없습니다.
- **FM은 CCI로 명령합니다.** §7.6.2에 따르면 FM API 명령은 장치의 mailbox 레지스터나 MCTP 인터페이스로 노출된 CCI(Component Command Interface)로 갑니다. 스위치는 "Tunnel Management Command"로 뒤에 붙은 MLD에 명령을 전달할 수 있습니다.
- **MLD의 FM 전용 LD가 내는 오류는 FM에게만 갑니다.** §2.4에 따르면 Type 3 MLD는 host에 묶을 LD를 최대 16개, FM 전용 LD(FMLD, LD-ID FFFFh)를 하나 가집니다. FMLD가 만드는 오류 메시지는 "FM으로만 라우팅"됩니다. 이런 오류는 어느 host의 vmcore에도 없습니다.

## 사건을 연결할 식별자와 자료

여러 출처를 한 사건으로 묶으려면 공통 열쇠가 필요합니다. 아래 표의 가운데 열이 그 열쇠이고, 오른쪽 열은 그 자료가 없으면 답할 수 없는 질문입니다.

| 자료 | 함께 보존할 식별·조건 | 자료가 없을 때 판단할 수 없는 것 |
|------|------|------|
| Host vmcore·kernel log | host 이름, boot ID, 커널 빌드, dump에 포함된 메모리 범위 | 장치 전체 상태, 다른 host의 동작 |
| FM 로그·DB 스냅숏 | fabric·장치·LD-ID, 할당 세대, 요청과 응답 | host가 실제로 그 용량을 썼는지 |
| 스위치·장치 이벤트 레코드 | 포트·LD-ID, 펌웨어·reset 세대, 수집 시각 | 과거 라우팅, 수집 전에 덮인 이벤트 |
| CEDT/CFMWS·decoder 맵 | host HPA, 장치 DPA, interleave, 유효 기간 | 두 host의 같은 HPA가 같은 메모리인지 |
| 워크로드·RAS 모니터링 | 주소의 의미, 접근 주체, 카운터 단위 | 누가 언제 접근했는지 |

HPA는 host마다 따로인 주소 공간입니다. host A의 0x2_0000_0000과 host B의 0x2_0000_0000은 서로 다른 decoder를 거치므로 같은 데이터라는 보장이 없습니다. 비교는 decoder 맵으로 각 HPA를 장치의 (LD-ID, DPA)로 바꾼 뒤에 합니다.

사양 §7.6.8은 FM이 받는 이벤트 레코드를 세 종류로 정의합니다. Physical Switch Event Records(§7.6.8.1), Virtual CXL Switch Event Records(§7.6.8.2), MLD Port Event Records(§7.6.8.3)입니다. 이 레코드가 스위치·장치 쪽 타임라인의 원본이므로, 장애 직후 reset이나 재할당을 하기 전에 FM이 읽어 저장해야 합니다.

## 시간 정렬 — 숫자 정렬과 인과 순서는 다릅니다

출처마다 시계가 다릅니다. Linux의 printk 타임스탬프는 부팅 뒤 경과 시간이고, FM 로그는 FM이 도는 머신의 시계, 장치 이벤트 레코드는 장치의 타임스탬프입니다. `crash`의 [`sys`](https://crash-utility.github.io/help_pages/sys.html) 명령은 system 정보와 syscall 표, 커널 설정, taint, DMI를 보여 줄 뿐 시계 변환을 하지 않습니다. 변환은 분석하는 쪽이 해야 합니다.

변환할 때 기록할 것은 각 출처의 시간 기준(부팅 기준인지, UTC인지)과 boot·세션 ID, 측정한 offset과 drift, 그리고 오차 범위입니다. PTP로 동기화했다면 [ptp4l](https://www.linuxptp.org/documentation/ptp4l/)이 하드웨어 타임스탬프를 썼는지 소프트웨어 타임스탬프를 썼는지도 남깁니다. 정밀도가 그 설정에 따라 다르기 때문입니다.

오차를 기록했다면 사건 시각을 점이 아닌 구간 `[lo, hi]`로 다룹니다. 두 구간이 겹치면 순서를 말할 수 없습니다. 아래는 공통 시간축의 나노초로 이미 바꾼 두 구간의 관계만 판정하는 함수입니다. 2^53을 넘는 나노초도 정확해야 하므로 `bigint`를 씁니다.

```js title="event-window-order.mjs"
export function eventOrder(a, b) {
  for (const event of [a, b]) {
    if (event === null || typeof event !== 'object' ||
        typeof event.lo !== 'bigint' || typeof event.hi !== 'bigint' ||
        event.lo > event.hi)
      throw new TypeError('ordered bigint interval required');
  }
  if (a.hi < b.lo) return 'before';
  if (b.hi < a.lo) return 'after';
  return 'undetermined';
}
```

Node.js 24.21.0에서 합성 사건으로 돌린 결과입니다. 앞의 두 사건은 오차 ±20 µs이고, 하나는 50 µs, 하나는 30 µs 떨어져 있습니다.

```text
$ node run.mjs
A AER vs FM unbind, ±20 µs: before
A AER vs B AER, ±20 µs, 30 µs apart: undetermined
touching edges: undetermined
reverse: after
2^63 ns scale: before
null: TypeError: ordered bigint interval required
{"lo":1,"hi":2}: TypeError: ordered bigint interval required
{"lo":"5n","hi":"1n"}: TypeError: ordered bigint interval required
```

30 µs 간격은 오차 합계 40 µs보다 작아서 `undetermined`입니다. 끝점이 맞닿은 구간도 겹친 것으로 봅니다. `before`가 나와도 그것은 시간 순서일 뿐 인과가 아닙니다. 인과를 말하려면 요청 ID나 할당 세대처럼 두 기록을 직접 잇는 값이 필요합니다.

## 시나리오별 가설과 반증 조건

### 1. Switch·공통 경로 실패

여러 host가 비슷한 시각에 오류를 냈다면 공통 경로가 첫 가설입니다. 확인할 것은 실제 라우팅입니다. FM의 Physical Switch Event Records와 각 host의 decoder 맵으로 오류 난 host들이 같은 스위치 포트를 지나는지 봅니다. 같은 스위치를 지나는데 오류가 없었던 host가 가장 강한 반증입니다. 그 host가 같은 시간대에 그 경로로 트래픽을 보냈다는 기록이 있다면 공통 경로 가설은 약해집니다.

### 2. LD·capacity 소유권 전이 문제

사양 §2.4.3은 두 모델을 구분합니다. 각 HDM 영역이 host 하나에만 묶이면 **pooled memory**이고, 여러 host가 한 영역에 동시에 접근하도록 구성되면 **Shared FAM**입니다. 그래서 두 host가 같은 영역을 쓴 흔적이 있어도 그 영역이 Shared FAM으로 구성됐다면 정상입니다. pooled 영역에서 같은 일이 났다면 할당 세대, 이전 host의 unbind·offline 완료 기록, decoder 해제 순서를 시간 구간으로 맞춰 봅니다. Dynamic Capacity Device(§9.13.3)는 용량이 실행 중에 붙고 떨어지므로, extent 추가·해제 요청과 응답을 같은 방식으로 정렬합니다.

host 쪽 Linux 6.12가 남기는 CXL trace 이벤트는 [`drivers/cxl/core/trace.h`](https://github.com/torvalds/linux/blob/v6.12/drivers/cxl/core/trace.h)에 정의된 여덟 가지입니다.

| 이벤트 | 내용 |
| --- | --- |
| `cxl_aer_uncorrectable_error` / `cxl_aer_correctable_error` | CXL RAS capability의 오류 상태(`status`, `first_error`) |
| `cxl_overflow` | 장치 이벤트 로그 넘침 |
| `cxl_generic_event` | 형식을 모르는 이벤트 레코드 |
| `cxl_general_media` / `cxl_dram` / `cxl_memory_module` | 장치가 보고한 메모리 이벤트 레코드 |
| `cxl_poison` | poison 목록 조회·주입·삭제(`List`/`Inject`/`Clear`) 결과 |

이 중 어느 것도 메모리 읽기·쓰기 트랜잭션을 기록하지 않습니다. CPU의 load/store는 드라이버를 거치지 않기 때문입니다. 누가 어느 주소를 언제 건드렸는지는 장치나 스위치의 텔레메트리, 프로토콜 분석기에서만 나옵니다.

### 3. Coherency·tail latency 문제

사양 §2.2.1에 따르면 Back-Invalidate Snoop(BISnp)은 HDM-DB 메모리를 가진 Type 2·Type 3 장치가 host 캐시를 무효화할 때 쓰는 S2M 채널이고, 응답은 BIRsp 채널로 옵니다. 256B Flit 모드를 구현한 장치는 HDM-DB를 지원해야 합니다. Shared FAM 영역의 coherency 모델은 FM이 정합니다. §2.4.4는 각 shared HDM-DB 영역을 "multi-host hardware coherency"와 "software-managed coherency" 중 하나로 지정한다고 적고, Shared FAM을 HDM-H로 노출하면 host 사이에는 소프트웨어 coherence만 된다고 적습니다.

따라서 tail latency를 BISnp 탓으로 보려면 먼저 그 영역이 HDM-DB이고 hardware coherency로 지정됐는지를 FM 설정에서 확인합니다. HDM-H나 software-managed 영역이라면 BISnp는 원인 후보가 아닙니다. host vmcore에는 BISnp 횟수가 없으므로, 장치 쪽 카운터와 같은 워크로드에서 비교한 지연 분포가 근거가 됩니다.

### 4. FM process·database 장애

FM이 멈춘 동안 어떤 일이 있었는지는 FM이 남긴 요청·응답 기록과 장치·스위치가 지금 가진 바인딩 상태를 비교해 봅니다. 비교 결과 FM 데이터베이스에는 할당됐다고 적혀 있는데 스위치의 Virtual CXL Switch 정보에는 바인딩이 없다면, 그 요청은 완료되지 않은 것입니다. FM을 다시 띄워 요청을 재실행하기 전에 이 차이를 기록해야, 같은 요청이 두 번 실행됐는지 나중에 가려낼 수 있습니다.

## drgn과 외부 자료의 경계

Debian 13의 drgn 0.0.31에는 CXL 전용 helper가 없습니다. Ch 5에서는 범용 `bus_for_each_dev()`로 `cxl_bus_type`의 장치를 돌고 `device_type` 이름으로 region과 decoder를 골랐습니다. 이 방법으로 보이는 것은 그 host 커널의 객체뿐이고, 다른 host의 LD 바인딩이나 FM의 할당 상태는 나오지 않습니다. host 쪽 결과는 host 이름·boot ID·decoder의 HPA 범위를 붙여 저장하고, FM과 장치 스냅숏과는 LD-ID와 DPA로 잇습니다.

## 분석 체크리스트와 결론의 범위

| 단계 | 남길 결과 | 결론을 보류할 조건 |
|------|------|------|
| 증거 보존 | 원본 해시, 수집자, 출처, 세대 | 장애 뒤 reset·재할당으로 원본 상태가 바뀜 |
| ID·주소 매핑 | HPA→(LD-ID, DPA), 포트, 할당 유효 기간 | 같은 숫자만 있고 decoder 맵이 없음 |
| 시간 비교 | 시간 기준, 오차 구간, 시계 변경 기록 | 오차가 사건 간격보다 큼(`undetermined`) |
| 가설 대조 | 영향을 받은 표본과 받지 않은 표본, 대안 가설 | 로그 하나가 없다는 것만으로 FM 다운을 결론 |
| 복구·재사용 | 소유권, 남은 접근, 정리 완료 증거 | 요청 응답만 있고 실제 해제 기록이 없음 |

전송되지 않은 로그, dump에서 빠진 페이지, 폴링 사이에 바뀐 상태는 "사건이 없었다"는 증거가 아닙니다. 보고서에는 확인된 사실, 원인 후보, 확인하지 못한 범위를 따로 적습니다.

## 시리즈 마무리

이 시리즈는 프로세스 core가 만들어지는 조건(Ch 1)에서 시작해, ELF core의 구조(Ch 2), GDB 분석 패턴(Ch 3), debuginfod와 minidump 자동화(Ch 4), 커널 vmcore에서 CXL 객체 읽기(Ch 5)를 거쳐, 여러 host와 FM에 흩어진 기록을 잇는 방법(Ch 6)으로 끝납니다. Ch 1–5는 QEMU의 Debian 13 arm64 VM에서 재현한 출력이고, Ch 6은 CXL 3.1 사양의 정의와 합성 데이터로 돌린 함수 하나가 근거입니다.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 4: 포스트모템 자동화](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)
- [Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
