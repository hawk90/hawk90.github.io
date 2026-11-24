---
title: "Ch 1: CXL의 자리와 진화 — 1.1에서 4.0까지"
slug: "embedded/hardware/cxl/chapter01-cxl-position"
date: 2026-05-16T09:01:00
description: "CXL이 푸는 문제, 세대별 진화, 4.0의 핵심 변경 (128 GT/s·Bundled Port)."
series: "CXL 4.0 Internals"
seriesOrder: 1
tags: [cxl, pcie, memory, interconnect]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL은 *PCIe 인프라*를 그대로 쓰면서 *가속기와 메모리 디바이스가 CPU와 더 가깝게 동작하도록* 만든 인터커넥트입니다."** — 가속기는 *host 메모리를 캐시*하고, host는 *device 메모리를 native load/store*합니다. CXL 4.0은 *PCIe 7.0 기반 128 GT/s*에 *Bundled Port·Streamlined Port*를 더한 세대입니다.

이 시리즈는 CXL의 개념·프로토콜·소프트웨어 관찰을 15편으로 정리합니다. PCIe enumeration과 물리 주소·캐시의 기본 개념을 아는 독자를 대상으로 합니다. 규격 본문은 컨소시엄이 공개한 CXL 3.1 평가판(Revision 3.1, 2023년 8월)을 절·표 번호로 인용합니다. CXL 4.0 규격 평가판은 내려받으려면 신청자 이름·이메일·회사를 제출해야 해서 열람하지 않았습니다. 그래서 4.0 내용은 컨소시엄의 발표문·백서·공식 Q&A에 적힌 범위만 씁니다. 실행 결과는 Debian 13 arm64 게스트(커널 6.12.116)를 QEMU 11.1.3의 CXL Type 3 에뮬레이션 위에서 돌려 얻었습니다.

## 세 가지 질문으로 읽기

이 시리즈는 프로토콜 정의와 OS에서 사용할 수 있는 메모리의 상태를 나눠 읽으면 연결이 쉽습니다. 특히 Type 3 장치가 발견됐다는 사실과 CPU가 그 메모리를 사용할 수 있다는 사실은 다릅니다.

| 질문 | 읽을 장 | 확인할 경계 |
|------|------|------|
| PCIe 장치와 CXL 메모리는 어디서 갈라지는가? | [Ch 6 CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io), [Ch 8 CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem) | config·MMIO·DMA와 HDM의 CPU 메모리 접근 |
| 장치 메모리가 Linux에서 사용 가능해지려면? | [Ch 11 driver](/blog/embedded/hardware/cxl/chapter11-linux-driver), [Ch 12 guest 실습](/blog/embedded/hardware/cxl/chapter12-qemu-emulation#guest를-실제로-부팅해-확인한-범위) | window·memdev·region commit·DAX/System RAM의 단계 |
| 여러 host나 가속기가 공유하면 무엇이 더 필요한가? | [Ch 3 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model), [Ch 4 pooling](/blog/embedded/hardware/cxl/chapter04-pooling-gfam), [Ch 13 fabric](/blog/embedded/hardware/cxl/chapter13-switching-fabric) | 영역 할당·coherency·소유권·반납 |

Linux·QEMU 실습은 Type 3의 발견과 구성 경계를 다룹니다. CXL.cache·BISnp의 wire 동작이나 CXL 4.0의 128 GT/s·Bundled Port를 같은 실험으로 검증한 것은 아닙니다. 먼저 guest에서 어디까지 성공했는지 확인하고, 그 단계에 필요한 프로토콜 설명으로 돌아오는 순서도 가능합니다.

## CXL이 푸는 문제 — PCIe만으로는 부족했던 것

PCIe 장치는 DMA로 host 메모리를 읽고 쓰지만, 그 사본을 host CPU 캐시와 같은 규칙으로 관리하지는 않습니다. host 쪽에서 장치 메모리를 보는 길도 MMIO여서 일반 메모리처럼 캐시하며 쓰는 대상이 아닙니다. CXL 3.1 §1.4.1은 CXL의 이점을 *가속기가 시스템에 접근하고, 시스템이 CXL 장치에 붙은 메모리에 접근하는 저지연·고대역폭 경로*로 정의합니다. 도서관에 비유하면 PCIe DMA는 책을 복사해 오는 대출 창구이고, CXL.cache는 서가의 책을 직접 빌려 두되 도서관이 그 책의 행방을 추적하는 방식입니다.

CXL은 *세 프로토콜의 묶음*으로 이 문제를 풉니다(§1.4.1).

| 프로토콜 | 시맨틱 | 의무 여부 |
|---------|--------|----------|
| **CXL.io** | PCIe와 비슷한 I/O — discovery·enumeration·error reporting·CXL 메모리로의 P2P 접근·HPA lookup | *필수* |
| **CXL.cache** | 디바이스가 *host 메모리를 캐시* — coherent read/write | 선택 (Type 1·2) |
| **CXL.mem** | host가 *device 메모리를 load/store* | 선택 (Type 2·3) |

§1.6과 Figure 1-9는 계층을 이렇게 나눕니다. transaction 계층과 link 계층이 각각 CXL.io 쪽과 CXL.cache+CXL.mem 쪽으로 갈라지고, 두 흐름을 ARB/MUX가 interleave해 하나의 물리 계층으로 보냅니다. 링크가 PCIe 모드로 갈지 CXL 모드로 갈지는 링크 트레이닝 중 *alternate protocol negotiation*에서 정해집니다(§1.4.2).

## 세 프로토콜의 분리가 만든 단순함

CXL 설계의 가장 *영리한 결정*은 *I/O와 메모리·캐시 시맨틱의 분리*입니다. 아파트 공용 현관(CXL.io)은 모두가 지나가지만, 주차장 출입증(CXL.cache)이나 창고 열쇠(CXL.mem)는 필요한 세대만 받는 구조와 비슷합니다.

- CXL.io는 필수입니다(§1.4.1). 발견·설정은 PCIe와 같은 configuration space로 합니다.
- *CXL.cache·CXL.mem은 선택*입니다. §1.4.1은 이 둘을 "가속기·메모리 장치의 사용 모델에 따라 선택적으로 구현"한다고 씁니다. 캐시만 필요한 Type 1은 CXL.cache를, memory expander인 Type 3는 CXL.mem을 켭니다.
- 물리 계층은 PCIe 전기 규격을 씁니다. §1.4.2는 Flex Bus가 PCIe electrical을 쓰므로 PCIe retimer, PCIe를 지원하는 form factor와 호환된다고 씁니다. 반대로 §1.6은 가속기 AIC가 CXL 모드만 구현해도 된다고 허용하므로, CXL 카드가 PCIe 모드로도 동작한다고 기대할 수는 없습니다.

## 세대 진화 — 매 세대 새로운 사용 모델

각 세대의 날짜와 핵심 추가는 CXL 3.1 규격의 Revision History(1.0~3.1)와 컨소시엄 발표문(3.2, 4.0)에서 옮겼습니다.

| 세대 | 날짜 | 추가된 핵심 능력 | 최대 속도 |
|------|------|----------------|-----------|
| **1.0** | 2019년 3월 | 최초 공개 | — |
| **1.1** | 2019년 6월 | 1.0 정정·명확화, compliance test 장 추가 | 32 GT/s (1.1 §1.5) |
| **2.0** | 2020년 10월 26일 | Switching 장 신설(single-level switch, pooling), CXL IDE, Hot-Plug, persistent memory, 메모리 오류 보고·telemetry | 32 GT/s |
| **3.0** | 2022년 8월 1일 | 256B flit, Back-Invalidate, multi-level switching·fabric, memory sharing, G-FAM, PBR, Multi-headed MLD, DCD | 64 GT/s (PAM4) |
| **3.1** | 2023년 8월 7일 | Direct P2P CXL.mem, Extended Metadata, PBR fabric 디코딩·라우팅과 FM API, GIM, TSP | 64 GT/s |
| **3.2** | 2024년 12월 3일 발표 | CHMU(Hot-Page Monitoring Unit), common event record, online FW activation, PPR 개선, 성능 모니터링 event 추가, TSP 확장 | — |
| **4.0** | 2025년 11월 18일 발표 | 128 GT/s, native x2 width, retimer 최대 4개, Bundled Port, memory RAS 개선 | 128 GT/s |

1.0 규격은 열람하지 않았고, 3.2 발표문은 링크 속도를 언급하지 않아 두 칸을 `—`로 두었습니다. 4.0 발표문은 "64GTs에서 128GTs로" 두 배라고 씁니다.

각 세대의 *큰 점프*는 *서로 다른 방향*에서 일어났습니다.

- **2.0 = Switch·Pool** — §1.4.1은 2.0이 single-level switching으로 fan-out과 여러 virtual hierarchy에 걸친 device pooling을 가능하게 했다고 씁니다.
- **3.0 = Fabric·Sharing** — 같은 절은 3.0이 최대 4K 포트의 multi-level switching으로 rack·pod 수준 fabric을 만들고, 여러 virtual hierarchy 사이의 공유 메모리를 지원한다고 씁니다.
- **4.0 = Bandwidth·Port aggregation** — 같은 fabric을 *두 배 빠르게*, *port를 묶어* 운용합니다.

4.0 발표문은 "256B Flit format으로 이전에 도입된 CXL 3.x 프로토콜 개선을 유지한다"고 쓰고, 백서는 CXL 3.0의 PAM4 신호와 FEC·CRC를 가진 flit 구조를 보존한 채 Nyquist 주파수를 두 배로 올렸다고 설명합니다.

## CXL 4.0의 핵심 변경

[CXL 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf)(2025-11-18)과 [CXL 4.0 백서](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-White-Paper_FINAL.pdf)에 적힌 변경입니다.

| 영역 | 변경 |
|------|------|
| **물리 계층** | *128 GT/s* — 백서는 "PCIe 7.0을 기반으로" 한다고 씁니다. *native x2 width*로 플랫폼 fan-out을 늘리고, *retimer 최대 4개*로 channel reach를 늘립니다. |
| **토폴로지** | **Bundled Port** — 여러 물리 device port를 *하나의 논리 entity*로 묶습니다. 묶음마다 full-capability port 하나 이상과, 데이터 이동에 최적화한 *Streamlined Port*를 둘 수 있습니다. |
| **Memory RAS** | 장치 boot 시점의 *host-initiated PPR*(Post Package Repair), boot 중 수행하거나 다음 주기로 미룰 수 있는 *memory sparing*, *patrol scrub* 주기의 세분화된 오류 검출·event 생성 |
| **호환성** | CXL 3.x·2.0·1.1·1.0과 하위 호환 |

3.1 §1.5는 CXL 모드 link width로 x16·x8·x4를 두고 x2·x1을 *degraded mode*로 분류합니다. §1.4.2는 CPU와 장치 사이에 retimer를 *한두 개* 넣을 수 있다고 씁니다. 4.0의 native x2와 retimer 4개는 이 두 항목을 넓힌 것입니다.

발표문은 대역폭 두 배를 "zero added latency"로 표현하고, 백서는 "CXL 3.0과 같은 낮은 지연·전력 효율 안에서" 처리량을 두 배로 한다고 씁니다. 이 시리즈에서는 128 GT/s 장치가 없어 이 지연 주장을 측정하지 않았습니다. 자세한 내용은 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 분해합니다.

## Bundled Port — 4.0의 가시적 변화

대역폭을 늘리는 방법은 두 가지입니다. 도로 한 차선의 제한 속도를 올리거나, 차선을 더 까는 것입니다. 128 GT/s는 앞의 방법이고, Bundled Port는 뒤의 방법입니다.

백서는 Bundled Port를 "여러 물리 CXL device port를 하나의 논리 entity로 묶는" 기능으로 설명하고, enumeration 모델은 바꾸지 않는다고 씁니다. 발표문은 그 대상을 "Host와 CXL 가속기(Type 1/2 device) 사이"로 적습니다. [공식 Q&A](https://computeexpresslink.org/blog/introducing-the-cxl-4-0-specification-webinar-qa-recap-4386/)의 Q6 답변은 bus enumeration 소프트웨어에는 여러 CXL endpoint(SLD-B)가 보이지만, device driver가 이들을 하나의 가속기로 관리한다고 설명합니다. Q10 답변은 각 port가 독립 링크라서 flit 하나가 여러 port로 쪼개지지 않는다고 씁니다.

정리하면 Bundled Port는 *link 한 가닥의 속도*가 아니라 *link 개수*를 늘리는 축입니다. 묶었을 때 실제로 무엇이 바뀌는지는 [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 봅니다.

## Flex Bus — 같은 PHY로 PCIe·CXL 둘 다

CXL의 *물리적 매개체*는 *Flex Bus*입니다. §1.4.2는 Flex Bus port가 native PCIe와 CXL 중 하나를 제공하며, 그 선택은 링크 트레이닝의 alternate protocol negotiation에서 슬롯에 꽂힌 장치에 따라 일어난다고 씁니다. 같은 콘센트에 220 V 기기와 USB 충전기가 각각 맞는 전압으로 붙는 멀티탭과 비슷합니다.

| 특성 | 3.1 규격의 내용 |
|------|------|
| 모드 결정 | 링크 트레이닝 중 alternate protocol negotiation (§1.4.2) |
| 전기 규격 | PCIe electrical. PCIe retimer·form factor와 호환 (§1.4.2) |
| link width | x16·x8·x4, degraded x2·x1 (§1.5). 4.0은 x2를 native로 추가 |
| 협상 결과 기록 | PCIe DVSEC for Flex Bus Port, DVSEC ID 0007h (§8.1.8, Table 8-2) |

협상 결과가 어디에 남는지 QEMU 게스트에서 확인했습니다. 다음은 에뮬레이션한 Type 3 endpoint `0f:00.0`의 `lspci -vvv` 일부입니다.

```text
Capabilities: [17c v1] Designated Vendor-Specific: Vendor=1e98 ID=0007 Rev=2 Len=32: CXL
	PCIe DVSEC for Flex Bus Port
	FBCap:	Cache- IO+ Mem+ 68BFlit+ MltLogDev- 256BFlit- PBRFlit-
	FBCtl:	Cache- IO+ Mem- SynHdrByp- DrftBuf- 68BFlit- MltLogDev- RCD- Retimer1- Retimer2- 256BFlit- PBRFlit-
	FBSta:	Cache- IO+ Mem+ SynHdrByp- DrftBuf- 68BFlit+ MltLogDev- 256BFlit- PBRFlit-
```

`FBCap`은 장치가 지원하는 것, `FBSta`는 협상 결과입니다. 이 장치는 CXL.io·CXL.mem이 켜진 68B flit 링크로 올라온 것으로 보고합니다. 다만 QEMU에는 실제 링크 트레이닝이 없습니다. QEMU 11.1.3 `hw/mem/cxl_type3.c:408-413`이 capability를 `0x26`, status를 `x-256b-flit` 속성이 꺼져 있으면 `0x26`으로 고정해 써 넣을 뿐입니다. 실제 하드웨어라면 같은 레지스터에 트레이닝 결과가 들어갑니다.

## Layering 개관 — 다음 14편의 지도

CXL의 *프로토콜 스택*은 PCIe와 같은 transaction·link·physical 계층에 *ARB/MUX*가 더해진 구조입니다(§1.6, Figure 1-9).

| Layer | 책임 | 시리즈 챕터 |
|-------|------|-----------|
| Transaction | CXL.io/cache/mem 트랜잭션 단위 | [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[7](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| Link | Flit 단위 신뢰성 (CRC·FEC·retry) | [Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format) |
| ARB/MUX | 두 link 계층 흐름의 다중화 | [Ch 10](/blog/embedded/hardware/cxl/chapter10-arb-mux) |
| Flex Bus Physical | PCIe PHY, 모드 협상 | [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features) |

ARB/MUX는 CXL.io 쪽과 CXL.cache+CXL.mem 쪽 link 계층의 트래픽을 interleave합니다(§1.6). flit 경계와 vLSM 규칙은 [Ch 10](/blog/embedded/hardware/cxl/chapter10-arb-mux)에서 다룹니다.

## 이 시리즈의 구성

| Ch | 주제 |
|----|------|
| 1 (현 글) | CXL의 자리와 진화 |
| 2 | System Architecture — Type 1·2·3·MLD·MH-MLD |
| 3 | 메모리 일관성 — HDM-DB·HDM-D·Bias·BISnp |
| 4 | Pooling·GFAM·Fabric |
| 5 | CXL 4.0의 핵심 새 기능 |
| 6 | CXL.io |
| 7 | CXL.cache |
| 8 | CXL.mem |
| 9 | Flit Format |
| 10 | ARB/MUX |
| 11 | Linux drivers/cxl/ 분석 |
| 12 | QEMU CXL 에뮬레이션 |
| 13 | Switching·Fabric Manager |
| 14 | Security — IDE·SPDM·TSP·CXL TEE |
| 15 | RAS·Performance·Compliance |

## 자주 하는 실수

### "CXL.mem만 켜면 CPU가 device DRAM을 모두 본다"

QEMU 게스트에서 이 오해가 그대로 드러났습니다. 256 MiB volatile Type 3 장치 `mem0`가 `cxl list -M`에 보이고, DVSEC의 `CXLCtl`도 `Mem+`였습니다. 그런데 `/proc/iomem`에는 펌웨어가 잡은 `10000000000-100ffffffff : CXL Window 0`만 있었고, endpoint decoder 4개는 모두 `"state":"disabled"`, `numactl -H`의 node 1은 `size: 0 MB`였습니다. 메모리로 쓰려면 root window에서 endpoint까지 decoder를 잇는 region을 만들고 commit해야 합니다. 이 arm64 게스트에서는 그 commit이 `-ENXIO`로 실패했고, 이유는 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 소스로 따라갑니다.

### "CXL 4.0이 CXL 3.x와 완전히 다른 프로토콜이다"

4.0 발표문은 256B flit 형식과 3.x 프로토콜 개선을 유지하고, 3.x·2.0·1.1·1.0과 하위 호환한다고 씁니다. 바뀐 것은 128 GT/s PHY, native x2, retimer 수, Bundled Port, memory RAS입니다.

### "CXL 디바이스를 PCIe 슬롯에 그냥 꽂으면 된다"

슬롯은 같아도 host 쪽이 CXL을 알려 줘야 OS가 CXL 장치로 다룹니다. ACPI 플랫폼에서는 그 정보가 CEDT입니다. 게스트의 CEDT를 `acpidump -n CEDT`와 `iasl -d`로 풀면 host bridge 구조(CHBS, `Associated host bridge : 0000000C`)와 fixed memory window 구조(CFMWS, `Window base address : 0000010000000000`, `Window size : 0000000100000000`) 두 개가 나옵니다. Linux v6.12 `drivers/cxl/acpi.c`는 530행에서 CHBS를, 859행에서 CFMWS를 `acpi_table_parse_cedt()`로 읽어 root decoder를 만듭니다. 게스트의 `decoder0.0`이 시작 `0x10000000000`, 크기 4 GiB로 그 window를 그대로 옮긴 것입니다.

## 정리

- CXL은 *PCIe 인프라*를 *그대로 쓰면서* 가속기·메모리 디바이스를 *CPU 가까이* 끌어옵니다.
- *세 프로토콜* (CXL.io/cache/mem) 중 *CXL.io만 필수*이고, 나머지는 사용 모델에 따라 선택합니다(3.1 §1.4.1).
- 세대 날짜는 규격 Revision History 기준 1.0 2019-03, 2.0 2020-10, 3.0 2022-08, 3.1 2023-08이고, 3.2와 4.0은 발표문 기준 2024-12-03, 2025-11-18입니다.
- CXL 4.0의 변경은 128 GT/s, native x2, retimer 최대 4개, Bundled Port(Streamlined Port 포함), memory RAS(PPR, sparing, patrol scrub event)입니다.
- Flex Bus의 협상 결과는 DVSEC ID 0007h에 남습니다. QEMU 모델은 이 값을 고정으로 써 넣습니다.
- 본 시리즈는 *15편*으로 *개념·프로토콜·구현·운용*을 흐름으로 정리합니다.

## 다음 편

[Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 *디바이스 분류*와 *Multi Logical Device·Multi-Headed Device의 구조*를 본격적으로 분해합니다.

## 관련 항목

- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Bootloader Internals Ch 35: UEFI의 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init) — 같은 CEDT를 펌웨어 쪽에서

## 시리즈 자료 출처 안내

이 시리즈가 쓰는 자료와 판입니다. 장마다 어느 자료의 어느 절인지를 본문에 적습니다.

- [CXL 3.1 공개 평가판](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)(Revision 3.1, Version 1.0, 2023-08-07)과 [CXL 1.1 공개 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-1.1-Specification.pdf): 절·표 번호는 3.1 기준입니다.
- [CXL 3.2 발표문](https://computeexpresslink.org/wp-content/uploads/2024/12/CXL_3.2-Spec-Announcement_FINAL-1.pdf)(2024-12-03): 3.2 규격 본문은 열람하지 않았습니다.
- [CXL 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf), [CXL 4.0 백서](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-White-Paper_FINAL.pdf), [공식 Q&A](https://computeexpresslink.org/blog/introducing-the-cxl-4-0-specification-webinar-qa-recap-4386/)(2026-01-15): 4.0 규격 본문은 열람하지 않았습니다.
- [Linux v6.12 `drivers/cxl`](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl): 소스의 파일:행 인용 기준입니다. 실행한 커널은 Debian `6.12.116+deb13-arm64`이고, 인용한 함수가 6.12.116에서 바뀌었으면 해당 장에서 밝힙니다.
- [ndctl v81](https://github.com/pmem/ndctl/tree/v81)(Debian 패키지 `cxl 81-1`)와 QEMU 11.1.3(Homebrew, 소스는 `qemu-11.1.3.tar.xz`).
- 실행 환경: macOS arm64 host, `qemu-system-aarch64 -M virt,cxl=on -accel tcg`, Debian 13 nocloud arm64 이미지(SHA512SUMS로 검증). 토폴로지는 pxb-cxl host bridge 아래 root port 1개, switch 1개(downstream port 2개), Type 3 두 대(volatile 256 MiB, persistent 256 MiB + LSA)입니다.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> spec 인용은 Compute Express Link Consortium, Inc.의 저작권을 따릅니다.
