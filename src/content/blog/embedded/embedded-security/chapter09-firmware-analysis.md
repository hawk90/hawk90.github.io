---
title: "펌웨어 분석과 리버싱 — Binwalk·Ghidra·radare2 활용"
slug: "embedded/embedded-security/chapter09-firmware-analysis"
date: 2026-05-21T09:09:00
description: "JTAG / SPI flash dump / binwalk / Ghidra / radare2. 펌웨어 정적·동적 분석."
tags: [Firmware, reverse-engineering, Ghidra, binwalk, JTAG]
series: "Embedded Security"
seriesOrder: 9
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"내 펌웨어를 *내가 먼저 까보지 않으면* 누군가는 까봅니다."** — 펌웨어 분석은 공격자의 첫 단계이자 방어자의 마지막 검증입니다. 출시 전에 *우리 펌웨어가 무엇을 노출하고 있는지* 알지 못하면, CVE 등록이 우리의 첫 알림이 됩니다.

펌웨어 분석은 *공격*과 *방어* 양쪽 모두의 필수 능력입니다. 공격자는 *취약점 발견*을 위해, 방어자는 *우리 제품이 무엇을 흘리는지* 확인하기 위해 같은 도구를 씁니다. 이 장에서는 획득·정적 분석·동적 분석의 산출물을 구분합니다. 직접 실행한 것은 두 가지입니다. 직접 만든 합성 firmware blob에 Debian 13의 binwalk를 돌렸고, 직접 만든 ARM ELF object에 문자열 검색을 했습니다. 실제 제품 dump·Ghidra 분석·장치 공격은 하지 않았습니다.

문자열·파일 signature는 조사 후보를 만들지만 취약점을 판정하지 않습니다. 암호화·압축·runtime 생성 값은 단순 검색으로 놓칠 수 있고, 인증서나 테스트 문구가 비밀처럼 탐지될 수도 있습니다.

## 워크플로 — 단계별로 남길 것

| 단계 | 입력·도구 | 산출물과 제한 |
|------|------|------|
| 획득 | 자체 build·공식 배포 이미지·허용된 장치 readout | 제품·version·hash·획득 조건, 원본 보존 |
| 구조 식별 | binwalk, file, format parser | 영역 offset·format 후보, 실제 추출 성공 여부 |
| 정적 코드 조사 | Ghidra, radare2, Rizin/Cutter | ISA·base address·참조·call path 가설 |
| 소스 분석 | Semgrep, weggli 등 | 소스 AST·규칙 결과, binary 분석과 구분 |
| 동적 확인 | 격리된 emulator·대상 장치·harness | 재현 입력·build·관측·실패 조건 |

[FACT](https://github.com/fkie-cad/FACT_core)는 분석·검색·비교 framework이고, [Firmadyne](https://github.com/firmadyne/firmadyne)는 Linux 기반 firmware emulation framework입니다. 같은 기능이나 모든 제품을 자동 부팅시키는 도구로 묶지 않습니다.

## 1단계 — 펌웨어 획득

제품 모델·hardware revision·firmware version과 배포 이미지 hash를 먼저 남깁니다. 다운로드한 update package가 raw flash dump와 같다고 가정하지 않습니다. Header·압축·서명·암호화 영역이 포함될 수 있습니다.

### UART / JTAG / SWD

UART는 pinout·I/O 전압·ground·console 정책을 먼저 확인합니다. TX/RX/GND 이름만 보고 임의 전압의 adapter를 연결하지 않습니다. Boot log는 partition·version의 단서일 수 있지만 실제 메모리 내용이나 root 권한의 증거는 아닙니다.

JTAG/SWD에 연결됐다고 flash 전체를 읽을 수 있는 것은 아닙니다. STM32L5 HAL은 RDP Level 1에서도 JTAG·SWD debug가 연결돼 있으면 flash를 program·erase할 수 없다고 적고([`stm32l5xx_hal_flash_ex.c`](https://github.com/STMicroelectronics/stm32l5xx-hal-driver/blob/8a45ae313e26ff92273fbaee75275b191c3bb81e/Src/stm32l5xx_hal_flash_ex.c#L846-L849)), Level 2는 Level 1·0으로 돌아갈 수 없다고 경고합니다([Ch 1](/blog/embedded/embedded-security/chapter01-threat-model)). 읽기 목적의 세션에는 unlock·erase 명령을 섞지 않습니다.

### SPI flash / eMMC / NAND

칩 식별, 전원·VCCQ·I/O 전압, in-circuit bus 충돌, ECC·bad block·논리/물리 layout을 확인합니다. 보드와 adapter 조건 없이 CH341A 명령이나 eMMC 5개 test point 연결을 보편 절차로 제시하지 않습니다. Readout을 반복해 hash를 비교하고 원본과 분석 사본을 구분합니다.

Flash를 읽었다고 복호화 key까지 얻은 것은 아닙니다. [ESP-IDF v5.1.6 ESP32-C3 flash encryption 문서](https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/flash-encryption.html)에 따르면 이 칩은 flash 내용을 XTS-AES-128로 암호화하고, 256-bit key를 `BLOCK_KEYN` eFuse에 두며 read·write protection bit로 소프트웨어 접근을 막습니다. 이런 구성에서 외부 flash dump는 암호문입니다. 여기서는 물리 readout을 실행하지 않았습니다.

## 2단계 — 정적 분석

### binwalk — 구조 후보와 추출 성공을 구분

[Binwalk 최신 README](https://github.com/ReFirmLabs/binwalk)는 v3를 Rust로 다시 만든 도구로 소개합니다. 아래 실행은 Debian 13이 패키징한 Python 판 **v2.4.3**입니다. 두 판은 옵션과 추출 directory 구조가 다르므로 출력을 섞지 않습니다.

내용을 아는 입력으로 도구의 동작을 먼저 봅니다. 384 KiB blob을 만들고 0x00000에 64 KiB 난수, 0x20000에 gzip(78 B), 0x30000에 `mksquashfs -comp gzip`으로 만든 squashfs(4,096 B, `etc/passwd`·`etc/issue`), 0x50000에 다시 64 KiB 난수를 넣었습니다.

```text
$ binwalk firmware.bin
DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
131072        0x20000         gzip compressed data, maximum compression, from Unix, last modified: 1970-01-01 00:00:00 (null date)
196608        0x30000         Squashfs filesystem, little endian, version 4.0, compression:gzip, size: 329 bytes, 4 inodes, blocksize: 131072 bytes, created: 2026-11-16 07:23:38

$ binwalk -E -N firmware.bin
DECIMAL       HEXADECIMAL     ENTROPY
--------------------------------------------------------------------------------
0             0x0             Rising entropy edge (0.977850)
65536         0x10000         Falling entropy edge (-0.000000)
327680        0x50000         Rising entropy edge (0.976765)
```

Signature scan은 심은 gzip과 squashfs를 정확한 offset에서 찾았습니다. 두 난수 구간에는 signature가 없고 entropy 검사에서만 0.98 근처의 "rising edge"로 나타납니다. 이 구간이 암호문인지, 압축된 코드인지, 난수인지는 이 출력으로 구분되지 않습니다. 실제 제품이라면 offset과 길이를 partition table이나 boot log와 맞춰 봐야 합니다.

추출(`-e`)은 root로 실행하자 거부됐습니다. v2.4.3은 "추출은 안전하지 않을 수 있는 third-party utility를 많이 쓴다"며 `--run-as=root`를 명시하라고 요구합니다. 명시하면 `_firmware.bin.extracted/squashfs-root/etc/passwd`까지 풀립니다. 이 실행은 격리된 VM 안에서 root로 했습니다. binwalk의 메시지대로, 신뢰할 수 없는 이미지는 root가 아닌 사용자로 추출합니다.

### 추출된 rootfs의 후보 검색

firmwalker 같은 규칙 검색은 파일 경로와 문자열 후보를 찾는 단계입니다. RSA private key의 PEM 헤더(`BEGIN RSA PRIVATE KEY`)가 나와도 그것이 장치별 key인지, 모든 장치에 같은 key인지, 테스트 fixture인지는 더 봐야 합니다. [Ch 5](/blog/embedded/embedded-security/chapter05-tee)에서 본 OP-TEE의 `keys/default_ta.pem`처럼 source tree에 공개된 기본 key가 그대로 제품에 들어간 경우가 가장 위험합니다. `/etc/passwd`의 항목도 `/etc/shadow`와 실제 login 경로(serial getty, dropbear 설정)와 함께 봅니다.

### Ghidra

[Ghidra 공식 repository](https://github.com/NationalSecurityAgency/ghidra)는 disassembly·decompilation·scripting을 지원합니다. ELF처럼 header가 있는 파일은 import 때 ISA와 load address를 header에서 읽습니다. Raw flash dump에는 그런 정보가 없으므로 ISA·endianness·load address를 사람이 정합니다. Cortex-M이라면 vector table이 단서입니다. [Cortex-M33 TRM](https://developer.arm.com/documentation/100230/latest)(Issue 08)은 vector table의 모든 유효 entry가 bit 0을 1로 가져야 한다고 적습니다(Thumb 상태 표시). Entry 0은 초기 SP 값이라 이 규칙의 대상이 아닙니다. Dump 앞부분에서 entry 0 다음부터 bit 0이 1인 주소가 좁은 범위로 이어지면 vector table 후보이고, 그 주소 범위가 load address의 후보가 됩니다.

Decompiler의 C 비슷한 출력은 원본 소스가 아닙니다. 함수 경계·type·calling convention이 틀리면 해석도 틀릴 수 있습니다. 문자열 참조에서 비교 함수로 이어지는 call path와 실제 인증 결정을 함께 확인합니다. 문자열 `admin` 하나나 추정한 `strcmp`만으로 인증 우회를 선언하지 않습니다. 이 작업에서는 Ghidra를 실행하지 않았습니다.

### radare2 / Cutter

[radare2 book](https://book.rada.re/arch/decompile.html)은 기본 `pdc` pseudodecompiler와 `pdg` r2ghidra plugin을 구분합니다. `pdc`를 Ghidra plugin이라고 설명하지 않습니다. 함수 목록·참조·disassembly를 본 뒤 가설을 검토합니다.

```bash
r2 -A fixture.o
```

r2 안에서는 `afl`이 함수 목록, `pdf`가 현재 함수 disassembly, `pdc`가 pseudocode입니다. 위 명령은 실행하지 않았습니다. Debian 13(trixie)에는 `radare2` 패키지가 없어 `apt-get install radare2`가 "has no installation candidate"로 실패했기 때문입니다([sources.debian.org](https://sources.debian.org/src/radare2/)에도 trixie는 없고 sid와 옛 jessie·wheezy만 있습니다). [Cutter](https://cutter.re/)는 **Rizin**을 core로 쓰며 radare2 GUI가 아닙니다.

### Strings + grep — 잊지 말기

다음은 실제 장치 대신 문자열 검색의 한계를 확인하는 독립 fixture입니다. 값은 모두 의도적으로 넣은 교육용 문구이며 비밀이 아닙니다. ELF relocatable object라서 flash에 기록하거나 부팅할 이미지도 아닙니다.

```c title="fixture.c"
const char diagnostic[] = "password=training-only";
const char public_note[] = "tokenization is not a credential";
const unsigned char binary_values[] = {0, 1, 2, 3, 4, 5};
```

```bash title="fixture-strings.sh"
clang --target=arm-none-eabi -mcpu=cortex-m33 -mthumb \
  -O2 -g0 -DNDEBUG -c fixture.c -o fixture.o
strings -a -n 8 fixture.o | grep -iE 'password|secret|token'
```

macOS의 Apple clang 21.0.0과 `/usr/bin/strings`로 실행한 결과입니다.

```text
$ bash fixture-strings.sh
password=training-only
tokenization is not a credential
$ file fixture.o
fixture.o: ELF 32-bit LSB relocatable, ARM, EABI5 version 1 (SYSV), not stripped
$ strings -a -n 8 clean.o | grep -iE "password|secret|token"
rc=1
```

두 문구가 모두 걸렸습니다. `tokenization`은 `token` 규칙의 오탐입니다. `-O2 -g0 -DNDEBUG`로 빌드해도 전역 `const char[]`인 `diagnostic` 문구는 그대로 남습니다. `const int clean_value = 42;`만 넣은 `clean.o`에서는 grep이 아무것도 찾지 못해 exit 1이었습니다. 이 결과가 credential scanner의 탐지율이나 실제 firmware에 비밀이 없음을 증명하지는 않습니다.

## 3단계 — 동적 분석

정적 후보는 입력이 실제 보안 결정에 도달하는지 확인해야 합니다. [QEMU 사용자 모드](https://www.qemu.org/docs/master/user/main.html)는 guest kernel·모든 peripheral을 재현하는 장치 emulator가 아닙니다. `chroot`는 파일 경로의 root를 바꾸며 자체 보안 격리 경계가 아닙니다. 추출된 코드를 host root로 바로 실행하는 예를 사용하지 않습니다.

[Firmadyne README](https://github.com/firmadyne/firmadyne)에 따르면 이 도구는 Linux 기반 embedded firmware를 자체 수정 kernel(MIPS v2.6, ARM v4.1·v3.10)로 QEMU에서 띄우고, userspace NVRAM library로 하드웨어 NVRAM을 흉내 냅니다. 웹 UI가 뜨더라도 실제 보드의 secure boot·key storage·DMA 동작은 그 환경에 없습니다. 장치 debugger의 `load`는 메모리나 flash에 쓰는 명령이므로 read-only 조사에 섞지 않습니다.

### Fuzzing — 입력 전달 계약부터

[AFL++ 안내](https://aflplus.plus/docs/fuzzing_in_depth/)에 맞춰 target instrumentation 또는 binary backend와 harness를 선택합니다. 파일 기반 입력을 읽는 harness인지, stateful network server인지 구분합니다. 임의 httpd에 파일 경로를 넘긴다고 요청이 fuzz되는 것은 아닙니다. Boofuzz도 protocol model·connection·monitor·reset 조건이 필요합니다.

Crash는 재현 입력, build·sanitizer·stack과 영향 범위를 조사할 출발점입니다. Crash 발견을 바로 RCE나 제품 취약점 판정으로 올리지 않습니다. 이 작업에서는 동적 firmware 실행이나 network fuzzing을 하지 않았습니다.

## 실제 CVE 자료와 자체 실험을 구분

[Tenable TRA-2021-13](https://www.tenable.com/security/research/tra-2021-13)은 Arcadyan 기반 Buffalo router의 CVE-2021-20090 등을 다룹니다. [NVD](https://nvd.nist.gov/vuln/detail/CVE-2021-20090)는 이 CVE를 2021-04-29에 공개했고, 설명은 "Buffalo WSR-2533DHPL2 firmware ≤ 1.02와 WSR-2533DHP3 firmware ≤ 1.24의 web interface path traversal로 인증 없는 원격 공격자가 인증을 우회할 수 있다"입니다. CVSS 3.1 점수는 9.8(`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)입니다. 이 글에서 장치를 실행하거나 취약점을 재현하지는 않았습니다.

## 우리 펌웨어 자체 점검 체크리스트

출시 artifact와 분석 artifact의 hash를 연결합니다. 다음 조건별로 결과와 제외 이유를 남기면 단순 명령 성공과 보안 결론을 구분할 수 있습니다.

| 검사 | 확인할 것 | 그것만으로 알 수 없는 것 |
|------|------|------|
| 문자열·key 후보 | 파일·offset·실제 값과 사용 경로 | match 없음이 비밀 없음인지 |
| Debug 정보·log | 노출 정보·배포 구성·접근 주체 | strip이 인증·암호화를 제공하는지 |
| Service/interface | 제품별 허용 목록·권한·초기 상태 | port가 열렸다는 것만으로 취약점인지 |
| Update·boot | 서명·제품·version·실패 복구 | secure boot가 이미지 기밀성을 주는지 |
| Debug lifecycle | 제조·현장·복구 단계의 허용 정책 | 잠금이 모든 fault 모델을 막는지 |

## 자주 하는 실수

`NDEBUG`는 표준 `assert` 제어에 쓰이며 일반 `printf`를 자동으로 지우지 않습니다. `-g0`·strip도 코드의 문자열이나 credential을 자동 제거하지 않습니다. Release artifact 자체에서 값과 동작을 확인해야 합니다.

Flash 암호화도 mode를 확인해야 합니다. 같은 [ESP32-C3 문서](https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/flash-encryption.html)는 Development mode에서는 평문 firmware를 새로 써 넣으면 bootloader가 하드웨어 key로 대신 암호화해 주므로 "간접적으로 flash의 평문을 읽어 낼 수 있다"고 경고하고, 이 mode를 개발 중에만 쓰라고 합니다. 양산 장치는 Release mode여야 합니다. 실행 중에는 MMU flash cache가 매핑된 영역을 투명하게 복호화합니다. 그래서 문서의 bootloader는 flash 암호화를 켤 때 Development mode에서도 `DIS_PAD_JTAG`·`DIS_USB_JTAG` eFuse를 기본으로 함께 굽고, Release mode에서는 `DIS_DOWNLOAD_MANUAL_ENCRYPT`까지 더합니다. 기본값으로는 암호화와 debug 잠금이 함께 걸립니다.

## 정리

획득 조건과 hash, 구조 후보, 코드 해석 가설, 동적 재현 결과를 연결합니다. 이 장에서 실행한 것은 합성 blob의 binwalk signature·entropy·추출 시험과 교육용 ELF object의 문자열 검색입니다. binwalk는 심은 gzip·squashfs를 정확히 찾았지만 난수 구간은 entropy edge로만 보였고, 문자열 검색은 오탐 하나를 냈습니다. 실제 제품 분석·CVE 재현 결과는 아닙니다.

다음 편은 **Ch 10: 보안 개발 라이프사이클**.

## 관련 항목

- [Ch 2: Secure Boot — 실행 이미지의 신뢰 경계](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 7: Side-channel — 실기기 분석의 다음 단계](/blog/embedded/embedded-security/chapter07-side-channel)
- [Ch 8: IoT 표준 — vuln disclosure 절차](/blog/embedded/embedded-security/chapter08-iot-standards)
- [Ch 10: SDLC — 취약점 관리](/blog/embedded/embedded-security/chapter10-sdlc)
- [원문 — Ghidra](https://ghidra-sre.org/)
- [원문 — binwalk](https://github.com/ReFirmLabs/binwalk)
- [원문 — Firmadyne](https://github.com/firmadyne/firmadyne)
- [원문 — FACT (Firmware Analysis and Comparison Toolkit)](https://fkie-cad.github.io/FACT_core/)
- [원문 — AFL++](https://aflplus.plus/)
- [원문 — radare2 book](https://book.rada.re/)
