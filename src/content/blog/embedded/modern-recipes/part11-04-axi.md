---
title: "AXI 인터페이스 — AXI4·AXI4-Lite·AXI-Stream 비교"
slug: "embedded/modern-recipes/part11-04-axi"
date: 2026-04-20T09:03:00
description: "AXI4·AXI4-Lite·AXI-Stream의 차이를 Arm IHI 0022 원문으로 정리하고, AXI4-Lite slave RTL·4 KB burst 분할·outstanding 모델을 Icarus Verilog와 C로 직접 돌려 봅니다. Vitis HLS pragma와 Zynq UltraScale+ PS-PL 포트는 AMD UG1399·UG1085 기준입니다."
series: "Modern Embedded Recipes"
seriesOrder: 126
tags: [recipes, axi, axi-stream, amba, fpga]
topics: ["embedded"]
---

## 한 줄 요약

> **"AXI는 control은 AXI4-Lite, memory는 AXI4, streaming은 AXI-Stream으로 나눠 쓰는 인터페이스 묶음입니다."** 셋 다 VALID/READY handshake 위에 서 있다는 것을 알면 같은 가족이라는 게 보입니다.

## 어떤 상황에서 쓰나

Zynq 같은 SoC FPGA에서 Arm 코어(PS)와 FPGA fabric(PL)을 잇는 표준 인터페이스가 AXI입니다. AMD UG1085(Zynq UltraScale+ TRM, v2.6) Table 18의 PS-PL 인터페이스(7행, 포트 12개)가 모두 AXI 계열입니다. Vitis HLS도 Vitis kernel flow에서는 포트를 `s_axilite`·`m_axi`·`axis`로만 합성합니다. Vivado IP flow는 `ap_memory`·`ap_fifo`·`ap_none` 같은 비 AXI 인터페이스도 지원합니다(UG1399 p.156 Table 8).

비유하면 AXI4-Lite는 우편함(작은 쪽지를 한 장씩), AXI4는 화물 트럭(주소 하나에 짐을 여러 칸 싣고), AXI-Stream은 컨베이어 벨트(주소 없이 계속 흘려보냄)입니다.

### 이 글의 출처와 실행 환경

- 프로토콜 규칙: Arm **IHI 0022 Issue L**(2025-08-27). AXI3/AXI4/AXI4-Lite 내용이 Issue J부터 빠져 Issue L에도 없기 때문에, AXI4 burst 길이와 AXI4-Lite 정의는 **IHI 0022C**(AXI3·AXI4·AXI4-Lite를 함께 다루는 판)의 13·14장을 인용합니다.
- Vitis HLS: AMD **UG1399 v2026.2**. Zynq UltraScale+: **UG1085 v2.6**.
- 실행: Icarus Verilog 13.0, Verilator 5.054, Apple clang 21.0.0. **Vitis HLS는 설치할 수 없어 돌리지 않았습니다.** HLS 코드는 UG1399의 문법과 옵션 이름에 맞췄지만 합성 결과는 없습니다.

## 핵심 개념

세 변종을 표로 정리합니다.

| 변종 | 구조 | 주 용도 | 출처 |
|------|------|---------|------|
| AXI4 | 주소 + 5 channel, INCR burst 1~256 beat, ID별 순서 | 메모리·DMA | burst: IHI 0022C 13.1, 순서: IHI 0022 L A5 |
| AXI4-Lite | 주소 + 5 channel, 모든 transaction이 burst 길이 1, 32/64-bit, exclusive 없음 | control register | IHI 0022C 14.2 |
| AXI-Stream | 주소 없음, TVALID/TREADY/TLAST 등 | video·packet·DMA data plane | UG1399 (`hls::axis`) |

AXI4의 5 channel은 모두 VALID/READY handshake로 움직입니다.

![AXI4 5 channel — master와 slave 사이의 read/write 분리](/images/blog/modern-recipes/diagrams/part5-06-axi-channels.svg)

| Channel | 이름 | 방향 | 비고 |
|---------|------|------|------|
| AR | Read address | manager → subordinate | |
| R | Read data | subordinate → manager | 마지막 beat에 RLAST |
| AW | Write address | manager → subordinate | |
| W | Write data | manager → subordinate | 마지막 beat에 WLAST |
| B | Write response | subordinate → manager | |

(Issue L은 master/slave 대신 Manager/Subordinate라는 용어를 씁니다.)

IHI 0022 Issue L A2.3은 handshake 규칙을 두 문장으로 정합니다. 송신 측은 READY를 기다렸다가 VALID를 올리면 안 되고, 한 번 올린 VALID는 VALID와 READY가 둘 다 1인 clock edge에서 전송이 일어날 때까지 내리면 안 됩니다. 수신 측이 못 받으면 READY를 0으로 두고, 송신 측은 데이터를 붙든 채 기다립니다. backpressure가 프로토콜에 들어 있는 셈입니다.

## AXI4-Lite — control register slave를 직접 만들어 보기

규칙을 읽는 것보다 한 번 만들어 보는 편이 빨리 익혀집니다. 아래는 32-bit 레지스터 4개(0x0~0xC)를 가진 AXI4-Lite slave입니다. AW와 W가 서로 다른 cycle에 와도 각각 받아 두었다가 둘 다 모이면 쓰고, WSTRB가 켜진 바이트만 바꿉니다.

```verilog
module axil_regs (
    input  wire        aclk, aresetn,
    input  wire [3:0]  s_awaddr,  input wire s_awvalid, output reg s_awready,
    input  wire [31:0] s_wdata,   input wire [3:0] s_wstrb,
    input  wire        s_wvalid,  output reg s_wready,
    output reg  [1:0]  s_bresp,   output reg s_bvalid,  input wire s_bready,
    input  wire [3:0]  s_araddr,  input wire s_arvalid, output reg s_arready,
    output reg  [31:0] s_rdata,   output reg [1:0] s_rresp,
    output reg         s_rvalid,  input wire s_rready
);
    reg [31:0] regs [0:3];
    reg [3:0]  awaddr_q;
    reg        aw_got, w_got;
    reg [31:0] wdata_q;
    reg [3:0]  wstrb_q;
    integer i;

    always @(posedge aclk) begin
        if (!aresetn) begin
            s_awready <= 1'b1; s_wready <= 1'b1; s_bvalid <= 1'b0; s_bresp <= 2'b00;
            aw_got <= 1'b0; w_got <= 1'b0;
            for (i = 0; i < 4; i = i + 1) regs[i] <= 32'h0;
        end else begin
            if (s_awvalid && s_awready) begin awaddr_q <= s_awaddr; aw_got <= 1'b1; s_awready <= 1'b0; end
            if (s_wvalid  && s_wready)  begin wdata_q <= s_wdata; wstrb_q <= s_wstrb; w_got <= 1'b1; s_wready <= 1'b0; end
            if (aw_got && w_got && !s_bvalid) begin
                for (i = 0; i < 4; i = i + 1)
                    if (wstrb_q[i]) regs[awaddr_q[3:2]][8*i +: 8] <= wdata_q[8*i +: 8];
                s_bvalid <= 1'b1; s_bresp <= 2'b00;   // OKAY
                aw_got <= 1'b0; w_got <= 1'b0;
            end
            if (s_bvalid && s_bready) begin s_bvalid <= 1'b0; s_awready <= 1'b1; s_wready <= 1'b1; end
        end
    end

    always @(posedge aclk) begin
        if (!aresetn) begin
            s_arready <= 1'b1; s_rvalid <= 1'b0; s_rresp <= 2'b00; s_rdata <= 32'h0;
        end else begin
            if (s_arvalid && s_arready) begin
                s_rdata <= regs[s_araddr[3:2]]; s_rresp <= 2'b00;
                s_rvalid <= 1'b1; s_arready <= 1'b0;
            end
            if (s_rvalid && s_rready) begin s_rvalid <= 1'b0; s_arready <= 1'b1; end
        end
    end
endmodule
```

testbench는 W를 AW보다 몇 cycle 늦게 보내고, BREADY·RREADY를 0~3 cycle 무작위로 늦게 올립니다. 그리고 매 clock마다 "직전 edge에서 VALID=1·READY=0이었으면 이번에도 VALID와 데이터가 그대로인가"를 검사해, slave가 A2.3 규칙을 어기면 `PROTOCOL ERROR`를 찍습니다.

```text
$ iverilog -g2012 -o axil tb_axil.v axil_regs.v && vvp -n axil
56000 write addr=0x0 data=0xdeadbeef strb=1111 bresp=0 (BREADY 0 cycle late)
116000 write addr=0x4 data=0x12345678 strb=1111 bresp=0 (BREADY 0 cycle late)
156000 write addr=0x4 data=0xffffffff strb=0001 bresp=0 (BREADY 2 cycle late)
176000 read  addr=0x0 data=0xdeadbeef rresp=0 (RREADY 0 cycle late)
206000 read  addr=0x4 data=0x123456ff rresp=0 (RREADY 2 cycle late)
246000 read  addr=0x8 data=0x00000000 rresp=0 (RREADY 3 cycle late)
protocol errors: 0
```

세 번째 쓰기는 WSTRB `0001`이라 0x4의 최하위 바이트만 `ff`로 바뀌어 `0x123456ff`가 됐습니다. READY가 늦게 와도 VALID를 유지했으므로 protocol error는 0입니다. 주소 하위 2비트를 쓰지 않는다는 Verilator `-Wall`의 `UNUSEDSIGNAL` 경고만 끄고(`-Wno-UNUSEDSIGNAL`) lint도 통과했습니다.

이 slave는 transaction을 한 번에 하나만 받습니다. AXI4-Lite에는 burst가 없으므로(IHI 0022C 14.2) 큰 버퍼를 이 인터페이스로 옮기면 32-bit마다 transaction 하나가 필요합니다. 4 KB면 1,024번입니다. 큰 데이터는 아래의 AXI4 burst로 옮깁니다.

### HLS에서 AXI4-Lite 포트 만들기

Vitis HLS에서는 함수 인자에 `s_axilite` 인터페이스를 지정하면 위와 같은 slave가 생성됩니다. 아래는 UG1399 v2026.2의 `#pragma HLS interface mode=<mode> port=<name>` 문법으로 쓴 예입니다.

```cpp
void accel(int *in, int *out, int n, int mode) {
#pragma HLS INTERFACE mode=m_axi     port=in   offset=slave bundle=gmem
#pragma HLS INTERFACE mode=m_axi     port=out  offset=slave bundle=gmem
#pragma HLS INTERFACE mode=s_axilite port=n    bundle=ctrl
#pragma HLS INTERFACE mode=s_axilite port=mode bundle=ctrl
#pragma HLS INTERFACE mode=s_axilite port=return bundle=ctrl
    /* ... */
}
```

`offset=slave`는 포인터 인자의 주소를 AXI4-Lite 레지스터로 받겠다는 뜻입니다. 다만 그 레지스터가 어느 `s_axilite` bundle에 들어가는지는 따로 정해야 합니다. UG1399 p.183~184는 bundle을 지정하지 않은 포트를 기본 이름의 bundle(`s_axi_control`)로 모은다고 설명하고, p.283의 `m_axi` 예제는 포인터 인자에 `#pragma HLS INTERFACE mode=s_axilite port=a bundle=control`을 따로 붙입니다. 위 코드처럼 `in`·`out`에 `s_axilite` pragma가 없으면 주소 레지스터는 `ctrl`이 아닌 다른 bundle에 생길 수 있으므로, 한 bundle에 모으려면 `in`·`out`에도 `mode=s_axilite ... bundle=ctrl`을 적습니다. UG1399 p.181~182의 예제 레지스터 맵에 따르면 앞부분은 이렇게 고정입니다.

| Offset | 레지스터 | 주요 비트 |
|---|---|---|
| 0x00 | Control signals | bit0 `ap_start`, bit1 `ap_done`, bit2 `ap_idle`, bit3 `ap_ready` |
| 0x04 | Global Interrupt Enable | bit0 |
| 0x08 | IP Interrupt Enable | bit0 `ap_done`, bit1 `ap_ready` |
| 0x0C | IP Interrupt Status | bit0 `ap_done`, bit1 `ap_ready` |
| 0x10~ | 인자 레지스터 | HLS가 자동 배정 (counted auto-restart를 쓰면 0x10은 카운터) |

인자 레지스터의 정확한 오프셋은 함수마다 다르므로 손으로 추측하지 않습니다. UG1399 p.185~187에 따르면 HLS가 함께 만드는 드라이버의 `x<top>_hw.h`가 모든 레지스터 오프셋을 정의하니, 그 파일의 매크로를 씁니다.

## AXI4 — burst와 4 KB 경계

AXI4는 주소 하나로 여러 beat를 연속 전송합니다. IHI 0022C 13.1.1에 따르면 AXI3의 burst는 최대 16 beat였고, AXI4는 `AxLEN[7:0]`으로 최대 256 beat까지 늘렸습니다(burst 길이 = AxLEN + 1). 단 16 beat를 넘는 burst는 INCR에서만 되고 WRAP과 FIXED는 16 beat가 상한입니다(13.1.2).

어느 판이든 바뀌지 않은 규칙이 4 KB 경계입니다. Issue L A3.1.2는 "transaction은 4KB 주소 경계를 넘으면 안 된다"고 적고, IHI 0022C는 그 이유를 "burst가 한 slave로만 가도록 보장하기 위해서"라고 설명합니다. AXI master를 직접 만든다면 이 분할을 직접 구현해야 합니다.

```c
#include <stdint.h>
#include <stdio.h>

struct burst { uint64_t addr; uint32_t beats; };

static int split_burst(uint64_t addr, uint32_t bytes, uint32_t beat_bytes,
                       uint32_t max_beats, struct burst *out)
{
    int n = 0;
    while (bytes) {
        uint32_t to_4k = 4096 - (uint32_t)(addr & 0xFFF);
        uint32_t chunk = bytes < to_4k ? bytes : to_4k;
        uint32_t beats = chunk / beat_bytes;
        if (beats > max_beats) {
            beats = max_beats;
            chunk = beats * beat_bytes;
        }
        out[n++] = (struct burst){ addr, beats };
        addr  += chunk;
        bytes -= chunk;
    }
    return n;
}
```

64-bit(8 B/beat) bus를 가정하고 세 경우를 돌려 본 결과입니다. 전체 소스는 위 함수에 출력용 `show()`와 `main()`을 붙인 것이고, `cc -O2 -Wall -Wextra`로 경고 없이 빌드됩니다.

```text
$ cc -O2 -Wall -Wextra -o split4k split4k.c && ./split4k
addr=0x00ff0 bytes=64 max_beats=256 -> 2 burst(s)
  0x00ff0  AxLEN=  1 (2 beats, 16 B), last byte 0x00fff
  0x01000  AxLEN=  5 (6 beats, 48 B), last byte 0x0102f
addr=0x00000 bytes=4096 max_beats=256 -> 2 burst(s)
  0x00000  AxLEN=255 (256 beats, 2048 B), last byte 0x007ff
  0x00800  AxLEN=255 (256 beats, 2048 B), last byte 0x00fff
addr=0x00000 bytes=4096 max_beats=16 -> 32 burst(s)
  0x00000  AxLEN= 15 (16 beats, 128 B), last byte 0x0007f
  0x00080  AxLEN= 15 (16 beats, 128 B), last byte 0x000ff
  ...
  0x00f80  AxLEN= 15 (16 beats, 128 B), last byte 0x00fff
```

첫 줄의 `0x0FF0`부터 64바이트는 `0x1000` 경계를 넘으므로 2 beat + 6 beat로 나뉩니다. 세 번째 경우는 다음 절의 Zynq UltraScale+처럼 burst가 16 beat로 제한된 경로에서 같은 4 KB가 32개 burst가 된다는 것을 보여 줍니다.

### HLS에서 burst 길이 지정

```cpp
#pragma HLS INTERFACE mode=m_axi port=buf offset=slave bundle=gmem \
    max_read_burst_length=256 max_write_burst_length=256
```

UG1399 p.279는 `max_read_burst_length`와 `max_write_burst_length`의 기본값을 16으로 적습니다. 256으로 올려도 실제 경로가 그만큼 받아 주는지는 별개입니다. UG1085 p.1225에 따르면 Zynq UltraScale+의 PL→PS AXI FIFO interface(AFI)는 AXI4를 받지만 PS 안에서 AXI3로 변환하므로 transaction burst 길이가 최대 16으로 제한되고, PS→PL 방향의 `M_AXI_HPM0_LPD`도 "AXI4 access in the PL, but is limited to a burst length of 16"입니다(p.1231).

## AXI-Stream — TLAST로 끝 표시

AXI-Stream에는 주소가 없습니다. 데이터는 TVALID/TREADY handshake로 흐르고, 패킷이나 프레임의 끝은 TLAST로 표시합니다. UG1399는 `ap_axiu<WData, WUser, WId, WDest>`를 AXI-Stream의 unsigned 구현으로 정의하고, 생성된 RTL에 TDATA와 함께 TVALID·TREADY·TKEEP·TSTRB·TLAST·TUSER·TID·TDEST가 생긴다고 설명합니다. WUser·WId·WDest를 0으로 주면 TUSER·TID·TDEST는 생기지 않습니다.

```cpp
#include <hls_stream.h>
#include <ap_axi_sdata.h>

typedef ap_axiu<32, 1, 1, 1> pkt_t;     /* 32-bit data + TUSER/TID/TDEST 1비트씩 */

void parser(hls::stream<pkt_t> &in, hls::stream<pkt_t> &out) {
#pragma HLS INTERFACE mode=axis port=in
#pragma HLS INTERFACE mode=axis port=out
#pragma HLS INTERFACE mode=s_axilite port=return bundle=ctrl

    pkt_t p;
    do {
#pragma HLS PIPELINE II=1
        p = in.read();
        p.data ^= 0xCAFEBABE;
        out.write(p);
    } while (!p.last);
}
```

이 함수는 TLAST가 올 때까지 읽고 씁니다. UG1399의 AXI-Stream 설명도 소비자가 "TLAST가 올라올 때까지 TDATA를 계속 소비한다"고 적습니다. 그래서 생산자가 패킷 끝마다 `last = 1`을 넣지 않으면 소비자는 패킷이 끝났다는 것을 알 길이 없습니다.

## Outstanding transaction — 왜 미결 요청을 여러 개 띄우는가

메모리는 요청을 받고 응답할 때까지 시간이 걸립니다. 요청 하나를 보내고 응답을 기다린 뒤에 다음을 보내면, 그 지연 시간 동안 bus는 놀게 됩니다. 식당에서 주문 하나를 넣고 음식이 나올 때까지 다음 주문을 받지 않는 것과 같습니다. AXI는 read와 write channel이 분리되어 있어서 manager가 응답을 받기 전에 다음 요청을 보낼 수 있습니다.

효과를 숫자로 보기 위해 작은 Verilog 모델을 만들었습니다. subordinate는 매 cycle 요청을 하나 받을 수 있고 요청마다 정확히 32 cycle 뒤부터 데이터를 돌려주며, manager는 미결 요청을 최대 NOUT개까지 띄웁니다. 총 256 beat를 읽는 데 걸린 cycle 수입니다. **이 모델은 고정 지연 장난감이지 DDR이 아니므로**, 숫자는 실제 보드의 bandwidth가 아니라 "outstanding과 burst 길이가 어떻게 지연을 가리는가"만 보여 줍니다.

```text
$ iverilog -g2012 -o ost tb_ost.v ost_model.v && vvp -n ost
LAT=32 cycles, 256 beats total
BL=1  NOUT=1  : 8448 cycles, 0.030 beats/cycle
BL=1  NOUT=4  : 2115 cycles, 0.121 beats/cycle
BL=1  NOUT=16 : 543 cycles, 0.471 beats/cycle
BL=16 NOUT=1  : 768 cycles, 0.333 beats/cycle
BL=16 NOUT=4  : 288 cycles, 0.889 beats/cycle
```

결과는 손으로 한 계산과 맞습니다. 요청 하나가 33 cycle(발행 1 + 지연 32)을 먹으니 NOUT=1은 256 × 33 = 8,448 cycle입니다. 처리율은 대략 min(1, NOUT × BL ÷ (지연 + BL))을 따라가서, BL=16·NOUT=4는 bus 한계인 1 beat/cycle 가까이(256 + 32 = 288 cycle) 갑니다. burst를 길게 하는 것과 outstanding을 늘리는 것은 같은 지연을 가리는 두 가지 방법입니다.

HLS에서는 이 값을 `num_read_outstanding`/`num_write_outstanding`으로 지정합니다. UG1399 p.279에 따르면 기본값은 16이고, 설계 안에 `num_read_outstanding × max_read_burst_length × word_size` 크기의 FIFO가 생깁니다. `max_read_outstanding`이라는 이름은 UG1399에 없으므로 이 이름으로 쓰면 원하는 설정이 되지 않습니다.

```cpp
#pragma HLS INTERFACE mode=m_axi port=buf offset=slave bundle=gmem \
    num_read_outstanding=16 num_write_outstanding=16
```

Zynq-7000 TRM(UG585 v1.15)도 같은 이야기를 합니다. PL DMA via AXI_HP 절은 HP 포트에 붙은 장치가 HP의 FIFO를 활용하려면 여러 outstanding transaction을 낼 수 있어야 한다고 적습니다.

## AXI ID와 순서

IHI 0022 Issue L A5.3에 따르면 같은 channel에서 같은 ID·같은 목적지로 간 요청은 순서가 유지되고, 같은 ID의 응답은 요청을 보낸 순서대로 돌아옵니다. 반대로 ID가 다른 transaction 사이에는 순서 보장이 없습니다.

Issue L A5.6은 같은 ARID로 서로 다른 subordinate에 보낸 읽기의 데이터도 요청 순서대로 manager에 도착하게 하라고 interconnect에 요구합니다. 그래서 같은 ID로 느린 slave B에 먼저, 빠른 slave A에 나중에 읽기를 보내면, A의 응답이 먼저 준비되어도 B의 응답보다 앞서 나올 수 없습니다. 서로 기다릴 필요가 없는 요청이라면 ID를 다르게 주어야 interconnect가 먼저 끝난 응답을 먼저 돌려줄 수 있습니다. 반대로 순서가 필요한 요청은 같은 ID로 묶으면 manager가 따로 순서를 챙기지 않아도 됩니다.

## QoS 신호

AXI4부터 address channel에 4-bit `AWQOS`/`ARQOS`가 있습니다. Issue L A4.8.1은 프로토콜이 QoS 값의 정확한 쓰임을 정하지 않는다고 명시하고, priority 지표로 쓰되 값이 클수록 높은 우선순위로 해석할 것을 권장합니다. 실제 효과는 interconnect와 메모리 컨트롤러가 이 값을 어떻게 쓰느냐에 달려 있으므로 칩 문서에서 확인합니다. 예를 들어 UG1085는 Zynq UltraScale+ interconnect가 Arm NIC-400 기반이며, 일부 AXI master에 대해 ArQoS/AwQoS 값을 프로그래밍하는 레지스터를 둔다고 적습니다.

## Zynq UltraScale+ PS-PL 포트

UG1085 v2.6 p.58의 Table 18을 옮기면 다음과 같습니다.

| 인터페이스 | 약칭 | Master | 용도 (UG1085 설명) |
|------|------|------|------|
| `S_AXI_HP{0:3}_FPD` | HP0~3 | PL | PL에서 FPD main switch와 DDR로 가는 non-coherent 경로. L2 cache 할당 없음 |
| `S_AXI_HPC{0,1}_FPD` | HPC0~1 | PL | CCI와 I/O coherent. L2 cache 할당 없음 |
| `S_AXI_ACP_FPD` | ACP | PL | legacy coherency. L2 cache 할당과 함께 I/O coherent |
| `S_AXI_ACE_FPD` | ACE | PL | PL 쪽 메모리와 CCI 사이의 양방향 coherent 경로 |
| `S_AXI_LPD` | PL_LPD | PL | PL에서 LPD의 IOP로 가는 non-coherent 경로 |
| `M_AXI_HPM{0,1}_FPD` | HPM0~1 | PS | FPD master에서 PL slave로 |
| `M_AXI_HPM0_LPD` | LPD_PL | PS | LPD master에서 PL slave로 |

HP 계열 포트는 PL 쪽 데이터 폭을 32/64/128-bit 중에서 설정하고(UG1085 p.1225), 앞에서 본 것처럼 PS 안에서는 burst 16으로 제한됩니다. PL 가속기가 HP로 DDR에 쓴 데이터를 CPU가 읽으려면 CPU 쪽에서 cache를 무효화해야 합니다. HPC나 ACP는 coherent 경로라서 이 단계를 하드웨어가 대신합니다. Zynq-7000에서의 포트별 선택은 [다음 편](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)에서 다룹니다.

## 자주 보는 함정

> VALID를 READY에 묶음

```verilog
assign m_arvalid = m_arready & have_request;   /* READY를 기다렸다가 VALID: 규칙 위반 */
```

Issue L A2.3은 송신 측이 READY를 기다렸다가 VALID를 올리는 것을 금지합니다. 상대도 VALID를 보고 READY를 올리는 구현이라면 둘이 서로를 기다리며 멈춥니다.

> READY 전에 VALID를 내리거나 데이터를 바꿈

위 testbench의 검사기가 잡는 것이 이 위반입니다. 한 번 올린 VALID와 그 payload는 handshake까지 그대로 유지합니다.

> 4 KB 경계를 넘는 burst

```c
issue_burst(0x0FF0, 64);   /* 0x0FF0 ~ 0x102F: 0x1000 경계를 넘는다 */
```

프로토콜 위반입니다. 위의 `split_burst()`처럼 경계에서 나눕니다.

> AXI4-Lite로 큰 버퍼 옮기기

AXI4-Lite는 모든 transaction이 burst 길이 1이라 4 KB에 1,024번의 transaction이 듭니다. 큰 데이터는 `m_axi` 포트로 옮깁니다.

> HLS에서 burst 256을 주고 256 beat가 나간다고 가정

Zynq UltraScale+ AFI 경로는 burst 16으로 제한됩니다(UG1085 p.1225). 64-bit bus 기준으로 4 KB가 2개 burst가 아니라 32개가 됩니다.

> Stream에 TLAST를 넣지 않음

```cpp
pkt.data = sample;
out.write(pkt);                /* last를 설정하지 않음 */
```

소비자는 TLAST로 패킷 끝을 판단하므로, 끝 표시가 없으면 패킷 경계가 사라집니다. 패킷·프레임 끝마다 `pkt.last = 1`을 명시합니다.

## 정리

- AXI4(memory), AXI4-Lite(control), AXI-Stream(data)은 모두 VALID/READY handshake 위에 섭니다.
- VALID는 READY를 기다리지 않고 올리고, handshake 전에는 내리거나 바꾸지 않습니다(IHI 0022 L A2.3).
- AXI4 INCR burst는 1~256 beat, WRAP·FIXED는 16 beat까지이고, 어떤 burst도 4 KB 경계를 넘지 않습니다.
- outstanding 수와 burst 길이는 같은 지연을 가리는 두 수단이고, HLS 옵션 이름은 `num_read_outstanding`·`max_read_burst_length`입니다(기본값 16).
- 같은 ID의 응답은 순서대로 오고, 다른 ID 사이에는 순서 보장이 없습니다.
- AxQOS의 의미는 칩마다 다르므로 interconnect 문서로 확인합니다.
- Zynq UltraScale+의 HP·HPC·ACP·ACE 포트는 coherency가 다릅니다. HP·HPC는 AFI에서 AXI3로 바뀌어 burst 16으로 제한되고(UG1085 p.1225), ACE는 긴 burst를 쪼개 주는 장치가 없어 PL master가 16 이하로 내야 하며(p.1233), ACP는 64-byte·16-byte transaction만 받습니다(p.1235).

다음 편은 **PS-PL 통신**입니다.

## 관련 항목

- [11-05: PS-PL 통신](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)
- [11-07: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [PE 3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
