---
title: "임베디드 보안 위협 모델 — STRIDE·자산·우선순위"
slug: "embedded/embedded-security/chapter01-threat-model"
date: 2026-05-21T09:01:00
description: "자산과 공격 경로를 식별하고 임베디드 제품의 보안 우선순위를 정하는 방법."
tags: [embedded-security, threat-model, STRIDE]
series: "Embedded Security"
seriesOrder: 1
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"임베디드 보안은 위협 모델로 시작합니다."** — 자산을 식별하고, 신뢰 경계를 그리고, 공격자의 능력을 가정한 다음에야 어떤 방어가 *비용 대비 의미 있는지* 결정할 수 있습니다. STRIDE는 분류 도구이고, DREAD는 우선순위 도구입니다.

## 왜 위협 모델부터 그리는가

임베디드 시스템에 *보안 기능을 붙이자*고 결정하기 전에 답해야 할 질문이 세 개 있습니다. 무엇을 지키는가, 누구로부터 지키는가, 어떻게 들어올 수 있는가입니다. 이 세 질문에 대답하지 못한 상태에서 AES-256과 ECDSA를 켜면, 비용은 들었는데 정작 공격자가 지나가는 길은 그대로 열려 있는 결과가 나옵니다.

위협 모델링은 위 세 질문에 *체계적으로* 답하는 절차입니다. 이 장에서는 STRIDE를 위협 분류의 한 방법으로, DREAD를 팀이 위험을 비교할 때 쓸 수 있는 점수화 휴리스틱으로 사용합니다. 두 방법이 모든 조직에서 같은 형태로 채택되거나 동일한 결정을 내리는 표준 절차는 아닙니다. 조직은 자체 위험 분석과 규제 요구에 맞춰 평가 기준을 정해야 합니다.

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

각 자산에 대해 세 가지를 적습니다. 첫째 *기밀성*, 노출되면 손해가 나는가. 둘째 *무결성*, 변조되면 시스템이 어떻게 망가지는가. 셋째 *가용성*, 사라지면 동작이 멈추는가. 모든 자산에 세 속성이 다 중요한 것은 아닙니다. 펌웨어는 무결성이 압도적으로 중요하고, 사용자 데이터는 기밀성이 우선이며, 세션 키는 셋 다 중요합니다.

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

이 단계는 이 장에서 위험 시나리오를 나누기 위해 만든 예시이며 업계 공통 등급이나 제품 인증 기준은 아닙니다. 제품의 가치, 노출 환경, 공격 비용과 규제 요구를 바탕으로 방어 범위를 정하고, 물리 공격에 대한 잔여 위험도 기록합니다.

## STRIDE — 위협의 6가지 종류

STRIDE는 [Microsoft Threat Modeling Tool 문서](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)에 설명된 위협 분류 체계입니다. 머리글자가 6개 위협 카테고리를 담습니다.

| 글자 | 위협 | 깨는 속성 | 임베디드 예시 |
|---|---|---|---|
| **S**poofing | 신원 위장 | 인증 (Authentication) | 위조 디바이스가 클라우드에 접속, 가짜 sensor 응답 |
| **T**ampering | 데이터 변조 | 무결성 (Integrity) | 펌웨어 patch, sensor 값 조작, NVS 변경 |
| **R**epudiation | 행위 부인 | 부인방지 (Non-repudiation) | 로그 삭제, 감사 추적 우회 |
| **I**nformation disclosure | 정보 노출 | 기밀성 (Confidentiality) | JTAG로 RAM dump, 측정 사이드채널로 키 추출 |
| **D**enial of service | 서비스 거부 | 가용성 (Availability) | MQTT flood, 무한 reset 루프, watchdog 우회 후 hang |
| **E**levation of privilege | 권한 상승 | 인가 (Authorization) | non-secure에서 secure world 침입, root shell 획득 |

자산 하나마다 STRIDE 6칸을 채워 보면 *무엇이 비어 있는지*가 보입니다. 예를 들어 BLE 펌웨어 업데이트 기능에 STRIDE를 적용하면 다음과 같이 나옵니다.

자산 — *OTA firmware update endpoint*.

| STRIDE | 위협 | 대응 |
|--------|------|------|
| S | 위장한 OTA 서버가 펌웨어 푸시 | 서버 인증서 검증 |
| T | 펌웨어 이미지 중간자 변조 | 서명 검증 (ECDSA P-256) |
| R | 어떤 펌웨어가 적용됐는지 로그 부재 | audit log + secure storage |
| I | 펌웨어 이미지 자체 노출 | 이미지 암호화 (AES-GCM) |
| D | 무한 update 요청으로 flash wear-out | rate limit + 인증 후 진행 |
| E | 업데이트 중 권한 escalation | 검증 후에만 boot region write 허용 |

이 표는 요구사항의 초안입니다. 각 대응의 책임자·검증 방법·실패 시 동작·잔여 위험을 더해야 검토 가능한 명세가 됩니다. 이후 설계는 이 표의 각 항목을 어떻게 만족시키는지 적는 작업이 됩니다.

## DREAD — 점수로 우선순위 매기기

STRIDE는 *분류*만 합니다. 모든 위협을 다 막을 수는 없기 때문에 우선순위가 필요합니다. DREAD는 다섯 축에 1~10점을 매겨 평균을 냅니다.

| 글자 | 의미 | 1점 (낮음) | 10점 (높음) |
|---|---|---|---|
| **D**amage | 성공 시 피해 | 사용자 한 명 영향 | 제품 전체 / 회사 신뢰 붕괴 |
| **R**eproducibility | 재현 난이도 | 매우 어려움, 운 필요 | 스크립트 한 줄로 재현 |
| **E**xploitability | 악용 난이도 | 박사급 전문 지식 | Metasploit 한 줄 |
| **A**ffected users | 영향 받는 사용자 비율 | 1% 미만 | 100% |
| **D**iscoverability | 발견 난이도 | 내부자만 알 수 있음 | 공개 CVE, Shodan 검색 한 번 |

다음 절의 수치는 설명용 팀 입력값입니다. DREAD에는 모든 조직에 적용되는 보편 점수 경계가 없으므로, 심각도 구간을 쓴다면 조직이 기준과 조치 기한을 별도로 정해야 합니다. 점수는 정확한 확률이 아니라 가정을 드러내고 검토를 시작하기 위한 기록입니다.

## 임베디드 특화 공격 벡터

데스크톱 보안 책에 나오지 않는, 임베디드에서만 자주 보는 공격 벡터입니다.

**디버그 인터페이스 — JTAG / SWD / UART**

디버그 보호의 이름과 가역성은 부품 계열에 따라 다릅니다. 예를 들어 STM32L552/L562의 RDP Level 2는 해당 제품에서 되돌릴 수 없는 설정입니다. 이 동작을 다른 STM32 계열이나 다른 벤더 제품에 그대로 일반화하지 말고, 실제 부품의 reference manual과 생산 검증 절차를 확인합니다.

**외부 storage — SD / eMMC / SPI flash 스왑**

루트 파일 시스템이 외부 SD에 있다면, 공격자가 카드를 빼서 PC에서 mount하고 init 스크립트 한 줄을 추가해 다시 끼우면 다음 부팅에 root shell이 열립니다. 변조 방지에는 신뢰된 root hash와 연결된 [dm-verity](https://www.kernel.org/doc/html/v6.12/admin-guide/device-mapper/verity.html) 또는 서명·실행 정책과 연결된 fs-verity 등을 검토합니다. 기본 LUKS/dm-crypt 암호화만으로 rootfs의 authenticity·무결성까지 보장하지는 않습니다.

**Glitch 공격 — voltage / clock / EM**

Fault injection은 전원·clock·EM 등의 교란으로 실행·데이터에 오류를 유도하는 공격입니다. 특정 instruction 하나를 항상 원하는 대로 건너뛸 수 있다는 뜻은 아닙니다. `if (signature_valid)` 분기에서 그 한 줄을 건너뛰면 부팅이 통과됩니다. 중복 검사와 감지기를 검토하되 공통 원인 오류와 compiler 변환, 실패 시 동작까지 실제 타깃에서 확인해야 합니다. 검사 두 번만으로 공격 내성을 보장하지 않습니다.

**Side-channel — power / EM / timing**

AES 계산 중의 전력 소모를 측정하면 round key를 복원할 수 있습니다. SPA·DPA·CPA라는 분석 기법이 30년째 발전해 왔습니다. 방어는 *masking*과 *constant-time* 구현입니다. Ch 7에서 따로 다룹니다.

**Cold boot / RAM remanence**

일부 메모리에서 전원 차단 뒤 데이터가 남는 현상을 이용하는 공격이 연구됐지만, 잔류 시간과 획득 가능성은 메모리·온도·장비·절차에 따라 달라집니다. 이 장에서는 고정 시간을 주장하지 않습니다. 민감 정보를 오래 유지하지 않고, 제품의 메모리 보호 기능과 zeroization 동작을 위협 모델에 맞춰 검증합니다.

## 자원 제약 — MCU에서의 crypto 도전

크립토는 *연산 비용*과 *메모리 비용*이 비쌉니다. 흔히 보는 제약은 다음과 같습니다.

연산 시간과 RAM/flash 점유는 MCU, 클록, 라이브러리 버전, 컴파일 옵션, 가속기 경로와 입력 크기에 따라 달라집니다. 특정 프로젝트의 선택은 고정된 표 수치가 아니라 실제 구성에서 측정한 시간·메모리 사용량과 보안 요구를 비교해 정합니다.

이 제약 때문에 임베디드에서는 다음과 같은 *현실적인 타협*이 자주 일어납니다.

- RSA 대신 ECC — 키·서명 형식과 연산 비용이 다르므로 지원 알고리즘, 보안 강도, 메시지 형식과 대상 MCU에서의 측정값을 함께 비교합니다.
- 전송 protocol과 인증 정책을 따로 선택합니다. DTLS는 datagram 전송용이며 PSK·certificate pinning도 키 교체·폐기·상호운용 조건을 확인해야 합니다.
- 매 패킷 서명 대신 *세션 시작에만* 서명, 이후 MAC으로.
- Merkle tree로 부분 검증할 때도 신뢰된 root hash의 인증과 실행 정책은 유지해야 합니다. Tree만으로 서명 기반 신뢰 시작점을 대체하지 않습니다.

이 타협은 *위협 모델이 허용할 때*만 가능합니다. 그래서 위협 모델을 *먼저* 그려야 하는 것입니다.

## 신뢰 경계 (Trust Boundaries)

위협 모델의 마지막 산출물은 *신뢰 경계 다이어그램*입니다. 시스템을 박스로 나누고, *데이터가 박스 사이를 건널 때 어떤 검증이 일어나는지*를 표시합니다.

![신뢰 경계 — Cloud, CA root, Device의 NS/S/OTP 계층](/images/blog/embedded-security/diagrams/ch01-trust-boundaries.svg)

이 그림의 CA root는 TLS 인증의 신뢰 기준이고 boot image의 ROTPK와 자동으로 같은 키가 아닙니다. 박스 사이의 화살표 각각이 검증 지점입니다. Cloud → Device는 mutual TLS, NS → S는 SMC 인터페이스의 입력 검증, S → OTP는 access control 검사가 들어갑니다. 신뢰 경계가 그려지면 그 다음 챕터들이 다루는 메커니즘(Secure Boot, TrustZone, TEE)이 *어디서 어떤 경계를 지키는지* 분명해집니다.

## 신뢰 경계를 검토 가능한 질문으로 바꾸기

그림은 Cortex-A의 NS/S 분리와 cloud 인증을 택한 한 구성 예이며 모든 MCU에 그대로 적용하는 구조가 아닙니다. DFD를 작성할 때는 외부 주체·process·저장소·data flow를 정하고, 경계를 넘는 각 flow에 입력 형식·인증 주체·권한·실패 정책을 연결합니다.

| Flow 예 | 먼저 확인할 가정 | 거부·복구 검증 |
|------|------|------|
| Cloud → update agent | 신뢰 anchor·서명키와 key rotation 책임 | 유효한 TLS라도 다른 제품·옛 보안 버전의 이미지는 거부하는가? |
| Non-secure → secure service | 포인터·길이·공유 buffer의 변경 가능성 | 경계 밖 길이·호출 중 변경·권한 없는 key ID를 거부하는가? |
| Update agent → flash | 쓰기 권한과 전원 차단 원자성 | 검증 후 변조와 중단 뒤에도 허용된 recovery만 실행되는가? |

이 표는 실행 결과가 아니라 검증 계획입니다. 자산별 owner와 기한을 붙이고 제품·공격 환경이 바뀌면 가정을 다시 검토합니다. 이 글에서는 물리 공격이나 제품 인증을 수행하지 않았습니다.

## 위험 우선순위 표 — 한 장으로 정리

자산 × STRIDE × DREAD를 합친 한 장의 표가 위협 모델의 결과물입니다.

| 자산 | STRIDE | 시나리오 | DREAD 입력 D/R/E/A/D | 평균 예시 | 검토할 대응 |
|---|---|---|---|---:|---|
| 펌웨어 이미지 | T (Tampering) | OTA 이미지 변조 | 9/7/8/9/8 | 8.2 | 서명 검증, 전송 보호 |
| 펌웨어 이미지 | I (Information disclosure) | flash 분석으로 지식재산 노출 | 6/6/6/5/5 | 5.6 | 기밀성 요구와 저장 경로 검토 |
| 디바이스 키 | I (Information disclosure) | 물리 분석으로 키 노출 | 8/6/7/6/5 | 6.4 | 키 보호 기능과 물리 공격 시험 검토 |
| 디버그 포트 | E (Elevation of privilege) | 디버그 접근으로 권한 상승 | 8/9/9/7/6 | 7.8 | 부품별 debug lifecycle 설정 |
| RoT 공개키 | T (Tampering) | 신뢰 기준 변경 | 10/8/9/9/9 | 9.0 | key provisioning·revocation 절차 검토 |
| 세션 키 | I (Information disclosure) | 메모리에서 세션 키 노출 | 5/4/5/4/3 | 4.2 | 수명·메모리 보호·zeroization 검증 |

각 점수는 예시 담당자가 임의 기준으로 기록한 값이며 표준 점수나 측정 결과가 아닙니다. 팀은 각 축의 정의와 근거를 남기고 평균만으로 위험 수용을 결정하지 않습니다.

이 표는 팀이 가정과 후속 검증을 검토하는 출발점입니다. 높은 점수만으로 우선순위나 위험 수용을 확정하지 말고, 자산 소유자·노출 조건·대응 비용과 잔여 위험을 함께 기록합니다.

## 자주 하는 실수

- **자산을 안 정한 채 기술부터 고릅니다.** "AES를 쓰자"는 결론이 아니라 출발점이 되어 버립니다. 무엇을 지키는지가 먼저입니다.
- **공격자 레벨을 가정하지 않습니다.** Level 5를 가정하면 비용이 무한대가 되고, Level 1만 가정하면 양산 후 공격에 무방비입니다. *어디까지 막을 것인가*를 명시적으로 결정합니다.
- **물리적 공격을 무시합니다.** 데스크톱 보안 모델에서는 "공격자가 디바이스를 손에 쥐면 끝"이지만 임베디드에서는 그것이 *시작*입니다.
- **디버그 포트 잠금을 양산 후에 검증하지 않습니다.** RDP 설정은 코드에 있어도 fuse blow가 실제로 됐는지 확인 안 하면 무의미합니다.
- **위협 모델을 한 번 그리고 안 봅니다.** 새 기능이 추가될 때마다 신뢰 경계가 바뀝니다. 위협 모델은 *살아 있는 문서*여야 합니다.

## 정리

- 임베디드 보안은 자산·공격자·신뢰 경계를 정의하는 위협 모델에서 출발합니다.
- 자산은 펌웨어·키·인증서·사용자 데이터·디버그 인터페이스 등으로 enumeration합니다.
- 공격자 능력 단계는 이 장의 시나리오 예시이며, 제품별 가정과 잔여 위험을 명시합니다.
- STRIDE는 위협의 6가지 종류(Spoofing·Tampering·Repudiation·Info disclosure·DoS·Elevation)를 분류합니다.
- DREAD는 5축(Damage·Reproducibility·Exploitability·Affected users·Discoverability)으로 점수를 매겨 우선순위를 정합니다.
- 검토할 수 있는 공격 벡터에는 JTAG·storage 스왑·glitch·side-channel·메모리 잔류가 있으며, 적용 가능성은 부품과 공격 환경에 따라 확인합니다.
- MCU의 자원 제약은 알고리즘과 프로토콜 선택에 영향을 주므로 대상 구성에서 측정하고 보안 요구와 함께 판단합니다.
- 위협 모델은 가정·검증 작업·잔여 위험을 기록하는 입력이며, 단일 평균 표가 릴리스 결정을 대신하지 않습니다.

다음 편은 **Ch 2: Secure Boot — 부트 체인 검증**. 위협 모델 표의 최상위 항목인 "임의 펌웨어 실행"을 어떻게 막는지, ROM부터 application까지 체인을 따라가며 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- CERT C — 보안 코딩 규칙
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
