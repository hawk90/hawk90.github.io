---
title: "PCIe·CXL IDE 분석 — 링크 무결성과 데이터 암호화"
date: 2026-06-17T09:01:00
description: "PCIe·CXL IDE (Integrity and Data Encryption) — 링크 sniff·MITM 위협, AES-GCM 암호화, Selective vs Link IDE, 키 관리, 성능 영향."
series: "Embedded Security"
seriesOrder: 11
tags: [cxl, pcie, ide, integrity, encryption, aes-gcm, link-security]
draft: false
---

## 한 줄 요약

> **"IDE는 *PCIe 링크 자체*를 *암호화된 통로*로 만듭니다."** — TrustZone이 *CPU 안*을 보호하고 TEE가 *Secure World 안*을 보호한다면, IDE는 *디바이스 사이의 케이블*을 보호합니다. AES-GCM 256-bit으로 *TLP·CXL.mem flit*을 암호화·인증해 *물리 접근 공격자*가 *링크를 sniffing·tampering*해도 *데이터가 새지 않게* 합니다.

## 왜 링크 암호화가 필요한가

[Ch 4 (TrustZone)](/blog/embedded/embedded-security/chapter04-trustzone)에서 *CPU 안 Secure World*를 격리했고, [Ch 5 (TEE)](/blog/embedded/embedded-security/chapter05-tee)에서 *TA가 안전한 환경에서 동작*하는 걸 봤습니다. 그러나 *CPU 밖으로 나가는 순간*은 다른 문제입니다.

PCIe 카드 한 장을 *분리해서 별도 보드에 장착하면* TLP를 *그대로 볼 수 있습니다*. 데이터센터에서 *물리 접근 가능한 운영자*가 *interposer·protocol analyzer*를 끼우면 *링크를 흐르는 모든 트래픽*을 *읽을 수 있고*, *심지어 수정도* 가능합니다.

이 위협이 *클라우드 신뢰 모델의 마지막 약점*입니다. *Confidential Computing*에서 *CPU에서 GPU로 가속기 작업을 넘길 때*, 또는 *CXL.mem expander에 KV cache가 저장될 때*, *그 경로 자체*가 *암호화되지 않으면* 모든 *CPU/TEE 안의 보안*은 *디바이스 밖에서 무력화*됩니다.

PCIe·CXL IDE(Integrity and Data Encryption)는 이 *링크 구간*을 *암호화 통로*로 만드는 표준입니다.

## 위협 모델

IDE가 푸는 *세 가지 공격*:

| 공격 | 방법 | IDE 방어 |
|------|------|---------|
| Passive eavesdropping | Protocol analyzer로 TLP·flit 읽기 | AES-GCM 암호화로 *내용 은닉* |
| Active tampering | TLP·flit 수정·재전송 | GMAC 96-bit으로 *무결성 검증* |
| Replay attack | 과거 패킷 다시 보냄 | sequence number + counter mode로 *재사용 차단* |

IDE는 *MITM 자체를 막지는 않습니다*. 공격자가 *링크 중간에 끼는* 것은 가능하지만, *암호화·인증된 데이터를 의미 있게 조작*하지는 못합니다.

링크 끝점 자체(host CPU, 디바이스 controller)의 *키 보호*는 *IDE의 책임 밖*입니다. 그건 *TEE·HSM*의 영역입니다.

## IDE의 두 모드 — Selective vs Link

PCIe Base Spec 6.0 IDE는 *두 가지 모드*를 정의합니다.

| 모드 | 적용 범위 | 키 관리 | 사용 사례 |
|------|----------|---------|----------|
| **Selective IDE** | *특정 TLP stream*만 암호화 | stream별 키 | 일부 보안 트래픽만, host bandwidth 절약 |
| **Link IDE** | *모든 TLP*를 암호화 | link별 단일 키 | 전체 데이터 보호, 가장 일반적 |

CXL 환경에서는 *Link IDE*가 기본입니다. *CXL.mem flit·CXL.cache flit·CXL.io TLP* 모두 *한 키로 암호화*되어 *링크 전체가 암호화 영역*이 됩니다.

Selective IDE는 *기존 비암호화 트래픽과 혼재*가 가능해 *제어 평면(config·enumeration)*은 평문으로, *데이터 평면*만 암호화하는 시나리오에 적합합니다.

## 암호화 알고리즘 — AES-GCM 256

IDE는 *AES-GCM 256*을 *단일 표준*으로 사용합니다.

| 요소 | 값 | 의미 |
|------|----|----|
| 대칭 키 | 256-bit | NIST 권장 강도 |
| Counter | 96-bit nonce | sequence 기반 unique 보장 |
| MAC | 96-bit GMAC | 무결성 인증 태그 |
| Block size | 128-bit | AES 표준 |

GCM 모드 선택 이유:

- *Parallel 처리* 가능 — flit 단위 *순차 의존성 없음*. high-throughput PCIe·CXL에 적합
- *Authenticated Encryption* — *암호화와 무결성을 한 번에*. 두 알고리즘 따로 돌릴 필요 없음
- *Hardware acceleration* — Intel AES-NI, ARM Cryptography Extensions 등 *전용 명령어 지원*

## 키 관리 — IDE_KM (Key Management)

IDE 자체는 *데이터 흐름의 암호화*만 정의합니다. *키를 어떻게 만들고·교환하고·교체할지*는 *별도 프로토콜 IDE_KM*이 담당합니다.

IDE 키 라이프사이클 — 5단계:

| 단계 | 동작 |
|------|------|
| 1. Device authentication | SPDM 흐름으로 디바이스 인증 ([Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| 2. Key exchange (IDE_KM via SPDM) | host의 random k_h와 device의 random k_d를 교환, shared K = KDF(k_h ⊕ k_d, context) |
| 3. IDE stream 활성화 | k_data·k_ctrl 별도 derive |
| 4. Key refresh | 주기적, sequence counter overflow 전에 진행 |
| 5. Tear-down | link drop·security event 시 |

키 교환은 *SPDM* 위에 *IDE_KM 메시지*를 얹는 구조입니다. 자세한 SPDM 흐름은 [Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)에서 봅니다.

*주기적 키 refresh*가 중요한 이유는 *96-bit counter overflow*가 *물리적으로 가능*하기 때문입니다. CXL 3.0 fabric의 *128 GB/s* 링크는 *약 6분에 sequence space 12.5% 소모*. 보통 *분 단위로 key refresh*가 권장됩니다.

## 성능 영향

IDE 활성화 시 *지연·대역폭에 비용*이 발생합니다.

| 항목 | 평문 (No IDE) | IDE 활성화 | 차이 |
|------|--------------|-----------|------|
| Throughput (PCIe 5.0 x16) | 56 GB/s | 53 GB/s | -5% |
| Round-trip latency | 178 ns | 195 ns | +17 ns |
| Tail latency (99p) | 215 ns | 240 ns | +25 ns |
| Power | baseline | +1.5~2 W | AES-GCM HW 가속기 |

*+17 ns 지연*은 *AES-GCM 인코딩·디코딩 + GMAC 검증*에서 옵니다. 하드웨어 가속이면 *flit 1개당 ~5 ns*이고, *왕복으로 +10~17 ns*가 자연스러운 범위입니다.

*5% throughput 손실*은 *flit 헤더에 IDE metadata*가 추가되어서입니다. *MAC 96-bit + counter 일부*가 *flit payload를 줄입니다*.

[Ch 54 (Perf Eng)](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)에서 봤듯 CXL.mem의 *워크로드별 지연 budget*이 *200 ns vs 400 ns* 차이가 크지 않다면, *IDE의 +17 ns는 운영 가능한 범위*입니다.

## 현세대 디바이스 지원

| 디바이스 | IDE 지원 | 비고 |
|---------|---------|------|
| Intel Xeon 6th gen (Granite Rapids) | CXL 2.0 IDE | 2025 양산 |
| AMD EPYC Genoa·Bergamo | PCIe 5.0 IDE | Confidential Compute (SEV-TIO) |
| NVIDIA Blackwell GPU | PCIe 5.0 IDE | Confidential Computing 모드 |
| Astera Labs Leo CXL | CXL 2.0 IDE | 2024+ revision |
| Samsung CMM-D | CXL 2.0 IDE | 2025+ revision |

*Confidential Computing*을 *full stack*으로 지원하려면 *모든 링크에 IDE가 켜져야* 합니다. *CPU↔GPU·CPU↔CXL·GPU↔NVLink* 등 *어느 하나라도 빠지면* 전체 보안이 깨집니다.

## 운영 — 활성화 확인

Linux 환경에서 IDE 상태 확인:

```bash
# PCIe IDE capability
$ lspci -vvv -s 5e:00.0 | grep -A 20 "Integrity and Data Encryption"
Integrity and Data Encryption:
    Selective IDE Streams: 4
    Link IDE Streams:      1
    Aggregation supported: Yes
    PCRC supported:        Yes

# CXL IDE 상태
$ cxl list -i -m mem0
[
  {
    "memdev":"mem0",
    "ide": {
      "link_ide_active": true,
      "selective_ide_streams": 0,
      "key_refresh_interval_ms": 60000
    }
  }
]

# IDE 이벤트 추적
$ bpftrace -e 'tracepoint:cxl:ide_key_refresh { @[kstack] = count(); }'
```

*IDE는 enable만으로 의미가 없습니다*. 정기적인 *key refresh가 동작하는지*, *failover 시 graceful*한지가 *운영의 핵심*입니다.

## 자주 하는 실수

### "IDE만 켜면 데이터센터가 안전하다"

IDE는 *링크만* 보호합니다. *디바이스 안의 메모리·캐시·레지스터*는 *별도 보호 메커니즘*이 필요합니다. CXL 메모리 디바이스에 저장된 *plain DRAM 내용*은 *physical attack에 그대로 노출*됩니다 — 그건 [Ch 13](/blog/embedded/embedded-security/chapter13-cxl-tee)의 *CXL TEE 영역*입니다.

### "AES-GCM이면 성능 영향 없다"

*하드웨어 가속이 있을 때*만입니다. *소프트웨어 fallback*은 *3~5배 느립니다*. CPU AES-NI 또는 디바이스 controller에 *전용 가속기*가 *반드시* 있어야 합니다.

### "한 번 키 교환하면 끝"

*아닙니다*. *Counter overflow 전에 refresh* 필수입니다. 고대역폭 CXL fabric에서는 *분 단위 refresh*가 정상입니다. 그렇지 않으면 *nonce 재사용*으로 *암호화 약화*가 발생합니다.

### "IDE는 PCIe 6.0 전용이다"

*아닙니다*. *PCIe 5.0과 CXL 2.0부터* IDE를 지원합니다. PCIe 6.0은 *Optional Aggregation*과 *향상된 throughput*을 추가했을 뿐입니다.

## 한국 메모리 산업의 위치

[Ch 9 (HBM·GDDR 심화)](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 봤듯 *Samsung CMM-D·SK Hynix Niagara*가 *CXL 메모리 디바이스 시장*의 선두권입니다. CXL 2.0 IDE는 *2024~2025년 양산 디바이스의 revision*에서 *qualification 항목*에 들어가는 흐름입니다.

CXL 메모리 디바이스의 *controller die 내부 AES-GCM 가속기 통합*은 *firmware로 IDE 활성화·키 관리*를 가능하게 합니다. *Astera Labs Leo*는 *fabless* 모델로 *한국 DRAM 제품*과 *자체 ASIC controller*를 묶어 *IDE 가속기를 chip 안에 통합*하는 구조입니다. Samsung·SK Hynix는 *vertical integration*(DRAM + controller 한 회사) 이점을 활용합니다.

*표준 기여 측면*에서도 *Samsung·SK Hynix*가 *CXL Consortium IDE Working Group*에 *코어 멤버*로 참여합니다. *2024~2026년 ECN(Engineering Change Notice)*의 *IDE 관련 항목*에 *한국 두 회사의 영향*이 큽니다.

## 정리

- IDE는 *PCIe·CXL 링크 자체*를 *AES-GCM 256으로 암호화·인증*하는 표준입니다.
- *Selective IDE*는 특정 stream만, *Link IDE*는 전체 트래픽을 보호합니다. CXL은 보통 *Link IDE 기본*.
- 위협은 *eavesdropping·tampering·replay* 세 가지. *MITM 자체는 못 막지만 의미 있는 조작은 차단*합니다.
- AES-GCM 256은 *parallel·authenticated·hardware-accelerated*라 high-throughput에 적합합니다.
- 키는 *SPDM 위 IDE_KM 프로토콜*로 교환·refresh되며, *counter overflow 전 정기 refresh*가 필수입니다.
- 성능 비용은 *-5% throughput, +17 ns 지연*. 대부분 워크로드에서 *수용 가능한 범위*입니다.
- *Full Confidential Computing*을 위해서는 *CPU↔GPU·CPU↔CXL 모든 링크*에 IDE 활성화가 필요합니다.
- 한국 메모리 두 회사가 *CXL Consortium IDE WG 코어 멤버*로 *2025+ 양산 디바이스에 표준 적용*합니다.

다음 편은 **Ch 12: SPDM과 CMA 인증 흐름** — *IDE 키 교환을 떠받치는 SPDM 프로토콜*과 *CMA(Component Measurement Attestation)*의 *디바이스 신원 검증·firmware 측정*을 분해합니다.

## 관련 항목

- [Ch 4: ARM TrustZone 분석](/blog/embedded/embedded-security/chapter04-trustzone) — CPU 안 격리
- [Ch 5: TEE 비교 분석](/blog/embedded/embedded-security/chapter05-tee) — Secure World 안의 격리
- [Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma) (다음 편)
- [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee) — Trusted Execution을 메모리 디바이스까지
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — IDE 성능 영향이 운영 가능한 범위인지의 근거
