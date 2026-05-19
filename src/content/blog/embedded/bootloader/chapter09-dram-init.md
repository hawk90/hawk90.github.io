---
title: "Ch 9: DRAM 초기화 — controller programming과 training"
date: 2026-05-09T09:00:00
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

DRAM은 단순히 "전원 켜고 읽기/쓰기"가 안 되는 디바이스입니다. JEDEC 사양은 power-on부터 정상 동작까지 *수십 개*의 step을 정의합니다.

```text
1. PLL lock                — DDR clock 안정화
2. Controller reset 해제   — uMCTL2/DENALI 등 IP 깨우기
3. PHY 초기화              — DDR PHY (Synopsys DWC, Cadence) 깨우기
4. Mode Register Set (MRS) — DRAM chip에 burst length, CAS latency 등 알림
5. ZQ calibration          — 출력 임피던스 조정
6. Write leveling          — 각 byte lane의 DQS 정렬
7. Read leveling           — read 데이터의 sampling window 찾기
8. ECC scrub               — ECC 모드면 메모리를 0으로 채워 syndrome 초기화
9. 정상 동작 모드 진입     — refresh, self-refresh 활성화
```

이 시퀀스 중 5~7번이 *training* 단계입니다. DRAM 칩과 SoC 사이의 PCB 트레이스 길이, 임피던스, 노이즈를 보고 PHY가 자동으로 sampling 시점을 조정합니다.

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
- [BSP Ch 5: DDR 파라미터](/blog/embedded/bsp/chapter05-ddr-params) — 보드 bring-up 관점에서의 DDR
- [JEDEC DDR4 SDRAM Standard](https://www.jedec.org/standards-documents/docs/jesd79-4a)
