---
title: "Ch 26: DDR Training · PHY 초기화 깊이"
date: 2026-05-19T26:00:00
description: "DDR4/LPDDR4 controller·PHY가 어떻게 캘리브레이션되는지, 보드별 timing parameter, training 실패 디버깅."
series: "Bootloader Internals"
seriesOrder: 26
tags: [embedded, bootloader, ddr, lpddr, dram-init, training]
draft: false
---

## 한 줄 요약

**DDR training은 보드의 전기 회로를 SoC가 직접 측정해 보정하는 단계입니다.** Ch 9에서는 큰 흐름을 봤지만, 양산 보드에서 실패하는 7~80%의 사고가 *training 자체*에서 발생합니다. 이 글은 controller와 PHY가 어떻게 분리되어 있는지, 어떤 알고리즘이 돌아가는지, 그리고 실패했을 때 어디를 어떻게 찔러야 하는지를 깊이 있게 다룹니다.

[9장](/blog/embedded/bootloader/chapter09-dram-init)이 "DDR 초기화의 전체 그림"이라면 이 글은 "그림 안의 까만 상자를 한 번 더 까는" 글입니다. PCB layout 결함, ZQ 저항 미스매치, Vref 오류, IBIS 모델 불일치 같은 *현장에서 가장 자주 만나는* 실패를 다룹니다.

## controller와 PHY의 분리

DDR 서브시스템은 두 개의 IP로 구성됩니다. 이름은 벤더마다 다르지만 역할은 동일합니다.

| 블록 | 역할 | 인터페이스 |
|------|------|------------|
| **DDR controller** (uMCTL2, DENALI) | 프로토콜 — bank/row/column scheduling, refresh, ECC, AXI bridging | AXI ↔ DFI |
| **DDR PHY** (Synopsys DWC PUB, Cadence DDR PHY) | 전기 — DQ/DQS drive·sample, ZQ calibration, training engine | DFI ↔ pad |

이 둘은 **DFI(DDR PHY Interface)** 규격으로 통신합니다. controller는 "이 row를 activate해라"라는 *명령*을 발행하고, PHY는 그 명령을 *DDR chip이 알아듣는 전기 신호*로 변환합니다. 반대 방향도 같습니다. controller는 *논리적인* DRAM access만 알고, PHY는 *전기적인* 타이밍과 신호 무결성을 책임집니다.

```text
+----------+    +-----------------+    +-----+    +-----+
|   CPU    |←→  |  DDR controller |←→  | PHY |←→  | DRAM|
+----------+    +-----------------+    +-----+    +-----+
   AXI4              DFI 2.x          pad 신호    JEDEC
```

이 분리가 중요한 이유는 *training이 PHY 안에서만 일어나기 때문*입니다. controller는 training 중에 아무 일도 하지 않습니다. SPL은 controller 레지스터를 먼저 프로그래밍한 뒤, PHY에 "training 시작" 명령을 던지고, PHY가 끝났다고 알릴 때까지 *폴링*만 합니다.

## training 5단계

training은 다음 5개 알고리즘이 순서대로 실행됩니다. 어느 한 단계라도 실패하면 그 자리에서 멈춥니다.

| 단계 | 무엇을 정렬하는가 | 실패 시 증상 |
|------|---------------------|--------------|
| **CA training** (LPDDR4만) | Command/Address 신호와 CK clock의 정렬 | DRAM이 MRS 명령을 못 알아들음 |
| **Write leveling (WrLvl)** | SoC 측 DQS edge가 chip 내부 CLK와 일치하도록 지연 조정 | write가 wrong bank로 들어감 |
| **Read DQS gate training (DGSL)** | DRAM이 보낸 DQS의 도달 시점 학습 | read가 noise만 잡음 |
| **Read leveling (RdLvl)** | DQS와 DQ 사이의 sampling window 가운데로 이동 | sporadic bit error |
| **ZQ calibration** | 외부 240Ω 기준으로 ODT·Ron 임피던스 보정 | reflection, signal integrity 저하 |

대부분의 PHY는 위 5단계를 *1D training*과 *2D training* 두 번에 걸쳐 수행합니다. 1D는 시간 축(지연), 2D는 시간 + 전압 축(eye sweep)입니다. DDR4 이상은 2D를 거치지 않으면 corner case에서 비트 에러가 납니다.

```c
/* drivers/ddr/imx/imx8m/ddr_init.c 의 핵심 흐름 */
int ddr_cfg_phy(struct dram_timing_info *t)
{
    /* 1) 1D firmware 로드 — IMEM, DMEM */
    ddr_load_train_firmware(FW_1D_IMAGE);

    /* 2) PHY APB 레지스터에 firmware parameter 주입 */
    for (int i = 0; t->fsp_msg[i].drate; i++) {
        ddrphy_init_set_dfi_clk(t->fsp_msg[i].drate);
        for (int j = 0; j < t->fsp_msg[i].fsp_cfg_num; j++) {
            dwc_ddrphy_apb_wr(t->fsp_msg[i].fsp_cfg[j].reg,
                              t->fsp_msg[i].fsp_cfg[j].val);
        }
    }

    /* 3) training 시작 */
    dwc_ddrphy_apb_wr(0xd0000, 0x0);          /* MicroContMuxSel */
    dwc_ddrphy_apb_wr(0xd0099, 0x9);          /* TrainEnable */
    dwc_ddrphy_apb_wr(0xd0099, 0x1);
    dwc_ddrphy_apb_wr(0xd0099, 0x0);

    /* 4) 완료 폴링 — mailbox 통해 결과 수신 */
    if (wait_ddrphy_training_complete())
        return -ETIMEDOUT;

    /* 5) 2D firmware 로드, 다시 위 사이클 */
    ddr_load_train_firmware(FW_2D_IMAGE);
    /* ... */
    return 0;
}
```

`wait_ddrphy_training_complete()`가 반환하는 값에 *어느 단계가 실패했는지*가 담깁니다. 0xFF는 mailbox에 도달 못 함, 0x00은 성공, 그 외는 단계별 에러 코드입니다. 벤더 reference manual의 *PMU training major message* 표를 보면 코드별 해석이 나옵니다.

## DDR4 vs LPDDR4

같은 "DDR"이지만 전기·프로토콜이 다릅니다. SPL 코드도 분기됩니다.

| 항목 | DDR4 | LPDDR4 |
|------|------|--------|
| **clock** | single-ended CK_t, CK_c (differential) | differential CK only |
| **command/address** | 1N timing 일반적 | 2N timing + **CA training 필수** |
| **VDDQ** | 1.2 V | 1.1 V |
| **bus width** | 64-bit + 8-bit ECC 일반 | 16-bit/32-bit channel 다수 |
| **channel** | 1 channel = 1 controller | 2 sub-channel per chip |
| **read DQS** | differential | single-ended (LPDDR4), differential (LPDDR4X) |
| **mode register** | MR0~MR6 | MR1~MR22, **FSP(frequency set point)** |
| **deep power-down** | 별도 없음 | DPD 모드 |

LPDDR4의 *FSP*가 SPL 코드를 복잡하게 만듭니다. 같은 chip이 여러 주파수(예: 25 MHz boot → 1.6 GHz 정상)에서 동작하고, 주파수마다 *별도의 MR set*과 *별도의 training 결과*가 필요합니다. i.MX8M의 `t->fsp_msg[]` 배열이 바로 이 FSP별 설정입니다. boot 동안 *boot frequency*로 한 번 training, 정상 frequency로 또 한 번 training이 돌아갑니다.

DDR4는 단일 frequency만 다루지만, *2D training의 eye sweep*에서 더 많은 sample 시간을 씁니다. 두 표준 모두 training 자체는 수십 ms ~ 수백 ms가 걸립니다.

## timing parameter

DRAM chip의 datasheet에는 *수십 개의 timing parameter*가 정의되어 있습니다. 그 중 SPL이 controller 레지스터로 직접 프로그래밍해야 하는 핵심 값은 다음과 같습니다.

| 파라미터 | 의미 | DDR4-3200 일반값 | LPDDR4-3200 일반값 |
|----------|------|------------------|----------------------|
| **tCL** | CAS latency (RD 명령 → 첫 data) | 22 cycles | 28 cycles |
| **tRCD** | RAS → CAS delay (ACT → RD) | 22 cycles | 18 cycles |
| **tRP** | row precharge time | 22 cycles | 18 cycles |
| **tRC** | row cycle time (ACT → ACT same bank) | 76 ns | 63 ns |
| **tRFC** | refresh cycle time | 350 ns (8Gb) | 280 ns (16Gb) |
| **tWR** | write recovery time | 24 cycles | 24 cycles |
| **tWTR** | write to read delay | 12 cycles | 12 cycles |
| **tFAW** | four activate window | 30 ns | 40 ns |
| **tREFI** | refresh interval (avg) | 7.8 μs (≤85°C) | 3.9 μs (≤85°C) |

이 값들은 다음 세 곳 중 하나에서 옵니다.

1. **DRAM chip datasheet** — 가장 정확. JEDEC speed grade로 제공.
2. **SPD EEPROM** (server-grade DDR4 DIMM) — controller가 I2C로 직접 읽음.
3. **eMMC EXT_CSD** 같은 *embedded* 정보 — 보드 설계서에 정리.

embedded 보드에는 SPD가 보통 *없습니다*. soldered DRAM이 한 가지뿐이라 보드 설계 시점에 timing이 고정됩니다. 그래서 SPL 빌드에 *하드코딩된 table*이 들어갑니다.

```c
/* board/freescale/imx8mm_evk/lpddr4_timing.c — 일부 */
struct dram_cfg_param ddrc_cfg[] = {
    { DDRC_MSTR(0),       0xa1080020 },  /* mstr: LPDDR4, 32-bit, 1 rank */
    { DDRC_RFSHTMG(0),    0x004900a1 },  /* tRFC=161, tRFCI=73 */
    { DDRC_DRAMTMG0(0),   0x1a201d1d },  /* tRAS, tFAW, tWR2PRE */
    { DDRC_DRAMTMG1(0),   0x00060633 },  /* tXP, tRTP, tRC */
    { DDRC_DRAMTMG2(0),   0x070e1214 },  /* tCWL, tCL, tRD2WR, tWR2RD */
    { DDRC_DRAMTMG3(0),   0x00b0b006 },  /* tMRW, tMRD */
    { DDRC_DRAMTMG4(0),   0x0a040509 },  /* tRP, tRRD, tCCD, tRCD */
    /* ... 수백 줄 ... */
};
```

이 파일 한 줄이라도 잘못되면 *전부* 실패합니다. 그래서 *손으로 작성하지 않습니다*. 다음 절의 벤더 tool이 datasheet PDF를 입력으로 받아 자동 생성합니다.

## 보드별 DRAM blob

SPL 안에 들어가는 DDR 데이터는 두 종류입니다.

| 종류 | 내용 | 생성 도구 |
|------|------|-----------|
| **controller config** — C source | `ddrc_cfg[]` 같은 레지스터 표 | 벤더 GUI tool |
| **PHY firmware** — binary blob | training PMU가 실행하는 microcode | 벤더 binary release |

벤더별 위치와 이름이 다릅니다.

| SoC vendor | controller config | PHY firmware |
|------------|--------------------|--------------|
| **NXP i.MX8M** | `lpddr4_timing.c` (DDR_TOOL 출력) | `lpddr4_pmu_train_1d_imem.bin`, `lpddr4_pmu_train_1d_dmem.bin`, `2d_imem.bin`, `2d_dmem.bin` |
| **Rockchip RK3399/3568** | `sdram-lpddr4-*.dtsi` | `ddr.bin` (single blob, controller + PHY 통합) |
| **Allwinner H6/H616** | C source in U-Boot | `dram-h6.bin` (별도 blob 없음, 코드에 통합) |
| **TI AM6x** | `ddrss.c` + DTS overlay | DENALI는 firmware 별도 없음 |
| **STM32MP1** | DTS의 `&dramc { ... }` 블록 | 없음 (controller가 PHY와 결합) |

NXP의 경우 firmware 4개를 `MAINTAINERS`가 binary release로 배포합니다. U-Boot 빌드 시 `nxp-firmware/firmware/ddr/synopsys/`에 복사하지 않으면 SPL이 *link*는 되지만 *런타임에 segfault*가 납니다.

```bash
# i.MX8MM SPL 빌드 전 firmware 위치 확인
$ ls $(pwd)/lpddr4_pmu_train_*.bin
lpddr4_pmu_train_1d_dmem.bin  lpddr4_pmu_train_2d_dmem.bin
lpddr4_pmu_train_1d_imem.bin  lpddr4_pmu_train_2d_imem.bin

# SPL 빌드
$ make -j$(nproc) imx8mm_evk_defconfig
$ make -j$(nproc) flash.bin
```

빌드 산출물 `flash.bin`은 *bootloader code + DDR firmware blob + DTB*가 하나로 합쳐진 이미지입니다. SPL이 SRAM에서 동작하다가 DDR firmware를 PHY의 IMEM/DMEM에 *직접 복사*하고, training을 트리거합니다.

## training 실패 — 5가지 원인

production bring-up에서 만나는 training 실패의 90%는 다음 5가지에서 옵니다.

### 1. signal integrity — PCB layout

가장 흔합니다. DRAM은 *수 GHz에 가까운* 신호를 다루고, PCB 트레이스 길이가 1 mm만 어긋나도 timing eye가 닫힙니다.

증상:
- 25°C에서는 동작, 0°C 또는 70°C에서 실패.
- 보드 A는 OK, 동일 설계의 보드 B는 실패.
- write leveling은 통과, 2D RdLvl에서 실패.

확인 절차:
- *via를 줄였는가*, *fly-by topology를 따랐는가*, *DQ skew matching ≤ 25 mil인가*.
- DDR4는 *Z_t = 40~50Ω*, LPDDR4는 *Z_t = 50~60Ω* 으로 임피던스 컨트롤.
- DQS·CK는 *differential 100Ω*.

해결은 board respin이 정공법입니다. 임시로는 *training 결과 register를 dump*하고, 가장 큰 marginal byte lane을 식별해 *PCB 어느 트레이스가 부족한지* 역추적합니다.

### 2. timing parameter mismatch

보드의 DRAM 부품이 *dual-source*인 경우. Micron 부품 가정으로 빌드한 SPL을 Samsung 부품 보드에 올리면 tRFC가 안 맞아 training이 멈춥니다. 부품 마킹을 *현미경으로* 확인하고, 해당 chip의 정확한 datasheet로 timing table을 다시 생성해야 합니다.

### 3. Vref off

DDR4 이후 *Vref training*이 chip 내부에서 일어납니다. 보드의 외부 Vref bias network가 잘못 설계되어 *시작 Vref*가 JEDEC 범위를 벗어나면, training 자체가 시작도 못 합니다.

확인 — schematic에서 `VREFCA` / `VREFDQ` 핀의 bias resistor 값을 검토하고, *오실로스코프로* power-on 직후 Vref 핀의 전압을 측정합니다. 0.5 × VDDQ ± 5% 안에 들어야 합니다.

### 4. ZQ resistor 잘못

DRAM의 ZQ 핀에는 *정밀 240Ω 1% 저항*이 GND로 연결됩니다. 이 저항을 240Ω 5%, 또는 220Ω, 250Ω으로 잘못 BOM에 넣으면 ZQ calibration이 *out-of-range*를 보고합니다.

```c
/* 단순화된 ZQ calibration 트리거 — controller가 직접 발행 */
void zq_calibration(struct ddrc *ddrc)
{
    /* 1) ZQ short 시작 */
    writel(DDRC_ZQ_SHORT_REQ, &ddrc->zqctl0);

    /* 2) 완료 폴링 — 보통 100 cycle 이내 */
    int timeout = 1000;
    while (readl(&ddrc->zqstat) & DDRC_ZQ_BUSY) {
        if (--timeout == 0) {
            panic("ZQ calibration timeout — check 240Ω external resistor");
        }
        udelay(1);
    }

    /* 3) 결과 확인 — out of range면 외부 저항 의심 */
    uint32_t r = readl(&ddrc->zqstat);
    if (r & DDRC_ZQ_OUT_OF_RANGE) {
        printf("ZQ out of range (raw=0x%x) — external R = wrong\n", r);
    }
}
```

`DDRC_ZQ_OUT_OF_RANGE`가 set되면 *전기적으로* 외부 저항이 잘못 붙어 있다는 의미입니다. BOM 검수.

### 5. IBIS model mismatch

PCB 설계 시 IBIS(I/O Buffer Information Specification) model로 *pre-layout 시뮬레이션*을 합니다. SoC vendor가 제공한 IBIS가 *실제 silicon revision*과 다르면 시뮬레이션은 OK인데 실측은 fail이 됩니다. 특히 신생 SoC의 *engineering sample* 단계에서 발생하며, vendor의 *latest IBIS*로 *post-layout* 시뮬레이션을 다시 돌리는 것이 해법입니다.

## training 결과 dump와 분석

training이 통과해도 *얼마나 여유 있게 통과했는지*를 확인해야 양산까지 갑니다. PMU mailbox는 단계별 *결과 register*를 남깁니다.

```text
=> mw 0x3d000d0  ; PHY MicroContMuxSel = CSR mode
=> md 0x3d0080000 0x40
3d0080000: 0000007f 00000000 00000003 00000000   /* RdLvl byte 0 delay */
3d0080010: 0000007e 00000000 00000003 00000000   /* RdLvl byte 1 */
3d0080020: 00000081 00000000 00000003 00000000
3d0080030: 0000007d 00000000 00000003 00000000
...
```

값이 *byte lane 사이에 5 이상 차이*가 나면 PCB skew가 큽니다. 이상적으로는 ±2 이내가 healthy. NXP의 *PMU result decoder script*는 이 raw 값을 *picosecond*로 환산해 줍니다.

U-Boot 콘솔에서 즉시 돌릴 수 있는 검증:

```text
=> mtest 0x40000000 0x60000000 0xAA55
Testing 40000000 ... 60000000:
Pattern AA55AA55AA55AA55  Writing...  Reading...
Tested 536870912 bytes OK.

=> mtest 0x40000000 0x60000000 0x55AA 100
Pattern 55AA55AA55AA55AA  Iteration 1   OK
Pattern 55AA55AA55AA55AA  Iteration 2   OK
...
```

이 단계에서 *interrupt*나 *cache aliasing*은 짚지 못합니다. Linux userspace의 `memtester`가 더 철저합니다.

```bash
# 256 MB 영역 1회 — 보통 10분 정도
$ memtester 256M 1
memtester version 4.5.1 (64-bit)
got 256MB (268435456 bytes), trying mlock ...locked.
Loop 1/1:
  Stuck Address        : ok
  Random Value         : ok
  Compare XOR / SUB    : ok
  Sequential Increment : ok
  Solid Bits           : ok
  Checkerboard         : ok
  Walking Ones / Zeroes: ok
  8-bit / 16-bit Writes: ok
```

이 패턴들이 *모두* OK여야 합니다. *Walking Ones / Zeroes*가 자주 marginal로 잡힙니다. 한 번이라도 failure가 나오면 *training이 marginal하게 통과한 것*입니다. 즉, training은 PMU 기준 통과지만 *실제 marginal*. board respin 또는 training parameter tweak 필요.

## post-training 검증

training과 mtest를 통과해도 *production*까지 가려면 한 단계가 더 필요합니다.

1. **kernel boot 전 memory walk** — SPL이 DDR 전체 영역을 0으로 쓰고 읽으며 *DDR controller error counter*가 0인지 확인. ECC 모드면 *uncorrectable error count*도 0.
2. **ECC enable** — 가능하면 켭니다. DDR4 server-grade는 SECDED, LPDDR4는 *inline ECC* 또는 *side-band ECC*. 양산에서 latent bit error를 잡아냅니다.
3. **stress test** — `stress-ng --vm 4 --vm-bytes 80% --vm-method all --verify -t 3600s` 같은 1시간 stress를 *온도 chamber*에서 -10°C, 25°C, 70°C로 3회.
4. **resume retraining 검증** — suspend/resume 100회 반복 후 데이터 무결성 확인. ATF가 retraining을 *제대로* 돌리는지 확인.
5. **장기 burn-in** — 48시간 idle + 48시간 stress. 양산 보드 100대 표본으로.

이 5단계가 통과하면 양산 진입 가능. 한 단계라도 통과 못 하면 그 원인이 *DDR fixed*인지 *software fixable*인지 결정합니다.

## 여러 PCB revision 대응

같은 제품군에 *revision A·B·C*가 공존하는 경우, DDR 부품이 dual-source가 되거나 PCB가 변경됩니다. SPL이 *런타임에 보드를 식별*하고 *해당 DDR config를 골라야* 합니다.

```c
/* board/myvendor/myboard/spl.c */
void spl_dram_init(void)
{
    enum board_rev rev = detect_board_revision();  /* GPIO·ID EEPROM 으로 */

    struct dram_timing_info *t;
    switch (rev) {
    case BOARD_REV_A:
        t = &dram_timing_micron_8gb;
        break;
    case BOARD_REV_B:
        t = &dram_timing_samsung_8gb;
        break;
    case BOARD_REV_C:
        t = &dram_timing_micron_16gb;
        break;
    default:
        panic("Unknown board rev — cannot pick DDR timing");
    }

    ddr_init(t);

    if (ddr_self_test() != 0)
        panic("DRAM self-test failed on rev=%d", rev);
}
```

각 `dram_timing_*` 구조체는 *별도 파일*로 분리합니다. 보드 revision이 늘어나도 코드가 한 곳에 모이지 않게. 식별 신호는 보통 *board ID GPIO 3 ~ 4개* 또는 *EEPROM의 board metadata*입니다. SPL이 그 단계까지 동작해야 하므로 *식별 자체는 DDR에 의존하지 않는* 코드 경로로 짜야 합니다.

## 흔한 실수

- **firmware blob 버전을 잊습니다.** NXP firmware는 *SoC silicon revision별*로 다릅니다. silicon rev B0인데 A0용 firmware로 SPL을 만들면 mailbox response가 다르고 *training이 거짓 성공*을 보고합니다. silicon rev은 `cat /proc/cpuinfo`나 SPL 부팅 메시지로 확인.
- **온도 단일 조건에서 sign-off.** 25°C training은 *우연히* 통과하기 쉽습니다. 양산 전 *3-point 온도 sweep*은 필수. chamber 없으면 *cold spray + heat gun*으로라도 marginal lane을 찾습니다.
- **`mtest` 한 번만 돌립니다.** 단일 패턴은 cache·prefetcher·DMA 트래픽을 시뮬레이션하지 못합니다. *memtester + stress-ng*까지 거쳐야 합니다.
- **suspend/resume를 검증 안 합니다.** cold boot training은 성공인데 resume retraining이 marginal하면 *suspend에서 영원히 못 깨어나는* 사고가 양산에서 나옵니다. PSCI `CPU_SUSPEND` ↔ `CPU_RESUME` cycle을 *수백 회* 반복 검증.
- **ECC enable을 *마지막에* 합니다.** ECC를 일찍 켰다면 *uncorrectable error 카운터*가 실패 lane 추적의 1차 단서입니다. 양산까지 끄고 가다가 마지막에 켜면, 어디가 marginal한지 *이미 잊어버린 뒤*가 됩니다.
- **board revision 식별을 DDR에 의존합니다.** EEPROM이 *I2C로* 읽히면 DDR 전이라 OK지만, 코드가 DDR을 거치게 짜이면 자기 모순. 항상 *DDR 이전*에 식별이 끝나야 합니다.

## 정리

- DDR 서브시스템은 *protocol을 다루는 controller*와 *전기를 다루는 PHY*로 분리되어 있고, DFI 규격으로 통신합니다.
- training은 *CA → WrLvl → DGSL → RdLvl → ZQ*의 5단계로 구성되며, 모두 PHY 내부에서 일어납니다.
- DDR4와 LPDDR4는 같은 "DDR"이지만 clock·CA timing·FSP·channel 구조가 달라 SPL 코드가 분기됩니다.
- timing parameter(tCL, tRCD, tRP, tRC, tRFC, tWR 등)는 datasheet에서 옵니다. 손으로 안 쓰고 벤더 tool로 생성합니다.
- 보드별 DRAM blob은 *controller config(C 표)*와 *PHY firmware(binary)* 두 가지로 구성됩니다.
- training 실패의 5대 원인은 PCB SI, timing mismatch, Vref off, ZQ 저항, IBIS mismatch입니다.
- training 통과 후 *memtester + stress-ng + 온도 sweep + resume cycle*까지 통과해야 양산 진입.
- 여러 PCB revision은 *런타임 board ID 식별 + DDR config 선택*으로 처리합니다.

다음 편은 **Ch 27: 신뢰 체인(Chain of Trust)**. ROM → SPL → ATF → U-Boot → kernel 각 단계에서 *어떤 서명·검증*이 일어나는지, fused key가 어떻게 흐르는지 봅니다.

## 관련 항목

- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init) — 이 글의 기초가 되는 큰 그림
- [Ch 8: 보드 초기화](/blog/embedded/bootloader/chapter08-board-init) — `board_init_f`에서 DDR을 부르는 위치
- [Ch 24: SPL 분리 빌드](/blog/embedded/bootloader/chapter24-spl) — DDR firmware blob이 들어가는 SPL 빌드 흐름
- [Ch 22: 부트 디버깅](/blog/embedded/bootloader/chapter22-debugging) — training 실패 시 JTAG·UART 활용법
- [JEDEC LPDDR4 Standard (JESD209-4)](https://www.jedec.org/standards-documents/docs/jesd209-4b)
