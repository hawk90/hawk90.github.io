---
title: "DDR 매개변수 결정 — 보드별 Timing·Training 추출"
slug: "embedded/bsp/chapter05-ddr-params"
date: 2026-05-18T09:05:00
description: "DDR controller 설정값이 어디서 오는지 — vendor tool, SPD, 데이터시트 timing 표."
series: "BSP Development"
seriesOrder: 5
tags: [embedded, bsp, ddr, dram, timing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DDR 매개변수는 SPL 안의 C 배열 수백 줄과 PHY training firmware 네 개로 바뀌어 보드에 들어갑니다."** 이 장은 그 배열과 firmware가 U-Boot v2024.04 소스의 어디에 있고, SPL이 그것을 어떤 순서로 쓰며, 틀렸을 때 무엇이 찍히는지를 따라갑니다.

DDR이 초기화되기 전의 SPL은 DRAM 밖에서 돌아야 합니다. i.MX 8M Plus EVK의 `imx8mp_evk_defconfig`는 `CONFIG_SPL_TEXT_BASE=0x920000`, `CONFIG_SPL_STACK=0x960000`이고, `include/configs/imx8mp_evk.h`는 DRAM을 0x40000000부터 둡니다. SPL은 DRAM보다 훨씬 아래의 SoC 내부 메모리에 올라가 있습니다. DRAM을 깨우는 일은 이 좁은 SRAM 안에서 끝나야 하고, 실패하면 U-Boot proper도 커널도 올라갈 곳이 없습니다.

## DDR이 *왜* 어려운가

SRAM은 주소를 주면 바로 읽히지만 DRAM은 그렇지 않습니다. 행(row)을 열고, 열(column)을 읽고, 다시 닫는 명령 사이마다 지켜야 할 최소 시간이 있고, 전하가 새는 셀을 주기적으로 다시 채워야(refresh) 합니다. 도서관 서고에 비유하면, 책장을 열고(activate) 책을 꺼내고(read) 책장을 닫는(precharge) 각 동작 사이에 정해진 대기 시간이 있는 셈입니다. 이 시간들이 timing 파라미터이고, 값은 DRAM 칩 datasheet와 JEDEC 표준이 정합니다.

게다가 DDR4·LPDDR4 속도에서는 보드 배선 길이 차이만으로도 신호 도착 시점이 어긋납니다. 그래서 controller 설정값만으로는 부족하고, 부팅할 때마다 PHY가 실제 신호를 보내 보며 샘플링 위치를 맞추는 *training*을 합니다.

## i.MX 8M Plus 보드들은 무엇을 쓰는가

U-Boot v2024.04에는 i.MX 8M Plus 보드 디렉터리가 10개 있고, DDR 설정 파일 이름은 모두 LPDDR4입니다.

| 보드 디렉터리 | DDR 파일 |
|---------------|----------|
| `freescale/imx8mp_evk` | `lpddr4_timing.c`, `imximage-8mp-lpddr4.cfg` |
| `dhelectronics/dh_imx8mp` | `lpddr4_timing_2G_32.c`, `lpddr4_timing_4G_32.c` |
| `advantech/imx8mp_rsb3720a1` | `lpddr4_timing_rsb3720a1_4G.c`, `lpddr4_timing_rsb3720a1_6G.c` |
| `toradex/verdin-imx8mp` | `lpddr4_timing.c` |
| 나머지 6개 (beacon, data_modul, engicam, msc, phytec, polyhex) | `lpddr4_timing*.c` |

같은 SoC여도 메모리 용량이 다르면 파일이 갈립니다. DH와 Advantech는 용량별로 timing 파일을 따로 둡니다. EVK 자신은 `imx8mp_evk.h`에서 `PHYS_SDRAM_SIZE 0xC0000000 /* 3 GB */`와 `PHYS_SDRAM_2_SIZE 0xC0000000 /* 3 GB */`, 합쳐 6 GB를 선언합니다.

## 핵심 timing 파라미터

DRAM datasheet의 timing 표에 나오는 주요 항목입니다.

| 약어 | 풀이름 | 의미 |
|------|-------|------|
| tRCD | Row to Column Delay | row activate 후 column read/write까지 |
| tRP | Row Precharge | precharge 명령 후 다음 activate까지 |
| tRC | Row Cycle | activate에서 다음 activate까지 |
| tRAS | Row Active | activate 후 precharge까지 최소 |
| tRRD | Row to Row Delay | 다른 bank의 activate 간격 |
| tWR | Write Recovery | write 후 precharge까지 |
| tWTR | Write to Read | write 후 read까지 |
| tRTP | Read to Precharge | read 후 precharge까지 |
| tFAW | Four Activate Window | 4개 activate를 묶는 시간 |
| tREFI | Refresh Interval | refresh 명령 사이 간격 |
| tRFC | Refresh Cycle | refresh 한 번에 걸리는 시간 |
| CL | CAS Latency | column 명령에서 데이터까지 클록 수 |
| WL | Write Latency | write 명령에서 데이터까지 |

datasheet는 이 값을 ns로 적고, controller 레지스터에는 클록 수로 들어갑니다. 환산은 단순한 산수입니다. 2400 MT/s라면 클록은 1200 MHz(양 edge 전송)이고 주기는 1/1200 MHz ≈ 0.833 ns입니다. datasheet의 최소 시간이 14.16 ns라면 14.16 / 0.833 ≈ 17.0이므로 17클록 이상을 씁니다. 한 클록이라도 짧게 반올림하면 spec 위반이므로 항상 올림합니다.

## SPD가 없는 임베디드

데스크톱 DIMM에는 timing을 담은 SPD EEPROM이 있어 펌웨어가 읽어 쓰지만, 보드에 BGA로 납땜한 LPDDR4에는 그런 칩이 없습니다. 그래서 timing은 소스 코드 안의 상수가 됩니다. DH의 i.MX 8M Plus SoM은 그 대신 보드의 strap 핀으로 용량을 읽어 표에서 timing을 고릅니다(`board/dhelectronics/dh_imx8mp/spl.c:110-137`).

```c
static struct dram_timing_info *dram_timing_info[8] = {
	NULL,					/* 512 MiB */
	NULL,					/* 1024 MiB */
	NULL,					/* 1536 MiB */
	&dh_imx8mp_dhcom_dram_timing_16g_x32,	/* 2048 MiB */
	NULL,					/* 3072 MiB */
	&dh_imx8mp_dhcom_dram_timing_32g_x32,	/* 4096 MiB */
	NULL,					/* 6144 MiB */
	NULL,					/* 8192 MiB */
};
```

strap 값이 표에서 NULL 칸을 가리키면 `"Unsupported DRAM strapping, trying lowest supported. MEMCFG=0x%x"`를 찍고 지원되는 가장 작은 설정을 찾습니다. 수동 SPD를 strap 3비트로 만든 셈입니다.

## 벤더 DDR 도구

NXP는 i.MX 8M 계열용 DDR Tool을 Config Tools for i.MX Applications Processors 안에 둡니다. 제품 페이지는 DDR Tool의 지원 대상으로 "i.MX 8M, i.MX91, i.MX93, i.MX95, i.MX943, i.MX93W and i.MX952 families"를 적습니다. 도구의 입력은 DRAM 부품의 timing과 보드 구성이고, 출력은 아래와 같은 레지스터 표입니다. 이 글은 도구를 실행하지 않았으므로 도구 화면이나 생성 파일 이름은 싣지 않고, U-Boot에 이미 들어간 결과물을 봅니다.

## DDR 설정 구조 — EVK의 실제 파일

`board/freescale/imx8mp_evk/lpddr4_timing.c`는 2,048줄이고 `{ 주소, 값 }` 쌍이 1,884개 들어 있습니다. 그중 DDR controller(DDRC) 표 `ddr_ddrc_cfg[]`가 167쌍입니다. 첫 몇 줄입니다.

```c
struct dram_cfg_param ddr_ddrc_cfg[] = {
	/** Initialize DDRC registers **/
	{ 0x3d400304, 0x1 },
	{ 0x3d400030, 0x1 },
	{ 0x3d400000, 0xa3080020 },
#ifdef CONFIG_IMX8M_LPDDR4_FREQ0_2400MTS
	{ 0x3d400020, 0x223 },
	{ 0x3d400024, 0x124f800 },
	{ 0x3d400064, 0x4900a8 },
	...
#else
	{ 0x3d400020, 0x1323 },
	{ 0x3d400024, 0x1e84800 },
	{ 0x3d400064, 0x7a017c },
```

`0x3d400064`(refresh timing 레지스터)의 값이 속도에 따라 `0x4900a8`과 `0x7a017c`로 갈립니다. 속도가 바뀌면 같은 ns가 다른 클록 수가 되기 때문입니다. 파일 끝의 `dram_timing` 구조체가 표들을 묶습니다.

```c
struct dram_timing_info dram_timing = {
	.ddrc_cfg = ddr_ddrc_cfg,
	.ddrc_cfg_num = ARRAY_SIZE(ddr_ddrc_cfg),
	.ddrphy_cfg = ddr_ddrphy_cfg,
	.ddrphy_cfg_num = ARRAY_SIZE(ddr_ddrphy_cfg),
	.fsp_msg = ddr_dram_fsp_msg,
	.fsp_msg_num = ARRAY_SIZE(ddr_dram_fsp_msg),
	.ddrphy_trained_csr = ddr_ddrphy_trained_csr,
	.ddrphy_trained_csr_num = ARRAY_SIZE(ddr_ddrphy_trained_csr),
	.ddrphy_pie = ddr_phy_pie,
	.ddrphy_pie_num = ARRAY_SIZE(ddr_phy_pie),
#ifdef CONFIG_IMX8M_LPDDR4_FREQ0_2400MTS
	.fsp_table = { 2400, 400, 100, },
#else
	.fsp_table = { 4000, 400, 100, },
#endif
};
```

`fsp_table`은 주파수 설정점(frequency set point) 세 개입니다. 기본은 4000 MT/s이고, Kconfig `IMX8M_LPDDR4_FREQ0_2400MTS`(`drivers/ddr/imx/imx8m/Kconfig:45`)를 켜면 첫 설정점이 2400 MT/s로 내려갑니다. 보드 신호 품질이 4000 MT/s를 못 버틸 때 쓰는 스위치입니다. `ddr_dram_fsp_msg[]`는 4000(1D), 400(1D), 100(1D), 4000(2D) 네 번의 training을 정의합니다.

## SPL이 DDR을 깨우는 순서

`board/freescale/imx8mp_evk/spl.c`의 `board_init_f()`가 `spl_dram_init()`을 부르고(145행), 이 함수는 `ddr_init(&dram_timing)` 한 줄입니다(35행). `drivers/ddr/imx/imx8m/ddr_init.c:314`의 `ddr_init()`은 `debug("DDRINFO: ...")` 메시지로 단계를 표시합니다.

1. DRAM PLL과 클록 설정 (`DDRINFO: cfg clk`)
2. DDRC 레지스터 표 쓰기 (`DDRINFO: ddrc config start` ~ `done`)
3. PHY 레지스터 표 쓰기와 training (`DDRINFO:ddrphy config start`, `ddr_cfg_phy()`)
4. PHY calibration 완료 대기 (`DDRINFO:ddrphy calibration done`)
5. DDRC를 정상 동작 모드로 전환 (`DDRINFO: ddrmix config done`)

이 메시지는 `debug()`라서 기본 빌드에서는 찍히지 않습니다. 해당 파일 맨 위에 `#define DEBUG`를 넣고 빌드하면 시리얼에서 어느 단계에서 멈췄는지 보입니다.

## PHY training과 firmware

3단계의 `ddr_cfg_phy()`(`drivers/ddr/imx/phy/ddrphy_train.c:12`)는 `fsp_msg` 배열을 하나씩 돌면서 PHY 클록을 그 속도로 맞추고, training firmware를 PHY 내부 메모리에 적재하고(`ddr_load_train_firmware()`), 메시지 블록을 쓴 뒤 PHY의 마이크로컨트롤러를 풀어 줍니다. 결과는 mailbox로 돌아옵니다(`ddrphy_utils.c:88-104`).

```c
int wait_ddrphy_training_complete(void)
{
	unsigned int mail;

	while (1) {
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
	}
}
```

성공은 `debug()`라 조용하고, 실패만 `printf()`로 `Training FAILED`를 찍습니다. 새 보드 SPL 로그에 이 한 줄이 보이면 DDR 표나 보드 신호 문제입니다.

firmware는 U-Boot 소스에 없습니다. `doc/board/nxp/imx8mp_evk.rst:26-48`은 NXP의 `firmware-imx-8.10.bin`을 받아 풀고 `firmware/ddr/synopsys/` 아래의 `lpddr4_pmu_train_1d_imem_202006.bin`, `_1d_dmem_`, `_2d_imem_`, `_2d_dmem_` 네 파일을 빌드 디렉터리에 복사하라고 적습니다. binman 설정 `arch/arm/dts/imx8mp-u-boot.dtsi:96-118`이 이 네 파일을 `blob-ext`로 SPL 뒤에 붙이고, `drivers/ddr/imx/phy/helper.c`가 binman 심볼로 그 위치를 찾아 적재합니다. 파일 이름의 `202006`이 firmware 판이므로, DDR 표를 만든 도구 버전과 이 firmware 판을 함께 기록합니다.

## 잘못된 설정은 어떻게 보이는가

U-Boot 소스가 직접 알려 주는 실패 신호는 두 가지입니다.

| 신호 | 출처 | 의미 |
|------|------|------|
| `Training FAILED` | `ddrphy_utils.c:101` | PHY training이 mailbox 0xff로 끝남 |
| `check ddr_pmu_train_imem code fail=%d` | `helper.c:133` | 적재한 training firmware를 다시 읽었을 때 불일치 |
| `Unsupported DRAM strapping, trying lowest supported.` | DH `spl.c:130` | strap이 가리키는 timing 표가 없음 |

training을 통과한 뒤의 marginal한 설정은 로그가 없습니다. 그래서 다음 절의 stress test로 찾습니다. 이 글에서는 i.MX 보드로 잘못된 timing을 재현하지 않았으므로 증상과 파라미터를 짝짓는 표는 싣지 않습니다.

## DDR stress test

U-Boot 단계에서는 `mtest`가 있습니다. `qemu_arm64_defconfig`에는 꺼져 있어서 `CMD_MEMTEST`를 켜고 v2024.04를 빌드해 QEMU virt(cortex-a57, 1 GiB)에서 돌렸습니다. 인자는 `cmd/mem.c:1418-1421`의 usage대로 `[start [end [pattern [iterations]]]]`입니다.

```text
=> meminfo
DRAM:  1 GiB
=> mtest 0x50000000 0x50100000 0 2
Testing 50000000 ... 50100000:
Iteration:      1Pattern 0000000000000000  Writing...            Reading...Iteration:      2Pattern FFFFFFFFFFFFFFFF  Writing...            Reading...
Tested 2 iteration(s) with 0 errors.
```

반복마다 패턴을 바꿔 쓰고 읽는 단순한 검사입니다. `CONFIG_SYS_MEMTEST_START`/`END`의 기본값은 0x0/0x1000이라, 인자 없이 부르면 4 KiB만 봅니다.

Linux가 뜬 뒤에는 `memtester`가 더 많은 패턴을 씁니다. Debian 13 QEMU guest(4 vCPU, 4 GB)에서 256 MB를 한 바퀴 돌린 결과입니다.

```text
$ memtester 256M 1
memtester version 4.7.1 (64-bit)
...
got  256MB (268435456 bytes), trying mlock ...locked.
Loop 1/1:
  Stuck Address       : ok
  Random Value        : ok
  Compare XOR         : ok
  ...
  Walking Ones        : ok
  Walking Zeroes      : ok
  8-bit Writes        : ok
  16-bit Writes       : ok

Done.
real	1m37.543s
```

256 MB 한 바퀴에 1분 37초가 걸렸습니다. 같은 속도라면 수 GB 보드를 여러 바퀴 돌리는 데는 시간 단위가 필요합니다. `stress-ng`는 메모리 부하에 검증을 섞습니다.

```text
$ stress-ng --vm 2 --vm-bytes 50% --verify --timeout 30s --metrics-brief
stress-ng: info:  [16665] vm: using 189.03M per stressor instance (total 378.07M of 754.54M available memory)
stress-ng: metrc: [16664] vm              8387791     30.08     57.01      3.08    278864.36      139588.06
stress-ng: info:  [16664] passed: 2: vm (2)
stress-ng: info:  [16664] failed: 0
```

`--vm-bytes 50%`는 전체 4 GB가 아니라 *그 순간 가용한* 754.54 MB의 절반으로 해석됐습니다. page cache가 차 있으면 생각보다 작은 영역만 검사하므로, 비율 대신 크기를 직접 주거나 `free`로 가용량을 먼저 봅니다. QEMU guest에는 `/sys/class/thermal/` 아래 zone이 없어 온도 조건 시험은 하지 않았습니다. 실제 보드에서는 고온 조건에서 같은 시험을 반복합니다.

## RAM size — DT와 부트로더

DT의 `memory` 노드가 커널이 쓸 DRAM 범위입니다. 그런데 이 값을 DTS에만 맡기지 않아도 됩니다. U-Boot v2024.04의 arm64 부팅 경로는 커널에 DT를 넘기기 직전 `arch_fixup_fdt()`(`arch/arm/lib/bootm-fdt.c:35-58`, `boot/image-fdt.c:605`에서 호출)에서 `fdt_fixup_memory_banks()`를 불러, U-Boot가 아는 DRAM bank(`bd->bi_dram[]`)로 `memory` 노드를 다시 씁니다.

U-Boot가 아는 크기는 `board_phys_sdram_size()`가 정합니다. i.MX 8M 공용 기본 구현(`arch/arm/mach-imx/imx8m/soc.c:226-236`)은 `PHYS_SDRAM_SIZE + PHYS_SDRAM_2_SIZE` 상수를 그대로 돌려주고, Verdin i.MX 8M Plus는 이를 덮어써 실제로 메모리를 써 보며 크기를 잽니다(`board/toradex/verdin-imx8mp/verdin-imx8mp.c:106-114`).

```c
int board_phys_sdram_size(phys_size_t *size)
{
	if (!size)
		return -EINVAL;

	*size = get_ram_size((void *)PHYS_SDRAM, PHYS_SDRAM_SIZE + PHYS_SDRAM_2_SIZE);

	return 0;
}
```

이렇게 하면 한 부트로더 이미지로 용량이 다른 변형을 지원합니다. QEMU에서도 같은 흐름이 보입니다. `-m 1G`로 띄운 U-Boot의 `bdinfo`는 `DRAM bank = 0x0`, `start = 0x40000000`, `size = 0x40000000`을 보여 줍니다.

## 자주 하는 실수

### EVK의 DDR 파일을 *그대로* 복사

EVK의 `lpddr4_timing.c`는 EVK의 6 GB LPDDR4 구성에 맞춘 값입니다. DH와 Advantech가 용량별로 파일을 따로 두는 것처럼, 우리 보드의 DRAM 부품과 용량으로 다시 만듭니다.

### DDR 칩의 *마킹*만 보고 가정

DRAM 패키지 윗면의 마킹은 전체 부품 번호를 줄인 코드인 경우가 있습니다. BOM의 전체 부품 번호로 datasheet를 받아 speed grade까지 확인합니다.

### PHY training firmware *판 불일치*

DDR 표와 training firmware는 짝입니다. U-Boot v2024.04 문서는 `firmware-imx-8.10`의 `_202006` 판을 씁니다. 다른 판을 쓰려면 DDR 도구 출력도 그 판에 맞춰 다시 만듭니다.

### Stress test 없이 *부팅만 되면 OK* 판정

training 통과는 `Training FAILED`가 안 찍혔다는 뜻일 뿐입니다. 위에서 본 것처럼 256 MB `memtester` 한 바퀴가 1분 37초였으므로, 보드 전체 용량을 여러 바퀴 도는 시험은 시간 단위로 계획합니다.

### `mtest`를 인자 없이 실행

`CONFIG_SYS_MEMTEST_START`/`END`가 기본값(0x0/0x1000)이면 4 KiB만 검사하고 끝납니다. 시작·끝 주소를 항상 명시합니다.

## 정리

- U-Boot v2024.04의 i.MX 8M Plus 보드 10개는 모두 LPDDR4 timing 파일을 쓰고, 용량이 다르면 파일이 갈립니다.
- EVK의 `lpddr4_timing.c`는 `{주소, 값}` 1,884쌍(DDRC 167쌍)과 `fsp_table = { 4000, 400, 100 }`을 담습니다.
- SPL의 `ddr_init()`이 DDRC 표 → PHY 표 → training → calibration 순으로 쓰고, 실패는 `Training FAILED`로만 보입니다.
- training firmware 네 개는 NXP `firmware-imx`에서 받아 binman이 SPL 뒤에 붙입니다.
- `mtest`·`memtester`·`stress-ng`로 검사하되, 범위(4 KiB 기본값, 가용 메모리 기준 %)를 확인합니다.
- 커널이 보는 메모리 크기는 U-Boot `arch_fixup_fdt()`가 `board_phys_sdram_size()` 결과로 DT를 고쳐 정합니다.

## 다음 편

[Ch 6 — U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)에서는 지금까지 다룬 *pin mux, clock, DDR*을 모두 통합해 *부트로더가 살아 움직이는* 단계까지 가는 흐름을 다룹니다.

## 관련 항목

- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [원문 — NXP DDR Tool](https://www.nxp.com/design/software/development-software/i-mx-developer-resources/i-mx-8m-family-ddr-tools-release:MX8M-DDR-TOOL-REL)
- [원문 — JEDEC DDR4 Standard JESD79-4](https://www.jedec.org/standards-documents/docs/jesd79-4)
- [원문 — memtester 도구](https://pyropus.ca/software/memtester/)
