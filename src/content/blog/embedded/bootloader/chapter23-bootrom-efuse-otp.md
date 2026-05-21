---
title: "Ch 23: BootROM · eFuse · OTP — SoC의 0단계"
date: 2026-05-19T23:00:00
description: "전원 인가 직후 mask ROM이 무엇을 하는지, eFuse/OTP에 굳어 들어가는 키와 anti-rollback counter, secure boot의 시작점."
series: "Bootloader Internals"
seriesOrder: 23
tags: [embedded, bootloader, bootrom, efuse, otp, secure-boot]
draft: false
---

## 한 줄 요약

> **"BootROM과 eFuse는 *수정도 회수도 안 되는* 0단계입니다."** — mask ROM에 굳어진 코드가 첫 명령을 실행하고, eFuse에 한 번 박힌 비트가 그 코드의 동작 정책을 영원히 정합니다. 이 단계에서 잘못 굳히면 SoC 한 개가 *벽돌이 됩니다*.

## 왜 0단계가 따로 있어야 하는가

[Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)에서 BootROM의 자리를 언급했습니다. 시리즈의 다른 챕터들이 *우리가 짜는 코드*를 다룬다면, 이 챕터는 *우리가 절대 못 건드리는 코드*와 *한 번만 쓸 수 있는 비트*를 다룹니다.

전원 인가 직후의 CPU는 *어떤 코드를 실행할지 모릅니다*. RAM도 없고, eMMC도 깨어나지 않았고, SPI flash조차 클럭이 안 잡혀 있습니다. 이 상태에서 *어딘가의 명령을 가져와 실행*해야 합니다. SoC 설계자는 이 *최초의 한 줌의 코드*를 die 안에 *물리적으로 새겨* 출하합니다. 이게 BootROM입니다.

BootROM이 *어떻게 동작할지*는 출하 시점에 정해집니다. 하지만 *몇 가지 정책*만은 보드 제조사가 결정해야 합니다. SD에서 부팅할지 eMMC에서 부팅할지, secure boot을 켤지 끌지, 어느 키로 서명된 펌웨어만 허용할지. 이 정책을 보드 제조사가 *한 번 굳히는* 자리가 eFuse·OTP입니다.

이 0단계의 두 요소는 *영구성*이 핵심입니다. BootROM은 die에 박힌 채 회로가 죽을 때까지 그대로 있고, eFuse는 한 비트라도 *0→1로 바꾼 순간 되돌릴 수 없습니다*.

## BootROM의 동작 순서

전원 인가부터 BootROM이 SPL로 점프하기까지의 순서를 i.MX 8M 계열 기준으로 풀어 보면 다음과 같습니다.

```text
[POR 신호 LOW → HIGH]
   │
   ▼
[PMIC voltage rail 안정 — 수십 ms]
   - VDD_CORE, VDD_SOC, VDD_DRAM 순서대로 상승
   - 각 rail이 target voltage 도달 신호 대기
   │
   ▼
[reference clock PLL lock]
   - 24 MHz xtal 기반 PLL 안정화 (수 ms)
   │
   ▼
[CPU reset deassert]
   - cortex-a53 #0 만 unhalt, 나머지는 WFE
   - PC = 0x00910000 (i.MX 8M ROM base)
   │
   ▼
[BootROM 실행 시작 — mask ROM 안의 코드]
   - SP를 OCRAM(0x00900000)에 설정
   - eFuse OCOTP bank를 읽어 정책 결정
   - boot mode strap (BOOT_MODE[3:0]) 샘플링
   │
   ▼
[boot device 결정]
   - SD/eMMC/QSPI/USB OTG 중 하나
   - boot container header (4 KB)를 OCRAM에 적재
   - 헤더에서 SPL 오프셋·크기·서명 위치 파싱
   │
   ▼
[secure boot check — HAB enabled bit가 켜진 경우]
   - eFuse SRK_HASH와 container 안 SRK table 해시 비교
   - container 안 CSF(Command Sequence File) 서명 검증
   - 실패 시 USB 복구 모드로 전환 (Serial Downloader)
   │
   ▼
[SPL 적재 + 점프]
   - SPL을 OCRAM(0x00910000~) 또는 TCM에 적재
   - PC = SPL entry point, 인계 완료
```

이 시점에서 우리가 짠 코드(SPL)가 처음 한 줄을 실행합니다. 그 전까지 모든 일은 *우리가 못 건드리는 영역*입니다.

흔히 오해하는 지점이 있습니다. BootROM은 *bootloader가 아닙니다*. BootROM은 *다음 단계를 어디서 얼마나 적재할지 정하고, 점프만* 합니다. DDR 초기화, 환경 변수 처리, 커널 적재 같은 일은 모두 SPL 이후의 책임입니다.

## boot mode 결정 — strap pin과 fuse

BootROM이 "어디서 부팅할지" 정하는 입력은 두 군데입니다.

| 입력 | 특성 | 우선순위 (i.MX 8M 기준) |
|---|---|---|
| **BOOT_MODE[3:0] strap pin** | 보드 외부 풀업/풀다운, 보통 DIP switch | fuse가 lock되지 않은 경우 우선 |
| **eFuse BOOT_CFG bank** | 한 번 박으면 영구 | `BT_FUSE_SEL` bit이 1이면 strap 무시 |

개발 단계에서는 strap pin이 우선입니다. SD 카드에 SPL을 굽고, DIP switch를 SD 위치에 두면 BootROM이 SD를 읽습니다. eMMC를 끼우면 strap만 바꿔 eMMC 부팅으로 전환합니다.

양산 단계에서는 *부팅 매체를 fuse로 고정*합니다. 그래야 strap pin이 흔들리거나 누가 wire를 잘못 박아도 부팅이 동일하게 진행됩니다.

```bash
# i.MX 8M Plus — eMMC 부팅으로 lock하는 fuse 시퀀스 (U-Boot 안)
=> fuse prog -y 1 3 0x00002000      # BOOT_CFG[13] = 1 (eMMC select)
=> fuse prog -y 1 3 0x02000000      # BT_FUSE_SEL = 1 (strap 무시, fuse만 사용)
=> reset
```

`fuse prog`는 U-Boot의 명령으로, 내부적으로 OCOTP controller의 BLOW 시퀀스를 트리거합니다. 한 번 성공하면 *되돌릴 방법이 없습니다*. 양산 라인에서 이 명령을 자동으로 굽는 jig는 *반드시 dry-run + verify 절차*를 끼워야 합니다.

대표 SoC들의 boot mode 입력은 다음 표처럼 다릅니다.

| SoC | strap pin | fuse override | 기본 우선 매체 |
|---|---|---|---|
| **NXP i.MX 8M Plus** | BOOT_MODE[3:0] | OCOTP `BOOT_CFG` | strap (fuse lock 가능) |
| **Rockchip RK3568** | 없음 (BootROM이 매체를 순서대로 시도) | OTP 일부 | SD → eMMC → SPI → USB |
| **TI AM62x** | SYSBOOT[7:0] | MMR `MMR_BOOTCFG` | strap (efuse으로 lock) |
| **Allwinner H6** | BOOT_SEL | SID fuse | strap |
| **STM32MP15x** | BOOT[2:0] | OTP word 17 | strap |

Rockchip은 strap pin이 없는 대신 BootROM이 *후보 매체를 순회*합니다. SD가 꽂혀 있으면 SD, 없으면 eMMC, 없으면 SPI, 없으면 USB MaskROM 모드. 개발 편의성은 좋지만, 양산에서 *원치 않는 SD가 꽂혀 있으면 그쪽으로 부팅*하는 사고가 납니다.

## eFuse · OTP — 한 번 굳히면 끝

eFuse는 *전기적으로 한 번만 0에서 1로 바꿀 수 있는* 메모리입니다. 물리적으로는 polysilicon fuse 또는 anti-fuse 구조이고, 큰 전류를 흘려 *작은 회로를 끊거나 잇는* 방식입니다. 한 번 변형된 구조는 *어떤 방법으로도* 되돌릴 수 없습니다.

OTP(One-Time Programmable)는 더 일반적인 용어입니다. eFuse는 OTP의 한 구현체입니다. SoC 데이터시트에서는 OTP·eFuse·FCT(Field Configurable Tag) 같은 이름이 섞여 등장하지만, *의미는 같습니다*. "한 번 쓰면 끝".

eFuse가 저장하는 정보는 크게 네 분류입니다.

eFuse Bank Layout — i.MX 8M Plus (단순화):

| Bank | 내용 |
|------|------|
| 0 | Lock bits, factory config (read-only) |
| 1 | `BOOT_CFG`, `BT_FUSE_SEL`, `USB_PHY_CFG` |
| 2 | Unique chip ID (read-only, factory burned) |
| 3 | MAC address #1, #2 |
| 6 | `SRK_HASH[255:0]` — Root of Trust 키 해시 |
| 7 | `SRK_REVOKE` — 키 revocation 4 bit |
| 9 | `SEC_CONFIG[1:0]`, JTAG disable, monotonic |
| 9 | SRTC / HMAC keys |

이 영역을 한 번에 다 보고 싶으면 U-Boot에서 `fuse sense`로 읽을 수 있습니다.

```bash
=> fuse sense 6 0 8
Sensing bank 6:
Word 0x00000000: deadbeef cafebabe 12345678 9abcdef0
Word 0x00000004: 11223344 55667788 99aabbcc ddeeff00
```

각 word는 32 bit 단위로, 위 layout에 따라 256 bit짜리 SRK hash가 8 word에 걸쳐 있습니다.

## SoC별 fuse map 예

실제 칩의 fuse map을 한 번 보면 감이 잡힙니다. NXP i.MX 8M Plus의 OCOTP map을 일부 정리하면 다음 표가 됩니다.

| Bank/Word | bit 범위 | 이름 | 의미 |
|---|---|---|---|
| 1 / 3 | [13] | `BT0_BOOT_DEVICE` | 0=SD, 1=eMMC |
| 1 / 3 | [25] | `BT_FUSE_SEL` | 1=strap 무시, fuse만 |
| 1 / 3 | [27:26] | `WDOG_ENABLE` | watchdog timeout 정책 |
| 6 / 0~7 | [255:0] | `SRK_HASH` | Super Root Key 해시 |
| 7 / 0 | [3:0] | `SRK_REVOKE` | 키 4개 중 어느 것을 폐기 |
| 9 / 0 | [1:0] | `SEC_CONFIG` | 00=Open, 11=Closed (secure boot 강제) |
| 9 / 0 | [2] | `JTAG_DISABLE` | 1=JTAG 영구 차단 |
| 9 / 0 | [5:3] | `JTAG_SMODE` | secure JTAG 모드 |
| 9 / 3 | [31:0] | `SW_GP1` | 사용자 정의 (anti-rollback에 사용) |

`SEC_CONFIG=11`이 secure boot의 *돌이킬 수 없는 전환점*입니다. 이 두 비트가 11이 되면 *서명 검증을 통과한 펌웨어만* 부팅됩니다. 잘못된 키로 서명된 펌웨어는 BootROM이 거부합니다.

Rockchip RK3568의 OTP는 다른 layout을 가집니다.

| 영역 | 크기 | 의미 |
|---|---|---|
| `OEM_NS` | 256 byte | 사용자 정의 영역 (MAC 등) |
| `OEM_S` | 32 byte | 보안 영역 |
| `RK_HASH` | 32 byte | Rockchip BootROM이 검증할 첫 단계 해시 |
| `Customer_HASH` | 32 byte | 고객 PK hash |
| `SecureBoot_EN` | 1 bit | secure boot 활성화 |
| `JTAG_DIS` | 1 bit | JTAG 차단 |

TI K3 계열은 SOC_ID와 MPK(Manufacturer Public Key) hash가 e-Fuse에 있고, AM62x는 fuse 외에도 *Tamper detection* 비트로 enclosure를 열면 키가 자동 erase되는 메커니즘까지 갖춥니다.

## Root of Trust — PK hash를 어떻게 박는가

Secure boot의 출발점은 *공개 키 한 개를 SoC에 영구히 박는* 일입니다. 정확히는 키가 아니라 *키의 SHA-256 해시*를 박습니다. 키 자체는 펌웨어 이미지 안에 동봉되고, BootROM이 *그 키의 해시*가 eFuse의 값과 같은지 확인합니다.

NXP HABv4 기준의 절차는 다음과 같습니다.

```bash
# 1) PKI tree 생성 (CA + 4개의 SRK + CSF·IMG 서명용 키)
$ cd cst/keys
$ ./hab4_pki_tree.sh
+ Use existing CA key (y/n)?: n
+ Use Elliptic Curve Cryptography (y/n)?: n
+ Length of the RSA key in bits: 4096
+ Duration (years) of the keys: 10
+ Number of Super Root Keys (1-4): 4
... 생성 완료 ...

# 2) SRK table과 SRK hash 산출
$ ./srktool -h 4 -t SRK_1_2_3_4_table.bin \
            -e SRK_1_2_3_4_fuse.bin \
            -d sha256 -c \
            ../crts/SRK1_sha256_4096_65537_v3_ca_crt.pem,\
            ../crts/SRK2_sha256_4096_65537_v3_ca_crt.pem,\
            ../crts/SRK3_sha256_4096_65537_v3_ca_crt.pem,\
            ../crts/SRK4_sha256_4096_65537_v3_ca_crt.pem

# 3) SRK_1_2_3_4_fuse.bin (32 byte) 를 OCOTP에 박기
$ hexdump -C SRK_1_2_3_4_fuse.bin
00000000  9a b3 71 d5 6f 4e ...
```

이 32 byte SHA-256 값을 U-Boot에서 fuse word 단위로 굽습니다.

```bash
=> fuse prog -y 6 0 0x9ab371d5
=> fuse prog -y 6 1 0x6f4ec3a2
=> fuse prog -y 6 2 0x...
... 8 word 반복 ...
=> fuse sense 6 0 8                 # verify
```

8 word를 모두 굳히고 `fuse sense`로 다시 읽어 일치하는지 확인한 뒤에야 *secure boot을 켤 수 있습니다*. 마지막으로 `SEC_CONFIG`를 11로 만드는 순간 칩은 *Closed* 상태로 들어가고, 이 SRK_HASH로 검증되지 않는 펌웨어는 영원히 부팅 못 합니다.

[Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 이 키가 SPL → U-Boot → kernel로 전파되는 *연쇄*를 다룹니다.

## anti-rollback counter

펌웨어 v2에 보안 취약점을 고친 패치가 들어갔다면, 공격자가 *v1으로 되돌리는* 시도를 막아야 합니다. 같은 키로 서명됐기 때문에 secure boot은 v1도 *유효한 펌웨어*로 받아들입니다. 이 공백을 막는 게 anti-rollback counter입니다.

원리는 단순합니다.

| 시점 | eFuse 비트 | 펌웨어 헤더 |
|---|---|---|
| v1 출하 | 1 bit 굳음 (`0001`) | "minimum required: 1" |
| v2 출하 | 2 bit 굳음 (`0011`) | "minimum required: 2" |
| v1 재시도 | eFuse는 `0011` | "minimum required: 1" |

부트 시 BootROM(또는 SPL)이 *eFuse의 carved bit 개수*와 *펌웨어 헤더의 최소 요구 버전*을 비교합니다. eFuse가 더 *높으면* 펌웨어 부팅을 거부합니다.

eFuse는 0→1 단방향이라 *몇 비트가 굳어졌는지 = 카운터 값*으로 사용합니다. monotonic counter라고 부르는 이유가 여기 있습니다.

```c
// 의사 코드 — anti-rollback check
uint32_t fuse_counter = popcount(otp_read(BANK_SW_GP1));  // 굳은 bit 개수
uint32_t fw_min_ver  = image_header.min_version;

if (fw_min_ver > fuse_counter) {
    // 새 펌웨어 — 부팅 후 eFuse를 fw_min_ver까지 굳혀야 함
    burn_otp_bits(BANK_SW_GP1, fw_min_ver - fuse_counter);
} else if (fw_min_ver < fuse_counter) {
    // 구버전 펌웨어 — 거부
    panic("anti-rollback violation");
}
```

문제는 *비트 개수가 유한*하다는 점입니다. SW_GP1이 32 bit짜리 word라면 32번의 patch밖에 못 받습니다. 양산 펌웨어의 *security version*은 *기능 버전과 별개*로 *아주 가끔만 올리는* 정책이 필요합니다. 보통은 *심각한 보안 patch*에서만 +1.

## JTAG · 디버그 영구 비활성화

양산 단계의 마지막 단계 중 하나는 *디버그 인터페이스를 잠그는* 일입니다. 공격자가 JTAG으로 *직접 메모리를 읽거나 PC를 바꾸면* secure boot이 무력해집니다.

| 모드 | 설명 |
|---|---|
| **Enabled** | JTAG 완전 개방. 개발 모드. |
| **Secure JTAG** | challenge-response. 비밀 키를 가진 jig만 접속. |
| **JTAG Disabled** | TAP controller 자체가 죽음. 영구. |

i.MX 8M에서는 `JTAG_DISABLE`(1 bit)과 `JTAG_SMODE`(3 bit)로 정책을 정합니다.

```bash
# secure JTAG 모드로 전환 (challenge-response)
=> fuse prog -y 9 0 0x00000018       # JTAG_SMODE = 011 (secure)

# 완전 비활성화
=> fuse prog -y 9 0 0x00000004       # JTAG_DISABLE = 1
```

JTAG을 *완전 비활성화*한 칩은 *벽돌이 됐을 때 살릴 방법이 없습니다*. 양산 첫 lot에서는 *Secure JTAG* 정도로 두고, 시장 안정성이 검증된 뒤에 *Disabled*로 전환하는 단계적 접근이 안전합니다.

## 흔한 실수

eFuse는 실수가 가장 치명적인 영역입니다. 양산 라인에서 자주 발생하는 사고를 분류해 두면 다음과 같습니다.

| 실수 | 결과 | 회복 가능성 |
|---|---|---|
| **잘못된 SRK hash blow** | 보유한 키로는 서명이 안 통함 | 불가능. 칩 폐기 |
| **`SEC_CONFIG=11` 먼저 굳히고 SRK 늦게** | 어떤 펌웨어도 검증 못 함 | 불가능 |
| **anti-rollback overflow** | 더 이상 patch 적용 불가 | 불가능. 칩 폐기 |
| **production fuse profile 미적용** | 양산 SoC가 strap 의존 → 흔들림 | fuse 추가 굳히기로 회복 |
| **JTAG 완전 비활성화 후 펌웨어 버그** | 디버그 불가능, USB 복구만 가능 | 부분 회복 (BootROM USB downloader) |
| **MAC fuse 중복 굳히기** | 두 보드가 같은 MAC | fuse 일부 회복 불가 |
| **SRK_REVOKE를 4개 모두 굳힘** | 모든 키 폐기, 칩 잠금 | 불가능 |

가장 흔한 사고는 *SEC_CONFIG를 먼저 굳히는* 것입니다. 양산 fuse 시퀀스에서 *순서*가 결정적입니다. 다음 순서를 dry-run으로 검증해 두는 게 안전합니다.

```text
[양산 fuse 순서 — 권장]
 1. unique ID·MAC·serial 굳기 (필요 시)
 2. SRK_HASH 8 word 굳기 + verify
 3. BOOT_CFG·BT_FUSE_SEL 굳기 + verify (boot device lock)
 4. JTAG_SMODE = secure (개발 회복 여지 유지)
 5. SEC_CONFIG = 11 (Closed 전환) — 마지막
 6. ※ 모든 단계마다 fuse sense로 verify
```

또 한 가지 흔한 실수는 *fuse prog의 비트 위치 착오*입니다. NXP의 OCOTP는 word 단위, Rockchip OTP는 byte 단위로 주소 체계가 다릅니다. SoC 데이터시트의 fuse map과 fuse 명령의 인자 의미를 *교차 검증*하지 않은 채 *대량 굳히기*에 들어가면 lot 전체가 폐기됩니다.

마지막으로 *production fuse profile* 자체를 잊는 경우입니다. 개발에서 strap pin으로만 동작 검증한 뒤 양산에서 동일한 strap을 가정합니다. 그러나 양산 환경의 strap pull-up 저항 편차로 *0.5%의 보드*에서 부팅이 실패하는 사고가 보고됩니다. fuse로 lock하면 이 변동을 완전히 차단합니다.

## 정리

- BootROM은 SoC die에 *물리적으로 새겨진* 코드입니다. 출하 후 어떤 방법으로도 수정할 수 없으며, POR → reset vector → boot mode 결정 → SPL 적재 → 점프의 짧은 시퀀스만 수행합니다.
- BootROM의 동작 정책은 *strap pin*과 *eFuse*로 결정됩니다. 개발 단계는 strap 우선, 양산 단계는 `BT_FUSE_SEL` 같은 비트로 fuse가 우선이 되도록 lock합니다.
- eFuse·OTP는 *0→1 단방향*입니다. 한 비트라도 굳히면 회수 불가능하므로 모든 굳히기 시퀀스는 dry-run + verify를 반복해야 합니다.
- secure boot의 시작은 *Root of Trust Public Key의 SHA-256 해시*를 SRK_HASH 영역에 굳히는 일이며, NXP HABv4의 경우 8 word 256 bit입니다.
- anti-rollback counter는 *굳은 bit 개수 = 버전 번호*로 사용하는 monotonic counter입니다. 펌웨어 헤더의 minimum version과 비교해 구버전 부팅을 거부합니다.
- JTAG은 *Secure JTAG*과 *완전 비활성화* 두 단계로 잠글 수 있습니다. 양산 초반에는 Secure JTAG, 안정 후 완전 비활성화가 단계적 접근입니다.
- 양산 fuse 순서는 *SRK_HASH 먼저, SEC_CONFIG 마지막*입니다. 거꾸로 굳히면 칩 한 개가 즉시 벽돌이 됩니다.
- fuse 사고는 *되돌릴 수 없고*, 양산 line의 jig에는 *반드시 verify 단계*가 들어가야 합니다.

## 다음 장 예고

다음 편은 [Ch 24: SPL · TPL 깊이](/blog/embedded/bootloader/chapter24-spl-tpl)에서 BootROM이 적재해 점프한 다음 단계의 코드를 풉니다. SRAM 안 50 KB에서 동작해야 하는 SPL이 어떻게 DDR을 깨우고 U-Boot Proper를 적재하는지 다룹니다.


## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem) — BootROM의 자리
- [Ch 24: SPL · TPL 깊이](/blog/embedded/bootloader/chapter24-spl-tpl) — BootROM 다음 단계
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust) — SRK_HASH가 부트 체인 전반으로 전파되는 흐름
- [Buildroot Ch 18: 보안 기능](/blog/embedded/buildroot/chapter18-security) — 빌드 시스템 관점의 secure boot
- [원문 — NXP HABv4 Reference Manual (AN4581)](https://www.nxp.com/docs/en/application-note/AN4581.pdf)
- [원문 — i.MX 8M Plus OCOTP fuse map (RM)](https://www.nxp.com/docs/en/reference-manual/IMX8MPRM.pdf)
