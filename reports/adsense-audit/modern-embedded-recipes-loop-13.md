# Modern Embedded Recipes — 루프 13 (seriesOrder 120~129)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 약 3,713자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 5편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 5 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 5 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 5 |
| 실전 신호 약함 | 1 |

## 검사 포인트

- 통신 분석·로깅·포스트모템 글은 실제 관찰 증거, 재현 절차, 종료 조건이 있는지 확인한다.
- FPGA·Vivado·PCIe·AXI·Zynq PS-PL·Mailbox·Queue 글은 서로 다른 계층을 다루는지, 단순 용어 설명과 실제 설계 판단이 구분되는지 비교한다.
- `part11-01-fpga-basics.md`는 실전 신호가 약한 후보로, LUT·FF·BRAM·DSP 설명이 실제 자원 추정이나 설계 선택으로 이어지는지 확인한다.
- Vivado와 Zynq 글은 특정 보드·IP 버전·툴 버전에 의존하는 명령을 보편적인 절차처럼 제시하지 않는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, AMD/Xilinx·PCI-SIG·NVMe·FPGA 공식 자료가 인용 또는 명시되는지 확인한다.
- 처리량·지연·자원 사용량·버스 대역폭 주장은 기준선, 측정 조건, 하드웨어와 툴 버전을 함께 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part10-10-protocol-analyzer.md | 통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder | 4,350 | 1,122 | 0 | 4 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part10-11-logging-system.md | 임베디드 로깅 시스템 설계 — 레벨·버퍼·SWO·Deferred | 3,196 | 3,379 | 0 | 8 | 16 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part10-12-postmortem-analysis.md | 임베디드 포스트모템 분석 — Core Dump와 Field Crash | 3,414 | 4,695 | 0 | 5 | 13 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part11-01-fpga-basics.md | FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조 | 4,870 | 1,802 | 0 | 0 | 19 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 5 | part11-02-vivado-usage.md | Vivado 사용법 — Project·Constraint·Synth·Impl·Bitstream | 3,152 | 4,677 | 0 | 3 | 18 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 6 | part11-03-pcie-bar.md | PCIe BAR 매핑 분석 — Config Space·Enumeration·MMIO 접근 | 2,765 | 3,078 | 0 | 2 | 17 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 7 | part11-04-axi.md | AXI 인터페이스 — AXI4·AXI4-Lite·AXI-Stream 비교 | 5,180 | 3,040 | 0 | 18 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part11-05-ps-pl-communication.md | Zynq PS-PL 통신 — GP·HP·ACP 인터페이스 선택 | 3,140 | 4,678 | 0 | 6 | 14 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 9 | part11-06-mailbox.md | Mailbox Protocol 분석 — Host와 Accelerator를 잇는 Doorbell | 4,224 | 3,145 | 0 | 13 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part11-07-cq-sq.md | Command Queue·Submission Queue — NVMe·XDMA 공통 패턴 | 4,011 | 3,242 | 0 | 14 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·FPGA 디바이스·툴 버전과 재현 가능한 절차
2. 파형·자원 사용량·처리량·지연 등 관찰 결과와 조건
3. 공식 문서·데이터시트·프로토콜 자료 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

## 정성 평가 업데이트

기계 triage 대상 10편을 원문으로 읽고 잠정 점수를 추가했다. P0 정책 차단은 확인되지 않았다. 장비·FPGA 보드·툴 버전·실측 결과 대조 전의 `잠정` 값이다.

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part10-10-protocol-analyzer.md` | **82/100** | 유지 후보 | UART/SPI/I2C/CAN 캡처·trigger·전기 분석과 실제 오류 사례가 연결됨 |
| `part10-11-logging-system.md` | **78/100** | 보강 | binary ring/deferred/SWO/RTT 구조는 좋지만 target별 overhead와 loss 결과가 없음 |
| `part10-12-postmortem-analysis.md` | **82/100** | 유지 후보 | Linux coredump와 MCU mini-dump·field 전송을 하나의 분석 흐름으로 연결함 |
| `part11-01-fpga-basics.md` | **74/100** | 보강 | LUT/FF/BRAM/DSP와 timing 흐름은 명확하지만 실제 synthesis/resource 결과가 없음 |
| `part11-02-vivado-usage.md` | **78/100** | 보강 | project/XDC/synth/impl/TCL/ILA 흐름이 풍부하지만 board·Vivado release별 검증이 없음 |
| `part11-03-pcie-bar.md` | **77/100** | 보강 | BAR sizing·enumeration·ioremap·VFIO까지 연결하지만 실제 config dump와 device 조건이 없음 |
| `part11-04-axi.md` | **78/100** | 보강 | AXI 변종·handshake·burst·outstanding·deadlock을 폭넓게 설명하지만 burst 실측이 없음 |
| `part11-05-ps-pl-communication.md` | **76/100** | 보강 | GP/HP/ACP 선택과 cache/DMA 경계가 유용하지만 Zynq 세대별 결과가 없음 |
| `part11-06-mailbox.md` | **77/100** | 보강 | register/doorbell/sequence/CRC/DMA/OpenAMP 비교가 좋지만 round-trip 측정이 없음 |
| `part11-07-cq-sq.md` | **78/100** | 보강 | NVMe/XDMA/io_uring 공통 구조와 phase/doorbell/batching이 연결되지만 benchmark 범위가 예시임 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part10-10-protocol-analyzer.md` | 19 | 18 | 13 | 12 | 9 | 8 | 3 | **82** |
| `part10-11-logging-system.md` | 17 | 17 | 11 | 11 | 9 | 9 | 4 | **78** |
| `part10-12-postmortem-analysis.md` | 19 | 18 | 12 | 12 | 9 | 9 | 3 | **82** |
| `part11-01-fpga-basics.md` | 16 | 17 | 9 | 10 | 9 | 9 | 4 | **74** |
| `part11-02-vivado-usage.md` | 17 | 18 | 11 | 11 | 9 | 9 | 3 | **78** |
| `part11-03-pcie-bar.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part11-04-axi.md` | 19 | 17 | 10 | 11 | 9 | 9 | 3 | **78** |
| `part11-05-ps-pl-communication.md` | 17 | 17 | 10 | 10 | 9 | 9 | 4 | **76** |
| `part11-06-mailbox.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part11-07-cq-sq.md` | 19 | 17 | 10 | 11 | 9 | 9 | 3 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `사례`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: 로그·파형·dump·resource report·queue 상태처럼 확인 가능한 관찰 대상을 제시한다.
- 공통 감점: 측정 표가 실제 결과가 아니라 `측정 필요` 또는 예시 형식이고, FPGA/PCIe/AXI 글은 board·IP·tool release가 고정되지 않았다.
- 중복 위험: AXI·PS-PL·Mailbox·CQ/SQ가 host-device 통신과 queue 구조를 공유하므로 각 계층의 독립 질문을 분명히 해야 한다.
- 다음 확인: Saleae/oscilloscope 사용 조건, AMD/Xilinx 공식 문서·Vivado release, PCIe/AMBA 사양, 실제 board trace/resource/throughput 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2(`docs/adsense-audit/rubric.md`)와 앵커(`docs/adsense-audit/anchors.md`)로 10편을 다시 채점했다. 10편 모두 원문 전체를 읽었다. 줄 번호는 2026-10-11 기준 원문 파일의 줄(frontmatter 포함)이다.

공통 기록:

- `score_status`: 10편 모두 `잠정`.
- factcheck 기준: git 이력상 10편 모두 출처 없는 `Qualify …` 커밋만 있어 기본값은 `미검증`이다. 외부 자료는 가져오지 않았다. `오류 확인`은 원문 안의 산술·수치 모순만으로 성립하는 경우에만 줬고, 두 위치를 함께 적었다.
- P0: 10편 모두 확인되지 않았다. 확인 범위는 원문 본문과 내부 링크·이미지 대상의 존재 여부까지다(본문 링크·이미지 대상은 모두 저장소에 있다). 렌더링·광고 배치·외부 유사 문서 비교는 하지 않았다.
- 다음 편 안내는 실제 seriesOrder+1 글과, 관련 항목 라벨은 링크 대상 파일 번호와 대조했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part10-10-protocol-analyzer.md` | 14 | 13 | 8 | 12 | 7 | 6 | 1 | 61 | 오류 확인 | 우선 조치 | 중간 | part7-05-kernel-build.md, part1-04-uart-hardware.md |
| `part10-11-logging-system.md` | 14 | 13 | 6 | 11 | 8 | 7 | 1 | 60 | 미검증 | 보강 | 중간 | part7-05-kernel-build.md |
| `part10-12-postmortem-analysis.md` | 15 | 15 | 8 | 9 | 8 | 6 | 1 | 62 | 미검증 | 보강 | 중간 | part7-05-kernel-build.md, part12-10-on-device-llm.md |
| `part11-01-fpga-basics.md` | 9 | 11 | 4 | 11 | 5 | 6 | 1 | 47 | 미검증 | 병합 검토 | 중간 | part1-04-uart-hardware.md |
| `part11-02-vivado-usage.md` | 11 | 14 | 8 | 11 | 8 | 7 | 1 | 60 | 오류 확인 | 우선 조치 | 중간 | part7-05-kernel-build.md |
| `part11-03-pcie-bar.md` | 9 | 10 | 6 | 6 | 6 | 3 | 1 | 41 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md, part1-04-uart-hardware.md |
| `part11-04-axi.md` | 12 | 12 | 5 | 9 | 7 | 3 | 1 | 49 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md, part7-05-kernel-build.md |
| `part11-05-ps-pl-communication.md` | 12 | 11 | 5 | 10 | 8 | 6 | 1 | 53 | 오류 확인 | 우선 조치 | 중간 | part1-04-uart-hardware.md |
| `part11-06-mailbox.md` | 13 | 13 | 5 | 11 | 6 | 4 | 1 | 53 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md, part7-05-kernel-build.md |
| `part11-07-cq-sq.md` | 14 | 13 | 5 | 10 | 7 | 4 | 1 | 54 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |

### part10-10-protocol-analyzer.md

`factcheck: 오류 확인` — 146행은 "APB1 = 42 MHz, PRESCALER=6, TQ count=14 → 1.5 µs"라고 적고, 147행은 같은 값(PRESCALER=6, TQ count=14)을 "올바른 설정 → 2 µs"라고 적었다. 42 MHz / 6 = 7 MHz, 1 tq ≈ 142.9 ns, 14 tq = 2.0 µs이므로 146행의 1.5 µs는 원문 안의 산술 오류이고, 사례가 말하는 "계산 오류"의 원인도 원문에 존재하지 않는다. 판정은 총점과 무관하게 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 실패 사례 네 개(100~150행: idle 구간 crosstalk, SPI flash WIP timeout, I2C 주소 LSB, CAN bit timing)를 캡처 결과와 원인으로 묶었고, "깨진 byte는 전기, 의도 다른 byte는 코드"(55·216행)라는 판정 기준이 이 글의 것이다. 도구 비교표(22~28행)는 칸 전체가 "판매 시점 확인"·"제품 사양 확인"이고, 30·189행은 기준 대신 완곡 표현이라 20점대는 아니다. |
| B | 13 | protocol별 decode → 사례 → trigger → oscilloscope → 함정 → 정리까지 흐름은 완성됐다. 도구 선택 절은 내용이 비었고, CAN 사례(141~150행)는 원인이 모순이라 결론이 성립하지 않는다. 30행("배수만으로 충분성을 보장하지 말고")과 211행("Sample rate는 신호의 10배 이상")이 서로 어긋난다. |
| C | 8 | Saleae 설정 절차(34~42행)와 I2C·SPI·CAN 캡처 출력(65~85·108~117·141~148행)이 있어 8~11 구간 하단이다. 측정 장비 모델·버전·보드가 없고, 사례의 수치를 재현할 조건이 없다. |
| D | 12 | 10-05 `uart-not-printing`과 UART 함정이 일부 겹치지만, 이 글은 외부 계측으로 송수신 중 누가 틀렸는지 가리는 역할이라 구별된다. |
| E | 7 | 제목·description·본문이 같은 질문(캡처·디코딩으로 원인 판별)을 향한다. description의 "DSLogic·oscilloscope"는 다루지만 도구 비교가 빈 표라 9점 이상은 아니다. |
| F | 6 | 218행 다음 편(로깅 시스템)이 seriesOrder 121과 맞고, 222~223행 링크 라벨(10-05, 10-09)도 대상과 맞는다. 224행 "Embedded Serial Ch 1: UART"는 링크가 없고, 전제 지식 안내가 없어 7점 근거가 없다. |
| G | 1 | 외부 출처 링크가 없고 analyzer 모델·소프트웨어 버전·대상 MCU가 없다. 146행 BTR 계산의 MCU 계열도 적지 않았다. |

uncertainties:
- 134행 "SDO 핀 pull-up이 `0xAA`를 만들면서 LSB가 1이 되어"는 0x68→0x69 변화와 연결되지 않는 서술이다. 의도한 값을 확인하지 못했다.
- 98행 "NO ACK 상태로 영원히 재전송"은 CAN error counter·bus-off 동작과 맞는지 미확인.
- 150행 "sample point까지 ±1%", 193행 "threshold(보통 1.4V)", 197행 "logic analyzer probe 수십 pF"는 출처 없는 수치다.

### part10-11-logging-system.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 호출·저장·전송·해석 비용 분리 표(22~29행)와 Layer 1~6 구성, production 로그 대역폭 계산(229~236행: 30×48 B + 1000×32 B + 10×128 B ≈ 35 KB/s → 115200 baud 불가)이 이 글 고유의 판단 근거다. 80·211·219행은 비용을 "target에서 측정"으로 돌려 구체 기준이 빠졌다. |
| B | 13 | 매크로 → ring → binary record → SWO/RTT → deferred → crash dump → 필터까지 완결된다. 69행 producer가 `g_tail`을 직접 옮기는 drop-oldest가 119행 consumer와 경합하는 점, 100행 `__COUNTER__` fmt_id를 host가 어떻게 문자열로 되찾는지는 설명이 없다. |
| C | 6 | 코드는 많지만 실행 환경이 없다. 비용 표(190~196행)는 "Cortex-M4 @ 168 MHz"라고 적고 printf 칸만 "측정 필요", 나머지는 출처 없는 cycle 수다. 측정 절차(DWT로 재는 방법 등)는 없다. |
| D | 11 | Layer 6 crash dump(148~172행: backup SRAM magic·reset 후 출력)가 10-12 mini-dump 절(91~154행)과 같은 패턴이다. 나머지 로깅 구조는 역할이 구별된다. |
| E | 8 | 제목의 레벨·버퍼·SWO·Deferred가 Layer 1·2·4·5로 모두 대응한다. 실제 overhead 수치가 없어 9점 이상은 아니다. |
| F | 7 | Layer 1~6 번호로 긴 코드를 단계별로 나눴고(31~172행), 284행 다음 편(포스트모템)이 seriesOrder 122와 맞으며 288~290행 링크 라벨도 대상과 맞는다. |
| G | 1 | defmt·dlt·SEGGER RTT(103·124행)를 이름만 언급하고 링크·버전이 없다. "UART보다 100배"(108·278행) 같은 비교의 근거가 없다. |

uncertainties:
- 41행 `log_emit(lvl, __FILE__, __LINE__, fmt, ...)`와 183행 `log_emit(lvl, LOG_TAG_NET, fmt, ...)`는 인자 구성이 달라 한 프로그램에서 같이 컴파일되지 않는다. 의도한 시그니처를 확인하지 못했다(원문 내부 코드 불일치, 점수 외 기록).
- 253행 newlib-nano `%f`가 "빈 칸 출력"인지, 124행 RTT "수 MB/s"는 미확인.
- 227행 "자율주행 ECU 한 대 기준" 표의 출처·실측 여부 미확인.

### part10-12-postmortem-analysis.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | Linux coredump와 MCU mini-dump를 "crash 순간 상태를 사무실로 가져온다"(20행)는 하나의 질문으로 묶고, addr2line으로 PC를 source line에 정규화해 grouping하는 절차(261~279행), reset reason 분포 해석(238~248행), PII wipe(313~315행)를 더했다. 248행 우선순위는 "함께 검토합니다"로 끝나 20점대는 아니다. |
| B | 15 | 활성화 → gdb 분석 → symbol 보관 → MCU dump 저장·전송 → last-gasp → reset reason → grouping → 함정까지 별도 검색 없이 따라갈 수 있다. 297~306행 naked handler가 `sp` 인자를 넘기지 않는 점처럼 코드 한계 설명이 빠져 16점은 아니다. |
| C | 8 | `coredumpctl list` 출력(44~50행), gdb `bt`·`print` 출력(57~69행), addr2line 출력(273~277행)이 있다. MCU 코드는 `RCC->CSR`(STM32 계열)만 쓰고 대상 보드를 적지 않았다. |
| D | 9 | Linux coredump 절(22~85행)은 published `tools/debugging/gdb-lldb/chapter07-core-dump.md`, minidump·symbol 보관은 `tools/debugging/postmortem/chapter04-debuginfod-minidump-automation.md`와 겹치고, MCU backup SRAM 저장은 10-11 Layer 6과 같은 패턴이다. 다른 시리즈 글은 제목·H2만 대조했다. |
| E | 8 | 제목·description(coredump·gdb·mini-dump·last-gasp·field debug)이 본문 절과 1:1로 맞는다. Memfault는 패턴 설명(156~166행)뿐이라 9점은 아니다. |
| F | 6 | 332행 다음 편(FPGA 기초)이 seriesOrder 123과 맞고 336~338행 라벨도 맞다. 339행 "RTOS 5-04: 시스템 진단"은 링크가 없다. |
| G | 1 | systemd·gdb·Memfault 버전·문서 링크가 없고, SCB 레지스터 주소(120~123행)의 출처(Architecture Reference Manual)가 없다. |

uncertainties:
- 203행 `hardfault_save_dump(NULL)`은 112~124행에서 `sp[0]`~`sp[7]`과 `memcpy(d->stack, sp, …)`로 역참조된다. 원문만으로 dump 내용이 잘못된다는 점은 성립하지만, 코드 결함을 3-1절 "내용 오류"로 볼지 판단하지 않고 기록만 한다.
- 58행 frame #0이 `input.c:42`인데 66행 주석은 41행을 NULL deref 위치로 적었다.
- 28~29행 `systemd-coredump.service`를 enable·start하는 방식이 현재 systemd 배포 형태(socket 활성화)와 맞는지 미확인.
- 132행 "RP2040 watchdog scratch, NRF52 GPREGRET" 용량·보존 조건 미확인.

### part11-01-fpga-basics.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | LUT·FF·BRAM·DSP·clock region·IO bank 설명(26~139행)은 FPGA 입문서 목록이다. 이 글만의 것은 CPU와 FPGA 비교표(195~200행)와 100 MHz × 1000 MAC 계산(202행) 정도인데, 98·191·202행은 결론 대신 "달라집니다"·"합성 report로 확인합니다"로 끝난다. |
| B | 11 | 구성 요소 → 개발 흐름 → 예제 → CPU 비교 → 함정 → 정리 흐름은 있다. 자원 추정이 실제 설계 선택으로 이어지는 예가 없고, LED 예제(180~191행)의 자원 사용량은 "report로 확인"으로 비워 결과가 없다. |
| C | 4 | Verilog 조각만 있고 합성 결과·device·tool 버전이 없다. 앵커 part1-04(C 6)보다도 실행 결과가 적다. |
| D | 11 | 함정 절의 CDC·timing slack·reset·pin assignment(218~256행)가 11-02 함정(275~300행)과 겹치고, soft processor 절(141~151행)이 11-14 Nios II 절과 겹친다. 기초 개념 글로서의 역할은 구별된다. |
| E | 5 | 제목이 "분석"을 약속하지만 description은 "정리"이고 본문은 개념 소개 수준이다(루브릭 E 주석: 3~5점). |
| F | 6 | 269행 다음 편(Vivado)이 seriesOrder 124와 맞고 273~276행 라벨(11-02·11-04·11-05·11-14)도 대상과 맞는다. 전제 지식·이 글 고유의 단계 구분은 없다. |
| G | 1 | 자원 비교표(155~163행)의 가격·수치와 7-series 수치(72~75·92~95·111행)에 출처·데이터시트 판이 없다. |

uncertainties:
- 113행 "하나의 region 안에서는 clock skew가 같습니다", 111행 "50 CLB × 50 CLB" 미확인.
- 52행 "6-LUT(Xilinx 7-series 이상)"의 도입 세대, 146행 MicroBlaze "~1000 LUT", 155~163행 가격·자원 수치 미확인.
- 231행 combinational loop을 "synthesizer 거부"로 적었는데 경고만 내는 도구도 있는지 미확인.

병합 대상: 병합 대상 없음. FPGA 자원 기초는 독립 검색 의도가 있고 D가 강한 중복이 아니다. 다음 조치는 `보강`이다. 실제 device 하나를 정해 LED·FIR 예제의 합성 report(LUT·FF·DSP)를 붙이고, "분석"이 약속한 자원 추정 예를 추가하거나 제목을 개념 정리로 낮춘다.

### part11-02-vivado-usage.md

`factcheck: 오류 확인` — 120행은 아래 path를 "실패한 path"라고 소개하고 130행은 "pipeline을 넣으면 slack이 회복된다"고 설명하지만, 같은 글의 clock 정의(51행 `create_clock -period 10.000`) 아래에서 126행 Data Path Delay는 4.611 ns이고 123행 required는 10.000 ns 기준이다. 원문 수치대로면 slack이 양수라 실패 path가 아니다. 원문만으로 성립하는 수치 모순이라 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | GUI 절차마다 같은 일을 하는 TCL을 짝지었고(37~42·77~85·95~102·156~164행), 전체 batch build script(202~224행)와 utilization 표 읽기(230~243행)를 붙였다. 흐름 자체는 Vivado 문서 순서와 같고, 243행은 기준 대신 "device에 따라 다릅니다"로 끝난다. |
| B | 14 | project → XDC → synth → impl → timing → bitstream → JTAG → flash → IP Integrator → ILA까지 한 번에 따라갈 수 있다. timing 예시가 모순이라 핵심 판단(실패 path 읽기)이 성립하지 않는다. |
| C | 8 | 실행 가능한 TCL과 `vivado -mode batch`(223행), 산출물 경로(143행)가 있다. utilization 표(234~239행)는 비율 계산이 맞고 Zynq-7020 수치와 일치한다. Vivado 버전이 없고, 143행 경로(`./myproj/myproj.runs/…`)와 162행 경로(`./myproj.runs/…`)가 다르다. |
| D | 11 | 함정 절의 XDC 누락·CDC·reset 혼합(275~300행)이 11-01 함정과 겹친다. 11-14 Quartus와 절 구성이 평행하지만 도구가 달라 역할은 구별된다. |
| E | 8 | 제목의 Project·Constraint·Synth·Impl·Bitstream이 모두 절로 있다. 도구 버전 범위가 없어 9점은 아니다. |
| F | 7 | 도구 흐름 순서대로 절을 나누고 각 절에 GUI·TCL을 같은 형식으로 둬 긴 명령을 단계별로 구분했다. 321행 다음 편(PCIe BAR)이 seriesOrder 125와 맞고 325~328행 라벨도 맞다. |
| G | 1 | Vivado release·보드 이름·UG 문서 링크가 없다. part 번호(32·204행)만 있다. |

uncertainties:
- 50행 `PACKAGE_PIN E3`가 32·38행의 `xc7a35tcpg236-1` 패키지에 존재하는 핀인지 미확인(보드 XDC 출처 없음).
- 18행 "Versal은 Vivado ML edition", 304행 out-of-context 설명(Top-level만 P&R 재실행) 미확인.
- 176행 flash part 문자열 `s25fl128sxxxxxx0-spi-x1_x2_x4` 미확인.

### part11-03-pcie-bar.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | config space offset 표(21~40행), BAR 비트 표(46~51행), sizing 절차(57~73행)는 PCIe 교과서 내용이다. 이 글만의 것은 endpoint 측 BAR 설정 예(176~187·259~265행) 정도다. 19행과 172행은 구체 사양 대신 완곡 표현이다. |
| B | 10 | sizing → enumeration → driver → barrier → DPDK·VFIO → AER → 함정으로 범위는 넓지만 각 절이 짧다. probe 코드(89~113행)는 `err_disable`·`err_regions` label이 없는 조각이고, AER 절(208~222행)은 `reset` 명령과 로그 한 줄로 끝난다. "어떤 상황에서 쓰나" 절이 없어 문제 정의가 약하다. |
| C | 6 | `lspci` 명령(191~204행)과 dmesg 예(216~220행)는 있지만 대상 장치·커널 버전이 없고 출력 해석은 한 줄이다. |
| D | 6 | published `embedded/hardware/pcie/chapter04-bar-mmio.md`가 같은 질문(BAR 종류·sizing·64-bit·prefetchable·Linux mapping)을 H2 단위로 다룬다. config space·AER·VFIO도 같은 시리즈 Ch3·Ch7·Ch12와 겹친다. 11-09 함정(199~208·232~238행)과 이 글 함정(226~257행)도 같은 두 항목(64-bit BAR, prefetchable)이다. |
| E | 6 | 제목·본문이 같은 주제를 향하지만 DPDK·VFIO·AER처럼 제목 밖 내용이 섞이고 description은 키워드 나열이다. |
| F | 3 | 276행 "다음 편은 Device Tree"인데 seriesOrder 126은 AXI 글이다. 281행 "1-04: Device Tree"는 `part7-03`으로 가 번호가 틀렸고, 280행 "1-02: DDR 초기화"는 링크가 없다. |
| G | 1 | PCIe Base Specification 판·절 번호, 커널 버전이 없다. |

uncertainties:
- 131~135행 `__iowmb()`가 "DMA와 MMIO 사이의 순서"를 보장한다는 설명과 실제 API 의미 미확인.
- 115행 `pci_iomap`이 "non-cacheable mapping"이라는 설명(prefetchable BAR 처리 포함) 미확인.
- 143행 `rte_pci_map_resource(dev, 0)` 시그니처 미확인.
- 166~169행 SoC별 PCIe 세대·lane 수 미확인.

병합 대상: `src/content/blog/embedded/hardware/pcie/chapter04-bar-mmio.md`(BAR·sizing·Linux mapping)와 같은 시리즈 Ch3·Ch10. 레시피 시리즈 안에서는 `part11-09-pcie-streaming.md`와 함정 절이 겹치므로 두 글을 하나의 "PCIe BAR·streaming 레시피"로 합치는 안도 함께 검토한다. 병합 전 PCIe 시리즈 본문을 직접 대조해야 한다.

### part11-04-axi.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 4 KB boundary split 코드(105~118행), 같은 ID로 다른 slave를 때릴 때의 정체(165~175행), QoS 배분 예(179~192행)가 이 글의 해석이다. 측정 절(207~226행)은 "측정한 효과입니다"라고 시작해 칸이 모두 "측정 필요"이고, 224·226행 결론은 근거 표 없이 단정한다. 96·163행은 완곡 표현이다. |
| B | 12 | 변종 비교 → channel → 코드 → burst·outstanding·ID·QoS → PS-PL port → 함정까지 간다. 측정 절이 비어 결론의 근거가 없다. |
| C | 5 | HLS pragma와 pseudo code뿐이고 실행 조건이 없다. 측정 표 두 개가 전부 "측정 필요"라 내용 없는 표로 본다(루브릭 3-1). |
| D | 9 | AXI 5 channel·ID·burst·outstanding은 published `performance-engineering/part3-01-bus-architecture.md`의 H2(AXI 5 채널, ID — Out-of-Order, Burst, Outstanding)와 같은 질문이다. Zynq US+ port 표(194~203행)와 "ACP 대신 HP" 함정(272~274행)은 11-05와 겹친다. |
| E | 7 | 제목의 세 변종 비교와 description의 burst·outstanding·deadlock 회피를 모두 다룬다. 측정 절이 약속한 결과가 없다. |
| F | 3 | 288행 "여기까지 Part 5(FPGA·accelerator·PCIe)였습니다"는 사실과 다르다(다음 seriesOrder 127은 PS-PL 통신). 292행 "5-05: Vitis HLS"는 `part11-11-hls-optimization`으로 가고, 293·294행 "5-02"·"5-03"은 각각 11-07·11-08로 가 번호가 틀렸다. |
| G | 1 | AMBA AXI 사양 판(Issue)·HLS 버전·대상 device가 없다. |

uncertainties:
- 246행 `len=64`가 beat인지 byte인지 적지 않아 "0x0FF0 ~ 0x10EF" 범위를 확인할 수 없다.
- 240행 "outstanding 1이면 throughput이 한 자릿수 GB/s에서 막힌다"는 방향이 맞는지 미확인.
- 167행 같은 ID 재사용이 "deadlock"까지 가는 조건, 198·201행 US+ HP·GP port 개수 미확인.

병합 대상: 프로토콜 일반 부분(channel·ID·burst·outstanding)은 `src/content/blog/embedded/performance-engineering/part3-01-bus-architecture.md`, Zynq port 표와 HP·ACP 함정은 `part11-05-ps-pl-communication.md`. HLS 인터페이스 결정(s_axilite·m_axi·axis)과 4 KB split처럼 이 글에만 있는 부분을 남길지 먼저 정한다.

### part11-05-ps-pl-communication.md

`factcheck: 오류 확인` — 259행 표는 `M_AXI_GP`를 "32-bit × 100 MHz"로, 323행 정리는 "GP는 32-bit 250 MHz"로 적어 같은 인터페이스의 clock이 글 안에서 다르다. 또 298행은 GP로 1024 word를 쓰면 "수십 ms"라고 하지만 같은 글의 GP write 실측 예(259행, ~80 MB/s)로는 4 KiB가 약 51 µs이고, 68행 "전송 비용은 µs 단위"로 잡아도 ms 단위다. 원문 안의 수치 모순이라 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | GP·HP·ACP 선택 가이드 표(133~140행)와 HP는 flush/invalidate, ACP는 snoop이라는 코드 대비(81~127행)가 이 글의 결정 기준이다. 78·255·264행은 수치 대신 "대상 보드에서 검증"으로 돌린다. |
| B | 11 | 인터페이스 → 코드 → 선택 가이드 → Linux(UIO·DMA buffer) → 측정 → 함정 흐름은 있다. RTL 두 모듈(144~175·181~203행)은 포트 선언만 있고 본문이 비었다. |
| C | 5 | 측정 표(257~262행)는 "예시 측정 형식"(255행)이라 재현 조건이 없다. 85·89행은 user-space `aligned_alloc` 버퍼에 kernel 함수(`__clean_dcache_area_poc`, `virt_to_phys`)를 섞어 그대로는 실행할 수 없다. |
| D | 10 | port 표와 HP·ACP 선택이 11-04(194~203·272~274행)와 겹친다. UIO 절은 7-11 `uio-vfio`와 겹친다. |
| E | 8 | 제목의 GP·HP·ACP 선택과 description의 latency·throughput·coherence 비교를 선택 가이드로 이행한다. |
| F | 6 | 331행 다음 편(Mailbox)이 seriesOrder 128과 맞고 335~338행 라벨도 맞다. 글 고유의 전제 지식 안내는 없다. |
| G | 1 | Zynq TRM(UG585) 등 출처와 device·clock 설정이 없다. |

uncertainties:
- 289행 "L2 cache (256 KB)"가 Zynq-7000 L2 용량과 맞는지 미확인.
- 281행 "32-byte burst 1번 = 25 cycle, 100배 차이"의 계산 근거를 원문에서 찾을 수 없다.
- 314행 "DDR bandwidth × 0.7", 18행 "throughput이 1/10" 출처 없음.
- 318행 valid 유지 규칙 문장이 뒤섞여 있어 의도를 확인하지 못했다.

병합 검토 대상(점수 구간 기준 기록): 오류 수정 뒤에도 50점대면 `part11-04-axi.md`의 Zynq port 절과 합치는 안을 검토한다.

### part11-06-mailbox.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | register layout(40~51행)과 C 구조체(60~71행)의 offset이 정확히 맞고, 인자 → sequence → 명령 → DMB → doorbell 순서(87행), W1C ack(122행), sequence로 비멱등 명령을 막는 이유(173행)를 한 흐름으로 설명한다. 30행 비용 비교는 "측정합니다"로 끝난다. |
| B | 13 | 정의 → host 송신 → device ISR → Linux mailbox client → CRC → DMA 결합 → 함정까지 완결된다. 측정 절이 비었다. |
| C | 5 | 측정 표(189~194행)는 "측정한 예입니다"(187행)라면서 칸이 모두 "측정 필요"·"workload별 측정"이다. 199~202행 STM32MP1 수치는 환경·출처가 없다. |
| D | 11 | doorbell·barrier 순서가 11-07 SQ·CQ와, RPMsg 비교가 RTOS `part4-12-amp-openamp`와 겹치지만 mailbox 자체 질문은 구별된다. |
| E | 6 | description이 약속한 "OpenAMP 비교 관점"은 빈 표 한 행과 196행 한 문단뿐이다. |
| F | 4 | 260행 다음 편(CQ·SQ)은 seriesOrder 129와 맞다. 264~266행 라벨 "4-04: UIO·VFIO"(→ part7-11), "5-02: CQ·SQ"(→ part11-07), "1-03: PCIe BAR"(→ part11-03)은 번호가 모두 틀렸다. |
| G | 1 | Linux mailbox framework 문서·커널 버전·대상 SoC TRM이 없다. |

uncertainties:
- 247행 `dma_wmb()`를 cache flush의 예로 든 것이 맞는지 미확인(barrier와 cache 유지보수는 다른 동작일 수 있음).
- 166행 `m->seq <= last_seq` 비교는 32-bit wrap 이후 동작이 설명되지 않는다.
- 145행 "TI Sec/PMU"가 Linux mailbox controller로 있는지 미확인.

병합 대상: 병합 대상 없음. mailbox는 독립 검색 의도가 있고 11-07과는 단일 슬롯·다중 슬롯으로 역할이 다르다. 다음 조치는 `보강`이다. RTT 표를 실측하거나 표를 지우고, 링크 라벨을 실제 파일 번호로 고친다.

### part11-07-cq-sq.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | NVMe·XDMA·io_uring을 같은 SQ·CQ 구조로 겹쳐 보는 관점(14·159·179행)과 phase bit로 wrap을 구분하는 이유(113행)가 이 글의 해석이다. 207행 doorbell 비용은 "측정합니다"로 끝난다. |
| B | 13 | 구조 → 공통 코드 → NVMe·XDMA·io_uring 사례 → multi-queue → batching → 함정까지 간다. description의 Vulkan은 14·282행 언급뿐이고 NVMe 측정 표가 비었다. |
| C | 5 | 코드는 조각이고 실행 환경이 없다. NVMe 표(213~217행)는 전부 "측정 필요"이고, XDMA 표(221~225행)는 2.1·6.8·7.4 GB/s를 출처·보드·드라이버 버전 없이 적었다. 83행 `sq_head_shadow`는 66~75행 구조체에 없다. |
| D | 10 | phase bit·CQ doorbell 함정이 11-08(181~195·235~246행)과, doorbell·MSI-X affinity가 11-09와 겹친다. |
| E | 7 | 제목의 NVMe·XDMA 공통 패턴은 이행하지만 description의 Vulkan 사례는 없다(부분 미이행). |
| F | 4 | 290행 다음 편(DMA Completion)은 seriesOrder 130과 맞다. 294~296행 라벨 "5-01: Mailbox"(→ part11-06), "5-03: DMA Completion"(→ part11-08), "4-04: UIO·VFIO"(→ part7-11)는 번호가 틀렸다. |
| G | 1 | NVMe Base Specification 판, liburing·XDMA driver 버전이 없다. |

uncertainties:
- 159행 "C2H ring이 CQ 역할"은 C2H가 데이터 방향(card→host) 채널이라는 점과 맞는지 미확인.
- 225행 "7.4 GB/s (PCIe Gen3 x8 실효 한계)"의 산정 근거 미확인.
- 18행 "1 M IOPS", 43행 "scalability가 선형" 출처 없음.

병합 대상: 병합 대상 없음. SQ·CQ 패턴은 독립 질문이다. 다음 조치는 `보강`이다. 11-08의 completion·phase 함정을 이 글로 모을지(11-08 병합 검토와 함께) 정하고, 측정 표는 실측하거나 지운다.

### 시리즈 공통 문제

- 본문 안에 외부 출처 링크·도구 버전·대상 보드가 없어 G가 1점이다: 10편 전부.
- 측정·비교 표가 "측정 필요"·"확인"·"예시 형식"으로 채워져 내용이 없다: `part10-10-protocol-analyzer.md`(22~28행), `part10-11-logging-system.md`(192행), `part11-04-axi.md`(209~222행), `part11-05-ps-pl-communication.md`(255~262행), `part11-06-mailbox.md`(189~194행), `part11-07-cq-sq.md`(213~217행).
- 빈 측정 표 바로 옆에 출처 없는 단정 수치·결론을 둔다: `part10-11-logging-system.md`(193~196행), `part11-04-axi.md`(224·226행), `part11-05-ps-pl-communication.md`(323~324행), `part11-06-mailbox.md`(199~202행), `part11-07-cq-sq.md`(221~225행).
- 구체 기준을 "측정합니다"·"확인합니다"·"달라집니다" 같은 완곡 표현으로 대신한다: `part10-10-protocol-analyzer.md`(30·189행), `part10-11-logging-system.md`(80·211행), `part11-01-fpga-basics.md`(98·191·202행), `part11-04-axi.md`(96·163행), `part11-05-ps-pl-communication.md`(78·264행).
- 관련 항목 라벨이 옛 번호 체계(`1-03`, `4-04`, `5-02` 등)라 링크 대상과 번호가 다르거나 다음 편 안내가 틀렸다: `part11-03-pcie-bar.md`, `part11-04-axi.md`, `part11-06-mailbox.md`, `part11-07-cq-sq.md`.
- 원문 안의 수치 모순(같은 값에 다른 결과, 표와 정리의 불일치): `part10-10-protocol-analyzer.md`(146·147행), `part11-02-vivado-usage.md`(120·126·51행), `part11-05-ps-pl-communication.md`(259·323·298행). 루브릭 5절에 따라 개별 수정 전 시리즈 차원의 수치 검수 절차를 정한다.
