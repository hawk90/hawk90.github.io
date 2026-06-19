---
title: "Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC"
date: 2026-05-16T09:06:00
description: "CXL.io 프로토콜의 PCIe 호환성과 CXL 고유 확장."
series: "CXL 4.0 Internals"
seriesOrder: 6
tags: [cxl-io, pcie, dvsec, doe, uio]
draft: false
---

## 한 줄 요약

> **"CXL.io는 *PCIe와 99% 호환*입니다. 같은 enumeration, 같은 MMIO, 같은 DMA, 같은 AER."** — 다른 점은 *디바이스가 CXL 호환임을 알리는 DVSEC*과 *SPDM·CMA·IDE_KM 같은 보조 프로토콜의 mailbox 채널 DOE*입니다. CXL 1.1부터 정의됐고 *모든 CXL 디바이스에 필수*입니다.

[Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0의 새 기능*을 봤습니다. 이 장부터 *프로토콜 별 본격 분해*입니다. *CXL.io는 가장 기본·필수*인 프로토콜로, *전체 CXL 디바이스의 출발점*입니다.

## CXL.io가 하는 일

CXL.io는 *PCIe 시맨틱*을 그대로 가져와 *디바이스 발견·설정·DMA*를 담당합니다.

| 역할 | 의미 |
|------|------|
| Discovery·Enumeration | host가 *어떤 디바이스가 어디 있나* 발견 |
| Configuration | config space 읽기·쓰기, capability 활성화 |
| Error Reporting | AER (Advanced Error Reporting), poison message |
| MMIO | host가 device register를 *load/store* |
| DMA | device가 host RAM에 데이터 전송 |
| HPA Lookup | host physical address 변환·검증 |

*PCIe 위에 100% 호환*되므로 *기존 host의 PCIe enumeration 코드가 그대로 동작*합니다.

## CXL.io = PCIe + DVSEC + DOE

PCIe와 *다른 부분 둘*만 기억하면 됩니다.

| 추가 | 역할 |
|------|------|
| **DVSEC** | "*이 디바이스가 CXL 호환이다*" 표지 |
| **DOE** | SPDM·CMA·IDE_KM 같은 *out-of-band protocol의 mailbox* 채널 |

이 둘만 *CXL 고유 확장*이고, *나머지는 모두 PCIe*입니다.

## DVSEC — CXL 호환 표지

*DVSEC (Designated Vendor-Specific Extended Capability)*은 *PCIe Spec 자체가 정의한 capability*이지만, *CXL Consortium이 자신의 vendor ID*(0x1e98)를 사용해 *CXL 호환 디바이스 식별 표지*로 활용합니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space (0x100+) |
| Vendor ID | 0x1E98 (CXL Consortium) |
| DVSEC ID | 디바이스 type별 (CXL Device·Port 등) |
| 정보 | CXL 버전·capability·feature flag |

운영 흐름:

1. Host의 PCIe enumeration이 *config space scan*
2. *Extended Capability list*에서 *DVSEC 발견*
3. *Vendor ID = 0x1E98인 DVSEC*을 보면 *CXL 호환 디바이스로 인식*
4. *CXL subsystem 활성화*, 추가 capability negotiation

Linux의 `lspci -vvv`로 확인:

```bash
$ lspci -vvv -s 5e:00.0 | grep -A 5 "Designated Vendor"
Capabilities: [60] Designated Vendor-Specific: Vendor=1e98 ID=0000
    Compute Express Link
    DVSEC Rev: 1, Len: 56
    ...
```

*Vendor=1e98*이 보이면 *CXL 디바이스*입니다.

## DOE — Boutique Protocol Mailbox

*DOE (Data Object Exchange)*는 *PCIe 5.0부터 도입된 mailbox*로, *config space write/read*를 통해 *임의의 out-of-band protocol*을 *호스트와 디바이스 사이*에 흘리는 채널입니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space |
| 동작 | host write → device read·response → host read |
| 페이로드 | 다양한 protocol을 protocol ID로 분기 |

CXL이 *DOE를 활용하는 보조 protocol*:

| Protocol | 용도 |
|---------|------|
| SPDM | 디바이스 인증·키 교환 ([Ch 14 Security](/blog/embedded/hardware/cxl/chapter14-security)) |
| CMA | Firmware measurement attestation |
| IDE_KM | IDE 암호화 키 관리 |
| Compliance Mode | 4.0의 compliance test routing |

*하나의 mailbox*에 *여러 protocol*이 *시분할*로 흐릅니다. *Protocol ID*로 분기.

DOE capability 확인:

```bash
$ lspci -vvv -s 5e:00.0 | grep -A 8 "Data Object Exchange"
Capabilities: [70] Data Object Exchange
    DOE Mailbox: 1 instance
    Supported Protocols:
        Vendor=DMTF, ID=0x01 (CMA SPDM)
        Vendor=DMTF, ID=0x02 (Secured CMA SPDM)
        Vendor=CXL, ID=0x03 (Compliance Mode)
```

DOE 없이도 *기본 CXL.io 동작*은 가능하지만, *Security·Compliance 검증*에는 *필수*입니다.

## UIO — Unordered I/O

CXL.io의 *추가 특성* 중 *UIO (Unordered I/O)*는 *PCIe의 strict ordering보다 완화된 ordering*을 *명시적으로 허용*하는 메커니즘입니다.

| 모드 | Ordering |
|------|---------|
| PCIe 기본 | strict (모든 read·write 순서 유지) |
| **UIO** | 완화 — write 사이의 *임의 순서*가 OK |

UIO의 가치:

- **P2P 흐름** — accelerator 간 direct 전송이 *strict ordering 부담 없이* 가능
- **Throughput** — switch가 *큐 분산·재정렬*해 *대역폭 활용 향상*

UIO는 *application이 명시적으로 요청*해야 활성. *순서 보장이 필요한 control path*는 *기본 PCIe ordering* 사용.

## Direct CXL.mem Access — P2P 메모리 접근

CXL 3.1부터 *accelerator 간 direct P2P CXL.mem access*가 가능해졌습니다. 이전에는 *항상 host를 경유*해야 했습니다.

| 시나리오 | 흐름 |
|---------|------|
| 3.0 이전 | Accel A → host → Accel B |
| **3.1+** | Accel A → Accel B *direct* (CXL.io UIO 위 P2P) |

P2P 흐름:
1. Accel A가 *Accel B의 HDM memory address*를 안다
2. UIO 활성화 후 *직접 load/store*
3. *Host는 경유 안 함* — switch가 routing
4. *Coherency는 BISnp로 유지* (HDM-DB의 경우)

GPU·NPU 간 *distributed inference*에서 *모델 weight·KV cache의 P2P share*가 가능해집니다.

## Linux 측 — CXL.io 인식 경로

Linux의 *CXL subsystem 활성화*가 *CXL.io 인식*에서 시작합니다.

```bash
# 1. PCIe enumeration 결과
$ lspci -nn | grep -i cxl
5e:00.0 Memory controller [0508]: ... [1234:5678]

# 2. CXL DVSEC 확인
$ lspci -vvv -s 5e:00.0 | grep -E "Designated|Compute Express"

# 3. CXL subsystem 등록 확인 (DVSEC 있어야 등록)
$ ls /sys/bus/cxl/devices/
mem0/ ...

# 4. DOE capability 활성 시
$ ls /sys/bus/cxl/devices/mem0/security/
state  user_keystore  ...
```

*DVSEC이 없으면 cxl_acpi가 등록 안 함* → *CXL 모드 동작 안 함*. *BIOS·firmware가 DVSEC을 정확히 보고*해야 운영 가능.

## 자주 하는 실수

### "CXL.io = PCIe 그대로면 그냥 PCIe 쓰면 된다"

*DVSEC·DOE가 CXL 운영의 entry point*입니다. *DVSEC 없으면* host가 *CXL.cache·CXL.mem 인터페이스 활성화 못 함*. PCIe만으로는 *CXL 디바이스의 핵심 기능 사용 불가*.

### "DOE에 어떤 protocol이든 막 넣어도 된다"

*Protocol ID가 등록된 것만 통신*합니다. CXL Consortium·DMTF가 *protocol ID를 관리*. 임의 ID는 *디바이스가 응답 안 함*. SPDM·CMA·IDE_KM·Compliance가 *현재 표준 set*.

### "UIO 항상 켜는 게 좋다"

*Ordering 보장이 필요한 path*에 UIO를 켜면 *데이터 무결성 위험*. *application 의도와 ordering 요구*를 *분석한 후* 선택적 적용.

### "P2P CXL.mem은 host overhead 0"

*Routing overhead는 있습니다*. Switch가 *P2P 라우팅 결정*에 *수십 ns*. 또한 *coherency 유지 (BISnp 트래픽)*가 *추가됨*. *host 라운드트립보다 빠른 것이지 cost가 0은 아닙니다*.

### "DOE mailbox는 빠르다"

*Config space write/read 기반*이라 *slow path*입니다. *수 µs~수 ms*. *bulk data*는 *DOE로 보내면 안 되고*, *DMA·MMIO* 사용. DOE는 *control plane (인증·키 교환)* 전용.

## 정리

- CXL.io는 *PCIe와 99% 호환* — 같은 enumeration·config·MMIO·DMA·AER.
- 다른 점은 *DVSEC* (CXL 호환 표지)와 *DOE* (보조 protocol mailbox) 둘.
- *DVSEC vendor ID 0x1E98*이 *CXL Consortium의 표지*. 모든 CXL 디바이스 필수.
- *DOE*는 SPDM·CMA·IDE_KM·Compliance protocol을 *mailbox로 흘림*. Security·Compliance에 필수.
- *UIO*는 *strict ordering 완화*. P2P·throughput 향상에 활용.
- *Direct CXL.mem P2P*는 *3.1+*에서 *accel ↔ accel direct access* 가능.

## 다음 편

[Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state](/blog/embedded/hardware/cxl/chapter07-cxl-cache)에서 *디바이스가 host 메모리를 캐시*하는 *CXL.cache 프로토콜의 메시지 흐름*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 14: Security — IDE·SPDM·TSP](/blog/embedded/hardware/cxl/chapter14-security) — DOE 위의 SPDM·IDE_KM 흐름
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·DMTF 공개 자료·Linux drivers/cxl/ 소스*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
