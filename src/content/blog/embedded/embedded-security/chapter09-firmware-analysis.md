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

펌웨어 분석은 *공격*과 *방어* 양쪽 모두의 필수 능력입니다. 공격자는 *취약점 발견*을 위해, 방어자는 *우리 제품이 무엇을 흘리는지* 확인하기 위해 같은 도구를 씁니다. 이 장에서는 획득·정적 분석·동적 분석의 산출물을 구분합니다. 실제 실행은 직접 만든 ARM ELF object의 문자열 검사이며, 실제 제품 dump·binwalk 추출·Ghidra 분석·장치 공격을 수행한 결과가 아닙니다.

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

JTAG/SWD는 target configuration과 lifecycle·debug authentication·readout 정책에 따라 접근 범위가 다릅니다. 연결 성공이 전체 flash 접근을 뜻하지 않으며 reset·unlock·erase가 개입하는 명령을 읽기 검사와 혼동하지 않습니다. 이 글의 이전 OpenOCD 혼합 세션과 부트 log는 실제 캡처가 아니므로 제거했습니다.

### SPI flash / eMMC / NAND

칩 식별, 전원·VCCQ·I/O 전압, in-circuit bus 충돌, ECC·bad block·논리/물리 layout을 확인합니다. 보드와 adapter 조건 없이 CH341A 명령이나 eMMC 5개 test point 연결을 보편 절차로 제시하지 않습니다. Readout을 반복해 hash를 비교하고 원본과 분석 사본을 구분합니다.

쓰기 보호와 읽기 보호의 범위, 저장 장치 암호화, secure element key export 정책은 제품별로 다릅니다. Flash를 읽었다고 복호화 key나 실행 시 권한까지 확보한 것은 아닙니다. 여기서는 물리 readout을 실행하지 않았습니다.

## 2단계 — 정적 분석

### binwalk — 구조 후보와 추출 성공을 구분

[Binwalk v3 공식 README](https://github.com/ReFirmLabs/binwalk)는 Rust로 다시 구현된 도구로, embedded file/data 식별과 선택적 추출을 설명합니다. v2의 Python 설치법·추출 directory 예를 v3 실행 결과로 붙이지 않습니다. 선택한 release의 `--help`, extractor 의존성과 오류를 기록합니다.

```bash
binwalk --help
binwalk firmware.bin
```

위는 설치된 도구로 수행할 조사 명령이며 이 작업에서는 실행하지 않았습니다. Signature 일치는 format 후보입니다. Offset·길이·checksum·실제 parser 결과를 함께 확인해야 하며 높은 entropy만으로 암호화를 확정하지 않습니다. Untrusted extractor는 격리된 분석 환경에서 다룹니다.

### 추출된 rootfs의 후보 검색

firmwalker 같은 규칙 검색은 파일 경로와 문자열 후보를 찾는 단계입니다. 발견한 private-key header가 실제 개인키인지, 테스트 fixture인지, 장치별 key인지와 읽기 권한을 확인해야 합니다. `/etc/passwd`의 항목도 shadow·인증 경로·서비스 구성과 함께 판단합니다. 이전 문서의 firmwalker 출력은 실측이 아니어서 제거했습니다.

### Ghidra

[Ghidra 공식 repository](https://github.com/NationalSecurityAgency/ghidra)는 disassembly·decompilation·scripting을 지원합니다. 선택한 배포판의 Java·processor 지원 조건을 기록합니다. Import 시 executable header를 활용할 수 있지만 raw firmware는 ISA·endianness·load address·entry point를 직접 정해야 할 수 있습니다.

Decompiler의 C 비슷한 출력은 원본 소스가 아닙니다. 함수 경계·type·calling convention이 틀리면 해석도 틀릴 수 있습니다. 문자열 참조에서 비교 함수로 이어지는 call path와 실제 인증 결정을 함께 확인합니다. 문자열 `admin` 하나나 추정한 `strcmp`만으로 인증 우회를 선언하지 않습니다. 이 작업에서는 Ghidra를 실행하지 않았습니다.

### radare2 / Cutter

[radare2 book](https://book.rada.re/arch/decompile.html)은 기본 `pdc` pseudodecompiler와 `pdg` r2ghidra plugin을 구분합니다. `pdc`를 Ghidra plugin이라고 설명하지 않습니다. 함수 목록·참조·disassembly를 본 뒤 가설을 검토합니다.

```bash
r2 -A fixture.o
```

r2 내부에서는 `afl`로 함수 목록, `pdf`로 현재 함수 disassembly, `pdc`로 pseudocode를 조사할 수 있습니다. 위 명령은 미실행 예이며 symbol·분석 설정·ISA를 함께 확인해야 합니다. [Cutter](https://cutter.re/)는 **Rizin**을 core로 사용하며 현재 radare2 GUI라고 부르지 않습니다.

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

macOS의 Apple Clang 21.0.0과 `/usr/bin/strings`로 실행했습니다. ELF magic·ARM machine 값을 확인하고 두 문구가 검출되는지 검사했습니다. `tokenization`은 이 규칙의 오탐 예입니다. `-DNDEBUG`가 있어도 `diagnostic` 문구는 남습니다. 별도 clean object에서는 해당 규칙이 match하지 않음을 확인합니다. 이 결과는 credential scanner의 탐지율이나 실제 firmware의 비밀 부재를 증명하지 않습니다.

## 3단계 — 동적 분석

정적 후보는 입력이 실제 보안 결정에 도달하는지 확인해야 합니다. [QEMU 사용자 모드](https://www.qemu.org/docs/master/user/main.html)는 guest kernel·모든 peripheral을 재현하는 장치 emulator가 아닙니다. `chroot`는 파일 경로의 root를 바꾸며 자체 보안 격리 경계가 아닙니다. 추출된 코드를 host root로 바로 실행하는 예를 사용하지 않습니다.

Firmadyne의 지원 ISA·kernel·NVRAM·network 가정이 제품에 맞는지 확인합니다. 웹 UI가 부팅되어도 실제 보드의 secure boot·key storage·DMA·fault 동작을 검증한 것은 아닙니다. 장치 debugger의 `load`는 메모리나 flash를 변경할 수 있으므로 read-only 조사 명령으로 섞지 않습니다.

### Fuzzing — 입력 전달 계약부터

[AFL++ 안내](https://aflplus.plus/docs/fuzzing_in_depth/)에 맞춰 target instrumentation 또는 binary backend와 harness를 선택합니다. 파일 기반 입력을 읽는 harness인지, stateful network server인지 구분합니다. 임의 httpd에 파일 경로를 넘긴다고 요청이 fuzz되는 것은 아닙니다. Boofuzz도 protocol model·connection·monitor·reset 조건이 필요합니다.

Crash는 재현 입력, build·sanitizer·stack과 영향 범위를 조사할 출발점입니다. Crash 발견을 바로 RCE나 제품 취약점 판정으로 올리지 않습니다. 이 작업에서는 동적 firmware 실행이나 network fuzzing을 하지 않았습니다.

## 실제 CVE 자료와 자체 실험을 구분

[Tenable TRA-2021-13](https://www.tenable.com/security/research/tra-2021-13)은 Buffalo·Arcadyan router의 CVE-2021-20090 등 취약점을 다룹니다. 제품·version·요청 처리와 공개 timeline은 advisory 원문으로 확인합니다. 이 글에서 장치를 실행하거나 취약점을 재현한 것은 아닙니다.

기존의 Ghidra 한 화면으로 시작했다는 CVE 귀속, 단축한 curl 경로, 분석·exploit 소요 기간은 근거가 없어 제거했습니다. 문헌 사례와 위의 교육용 ELF 문자열 실험은 별개의 증거입니다.

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

Read protection·secure element·암호화의 방어 범위는 chip revision·설정·key provisioning·공격 모델에 따라 다릅니다. Firmware가 실행 중 복호화된다는 이유만으로 host나 debug port에서 평문을 반드시 읽을 수 있다고 단정하지 않습니다. 실행 중 접근 제어와 lifecycle 정책을 함께 평가합니다.

## 정리

획득 조건과 hash, 구조 후보, 코드 해석 가설, 동적 재현 결과를 연결합니다. 이 장에서 실행한 것은 교육용 ELF object의 정상·오탐·미검출 조건 검사입니다. 실제 제품 분석·CVE 재현·보안 평가와 같은 결과로 쓰지 않습니다.

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
