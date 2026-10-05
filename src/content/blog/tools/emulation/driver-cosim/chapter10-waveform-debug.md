---
title: "Waveform 디버깅 실전 — 증상에서 원인 신호까지 거슬러 오르기"
slug: "tools/emulation/driver-cosim/chapter10-waveform-debug"
date: 2026-10-05T09:10:00
description: "Verilator trace·FST dump 범위 전략과 GTKWave/Surfer로 실패 지점에서 원인 신호를 역추적하는 실전 흐름."
series: "Driver-RTL Co-simulation"
seriesOrder: 10
tags: [waveform, verilator, fst, gtkwave, pre-silicon]
draft: true
topics: ["tools", "tools/emulation"]
---

Ch 9의 마지막 단계에서 DMA 인터럽트 누락의 원인을 waveform에서 찾았습니다. 그때는 결론만 보여 드렸습니다. 이 장은 그 과정을 처음부터 따라갑니다. **waveform**(시간에 따른 신호 값의 변화를 기록한 파일)을 얼마나, 어떻게 남길지 정하는 법과, 실패한 신호에서 원인 신호로 거슬러 오르는 법을 다룹니다.

waveform 읽기는 HW 엔지니어만의 기술처럼 보이지만, 드라이버를 co-simulation으로 검증하는 SW 엔지니어에게도 필수입니다. 드라이버가 쓴 레지스터 값이 RTL 안에서 어떻게 퍼지는지 보는 유일한 창이기 때문입니다. 그래서 이 장은 양쪽이 같은 화면을 보며 이야기할 수 있는 수준을 목표로 합니다.

## 왜 waveform이 커지고 느려지나

처음 co-simulation을 돌리면 대부분 모든 신호를 처음부터 끝까지 기록합니다. 짧은 테스트에서는 문제가 없습니다. 그런데 테스트가 길어지고 설계가 커지면 waveform 파일이 디스크를 가득 채우고, 시뮬레이션 자체도 눈에 띄게 느려집니다. 이 장의 첫 번째 주제는 그 이유를 이해하고 기록 범위를 줄이는 법입니다.

waveform 파일의 크기는 대략 *기록하는 신호 수*와 *신호가 바뀌는 횟수*의 곱에 비례합니다. 클럭처럼 매 cycle 바뀌는 신호가 수만 개 있는 설계라면, 몇 초 분량의 시뮬레이션만으로도 파일이 감당하기 어려울 만큼 커집니다. 게다가 시뮬레이터는 매 cycle 바뀐 값을 파일 형식에 맞춰 쓰느라 계산 시간 일부를 기록에 씁니다.

건물 CCTV에 비유하면 이해가 쉽습니다. 모든 카메라의 영상을 24시간 고화질로 영구 보관하면 저장 장치가 금방 찹니다. 그래서 실제 건물은 사건이 난 시간대와 관련 구역의 영상만 꺼내 봅니다. waveform도 같은 원칙으로 다룹니다.

SW와 HW 엔지니어가 이 문제를 느끼는 방식도 다릅니다.

| 관점 | 겪는 증상 | 원하는 것 |
|---|---|---|
| SW 엔지니어 | 테스트 한 번이 너무 오래 걸리고, CI 디스크가 찬다 | 빠른 반복, 실패했을 때만 기록 |
| HW 엔지니어 | 파일을 열기만 해도 뷰어가 버벅인다 | 원인 근처 신호를 빠짐없이 |

두 요구는 충돌하지 않습니다. *실패 근처만, 관련 블록만* 기록하면 둘 다 만족합니다.

## dump 범위 전략 — 시간창·계층·신호 선택

기록 범위를 줄이는 축은 두 가지입니다. 하나는 **시간**이고, 다른 하나는 **계층**(설계 안의 모듈 트리에서 어느 가지까지 볼지)입니다. 두 축을 함께 줄이면 파일이 가장 작아집니다.

![dump 범위 전략 — 전체 구간·전체 신호, 시간창만, 의심 계층만, 시간창과 계층을 함께 줄인 경우를 막대 길이와 두께로 비교한 그림](/images/blog/driver-cosim/diagrams/ch10-dump-window.svg)

시간을 줄이는 가장 확실한 방법은 **두 번 돌리기**입니다. 첫 번째는 기록 없이 빠르게 돌려 실패 시각만 알아냅니다. 시뮬레이션은 같은 seed(난수 생성의 시작값)로 돌리면 매번 똑같이 진행되므로, 두 번째 실행에서 실패 직전 구간만 기록하면 됩니다. 영화에서 범인이 나온 장면 근처로 되감아 다시 보는 것과 비슷합니다.

계층을 줄일 때는 의심 블록과 그 블록에 신호를 넣어 주는 바로 옆 블록까지만 기록합니다. 처음부터 너무 좁히면 원인이 기록 밖에 있을 수 있으니, 의심 블록 하나와 그 인터페이스 정도로 시작해 필요하면 넓힙니다.

SystemVerilog 테스트벤치에서는 표준 시스템 태스크로 두 축을 모두 제어할 수 있습니다. 아래 코드는 DMA 블록 아래만 기록하되, 실패 직전 구간에서만 기록을 켜는 예입니다.

```systemverilog
module tb;
  // FAIL_T는 첫 번째 실행에서 알아낸 실패 시각, WIN은 그 앞으로 볼 구간
  parameter longint FAIL_T = 1_843_200;
  parameter longint WIN    = 20_000;

  initial begin
    $dumpfile("wave.vcd");
    $dumpvars(0, tb.dut.u_dma);   // 0 = u_dma 아래 모든 계층
    $dumpoff;                     // 처음에는 기록하지 않음
    #(FAIL_T - WIN) $dumpon;      // 실패 직전부터 기록
    #(WIN + 1_000)  $finish;
  end
endmodule
```

`$dumpvars`, `$dumpon`, `$dumpoff`는 Verilog 표준(IEEE 1364)부터 있던 시스템 태스크라 대부분의 시뮬레이터가 지원합니다. 다만 Verilator처럼 C++ 하네스로 기록을 제어하는 환경에서는 다음 절처럼 하네스 쪽에서 같은 일을 합니다.

## Verilator --trace와 FST

Ch 3에서 Verilator가 `--trace`면 VCD, `--trace-fst`면 FST 형식으로 waveform을 남긴다고 했습니다. **VCD**(Value Change Dump)는 IEEE 1364에 정의된 텍스트 형식이라 어떤 도구로도 열 수 있지만 파일이 큽니다. **FST**는 GTKWave 프로젝트가 만든 압축 바이너리 형식이라 파일이 훨씬 작습니다. 대신 압축하는 데 CPU 시간이 들기 때문에, 기록 범위를 줄이는 전략은 FST에서도 여전히 필요합니다.

아래 하네스는 Ch 8의 루프에 시간창 조건 하나를 더한 형태입니다. 기록 객체는 처음부터 연결해 두고, 실제로 파일에 쓰는 `dump()`만 시간창 안에서 호출합니다.

```cpp
#include "Vtop.h"
#include "verilated.h"
#include "verilated_fst_c.h"

int main(int argc, char** argv) {
    auto ctx = std::make_unique<VerilatedContext>();
    ctx->commandArgs(argc, argv);
    ctx->traceEverOn(true);
    auto top = std::make_unique<Vtop>(ctx.get());

    VerilatedFstC tfp;
    top->trace(&tfp, 99);              // 계층 깊이 99 = 사실상 전부
    tfp.open("wave.fst");

    const uint64_t dump_from = std::stoull(getenv("DUMP_FROM") ? getenv("DUMP_FROM") : "0");
    while (!ctx->gotFinish()) {
        top->clk = !top->clk;
        top->eval();
        ctx->timeInc(1);
        if (ctx->time() >= dump_from)  // 시간창 밖에서는 쓰지 않는다
            tfp.dump(ctx->time());
    }
    tfp.close();
    return 0;
}
```

계층을 줄이고 싶다면 `top->trace()`의 깊이 인자를 줄이거나, Verilator의 `--trace-depth` 옵션을 씁니다. 신호 단위로 빼고 싶을 때는 RTL에 Verilator 전용 주석(`/*verilator tracing_off*/`)을 넣는 방법도 있습니다. 세부 동작은 Verilator 버전마다 조금씩 다르니 쓰는 버전의 문서를 확인합니다.

파일을 여는 뷰어로는 오픈소스인 **GTKWave**가 오래 쓰여 왔고, 최근에는 Rust로 만든 오픈소스 뷰어 **Surfer**도 쓰입니다. 둘 다 VCD와 FST를 열 수 있습니다. 상용 시뮬레이터를 쓰는 회사라면 벤더의 디버거가 같은 역할을 합니다.

## 증상 신호에서 원인 신호로 역추적

waveform을 열면 신호가 수천 개 보입니다. 처음 보는 사람은 어디서부터 봐야 할지 막막합니다. 여기서 쓰는 방법은 단순합니다. **잘못된 값이 보이는 신호에서 시작해, 그 값을 만든 신호를 한 칸씩 거슬러 올라갑니다.** 강물이 오염됐을 때 하류에서 상류로 거슬러 올라가며 오염원을 찾는 것과 같습니다.

![역추적 — irq 출력이 1이 되지 않는 증상에서 irq_stat[0]으로, 다시 set 경로와 clear 경로로 거슬러 올라가 같은 cycle의 우선순위 문제를 찾는 그림](/images/blog/driver-cosim/diagrams/ch10-backtrace.svg)

한 칸을 거슬러 오를 때마다 세 가지를 확인합니다.

1. **이 신호는 어디서 값을 받나?** RTL 코드에서 이 신호에 값을 쓰는 `assign`이나 `always` 블록을 찾습니다. 이 블록에 들어가는 신호들이 다음 후보입니다. 많은 뷰어와 상용 디버거에 신호의 *driver*(그 신호에 값을 쓰는 로직)를 따라가는 기능이 있습니다.
2. **입력 중 어느 것이 이상한가?** 후보 신호들의 값을 같은 시각에 놓고, 스펙이나 설계 의도와 다른 값을 찾습니다.
3. **입력이 모두 정상인데 출력이 이상한가?** 그렇다면 이 블록의 로직이 원인입니다. 역추적은 여기서 끝납니다.

SW 엔지니어에게 가장 어려운 부분은 *드라이버의 어느 동작이 waveform의 어느 시각에 해당하는지* 찾는 일입니다. 드라이버 로그에 시뮬레이션 시각을 함께 찍어 두면 이 문제가 사라집니다. 아래 매크로는 하네스가 제공하는 시각 함수를 이용해 로그마다 시각을 남깁니다.

```c
/* 하네스가 ctx->time()을 돌려주는 함수를 제공한다고 가정 */
extern uint64_t cosim_time(void);

#define CLOG(fmt, ...)                                              \
    fprintf(stderr, "[t=%llu] " fmt "\n",                           \
            (unsigned long long)cosim_time(), ##__VA_ARGS__)

void dma_isr(struct dma_dev *d)
{
    uint32_t stat = readl(d->base + DMA_IRQ_STAT);
    CLOG("isr enter stat=0x%08x", stat);
    writel(stat, d->base + DMA_IRQ_STAT);     /* write-1-to-clear */
    CLOG("isr clear done");
}
```

로그에서 `[t=1843150] isr clear done`을 보면 뷰어의 커서를 1843150으로 옮기면 됩니다. 이 습관 하나로 SW와 HW 엔지니어가 같은 시각을 가리키며 대화할 수 있습니다.

## Gate-level 시뮬레이션과 X 전파

RTL 시뮬레이션에서 통과한 설계가 합성 뒤에 실패하는 경우가 있습니다. 대표적인 원인이 **X**입니다. X는 4-state 시뮬레이션(0, 1, X, Z 네 값을 쓰는 방식)에서 "값을 모름"을 뜻합니다. 리셋하지 않은 플립플롭(1비트를 저장하는 회로)은 전원이 들어온 직후 X로 시작합니다.

문제는 RTL 시뮬레이션이 X를 너그럽게 다룬다는 점입니다. Verilog의 `if` 문은 조건이 X면 거짓으로 보고 `else`로 갑니다. 이를 **X-optimism**이라고 부릅니다. 실제 회로에서는 0일 수도 1일 수도 있는 값을, 시뮬레이터가 "아마 0이겠지" 하고 넘어가는 셈입니다. 내용물을 모르는 봉인된 봉투를 빈 봉투라고 가정하는 것과 같습니다.

아래 코드는 리셋 없는 플립플롭이 X-optimism 때문에 RTL 시뮬레이션에서 숨는 전형적인 모습입니다.

```systemverilog
// busy에 리셋이 없다. 전원 투입 직후 busy = X
always_ff @(posedge clk)
  if (start) busy <= 1'b1;
  else if (done) busy <= 1'b0;

// RTL 시뮬레이션: busy가 X면 if가 거짓으로 처리되어 IDLE로 간다
// 실제 회로: busy가 1로 깨어나면 WAIT로 가서 영영 멈출 수 있다
always_comb
  if (busy) state_n = WAIT;
  else      state_n = IDLE;
```

이런 버그를 잡는 방법이 **GLS**(Gate-Level Simulation, 합성이 끝난 게이트 넷리스트를 시뮬레이션하는 것)입니다. 게이트 수준에서는 X가 논리 게이트를 따라 그대로 퍼지기 때문에, 초기화 누락이 출력의 X로 드러납니다. 대신 GLS는 RTL 시뮬레이션보다 훨씬 느려서 보통 리셋과 부팅 초반 같은 핵심 시나리오에만 씁니다.

Verilator는 2-state 시뮬레이터라서 X를 표현하지 않습니다. 대신 초기값을 무작위로 넣는 옵션(`--x-initial unique`와 실행 시 `+verilator+rand+reset+2` 같은 조합)을 제공합니다. 같은 테스트를 서로 다른 무작위 초기값으로 여러 번 돌리면, 초기값에 따라 결과가 바뀌는 플립플롭을 찾을 수 있습니다. 옵션 이름과 동작은 Verilator 문서에서 쓰는 버전 기준으로 확인합니다.

## 자주 만나는 함정 — 초기화·클럭 도메인

waveform을 읽다 보면 같은 실수를 반복하기 쉽습니다. 특히 *클럭 에지에서 값을 어떻게 읽는가*와 *리셋이 충분했는가*에서 혼란이 많습니다.

- **에지 위의 값을 잘못 읽습니다.** 플립플롭은 클럭 에지 *직전* 값을 받아 에지 *직후* 출력을 바꿉니다. 뷰어 커서를 에지에 정확히 두면 어느 쪽 값을 보는지 헷갈리기 쉽습니다. 에지보다 조금 앞에 커서를 두고 "이 값이 다음 cycle에 반영된다"고 읽는 습관을 들입니다.
- **리셋을 너무 짧게 겁니다.** 일부 블록은 리셋이 여러 cycle 유지돼야 내부 상태가 정리됩니다. 테스트벤치가 리셋을 한 cycle만 걸면 그 블록의 초기 상태가 들쭉날쭉해집니다.
- **클럭 도메인을 섞어서 봅니다.** 서로 다른 클럭으로 움직이는 두 블록의 신호를 한 화면에 놓으면, 한쪽에서는 이미 바뀐 값이 다른 쪽에서는 아직 안 바뀐 것처럼 보입니다. 각 신호가 어느 클럭에 맞춰 움직이는지 먼저 확인합니다. 클럭 도메인 경계 문제는 Ch 12에서 다시 다룹니다.
- **시뮬레이션 시각 단위를 혼동합니다.** 하네스의 `timeInc(1)`이 실제로 몇 ns에 해당하는지는 RTL의 timescale 설정에 따라 다릅니다. 드라이버 로그의 시각과 뷰어의 시각 단위가 같은지 확인합니다.

## 작은 예시 — Ch 9의 버그를 waveform으로 확정하기

Ch 9에서 줄여 둔 재현 시나리오(긴 전송 직후 짧은 전송)를 이 장의 방법으로 확정해 보겠습니다.

첫 번째 실행은 기록 없이 돌려 실패 시각을 얻습니다. 드라이버 로그의 마지막 줄이 `[t=1843150] isr clear done`이고, 그 뒤 타임아웃으로 실패했다고 합시다. 두 번째 실행은 그 시각 직전 구간만 기록합니다.

```bash
# 1회차: 기록 없이 실패 시각만 확인
./obj_dir/Vtop +seed=4242 | tee run1.log
# 2회차: 실패 직전 2만 단위 시간만 FST로 기록
DUMP_FROM=1823150 ./obj_dir/Vtop +seed=4242
gtkwave wave.fst &
```

뷰어에서 커서를 1843150 근처에 두고 `irq` 출력, `irq_stat[0]`, 그리고 `irq_stat`에 값을 쓰는 두 경로(`dma_done`에서 오는 set, 버스 쓰기에서 오는 clear)를 나란히 띄웁니다. 그러면 같은 cycle에 set과 clear가 함께 1이 되고, 다음 cycle에 `irq_stat[0]`이 0으로 남는 장면이 보입니다. RTL 코드를 열어 보면 `if (clear) ... else if (set) ...` 순서로 쓰여 있어 clear가 우선합니다. 역추적의 세 번째 질문, 즉 "입력은 정상인데 출력이 이상한가"에 "예"라고 답할 수 있으니 이 블록의 로직이 원인입니다.

수정은 set이 이기도록 우선순위를 바꾸는 것입니다. 같은 seed로 다시 돌려 통과하는지 확인하면 재현 조건이 그대로 회귀 테스트가 됩니다.

## 실제 사례 — 표준 형식이 만든 생태계

waveform 디버깅이 회사와 도구를 넘나들 수 있는 이유는 형식이 표준화돼 있기 때문입니다. VCD가 IEEE 1364 Verilog 표준에 들어가 있어서, 어떤 시뮬레이터가 만든 파일이든 다른 뷰어로 열 수 있습니다. 오픈소스 RTL 프로젝트들이 CI에서 실패한 테스트의 waveform을 산출물로 올려 두고, 기여자가 자기 PC의 GTKWave나 Surfer로 열어 보는 흐름이 가능한 것도 이 덕분입니다.

FST는 표준은 아니지만 GTKWave와 Verilator가 함께 지원하면서 오픈소스 흐름의 사실상 기본 형식이 됐습니다. Ch 8의 CI 파이프라인이 실패 시 `wave.fst`를 아티팩트로 남기도록 한 것도 같은 맥락입니다.

## 정리

- waveform 크기는 *신호 수 × 변화 횟수*에 비례하고, 기록 자체가 시뮬레이션을 느리게 만듭니다.
- 기록 범위는 **시간**과 **계층** 두 축으로 줄입니다. 같은 seed로 두 번 돌려 실패 직전만 기록하는 방법이 가장 확실합니다.
- Verilator는 `--trace`(VCD)와 `--trace-fst`(FST)를 지원하고, 하네스에서 `dump()` 호출 시점으로 시간창을 제어합니다.
- 역추적은 잘못된 값에서 시작해 그 값을 만든 신호로 한 칸씩 거슬러 오릅니다. 입력이 정상인데 출력이 이상한 블록이 원인입니다.
- 드라이버 로그에 시뮬레이션 시각을 찍어 두면 SW와 HW가 같은 시각을 가리키며 대화할 수 있습니다.
- RTL 시뮬레이션의 X-optimism은 초기화 누락을 숨깁니다. GLS나 무작위 초기값 반복 실행으로 드러냅니다.
- 클럭 에지 위의 값, 리셋 길이, 클럭 도메인, 시각 단위를 혼동하지 않도록 주의합니다.

## 다음 장 예고

waveform 역추적은 증상이 나타난 *뒤에* 시작됩니다. 다음 장에서는 규칙이 깨지는 바로 그 cycle에 테스트를 멈추게 하는 **SVA**(SystemVerilog Assertion)와, 테스트가 한 번도 지나가지 않은 곳을 찾는 **커버리지**를 다룹니다.

## 관련 항목

- [Ch 9: Pre-silicon 검증 플랫폼 지도](/blog/tools/emulation/driver-cosim/chapter09-presilicon-platform-map) — 이 장의 예시가 시작된 곳
- [Ch 11: SVA와 커버리지](/blog/tools/emulation/driver-cosim/chapter11-sva-coverage)
- [Ch 3: Verilator](/blog/tools/emulation/driver-cosim/chapter03-verilator) — `--trace`와 하네스 기본
- [Ch 8: End-to-End Driver + RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — 실패 시 FST를 남기는 CI
- [Embedded Debugging Ch 15: 죽기 직전의 실행 흐름](/blog/tools/debugging/embedded/chapter15-trace-before-death) — 실리콘에서 waveform 대신 쓰는 trace
