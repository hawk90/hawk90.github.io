---
title: "DDR training 깊이 — PHY·컨트롤러·보드 파라미터 검증"
slug: "embedded/bootloader/chapter26-ddr-training"
date: 2026-05-19T09:26:00
description: "i.MX8MM과 U-Boot v2024.04로 DDR training firmware가 binman 심볼을 통해 PHY에 올라가는 경로, message block 주소, 타임아웃 없는 mailbox, training 결과가 컨트롤러 타이밍으로 돌아가는 과정을 실제 빌드와 소스로 추적합니다."
series: "Bootloader Internals"
seriesOrder: 26
tags: [embedded, bootloader, ddr, training, phy, lpddr4]
draft: false
topics: ["embedded"]
---

[Ch 9](/blog/embedded/bootloader/chapter09-dram-init)에서 i.MX8M Mini(이하 i.MX8MM) SPL의 `ddr_init()` 순서와 `lpddr4_timing.c` 표, training 루프의 큰 흐름을 봤습니다. 이 장은 그 루프 안으로 한 단계 더 들어갑니다. training firmware가 어떻게 PHY 안의 마이크로컨트롤러(PMU)까지 가는지, PMU와 SPL이 무엇을 주고받는지, training이 끝나면 그 결과가 어디로 가는지를 봅니다.

근거는 두 가지입니다. 하나는 U-Boot v2024.04 `drivers/ddr/imx/` 소스이고, 다른 하나는 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 만든 `imx8mm_evk_defconfig` 빌드 산출물입니다. 이 빌드에는 NXP의 training firmware가 들어 있지 않습니다(`BINMAN_ALLOW_MISSING=1`). 그 덕분에 firmware가 *없을 때* 이미지가 어떤 모양이 되는지도 직접 볼 수 있습니다. 실제 보드에서 training을 돌린 결과는 이 장에 없습니다.

## 한 줄 요약

binman은 SPL 바이너리 안의 `_binman_ddr_*` 심볼에 firmware 위치와 크기를 써 넣고, SPL은 그 값으로 IMEM 32 KiB·DMEM 16 KiB를 PHY에 복사합니다. 주파수별 입력은 DMEM `0x54000` 영역(message block)에 쓰고, PMU의 응답은 mailbox로 받는데 이 대기에는 타임아웃이 없습니다. training이 끝나면 message block의 결과로 컨트롤러 타이밍(LPDDR4에서는 `DRAMTMG2`·`RANKCTL`)을 고치고, PHY CSR 719개를 저장해 TF-A에 넘깁니다.

## firmware가 PHY까지 가는 길

DDR PHY 안의 PMU는 작은 전용 CPU입니다. 그런데 이 CPU는 자기 프로그램을 스스로 가져오지 못합니다. 이삿짐센터 직원이 짐 목록을 받아야 일을 시작하듯, SPL이 firmware를 PMU의 명령 메모리(IMEM)와 데이터 메모리(DMEM)에 직접 넣어 줘야 합니다. 그 일을 `drivers/ddr/imx/phy/helper.c:43`의 `ddr_load_train_firmware()`가 맡습니다.

```c
#define IMEM_LEN 32768 /* byte */
#define DMEM_LEN 16384 /* byte */
#define IMEM_2D_OFFSET	49152

#define IMEM_OFFSET_ADDR 0x00050000
#define DMEM_OFFSET_ADDR 0x00054000
```

IMEM은 32 KiB, DMEM은 16 KiB이고, PHY 주소 공간에서 각각 `0x50000`과 `0x54000`에 있습니다. 복사 루프는 SPL 메모리에서 32비트를 읽어 16비트씩 두 번 `writew()`로 PHY에 씁니다. PHY 레지스터 한 칸이 16비트라서 주소(`pr_to32`)도 1씩 늘어납니다.

### SPL은 firmware 위치를 어떻게 아나

firmware 파일은 SPL을 링크한 *뒤에* binman이 이미지 끝에 붙입니다. 그래서 SPL 코드는 컴파일할 때 firmware 주소를 알 수 없습니다. 해결책은 빈칸이 있는 양식입니다. SPL에 8바이트짜리 빈칸을 미리 만들어 두고, binman이 이미지를 다 조립한 뒤 빈칸에 실제 주소를 채웁니다. `helper.c`는 이렇게 선언합니다.

```c
binman_sym_declare(ulong, ddr_1d_imem_fw, image_pos);
binman_sym_declare(ulong, ddr_1d_imem_fw, size);
```

빌드한 SPL ELF에는 이 빈칸이 심볼로 남아 있습니다. `nm`으로 주소를 찾은 뒤, 같은 위치의 8바이트를 binman이 손대기 전(`spl/u-boot-spl.bin`)과 후(`u-boot-spl-ddr.bin`)로 나눠 읽었습니다.

| 심볼 | 패치 전 | 패치 후 |
|------|--------|--------|
| `_binman_ddr_1d_imem_fw_prop_image_pos` | `0x0` | `0x806418` |
| `_binman_ddr_1d_imem_fw_prop_size` | `0x0` | `0x0` |
| `_binman_ddr_2d_dmem_fw_prop_image_pos` | `0x0` | `0x806418` |
| `_binman_sym_magic` | `0x0` | `0x4d595342` |

magic 값 `0x4d595342`는 ASCII로 `BSYM`이고, `include/binman_sym.h:15`의 `BINMAN_SYM_MAGIC_VALUE`입니다. SPL은 `BINMAN_SYMS_OK`(같은 파일 95행)로 이 magic이 맞는지 확인한 뒤에만 심볼 값을 믿습니다. `image_pos` `0x806418`은 binman map의 firmware 자리와 일치합니다.

```text
ImagePos    Offset      Size  Name
00000000  00000000  00025418  u-boot-spl-ddr
00000000   00000000  00025417  u-boot-spl
00000000    00000000  00023410  u-boot-spl-nodtb
00023410    00023410  00002007  u-boot-spl-dtb
00025418   00025418  00000000  ddr-1d-imem-fw
00025418   00025418  00000000  ddr-1d-dmem-fw
00025418   00025418  00000000  ddr-2d-imem-fw
00025418   00025418  00000000  ddr-2d-dmem-fw
```

SPL 로드 주소 `0x7E1000` + 오프셋 `0x25418` = `0x806418`입니다. 네 firmware 슬롯이 모두 같은 위치에 크기 0으로 놓인 것은 파일이 없어서입니다. 정상 빌드라면 `lpddr4_pmu_train_1d_imem.bin` 같은 파일 크기만큼 슬롯이 차례로 늘어서고, `size` 심볼에 그 크기가 들어갑니다(`arch/arm/dts/imx8mm-u-boot.dtsi`의 각 노드는 `align-end = <4>`).

여기서 중요한 결론이 하나 나옵니다. **firmware를 빼먹고 빌드한 SPL은 크기 0을 그대로 믿습니다.** `ddr_load_train_firmware()`는 `BINMAN_SYMS_OK`가 참이면 `imem_len = binman_sym(..., size)`로 길이를 덮어쓰므로 복사 루프가 한 번도 돌지 않습니다. PMU는 IMEM에 아무것도 쓰지 않은 채 실행됩니다. 빌드 로그에 `Image 'u-boot-spl-ddr' is missing external blobs and is non-functional`이 찍혔다면 그 이미지를 보드에 올려서는 안 됩니다. binman 심볼이 없는 예전 방식(`BINMAN_SYMS_OK`가 거짓)에서는 `_end` 뒤 DTB 다음 위치를 firmware로 가정하는 fallback 코드가 대신 돕니다(같은 함수의 `CONFIG_SPL_OF_CONTROL` 블록).

### 1D firmware는 한 번만 올린다

`ddr_load_train_firmware()`에는 `static enum fw_type last_type`이 있어서, 직전과 같은 종류면 복사를 건너뜁니다("If FW doesn't change, we can save the loading."). i.MX8MM EVK의 `ddr_dram_fsp_msg[]`는 3000·400·100 MT/s 1D, 그다음 3000 MT/s 2D 순서입니다. 그래서 training은 네 번 돌지만 firmware 복사는 1D 한 번, 2D 한 번, 모두 두 번입니다. `IMEM_2D_OFFSET`(49,152 = 48 KiB)은 fallback 경로에서 2D firmware가 1D의 IMEM+DMEM 48 KiB 뒤에 있다고 가정하는 값입니다.

## message block — 주파수마다 바뀌는 입력

firmware가 프로그램이라면, message block은 그 프로그램에 주는 입력 양식입니다. 시험지는 같아도 수험번호와 과목 코드는 매번 다르게 적는 것과 같습니다. `ddr_cfg_phy()`(`drivers/ddr/imx/phy/ddrphy_train.c:12`)는 firmware를 올린 뒤 `fsp_msg->fsp_cfg` 표를 PHY에 씁니다. EVK의 3000 MT/s 1D 표 앞부분입니다.

```c
struct dram_cfg_param ddr_fsp0_cfg[] = {
	{ 0xd0000, 0x0 },
	{ 0x54003, 0xbb8 },
	{ 0x54004, 0x2 },
	{ 0x54005, 0x2228 },
	{ 0x54006, 0x11 },
	{ 0x54008, 0x131f },
```

주소가 `0x540xx`입니다. 앞에서 본 `DMEM_OFFSET_ADDR` `0x54000` 바로 위이므로, 이 표는 PMU의 데이터 메모리에 입력값을 채우는 것입니다. 34줄 중 32줄이 `0x540xx`이고 나머지 2줄은 `0xd0000` 같은 제어 레지스터입니다. 표 네 개를 비교하면 각 칸의 역할이 일부 보입니다.

| 표 | `0x54003` | `0x54008` |
|----|----------|----------|
| `ddr_fsp0_cfg` (1D) | `0xbb8` = 3000 | `0x131f` |
| `ddr_fsp1_cfg` (1D) | `0x190` = 400 | `0x121f` |
| `ddr_fsp2_cfg` (1D) | `0x64` = 100 | `0x121f` |
| `ddr_fsp0_2d_cfg` (2D) | `0xbb8` = 3000 | `0x61` |

`0x54003`은 `fsp_table = { 3000, 400, 100 }`과 정확히 같은 data rate입니다. 3000 MT/s의 1D와 2D 표를 `diff`하면 `0x54008` 값이 다르고 2D에 `0x5400f`·`0x54010` 두 줄이 더 있을 뿐, 나머지는 같습니다. 각 칸의 공식 이름과 비트 의미는 Synopsys PHY 문서에 있고 U-Boot 소스에는 없습니다. 그래서 이 글에서는 이름을 붙이지 않습니다. 이 표를 손으로 고치지 않고 NXP DDR tool로 다시 만드는 이유이기도 합니다(파일 머리 주석: "Generated code from MX8M_DDR_tool").

## mailbox — 기다림에 끝이 없다

PMU를 깨운 뒤 SPL은 결과를 기다립니다. 둘 사이의 대화는 교환 일기처럼 한 번에 한 메시지씩 오갑니다. `drivers/ddr/imx/phy/ddrphy_utils.c`의 함수들이 그 규칙을 구현합니다.

| 함수 | PHY 레지스터 | 하는 일 |
|------|------------|--------|
| `poll_pmu_message_ready()` | `0xd0004` bit 0 | 0이 될 때까지 반복해서 읽음 |
| `get_mail()` | `0xd0032` | 16비트 메시지 읽기 |
| `get_stream_message()` | `0xd0032`, `0xd0034` | 32비트(상위·하위 16비트) 읽기 |
| `ack_pmu_message_receive()` | `0xd0031`에 0 → `0xd0004` bit 0이 1이 될 때까지 대기 → `0xd0031`에 1 | 읽었다고 알림 |

메시지 판정은 `wait_ddrphy_training_complete()`(88행)에 있습니다.

```c
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
```

이 코드에서 디버깅에 중요한 사실 세 가지를 읽을 수 있습니다.

첫째, **성공은 조용합니다.** `Training PASS`는 `debug()`라서 `DEBUG`를 정의하지 않은 빌드에서는 찍히지 않습니다. 실패만 `printf`로 `Training FAILED`가 나옵니다.

둘째, **타임아웃이 없습니다.** `while (1)`도, 그 안의 `poll_pmu_message_ready()`의 `do ... while (reg & 0x1)`도 횟수나 시간 제한이 없습니다. PMU가 `0x07`도 `0xff`도 보내지 않으면 SPL은 그 자리에서 영원히 기다립니다. 앞 절처럼 firmware 없이 빌드한 이미지에서는 IMEM에 아무것도 쓰지 않은 채 실행된 PMU가 무엇을 보낼지 코드로 알 수 없습니다. 확실한 것은 PMU가 `0x07`이나 `0xff`를 보내기 전까지 SPL이 **아무것도 출력하지 않고** 이 루프에 머문다는 점입니다. 실제 보드에서 확인한 것은 아니고, 위 두 루프를 읽은 결론입니다. "SPL 배너 다음에 아무것도 안 나온다"는 증상에서 DDR training 대기를 의심해야 하는 이유입니다.

셋째, **`0x08` 스트리밍 메시지는 숫자로만 나옵니다.** `decode_streaming_message()`는 문자열 인덱스와 인자를 `debug("PMU String index = 0x%08x\n", ...)`로 찍을 뿐 사람이 읽는 문장으로 바꾸지 않습니다. 인덱스를 문장으로 바꾸는 표는 U-Boot 소스에 없으므로, 이 값을 해석하려면 PHY firmware와 함께 배포되는 자료가 필요합니다.

`ddrphy_init_read_msg_block()`(176행)은 v2024.04에서 빈 함수입니다. 이름과 달리 message block 결과를 읽어 출력하지 않습니다.

## training 결과가 컨트롤러로 돌아간다

training의 목적은 PHY 안 지연값만 맞추는 데 그치지 않습니다. 결과 일부는 메모리 컨트롤러의 타이밍 설정으로 되돌아갑니다. 1D training이 끝날 때마다 `ddr_cfg_phy()`는 `get_trained_CDD(i)`를 부릅니다(`drivers/ddr/imx/imx8m/ddr_init.c:162`).

```c
	ddr_type = reg32_read(DDRC_MSTR(0)) & 0x3f;
	if (ddr_type == 0x20) {
		for (i = 0; i < 6; i++) {
			tmp = reg32_read(IP2APB_DDRPHY_IPS_BASE_ADDR(0) + (0x54013 + i) * 4);
			cdd_cha[i * 2] = tmp & 0xff;
			cdd_cha[i * 2 + 1] = (tmp >> 8) & 0xff;
		}
```

입력을 썼던 그 DMEM 영역(`0x54013`부터, 채널 B는 `0x5402c`부터)에서 이번에는 결과를 읽습니다. `ddr_type == 0x20`은 LPDDR4 분기이고, DDR4 분기는 `0x54012`부터 29워드(58개 값)를 읽습니다. 읽은 값은 read→read, read→write, write→read, write→write 네 묶음으로 나눠 묶음별 최댓값을 `g_cdd_rr_max[]`, `g_cdd_rw_max[]`, `g_cdd_wr_max[]`, `g_cdd_ww_max[]`에 주파수별로 저장합니다.

이 값을 쓰는 곳이 `update_umctl2_rank_space_setting()`(221행)이고, `ddr_init()`이 PHY 설정 뒤에 `update_umctl2_rank_space_setting(dram_timing->fsp_msg_num - 1)`로 부릅니다(414행). LPDDR4 분기(`ddr_type == 0x20`)에서 이 함수는 `DDRC_DRAMTMG2`의 write→read(`& 0x3f`)·read→write(`>> 8`) 간격에 CDD 최댓값의 절반에 1을 더한 값(`(max >> 1) + 1`, i.MX8MP만 `+1` 없음)을 더하고, 6비트 필드 한계인 `0x3f`에서 자릅니다. `DDRC_RANKCTL`의 `wr_gap`(비트 11:8)과 `rd_gap`(비트 7:4)에도 write→write, read→read 최댓값으로 같은 계산을 하고 4비트 한계 `0xf`에서 자릅니다. `DDRC_DRAMTMG9`를 고치는 것은 DDR4 분기뿐입니다. 공장에서 정한 신호등 주기(`lpddr4_timing.c`의 컨트롤러 표)를 실제로 측정한 교통량(training 결과)에 맞춰 늘리는 셈입니다. 그래서 이 레지스터들의 최종값은 `lpddr4_timing.c`에 적힌 값이 아니라, 그 부팅에서 나온 training 결과에 따라 정해집니다.

## 저장해서 TF-A에 넘긴다

PHY 설정의 마지막 단계는 `ddrphy_trained_csr_save()`(`helper.c:160`)입니다. `drivers/ddr/imx/phy/ddrphy_csr.c`의 `ddrphy_trained_csr[]` 목록에 있는 PHY 레지스터 **719개**를 하나씩 `dwc_ddrphy_apb_rd()`로 읽어 값 칸을 채웁니다. `dram_config_save()`도 이 전역 목록을 저장합니다(`helper.c:211-216`). 보드 파일 `lpddr4_timing.c:331`에도 같은 719개짜리 `ddr_ddrphy_trained_csr[]`가 값 `0x0`으로 있고 `dram_timing.ddrphy_trained_csr`에 연결돼 있지만, 이 저장 경로는 그 표를 읽지 않습니다.

그다음 `ddr_init()` 끝의 `dram_config_save()`가 표 전체를 `CONFIG_SAVED_DRAM_TIMING_BASE`로 복사합니다. 빌드한 `.config`에서 이 값은 `0x180000`이고, U-Boot i.MX8M MMU 맵(`arch/arm/mach-imx/imx8m/soc.c`)에서 `OCRAM_S`(32 KiB)가 시작하는 주소입니다. TF-A v2.15.0의 i.MX8MM 포트는 같은 주소를 `SAVED_DRAM_TIMING_BASE = OCRAM_S_BASE`로 정하고(`plat/imx/imx8m/imx8mm/include/platform_def.h:173`), `imx8mm_bl31_setup.c:247`에서 `dram_info_init(SAVED_DRAM_TIMING_BASE)`로 읽어 갑니다. i.MX8MM에서는 `plat/imx/imx8m/ddr/dram.c:240`이 `dram_info.timing_info`를 그 주소에 바로 연결해, OCRAM_S의 표를 제자리에서 씁니다. 같은 파일의 `dram_timing_saved[13 * 1024]`로 복사하는 코드는 `#if defined(PLAT_imx8mq)` 안에 있어 i.MX8MQ에만 해당합니다. 그래서 TF-A는 Linux가 DDR 주파수를 바꾸거나 저전력에서 돌아올 때 training을 다시 돌리지 않고 이 값을 씁니다. [Ch 9](/blog/embedded/bootloader/chapter09-dram-init)에서 본 것처럼, SPL 쪽 표를 바꾸면 런타임 동작도 같이 바뀝니다.

## 실패를 조사하는 순서

위 코드에서 증상별로 확인할 곳을 거꾸로 정리할 수 있습니다.

| 증상 | 먼저 볼 곳 |
|------|----------|
| SPL 배너 뒤 아무 출력 없이 멈춤 | firmware 누락 여부(빌드 로그의 `missing external blobs`, binman map의 firmware 크기), mailbox 무한 대기 |
| `Training FAILED` 출력 | 그 주파수의 message block 표, DRAM 부품과 `lpddr4_timing.c` 생성 조건 일치 여부 |
| `check ddr_pmu_train_imem code fail=` 출력 | IMEM 복사 후 읽기 검증 실패(`helper.c`), firmware 파일 손상이나 PHY 접근 문제 |
| 부팅은 되지만 간헐 오류 | training 결과 의존 레지스터(LPDDR4는 `DRAMTMG2`·`RANKCTL`), 온도·전압 조건 |

가장 먼저 할 일은 출력이 없는 상태를 없애는 것입니다. `ddrphy_utils.c`와 `ddr_init.c` 맨 위에 `#define DEBUG`를 넣고 SPL을 다시 빌드하면 `DDRINFO: start DRAM init`부터 `[PMU Major message = 0x%08x]`, `Training PASS`까지 단계별 `debug()` 출력이 살아납니다. 소스를 고치지 않고 `make ... CFLAGS_ddrphy_utils.o=-DDEBUG CFLAGS_ddr_init.o=-DDEBUG spl/u-boot-spl`처럼 두 파일에만 DEBUG를 줄 수도 있습니다. 이렇게 빌드해 보니 `size`의 text 열(코드+rodata)이 115,537 B에서 116,032 B로 495 B 늘었고(`.text` 섹션만 보면 97,160 B → 97,352 B), 바이너리에 `DDRINFO: start DRAM init`, `[PMU Major message = 0x%08x]`, `Training PASS` 문자열이 들어갔습니다. [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 잰 코드·데이터 여유 15,344 B 안에 넉넉히 들어갑니다. 파일 전체에 DEBUG를 켜면 이야기가 달라지므로, 범위는 이렇게 좁혀 둡니다.

## 정리

- binman은 SPL 안의 `_binman_ddr_*_prop_image_pos/size` 심볼에 firmware 위치를 써 넣고, magic `BSYM`(`0x4d595342`)으로 유효함을 표시합니다. 이 빌드에서는 위치 `0x806418`, 크기 0이었습니다.
- firmware가 빠진 빌드는 크기 0을 믿고 아무것도 복사하지 않습니다. `missing external blobs` 경고가 있는 이미지는 보드에 올리지 않습니다.
- PMU 입력(message block)은 DMEM `0x54000` 영역에 쓰며, `0x54003`이 data rate(3000/400/100)와 일치합니다. 1D firmware는 세 주파수에 한 번만 올립니다.
- mailbox는 `0x07` PASS, `0xff` FAIL이고, PASS는 `debug()`라 기본 빌드에서 보이지 않습니다. 대기 루프에 타임아웃이 없어서, PMU가 응답하지 않으면 SPL은 아무 출력 없이 멈춥니다.
- LPDDR4에서 1D training 결과(CDD)는 `DDRC_DRAMTMG2`·`RANKCTL`의 rank 간 간격에 더해집니다(`DRAMTMG9`는 DDR4 분기만).
- training 뒤 PHY CSR 719개를 읽어 OCRAM_S `0x180000`에 저장하고, TF-A가 DVFS·저전력 복귀에 다시 씁니다.

## 다음 장 예고

다음 편은 **Ch 27: 신뢰 체인(Chain of Trust)**입니다. [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)의 HAB, [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)의 TF-A, U-Boot FIT 서명이 하나의 체인으로 이어지는 조건을 봅니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — `ddr_init()` 전체 순서와 QEMU `mtest`
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — SPL 크기 제한과 메모리 배치
- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee) — 저장된 DRAM 표를 읽는 BL31
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [U-Boot v2024.04 — drivers/ddr/imx/phy](https://github.com/u-boot/u-boot/tree/v2024.04/drivers/ddr/imx/phy) — training firmware 적재·mailbox 소스
- [NXP i.MX8/MSCALE DDR Tool Release](https://community.nxp.com/t5/i-MX-Processors-Knowledge-Base/i-MX-8-8X-Family-DDR-Tools-Release/ta-p/1121519) — `lpddr4_timing.c` 생성 도구
