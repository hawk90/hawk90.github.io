---
title: "펌웨어 분석과 리버싱 — Binwalk·Ghidra·radare2 활용"
date: 2026-05-21T09:09:00
description: "JTAG / SPI flash dump / binwalk / Ghidra / radare2. 펌웨어 정적·동적 분석."
tags: [Firmware, Reverse Engineering, Ghidra, binwalk, JTAG]
series: "Embedded Security"
seriesOrder: 9
draft: false
---

## 한 줄 요약

> **"내 펌웨어를 *내가 먼저 까보지 않으면* 누군가는 까봅니다."** — 펌웨어 분석은 공격자의 첫 단계이자 방어자의 마지막 검증입니다. 출시 전에 *우리 펌웨어가 무엇을 노출하고 있는지* 알지 못하면, CVE 등록이 우리의 첫 알림이 됩니다.

펌웨어 분석은 *공격*과 *방어* 양쪽 모두의 필수 능력입니다. 공격자는 *취약점 발견*을 위해, 방어자는 *우리 제품이 무엇을 흘리는지* 확인하기 위해 같은 도구를 씁니다. 이 장에서는 *추출 → 정적 분석 → 동적 분석*의 세 단계와 표준 도구들을 실습 위주로 봅니다.

CVE 데이터베이스를 보면 *대부분의 임베디드 취약점*이 이 흐름으로 발견됩니다. 하드코딩된 root 비밀번호, 디버그 인터페이스 노출, 검증 없는 OTA endpoint, 평문 통신. 이런 것들은 *binwalk + grep*만으로도 충분히 잡힙니다.

## 워크플로 — 한눈에

**1. 펌웨어 획득**

- ├─ 벤더 사이트에서 .bin 다운로드 (가장 쉬움)
- ├─ MITM으로 OTA 캡처
- ├─ UART 부트 메시지 → 단서
- ├─ JTAG/SWD로 RAM/flash dump
- └─ SPI flash chip을 떼서 reader로 dump

**2. 정적 분석**

- ├─ binwalk         : 파일시스템·압축·서명 시그니처
- ├─ firmwalker      : 추출된 rootfs에서 비밀·취약 패턴
- ├─ Ghidra/IDA      : 디스어셈블·디컴파일
- ├─ radare2/Cutter  : CLI/UI 기반 리버싱
- └─ semgrep/weggli  : 소스/바이너리 패턴 매칭

**3. 동적 분석**

- ├─ QEMU emulation  : 사용자 모드 또는 전체 시스템
- ├─ Firmadyne/FACT  : 자동화된 에뮬레이션
- ├─ gdb stub        : 실기기 디버깅
- └─ AFL++/boofuzz   : 입력 fuzzing

각 단계의 산출물이 다음 단계의 입력이 됩니다.

## 1단계 — 펌웨어 획득

가장 쉬운 길은 *공식 다운로드*입니다. 라우터·카메라 같은 소비자 제품은 벤더 사이트에 *업데이트 이미지를 평문으로* 올려놓는 경우가 많습니다. 이게 안 되면 다음 경로입니다.

### UART → 부트 메시지

대부분의 임베디드 보드는 *디버그 UART*가 살아 있습니다. 보드를 분해해 *3핀(TX, RX, GND)*을 찾아 USB-시리얼 어댑터에 연결합니다.

```bash
sudo screen /dev/ttyUSB0 115200
# 또는
sudo picocom -b 115200 /dev/ttyUSB0
```

부트 메시지에서 *U-Boot 버전*, *Linux 커널 버전*, *루트 비밀번호*(많이 있음), *flash 파티션 맵*이 자주 보입니다.

```text
U-Boot 2018.07 (Aug 22 2023 - 14:23:15 +0800)
...
[    0.234567] reading 0x0:0x80000 [u-boot-env]
[    0.345678] reading 0x80000:0x100000 [kernel]
[    0.456789] mtd: device 4 (rootfs) is read-only
[    1.234567] Welcome to OurCamera v2.3.1
camera login: root
Password:    [엔터만 눌러도 들어가는 경우 있음]
#
```

부트 도중 *키 입력*으로 U-Boot 쉘에 들어갈 수 있으면 절반은 끝났습니다. `md.b`(memory display)로 RAM을 dump하거나, `sf read` / `mmc read`로 flash를 dump할 수 있습니다.

### JTAG / SWD → flash dump

UART가 막혀 있으면 JTAG입니다. 보드의 *TCK, TMS, TDI, TDO* 핀을 찾고 OpenOCD로 연결합니다.

```bash
openocd -f interface/jlink.cfg -f target/stm32f4x.cfg

# 다른 터미널에서
telnet localhost 4444
> halt
> flash read_bank 0 firmware.bin
```

JTAG 핀이 어디인지 모르면 *JTAGulator*나 *Tigard*가 자동 탐지를 도와줍니다. 핀이 *physically blown*되어 있으면 SPI flash 직접 접근으로 넘어갑니다.

### SPI flash 직접 dump

가장 결정적입니다. 보드에서 *SPI flash chip*(보통 SOIC-8, Winbond W25Qxxx 류)을 찾아 *SOIC8 클립* 또는 *desolder*로 접근합니다.

```bash
# CH341A programmer + flashrom
flashrom -p ch341a_spi -r firmware.bin
```

```text
flashrom v1.3.0
Calibrating delay loop... OK.
Found Winbond flash chip "W25Q128.V" (16384 kB, SPI) on ch341a_spi.
Reading flash... done.
```

읽기는 *대부분의 칩*에서 막혀 있지 않습니다. write protection이 *읽기는 막지 않는* 경우가 흔합니다. *secure element*(ATECC608, NXP A1006)는 다릅니다. 거기에 든 키는 *대부분의 경우* 추출 불가능합니다.

### eMMC / NAND

큰 Linux 시스템은 eMMC를 씁니다. *eMMC adapter*로 카드를 빼서 USB로 읽거나 *test point* 5개(CLK, CMD, DAT0, GND, VCC)에 직접 연결합니다. UFS는 비슷하지만 어댑터가 더 비쌉니다.

## 2단계 — 정적 분석

### binwalk

가장 먼저 돌리는 도구입니다. *시그니처 기반*으로 파일 안의 알려진 구조를 찾습니다.

```bash
binwalk firmware.bin

DECIMAL       HEX           DESCRIPTION
--------------------------------------------------------------------------------
0             0x0           DLOB firmware header
112           0x70          LZMA compressed data
1245184       0x130000      Squashfs filesystem, little endian, version 4.0,
                            compression: xz, size: 8234567 bytes
9568256       0x920000      JFFS2 filesystem, little endian
```

`-e` 옵션으로 자동 추출됩니다.

```bash
binwalk -e firmware.bin
ls _firmware.bin.extracted/
# 0.lzma  130000.squashfs  920000.jffs2  squashfs-root/
```

`squashfs-root/`에 들어가서 `ls bin/ sbin/ etc/`로 첫 탐색을 합니다. 거기서 보통 *맨 처음 충격적인 것*들이 나옵니다.

### firmwalker — 흔한 비밀 자동 검색

binwalk 추출 결과에 정적 grep을 돌립니다.

```bash
./firmwalker.sh _firmware.bin.extracted/squashfs-root/

[+] Searching for default passwords...
   etc/passwd: root::0:0:root:/root:/bin/sh
[+] Searching for SSH keys...
   etc/dropbear/dropbear_rsa_host_key
[+] Searching for URLs / IP addresses...
   etc/init.d/update.sh: curl https://update.example.com/...
[+] Searching for crypto-related files...
   etc/ssl/certs/...
[+] Searching for binaries with strcpy/system/etc...
   bin/httpd: strcpy gets system
```

이 출력 그대로가 *취약점 후보 목록*입니다.

### Ghidra

NSA가 2019년 공개한 *오픈소스 디스어셈블러·디컴파일러*입니다. 상용 IDA Pro의 *실질적 대체재*가 되었습니다.

```bash
ghidraRun
# File → New Project → Import → firmware.bin
# Architecture: ARM Cortex / MIPS / x86 등 자동 또는 수동 선택
# Analyze → All
```

Ghidra의 *Decompiler 창*이 핵심입니다. 어셈블리를 *C 비슷한 코드*로 보여 줍니다.

```c
// Ghidra 디컴파일 예시 — 펌웨어의 인증 함수
undefined4 check_password(char *input) {
    int iVar1;
    iVar1 = strcmp(input, "admin");      // ← 하드코딩
    if (iVar1 == 0) {
        return 1;
    }
    return 0;
}
```

이런 게 *진짜로* CVE가 됩니다. CVE-2019-15054(D-Link DIR-859, 하드코딩된 admin 패스워드), CVE-2021-32030(ASUS GT-AC2900, 인증 우회) 모두 *Ghidra 디컴파일 한 화면*이 시작이었습니다.

### radare2 / Cutter

CLI 위주의 리버싱 프레임워크입니다. Ghidra보다 가볍고 자동화하기 좋습니다.

```bash
r2 -A firmware.bin

[0x00100000]> afl              # 함수 목록
[0x00100000]> s sym.check_password
[0x00100000]> pdf              # 디스어셈블
[0x00100000]> pdc              # decompile (Ghidra plugin)
```

Cutter는 radare2의 Qt GUI입니다. Ghidra plugin이 통합되어 *r2 + Ghidra decompiler*가 한 화면에서 동시에 보입니다.

### Strings + grep — 잊지 말기

가장 단순한 도구가 가장 자주 통합니다.

```bash
strings -n 8 firmware.bin | grep -iE 'pass|key|secret|token|http|admin'
strings -n 8 firmware.bin | grep -iE '\.example\.com|\.local'
```

하드코딩된 API key, 디버그 URL, 백도어 명령어가 *문자열로* 그냥 박혀 있는 경우가 대부분입니다.

## 3단계 — 동적 분석

정적 분석으로 *후보*가 보이면, 동적으로 *실제 동작*을 확인합니다.

### QEMU 사용자 모드 에뮬레이션

추출된 rootfs의 단일 binary를 실행해 봅니다.

```bash
# ARM 바이너리를 x86 host에서 실행
sudo cp /usr/bin/qemu-arm-static squashfs-root/usr/bin/
sudo chroot squashfs-root /usr/bin/qemu-arm-static /bin/httpd
```

웹 인터페이스가 살아나면 *Burp Suite* 등으로 *실 디바이스 없이* 취약점 테스트가 가능합니다.

### Firmadyne / FACT — 전체 시스템 자동 에뮬레이션

router/IoT의 *전체 펌웨어*를 자동으로 에뮬레이션합니다. 네트워크 인터페이스까지 흉내 내서 *웹 UI가 그대로 살아나는 경우*가 많습니다.

```bash
./run.sh firmware.bin
# Firmadyne가 자동으로 추출·NVRAM 흉내·네트워크 구성·QEMU 부팅
# 마지막에 http://192.168.0.1/ 에 접속 가능한 emulated router를 제공
```

### gdb stub — 실기기 디버깅

JTAG/SWD가 있으면 OpenOCD가 *gdb stub*을 열어 줍니다.

```bash
openocd -f openocd.cfg &
arm-none-eabi-gdb firmware.elf
(gdb) target remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) break check_password
(gdb) continue
```

함수 진입 시점에 *비밀번호 비교 인자*를 그대로 읽어낼 수 있습니다. constant-time 비교가 아닐 경우 [Ch 7 timing](/blog/embedded/embedded-security/chapter07-side-channel)에서 본 공격까지 이어집니다.

### Fuzzing — AFL++ / boofuzz

알려지지 않은 취약점을 찾는 거의 유일한 자동 도구입니다.

```bash
# AFL++ — QEMU 모드로 binary fuzzing
afl-fuzz -Q -i in/ -o out/ -- ./extracted/usr/bin/httpd @@
```

`out/crashes/`에 모인 입력이 *crash를 일으킨 입력*입니다. 거기서 *stack overflow, heap overflow, use-after-free*가 발견되면 RCE로 이어질 가능성이 큽니다.

boofuzz는 *네트워크 프로토콜 fuzzing*에 특화됩니다. 사용자가 *프로토콜 grammar*를 직접 정의합니다.

```python
from boofuzz import *

session = Session(target=Target(connection=SocketConnection("192.168.1.1", 80, "tcp")))

s_initialize("http-request")
s_static("GET ")
s_string("/cgi-bin/login")
s_static(" HTTP/1.1\r\nHost: ")
s_string("victim.local")
s_static("\r\nContent-Length: ")
s_string("100")
s_static("\r\n\r\n")
s_string("user=admin&pass=AAAA")
session.connect(s_get("http-request"))
session.fuzz()
```

## 실제 CVE 사례 — 흐름 따라가기

*CVE-2021-20090* (Buffalo, Arcadyan FW에 영향) 사례를 단축해 봅니다.

**1. 펌웨어 다운로드 (벤더 사이트)**


**2. binwalk -e firmware.bin                          → squashfs 추출**


**3. ls usr/sbin/                                     → httpd, miniigd 등**


**4. strings usr/sbin/httpd | grep cgi                → "/cgi-bin/..." 다수**


**5. Ghidra로 httpd 분석                              → URL routing 함수 발견**


**6. routing 함수에서 "images/" 디렉터리 처리         → 인증 우회 가능 분기 보임**


**7. curl http://target/images/../cgi-bin/admin.cgi   → 인증 우회 확인**


**8. CVE-2021-20090 등록**

전 과정이 *binwalk + Ghidra + curl* 셋으로 끝났습니다. 분석 자체는 *주 단위*, exploit 작성은 *일 단위*입니다.

## 우리 펌웨어 자체 점검 체크리스트

출시 전에 *공격자 입장에서 한 번* 돌려 봅니다.

```bash
# 1. 빌드 산출물에 비밀이 없는지
strings firmware.bin | grep -iE 'BEGIN PRIVATE|password|secret|token|api[_-]key' | head -20

# 2. 디버그 심볼이 남아 있지 않은지
file firmware.bin
arm-none-eabi-strip firmware.elf -o firmware-stripped.elf

# 3. 압축·암호화된 영역이 보이는지
binwalk firmware.bin

# 4. 추출된 rootfs에서 비밀 패턴
binwalk -e firmware.bin && ./firmwalker.sh _firmware.bin.extracted/squashfs-root/

# 5. 노출된 서비스 (포트)
nmap -sV target-device-ip
```

이 다섯 줄을 CI에 박아 두면, *production에 들어가기 전에* 대부분의 흔한 실수가 잡힙니다.

## 자주 하는 실수

### 디버그 빌드를 production에 넣는다

`-O0 -g` 빌드는 *함수명, 변수명, 라인 정보*가 모두 들어 있습니다. 공격자 입장에서 *Ghidra가 거의 소스 수준*입니다. `strip` + `-Os` 빌드를 사용합니다.

### printf 디버그 메시지에 비밀 노출

`fprintf(stderr, "key=%s\n", api_key)` 같은 줄이 그대로 남아 있는 경우가 많습니다. `strings` 한 줄로 발견됩니다. release 빌드에서는 `NDEBUG` 매크로로 모두 제거합니다.

### JTAG/SWD 디버그 포트 미차단

production 보드에서 JTAG가 살아 있으면 *flash 전체*가 노출됩니다. eFuse로 *영구 잠금*하거나 PCB에서 pad 자체를 제거합니다.

### Read-protection만 켜고 안심

ST의 RDP, Nordic의 APPROTECT 같은 read-protection은 *과거에* 여러 차례 우회되었습니다. ChipWhisperer로 voltage glitch 한 방에 풀리는 사례 다수. *추가 secure element*를 함께 써야 의미가 있습니다.

### "우리 제품은 niche라 아무도 안 본다"

자동 펌웨어 크롤러(FACT, Firmware Analysis and Comparison Toolkit)가 *벤더별 펌웨어를 자동 수집·분석*합니다. niche 여부와 무관합니다.

### 펌웨어 암호화로 모든 게 해결된다고 생각

펌웨어 자체가 암호화되어도 *부팅 시* MCU 안에서 평문이 됩니다. RAM dump 또는 sniffing으로 추출 가능. 진짜 보호는 *실행 시점의 access control*까지 함께 가야 합니다.

## 정리

- 펌웨어 분석은 *공격*과 *방어* 양쪽의 필수 능력입니다. 우리가 먼저 우리 제품을 분석해야 합니다.
- 획득 경로는 *벤더 다운로드 → UART → JTAG → SPI flash 직접*의 순서입니다.
- `binwalk -e` + `firmwalker`만으로도 *흔한 실수*는 대부분 잡힙니다.
- Ghidra가 *상용 IDA의 실질적 대체재*가 되었습니다. radare2/Cutter는 자동화에 유리합니다.
- QEMU·Firmadyne으로 *실기기 없이* 동적 분석이 가능합니다.
- AFL++/boofuzz는 *알려지지 않은 취약점* 발견의 거의 유일한 자동 도구입니다.
- CI에 *우리 펌웨어 자체 점검* 다섯 줄을 박아 두면 production 사고가 크게 줄어듭니다.
- 디버그 빌드, printf 비밀, 살아 있는 JTAG, 약한 read-protection이 *가장 흔한 노출원*입니다.

다음 편은 **Ch 10: 보안 개발 라이프사이클 / 시리즈 마무리**.

## 관련 항목

- [Ch 2: Secure Boot — 분석 차단의 첫 방어](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 7: Side-channel — 실기기 분석의 다음 단계](/blog/embedded/embedded-security/chapter07-side-channel)
- [Ch 8: IoT 표준 — vuln disclosure 절차](/blog/embedded/embedded-security/chapter08-iot-standards)
- [Ch 10: SDLC — 취약점 관리](/blog/embedded/embedded-security/chapter10-sdlc)
- [원문 — Ghidra](https://ghidra-sre.org/)
- [원문 — binwalk](https://github.com/ReFirmLabs/binwalk)
- [원문 — Firmadyne](https://github.com/firmadyne/firmadyne)
- [원문 — FACT (Firmware Analysis and Comparison Toolkit)](https://fkie-cad.github.io/FACT_core/)
- [원문 — AFL++](https://aflplus.plus/)
- [원문 — radare2 book](https://book.rada.re/)
