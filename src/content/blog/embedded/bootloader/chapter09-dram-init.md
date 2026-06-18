---
title: "DDR Controller 프로그래밍과 PHY Training — SPL의 가장 어려운 작업"
date: 2026-05-09T09:09:00
description: "DDR controller 초기화 시퀀스 — 레지스터 프로그래밍, training, 보드별 파라미터의 위치."
series: "Bootloader Internals"
seriesOrder: 9
tags: [embedded, bootloader, u-boot, ddr, dram]
draft: false
---

## 한 줄 요약

**DRAM 초기화는 SPL의 가장 어려운 일입니다.** 컨트롤러 레지스터를 정확한 순서로 쓰고, PHY를 보드의 전기적 특성에 맞춰 training하지 않으면 부트는 그 자리에서 멈춥니다.

[8장](/blog/embedded/bootloader/chapter08-board-init)에서 본 `board_init_f`의 핵심 작업이 바로 DRAM 초기화입니다. SPL이 SRAM 안에서 동작하다가, DRAM이 올라오면 메인 U-Boot를 거기로 옮겨 실행합니다. DRAM 초기화에 실패하면 그 다음 단계는 아예 시도조차 못 합니다. 그래서 SoC 벤더는 *DDR 초기화*에 가장 많은 문서·툴·support 리소스를 투입합니다.

이 글에서는 DDR 컨트롤러의 레지스터 레이어, training의 의미, 보드별 timing 파라미터가 어디서 오는지, 그리고 resume에서 재training을 어떻게 처리하는지를 봅니다.

## DDR 초기화의 큰 그림

DRAM은 단순히 "전원 켜고 읽기/쓰기"가 안 되는 디바이스입니다. JEDEC 사양은 power-on부터 정상 동작까지 *수십 개*의 step을 정의합니다. 다음 그림은 이 시퀀스의 주요 단계를 보여줍니다.

![DDR 초기화 흐름 — Controller Setup에서 PHY Training까지](/images/blog/bootloader/diagrams/ch09-ddr-init-flow.svg)

1. **PLL lock** — DDR clock 안정화.
2. **Controller reset 해제** — uMCTL2/DENALI 등 IP 깨우기.
3. **PHY 초기화** — DDR PHY (Synopsys DWC, Cadence) 깨우기.
4. **Mode Register Set (MRS)** — DRAM chip에 burst length, CAS latency 등 알림.
5. **ZQ calibration** — 출력 임피던스 조정.
6. **Write leveling** — 각 byte lane의 DQS 정렬.
7. **Read leveling** — read 데이터의 sampling window 찾기.
8. **ECC scrub** — ECC 모드면 메모리를 0으로 채워 syndrome 초기화.
9. **정상 동작 모드 진입** — refresh, self-refresh 활성화.

이 시퀀스 중 5~7번이 *training* 단계입니다. DRAM 칩과 SoC 사이의 PCB 트레이스 길이, 임피던스, 노이즈를 보고 PHY가 자동으로 sampling 시점을 조정합니다.

## DRAM stack 분류 — DDR3 / DDR4 / LPDDR3 / LPDDR4 / LPDDR5

"DRAM 초기화"라고 하면 한 가지 절차로 보이지만, 실제로는 *어느 stack을 다루는가*에 따라 레지스터 맵, training, mode register 의미가 달라집니다. 임베디드 보드에서 자주 만나는 다섯 가지를 비교합니다.

| Stack | VDD / VDDQ | 데이터 속도 (Gbps/pin) | 주 사용처 | 특징 |
|---|---|---|---|---|
| DDR3 / DDR3L | 1.5 V / 1.35 V | 0.8 ~ 2.1 | 산업용 i.MX6·AM335x·구형 STM32MP | 가장 저렴, training 단순, VRef 외부 |
| DDR4 | 1.2 V | 1.6 ~ 3.2 | i.MX8M·Rockchip RK3399·NXP Layerscape | VRef 내부, bank group 도입, DBI |
| LPDDR3 | 1.2 V / 1.2 V | 0.8 ~ 2.1 | 모바일 AP, 일부 i.MX7 | 단일 DDR보다 저전력, deep power down |
| LPDDR4 / LPDDR4X | 1.1 V / 1.1 V (4X: 0.6 V) | 3.2 ~ 4.27 | Snapdragon, i.MX8M Plus, RK3568 | 채널 분리(2×16), command/address bus 다름 |
| LPDDR5 | 1.05 V / 0.5 V | 5.5 ~ 6.4 | 최신 모바일 AP, i.MX95 | WCK 도입, deep sleep, link ECC |

전기적으로 *DDR 계열*과 *LPDDR 계열*은 서로 호환되지 않습니다. command bus 폭, ZQ 저항 위치, ODT 구조가 다르고 PHY IP도 분리됩니다. SoC datasheet에 "supports DDR4 and LPDDR4"라고 적혀 있어도 *각각 별도의 PHY mode*입니다.

```text
DDR4   : DQ × 16~64, DQS × 8, CA bus 17~18 핀, single channel
LPDDR4 : DQ × 16 × 2 channels, DQS × 4, CA bus 6 핀 × 2 channels
LPDDR5 : DQ × 16 × 2 channels, WCK + RDQS, CA bus 7 핀 × 2 channels
```

이 차이가 SPL 코드에는 *어떤 PHY firmware blob을 로드할지*로 나타납니다. i.MX8M Mini는 LPDDR4용 firmware와 DDR4용 firmware가 서로 다른 파일이고, 보드 변형마다 SPL 빌드에 다른 blob이 들어갑니다.

## 메모리 controller register groups

Synopsys uMCTL2 기준으로 컨트롤러 레지스터는 *기능별 group*으로 묶입니다. 벤더 tool이 뱉어내는 수백 줄짜리 표는 사실 이 group을 순서대로 채우는 일입니다. 자주 보는 group을 정리합니다.

| 그룹 | 주요 레지스터 | 역할 |
|---|---|---|
| MSTR | `MSTR`, `DERATEEN`, `DERATEINT` | DRAM 종류·rank·burst·DLL 등 master config |
| MRCTRL | `MRCTRL0`, `MRCTRL1`, `MRSTAT` | mode register write/read 명령 발행 |
| INIT | `INIT0` ~ `INIT7` | power-on timing(`tPreCKE`, `tPostCKE`, `tDLLK`), MR 초기값 |
| RANKCTL | `RANKCTL` | rank switching delay, ODT timing |
| DRAMTMG | `DRAMTMG0` ~ `DRAMTMG14` | tRAS·tRCD·tRP·tWR·tFAW 등 DRAM timing |
| ZQCTL | `ZQCTL0`, `ZQCTL1`, `ZQCTL2` | ZQ calibration short/long interval |
| DFITMG | `DFITMG0`, `DFITMG1`, `DFIMISC` | PHY와 controller 사이 DFI 인터페이스 타이밍 |
| ADDRMAP | `ADDRMAP0` ~ `ADDRMAP11` | row·bank·column 매핑 |
| ECCCFG | `ECCCFG0`, `ECCCFG1` | side-band ECC 활성화·scrubbing |
| RFSHTMG | `RFSHTMG`, `RFSHCTL0`, `RFSHCTL3` | refresh 주기·자동/수동 모드 |

벤더 tool은 보통 *이 순서대로* 레지스터 표를 만들어 줍니다. 손으로 손볼 일이 거의 없지만, training 실패를 디버그할 때는 *어느 그룹*이 잘못됐는지 추정해야 합니다. 예를 들어 "PHY는 깨어났는데 첫 read에서 0xFF"가 보이면 `ADDRMAP*` 또는 `DFITMG*`를 의심합니다.

```c
/* uMCTL2 register group 시작 주소 — i.MX8M Mini 기준 */
#define DDRC_BASE        0x3D400000
#define DDRC_MSTR        (DDRC_BASE + 0x000)
#define DDRC_MRCTRL0     (DDRC_BASE + 0x010)
#define DDRC_INIT0       (DDRC_BASE + 0x0D0)
#define DDRC_DRAMTMG0    (DDRC_BASE + 0x100)
#define DDRC_ZQCTL0      (DDRC_BASE + 0x180)
#define DDRC_DFITMG0     (DDRC_BASE + 0x190)
#define DDRC_ADDRMAP0    (DDRC_BASE + 0x200)
#define DDRC_RFSHTMG     (DDRC_BASE + 0x064)
```

## DRAM mode register (MR0 ~ MR7)

DRAM chip의 동작 모드는 *mode register*로 결정합니다. 컨트롤러는 MRS(Mode Register Set) 명령으로 chip 내부의 MR0 ~ MR7에 값을 씁니다. DDR4 기준 각 MR의 역할은 다음과 같습니다.

| MR | 주 역할 | 대표 필드 |
|---|---|---|
| MR0 | burst, CAS latency, DLL reset, write recovery | BL, CL, WR, DLL reset bit |
| MR1 | DLL enable, output drive strength, Rtt_nom, write leveling | DLL, ODS, AL, Rtt_nom |
| MR2 | CWL, Rtt_WR, dynamic ODT, low-power auto self-refresh | CWL, Rtt_WR, ASR |
| MR3 | MPR(Multi-Purpose Register) mode, fine granularity refresh | MPR mode, geardown |
| MR4 | self-refresh abort, CS to CMD/ADDR latency, temperature readout | TCRR, CAL |
| MR5 | data bus inversion, parity, Rtt_park | DBI write/read, parity, Rtt_park |
| MR6 | tCCD_L, VrefDQ training | tCCD_L, VrefDQ enable/value |
| MR7 | RFU (DDR4에서는 예약, LPDDR4부터 사용) | — |

DDR4에서 가장 자주 손대는 MR은 MR0 (CL, BL, WR)과 MR1 (Rtt_nom, ODS)입니다. 다음은 DDR4-2400 CL17 / BL8 / WR12 / DLL reset 활성 설정의 디코딩 예시입니다.

```c
/* DDR4 MR0 decode (JESD79-4 § 4.1.2) */
#define MR0_BL8           (0 << 0)   /* burst length 8 (fixed) */
#define MR0_BT_SEQ        (0 << 3)   /* burst type sequential */
#define MR0_CL_17         ((4 << 4) | (1 << 2)) /* CL=17 → A6:A4=100, A2=1 */
#define MR0_DLL_RESET     (1 << 8)   /* DLL reset on init */
#define MR0_WR_RTP_12_6   (5 << 9)   /* WR=12, RTP=6 */

#define MR0_INIT_VAL  (MR0_BL8 | MR0_BT_SEQ | MR0_CL_17 \
                       | MR0_DLL_RESET | MR0_WR_RTP_12_6)
/* MR0 = 0x0A50 */

/* MR1: DLL enable, RZQ/7 ODS, RZQ/4 Rtt_nom */
#define MR1_DLL_EN        (1 << 0)
#define MR1_ODS_RZQ_7     (0 << 1)   /* 34 Ω */
#define MR1_RTT_NOM_RZQ_4 (1 << 8)   /* 60 Ω */
#define MR1_INIT_VAL  (MR1_DLL_EN | MR1_ODS_RZQ_7 | MR1_RTT_NOM_RZQ_4)
/* MR1 = 0x0101 */
```

이 값을 컨트롤러의 `INIT3` (MR1:MR0), `INIT4` (MR3:MR2), `INIT6` (MR5:MR4), `INIT7` (MR7:MR6)에 packed 형식으로 적습니다. 벤더 tool은 결과적으로 *이 packed 값*만 보여주지만, 디버깅 시에는 다시 한 줄씩 풀어 의미를 확인해야 합니다.

## Address mapping — row · bank · column

컨트롤러는 CPU가 던진 *physical address*를 DRAM chip의 *row, bank, column*으로 분해해야 합니다. 분해 방식이 `ADDRMAP0` ~ `ADDRMAP11` 레지스터에 들어갑니다. 잘못 매핑하면 *읽기는 되는데 쓰기가 엉뚱한 주소에 들어가는* 형태로 깨집니다.

DDR4 single-rank 1 GB chip(16-bank, 16-bit DQ)의 전형적인 매핑은 다음과 같습니다.

```text
Physical address 30 bits = 1 GB
  [29:27] bank group + bank (5 bit)
  [26:13] row (14 bit)
  [12:3]  column (10 bit)
  [2:0]   byte offset (8-byte burst → 3 bit)
```

bank 비트가 row 위에 있고 column 위에 있는 *bank interleaving* 배치입니다. 다음 코드는 주소를 분해하는 예시입니다.

```c
struct dram_addr {
    uint32_t bank;
    uint32_t row;
    uint32_t col;
};

/* 16-bank, 14-row, 10-col 매핑 */
static inline struct dram_addr decode(uintptr_t pa) {
    return (struct dram_addr){
        .col  = (pa >> 3)  & 0x3FF,   /* 10 bit */
        .row  = (pa >> 13) & 0x3FFF,  /* 14 bit */
        .bank = (pa >> 27) & 0x1F,    /* 5 bit (BG + BA) */
    };
}
```

`ADDRMAP*` 레지스터는 *각 비트가 physical address의 몇 번 비트에서 오는지*를 base 값과 offset으로 정의합니다. bank/row를 *서로 바꾸는* 매핑은 sequential access 패턴에서 row miss를 줄이거나 늘려 성능을 ±20%까지 흔듭니다. 양산용 매핑은 *bank interleaving on, row 인접 access이 column 쪽으로*가 일반적인 시작점입니다.

## Rank · channel 구성

같은 controller가 다루는 DRAM이 한 덩어리가 아닐 수 있습니다. *rank*, *channel*, *ECC* 옵션이 보드의 메모리 크기와 대역폭을 결정합니다.

| 옵션 | 의미 | 영향 |
|---|---|---|
| Single rank | CS_n 한 줄, chip 한 set | 가장 단순. 1 GB ~ 2 GB 보드 일반 |
| Dual rank | CS_n 두 줄, chip 두 set 공유 | 용량 2배, ODT switching 비용·tFAW 압박 |
| Single channel | 데이터 경로 1개 (32/64-bit DQ) | 단순. 임베디드 대부분 |
| Dual channel | 데이터 경로 2개 (interleaved) | 대역폭 2배. AP·서버급. LPDDR4는 사실상 기본 |
| Side-band ECC | 별도 chip 또는 9-bit lane | 비트 에러 검출/정정, 용량 12.5% 추가 |
| Inline ECC | controller가 일반 DRAM을 분할해 ECC 영역 확보 | DRAM 변경 없음, 용량/대역폭 감소 |

`MSTR` 레지스터의 `active_ranks` 필드와 `ADDRMAP0`의 rank 비트 위치가 일관돼야 합니다. dual channel은 보통 *두 개의 독립 컨트롤러 instance*로 SoC가 노출하지만, LPDDR4처럼 *2-channel을 하나의 IP가 흡수*하기도 합니다.

```c
/* MSTR: DDR4, 32-bit, 1 rank, BL8 */
#define MSTR_DDR4         (1 << 4)
#define MSTR_BURST_RDWR_8 (4 << 16)
#define MSTR_ACTIVE_RANK1 (1 << 24)
#define MSTR_DATA_BUS_32  (1 << 12)  /* full bus = 32-bit */
#define MSTR_INIT  (MSTR_DDR4 | MSTR_BURST_RDWR_8 \
                    | MSTR_ACTIVE_RANK1 | MSTR_DATA_BUS_32)
```

ECC는 *enable과 동시에 scrub*가 필요합니다. 부팅 직후 메모리는 random pattern이고, syndrome이 즉시 single-bit error를 띄울 수 있습니다. SPL이 ECC 모드라면 첫 사용 전에 `memset(0)` 수준의 zero-fill을 반드시 돌립니다. 8장에서 본 `ddr_ecc_scrub()`이 이 단계입니다.

## DRAM 초기화 순서 — power-up sequence

JEDEC 사양은 power on부터 normal operation까지의 *정확한 시점*을 규정합니다. 컨트롤러의 `INIT0` ~ `INIT7`은 이 시점들을 timing 단위로 표현한 값입니다. 흐름을 의사 코드로 풀어 보겠습니다.

**1. VDD/VDDQ 안정 → tINIT0 대기 (500 µs)**


**2. RESET_n LOW 유지 → tINIT1 (200 µs)**


**3. RESET_n HIGH → CKE LOW → tINIT2 (500 µs)**


**4. CKE HIGH → tINIT3 (1 ms, MRS 가능 대기)**


**5. ZQ Calibration Long (ZQCL) → tZQinit (1024 cycles)**


**6. MR2, MR3, MR1, MR0 순서로 MRS write (DLL reset 포함)**


**7. ZQCL 한 번 더 → write leveling 준비**


**8. PHY training (write leveling → read leveling → VRef)**


**9. 컨트롤러 normal mode 진입, refresh 활성화**

이 절차를 SPL은 *대부분 PHY firmware에게 맡깁니다*. uMCTL2의 `dfimisc.dfi_init_start`를 켜면 PHY가 위 시퀀스를 진행하고, 끝나면 `dfimisc.dfi_init_complete`를 raise합니다. 컨트롤러 측에서 보는 의사 코드는 다음과 같이 단순합니다.

```c
void ddr_controller_init(void) {
    /* 1. 컨트롤러 reset 해제, software reset 풀고 quasi-dynamic 진입 */
    writel(MSTR_INIT, DDRC_MSTR);
    writel(INIT0_PRECKE_POSTCKE, DDRC_INIT0);
    writel(INIT1_RESET_TIME,     DDRC_INIT0 + 0x4);
    writel(MR1MR0_PACKED,        DDRC_INIT0 + 0xC); /* INIT3 */
    writel(MR3MR2_PACKED,        DDRC_INIT0 + 0x10);

    /* 2. PHY 시퀀서 시작 */
    setbits_le32(DDRC_DFIMISC, DFIMISC_DFI_INIT_START);

    /* 3. PHY가 power-up 시퀀스 + MRS + training 완료할 때까지 대기 */
    while (!(readl(DDRC_DFISTAT) & DFISTAT_DFI_INIT_COMPLETE))
        ;

    /* 4. 컨트롤러를 정상 동작 모드로 전환 */
    clrbits_le32(DDRC_DFIMISC, DFIMISC_DFI_INIT_START);
    setbits_le32(DDRC_DFIMISC, DFIMISC_DFI_INIT_COMPLETE_EN);

    /* 5. refresh 활성, self-refresh 끔 */
    writel(0, DDRC_PWRCTL);
}
```

순서가 어긋나면 hang합니다. 예를 들어 `dfi_init_complete_en`을 4번 단계 전에 켜면 PHY가 ready라고 보고하기 전에 컨트롤러가 traffic을 보내려다 멈춥니다. 이 hang은 디버그 UART에 *그 어떤 메시지도 남기지 않습니다*. JTAG로 SRAM의 SPL 상태를 들여다보는 게 유일한 단서입니다.

## 컨트롤러 IP는 두 가지

대부분의 SoC에서 만나는 DDR 컨트롤러 IP는 두 가지입니다.

| IP | 사용 SoC | 특징 |
|----|----------|------|
| Synopsys DWC uMCTL2 | NXP i.MX, ARM SystemReady 다수, Rockchip | 레지스터 수백 개, 별도의 PUB(PHY Utility Block) |
| Cadence DENALI | TI Sitara, 일부 Marvell, Allwinner 일부 | 레지스터 1000개 이상, internal sequencer |

벤더는 보통 *DDR config tool*을 제공합니다. NXP는 GUI 기반 *DDR Tool*을, TI는 *DDR Register Configuration Tool*을, Rockchip은 `.dtsi` 형식의 파라미터 파일을 씁니다. 결과는 *C 헤더* 혹은 *device tree fragment*로 떨어지고, SPL 빌드에 포함됩니다.

```c
/* NXP i.MX8M Mini — DDR4 config (vendor tool 생성 일부) */
struct dram_cfg_param ddrc_cfg[] = {
    { 0x3d400304, 0x1 },        /* dbg1 — disable retry */
    { 0x3d400030, 0x1 },        /* pwrctl — selfref before init */
    { 0x3d400000, 0xa3080020 }, /* mstr — DDR4, 32-bit, 1 rank */
    { 0x3d400064, 0x006180e },  /* rfshtmg — refresh interval */
    { 0x3d4000d0, 0xc00200c5 }, /* init0 — pre/post-CKE 대기 */
    { 0x3d4000d4, 0x9e0000 },   /* init1 — reset 대기 */
    { 0x3d4000dc, 0x340301 },   /* init3 — MR0, MR1 */
    /* ... 수백 줄 ... */
};
```

이 표를 SPL이 한 줄씩 컨트롤러에 씁니다. 표 자체는 *벤더 tool의 출력물*이지, 손으로 작성하는 것이 아닙니다.

## Training 시퀀스의 의미

ZQ calibration, write leveling, read DQ deskew, read gate training은 *PHY가 보드와 chip을 직접 측정해서 보정*하는 단계입니다.

| 단계 | 무엇을 측정하는가 |
|------|-------------------|
| ZQ calibration | 외부 240Ω 저항 기준으로 ODT/Ron 임피던스 보정 |
| Write leveling | clock과 DQS의 위상이 chip에서 정렬되도록 SoC 측 DQS 지연 조정 |
| Read DQ deskew | byte 안 8개 DQ 신호 사이의 skew 제거 |
| Read gate training | DRAM이 보낸 DQS가 SoC에 도달하는 정확한 시점 학습 |
| VRef training (DDR4+) | Vref 전압의 최적점 찾기 (eye 가운데) |

i.MX·STM32MP1·Rockchip은 *DDR firmware blob*을 별도로 가집니다. SPL이 컨트롤러 레지스터를 쓴 뒤, PHY에 firmware를 로드하고, PHY가 trainer code를 자체 실행합니다. SPL은 PHY가 "끝났다"고 알릴 때까지 폴링만 합니다.

```c
/* drivers/ddr/imx/imx8m/ddr_init.c — 단순화 */
void ddr_init(struct dram_timing_info *t) {
    /* 1. PHY firmware 로드 */
    ddr_load_train_firmware(FW_1D_IMAGE);

    /* 2. PHY training 시작 */
    dwc_ddrphy_apb_wr(0xd0000, 0x1);

    /* 3. training 완료 대기 */
    int ret = wait_ddrphy_training_complete();
    if (ret) panic("DDR 1D training failed: %d", ret);

    /* 4. 2D training (eye sweep, DDR4 이상) */
    ddr_load_train_firmware(FW_2D_IMAGE);
    /* ... */
}
```

Training이 실패하면 SPL은 거기서 멈춥니다. 디버그 UART에 "DDR training failed"가 찍히고, 시스템은 죽은 듯 보입니다. *그 줄이 보이는지조차* 확인하지 못하는 경우도 많습니다. JTAG로 SRAM의 SPL 코드를 단계 실행하는 것이 정공법입니다.

## 보드별 timing 파라미터는 어디서 오는가

DRAM chip의 datasheet는 *standard JEDEC 파라미터*를 제공합니다. 보드 설계자는 여기에 *PCB-specific* 정보를 더해 최종 timing을 결정합니다.

```text
chip datasheet → JEDEC speed grade (DDR4-2400, DDR4-3200, …)
                  ↓
보드 설계 (PCB length, decoupling) → 보드별 마진
                  ↓
SoC vendor의 DDR tool → 레지스터 값 산출
                  ↓
SPL의 헤더/DTS에 포함
```

새 보드 bring-up은 거의 항상 *DDR 파라미터 가져오기*부터 시작합니다. [BSP 5장](/blog/embedded/bsp/chapter05-ddr-params)에서 이 부분을 더 깊이 다룹니다. 일반적인 절차는 다음과 같습니다.

1. DRAM chip 부품 번호와 용량을 정합니다.
2. 벤더 DDR tool에 부품 정보와 layout 파일을 입력합니다.
3. tool이 컨트롤러·PHY 레지스터 값을 생성합니다.
4. 생성된 파일을 SPL의 보드 디렉터리에 둡니다.
5. 부트 후 *stress test*(예: NXP `mtest`, U-Boot `mtest`)로 mar진을 확인합니다.

마진이 부족하면 vref·CAS latency·write recovery를 조정해 재training합니다. 양산까지 가는 보드는 *온도 sweep*까지 통과해야 합니다.

### DDR stress test 예시

U-Boot의 `mtest`나 Linux의 `memtester`로 초기 검증을 합니다. 양산 검증에는 NXP `ddr_test` 같은 벤더 도구가 더 철저합니다.

```text
=> mtest 0x40000000 0x80000000 1
Testing 40000000 ... 80000000:
Pattern 5555555555555555  Writing...  Reading...
Tested 1073741824 bytes OK.

=> mtest 0x40000000 0x80000000 10   # 10회 반복
```

Linux에서는 `memtester`가 표준입니다.

```bash
# 1GB 영역을 4회 테스트
$ memtester 1G 4
Loop 1/4:
  Stuck Address       : ok
  Random Value        : ok
  Compare XOR         : ok
  ...
```

stress-ng는 더 다양한 패턴을 제공합니다.

```bash
$ stress-ng --vm 2 --vm-bytes 512M --vm-method all --verify -t 60s
```

## Suspend/resume에서의 재training

DRAM이 *self-refresh*에서 깨어날 때, 일부 training 결과는 그대로 쓸 수 있습니다. 그러나 칩 온도가 크게 바뀌면 read gate 위치가 흔들립니다. 그래서 *resume 시 partial retraining*이 표준입니다.

```text
suspend  → 컨트롤러 self-refresh 모드 진입, training 결과는 PHY 레지스터에 보존
resume   → PHY 깨우기 → DQS gate retraining → ZQ short calibration → 정상 동작
```

이 흐름은 U-Boot보다는 *ATF(BL31)*가 담당하는 경우가 많습니다. PSCI `CPU_SUSPEND`가 들어오면 ATF가 DDR을 self-refresh로 보내고, resume에서 retraining을 돌립니다. U-Boot는 *cold boot 한 번*만 보고, suspend/resume은 ATF + 커널의 책임이 됩니다.

## SPL에서 컨트롤러를 깨우는 코드

i.MX8M 시리즈의 `spl_dram_init`은 컨트롤러·PHY·training을 순서대로 호출합니다.

```c
/* board/freescale/imx8mm_evk/spl.c */
void spl_dram_init(void) {
    /* 1. PLL을 DDR 주파수에 맞춤 */
    ddr_init(&dram_timing);

    /* 2. ECC 모드라면 메모리 zero-fill (scrub) */
    if (ddr_get_ecc_mode())
        ddr_ecc_scrub();

    /* 3. 자가 진단 — 짧은 memtest */
    if (dram_self_test() != 0)
        panic("DRAM self-test failed");
}
```

`spl_dram_init`이 리턴한 직후, SPL은 `board_init_r`로 진입할 준비를 합니다. 메인 U-Boot를 DRAM에 적재하고, stack을 옮기고, jump합니다. 여기까지가 [8장](/blog/embedded/bootloader/chapter08-board-init)에서 본 `board_init_f` 시퀀스의 끝입니다.

## 자주 하는 실수

- **잘못된 부품으로 tool을 돌립니다.** 보드의 DRAM이 마킹과 다른 dual-source 부품인 경우, 파라미터가 안 맞아 training이 종종 실패합니다. 부품을 *현미경으로* 확인하세요.
- **DCD(Device Configuration Data)를 적용하지 않습니다.** i.MX 계열은 boot ROM이 ROM 단계에서 DCD 스크립트로 *외부 DDR controller·IOMUX*를 미리 설정합니다. DCD가 없는 이미지로 부팅하면 SPL이 DDR controller 베이스 주소에 접근하는 그 순간 hang합니다. `mkimage`의 `IMAGE_VERSION 2` 헤더에 DCD가 들어 있는지 `dumpimage`로 확인하세요.
- **ZQ 저항이 잘못 놓였습니다.** ZQ 단자에 240 Ω ±1% 정밀 저항이 *GND로* 풀려 있어야 합니다. 보드 설계자가 47 Ω이나 300 Ω을 잘못 BOM에 넣으면 ZQ calibration이 통과는 하지만 ODT/Ron이 어긋나 *고온에서만* 비트 에러가 납니다. 디버그 시 X-ray로 저항 값을 직접 측정하세요.
- **모드 레지스터 순서를 위반합니다.** JEDEC은 MR2 → MR3 → MR1 → MR0 순으로 MRS write을 요구합니다. MR0을 먼저 쓰면 *DLL reset*이 다른 MR들이 자리 잡기 전에 발생해 unpredictable 상태가 됩니다. 벤더 tool이 보통 올바른 순서를 채워 주지만, 손으로 INIT3/INIT4/INIT6 packing 위치를 바꾸면 사고가 납니다.
- **레지스터 쓰는 순서를 바꿉니다.** 컨트롤러는 *상태 머신*입니다. uMCTL2의 `dfimisc.dfi_init_complete_en`을 너무 일찍 켜면 PHY가 아직 준비 안 된 상태에서 트래픽이 흘러 hang합니다.
- **clock 입력을 잊습니다.** PLL이 lock 안 됐는데 컨트롤러를 깨우면 0Hz 입력으로 동작합니다. 증상은 "PHY가 무응답".
- **VRef를 조정하지 않습니다.** DDR4부터 VRef가 chip 안에 있고 training이 필수입니다. JEDEC 기본값으로 두면 eye가 한쪽으로 치우쳐 corner case에서 비트 에러가 납니다.
- **온도 sweep을 안 합니다.** 25°C에서 동작하지만 -10°C나 70°C에서는 실패하는 보드가 있습니다. 양산 전에 chamber로 sweep을 돌리세요.

## 정리

- DRAM 초기화는 *컨트롤러 레지스터 프로그래밍*과 *PHY training*으로 나뉩니다.
- 레지스터 값은 SoC 벤더의 DDR config tool이 생성합니다. 손으로 쓰지 않습니다.
- Training은 PCB·chip의 전기적 특성을 측정해 sampling 시점을 보정하는 단계입니다.
- i.MX·STM32MP1·Rockchip은 PHY가 *firmware blob*을 실행해 training합니다. SPL은 폴링만 합니다.
- Training이 실패하면 SPL은 그 자리에서 멈춥니다. 디버그 UART와 JTAG가 1차 진단 도구입니다.
- Suspend/resume의 retraining은 보통 ATF의 책임이고, U-Boot는 cold boot만 봅니다.
- 양산 검증은 *온도·시간 sweep*이 끝나야 마칩니다.

## 다음 장 예고

다음 글에서는 *스토리지 부트*를 봅니다. eMMC, SD, SATA, NAND, SPI Flash에서 부트 이미지를 어떻게 읽고, 부트 ROM이 각 미디어에 기대하는 헤더가 무엇인지 정리합니다.

## 관련 항목

- [Ch 8: 보드 초기화](/blog/embedded/bootloader/chapter08-board-init) — `board_init_f`의 중심 작업
- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — DRAM 다음 단계
- [Ch 24: SPL 내부 구조](/blog/embedded/bootloader/chapter24-spl-deep-internals) — SPL이 DDR init을 호출하는 자리
- [Ch 26: DDR PHY training 심화](/blog/embedded/bootloader/chapter26-ddr-training) — write/read leveling·VRef training의 내부 동작
- [Ch 28: Flash 레이아웃](/blog/embedded/bootloader/chapter28-flash-layout) — DDR 파라미터 blob·firmware의 저장 위치
- [BSP Ch 5: DDR 파라미터](/blog/embedded/bsp/chapter05-ddr-params) — 보드 bring-up 관점에서의 DDR
- [JEDEC DDR4 SDRAM Standard](https://www.jedec.org/standards-documents/docs/jesd79-4a)
