---
title: "SVA와 커버리지 — 버그를 발생 지점에서 잡기"
slug: "tools/emulation/driver-cosim/chapter11-sva-coverage"
date: 2026-10-05T09:11:00
description: "SystemVerilog Assertion으로 증상이 아닌 발생 지점에서 실패시키고, 커버리지 구멍이 실리콘 버그로 이어지는 패턴을 정리."
series: "Driver-RTL Co-simulation"
seriesOrder: 11
tags: [sva, assertion, coverage, verification, pre-silicon]
draft: true
topics: ["tools", "tools/emulation"]
---

Ch 10에서는 실패한 신호에서 원인 신호로 waveform을 거슬러 올랐습니다. 이 방법은 확실하지만 늘 *사후*입니다. 증상이 나타난 뒤에야 시작할 수 있고, 원인과 증상 사이가 멀수록 오래 걸립니다.

이 장은 그 거리를 줄이는 두 도구를 다룹니다. **assertion**(설계가 지켜야 할 규칙을 코드로 적어 두고, 깨지는 순간 시뮬레이션을 멈추게 하는 장치)은 버그가 *생긴 그 cycle*에 테스트를 실패시킵니다. **커버리지**(테스트가 설계의 어느 상황을 실제로 지나갔는지 재는 지표)는 아직 아무도 시험하지 않은 곳을 알려 줍니다. 앞의 것은 버그를 빨리 잡게 해 주고, 뒤의 것은 놓친 버그가 어디 숨어 있을지 알려 줍니다.

## 증상과 발생 지점 사이의 거리

버그는 보통 생긴 곳에서 바로 드러나지 않습니다. 잘못된 값 하나가 레지스터에 들어가고, 몇백 cycle 뒤 그 값을 읽은 블록이 엉뚱한 주소로 DMA를 보내고, 다시 몇천 cycle 뒤 드라이버가 타임아웃을 냅니다. 테스트가 실패하는 시점은 마지막 순간이지만, 원인은 훨씬 앞에 있습니다.

![assertion이 줄이는 거리 — assertion이 없으면 원인 발생부터 테스트 실패까지 잘못된 값이 조용히 퍼지고, assertion이 있으면 원인이 발생한 cycle에 바로 실패한다](/images/blog/driver-cosim/diagrams/ch11-assert-distance.svg)

화재에 비유하면 차이가 분명해집니다. 화재 경보기가 없는 건물에서는 불이 다 번진 뒤에야 누군가 연기를 보고 신고합니다. 그때부터 소방관이 발화 지점을 찾으려면 잔해를 뒤져야 합니다. 경보기가 있으면 연기가 처음 피어오른 방에서 바로 울립니다. assertion은 설계 곳곳에 다는 화재 경보기입니다.

SW 엔지니어에게는 낯선 개념이 아닙니다. C의 `assert()`나 리눅스 커널의 `BUG_ON()`, `WARN_ON()`이 같은 역할을 합니다. 차이는 *시간*입니다. 소프트웨어 assertion은 코드가 그 줄을 실행할 때 한 번 검사하지만, 하드웨어 assertion은 매 클럭 에지마다 계속 검사합니다.

| 구분 | SW assertion | HW assertion (SVA) |
|---|---|---|
| 예 | `assert(len > 0)`, `BUG_ON(!dev)` | `assert property (req \|-> ##[1:16] ack)` |
| 검사 시점 | 그 줄이 실행될 때 | 매 클럭 에지 |
| 시간 표현 | 없음 | "몇 cycle 뒤에", "그 사이 계속" 등 |
| 잡는 버그 | 잘못된 인자, 불가능한 상태 | 프로토콜 위반, 타이밍 규칙 위반 |

## SVA 기본 — immediate·concurrent·sequence

**SVA**(SystemVerilog Assertions)는 IEEE 1800 SystemVerilog 표준에 포함된 assertion 문법입니다. 크게 두 종류가 있습니다.

**immediate assertion**은 SW의 `assert()`와 거의 같습니다. 절차 코드 안에서 그 줄이 실행될 때 조건을 한 번 검사합니다. 아래 코드는 DMA 시작 명령이 들어올 때 길이가 0이 아닌지 검사합니다.

```systemverilog
always_ff @(posedge clk) begin
  if (start_cmd) begin
    assert (cfg_len != 0)
      else $error("zero-length DMA start: addr=%h", cfg_src);
    busy <= 1'b1;
  end
end
```

**concurrent assertion**은 시간을 다룹니다. "요청이 오면 1~16 cycle 안에 응답이 와야 한다" 같은 규칙을 표현할 수 있습니다. 아래 코드가 그 규칙을 적었습니다.

```systemverilog
property p_req_ack;
  @(posedge clk) disable iff (!rst_n)   // 리셋 중에는 검사하지 않음
    req |-> ##[1:16] ack;               // req가 1이면 1~16 cycle 안에 ack
endproperty

a_req_ack: assert property (p_req_ack)
  else $error("ack not seen within 16 cycles");
```

여기서 쓰인 기호 몇 개만 익히면 대부분의 assertion을 읽을 수 있습니다.

| 기호 | 뜻 | 읽는 법 |
|---|---|---|
| `\|->` | 같은 cycle에 시작하는 함의 | "왼쪽이 참이면, 지금부터 오른쪽이 성립해야 한다" |
| `\|=>` | 다음 cycle에 시작하는 함의 | "왼쪽이 참이면, 다음 cycle부터 오른쪽이 성립해야 한다" |
| `##n` | n cycle 뒤 | "n cycle 지나서" |
| `##[a:b]` | a~b cycle 사이 어딘가 | "a에서 b cycle 사이에" |
| `$stable(x)` | x가 이전 cycle과 같음 | "x가 안 바뀌었다" |
| `disable iff (c)` | c가 참이면 검사 중단 | "리셋 중에는 따지지 않는다" |

**sequence**는 여러 cycle에 걸친 신호 패턴에 붙인 이름입니다. 복잡한 property를 작은 sequence로 나눠 조립하면, SW에서 함수를 나누듯 읽기 쉬워집니다.

## 인터페이스 프로토콜 assertion

assertion을 어디부터 달지 고민된다면 **블록 사이의 인터페이스**가 가장 좋은 출발점입니다. 블록 내부 로직은 설계자마다 다르지만, 인터페이스 규칙은 스펙에 분명히 적혀 있고 위반하면 양쪽 블록 모두 오동작하기 때문입니다. 아파트 관리 규약처럼, 각 세대 안은 자유지만 공용 복도에서 지킬 규칙은 정해져 있는 것과 비슷합니다.

AXI 같은 valid/ready 핸드셰이크(보내는 쪽이 valid로 "데이터 있음"을 알리고, 받는 쪽이 ready로 "받을 수 있음"을 알리는 방식)에는 널리 쓰이는 규칙이 있습니다. 보내는 쪽이 valid를 올렸으면 ready가 올 때까지 valid를 내리거나 데이터를 바꾸면 안 됩니다. 아래 assertion이 그 규칙을 검사합니다.

```systemverilog
// valid를 올린 뒤 ready를 받기 전까지는 valid와 data를 유지해야 한다
a_valid_hold: assert property (
  @(posedge clk) disable iff (!rst_n)
    (valid && !ready) |=> (valid && $stable(data))
) else $error("valid dropped or data changed before ready");
```

이런 인터페이스 assertion은 한 번 만들어 두면 같은 프로토콜을 쓰는 모든 블록에 재사용할 수 있습니다. SW 엔지니어 입장에서도 이득이 있습니다. 드라이버가 BFM(Ch 6)을 통해 버스를 흔들 때 프로토콜을 어기면, 드라이버 쪽 실수인지 RTL 쪽 실수인지를 assertion 메시지가 바로 알려 줍니다.

Verilator로 SVA를 돌리려면 `--assert` 옵션을 켭니다. Verilator가 지원하는 SVA 문법 범위는 상용 시뮬레이터보다 좁고 버전마다 넓어지고 있으니, 복잡한 property를 쓰기 전에 쓰는 버전의 문서에서 지원 여부를 확인합니다.

## 커버리지 — 테스트가 지나가지 않은 곳

assertion은 *지나간 곳*의 규칙 위반을 잡습니다. 그런데 테스트가 아예 지나가지 않은 곳의 버그는 assertion이 있어도 잡히지 않습니다. 화재 경보기가 있어도, 아무도 그 방에 불을 켜 본 적이 없다면 경보기가 제대로 동작하는지조차 모릅니다. 그래서 *어디를 지나갔는지*를 재는 커버리지가 필요합니다.

커버리지는 크게 두 종류입니다.

- **코드 커버리지:** RTL의 어떤 줄, 어떤 분기, 어떤 신호 토글이 실행됐는지 셉니다. 도구가 자동으로 재 주므로 손이 거의 안 갑니다. Verilator도 `--coverage` 옵션과 `verilator_coverage` 도구로 줄과 토글 커버리지를 지원합니다.
- **기능 커버리지:** "4KB 경계 전송 직후 바로 다음 요청" 같은 *의미 있는 상황*을 사람이 정의하고, 그 상황이 일어났는지 셉니다. 손이 많이 가지만 진짜 버그와 가까운 지표입니다.

코드 커버리지 100%는 생각보다 쉽게 나옵니다. 모든 줄이 한 번씩 실행돼도, *특정 조합*은 한 번도 안 일어났을 수 있기 때문입니다. 시험 공부에 비유하면, 교과서의 모든 페이지를 한 번씩 펼쳐 본 것(코드 커버리지)과 기출 유형을 모두 풀어 본 것(기능 커버리지)의 차이입니다.

기능 커버리지는 보통 두 축 이상을 **교차**(cross)해서 정의합니다. 아래 그림은 Ch 9의 DMA 예시에서 전송 길이와 다음 요청까지의 간격을 교차한 커버리지 표입니다.

![교차 커버리지 — 전송 길이(짧은·중간·4KB 경계)와 다음 요청 간격(즉시·짧게·길게)의 3×3 표에서 4KB 경계 전송 직후 즉시 요청하는 칸만 한 번도 돌지 않은 그림](/images/blog/driver-cosim/diagrams/ch11-coverage-holes.svg)

이 표를 SystemVerilog covergroup으로 적으면 아래와 같습니다. 각 축의 구간(bin)을 정의하고, 두 축을 교차시킵니다.

```systemverilog
covergroup cg_dma @(posedge clk iff start_cmd);
  cp_len: coverpoint cfg_len {
    bins small_len = {[1:255]};
    bins mid_len   = {[256:4031]};
    bins near_4k   = {[4032:4096]};      // 4KB 경계 근처
  }
  cp_gap: coverpoint gap_cycles {        // 이전 완료부터 이번 시작까지
    bins immediate = {0};
    bins short_gap = {[1:15]};
    bins long_gap  = {[16:$]};
  }
  x_len_gap: cross cp_len, cp_gap;       // 3 × 3 = 9칸
endgroup
```

covergroup 지원은 시뮬레이터마다 차이가 큽니다. Verilator는 covergroup 지원이 제한적이라, 오픈소스 흐름에서는 `cover property`로 개별 상황을 세거나 CocoTB 쪽 커버리지 라이브러리(cocotb-coverage 등)로 Python에서 같은 표를 만드는 방법도 씁니다.

## 커버리지 구멍이 실리콘 버그가 되는 패턴

커버리지 표에서 빈칸이 보이면 거기에 버그가 있다는 뜻은 아닙니다. 다만 실리콘에서 발견되는 버그는 이상할 만큼 비슷한 빈칸에서 나옵니다. 경험적으로 자주 보이는 패턴은 다섯 가지입니다.

1. **경계값:** 최댓값, 최솟값, 4KB 페이지 경계, 카운터가 한 바퀴 도는 순간입니다. 랜덤 테스트는 경계를 거의 맞히지 못합니다.
2. **동시 이벤트:** 같은 cycle에 두 사건이 겹치는 경우입니다. Ch 9의 set/clear 충돌이 여기에 속합니다.
3. **도중의 사건:** 리셋 도중의 요청, 저전력 진입 도중의 인터럽트, 전송 도중의 설정 변경입니다. 테스트는 보통 "정상 상태에서 시작해서 정상 상태로 끝나는" 시나리오만 짭니다.
4. **오류 경로:** 버스 오류 응답, ECC 에러, 타임아웃 같은 경로입니다. 정상 경로보다 훨씬 덜 실행됩니다.
5. **설정 조합:** 레지스터 설정 여러 개의 특정 조합입니다. 조합 수가 폭발적으로 늘어나서 다 돌릴 수 없습니다.

이 다섯 패턴을 커버리지 항목으로 미리 정의해 두면, 빈칸이 곧 "다음에 쓸 테스트 목록"이 됩니다. 반대로 커버리지 100%가 버그 0을 뜻하지는 않는다는 점도 기억해야 합니다. 커버리지는 *정의한 상황*만 재기 때문에, 아무도 떠올리지 못한 상황은 표에 칸 자체가 없습니다.

## 작은 예시 — Ch 9의 버그를 미리 잡았다면

Ch 9의 DMA 인터럽트 누락은 FPGA에서 3시간 스트레스 테스트로 겨우 발견됐습니다. assertion과 커버리지가 있었다면 어땠을지 따져 보겠습니다.

먼저 상태 비트의 우선순위 규칙을 assertion으로 적습니다. 스펙에 "set과 clear가 동시에 오면 set이 우선한다"고 적혀 있다면, 그 문장을 그대로 코드로 옮깁니다. 같은 상황이 몇 번 일어났는지 세는 `cover property`도 함께 둡니다.

```systemverilog
// 스펙: 같은 cycle에 set과 clear가 오면 상태 비트는 1로 남는다
a_set_wins: assert property (
  @(posedge clk) disable iff (!rst_n)
    (set_done && clr_done) |=> irq_stat[0]
) else $error("clear won over set on collision");

// 이 상황이 테스트에서 실제로 일어났는지 센다
c_collision: cover property (
  @(posedge clk) disable iff (!rst_n) set_done && clr_done
);
```

이 assertion을 단 채 기존 회귀 테스트를 돌렸는데 `c_collision`이 0회였다면, assertion은 실패하지 않았지만 *검사할 기회 자체가 없었습니다*. 커버리지 보고서에 빈칸으로 드러나니, 누군가 "완료 직후 바로 다음 요청을 보내는 테스트"를 추가하게 됩니다. 그 테스트가 돌자마자 `a_set_wins`가 정확히 충돌한 cycle에서 실패합니다. 3시간짜리 FPGA 테스트가 몇 초짜리 시뮬레이션으로 바뀌는 셈입니다.

## 실제 사례 — 놓친 조합 하나의 비용

커버리지 구멍이 얼마나 비쌀 수 있는지 보여 주는 대표 사례가 1994년 Intel Pentium의 FDIV 버그입니다. 부동소수점 나눗셈 회로가 쓰는 조회 테이블에 일부 항목이 빠져 있어서, 특정 피연산자 조합에서만 나눗셈 결과가 조금 틀렸습니다. 대부분의 입력에서는 정확했기 때문에 일반적인 테스트로는 드러나지 않았고, 한 수학자가 계산 결과를 검증하다 발견했습니다.

Intel은 결국 칩 교체 프로그램을 시행했고, 1995년 초 이 문제로 약 4억 7,500만 달러의 비용을 회계에 반영했습니다. 이후 Intel이 부동소수점 유닛 검증에 형식 검증(formal verification, 모든 입력에 대해 수학적으로 성질을 증명하는 방법)을 적극적으로 도입했다는 이야기는 하드웨어 검증 분야에서 자주 인용됩니다. 테스트로 모든 조합을 돌릴 수 없다면, 적어도 어떤 조합을 돌렸고 어떤 조합을 안 돌렸는지는 알아야 한다는 교훈을 남겼습니다.

## 자주 하는 실수

- **assertion을 증상 쪽에만 답니다.** "타임아웃이 나면 안 된다"는 assertion은 테스트 실패와 다를 바 없습니다. 원인에 가까운 규칙(우선순위, 핸드셰이크)에 달아야 거리가 줄어듭니다.
- **리셋 중 검사를 끄지 않습니다.** `disable iff (!rst_n)`가 없으면 리셋 구간의 정상적인 X나 임시 값 때문에 assertion이 거짓으로 실패합니다.
- **assertion이 실패하지 않으면 안심합니다.** 조건이 한 번도 참이 된 적 없는 assertion은 실패할 수가 없습니다. 짝이 되는 `cover property`로 실제로 검사가 일어났는지 확인합니다.
- **코드 커버리지만 봅니다.** 줄 커버리지 100%는 조합을 보장하지 않습니다. 경계값과 동시 이벤트는 기능 커버리지로 따로 정의합니다.
- **커버리지 목표를 숫자로만 관리합니다.** "95% 달성"보다 "남은 5%가 무엇인지 설명할 수 있는가"가 더 중요한 질문입니다.

## 정리

- assertion은 설계 규칙을 코드로 적어, 규칙이 깨지는 바로 그 cycle에 시뮬레이션을 멈춥니다. 원인과 증상 사이의 거리가 0이 됩니다.
- SVA는 IEEE 1800 표준 문법입니다. immediate assertion은 SW의 `assert()`와 같고, concurrent assertion은 `|->`, `|=>`, `##[a:b]`로 시간 규칙을 표현합니다.
- assertion은 블록 사이 인터페이스 규칙부터 다는 것이 가장 효과적이고, 한 번 만들면 재사용됩니다.
- 커버리지는 테스트가 *지나간 곳*을 잽니다. 코드 커버리지는 자동이지만 얕고, 기능 커버리지는 손이 가지만 버그에 가깝습니다.
- 실리콘 버그는 경계값, 동시 이벤트, 도중의 사건, 오류 경로, 설정 조합이라는 빈칸에서 자주 나옵니다.
- assertion에는 짝이 되는 `cover property`를 두어 실제로 검사가 일어났는지 확인합니다.
- 커버리지 100%는 버그 0이 아닙니다. 정의하지 않은 상황은 표에 칸 자체가 없습니다.

## 다음 장 예고

다음 장에서는 시뮬레이션을 떠나 **FPGA 프로토타입**으로 갑니다. 시뮬레이션에서는 통과했는데 보드에서는 죽는 상황, 그리고 그 원인이 되는 초기값, 클럭 도메인, 타이밍 차이를 다룹니다.

## 관련 항목

- [Ch 10: Waveform 디버깅 실전](/blog/tools/emulation/driver-cosim/chapter10-waveform-debug) — assertion이 없을 때의 사후 역추적
- [Ch 12: FPGA 프로토타입 디버깅](/blog/tools/emulation/driver-cosim/chapter12-fpga-prototype-debug)
- [Ch 6: C BFM](/blog/tools/emulation/driver-cosim/chapter06-bfm) — 프로토콜 assertion과 짝을 이루는 버스 어댑터
- [Ch 7: UVM C Reference Model](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model) — 검증 환경 안의 기준 모델
- [Ch 15: Pre-silicon 실패 triage](/blog/tools/emulation/driver-cosim/chapter15-failure-triage) — assertion 실패를 분류하는 흐름
