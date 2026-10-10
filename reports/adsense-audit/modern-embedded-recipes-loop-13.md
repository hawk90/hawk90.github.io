# Modern Embedded Recipes — 루프 13 (seriesOrder 120~129)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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
| `part11-04-axi.md` | 18 | 17 | 10 | 11 | 9 | 9 | 3 | **78** |
| `part11-05-ps-pl-communication.md` | 17 | 17 | 10 | 10 | 9 | 9 | 4 | **76** |
| `part11-06-mailbox.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part11-07-cq-sq.md` | 18 | 17 | 10 | 11 | 9 | 9 | 3 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `사례`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: 로그·파형·dump·resource report·queue 상태처럼 확인 가능한 관찰 대상을 제시한다.
- 공통 감점: 측정 표가 실제 결과가 아니라 `측정 필요` 또는 예시 형식이고, FPGA/PCIe/AXI 글은 board·IP·tool release가 고정되지 않았다.
- 중복 위험: AXI·PS-PL·Mailbox·CQ/SQ가 host-device 통신과 queue 구조를 공유하므로 각 계층의 독립 질문을 분명히 해야 한다.
- 다음 확인: Saleae/oscilloscope 사용 조건, AMD/Xilinx 공식 문서·Vivado release, PCIe/AMBA 사양, 실제 board trace/resource/throughput 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

