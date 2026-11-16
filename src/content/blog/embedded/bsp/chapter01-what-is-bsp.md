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

> **"BSP는 이 SoC와 보드에서 선택한 운영체제를 제품 요구사항에 맞게 시작·운영하기 위한 기반입니다."** 이 시리즈는 그중 부트로더·커널·디바이스 트리·이미지 빌드를 다룹니다.

Linux 커널 문서 `Documentation/devicetree/usage-model.rst`는 Devicetree를 "운영체제가 읽을 수 있는 하드웨어 기술"이라고 정의하고, 그 목적을 "운영체제가 기계의 세부 사항을 하드코딩하지 않아도 되게 하는 것"이라고 적습니다. 커널 이미지는 보드를 모르고, 보드가 무엇인지는 커널 밖에서 들어와야 한다는 뜻입니다.

같은 i.MX 8M Plus SoC라 해도 *NXP의 EVK 보드*와 *우리 회사의 카메라 보드*는 DDR 칩, 핀 멀티플렉싱, 부트 미디어, 외부 칩 구성이 다릅니다. 운영체제는 이 정보를 *어딘가에서 받아야* 부팅합니다. 그 "어딘가"의 묶음이 BSP입니다.

## BSP의 느슨한 정의

BSP라는 말에는 표준 정의가 없습니다. 그래서 추상적인 정의보다 *실제로 존재하는 BSP 하나*를 펼쳐 보는 편이 빠릅니다. Buildroot 2024.02의 `configs/beaglebone_defconfig`는 BeagleBone Black 한 장을 부팅시키는 데 필요한 결정을 53줄(빈 줄 포함)에 모아 둔 파일입니다. 핵심 줄만 옮기면 다음과 같습니다.

```ini
BR2_cortex_a8=y
BR2_LINUX_KERNEL_CUSTOM_TARBALL_LOCATION="$(call github,beagleboard,linux,6.1.46-ti-r13)/linux-6.1.46-ti-r13.tar.gz"
BR2_LINUX_KERNEL_DEFCONFIG="bb.org"
BR2_LINUX_KERNEL_INTREE_DTS_NAME="am335x-evm am335x-bone am335x-boneblack am335x-bonegreen am335x-evmsk am335x-boneblue am335x-boneblack-wireless am335x-bonegreen-wireless"
BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2023.10"
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="am335x_evm"
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO"
BR2_ROOTFS_POST_SCRIPT_ARGS="-c board/beaglebone/genimage.cfg"
```

이 아홉 줄이 BSP의 뼈대를 그대로 보여 줍니다. CPU 코어(`cortex_a8`), 커널 소스와 그 defconfig(BeagleBoard 재단의 vendor tree `6.1.46-ti-r13`과 `bb.org`), 빌드할 디바이스 트리 목록, U-Boot 버전과 보드 defconfig, SPL 산출물 이름(`MLO`), 그리고 SD 카드 이미지 배치(`genimage.cfg`)입니다. 같은 저장소의 `board/beaglebone/` 디렉터리에는 `genimage.cfg`, `uEnv.txt`, `extlinux.conf`, `post-build.sh`, `patches/`, `rootfs_overlay/`가 들어 있습니다.

이 시리즈에서는 *Linux 기반 임베디드 시스템*을 기준으로 다음 다섯 가지를 BSP에 포함시킵니다.

1. **부트로더** — U-Boot 포트. SPL/BL2 단계, DDR 초기화, 부트 미디어 선택, 부트 명령 환경.
2. **TF-A (Armv8 보드)** — BL31 같은 EL3 단계와 PSCI 같은 secure-monitor 서비스. BeagleBone Black(ARMv7)에는 이 단계가 없고, i.MX 8M Plus에는 있습니다(TF-A v2.15.0 `plat/imx/imx8m/imx8mp/`).
3. **Linux 커널** — 보드 패치, defconfig 분기, in-tree 또는 out-of-tree 드라이버.
4. **디바이스 트리** — `<soc>.dtsi` + `<board>.dts` + overlay.
5. **빌드 시스템 통합** — Buildroot defconfig, Yocto layer, 또는 둘 다.

factory provisioning(eFuse, MAC 주소, serial number 관리)과 OTA는 이 시리즈 후반(Ch 18, Ch 20)에서 BSP 통합 범위로 다룹니다.

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

부트 체인은 전원이 들어온 뒤 Linux가 뜰 때까지 *누가 누구를 적재하는가*의 순서입니다. 이어달리기 바통처럼 각 단계는 다음 단계를 메모리에 올리고 점프하는 것으로 일을 끝냅니다. 아래 표는 이 시리즈의 두 예시 보드에서 단계가 어떻게 놓이는지 보여 줍니다.

| 단계 | 책임 | BeagleBone Black (AM335x) | i.MX 8M Plus EVK |
|------|------|---------------------------|------------------|
| BootROM | SoC 내 고정 firmware. boot 핀·fuse로 부트 소스를 고르고 다음 단계를 적재 | ROM이 SD/eMMC에서 `MLO` 적재 | ROM이 SPL이 든 `flash.bin` 적재 |
| SPL | DDR 초기화, 다음 단계 적재 | U-Boot SPL (`MLO`) | U-Boot SPL |
| BL31 | EL3 runtime firmware, PSCI 서비스 | 없음 (ARMv7) | TF-A BL31 |
| BL33 | normal-world 부트로더. 부트 환경, 사용자 입력, 커널 적재 | U-Boot proper (`u-boot.img`) | U-Boot proper |
| Linux Kernel | DT 파싱, 드라이버 probe, init 실행 | `zImage` + `am335x-boneblack.dtb` | `Image` + `imx8mp-evk.dtb` |

BeagleBone Black 열의 파일 이름은 Buildroot `board/beaglebone/genimage.cfg`가 boot 파티션에 넣는 파일(`MLO`, `u-boot.img`, `zImage`, `am335x-boneblack.dtb`, `uEnv.txt`)에서 가져왔습니다. 같은 i.MX 8M 계열인 8M Mini에서 SPL이 BL31과 U-Boot를 어디에 두는지는 [Bootloader 시리즈 Ch 4](/blog/embedded/bootloader/chapter04-boot-stages)에서 FIT 이미지와 부팅 로그로 분해했습니다. i.MX 8M Plus 열의 `flash.bin`은 U-Boot v2024.04 `doc/board/nxp/imx8mp_evk.rst`의 빌드 절차가 SD 카드 32 KiB 오프셋에 쓰는 이미지입니다. RISC-V에서는 OpenSBI가 machine-mode runtime firmware를 맡지만 Arm BL31과 같은 구성요소는 아닙니다.

BSP 작업은 이 *각 단계의 책임*을 자기 보드에 맞게 채우는 것입니다.

## 보드별로 달라지는 것 — 차이의 원천

같은 SoC를 쓰는 두 보드의 차이를 파악하면 schematic과 software tree에서 확인할 작업이 좁혀집니다. 집에 비유하면 SoC는 아파트 평면도이고, 보드는 그 집에 실제로 들인 가구와 배선입니다. 평면도는 같은 단지 모든 집이 공유하지만 가구 배치는 집마다 다릅니다.

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

이 경계가 실제 파일에서 어떻게 보이는지는 Linux v6.12의 `arch/arm/boot/dts/ti/omap/am335x-boneblack.dts`가 잘 보여 줍니다. 이 파일은 SoC dtsi 위에 보드 계열 공통 파일을 층층이 쌓습니다.

```c
#include "am33xx.dtsi"
#include "am335x-bone-common.dtsi"
#include "am335x-boneblack-common.dtsi"
#include "am335x-boneblack-hdmi.dtsi"
```

`am33xx.dtsi`에는 `cpu@0`의 `compatible = "arm,cortex-a8"`처럼 SoC가 정한 사실이 있습니다. 반면 DDR 크기는 보드가 정합니다. `am335x-bone-common.dtsi`는 원래 BeagleBone에 맞춰 `memory@80000000`을 `reg = <0x80000000 0x10000000>; /* 256 MB */`로 적고, `am335x-boneblack-common.dtsi`가 같은 노드를 `0x20000000`(512 MB)으로 덮어씁니다. 같은 파일에는 PMIC(`tps@24`, I2C0 주소 0x24)와 Ethernet PHY(`ethernet-phy@0`) 같은 보드 부품도 있습니다. 실제로 dtc로 컴파일해 보면 덮어쓴 값이 남습니다.

```text
$ fdtget -t x am335x-boneblack.dtb /memory@80000000 reg
80000000 20000000
$ fdtget am335x-boneblack.dtb / model
TI AM335x BeagleBone Black
```

(Linux v6.12 소스를 `clang -E -x assembler-with-cpp -I include`로 전처리한 뒤 dtc 1.8.1로 컴파일했습니다.) `<soc>.dtsi`는 *SoC 벤더와 커널 커뮤니티*가 유지하고, `<board>.dts`는 *BSP 엔지니어가* 작성합니다.

## 시리즈에서 다룰 보드 — BeagleBone Black

이론은 추상적이고 실전은 구체적입니다. 시리즈에서는 *한 보드*를 메인 예시로 쓰고, Armv8 쪽은 다른 SoC 자료로 비교합니다.

**BeagleBone Black**을 고른 이유는 다음과 같습니다.

- AM335x SoC, Cortex-A8 기반 ARMv7입니다. *BL31이 없어* 부트 체인이 단순합니다.
- 설계 자료가 공개되어 있습니다. BeagleBoard.org 문서의 License Terms는 BeagleBone Black 설계를 Creative Commons Attribution-ShareAlike 4.0으로 배포한다고 적고, 회로도(PDF·OrCAD), PCB Gerber, BOM을 목록으로 듭니다.
- Buildroot에 `beaglebone_defconfig`가 있고, U-Boot v2024.04에는 `board/ti/am335x/`와 `am335x_evm_defconfig`가, Linux v6.12에는 `am335x-boneblack.dts`가 있습니다. 세 프로젝트의 메인라인 코드를 나란히 놓고 비교할 수 있습니다.
- 시리얼 콘솔은 J1 헤더에서 잡습니다. BeagleBoard.org System Reference Manual의 J1 Serial Header 표는 1번 GND, 4번 RX, 5번 TX를 적고, 신호 레벨은 3.3V입니다.

ARMv8 예시(TF-A 포함)는 **NXP i.MX 8M Plus**(Cortex-A53, Linux `imx8mp.dtsi`)입니다. 데이터시트 읽기(Ch 2), 디바이스 트리(Ch 3), pinmux(Ch 4), U-Boot 포팅(Ch 6), TF-A 통합(Ch 7)에서 i.MX 8M Plus EVK 자료가 등장합니다.

## BSP를 시작하기 *전에* 확보할 것

새 보드를 받기 전 다음 자료가 있는지 확인합니다. 요리를 시작하기 전에 재료를 꺼내 두는 것과 같습니다. 회로도가 없으면 어떤 UART가 콘솔인지부터 추측해야 하고, DDR 칩 datasheet가 없으면 Ch 5의 타이밍 값을 채울 수 없습니다.

**필수**

- [ ] SoC Reference Manual
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

- [ ] Oscilloscope
- [ ] Bus pirate 또는 Glasgow (저속 prototyping)
- [ ] TFTP 서버 (개발 PC에 dnsmasq)

JTAG 디버거를 필수 목록에 넣지 않은 이유는 대체 경로가 있기 때문입니다. U-Boot v2024.04 `doc/imx/misc/sdp.txt`는 i.MX ROM의 Serial Downloader(SDP)가 USB와 UART로 프로그램 이미지를 칩에 내려받는 프로토콜이라고 설명하고, 이를 쓰면 "JTAG 디버거 없이" U-Boot를 설치할 수 있다고 적습니다. 같은 i.MX 8M 계열 보드 문서(`doc/board/bsh/imx8mn_bsh_smm_s2.rst:56-61`)는 보드를 USB serial downloader 모드로 켜고 `uuu -v flash.bin`으로 올리는 절차를 보여 줍니다. SPL이 시리얼에 한 줄이라도 찍으면 그 뒤는 printf 디버깅이 됩니다.

## BSP 작업의 단계와 완료 기준

BSP 일정은 기간이 아니라 *단계마다 무엇이 보이면 다음으로 넘어가는가*로 잡습니다. 이 글에는 측정한 프로젝트 기간이 없으므로 기간 칸을 두지 않았습니다. 대신 각 단계의 완료 신호를 적었습니다.

| 단계 | 핵심 산출물 | 완료 신호 |
|------|-----------|-----------|
| 데이터시트 읽기, 회로도 분석 | pin mux 표, clock 트리, DDR 사양 | 보드의 모든 핀이 표에 기능과 함께 적힘 |
| U-Boot SPL + DDR 부팅 | SPL 이미지 | 시리얼에 `U-Boot SPL <버전>` 배너 |
| U-Boot proper + ethernet | U-Boot 이미지 | TFTP로 커널 적재 |
| Kernel + 디바이스 트리 | 보드 dts, 커널 config | `login:` 프롬프트 |
| peripheral 안정화 | 드라이버·DT 노드 | 요구 장치가 모두 probe되고 기능 테스트 통과 |
| Buildroot/Yocto 통합 | defconfig 또는 layer | 한 명령으로 SD 이미지 생성 |
| 자동화·factory provisioning | 공장 스크립트 | 1대 provisioning이 사람 개입 없이 끝남 |

## 흔한 오해와 함정

### "Vendor reference BSP를 그대로 쓰면 된다"

부분적으로 맞습니다. SoC 벤더의 reference BSP는 *그들의 EVK*에 맞춰져 있습니다. U-Boot v2024.04의 `board/freescale/imx8mp_evk/`에는 EVK의 DDR 칩에 맞춘 `lpddr4_timing.c`가 들어 있습니다. 우리 보드의 DDR 칩이 다르면 이 파일부터 다시 만들어야 하고(Ch 5), PMIC나 외부 칩이 다르면 해당 DT 노드와 드라이버 설정을 고쳐야 합니다. 변경점은 schematic을 EVK schematic과 한 줄씩 대조해 목록으로 만듭니다.

### "BSP는 한 번만 만들면 끝"

빗나갑니다. 보드 rev가 올라갈 때마다 BSP가 따라갑니다. PMIC가 빠지거나 PHY가 바뀌면 DT가 바뀝니다. `am335x-bone-common.dtsi`의 `ethernet-phy@0` 노드에는 "Support GPIO reset on revision C3 boards"라는 주석과 함께 `reset-gpios`가 붙어 있습니다. 보드 rev 하나가 DT 한 줄로 남은 사례입니다. 새 SoC stepping이 나오면 errata workaround가 들어옵니다. BSP는 *제품 수명 내내 살아 있는* 코드입니다.

### "메인라인 Linux 커널이면 다 된다"

Buildroot의 BeagleBone defconfig가 반례입니다. 메인라인 커널에 `am335x-boneblack.dts`가 있는데도 이 defconfig는 BeagleBoard 재단의 vendor tree(`beagleboard/linux` `6.1.46-ti-r13`)와 그 defconfig `bb.org`를 받아 옵니다. 메인라인 지원 여부는 SoC 단위가 아니라 peripheral 단위로 갈립니다. 그래서 요구 장치마다 메인라인 DTS·드라이버·binding이 있는지 표로 만들고, 그 표를 근거로 mainline과 vendor tree 중 하나를 고릅니다.

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

처음에는 작동하지만 나중에 메인라인 변경을 받아오려면 fork 전체를 rebase해야 합니다. *오버레이* 형태로 분기를 작게 유지하는 것이 장기적으로 유리합니다. Buildroot의 `BR2_EXTERNAL`이나 Yocto의 layer 구조가 그래서 중요합니다.

### 디바이스 트리를 *복사-수정*만으로 진행

`<soc>.dtsi`를 *include*하고 *필요한 노드만 override*하는 것이 올바른 흐름입니다. 통째로 복사하면 SoC 메인라인 업데이트를 *전혀* 받지 못합니다.

### 부트 체인의 *어느 단계가 죽었는지* 모르고 디버깅

SPL이 죽었는지, U-Boot proper가 죽었는지, 커널이 죽었는지 *시리얼 출력 한 줄*로 알 수 있는 *체크포인트*를 미리 알아 둡니다. 각 마커는 소스에 문자열로 박혀 있습니다.

| 단계 | 마커 | 출처 |
|------|------|------|
| SPL | `U-Boot SPL 2024.04 (날짜 - 시각 ...)` | U-Boot v2024.04 `common/spl/spl.c:836`, `"\nU-Boot " SPL_TPL_NAME " " PLAIN_VERSION` |
| U-Boot proper | `U-Boot 2024.04 (날짜 - 시각 ...)` | `common/version.c:11`, `U_BOOT_VERSION_STRING` |
| Linux (ARMv7) | `Booting Linux on physical CPU 0x0` | Linux v6.12 `arch/arm/kernel/setup.c:613` |
| Linux (arm64) | `Booting Linux on physical CPU 0x0000000000 [0x...]` | `arch/arm64/kernel/setup.c:94` |

## 정리

- BSP는 *이 SoC + 이 보드 + 이 OS*가 부팅하기 위한 *모든 것*입니다. 부트로더, TF-A(ARMv8), 커널, 디바이스 트리, 빌드 통합이 핵심 다섯 컴포넌트입니다.
- 이 프로젝트에서 BSP 완료는 `login:`만이 아니라 요구한 부트 경로, 장치 기능, 보안·업데이트·복구 기준을 충족하는지로 정의합니다. 일부 장치는 `/dev`가 아닌 다른 kernel interface로 노출됩니다.
- BeagleBone Black은 BootROM → SPL(`MLO`) → U-Boot → Linux, i.MX 8M Plus는 그 사이에 TF-A BL31이 더 들어갑니다.
- SoC가 결정하는 것은 `<soc>.dtsi`에, 보드가 결정하는 것은 `<board>.dts`에 들어갑니다. 보드별 차이의 원천을 분리해 두는 것이 BSP의 기본 구조입니다.
- 시리즈 메인 예시는 BeagleBone Black입니다. TF-A 관련 부분에서는 i.MX 8M Plus를 참조합니다.
- BSP 일정은 기간이 아니라 단계별 완료 신호(SPL 배너, TFTP, `login:`, probe)로 관리합니다.
- vendor reference BSP는 EVK 기준의 *시작점*입니다. DDR 타이밍 파일처럼 EVK 부품에 묶인 부분은 다시 만들어야 합니다.

## 다음 편

[Ch 2 — SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)에서는 수천 페이지의 Reference Manual에서 BSP에 필요한 *네 개 챕터*가 어디인지, 어떻게 효율적으로 읽는지 다룹니다.

## 관련 항목

- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Buildroot Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — Linux Documentation: Device Tree Usage](https://www.kernel.org/doc/html/latest/devicetree/usage-model.html)
- [원문 — ARM Trusted Firmware-A](https://www.trustedfirmware.org/projects/tf-a/)
