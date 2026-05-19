---
title: "Ch 1: 임베디드 보안 개요 / 위협 모델"
date: 2026-05-08T02:00:00
description: "STRIDE / DREAD. 임베디드 특수 — 물리 접근 / 자원 제약."
tags: [Embedded Security, Threat Model, STRIDE]
series: "Embedded Security"
seriesOrder: 1
draft: false
---

## 한 줄 요약

> **"임베디드 보안은 위협 모델로 시작합니다."** — 자산을 식별하고, 신뢰 경계를 그리고, 공격자의 능력을 가정한 다음에야 어떤 방어가 *비용 대비 의미 있는지* 결정할 수 있습니다. STRIDE는 분류 도구이고, DREAD는 우선순위 도구입니다.

## 왜 위협 모델부터 그리는가

임베디드 시스템에 *보안 기능을 붙이자*고 결정하기 전에 답해야 할 질문이 세 개 있습니다. 무엇을 지키는가, 누구로부터 지키는가, 어떻게 들어올 수 있는가입니다. 이 세 질문에 대답하지 못한 상태에서 AES-256과 ECDSA를 켜면, 비용은 들었는데 정작 공격자가 지나가는 길은 그대로 열려 있는 결과가 나옵니다.

위협 모델링은 위 세 질문에 *체계적으로* 답하는 절차입니다. 보안 학계와 산업에서 가장 널리 쓰이는 두 프레임워크가 STRIDE와 DREAD입니다. STRIDE는 *어떤 종류의 위협이 있는지*를 분류하고, DREAD는 *어떤 위협부터 막을지*의 순서를 매깁니다. 둘은 동전의 양면처럼 짝을 이룹니다.

임베디드는 일반적인 IT 보안과 결정적으로 다른 점이 있습니다. 공격자가 *디바이스를 손에 쥡니다*. 데이터센터의 서버처럼 물리적으로 격리된 환경이 아니라, 실험실 책상에 올라와서 JTAG 프로브, 로직 애널라이저, 오실로스코프, 심지어 디캡(decapsulation)·SEM·FIB 같은 반도체 분석 장비까지 들어옵니다. 이 차이를 이해하지 못하면 데스크톱 보안 모델을 그대로 가져와 헛돈을 쓰게 됩니다.

## 자산 enumeration — 무엇을 지키는가

위협 모델의 첫 단계는 *지킬 것의 목록*입니다. 임베디드에서 자주 나오는 자산은 다음과 같습니다.

| 자산 | 어디에 사는가 | 잃으면 무엇이 무너지는가 |
|---|---|---|
| 펌웨어 이미지 | 내부 flash, eMMC, NAND | 지적 재산, 알고리즘 노출, 클론 제품 |
| 디바이스 비밀키 (per-device) | secure storage, OTP fuse | 디바이스 위장, 메시지 위변조 |
| 인증서 / 공개키 RoT | OTP, ROM, RPMB | 부트 체인 우회, 임의 펌웨어 실행 |
| 사용자 데이터 | 외부 storage, RAM | 프라이버시 위반, 규제 위반 |
| 세션 키 / 통신 키 | RAM, secure RAM | 통신 도청, MITM |
| 디버그·진단 인터페이스 | JTAG, SWD, UART, USB | 모든 자산에 대한 통제권 |
| 시간 동기 / monotonic counter | RTC, OTP | rollback 공격, replay 공격 |

각 자산에 대해 세 가지를 적습니다. 첫째, *기밀성* — 노출되면 손해가 나는가. 둘째, *무결성* — 변조되면 시스템이 어떻게 망가지는가. 셋째, *가용성* — 사라지면 동작이 멈추는가. 모든 자산에 세 속성이 다 중요한 것은 아닙니다. 펌웨어는 무결성이 압도적으로 중요하고, 사용자 데이터는 기밀성이 우선이며, 세션 키는 셋 다 중요합니다.

## 공격자 capability levels

공격자를 한 덩어리로 보면 방어 비용을 가늠할 수 없습니다. 보통 다음 다섯 단계로 나눕니다.

- **Level 1 — Remote / Network attacker**
  - 인터넷 또는 LAN을 통해서만 접근
  - Wi-Fi, Bluetooth, MQTT, HTTP 인터페이스
  - 동기: 봇넷, ransomware, DDoS 노드 확보
- **Level 2 — Local network attacker**
  - 같은 물리 네트워크 (Wi-Fi, USB-NIC, BLE 범위 내)
  - LAN sniffing, ARP spoofing, fake AP
  - 동기: 같은 환경의 자료 탈취
- **Level 3 — Casual physical attacker**
  - 디바이스 손에 쥠, 일반 도구
  - UART probing, JTAG try, SD card swap
  - 동기: 잠금 해제, ROM 추출, 부트 우회
- **Level 4 — Skilled physical attacker**
  - 로직 애널라이저, 오실로스코프, fault injection
  - Glitching (voltage / clock / EM), side-channel
  - 동기: 키 추출, 펌웨어 reverse engineering
- **Level 5 — Nation-state / lab attacker**
  - Decap, SEM, FIB, focused ion beam
  - silicon 단위 reverse, mask ROM 추출
  - 동기: 산업 스파이, 군사 정보

대부분의 *상용* 임베디드 제품은 Level 3까지를 막는 것을 목표로 합니다. Level 4를 막으려면 secure element(SE) 또는 PUF·glitch detector·shield wire 같은 *물리적* 대책이 필요하고, Level 5는 사실상 *시간을 버는 것*이 목표가 됩니다. 30분 만에 키가 나오느냐 30일이 걸리느냐가 비즈니스 결정 기준이 됩니다.

## STRIDE — 위협의 6가지 종류

STRIDE는 Microsoft가 정립한 분류 체계입니다. 머리글자가 6개 위협 카테고리를 담습니다.

| 글자 | 위협 | 깨는 속성 | 임베디드 예시 |
|---|---|---|---|
| **S**poofing | 신원 위장 | 인증 (Authentication) | 위조 디바이스가 클라우드에 접속, 가짜 sensor 응답 |
| **T**ampering | 데이터 변조 | 무결성 (Integrity) | 펌웨어 patch, sensor 값 조작, NVS 변경 |
| **R**epudiation | 행위 부인 | 부인방지 (Non-repudiation) | 로그 삭제, 감사 추적 우회 |
| **I**nformation disclosure | 정보 노출 | 기밀성 (Confidentiality) | JTAG로 RAM dump, 측정 사이드채널로 키 추출 |
| **D**enial of service | 서비스 거부 | 가용성 (Availability) | MQTT flood, 무한 reset 루프, watchdog 우회 후 hang |
| **E**levation of privilege | 권한 상승 | 인가 (Authorization) | non-secure에서 secure world 침입, root shell 획득 |

자산 하나마다 STRIDE 6칸을 채워 보면 *무엇이 비어 있는지*가 보입니다. 예를 들어 BLE 펌웨어 업데이트 기능에 STRIDE를 적용하면 다음과 같이 나옵니다.

```text
자산: OTA firmware update endpoint

S — 위장한 OTA 서버가 펌웨어 푸시      → 서버 인증서 검증
T — 펌웨어 이미지 중간자 변조           → 서명 검증 (ECDSA P-256)
R — 어떤 펌웨어가 적용됐는지 로그 부재  → audit log + secure storage
I — 펌웨어 이미지 자체 노출             → 이미지 암호화 (AES-GCM)
D — 무한 update 요청으로 flash wear-out → rate limit + 인증 후 진행
E — 업데이트 중 권한 escalation         → 검증 후에만 boot region write 허용
```

이런 표 한 장이 *해당 기능에 대한 보안 요구사항 명세*가 됩니다. 이후 설계는 이 표의 각 항목을 어떻게 만족시키는지 적는 작업이 됩니다.

## DREAD — 점수로 우선순위 매기기

STRIDE는 *분류*만 합니다. 모든 위협을 다 막을 수는 없기 때문에 우선순위가 필요합니다. DREAD는 다섯 축에 1~10점을 매겨 평균을 냅니다.

| 글자 | 의미 | 1점 (낮음) | 10점 (높음) |
|---|---|---|---|
| **D**amage | 성공 시 피해 | 사용자 한 명 영향 | 제품 전체 / 회사 신뢰 붕괴 |
| **R**eproducibility | 재현 난이도 | 매우 어려움, 운 필요 | 스크립트 한 줄로 재현 |
| **E**xploitability | 악용 난이도 | 박사급 전문 지식 | Metasploit 한 줄 |
| **A**ffected users | 영향 받는 사용자 비율 | 1% 미만 | 100% |
| **D**iscoverability | 발견 난이도 | 내부자만 알 수 있음 | 공개 CVE, Shodan 검색 한 번 |

평균 점수에 따라 우선순위를 매깁니다. 보통 다음과 같이 나눕니다.

- 점수 8.0 이상 — Critical, 즉시 fix
- 점수 6.0 ~ 7.9 — High, 이번 릴리스 안에
- 점수 4.0 ~ 5.9 — Medium, 다음 분기
- 점수 4.0 미만 — Low, backlog

DREAD는 점수의 *정확도*가 목적이 아니라 *팀 내 합의*를 만드는 도구입니다. 두 엔지니어가 같은 위협에 7점과 4점을 매기면 그 차이를 토론하면서 위협에 대한 이해가 정렬됩니다.

## 임베디드 특화 공격 벡터

데스크톱 보안 책에 나오지 않는, 임베디드에서만 자주 보는 공격 벡터입니다.

**디버그 인터페이스 — JTAG / SWD / UART**

생산 라인에서는 켜져 있어야 하고, 양산 후에는 잠겨야 합니다. STM32의 RDP(Read-Out Protection) Level 2, NXP의 LP55, ESP32의 e-fuse JTAG disable 같은 메커니즘이 있습니다. *Level 2는 영구적*입니다. 한 번 잠그면 다시 못 엽니다. 디버그 락이 *제대로 활성화됐는지*를 양산 검사 단계에서 확인하는 절차가 필요합니다.

**외부 storage — SD / eMMC / SPI flash 스왑**

루트 파일 시스템이 외부 SD에 있다면, 공격자가 카드를 빼서 PC에서 mount하고 init 스크립트 한 줄을 추가해 다시 끼우면 다음 부팅에 root shell이 열립니다. 방어는 dm-verity, fs-verity, 또는 디바이스 키로 암호화된 LUKS rootfs입니다.

**Glitch 공격 — voltage / clock / EM**

CPU에 *순간적인 비정상*을 주입해 한 instruction을 건너뛰게 만듭니다. `if (signature_valid)` 분기에서 그 한 줄을 건너뛰면 부팅이 통과됩니다. 방어는 *redundancy* — 같은 결정을 두 번 다른 방식으로 검사하거나, fault injection 감지기를 두는 것입니다.

**Side-channel — power / EM / timing**

AES 계산 중의 전력 소모를 측정하면 round key를 복원할 수 있습니다. SPA·DPA·CPA라는 분석 기법이 30년째 발전해 왔습니다. 방어는 *masking*과 *constant-time* 구현입니다. Ch 7에서 따로 다룹니다.

**Cold boot / RAM remanence**

DRAM은 전원이 끊어진 직후 몇 초간 데이터가 남습니다. 액화 질소로 칩을 얼리면 수십 분까지 늘어납니다. 그동안 칩을 빼서 다른 보드에 꽂으면 RAM 내용을 읽을 수 있습니다. 방어는 *RAM 안에서도 키를 평문으로 두지 않기* — 사용 직후 zeroize, secure RAM 사용, encrypted RAM 같은 메커니즘입니다.

## 자원 제약 — MCU에서의 crypto 도전

크립토는 *연산 비용*과 *메모리 비용*이 비쌉니다. 흔히 보는 제약은 다음과 같습니다.

Cortex-M0+ @ 48 MHz, 32 KB RAM, 256 KB Flash:

- RSA-2048 서명 검증 — 약 2~3초 (가능하지만 느림)
- ECDSA P-256 검증 — 약 200~400 ms (실용적)
- AES-128-GCM — HW 가속 있으면 수십 MB/s, SW만으로는 수 MB/s
- SHA-256 — HW 있으면 수십 MB/s, SW로 1~3 MB/s
- TLS 1.3 handshake — 메모리 부족할 가능성, 수십 KB RAM 소비

이 제약 때문에 임베디드에서는 다음과 같은 *현실적인 타협*이 자주 일어납니다.

- RSA 대신 ECC — 같은 보안 강도에서 키 크기 1/8, 연산 더 빠름.
- 풀 TLS 대신 *pre-shared key* DTLS 또는 *certificate pinning*.
- 매 패킷 서명 대신 *세션 시작에만* 서명, 이후 MAC으로.
- 매 부팅 RSA 대신 *Merkle tree*로 부분 검증.

이 타협은 *위협 모델이 허용할 때*만 가능합니다. 그래서 위협 모델을 *먼저* 그려야 하는 것입니다.

## 신뢰 경계 (Trust Boundaries)

위협 모델의 마지막 산출물은 *신뢰 경계 다이어그램*입니다. 시스템을 박스로 나누고, *데이터가 박스 사이를 건널 때 어떤 검증이 일어나는지*를 표시합니다.

![신뢰 경계 — Cloud, CA root, Device의 NS/S/OTP 계층](/images/blog/embedded-security/diagrams/ch01-trust-boundaries.svg)

박스 사이의 화살표 *각각*이 검증 지점입니다. Cloud → Device는 mutual TLS, NS → S는 SMC 인터페이스의 입력 검증, S → OTP는 access control 검사가 들어갑니다. 신뢰 경계가 그려지면 그 다음 챕터들이 다루는 메커니즘(Secure Boot, TrustZone, TEE)이 *어디서 어떤 경계를 지키는지* 분명해집니다.

## 위험 우선순위 표 — 한 장으로 정리

자산 × STRIDE × DREAD를 합친 한 장의 표가 위협 모델의 결과물입니다.

| 자산 | STRIDE | 시나리오 | DREAD 평균 | 대응 |
|---|---|---|---|---|
| 펌웨어 이미지 | T (Tamper) | OTA 중 MITM이 이미지 교체 | 8.2 | ECDSA P-256 서명 + TLS 1.3 |
| 펌웨어 이미지 | I (Info) | flash dump로 IP 노출 | 5.6 | RDP Level 2 + 펌웨어 암호화 |
| 디바이스 키 | I (Info) | DPA로 AES 키 추출 | 6.4 | masked AES + secure element |
| 디버그 포트 | E (Elev) | JTAG로 root shell | 7.8 | RDP / e-fuse JTAG disable |
| RoT 공개키 | T (Tamper) | OTP write가 열려 있음 | 9.0 | 양산 시 OTP lock 확인 |
| 세션 키 | I (Info) | cold boot로 RAM dump | 4.2 | 사용 후 즉시 zeroize |

이 한 장이 *이번 릴리스의 보안 작업 목록*이 됩니다. 9.0짜리 OTP lock 확인 절차가 빠지면 다른 모든 보안 기능이 무력화될 수 있다는 사실이 한눈에 보입니다.

## 자주 하는 실수

- **자산을 안 정한 채 기술부터 고릅니다.** "AES를 쓰자"는 결론이 아니라 출발점이 되어 버립니다. 무엇을 지키는지가 먼저입니다.
- **공격자 레벨을 가정하지 않습니다.** Level 5를 가정하면 비용이 무한대가 되고, Level 1만 가정하면 양산 후 공격에 무방비입니다. *어디까지 막을 것인가*를 명시적으로 결정합니다.
- **물리적 공격을 무시합니다.** 데스크톱 보안 모델에서는 "공격자가 디바이스를 손에 쥐면 끝"이지만 임베디드에서는 그것이 *시작*입니다.
- **디버그 포트 잠금을 양산 후에 검증하지 않습니다.** RDP 설정은 코드에 있어도 fuse blow가 실제로 됐는지 확인 안 하면 무의미합니다.
- **위협 모델을 한 번 그리고 안 봅니다.** 새 기능이 추가될 때마다 신뢰 경계가 바뀝니다. 위협 모델은 *살아 있는 문서*여야 합니다.

## 정리

- 임베디드 보안은 자산·공격자·신뢰 경계를 정의하는 위협 모델에서 출발합니다.
- 자산은 펌웨어·키·인증서·사용자 데이터·디버그 인터페이스 등으로 enumeration합니다.
- 공격자는 원격(L1)부터 nation-state(L5)까지 5단계로 나누어 *어디까지 막을 것인지* 결정합니다.
- STRIDE는 위협의 6가지 종류(Spoofing·Tampering·Repudiation·Info disclosure·DoS·Elevation)를 분류합니다.
- DREAD는 5축(Damage·Reproducibility·Exploitability·Affected users·Discoverability)으로 점수를 매겨 우선순위를 정합니다.
- 임베디드 특화 벡터로 JTAG·storage 스왑·glitch·side-channel·cold boot가 있고, 각각 별도의 방어가 필요합니다.
- MCU의 자원 제약 때문에 RSA 대신 ECC, 풀 TLS 대신 PSK 같은 현실적 타협이 필요합니다.
- 위협 모델은 한 장의 위험 우선순위 표로 응축되어 *이번 릴리스의 보안 작업 목록*이 됩니다.

다음 편은 **Ch 2: Secure Boot — 부트 체인 검증**. 위협 모델 표의 최상위 항목인 "임의 펌웨어 실행"을 어떻게 막는지, ROM부터 application까지 체인을 따라가며 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [CERT C — 보안 코딩 규칙](/blog/embedded/automotive/cert-c)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
