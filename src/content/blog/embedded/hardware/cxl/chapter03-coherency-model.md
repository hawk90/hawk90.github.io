---
title: "Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp"
slug: "embedded/hardware/cxl/chapter03-coherency-model"
date: 2026-05-16T09:03:00
description: "HDM-H·HDM-D·HDM-DB의 일관성 채널과 선택적 bias 관리, Linux decoder 관측의 한계를 구분합니다."
series: "CXL 4.0 Internals"
seriesOrder: 3
tags: [cxl, coherency, hdm-db, hdm-d, bias, bisnp]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"device memory를 host와 device가 함께 캐시할 수 있으면 일관성을 맞출 장치가 필요합니다."** — CXL은 HDM 영역을 *세 종류*로 나눕니다. *HDM-H*는 host만 일관성을 책임지는 Type 3 영역, *HDM-D*는 CXL.cache로 host와 일관성을 맞추는 Type 2 영역, *HDM-DB*는 CXL.mem의 *Back-Invalidate Snoop(BISnp)* 채널로 일관성을 맞추는 영역입니다. 256B flit을 쓰는 디바이스는 HDM-DB를 지원해야 합니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 디바이스 유형을 봤습니다. 이 장은 *device memory의 일관성이 어떻게 유지되는지*를 [CXL 3.1 규격 §2.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) 기준으로 정리합니다. 같은 문서를 두 사람이 고칠 때, 원본 보관자가 "지금 누가 펜을 들고 있는지"를 알아야 사본끼리 어긋나지 않는 것과 같은 문제입니다.

## HDM이란

CPU가 장치 메모리를 일반 메모리처럼 캐시하며 쓰려면, 그 메모리가 시스템 주소 공간 안에 있고 일관성 규칙을 따라야 합니다. 그 조건을 갖춘 장치 메모리가 *HDM(Host-managed Device Memory)*입니다. 3.1 Table 1-1은 HDM을 "system coherent 주소 공간에 매핑되어 host가 표준 write-back 시맨틱으로 접근하는 장치 메모리"로 정의하고, 장치 메모리는 HDM 또는 *PDM(Private Device Memory)*으로 매핑된다고 씁니다.

| 항목 | 의미 |
|------|------|
| Mapping | HDM Decoder가 host 물리 주소를 device 주소로 변환 |
| 접근 | host가 표준 write-back 시맨틱으로 접근 |
| 영역 종류 | host와 장치가 주소 영역마다 같은 HDM 종류를 알아야 함 (§2.0) |

## HDM 영역의 세 종류

CXL 3.1 Table 1-1과 §3.3의 정의입니다.

| 종류 | 규격 정의 | 쓰는 디바이스 | host와 일관성을 맞추는 채널 |
|------|----------|--------------|---------------------------|
| **HDM-H** | Host-only Coherent | Type 3만 | 없음 (host 캐시 계층이 담당) |
| **HDM-D** | Device Coherent | Type 2만 (§3.3: "legacy Type 2") | CXL.cache (D2H) |
| **HDM-DB** | Device Coherent using Back-Invalidate | Type 2 또는 Type 3 | CXL.mem의 BISnp / BIRsp |

수동 memory expander(Type 3)의 예로 규격이 드는 것은 HDM-H입니다(§2.3, Figure 2-6). Type 3가 HDM-DB를 쓰면 장치 안에 DCOH가 필요하고, peer의 UIO·CXL.mem 직접 접근이 가능해집니다(§2.3). Shared FAM 영역의 multi-host hardware coherency도 HDM-DB 영역에서 정의됩니다(§2.4.4). 그리고 §2.2.1은 *256B flit 모드를 구현하는 디바이스는 모두 HDM-DB를 지원*해야 하고, HDM-D 흐름은 68B flit 모드와의 호환을 위해 지원된다고 씁니다.

## HDM-D — Bias 기반 일관성

가속기가 자기 메모리에서 계산할 때마다 host에 "이 줄 써도 되나요?"라고 물으면 장치 메모리의 대역폭을 살릴 수 없습니다. Bias 모델은 페이지마다 "지금은 누구 차례인가"를 정해 두고 그 질문을 줄이는 방식입니다. 회의실 예약표처럼, 예약이 된 동안(Device Bias)에는 매번 관리실에 묻지 않고 바로 씁니다.

§2.2.2가 정의하는 두 상태입니다.

| Bias | 성질 | 규격이 드는 쓰임 |
|------|------|-----------------|
| **Host Bias** | 장치에게는 host 메모리처럼 보임. 장치가 접근하려면 host에 요청해 일관성을 해결 | 작업을 넣을 때, 결과를 읽을 때 (§2.2.2.1) |
| **Device Bias** | host 캐시에 그 line이 없음이 보장되어, 장치가 host에 어떤 트랜잭션도 보내지 않고 접근. host도 접근할 수 있지만 성능이 떨어짐 | 장치가 작업을 실행하는 동안 (§2.2.2.2) |

어느 상태에서든 host가 보는 장치 메모리는 같은 모습이고, 일관성은 유지됩니다(§2.2.2). Bias를 유지하려면 Type 2 장치는 페이지 단위 bias를 추적하는 *Bias Table*(예: 4 KB 페이지당 1개, Bias Cache로 캐시 가능)과, 페이지의 host 캐시 line을 flush하는 *Transition Agent*를 구현합니다. 4 KB는 규격이 든 예입니다.

전환을 누가 정하는지는 두 방식이 있고, CXL은 둘 다 지원합니다(§2.2.2.3).

| 방식 | 내용 |
|------|------|
| Software-assisted | 소프트웨어가 페이지가 작업 흐름의 어느 단계에 있는지 알고 bias를 고름. 단계적 계산·규칙적 접근의 단순 가속기에 유용 (§2.2.2.3.1) |
| Hardware autonomous | 하드웨어가 요청자를 보고 bias를 예측해 바꿈. GPU 같은 프로그래머블 가속기, pointer·tree·sparse 데이터에 유리. 하드웨어가 힌트만 주고 전환은 소프트웨어가 해도 됨 (§2.2.2.3.2) |

§2.2.2.3은 장치가 bias를 *전혀 구현하지 않아도* 된다고도 씁니다. 그러면 모든 장치 메모리가 Host Bias로 퇴화하고, 모든 접근이 host를 거칩니다.

## HDM-DB — Back-Invalidate Snoop

HDM-D에서는 장치가 host 캐시를 정리하려면 CXL.cache 요청을 빌려 써야 했습니다. HDM-DB는 CXL 3.0에서 CXL.mem 안에 *장치가 host로 직접 snoop을 보내는* 전용 채널을 만들었습니다(§2.2.1). 택배 기사가 고객센터를 거치지 않고 수령인에게 직접 문자를 보내는 것과 비슷합니다.

| 채널 | 방향 | 역할 |
|------|------|------|
| BISnp | S2M (device → host) | 디바이스가 host의 캐시 line을 snoop·무효화 요청 |
| BIRsp | M2S (host → device) | host의 응답 |

§2.2.1에 따르면 디바이스는 개별 cache line의 일관성을 *inclusive snoop filter*로 추적할 수 있고, host가 BISnp를 처리할 때까지 *새 M2S 요청을 막을 수* 있습니다. §2.2.2의 bias 기반 추적 방식도 HDM-DB에서 모두 쓸 수 있습니다. 차이는 host로 가는 일관성 흐름이 *CXL.cache D2H 대신 CXL.mem BISnp 채널*만 쓴다는 점입니다. 상세 흐름은 §3.5.1에 있습니다.

## HDM-D와 HDM-DB의 차이

| 기준 | HDM-D | HDM-DB |
|------|-------|--------|
| 쓰는 디바이스 | Type 2 | Type 2, Type 3 |
| host와 일관성 채널 | CXL.cache | CXL.mem BISnp / BIRsp |
| flit 모드 | 68B flit 호환용 | 256B flit 디바이스는 필수 지원 |
| VH당 Type 2 수 | — | 16개까지 연결하려면 BISnp 필수 (§2.6) |
| multi-host 일관성 | — | Shared FAM의 hardware coherency 모델에 사용 (§2.4.4) |

## Snoop Filter — Device 측 추적

BISnp를 *모든 cache line마다* 보내면 부담이 큽니다. inclusive snoop filter는 host 캐시가 가질 수 있는 line을 모두 포함하므로, filter에 없는 line은 host가 갖고 있지 않다고 판단해 BISnp를 보내지 않아도 됩니다. 건물 출입 명부에 이름이 없으면 그 사람을 찾으러 층마다 돌아다닐 필요가 없는 것과 같습니다.

Shared FAM에서 §2.4.4는 장치가 host 일관성 상태를 추적하는 방식을 "구현마다 다르며 snoop filter 또는 full directory로 나뉜다"고 씁니다. 규격은 snoop filter의 크기를 정하지 않습니다.

## Linux 측: target type과 coherency mode는 다릅니다

Linux v6.12의 [CXL sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-cxl)는 switch·endpoint decoder의 `target_type`을 설명합니다. `accelerator`는 Type 2 메모리, `expander`는 Type 3 메모리라는 target 구분이며, HDM-H/D/DB 가운데 무엇이 활성인지를 출력하는 속성은 아닙니다. QEMU 게스트(Type 3 두 대)에서 읽은 값입니다.

```bash
cd /sys/bus/cxl/devices
grep . decoder*/target_type
grep . decoder0.0/cap_*
```

```text
decoder1.0/target_type:expander
decoder2.0/target_type:expander
decoder3.0/target_type:expander
decoder4.0/target_type:expander
decoder0.0/cap_pmem:1
decoder0.0/cap_ram:1
decoder0.0/cap_type2:1
decoder0.0/cap_type3:1
```

(`decoderN.1`~`N.3`도 모두 `expander`여서 줄였습니다.) root decoder `decoder0.0`에는 `target_type` 파일이 없고, 대신 CEDT CFMWS의 Restrictions에서 온 `cap_*` 속성이 있습니다. 이 window는 Type 2와 Type 3를 모두 받을 수 있다고 광고합니다.

`expander`가 정해지는 경로는 v6.12 `drivers/cxl/core/hdm.c`의 `init_hdm_decoder()`에 있습니다. 펌웨어가 이미 commit한 decoder라면 HDM Decoder Control 레지스터의 HostOnly 비트로 정하고(883-886행), commit되지 않은 endpoint decoder라면 장치 종류가 `CXL_DEVTYPE_CLASSMEM`일 때 `CXL_DECODER_HOSTONLYMEM`으로 둡니다(912-915행, 6.12.116에서는 904-907행). switch decoder처럼 endpoint가 아닌 decoder는 같은 분기에서 "commit 때 region type으로 덮어쓴다"는 주석과 함께 `CXL_DECODER_HOSTONLYMEM`을 기본값으로 받습니다(917-918행). 이 게스트에서는 decoder가 모두 commit 전이었으므로 endpoint와 switch decoder 모두 이 두 기본값 경로로 `expander`가 됐습니다.

Cache coherency가 애플리케이션의 동기화를 대신하지는 않습니다. §2.4.4는 software-managed coherency에서 cache line 소유권을 맞추는 메커니즘을 규격 범위 밖으로 둡니다.

## 자주 하는 실수

### "Bias(HDM-D)와 BISnp(HDM-DB) 중 워크로드에 맞는 것을 고른다"

규격상 둘은 *같은 선상의 선택지가 아닙니다*. HDM-DB에서도 bias 기반 추적을 쓸 수 있고, 차이는 *host와 일관성을 맞추는 채널*입니다(§2.2.1). 그리고 256B flit 디바이스는 HDM-DB 지원이 *필수*입니다.

### "Type 3의 주된 영역은 HDM-DB다"

규격이 수동 memory expander의 예로 드는 것은 *HDM-H*입니다(§2.3). HDM-DB는 DCOH를 갖춘 Type 3가 peer 직접 접근이나 Shared FAM hardware coherency를 제공할 때 씁니다.

### "Bias 전환은 단순한 flag"

Bias를 구현한 장치에서 전환은 Transition Agent가 그 페이지의 host 캐시 line을 flush하는 절차를 포함합니다(§2.2.2). 반대로 bias를 전혀 구현하지 않고 모든 메모리를 Host Bias로 두는 Type 2도 허용됩니다(§2.2.2.3).

### "`target_type: expander`면 HDM-H다"

`target_type`은 Type 2/Type 3 target 구분일 뿐입니다. HDM-DB를 지원하는 Type 3도 v6.12의 같은 코드 경로에서 `expander`로 보입니다.

## 정리

- *HDM*은 디바이스 메모리를 *system coherent 주소 공간*에 매핑해 host가 write-back 방식으로 접근하게 한 영역입니다.
- 영역은 *HDM-H*(host-only, Type 3), *HDM-D*(CXL.cache로 일관성, Type 2), *HDM-DB*(BISnp/BIRsp로 일관성, Type 2·3)로 나뉩니다.
- HDM-D의 bias 관리는 Software-assisted와 Hardware autonomous가 있고, bias를 구현하지 않는 장치도 허용됩니다.
- *HDM-DB*는 CXL 3.0의 *BISnp 채널*을 쓰고, 256B flit 디바이스는 반드시 지원해야 합니다.
- 디바이스는 *inclusive snoop filter*로 필요한 경우에만 BISnp를 보냅니다.
- Linux v6.12는 decoder `target_type`으로 accelerator(Type 2)와 expander(Type 3)를 구분하고, QEMU 게스트에서는 모두 `expander`였습니다.

## 다음 편

[Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0 pooling*과 *3.0 coherent fabric*, 그리고 *GFAM (Global Fabric Attached Memory)*가 *어떻게 다중 host 메모리 공유*를 가능하게 하는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — HDM Decoder의 mapping 구조
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) — host 명령·응답과 성능 예산 관점

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 Table 1-1·§2.0·§2.2·§2.3·§2.4.4·§2.6·§3.3, Linux v6.12 CXL ABI와 `core/hdm.c`, QEMU 11.1.3 게스트의 sysfs 출력을 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
