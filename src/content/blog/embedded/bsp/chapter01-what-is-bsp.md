---
title: "BSP의 본질 분해 — 새 보드 부팅을 위한 코드의 자리"
slug: "embedded/bsp/chapter01-what-is-bsp"
date: 2026-05-18T09:01:00
description: "Board Support Package의 정의·범위·구성요소 — 보드를 부팅 가능한 시스템으로 만드는 모든 것."
series: "BSP Development"
seriesOrder: 1
tags: [embedded, bsp, board-support-package]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"BSP는 이 SoC와 보드에서 선택한 운영체제를 제품 요구사항에 맞게 시작·운영하기 위한 기반입니다."** — 팀과 벤더에 따라 범위가 달라지며, 이 시리즈는 부트로더·커널·디바이스 트리·이미지 빌드를 중심으로 다룹니다.

일반 PC는 표준화된 하드웨어 설명 방식과 폭넓은 드라이버 지원을 활용하는 경우가 많습니다. 임베디드 보드는 SoC, 부품 선택, 배선과 firmware가 제품별로 달라질 수 있어 보드별 통합 작업이 더 필요합니다.

임베디드는 다릅니다. 같은 i.MX 8M Plus SoC라 해도 *NXP의 EVK 보드*와 *우리 회사의 카메라 보드*는 클럭, DDR 타이밍, 핀 멀티플렉싱, 부트 미디어, 외부 칩 구성이 모두 다릅니다. 운영체제는 이 정보를 *어딘가에서 받아야* 부팅합니다. 그 "어딘가"의 묶음이 BSP입니다.

## BSP의 느슨한 정의

업계 어디서든 통하는 *엄밀한* 정의는 없습니다. 벤더마다, 회사마다 BSP가 가리키는 범위가 다릅니다.

| 출처 | BSP의 범위 |
|------|-----------|
| NXP, TI 같은 *SoC 벤더* | Yocto Layer + reference U-Boot + reference kernel + 데모 이미지 |
| Buildroot/Yocto 커뮤니티 | defconfig + 보드 디렉터리 + 패치 묶음 |
| RTOS 벤더 (FreeRTOS, Zephyr) | startup 코드 + linker script + HAL driver |
| 사내 R&D 팀 | "쟤가 켜지면 BSP는 끝난 것" — 매우 실용적 정의 |

이 시리즈에서는 *Linux 기반 임베디드 시스템*을 기준으로 다음 다섯 가지를 BSP에 포함시킵니다.

1. **부트로더** — U-Boot 포트. SPL/BL2 단계, DDR 초기화, 부트 미디어 선택, 부트 명령 환경.
2. **TF-A (일부 Arm 시스템)** — 선택된 boot chain에서 BL2/BL31 등 단계와 secure-monitor 기능을 제공합니다. 모든 Armv8 보드가 동일한 TF-A 구성을 쓰는 것은 아닙니다.
3. **Linux 커널** — 보드 패치, defconfig 분기, in-tree 또는 out-of-tree 드라이버.
4. **디바이스 트리** — `<soc>.dtsi` + `<board>.dts` + 가능하다면 overlay.
5. **빌드 시스템 통합** — Buildroot defconfig, Yocto layer, 또는 둘 다.

제품에 따라 factory provisioning(eFuse, MAC 주소, serial number 관리)과 OTA도 BSP 통합 범위에 포함될 수 있습니다. 이 시리즈 후반에서 관련 설계와 운영 흐름을 다룹니다.

## BSP가 끝나는 곳, 애플리케이션이 시작되는 곳

이 경계가 흐려지면 팀이 *영원히* BSP를 고치게 됩니다. 명확한 선이 필요합니다.

| BSP의 책임 | 애플리케이션의 책임 |
|-----------|-------------------|
| 부팅 후 `login:` 프롬프트가 뜸 | 그 위에서 동작하는 서비스 |
| 요구사항에 정한 peripheral 기능이 제공됨 | 그 기능을 제품 서비스에서 *어떻게* 쓸지 |
| `dmesg`에 에러가 없음 | 자체 로그에 에러가 없음 |
| Wi-Fi 드라이버가 로드됨 | 어느 SSID에 어떤 자격증명으로 연결할지 |
| `iperf3`가 link rate를 채움 | TLS handshake가 끝나는 시간 |

이 경계는 프로젝트가 합의할 acceptance criteria로 정합니다. `uname -a`는 커널 버전·빌드 정보를 보여줄 뿐, 주변장치나 제품 서비스를 어느 팀이 책임지는지는 결정하지 않습니다.

## 구성요소 한 장 정리

![BSP 구성요소 — 부트로더, secure monitor, 커널, 디바이스 트리, 빌드 통합](/images/blog/bsp/diagrams/chapter01-bsp-components.svg)

각 컴포넌트가 *어디서 시작해 어디서 끝나는지*가 BSP 작업의 출발점입니다.

## 부트 체인 — TF-A/U-Boot을 쓰는 한 가지 구성

많은 최신 Linux application processor가 Armv8 이상을 사용하지만, SoC와 firmware 구성에 따라 boot chain은 달라집니다. 아래는 TF-A와 U-Boot SPL을 사용하는 한 가지 흔한 흐름입니다.

<!-- TODO: TikZ (_design.tex) — 부트 체인 세로 흐름도로 교체 -->

```text
[Power-on / Reset]
   │
   ▼
BootROM
   │
   ▼
SPL / BL2
   │
   ▼
BL31
   │
   ▼
BL33
   │
   ▼
Linux Kernel
   │
   ▼
[userspace]
```

각 단계의 책임은 다음과 같습니다.

| 단계 | 책임 |
|------|------|
| BootROM | SoC 내 고정 firmware. strap/fuse와 SoC boot policy에 따라 부트 소스를 선택하고 다음 단계를 적재. 매체 검색 순서는 SoC별 문서에서 확인. |
| SPL / BL2 | U-Boot SPL 또는 TF-A BL2처럼 선택된 초기 firmware 단계. 플랫폼에 필요한 초기화와 다음 단계 적재를 수행. |
| BL31 | TF-A 구성에서 EL3 runtime firmware로 동작하며 PSCI 등 서비스를 제공할 수 있음. 사용 여부와 역할은 boot design에 따름. |
| BL33 | U-Boot proper (또는 다른 normal-world 부트로더). 부트 환경, 사용자 입력, 커널 적재. |
| Linux Kernel | 커널 시작. DT 파싱, 드라이버 probe. init 실행. |

BeagleBone Black처럼 오래된 ARMv7 U-Boot 보드는 보통 SPL → U-Boot → Linux 흐름을 사용하고 TF-A BL31 단계가 없습니다. architecture 이름만으로 모든 제품의 boot stages를 단정하지 말고 SoC·board documentation으로 확인합니다. RISC-V에서는 OpenSBI가 machine-mode runtime firmware 역할을 맡을 수 있지만 Arm BL31과 같은 구성요소는 아닙니다.

BSP 작업은 이 *각 단계의 책임*을 자기 보드에 맞게 채우는 것입니다.

## 보드별로 달라지는 것 — 차이의 원천

같은 SoC를 쓰는 두 보드의 차이를 파악하면 schematic과 software tree에서 확인할 작업을 좁힐 수 있습니다.

**SoC가 결정하는 것** — 보드와 무관, `dtsi`에 들어감.

- 어떤 CPU core가 몇 개
- 내부 SRAM 크기
- peripheral 종류 (UART, SPI, I2C, USB, MIPI 등)
- 인터럽트 controller 토폴로지
- 주소 맵 (peripheral base address)

**보드가 결정하는 것** — `board.dts`와 U-Boot `board.c`에 들어감.

- DDR 종류·크기·timing
- 어떤 UART이 console인가
- 어떤 핀이 어떤 기능인가 (pinmux)
- 외부 oscillator 주파수
- 외부 PMIC 종류
- Ethernet PHY 종류·주소
- Wi-Fi/BT 모듈 종류
- eMMC vs SD vs NAND vs SPI flash
- 디스플레이 panel 종류
- 보드 식별 GPIO·EEPROM 위치

`<soc>.dtsi`는 *벤더가* 제공합니다. `<board>.dts`는 *BSP 엔지니어가* 작성합니다.

## 시리즈에서 다룰 보드 — BeagleBone Black

이론은 추상적이고 실전은 구체적입니다. 시리즈에서는 *한 보드*를 메인 예시로 쓰되, 일부 장에서는 다른 SoC의 자료도 비교합니다.

**BeagleBone Black**을 고른 이유는 다음과 같습니다.

- AM335x SoC. Cortex-A8 기반 ARMv7. *BL31이 없어* 부트 체인이 단순.
- 회로도와 부품 BOM이 *완전히 공개*. CC-BY-SA.
- *Buildroot에 defconfig가 이미 존재* — 비교 베이스가 명확.
- 시리얼 콘솔이 6핀 헤더 하나로 잡힘. USB-TTL 어댑터 1개만 필요.
- 공개된 설계 자료와 메인라인/Buildroot 지원을 따라갈 수 있어 교육용 예제로 적합합니다. 가격과 재고는 지역·시점에 따라 달라지므로 선택 기준에서 제외합니다.

ARMv8 예시(TF-A 포함)는 **Raspberry Pi 4 (BCM2711)** 또는 **TI AM62x**를 *부분적으로* 참조합니다. 데이터시트 읽기(Ch 2), DDR 매개변수(Ch 5), TF-A 통합(Ch 7)에서 ARMv8 예시가 등장합니다.

다른 보드를 만지더라도 흐름은 같습니다. 이 시리즈를 다 따라온 후 NXP i.MX 8M Plus나 Rockchip RK3588을 받았을 때, *어디를 봐야 할지*가 보입니다.

## BSP를 시작하기 *전에* 확보할 것

새 보드를 받기 전 다음 자료가 *모두* 있는지 확인합니다. 하나라도 없으면 일정이 크게 흔들립니다.

**필수**

- [ ] SoC Reference Manual (수천 페이지)
- [ ] SoC Datasheet (전기적 특성, 핀 정의)
- [ ] 보드 회로도 (schematic, PDF)
- [ ] 보드 PCB layout (Gerber 또는 ODB++)
- [ ] DDR 칩 datasheet (Micron, Samsung, SK Hynix)
- [ ] PMIC datasheet
- [ ] 시리얼 어댑터 + 케이블 + 헤더
- [ ] 전원 어댑터

**강력 권장**

- [ ] SoC errata 문서
- [ ] SoC vendor의 reference BSP source tree
- [ ] 같은 SoC의 EVK 보드 (비교용)
- [ ] JTAG 디버거 (SEGGER J-Link 또는 Lauterbach)
- [ ] 로직 애널라이저 (Saleae Logic 등)

**있으면 좋음**

- [ ] Oscilloscope (4ch, 200MHz 이상)
- [ ] Bus pirate 또는 Glasgow (저속 prototyping)
- [ ] TFTP 서버 (개발 PC에 dnsmasq)

JTAG 디버거는 초기화 단계에서 유용한 선택지지만 필수는 아닙니다. SoC ROM download, bootloader 진단, GPIO/전원 계측, serial 경로 등 가능한 대체 수단도 보드 설계 단계에서 확인합니다.

## BSP 작업의 *전형적* 일정

일정 산정의 출발점으로 아래 계획 예시를 참고할 수 있습니다. 실제 소요 기간은 팀의 기존 지원 코드, 자료 접근성, 보드 상태, 검증 범위에 따라 달라집니다.

| 단계 | 기간 | 핵심 산출물 |
|------|------|-----------|
| 데이터시트 읽기, 회로도 분석 | 1~2주 | pin mux 표, clock 트리, DDR 사양 |
| U-Boot SPL + DDR 부팅 | 1~2주 | "U-Boot SPL"이 시리얼에 출력 |
| U-Boot proper + ethernet | 1주 | TFTP로 커널 적재 가능 |
| Kernel + 디바이스 트리 | 2~3주 | `login:` 프롬프트 |
| 모든 peripheral 안정화 | 2~4주 | Wi-Fi/카메라/모든 센서 동작 |
| Buildroot/Yocto 통합 | 1~2주 | 한 명령으로 SD 이미지 생성 |
| 자동화·factory provisioning | 1~2주 | 공장에서 1대당 N분 |

표의 기간은 특정 프로젝트의 실측치나 보편적인 납기 기준이 아닙니다. 일정은 SoC familiarity, 자료 접근, DDR·전원 설계, 부품 차이와 검증 범위에 따라 달라지므로 각 단계의 산출물과 위험을 기준으로 프로젝트별로 추정합니다.

## 흔한 오해와 함정

### "Vendor reference BSP를 그대로 쓰면 된다"

부분적으로 맞습니다. SoC 벤더의 reference BSP는 *그들의 EVK*에 맞춰져 있습니다. 우리 보드의 DDR, PMIC, 외부 칩이 다르면 *반드시* 수정이 필요합니다. 재사용 가능한 비율은 보드의 부품·전원·메모리·배선 차이와 vendor tree에 따라 달라집니다. 고정 비율로 계획하지 말고 각 변경점을 schematic 및 SoC 자료와 대조합니다.

### "BSP는 한 번만 만들면 끝"

매우 자주 빗나갑니다. 보드 rev가 올라갈 때마다 BSP가 따라갑니다. PMIC가 빠지거나 PHY가 바뀌면 DT가 바뀝니다. 새 SoC stepping이 나오면 errata workaround가 들어옵니다. BSP는 *제품 수명 내내 살아 있는* 코드입니다.

### "메인라인 Linux 커널이면 다 된다"

메인라인 지원은 vendor 이름만으로 순위를 정하기보다 대상 SoC와 개별 peripheral의 현재 DTS, driver, binding, maintenance 상태를 확인해야 합니다. 제품 요구사항에 맞춰 mainline 또는 vendor tree를 선택하고, 차이와 update plan을 기록합니다.

## 시리즈 로드맵

이후 챕터의 흐름은 다음과 같습니다.

- **Ch 2**: SoC 데이터시트를 *어디부터* 읽어야 하는가.
- **Ch 3**: 디바이스 트리 설계. SoC dtsi 상속과 보드 dts 작성.
- **Ch 4**: pin mux와 clock — 가장 보드-특화된 초기화.
- **Ch 5**: DDR 매개변수 — vendor tool 사용법, 잘못된 값의 증상.
- **Ch 6**: U-Boot 보드 포팅 — defconfig부터 첫 시리얼 출력까지.
- **Ch 7**: TF-A와 TrustZone 통합 (ARMv8 보드).

이후 챕터들은 커널 포팅, peripheral 활성화, factory provisioning, OTA 흐름을 다룹니다.

## 자주 하는 실수

### `make defconfig`만 잘 되면 BSP가 끝났다고 착각

defconfig는 *컴파일이 통과*한다는 의미일 뿐입니다. `dmesg`에 *probe 실패*가 가득해도 컴파일은 통과합니다. *모든 peripheral이 probe 성공*하고 *기대한 기능이 동작*해야 BSP가 끝납니다.

### Vendor source tree를 *통째로* fork

처음에는 작동하지만 *6개월 뒤 메인라인 변경*을 받아오기 어렵습니다. *오버레이* 형태로 분기를 작게 유지하는 것이 장기적으로 유리합니다. Buildroot의 `BR2_EXTERNAL`이나 Yocto의 layer 구조가 그래서 중요합니다.

### 디바이스 트리를 *복사-수정*만으로 진행

`<soc>.dtsi`를 *include*하고 *필요한 노드만 override*하는 것이 올바른 흐름입니다. 통째로 복사하면 SoC 메인라인 업데이트를 *전혀* 받지 못합니다.

### 부트 체인의 *어느 단계가 죽었는지* 모르고 디버깅

SPL이 죽었는지, U-Boot proper가 죽었는지, 커널이 죽었는지 *시리얼 출력 한 줄*로 알 수 있는 *체크포인트*를 미리 알아 둡니다. SPL의 "U-Boot SPL 2024.04", U-Boot의 "U-Boot 2024.04", 커널의 "[ 0.000000] Booting Linux"가 가장 친숙한 마커입니다.

## 정리

- BSP는 *이 SoC + 이 보드 + 이 OS*가 부팅하기 위한 *모든 것*입니다. 부트로더, TF-A(ARMv8), 커널, 디바이스 트리, 빌드 통합이 핵심 다섯 컴포넌트입니다.
- 이 프로젝트에서 BSP 완료는 `login:`만이 아니라 요구한 부트 경로, 장치 기능, 보안·업데이트·복구 기준을 충족하는지로 정의합니다. 일부 장치는 `/dev`가 아닌 다른 kernel interface로 노출됩니다.
- BootROM → 초기 firmware → optional secure runtime → normal-world bootloader → Linux는 흔한 구성 예입니다. 단계와 역할은 architecture, SoC, vendor boot design에 따라 달라집니다.
- SoC가 결정하는 것은 `<soc>.dtsi`에, 보드가 결정하는 것은 `<board>.dts`에 들어갑니다. 보드별 차이의 원천을 분리해 두는 것이 BSP의 기본 구조입니다.
- 시리즈 메인 예시는 BeagleBone Black입니다. TF-A 관련 부분에서는 i.MX 8M·AM62x·BCM2711을 참조합니다.
- 신규 보드 일정은 자료·기존 port·검증 조건에 따라 달라져 단일 기간으로 일반화하지 않습니다.
- vendor reference BSP는 *시작점*입니다. 그대로 쓸 수 있는 경우는 거의 없습니다.

## 다음 편

[Ch 2 — SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)에서는 수천 페이지의 Reference Manual에서 BSP에 필요한 *네 개 챕터*가 어디인지, 어떻게 효율적으로 읽는지 다룹니다.

## 관련 항목

- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Buildroot Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — Linux Documentation: Device Tree Usage](https://www.kernel.org/doc/html/latest/devicetree/usage-model.html)
- [원문 — ARM Trusted Firmware-A](https://www.trustedfirmware.org/projects/tf-a/)
