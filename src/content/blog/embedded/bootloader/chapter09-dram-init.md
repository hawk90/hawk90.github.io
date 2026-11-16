---
title: "DDR Controller 프로그래밍과 PHY Training — SPL의 가장 어려운 작업"
slug: "embedded/bootloader/chapter09-dram-init"
date: 2026-05-09T09:09:00
description: "DDR controller와 PHY 초기화의 역할, training 개념, 보드별 파라미터 검증 경로를 설명합니다."
series: "Bootloader Internals"
seriesOrder: 9
tags: [embedded, bootloader, u-boot, ddr, dram]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 실제 SoC에서 DRAM 초기화는 **SPL이 controller register를 채우고, PHY 안의 작은 마이크로컨트롤러에 training firmware를 올려 돌린 뒤, 결과를 mailbox로 받는 일**입니다. 보드마다 다른 값은 거의 전부 공급업체 도구가 만든 표 하나에 들어 있고, U-Boot 코드는 그 표를 정해진 순서로 써 넣습니다.

이 글은 U-Boot **v2024.04**의 i.MX8M Mini EVK 코드(`board/freescale/imx8mm_evk/`, `drivers/ddr/imx/`)를 실제 예로 따라갑니다. i.MX8M 계열은 Synopsys DesignWare의 uMCTL2 controller와 DDR PHY를 쓰기 때문에, 같은 IP를 쓰는 다른 SoC를 읽을 때도 구조가 비슷하게 보입니다. 마지막에는 컨트롤러가 없는 QEMU `virt`의 `dram_init()`을 실제로 돌려 대비해 봅니다.

## 어디서, 언제 실행되는가

[8장](/blog/embedded/bootloader/chapter08-board-init)에서 U-Boot proper는 DRAM이 준비된 뒤에야 relocation한다고 했습니다. 그러면 DRAM을 준비하는 코드는 그보다 앞, DRAM 없이 돌 수 있는 단계에 있어야 합니다. i.MX8MM EVK에서는 그 자리가 SPL의 `board_init_f()`입니다.

```c
/* board/freescale/imx8mm_evk/spl.c (v2024.04), board_init_f() 일부 */
preloader_console_init();   /* UART 먼저: 이후 실패를 볼 수 있게 */
enable_tzc380();
power_init_board();         /* PMIC: VDD_DRAM을 0.95 V로 (3000 MT/s용) */
spl_dram_init();            /* = ddr_init(&dram_timing); */
```

순서에 의미가 있습니다. UART를 가장 먼저 켜야 DRAM 초기화 중 실패 메시지를 볼 수 있고, PMIC 설정이 DRAM보다 앞서야 DRAM에 맞는 전압이 들어갑니다. 새 보드에서 "아무 출력 없이 멈춘다"면 이 네 줄 중 어디까지 왔는지부터 좁힙니다.

## Controller와 PHY — 두 개의 다른 일꾼

비유하면 controller는 **물류센터의 배차 담당**이고, PHY는 **실제 도로와 신호등**입니다. 배차 담당(uMCTL2)은 CPU의 읽기·쓰기 요청을 DRAM 명령(activate, read, write, refresh)으로 바꾸고 순서를 정합니다. 도로(PHY)는 그 명령을 수백 MHz~GHz의 전기 신호로 보내고 받는데, 보드 배선 길이가 신호마다 조금씩 다르므로 "이 신호는 몇 ps 늦게 샘플링하라" 같은 보정을 해야 합니다. 이 보정이 training입니다.

코드도 둘을 다른 함수로 씁니다.

| 대상 | v2024.04 함수 | 쓰는 방법 |
| --- | --- | --- |
| uMCTL2 controller | `ddr_cfg_umctl2()` (`drivers/ddr/imx/imx8m/ddr_init.c`) | `reg32_write(reg, val)`로 표의 값을 순서대로 씀 |
| DDR PHY | `ddr_cfg_phy()` (`drivers/ddr/imx/phy/ddrphy_train.c`) | `dwc_ddrphy_apb_wr(reg, val)`로 PHY 내부 register와 firmware 입력을 씀 |

## 보드별 값은 표 하나에 있다

i.MX8MM EVK의 보드별 값은 전부 `board/freescale/imx8mm_evk/lpddr4_timing.c`에 있고, 파일 머리에 "Generated code from MX8M_DDR_tool"이라고 적혀 있습니다. 공급업체 도구에 DRAM 부품과 보드 정보를 넣으면 이 C 파일이 나오고, U-Boot 코드는 이 표를 해석하지 않고 그대로 써 넣습니다. 그래서 다른 메모리 부품으로 바꿀 때 고치는 곳은 드라이버가 아니라 이 파일입니다.

표의 구조는 `struct dram_timing_info`(`arch/arm/include/asm/arch-imx8m/ddr.h`)가 정합니다.

| 필드 | 무엇이 들어 있나 | 누가 쓰나 |
| --- | --- | --- |
| `ddrc_cfg` | controller register 주소·값 쌍 | `ddr_cfg_umctl2()` |
| `ddrphy_cfg` | PHY 초기 register 주소·값 쌍 | `ddr_cfg_phy()` 첫 루프 |
| `fsp_msg` | 주파수 setpoint별 training 입력(message block) | `ddr_cfg_phy()` training 루프 |
| `ddrphy_pie` | training 뒤 PHY Init Engine에 올릴 값 | `ddr_cfg_phy()` 마지막 루프 |
| `ddrphy_trained_csr` | 저전력 복귀용 PHY register 목록(보드 표) | imx8m 경로에서는 읽지 않음. 실제로 저장되는 목록은 드라이버의 `drivers/ddr/imx/phy/ddrphy_csr.c` 전역 배열(`ddrphy_trained_csr_save()`, `dram_config_save()`) |
| `fsp_table` | 사용할 data rate(MT/s) 목록 | 주파수 전환 |

EVK 표의 `fsp_table`은 `{ 3000, 400, 100 }`이고, `fsp_msg`에는 3000·400·100 MT/s 각각의 1D training과 3000 MT/s의 2D training, 모두 네 항목이 있습니다. 즉 이 보드는 부팅할 때 training을 네 번 돌립니다.

![부품 데이터시트·SoC 문서·보드 회로·공급업체 설정에서 보드별 DRAM 설정을 만들고, 이를 전원·clock 안정화부터 메모리 사용 준비까지 초기화에 포함될 수 있는 단계에 적용한 뒤 검증하는 흐름](/images/blog/bootloader/diagrams/ch09-ddr-init-flow.svg)

그림은 이 표가 어디서 오고 어떤 단계에 쓰이는지를 일반화한 것입니다. 위 표에서 본 i.MX8MM의 실제 단계는 바로 아래 절에 있습니다.

## `ddr_init()`의 실제 순서

`ddr_init()`(`drivers/ddr/imx/imx8m/ddr_init.c`)은 주석에 Step 번호를 달아 두었습니다. 줄이면 다음과 같습니다.

1. DDR 블록 reset과 clock 설정(`SRC_DDRC_RCR`, `ddrphy_init_set_dfi_clk()`).
2. `ddr_cfg_umctl2()`로 controller 표를 씁니다. 이때는 controller가 아직 DRAM에 아무 명령도 보내지 않는 상태입니다.
3. 저전력·refresh를 잠시 끄고(`PWRCTL`, `RFSHCTL3`), `SWCTL.sw_done`을 1로 쓴 뒤 `SWSTAT.sw_done_ack`을 기다립니다. uMCTL2의 일부 register는 이 "쓰기 허가 → 확인" 절차 안에서만 바뀝니다.
4. `ddr_cfg_phy()`로 PHY 설정과 training을 합니다(다음 절).
5. `DDRPHY_CalBusy`가 0이 될 때까지 기다립니다.
6. `DFIMISC.dfi_init_start`를 세우고 `DFISTAT.dfi_init_complete`를 기다립니다. controller와 PHY 사이의 표준 인터페이스(DFI)로 "이제 준비됐다"를 주고받는 단계입니다.
7. `STAT.operating_mode`가 normal(1)이 될 때까지 기다리고, refresh를 다시 켜고, port 0을 엽니다(`PCTRL_0`).
8. `board_dram_ecc_scrub()`을 부르고, self-refresh를 켜고, `dram_config_save()`로 표를 저장합니다.

눈에 띄는 점은 **기다리는 루프에 timeout이 없다**는 것입니다. `do { ... } while ((tmp & 0x1) == 0x0);` 형태라서 하드웨어가 응답하지 않으면 그 자리에서 영원히 멈춥니다. 출력 없이 멈춘 보드를 JTAG으로 붙였을 때 PC가 이 루프 중 하나에 있다면, 어느 Step에서 멈췄는지가 바로 원인 범위가 됩니다.

## PHY training 안에서 일어나는 일

`ddr_cfg_phy()`는 `fsp_msg`의 항목마다 같은 일을 반복합니다. 흥미로운 점은 training을 CPU가 직접 하지 않는다는 것입니다. PHY 안에는 PMU라는 작은 마이크로컨트롤러가 있고, U-Boot는 거기에 firmware를 올려 돌린 뒤 결과만 받습니다. 학원에 시험지(message block)와 채점 프로그램(firmware)을 맡기고 점수표만 돌려받는 셈입니다.

1. `ddrphy_init_set_dfi_clk(drate)` — 이번 setpoint의 주파수로 clock을 맞춥니다.
2. `ddr_load_train_firmware(fw_type)` — 1D 또는 2D training firmware를 PHY 메모리에 복사합니다.
3. message block(`fsp_cfg`)을 씁니다. 이 setpoint의 DRAM 설정과 training 옵션이 들어 있습니다.
4. `0xd0099`에 값을 써서 PMU를 reset에서 풀고 실행시킵니다.
5. `wait_ddrphy_training_complete()`로 mailbox를 읽으며 기다립니다.
6. 끝나면 PMU를 멈추고 message block 결과를 읽습니다. 1D 결과에서는 `get_trained_CDD()`가 message block에서 rank·방향(read/write) 조합별 CDD 값의 최대값을 뽑아 두고, `ddr_init()`이 뒤에서 부르는 `update_umctl2_rank_space_setting()`이 이 값을 바탕으로 controller의 `DRAMTMG2` read↔write 전환 간격과 `RANKCTL`의 rank 간 간격을 늘립니다(계산은 [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training)). training 결과가 PHY 안에만 머물지 않고 controller timing까지 바꾸는 지점입니다.

firmware 파일은 U-Boot 소스에 없습니다. `doc/board/nxp/imx8mm_evk.rst`는 NXP의 `firmware-imx-8.9.bin`을 받아 `lpddr4*.bin`을 빌드 디렉터리에 복사하라고 안내하고, `arch/arm/dts/imx8mm-u-boot.dtsi`의 binman 설정이 `lpddr4_pmu_train_1d_imem.bin`, `_1d_dmem.bin`, `_2d_imem.bin`, `_2d_dmem.bin` 네 파일을 SPL 뒤에 붙입니다. `ddr_load_train_firmware()`는 binman이 SPL 안에 써 넣은 심볼로 이 이미지의 위치와 크기를 찾고, 그 심볼이 없을 때만 `_end`(와 DTB) 뒤를 가정합니다. 이 파일을 빼먹으면 binman이 `Image 'u-boot-spl-ddr' is missing external blobs and is non-functional`로 빌드를 실패시키고, `BINMAN_ALLOW_MISSING=1`로 강제하면 firmware 크기가 0인 이미지가 나와 아무것도 올리지 않습니다. 자세한 측정은 [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training)에 있습니다.

mailbox 판정은 짧습니다.

```c
/* drivers/ddr/imx/phy/ddrphy_utils.c (v2024.04), wait_ddrphy_training_complete() 일부 */
mail = get_mail();
decode_major_message(mail);
if (mail == 0x08) {
	decode_streaming_message();
} else if (mail == 0x07) {
	debug("Training PASS\n");
	return 0;
} else if (mail == 0xff) {
	printf("Training FAILED\n");
	return -1;
}
```

여기서 실무에 바로 쓰이는 차이가 하나 있습니다. 실패 메시지는 `printf`라서 항상 나오지만, 진행 상황(`DDRINFO: ...`, `DRAM PHY training for 3000MTS`, `Training PASS`)은 전부 `debug()`입니다. U-Boot의 `debug()`는 그 파일에 `DEBUG`가 정의되어야 출력되므로(`include/log.h`), 기본 빌드에서는 성공해도 아무 말이 없습니다. bring-up 중에는 `ddr_init.c`, `ddrphy_train.c`, 그리고 `Training PASS`를 찍는 `ddrphy_utils.c` 맨 위에 `#define DEBUG`를 넣고 빌드해 어느 setpoint까지 통과하는지 보는 것이 가장 빠른 첫 단계입니다.

## ECC와 저전력 복귀

`ddr_init()`의 끝에서 부르는 `board_dram_ecc_scrub()`은 기본 구현이 비어 있는 weak 함수입니다. inline ECC를 켠 보드만 이 함수를 다시 정의합니다. 예를 들어 `board/freescale/imx8mp_evk/lpddr4_timing.c`는 `ddrc_inline_ecc_scrub(start, end)`를 여러 구간에 대해 호출합니다. ECC가 있는 메모리는 한 번도 쓰지 않은 영역을 읽으면 ECC 오류가 나므로, 쓰기 전에 전부 한 번 채워 두는 단계가 필요합니다.

`dram_config_save()`는 표 전체를 `CONFIG_SAVED_DRAM_TIMING_BASE` 위치에 복사합니다. 이 표를 읽는 쪽은 U-Boot가 아니라 TF-A입니다. TF-A의 `plat/imx/imx8m/imx8mm/include/platform_def.h`는 같은 주소를 `SAVED_DRAM_TIMING_BASE = OCRAM_S_BASE`로 정의하고, BL31 setup이 `dram_info_init(SAVED_DRAM_TIMING_BASE)`로 표를 가져가 DRAM 주파수 전환(`dram_dvfs_handler()` → `lpddr4_swffc()`)에 씁니다. 그래서 U-Boot 쪽 표를 바꾸면 Linux가 런타임에 주파수를 바꿀 때의 동작도 함께 바뀝니다.

## QEMU와 비교 — 컨트롤러가 없는 `dram_init()`

같은 v2024.04를 QEMU `virt`용으로 빌드하면 DRAM 초기화가 어떻게 생겼을까요. `board/emulation/qemu-arm/qemu-arm.c`의 `dram_init()`은 다음이 전부입니다.

```c
int dram_init(void)
{
	if (fdtdec_setup_mem_size_base() != 0)
		return -EINVAL;

	return 0;
}
```

register를 하나도 쓰지 않고, device tree의 `memory` 노드에서 시작 주소와 크기만 읽습니다. QEMU는 이미 사용할 수 있는 RAM을 주고 그 정보를 DT에 담아 넘기기 때문입니다. `qemu_arm64_defconfig`에 `CONFIG_CMD_MEMTEST`를 켜고 빌드해(`aarch64-elf-gcc` 16.2.0) QEMU 11.1.3에서 `-m 1G`로 실행한 결과입니다.

```text
=> fdt addr ${fdtcontroladdr}
Working FDT set to 7e595d90
=> fdt print /memory@40000000
memory@40000000 {
	reg = <0x00000000 0x40000000 0x00000000 0x40000000>;
	device_type = "memory";
};
=> mtest 0x40000000 0x40100000 0 2
Testing 40000000 ... 40100000:
Iteration:      1Pattern 0000000000000000  Writing...            Reading...Iteration:      2Pattern FFFFFFFFFFFFFFFF  Writing...            Reading...
Tested 2 iteration(s) with 0 errors.
```

`reg`의 두 64-bit 값이 시작 `0x40000000`과 크기 `0x40000000`(1 GiB)이고, 이것이 [8장](/blog/embedded/bootloader/chapter08-board-init)의 `bdinfo`에 나온 DRAM bank 값과 같습니다.

`mtest`는 `CONFIG_SYS_ALT_MEMTEST`가 꺼져 있으면 `cmd/mem.c`의 `mem_test_quick()`을 씁니다. 각 word에 시작 pattern에서 1씩 증가하는 값을 쓰고 다시 읽어 비교하며, 짝수 번째(2·4…번째) 반복마다 pattern을 뒤집고 감소 방향으로 씁니다. 출력의 `0000…` 다음 `FFFF…`가 그 뒤집기입니다. word마다 값이 다르므로, 주소선 하나가 붙어서 두 주소가 같은 칸을 가리키면 나중에 쓴 값이 앞의 값을 덮어써 불일치로 드러납니다. 반대로 한 번 통과했다고 training margin이 충분하다는 뜻은 아닙니다. QEMU에서는 RAM이 host 메모리라 이 결과는 명령이 동작한다는 확인일 뿐입니다.

`mtest`에서 자주 하는 실수도 하나 있습니다. 네 번째 인자(iterations)는 `strict_strtoul(argv[4], 16, ...)`로 읽으므로 **16진수**입니다. `mtest ... 0 10`은 10번이 아니라 16번을 돕니다. 그리고 범위를 U-Boot 자신이 relocation된 영역(8장의 `relocaddr` 근처)까지 넓히면 실행 중인 코드를 덮어쓰므로, 실제 보드에서는 `bdinfo`로 예약 영역을 먼저 확인한 뒤 그 아래만 시험합니다.

## 정리

- i.MX8MM EVK(v2024.04)에서 DRAM 초기화는 SPL `board_init_f()`가 UART·PMIC 다음에 부르는 `ddr_init(&dram_timing)`입니다.
- controller(uMCTL2)는 `ddr_cfg_umctl2()`, PHY는 `ddr_cfg_phy()`가 각각 표의 값을 씁니다.
- 보드별 값은 공급업체 도구가 생성한 `lpddr4_timing.c` 하나에 있고, EVK는 3000/400/100 MT/s 1D와 3000 MT/s 2D, 모두 네 번 training합니다.
- training은 PHY 안의 PMU가 firmware로 수행하고, mailbox `0x07`이 PASS, `0xff`가 FAIL입니다. firmware 파일은 NXP 패키지에서 받아 binman이 SPL 뒤에 붙입니다.
- 진행 로그는 `debug()`라 기본 빌드에서는 안 보입니다. bring-up 중에는 `#define DEBUG`로 켭니다.
- 대기 루프에 timeout이 없으므로, 멈춘 위치(PC)가 곧 실패한 Step입니다.
- QEMU `virt`의 `dram_init()`은 DT `memory` 노드만 읽으며, `mtest` 통과는 training 품질을 증명하지 않습니다.

## 다음 장 예고

다음 글에서는 DRAM이 준비된 뒤 다음 이미지를 어디서 읽어 오는지, 곧 eMMC·SD·SATA·NAND·SPI Flash에서의 스토리지 부트를 살펴봅니다.

## 관련 항목

- [Ch 8: 보드 초기화](/blog/embedded/bootloader/chapter08-board-init) — `board_init_f`와 초기화 흐름
- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 부트 매체와 이미지 로딩
- [Ch 24: SPL 내부 구조](/blog/embedded/bootloader/chapter24-spl-deep) — SPL 흐름
- [Ch 26: DDR PHY training 심화](/blog/embedded/bootloader/chapter26-ddr-training) — target 근거 확인이 필요한 세부 주제
- [BSP Ch 5: DDR 파라미터](/blog/embedded/bsp/chapter05-ddr-params) — 보드 bring-up 관점
