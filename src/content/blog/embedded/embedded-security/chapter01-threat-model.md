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

위협 모델링은 위 세 질문에 *체계적으로* 답하는 절차입니다. 이 장에서는 STRIDE를 위협 분류에, DREAD를 위험 비교에 씁니다. 두 방법은 Michael Howard와 David LeBlanc가 *Writing Secure Code*에 정리한 것인데, LeBlanc 본인이 2007년 ["DREADful"](https://learn.microsoft.com/en-us/archive/blogs/david_leblanc/dreadful)에서 "둘 다 학문적 엄밀성을 갖고 개발되지 않았다"고 적었습니다. 같은 글에서 그는 STRIDE가 엄밀한 분류는 아니어도 특정 문제를 두고 논의의 초점을 맞추는 데는 쓸모가 있다고 봅니다. 이 장도 두 도구를 그 용도로 씁니다.

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

공격자를 한 덩어리로 보면 방어 비용을 가늠할 수 없습니다. 이 장은 다음 다섯 단계로 나눕니다.

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

이 다섯 단계는 이 장이 시나리오를 나누려고 만든 구분이며 업계 공통 등급이나 인증 기준이 아닙니다. 제품마다 "Level 몇까지 막는다"를 정하고, 그 위의 공격은 잔여 위험으로 문서에 남깁니다.

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

STRIDE는 *분류*만 합니다. 모든 위협을 다 막을 수는 없기 때문에 우선순위가 필요합니다. *Writing Secure Code*의 DREAD는 다섯 축에 1~10점을 매기고, 더한 뒤 5로 나눕니다(LeBlanc, "DREADful").

| 글자 | 의미 | 1점 (낮음) | 10점 (높음) |
|---|---|---|---|
| **D**amage | 성공 시 피해 | 사용자 한 명 영향 | 제품 전체 / 회사 신뢰 붕괴 |
| **R**eproducibility | 재현 난이도 | 매우 어려움, 운 필요 | 스크립트 한 줄로 재현 |
| **E**xploitability | 악용 난이도 | 박사급 전문 지식 | Metasploit 한 줄 |
| **A**ffected users | 영향 받는 사용자 비율 | 1% 미만 | 100% |
| **D**iscoverability | 발견 난이도 | 내부자만 알 수 있음 | 공개 CVE, Shodan 검색 한 번 |

평균에는 약점이 있습니다. LeBlanc가 든 예를 그대로 계산하면, Damage 1에 나머지 넷이 10인 위협(잘 알려진 성가신 문제)과 Discoverability 1에 나머지 넷이 10인 위협(찾기는 어렵지만 피해가 막대한 문제)이 둘 다 41/5 = 8.2점으로 같아집니다. 그는 대안으로 축마다 high·medium·low 세 단계만 매기고, 피해 축(Damage·Reliability·Affected users, LeBlanc 글은 R을 reliability라 부름)으로 심각도를, 상황에 따라 바뀌는 축(Exploitability·Discoverability)으로 우선순위 가산점을 따로 계산하는 방식을 제안했습니다. 같은 글에 "Microsoft 내부에서도 이 방식을 많이 쓰지 않으며 MSRC 방식도 아니다"라는 단서가 붙어 있습니다. 그래서 아래 표의 점수는 이 장의 설명용 입력값이고, 평균은 정렬 순서를 잡는 데만 씁니다.

## 임베디드 특화 공격 벡터

데스크톱 보안 책에 나오지 않는, 임베디드에서만 자주 보는 공격 벡터입니다.

**디버그 인터페이스 — JTAG / SWD / UART**

STM32L5 계열은 디버그·flash 읽기 보호를 option byte의 RDP(Read-out Protection) 값으로 정합니다. ST의 [stm32l5xx-hal-driver v1.0.7](https://github.com/STMicroelectronics/stm32l5xx-hal-driver/blob/8a45ae313e26ff92273fbaee75275b191c3bb81e/Inc/stm32l5xx_hal_flash.h#L278-L283) `stm32l5xx_hal_flash.h`는 Level 0 = `0xAA`, 0.5 = `0x55`, 1 = `0xBB`, 2 = `0xCC`로 정의하고, Level 2에 "활성화하면 Level 1이나 0으로 돌아갈 수 없다"는 경고를 붙여 둡니다. 되돌릴 수 없으므로 Level 2는 양산 라인의 마지막 단계에서 겁니다.

**외부 storage — SD / eMMC / SPI flash 스왑**

루트 파일 시스템이 외부 SD에 있다면, 공격자가 카드를 빼서 PC에서 mount하고 init 스크립트 한 줄을 추가해 다시 끼우면 다음 부팅에 root shell이 열립니다. 변조 방지에는 신뢰된 root hash와 연결된 [dm-verity](https://www.kernel.org/doc/html/v6.12/admin-guide/device-mapper/verity.html) 또는 서명·실행 정책과 연결된 fs-verity 등을 검토합니다. 기본 LUKS/dm-crypt 암호화만으로 rootfs의 authenticity·무결성까지 보장하지는 않습니다.

**Glitch 공격 — voltage / clock / EM**

Fault injection은 전원·clock·EM 교란으로 실행이나 데이터에 오류를 일으키는 공격입니다. 표적은 보안 결정이 걸린 분기입니다. `if (signature_valid)` 분기 하나가 잘못 실행되면 서명이 틀린 이미지로도 부팅이 통과됩니다. 공격 기법과 방어는 [Ch 7](/blog/embedded/embedded-security/chapter07-side-channel)에서 다룹니다.

**Side-channel — power / EM / timing**

AES 계산 중의 전력 소모를 측정하면 round key를 복원할 수 있습니다. 출발점은 Kocher의 timing 공격(CRYPTO 1996)과 DPA(Kocher·Jaffe·Jun, CRYPTO 1999)이고, CPA는 Brier·Clavier·Olivier의 [CHES 2004 논문](https://www.iacr.org/archive/ches2004/31560016/31560016.pdf)이 정리했습니다. 방어는 *masking*과 *constant-time* 구현입니다. Ch 7에서 따로 다룹니다.

**Cold boot / RAM remanence**

DRAM은 전원이 끊긴 뒤에도 내용이 바로 사라지지 않습니다. Halderman 등의 ["Lest We Remember: Cold Boot Attacks on Encryption Keys"](https://www.usenix.org/legacy/event/sec08/tech/full_papers/halderman/halderman.pdf)(USENIX Security 2008)는 정상 동작 온도(기계에 따라 25.5~44.1 °C)에서 시험한 기계들이 데이터를 완전히 잃기까지 빠른 쪽은 약 2.5초, 느린 쪽은 평균 35초 걸렸다고 보고합니다. 압축 공기 스프레이로 칩 표면을 약 −50 °C까지 식히면 전원 없이 10분이 지나도 bit의 1% 미만만 decay했고, 액체 질소에 60분 담근 모듈은 1 MB 시험 영역에서 0.17%만 바뀌었습니다. 대응은 키를 필요한 동안만 RAM에 두고, 쓰고 나면 즉시 0으로 지우는(zeroization) 것입니다.

## 자원 제약 — MCU에서의 crypto 도전

크립토는 *연산 비용*과 *메모리 비용*이 비쌉니다. Flash 비용은 직접 재 볼 수 있습니다. [Mbed TLS v3.6.4](https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2)의 모듈을 Debian 13의 `arm-none-eabi-gcc` 14.2.1로 Cortex-M4용 object로 컴파일하고 `arm-none-eabi-size`로 크기를 읽었습니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -ffunction-sections -fdata-sections \
  -Iinclude -Ilibrary -c library/ecp_curves.c -o ecp_curves.o
arm-none-eabi-size aes.o gcm.o sha256.o bignum.o bignum_core.o ecp.o ecp_curves.o \
  ecdsa.o rsa.o rsa_alt_helpers.o
```

| object | 설정 | `.text` (B) | `.bss` (B) |
|---|---|---:|---:|
| `aes.o` | 기본 `mbedtls_config.h` | 8,057 | 8,748 |
| `aes.o` | `MBEDTLS_AES_ROM_TABLES` | 16,253 | 0 |
| `aes.o` | `ROM_TABLES` + `FEWER_TABLES` | 10,129 | 0 |
| `gcm.o` | 기본 | 5,675 | 0 |
| `sha256.o` | 기본 | 3,482 | 0 |
| `bignum.o` + `bignum_core.o` | 기본 | 9,332 + 2,378 | 0 |
| `rsa.o` + `rsa_alt_helpers.o` | 기본 | 9,635 + 1,593 | 0 |
| `ecp.o` | 기본 | 9,865 | 30 |
| `ecp_curves.o` | 기본(곡선 13개) | 34,926 | 0 |
| `ecp_curves.o` | P-256만 남김 | 2,700 | 0 |
| `ecdsa.o` | 기본 | 1,684 | 0 |

표에서 두 가지가 보입니다. 첫째, 기본 설정의 AES는 S-box·T-table을 실행 중에 만들어 RAM(`.bss`)에 8.7 KB를 씁니다. `MBEDTLS_AES_ROM_TABLES`를 켜면 RAM 사용은 0이 되고 그만큼 flash가 늘어납니다. RAM이 작은 MCU에서는 이 한 줄이 RAM과 flash 중 무엇을 쓸지를 정합니다. 둘째, 곡선을 P-256 하나로 줄이면 `ecp_curves.o`가 34.9 KB에서 2.7 KB로 줄어듭니다. 이 크기는 링크 전 object의 `.text`라서 `--gc-sections` 뒤 최종 image에서는 쓰지 않는 함수만큼 더 줄어듭니다. 실행 시간과 stack 사용량은 이 측정에 들어 있지 않습니다.

이 제약 때문에 임베디드에서는 다음과 같은 *타협*을 검토합니다.

- RSA 대신 ECC — 크기 차이는 서명과 키에서 납니다. OpenSSL 4.1.0으로 만든 RSA-2048 서명은 256 B, P-256 서명은 DER로 69~72 B(raw r‖s는 64 B)였습니다([Ch 2](/blog/embedded/embedded-security/chapter02-secure-boot)). 반면 위 표에서 코드 크기는 RSA 경로(`rsa`+`rsa_alt_helpers`+`bignum`+`bignum_core` = 22,938 B)와 P-256 ECDSA 경로(`ecdsa`+`ecp`+P-256 `ecp_curves`+`bignum`+`bignum_core` = 25,959 B)가 비슷합니다. ECC로 바꾸면 flash보다 전송·저장하는 바이트가 줄어듭니다.
- 전송 protocol과 인증 정책을 따로 고릅니다. UDP 위에서는 TLS 대신 DTLS([RFC 9147](https://www.rfc-editor.org/rfc/rfc9147), DTLS 1.3)를 씁니다. PSK를 쓰면 인증서 검증 코드가 빠지는 대신 키 배포·교체를 직접 설계해야 합니다.
- 매 패킷 서명 대신 *세션 시작에만* 서명, 이후 MAC으로.
- Merkle tree로 부분 검증할 때도 신뢰된 root hash의 인증과 실행 정책은 유지해야 합니다. Tree만으로 서명 기반 신뢰 시작점을 대체하지 않습니다.

이 타협은 *위협 모델이 허용할 때*만 가능합니다. 그래서 위협 모델을 *먼저* 그려야 하는 것입니다.

## 신뢰 경계 (Trust Boundaries)

위협 모델의 마지막 산출물은 *신뢰 경계 다이어그램*입니다. 시스템을 박스로 나누고, *데이터가 박스 사이를 건널 때 어떤 검증이 일어나는지*를 표시합니다.

![신뢰 경계 — Cloud, CA root, Device의 NS/S/OTP 계층](/images/blog/embedded-security/diagrams/ch01-trust-boundaries.svg)

이 그림의 CA root는 TLS 인증의 신뢰 기준이고 boot image의 ROTPK와 자동으로 같은 키가 아닙니다. 박스 사이의 화살표 각각이 검증 지점입니다. Cloud → Device는 mutual TLS, NS → S는 SMC 인터페이스의 입력 검증, S → OTP는 access control 검사가 들어갑니다. 신뢰 경계가 그려지면 그 다음 챕터들이 다루는 메커니즘(Secure Boot, TrustZone, TEE)이 *어디서 어떤 경계를 지키는지* 분명해집니다.

## 신뢰 경계를 검토 가능한 질문으로 바꾸기

그림은 Cortex-A 구성입니다. Cortex-M의 TrustZone-M에는 EL3와 SMC가 없고, Non-secure에서 Secure로 들어가는 길은 NSC 영역의 `SG` 명령입니다([Ch 4](/blog/embedded/embedded-security/chapter04-trustzone)). 어느 쪽이든 DFD를 그릴 때는 외부 주체·process·저장소·data flow를 정하고, 경계를 넘는 각 flow에 입력 형식·인증 주체·권한·실패 정책을 붙입니다.

| Flow 예 | 먼저 확인할 가정 | 거부·복구 검증 |
|------|------|------|
| Cloud → update agent | 신뢰 anchor·서명키와 key rotation 책임 | 유효한 TLS라도 다른 제품·옛 보안 버전의 이미지는 거부하는가? |
| Non-secure → secure service | 포인터·길이·공유 buffer의 변경 가능성 | 경계 밖 길이·호출 중 변경·권한 없는 key ID를 거부하는가? |
| Update agent → flash | 쓰기 권한과 전원 차단 원자성 | 검증 후 변조와 중단 뒤에도 허용된 recovery만 실행되는가? |

이 표는 시험 결과가 아니라 시험 계획입니다. 항목마다 담당자와 기한을 붙이고, 제품이나 공격 환경이 바뀌면 다시 엽니다.

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

점수는 이 장의 설명용 입력값이며 측정 결과가 아닙니다. 평균으로 정렬하면 RoT 공개키 변조(9.0)가 맨 위, 세션 키 노출(4.2)이 맨 아래입니다. 다만 앞에서 본 LeBlanc의 지적처럼 평균은 피해가 큰 위협과 흔한 위협을 같은 점수로 묶을 수 있습니다. 그래서 Damage가 8 이상인 행(펌웨어 변조, 디바이스 키, 디버그 포트, RoT 공개키)은 평균과 별개로 다시 봅니다.

## 자주 하는 실수

- **자산을 안 정한 채 기술부터 고릅니다.** "AES를 쓰자"는 결론이 아니라 출발점이 되어 버립니다. 무엇을 지키는지가 먼저입니다.
- **공격자 레벨을 가정하지 않습니다.** Level 5를 가정하면 비용이 무한대가 되고, Level 1만 가정하면 양산 후 공격에 무방비입니다. *어디까지 막을 것인가*를 명시적으로 결정합니다.
- **물리적 공격을 무시합니다.** 데스크톱 보안 모델에서는 "공격자가 디바이스를 손에 쥐면 끝"이지만 임베디드에서는 그것이 *시작*입니다.
- **디버그 포트 잠금을 양산 후에 검증하지 않습니다.** RDP 값이 빌드 스크립트에 있어도 실제 option byte에 기록됐는지 양산 라인에서 읽어 확인하지 않으면 잠금 여부를 모릅니다. STM32L5라면 RDP byte가 `0xCC`인지 봅니다.
- **위협 모델을 한 번 그리고 안 봅니다.** 새 기능이 추가될 때마다 신뢰 경계가 바뀝니다. 위협 모델은 *살아 있는 문서*여야 합니다.

## 정리

- 임베디드 보안은 자산·공격자·신뢰 경계를 정의하는 위협 모델에서 출발합니다.
- 자산은 펌웨어·키·인증서·사용자 데이터·디버그 인터페이스 등으로 enumeration합니다.
- 공격자 능력 단계는 이 장의 구분이며, 제품마다 막을 단계와 잔여 위험을 적습니다.
- STRIDE는 위협의 6가지 종류(Spoofing·Tampering·Repudiation·Info disclosure·DoS·Elevation)를 분류합니다.
- DREAD는 5축(Damage·Reproducibility·Exploitability·Affected users·Discoverability)에 1~10점을 매겨 평균을 냅니다. 평균은 피해가 큰 위협을 묻을 수 있어서 Damage를 따로 봅니다.
- 임베디드 특화 공격 벡터는 JTAG·storage 스왑·glitch·side-channel·DRAM 잔류입니다. DRAM은 정상 동작 온도에서 수 초~수십 초, −50 °C에서는 10분 뒤에도 bit의 1% 미만만 decay했습니다(Halderman 2008).
- Mbed TLS 3.6.4의 Cortex-M4 object 크기로 보면 기본 AES는 RAM 8.7 KB를 쓰고, 곡선을 P-256 하나로 줄이면 `ecp_curves`가 34.9 KB에서 2.7 KB가 됩니다.
- 위협 모델은 가정·시험 계획·잔여 위험을 적는 문서이며, 새 기능이 들어올 때마다 다시 엽니다.

다음 편은 **Ch 2: Secure Boot — 부트 체인 검증**. 위협 모델 표에서 평균이 가장 높았던 "RoT 공개키 변조"와 "펌웨어 이미지 변조"를 어떻게 막는지, ROM부터 application까지 체인을 따라가며 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- CERT C — 보안 코딩 규칙
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
