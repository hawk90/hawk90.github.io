---
title: "Ch 5: DDR 매개변수 — 보드별 timing"
date: 2026-05-09T05:00:00
description: "DDR controller 설정값이 어디서 오는지 — vendor tool, SPD, 데이터시트 timing 표."
series: "BSP Development"
seriesOrder: 5
tags: [embedded, bsp, ddr, dram, timing]
draft: false
---

## 한 줄 요약

> **"DDR 매개변수가 *살짝* 틀리면 *드물게* crash합니다."** — 가장 무서운 버그 유형이고, BSP에서 *가장 시간이 많이 드는* 단계입니다. Vendor tool 없이 손으로 적는 사람은 없습니다.

CPU가 *맞는* clock으로 동작해도, peripheral mux가 *맞아*도, DDR이 *살짝* 어긋나면 시스템은 *대부분의 시간 동작하다가* 갑자기 무너집니다. 부팅이 잘 되는데 빌드 한 시간 뒤 segfault가 납니다. 메모리 dump를 떠 보면 *한 바이트만* 틀려 있습니다. 이게 *DDR timing*의 전형적 증상입니다.

## DDR이 *왜* 어려운가

SRAM과 다릅니다. DDR은 *수십 개의 timing 파라미터*가 모두 *데이터시트 spec 안*에 들어와야 동작합니다. 그것도 *온도 변화에 따라*. 너무 조여서도 안 되고, 너무 느슨해서도 안 됩니다.

| 측면 | 영향 |
|------|------|
| 너무 빠른 timing | 비트가 가끔 깨짐. 압축·해시·암호화에서 발견. |
| 너무 느린 timing | 동작은 하나 성능 하락. spec 위반은 *아닐 수도 있음*. |
| ZQ calibration 누락 | DRAM이 *온도 drift* 후 misread. 1시간 뒤 행. |
| Refresh interval 잘못 | 데이터 *조용히 사라짐*. 가장 미묘. |
| 임피던스 mismatch | EMI 증가, FCC 인증 실패. 보드 layout 문제. |

이 중 *대부분*을 BSP가 *부트로더 단계*에서 설정합니다. 부트로더의 첫 단계인 SPL/BL2가 *DDR을 깨우는 코드*입니다. DDR이 깨지 않으면 그 뒤 *어떤 것도* 동작할 수 없습니다.

## DDR3 / DDR4 / LPDDR4 — 임베디드에서의 선택

| 종류 | 전압 | 데이터 rate | 용도 |
|------|------|-----------|------|
| DDR3 | 1.5V (또는 1.35V DDR3L) | 800~1866 MT/s | 산업용, 저가, 구세대 |
| DDR4 | 1.2V | 1600~3200 MT/s | 일반 임베디드, 서버 |
| LPDDR3 | 1.2V | 800~2133 MT/s | 모바일, 저전력 |
| LPDDR4 | 1.1V | 1600~4266 MT/s | 모바일·임베디드 보드 |
| LPDDR4X | 0.6V I/O | 동상 | 더 낮은 전력 |
| LPDDR5 | 1.05V | 4266~6400 MT/s | 최신 스마트폰·서버 |
| DDR5 | 1.1V | 4800~8400 MT/s | 새 데스크톱·서버 |

임베디드 보드는 *DDR4 또는 LPDDR4*가 가장 흔합니다. 산업용은 *DDR3*가 아직 살아 있습니다. 자동차 ADAS와 mobile은 *LPDDR4/5*입니다.

같은 SoC라도 *DDR 종류와 width*가 보드마다 다릅니다. i.MX 8M Plus는 *DDR4 32-bit* 또는 *LPDDR4 32-bit*를 지원하고, RK3588은 *LPDDR4/4X/5*를 모두 지원합니다.

## 핵심 timing 파라미터

JEDEC 표준이 정의하는 주요 timing입니다.

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
| tREFI | Refresh Interval | refresh 명령 사이 간격 (보통 7.8us) |
| tRFC | Refresh Cycle | refresh 한 번에 걸리는 시간 |
| CL | CAS Latency | column 명령에서 데이터까지 클록 수 |
| WL | Write Latency | write 명령에서 데이터까지 |

대부분 *ns 단위*로 데이터시트에 적혀 있습니다. 이걸 *클록 주기*로 환산한 값이 DDR controller에 들어갑니다.

```text
DDR4-2400, CL = 17 의미:
   data rate 2400 MT/s
   클록 = 1200 MHz (DDR은 양 edge에서 transfer)
   클록 주기 = 1/1200MHz = 0.833 ns
   CL = 17 cycles ≈ 14.17 ns
   tRCD ≈ 14.17 ns → 17 cycles
```

이 환산을 *손으로 하면* 거의 항상 한 cycle씩 어긋납니다. *vendor tool*이 해야 합니다.

## SPD vs SPD-less

DDR memory에는 *Serial Presence Detect (SPD)*라는 작은 EEPROM이 *옵션으로* 붙습니다. 메모리 module이 *자기 timing 정보*를 그 안에 담고 있습니다.

데스크톱·서버는 DIMM에 SPD가 *반드시* 있습니다. BIOS가 부팅 시 *I2C로 SPD를 읽어* timing을 자동 설정합니다.

임베디드는 다릅니다. *DRAM 칩이 보드에 직접 납땜*되어 있고 (BGA), *SPD가 없는* 경우가 대부분입니다. BSP가 *DDR 칩의 datasheet를 읽고* timing을 *손으로* 설정합니다.

```text
[SPD 있음 — 데스크톱]
   BIOS → I2C로 SPD 읽기 → DDR controller에 자동 적용

[SPD 없음 — 임베디드]
   BSP 엔지니어 → DDR datasheet → Vendor DDR Tool → SPL/BL2 코드
```

vendor의 *DDR config tool*이 *datasheet 값을 입력*받아 *SoC의 controller 레지스터 값*을 생성합니다.

## 벤더 DDR 도구

다음이 SoC 벤더의 *공식 DDR 도구*입니다. 거의 모든 SoC가 자기 도구를 가집니다.

| 벤더 | 도구 |
|------|------|
| NXP | DDR Tool (Windows) — i.MX 8M, 8M Plus, 6, 7 등 |
| TI | DDR Config GUI — AM62x, AM64x, K3 family |
| Rockchip | rkbin-tools + Excel 표 — RK3588, RK3399 |
| ST | STM32CubeMX DDR Tuning — STM32MP1 |
| Qualcomm | LPDDR Tool — Snapdragon family |
| Allwinner | dram_para_gen + uboot driver |

NXP DDR Tool의 흐름은 다음과 같습니다.

```text
[입력]
   DRAM 칩 모델 선택 (Micron MT40A1G16TB-062E 등)
      → JEDEC SPD 라이브러리에서 timing 자동 로드
   DDR rate 선택 (예: 2400 MT/s)
   Bus width, 칩 개수, rank 설정
   보드 layout 정보 (CK to DQS skew 등)

[중간 단계]
   DDR controller register set 생성
   PHY training script 생성
   stress test pattern 정의

[출력]
   ddr_init.c — C 함수, SPL에 link
   ddr_data.c — 레지스터 값 array
   timing.h   — 매크로 정의
```

이 출력을 그대로 U-Boot 또는 TF-A에 *include*합니다.

## NXP DDR Tool 출력 예시

i.MX 8M Plus + Micron LPDDR4 2GB의 출력 일부입니다.

```c
/* ddr_init.c — NXP DDR Tool 생성 */

#include "ddr.h"

static struct dram_cfg_param ddr_ddrc_cfg[] = {
    { 0x3d400000, 0x81040020 },  /* DDRC_MSTR */
    { 0x3d400064, 0x006180e },   /* DDRC_RFSHTMG */
    { 0x3d4000d0, 0x40020083 },  /* DDRC_INIT0 */
    { 0x3d4000d4, 0x00350000 },  /* DDRC_INIT1 */
    { 0x3d4000dc, 0xd4002d70 },  /* DDRC_INIT3 */
    { 0x3d4000e0, 0x00310008 },  /* DDRC_INIT4 */
    { 0x3d400100, 0x1a203522 },  /* DDRC_DRAMTMG0 */
    { 0x3d400104, 0x00060630 },  /* DDRC_DRAMTMG1 */
    { 0x3d400108, 0x070e1214 },  /* DDRC_DRAMTMG2 */
    /* ... 200+ entries */
};

static struct dram_cfg_param ddr_ddrphy_cfg[] = {
    { 0x100a0, 0x4 },
    { 0x100a1, 0x5 },
    { 0x100a2, 0x6 },
    /* ... */
};

static struct dram_fsp_msg ddr_fsp_msg[] = {
    {
        .drate = 4000,
        .fw_type = FW_1D_IMAGE,
        .fsp_cfg = ddr_fsp0_cfg,
        .fsp_cfg_num = ARRAY_SIZE(ddr_fsp0_cfg),
    },
    /* freq 1: 400 MT/s for low-power */
    /* freq 2: 100 MT/s for deep sleep */
};

struct dram_timing_info dram_timing = {
    .ddrc_cfg = ddr_ddrc_cfg,
    .ddrc_cfg_num = ARRAY_SIZE(ddr_ddrc_cfg),
    .ddrphy_cfg = ddr_ddrphy_cfg,
    .ddrphy_cfg_num = ARRAY_SIZE(ddr_ddrphy_cfg),
    .fsp_msg = ddr_fsp_msg,
    .fsp_msg_num = ARRAY_SIZE(ddr_fsp_msg),
    .ddrphy_trained_csr = ddr_ddrphy_trained_csr,
    .ddrphy_pie = ddr_phy_pie,
    .fsp_table = { 4000, 400, 100 },
};
```

`dram_timing`이 SPL의 `ddr_init()` 함수에 전달됩니다. controller·PHY 레지스터를 *순서대로 쓰는* 코드입니다.

이 200줄+의 레지스터 값을 *손으로 적는 사람은 없습니다*. 모두 vendor tool 출력입니다.

## PHY training

DDR4 / LPDDR4 이후의 SoC는 *부팅 시 PHY training*을 합니다. SoC가 *실제로 데이터를 보내 보면서* 각 lane의 *최적 sampling 위치*를 찾는 과정입니다.

```text
[DDR Init 흐름]

1. DDRC와 PHY를 기본 설정으로 초기화
2. DDR 칩에게 *initialization sequence* 전송
   (MR0 ~ MR12 mode register 쓰기)
3. PHY training firmware 적재 (1D, 2D)
4. Training 실행 — DRAM이 *대답*하는 시간 측정
5. Training 결과를 CSR(Configuration and Status Register)에 저장
6. Frequency change 점들을 미리 계산해 둠 (DVFS용)
```

Training firmware는 SoC 벤더가 제공하는 *blob*입니다. NXP의 경우 `firmware-imx` 패키지에 들어 있고, BL2에 함께 link됩니다.

Training이 실패하면 다음 메시지가 시리얼에 나옵니다.

```text
DDR training FAILED at frequency 0
PMU1: 0x0000
PMU2: 0x0001
```

이 시점에 SPL이 *그 자리에서 정지*합니다. DRAM이 안 깨졌으니 U-Boot proper 단계로 갈 수 없습니다.

## 잘못된 timing의 증상

증상별로 의심해야 할 파라미터입니다.

| 증상 | 원인 가능 |
|------|---------|
| 부팅 안 됨, "DDR training FAILED" | 기본 timing 자체가 틀림. tool 출력 재확인. |
| 부팅 되는데 0.1초만에 freeze | tRCD/tRP 너무 빠름 |
| Linux 부팅, 1시간 뒤 random oops | tREFI 너무 큼 또는 ZQ calibration 미설정 |
| 빌드 중 *드물게* compile error | tWR/tRTP misalignment |
| 압축 검증(`sha256sum`) 불일치 | data eye margin 부족, PHY training 부정확 |
| 온도 올라가면 hang | temperature compensation 미동작 |
| 한 메모리 영역만 깨짐 | 특정 bank의 training 실패 |

가장 *치명적이고 미묘한* 것이 tREFI(refresh interval)입니다. JEDEC는 *7.8us*를 권장하고, *온도 85°C 이상에서는 3.9us*가 필요합니다. tREFI가 너무 크면 *DRAM cell이 자연 방전*해 데이터가 사라집니다.

## DDR stress test

DDR이 *동작은 하지만 안정적인지* 확인하는 테스트입니다. U-Boot의 내장 명령과 외부 도구를 씁니다.

U-Boot의 `mtest`:

```text
=> mtest 0x40000000 0x50000000
Testing 40000000 ... 50000000:
Pattern FFFFFFFF  Writing... Reading...Iteration: 1
Pattern 00000000  Writing... Reading...Iteration: 2
...
```

이건 *간단한 walking pattern*입니다. *진짜* stress는 Linux 부팅 후 합니다.

```bash
# 부팅 후
$ stress-ng --vm 4 --vm-bytes 75% --timeout 60m
$ memtester 1G 10
```

`memtester`는 다양한 패턴으로 *몇 시간*에 걸쳐 메모리를 두드립니다. 한 번이라도 error가 나오면 *timing이 marginal*하다는 신호입니다. 온도 변화 시나리오도 시도합니다.

```bash
# 부하 + 온도 측정
$ stress-ng --cpu 8 --vm 4 --vm-bytes 50% --timeout 60m &
$ while sleep 10; do
    cat /sys/class/thermal/thermal_zone0/temp
done
```

온도가 85°C를 넘어가는 시점에 *random crash*가 나면 *refresh* 또는 *temperature compensation*을 의심합니다.

## DDR controller register dump

부팅 후 *실제 controller 상태*를 봅니다.

```bash
$ devmem 0x3d400000   # DDRC_MSTR
0x81040020

$ devmem 0x3d400064   # DDRC_RFSHTMG
0x006180e0
```

이 값들이 *tool 출력과 일치*하는지 확인합니다. SPL이 *덮어쓴 후 다른 곳에서 변경하지 않는 한* 그대로일 것입니다.

## RAM size 검출 — DT vs runtime

DT의 `memory` 노드에 *DRAM 크기*를 적습니다.

```text
memory@40000000 {
    device_type = "memory";
    reg = <0x0 0x40000000 0x0 0x80000000>;  /* 2GB */
};
```

이 값이 *실제 보드의 DRAM 크기*와 일치해야 합니다. 보드 변형에 따라 1GB, 2GB, 4GB가 다르면 *변형별 dts*를 만들거나, 부트로더가 *런타임에 측정*해 fdt를 *수정*해 커널에 넘깁니다.

U-Boot의 `dram_init()` 또는 `board_phys_sdram_size()`가 이 값을 결정합니다. NXP BSP는 다음 패턴을 씁니다.

```c
int board_phys_sdram_size(phys_size_t *size)
{
    *size = imx_ddr_size();   /* DDRC 레지스터에서 자동 계산 */
    return 0;
}

int ft_board_setup(void *blob, struct bd_info *bd)
{
    fdt_fixup_memory(blob, PHYS_SDRAM, bd->bi_dram[0].size);
    return 0;
}
```

`ft_board_setup()`이 *부팅 직전* fdt(DT)를 수정해 *실제 측정한 크기*를 적어 줍니다. 이렇게 하면 한 부트로더 이미지로 *여러 메모리 용량 보드*를 지원할 수 있습니다.

## 자주 하는 실수

### EVK의 DDR 코드를 *그대로* 복사

NXP EVK는 *2GB DDR4*인데 우리 보드는 *4GB LPDDR4*인 경우가 있습니다. *완전히 다른 timing*입니다. vendor tool로 *우리 보드의 입력*으로 재생성합니다.

### Datasheet 대신 *DDR 칩의 마킹*만 보고 가정

DRAM 칩 marking이 같아도 *speed grade*가 다를 수 있습니다. `MT40A1G16-062E`와 `MT40A1G16-075E`는 *마지막 두 자리*가 speed bin 차이입니다. *전체 부품 번호*로 datasheet를 받습니다.

### Refresh interval(tREFI)을 *85°C 이상에서 안 줄임*

산업용 보드는 *85°C 이상 동작*이 요구사항입니다. tREFI를 *온도에 따라 동적*으로 줄이는 *temperature compensation*을 설정해야 합니다. NXP의 경우 `DDRC_RFSHCTL0`의 `refresh_mode = 1`(auto refresh)에 더해 *MR4 temperature read* 주기를 짧게 잡습니다.

### Stress test 없이 *부팅만 되면 OK* 판정

부팅 1분으로는 *marginal*한 DDR을 잡아내지 못합니다. *최소 1시간*의 memtester, 가능하면 *24시간*의 burn-in을 거쳐야 합니다.

### PHY training firmware *버전 불일치*

DDR controller 코드와 *PHY training firmware*는 *짝*입니다. firmware-imx 버전이 안 맞으면 *training은 통과*해도 *동작이 이상*합니다. vendor BSP 버전을 *함께 묶어* 관리합니다.

### `ft_board_setup`을 안 호출해 *DT의 가짜 크기*가 커널로

DT에 2GB라고 적었는데 실제 보드는 1GB이면, 커널이 *없는 메모리에 접근*하다 죽습니다. 부트로더가 *fdt fixup*을 안 하면 이 문제가 납니다.

### vendor tool의 *Excel 시트*에서 입력 잘못

NXP DDR Tool은 *수십 개의 시트 셀*을 채워야 합니다. Bus width, page size, capacity 셀이 *DRAM 칩과 어긋나면* 잘못된 코드를 만듭니다. *3번* 확인합니다.

## 실전 일정 — DDR 단계

새 보드 BSP의 DDR 부분에 *약 1~2주*를 잡습니다.

| 일자 | 작업 |
|------|------|
| Day 1 | DRAM 칩 datasheet 정독. 회로도와 비교. |
| Day 2 | Vendor DDR tool 설치 + 입력 채우기 |
| Day 3 | Tool 출력 검증. 비슷한 reference 보드 출력과 *diff*. |
| Day 4 | U-Boot SPL에 코드 통합. 첫 빌드. |
| Day 5 | JTAG으로 SPL에 break, 첫 부팅 시도. |
| Day 6~8 | DDR training 실패 디버깅. tool 재실행, training firmware 버전 확인. |
| Day 9~10 | `mtest`, `memtester` 단기 stress. |
| Day 11~14 | 장시간 stress(24시간 이상), 온도 cycling. |

대부분 *Day 6~8*에서 막힙니다. PHY training이 첫 시도에 통과하는 경우는 드물고, 회로도 layout 확인이나 vendor 지원이 필요할 수 있습니다.

## 정리

- DDR 매개변수가 살짝 틀리면 *드물게* crash합니다. BSP에서 *가장 시간 소모적*인 단계입니다.
- 임베디드는 SPD가 없으므로 BSP가 *DDR 칩 datasheet를 읽고* timing을 *손으로* 설정합니다.
- Vendor의 *DDR config tool*(NXP DDR Tool, TI DDR Config GUI, Rockchip rkbin-tools 등)이 *반드시* 사용됩니다. 손 계산은 금지.
- DDR4/LPDDR4 이후는 *PHY training*이 부팅 시 필수입니다. Training firmware blob이 vendor 제공.
- 핵심 timing은 *tRCD, tRP, tRC, tRAS, CL, WL, tREFI, tRFC*입니다. 대부분 ns 단위로 datasheet에 있고 클록 cycle로 환산됩니다.
- 잘못된 timing의 증상은 *random crash, 압축 검증 실패, 온도에 따른 hang*입니다. 부팅 성공이 안정성 보장이 아닙니다.
- `memtester`로 *최소 1시간 이상*의 stress, *24시간 burn-in*이 표준입니다.
- 부트로더가 `ft_board_setup`으로 DT의 메모리 크기를 *런타임 측정값*으로 fixup하면 한 이미지로 여러 변형을 지원합니다.

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
