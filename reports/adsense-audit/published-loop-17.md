# 공개 글 AdSense 평가 — 루프 17

> 대상: 공개 글 10편 (Embedded Debugging `seriesOrder` 4~9 6편, Embedded Performance Engineering `seriesOrder` 0~3 4편)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열일곱 번째 루프다. 대상은 `src/content/blog/tools/debugging/embedded/`의 `chapter04-jlink.md`~`chapter09-cxl-device-troubleshoot.md` 6편과 `src/content/blog/embedded/performance-engineering/`의 `00-preface.md`~`part1-03-measurement.md` 4편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 아래 표에서 `embedded/`는 `tools/debugging/embedded/`, `performance-engineering/`는 `embedded/performance-engineering/`를 뜻한다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `embedded/chapter04-jlink.md` | 11 | 11 | 7 | 9 | 6 | 6 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `embedded/chapter05-elf-map.md` | 11 | 12 | 6 | 7 | 6 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded/chapter06-trace.md` | 12 | 11 | 6 | 9 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `embedded/chapter07-rtos-troubleshooting.md` | 11 | 9 | 6 | 7 | 5 | 4 | 2 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `embedded/chapter08-cxl-link-debug.md` | 12 | 11 | 8 | 9 | 6 | 5 | 2 | **53** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `embedded/chapter09-cxl-device-troubleshoot.md` | 14 | 12 | 9 | 9 | 7 | 6 | 3 | **60** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `performance-engineering/00-preface.md` | 9 | 8 | 3 | 10 | 6 | 4 | 2 | **42** | 미검증 | 보강 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `performance-engineering/part1-01-methodology.md` | 11 | 9 | 4 | 9 | 6 | 7 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `performance-engineering/part1-02-metrics.md` | 8 | 9 | 5 | 6 | 5 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `performance-engineering/part1-03-measurement.md` | 10 | 9 | 5 | 7 | 6 | 6 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |

평균 48.6점(10편 합 486), 범위 40~60점이다. 판정은 우선 조치 4편(ch05·ch06·ch07·part1-03), 병합 검토 4편(ch04·ch08·part1-01·part1-02), 보강 2편(ch09, 00-preface)이고 유지·검증 대기·제외 검토는 없다. 00-preface는 점수 구간이 병합 검토지만 시리즈 허브라 rubric 5절에 따라 보강으로 뒀다. 병합 검토 4편은 모두 독립 검색 의도가 있어 다음 조치가 보강이다(part1-02만 보강 뒤에도 고유 분량이 적으면 part1-01 병합을 다시 본다). 오류 확인은 4건이다. ch06은 글이 직접 링크한 ARM semihosting 명세를 열어 확인했고, ch05·ch07·part1-03은 글 안의 내부 모순(산술·레지스터 범위·코드와 산문)이다. `factcheck: 검증됨`은 1차 자료 대조 커밋이 있는 ch08(815be859)·ch09(2b646ec1) 2편뿐이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 편 안내·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 상태, part1-02의 그림 3개 svg 존재, 같은 주제 다른 시리즈 글과의 겹침까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `embedded/chapter04-jlink.md` | 52 | 52 | 0 | 없음 |
| `embedded/chapter05-elf-map.md` | 50 | 50 | 0 | 없음 |
| `embedded/chapter06-trace.md` | 56 | 53 | -3 | 없음 |
| `embedded/chapter07-rtos-troubleshooting.md` | 44 | 44 | 0 | 없음 |
| `embedded/chapter08-cxl-link-debug.md` | 53 | 53 | 0 | 없음 |
| `embedded/chapter09-cxl-device-troubleshoot.md` | 60 | 60 | 0 | 없음 |
| `performance-engineering/00-preface.md` | 42 | 42 | 0 | 없음 |
| `performance-engineering/part1-01-methodology.md` | 48 | 48 | 0 | 없음 |
| `performance-engineering/part1-02-metrics.md` | 40 | 40 | 0 | 없음 |
| `performance-engineering/part1-03-measurement.md` | 44 | 44 | 0 | 없음 |

1차 합 489에서 최종 486으로 3점 내려갔다. 판정이 바뀐 글은 ch06 1편(병합 검토 → 우선 조치)이다. 부풀림(AP-C-24)으로 본 글은 없다.

- 기각한 오류 확인: 0건.
- 추가한 오류 확인: 2건. (1) ch06 96~98행 semihosting 시스템 콜 번호를 글이 100행에 링크한 ARM semihosting 명세(ARM-software/abi-aa semihosting.rst, release 2025Q4)와 대조했다. SYS_EXIT 0x0c(명세 0x18), SYS_HEAPINFO 0x12(명세 0x16), SYS_ELAPSED 0x13(명세 0x30)이 다르다. 0x0C·0x12·0x13은 명세상 SYS_FLEN·SYS_SYSTEM·SYS_ERRNO다. 이 때문에 ch06 factcheck가 미검증 → 오류 확인, 판정이 우선 조치로 바뀌었다. (2) ch05에 내부 모순 (7)을 더했다. 62행 첫 LOAD 세그먼트 FileSiz 0x09f80은 0x08009f80에서 끝나는데 67행은 이 세그먼트에 .rodata~.fini_array를 넣고, 33~38행 기준 이 섹션들은 0x0800a3b0까지 간다. ch05는 이미 오류 확인이라 판정은 그대로다.
- ch06: D 10→9(평가자가 같은 시리즈 chapter02를 비교하지 않았다. chapter02 179·338행 tpiu 명령, 327~331행 itm_putchar, 342행 클럭 함정, 344~356행 ETM 설명이 이 글 156·134~139·180~182·327~336행과 거의 같다), B 12→11(시스템 콜 표 세 행 오류), G 3→2(100행 출처가 바로 앞 96~98행 표를 반박한다).
- 근거 정정(점수 영향 없음): ch04 C·D 줄 번호(353행 qc, ch08 490~495·508·515~522행), ch05 D 비교 줄(part3-04 110~136·145~160·263~272행, part3-05 131~142행, part3-10 36~61행)과 B의 '.ccmram'/'.ccram' 행(328·331 vs 424·435행), ch07 D 비교 파일 경로와 chapter03 겹침 범위(394~403행 ↔ 21~40행), ch08 chapter18 182행 위임 링크와 관련 항목 seriesOrder(2·34·9·150), ch09 D 비교 줄(postmortem Ch5 21·102행, kernel Ch9 116행), 00-preface 'draft 필드 없음 = 공개'를 content config 기본값으로 확인, part1-03 B 근거(128행 주석은 EL1을 밝힘 → 262행 사용자 공간 PMU 접근 조건 누락으로 교체).
- part1-01·part1-02: 평가자가 쓴 '정확성 불확실이 열려 있어 B ≤ 13'은 이 두 글의 B 점수(9)와 무관한 문구라 근거에서 뺐다. 점수는 그대로다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 대조했다. 감점 원인은 ch07의 '시리즈 마지막 장' 안내(seriesOrder 8·9 공개), ch08 126행 'Modern Embedded Recipes Ch 149'(대상 seriesOrder 150), 00-preface 편수 표기(53편 vs 공개 56편), ch06 467행 'MMU'(chapter07에 없음), ch04 224행 URL 없는 '[Ch 6 trace 장]'이다.

## 글별 근거

### `embedded/chapter04-jlink.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에는 6cab6d72(388행 `$` 이스케이프), 35baac92(도구·다이어그램 수정 일괄)와 em-dash 정리·slug 고정·topic·제목 변경·linter·callout 변환·디렉터리 이름 변경 커밋뿐이다. Segger 사용자 매뉴얼(UM08001)·wiki 같은 1차 자료와 구체 주장을 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Commander 명령 목록(60~79행)과 GDB Server 옵션 표(108~122행)는 명령 카탈로그를 옮긴 수준이다. 이 글만의 관점은 -device 이름을 잘못 적으면 connect·load는 되고 flash만 실패해 착각한다는 설명(126~132행), CI 스크립트(335~370행), '시작은 OpenOCD, 본격 작업은 J-Link' 선택 기준(401행) 정도다. 속도 비교 표(182~187행)와 우위 원인(191~193행)은 출처 없는 일반론이고, 13행 '거의 모든 문제가 사라집니다', 195행 '충분히 회수됩니다'는 근거 없는 단정이다. 앵커 part1-04보다 고유 절이 조금 많아 11. |
| B | 11 | 하드웨어 → 설치 → Commander → GDB Server → GDB 연결 → 속도 비교 → UFBP → RTT → J-Run → J-Trace → Ozone → Configurator → Adaptive Clocking → Lock 해제 → CI → 라이선스 → 비교 → 정리(21~412행)로 description이 약속한 도구를 모두 다뤄 기본 흐름은 완성됐다. 다만 J-Trace(270~284행)와 Ozone(286~301행)은 명령 한 줄과 불릿뿐이고, UFBP 조건(211행 'FP_REMAP 지원')은 어떤 칩인지 없으며, Lock 해제(325~331행)는 칩별로 다르다는 말로 끝난다. 30~31행 표 행은 칸 수가 머리(4칸)와 다르다. 정확성 의문이 열려 있어 AP-C-24에 따라 B ≤ 13, 깊이 부족을 반영해 11. |
| C | 7 | 설치 검증 출력(46~53행), GDB Server 기동 출력(99~104행), load 출력(147~160행), CI 스크립트(335~370행)처럼 재현 가능한 명령은 있다. 그러나 OpenOCD 대비 속도 표(184~186행 '~6초/~1.5초', '~10초/~3초', '~5ms/~1ms'), 224행 '100 KB/s 이상', 252행 '1초에 수십~수백 라인'은 출처·측정 환경(보드, SWD 속도, 펌웨어 크기) 없는 수치라 3-1에 따라 C ≤ 8. CI 스크립트는 350~351행에서 ELF를 loadfile한 뒤 verifybin으로 0x08000000과 비교하고, 353행 qc로 연결을 끊은 뒤 358행 JLinkRTTClient로 캡처하는 구성이라 그대로 동작하는지 글만으로 판단할 수 없어 7. |
| D | 9 | 비교 글: 같은 시리즈 chapter03-openocd.md(J-Link는 25·112·344행 언급뿐, 501·506행에서 이 글을 다음 장으로 안내해 역할 구별), chapter05-elf-map.md(겹침 없음), chapter06-trace.md(RTT), 다른 시리즈 tools/debugging/gdb-lldb/chapter08-remote-debugging.md, embedded/modern-recipes/part10-02-jtag-swd.md. 겹침: 99~104행 JLinkGDBServer 출력 = ch08 490~495행, 126~132행 -device 경고 ≈ ch08 508행, 199~209행 UFBP ≈ ch08 515~522행 거의 같은 문장, 13·18·33행 EDU 무료·OpenOCD가 끊기면 J-Link ≈ ch08 513행, 244행 SEGGER_RTT_printf tick 예제 = ch08 672행·ch06 246행, 236~237행 JLinkRTTViewer/Client = ch06 259~260행, 245행 채널 1 SEGGER_RTT_Write 256 = ch06 288행, 60~72행 Commander ≈ part10-02 179~188행. ch08이 14행에서 이 시리즈를 깊은 참조로 가리켜 역할은 갈리지만 예제·출력 반복이 상당해 5~9 구간. |
| E | 6 | 제목의 JLinkExe·RTT·GDB Server와 description의 J-Run·J-Trace·Unlimited Flash BP·Ozone이 모두 절로 있다(58·94·197·222·256·270·286행). 제목은 '분석'을 내걸지만 본문은 명령 사용법 나열이 중심이고, 대상 독자와 해결하려는 문제가 13행 'OpenOCD가 자꾸 끊긴다면' 외에는 드러나지 않아 6~8 구간 하단. |
| F | 6 | 416행 다음 장 안내 'Ch 5 — 베어메탈 ELF / MAP'은 seriesOrder 5 chapter05-elf-map.md('ELF와 MAP 파일 분석')와 맞다. 420행 'Ch 3: OpenOCD 깊이' → chapter03-openocd.md(seriesOrder 3), 421행 'Ch 5: ELF / MAP' → chapter05-elf-map.md로 라벨이 맞다. 감점: 224행 '[Ch 6 trace 장]'은 URL 없는 대괄호라 링크로 렌더되지 않고, 30~31행 J-Trace PRO·Flasher 행은 칸 수가 표 머리와 달라 깨져 보인다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 7 이상은 주지 않았다. |
| G | 2 | 본문 출처는 142행 Segger Supported Devices 링크(-device 이름 주장과 연결)와 422~424행 Segger wiki 메인·Supported Devices·Ozone 제품 페이지뿐이고, 버전은 39·47행 V7.94 출력에만 보인다. 속도 표(184~187행), UFBP 동작 원리(205~211행), 라이선스 해석(376~382행) 같은 핵심 주장에 연결된 1차 출처(UM08001 절, 라이선스 문서)가 없다. |

uncertainties:
- 25행 EDU mini '~$20'과 388행 J-Link 가격 '$50~$1000+'가 어긋난다. 388행이 상업용 모델만 뜻하는지 불분명해 오류 확인으로 올리지 않았다.
- 205~211행 UFBP 원리(flash 페이지를 SRAM에 복사·FP_REMAP 매핑)가 Segger 문서상 flash 자체를 BKPT로 재프로그래밍하는 방식인지 미확인. 기억에 기댄 의심이라 감점 근거로 쓰지 않았다.
- 199행 'FPB HW BP 6개'는 코어(M0/M3/M4/M7)에 따라 다를 수 있어 미확인.
- 318행 'speed adaptive'가 RTCK를 따른다는 설명은 JTAG 전용 신호인데 글은 SWD를 쓰고, 321행 'OpenOCD에 없는 기능'도 OpenOCD의 RTCK 지원 여부를 확인하지 않았다.
- 240행 'SEGGER_RTT.c/h 100 KB 미만'과 chapter06-trace.md 252행 '~3KB'가 다르다(다른 글과의 모순, 1차 자료로 미확인).
- 350~351행 CI 스크립트의 loadfile·verifybin 비교와 353행 qc 뒤 358행 JLinkRTTClient 캡처가 동작하는지 미확인.
- 259·266행 JRunExe '-rtt' 옵션, 275행 JTraceExe 명령과 '-tracesink SWO' 옵션의 존재 여부 미확인.
- 382행 'EDU 프로브로 굽힌 펌웨어는 상업적 배포 불가' 라이선스 해석은 출처가 없다.
- 157행 '90 KB/sec ← 4 MHz SWD 기준'과 184행 '64KB ~1.5초'(약 43 KB/s)는 조건이 달라 비교 불가, 측정 근거 없음. 25행 EDU mini 최대 3 MHz와 51행 EDU Mini 연결 출력·64·157행 4 MHz 설정이 같은 프로브를 뜻하는지도 불분명.
- 396행 OpenOCD의 ETM trace를 '별도 J-Trace 펌웨어'로 적은 표현의 의미 미확인.

병합 대상: `tools/debugging/gdb-lldb/chapter08-remote-debugging.md`의 J-Link 절(486~522행)·RTT 절(656~680행), `tools/debugging/embedded/chapter06-trace.md`의 RTT 절. 다음 조치는 보강이다. 'J-Link 도구 체인'은 독립 검색 의도가 있고 이 글이 시리즈 안에서 J-Link 정본 역할을 하므로(ch03 501·506행, gdb-lldb ch08 14행이 이 글/시리즈를 가리킴) 병합하지 않고 차별화 보강한다. RTT 설명(222~254행)은 ch06으로 넘기고 링크만 남기며, gdb-lldb ch08의 UFBP·GDB Server 반복은 이 글을 가리키게 정리한다. 속도 표의 측정 환경 또는 출처(없으면 TBD), UFBP·라이선스 주장의 1차 출처, J-Trace·Ozone 절의 구체 절차, 224행 링크와 30~31행 표 보수를 보강한다.

### `embedded/chapter05-elf-map.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에는 1차 자료 대조 커밋이 없다(3232b1be 태그 정규화, 0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그 등). 오류 확인은 같은 firmware.elf/firmware.map 예시 안의 내부 모순으로 정했다.
- (1) 63·92행 readelf는 .data LMA(PhysAddr)를 0x0800a4c0이라 하는데, 257행 MAP은 'load address 0x0800a3ac'라 한다. 0x0800a3ac는 38행 .fini_array(0x0800a3ac, 크기 4) 자리다.
- (2) 272행 main.o .bss는 0x20000140+0x4c0=0x20000600에서 끝나고 275행 sensor.o .bss가 0x20000600에서 시작하는데, 274행은 main.o 심볼 state_table을 0x20000800에 둔다.
- (3) 320행 large_buffer 크기는 0x800=2048바이트인데 323행은 '4KB짜리'라 한다.
- (4) 42행 readelf는 .stack을 0x20000d40에 두는데 278~280행 MAP은 0x20000940~0x20000d40에 둔다. 187행 링커 스크립트는 스택을 0x1000으로 잡지만 42·278행 결과는 0x400이다.
- (5) 501행 size의 text 47832(0xBAD8)는 517~519행 .isr_vector+.text+.rodata 합 0xA3A0(41888)보다 약 6KB 크다.
- (6) 103~112행 Reset_Handler는 __etext·__data_start__·__data_end__·__bss_start__를 쓰는데, 170~181행 링커 스크립트는 _sidata·_sdata·_edata·_sbss·_ebss만 정의한다. 132행은 둘이 '정확히 맞물려야' 한다고 한다.
- (7, 더블 체크에서 추가) 62행 첫 LOAD 세그먼트 FileSiz/MemSiz 0x09f80은 0x08009f80에서 끝나는데, 67행은 이 세그먼트에 .rodata·.ARM·.init_array·.fini_array를 넣는다. 33~38행 기준으로 이 섹션들은 0x0800a3b0까지 간다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 내용은 MAP 기반 진단 4가지(296~369행: RAM overflow 메시지→nm --size-sort, PC→addr2line, 큰 함수 찾기, cref), 'CCRAM은 DMA 불가'라는 배치 판단(417~425행), MSPLIM 스택 한계(487~494행) 정도다. 21~70행 섹션/세그먼트, 72~95행 LMA/VMA, 198~212행 링커 스크립트 문법 표는 표준 입문 내용이다. 예시 출력(28~44·58~70·232~292행)은 수치가 서로 맞지 않아 분석 근거로 쓸 수 없다. 377행 '수십·수백 KB가 줄어듭니다', 444행 '~수 KB'는 근거 없는 일반론이다. 진단 절차가 있으므로 앵커 part1-04(10)보다 1점 높다. |
| B | 12 | description이 약속한 LMA/VMA(72~95행), 링커 스크립트(134~222행), MAP 진단(224~369행), startup 코드(97~132행)를 모두 다루고 gc-sections·다중 메모리·size·strip·hex(371~553행)도 이어진다. 하지만 내부 모순이 고쳐지지 않아 AP-C-24에 따라 B ≤ 13이다. 457~459행 TLS 절은 '처리 필요'로 끝나고 방법이 없다. 328·331행은 '.ccmram'을 쓰고 424·435행은 '.ccram'을 써서 328행 예는 그대로는 배치되지 않는다. 440행 외부 SDRAM init은 이름만 나온다. |
| C | 6 | readelf·nm·addr2line·size·objcopy 명령(29·59·316·344·352·499·529~548행)은 따라 할 수 있는 형태다. 하지만 보드·툴체인 버전·소스가 없고, 출력은 서로 맞지 않는다(62 vs 33~38행, 63 vs 257행, 272~275행, 501 vs 517~519행). rubric 3-1에 따라 C ≤ 8이다. 308~310행 awk 파이프라인에는 기대 출력이 없다. 353~355행 nm --print-size의 주소(0x180·0x80·0x10)는 32행 .text 시작 0x080001c0과 맞지 않아 독자가 결과를 대조할 수 없다. 앵커 part7-05(8)보다 낮다. |
| D | 7 | 같은 시리즈의 chapter04-jlink.md·chapter06-trace.md와는 겹치지 않는다. 다른 시리즈와 많이 겹친다. modern-recipes/part3-04-linker-script-basics.md 110~136행(`> RAM AT > FLASH`, _sidata=LOADADDR)·145~160행(startup 복사·bss 영초기화)·263~272행(문법 표)은 이 글 169~212행·108~116행과 거의 같다. part3-05-linker-script-advanced.md 131~142행 gc-sections·KEEP은 371~387행과 같다. part3-10-map-file-analysis.md 36~61행(-Map, Memory Configuration, --cref)은 224~294행과 같은 질문에 실제 공개 map(46행)으로 답한다. part3-03-elf-format.md 39~47·119~138행은 21~70·316·514행과 겹친다. dwarf-elf/chapter06-split-dwarf-tools.md 129~131행은 529~531행과 같은 명령이다. 이 글만의 몫은 디버깅 관점의 진단 4가지(296~369행) 정도라 5~9 구간. |
| E | 6 | 제목 'ELF와 MAP 파일 분석 — 베어메탈 메모리 레이아웃 추적'과 description은 본문 72~369행과 같은 질문을 향한다. 하지만 '분석·추적'을 약속하면서 실제 map 대신 서로 맞지 않는 예시(257·272~280행)로 설명해 레이아웃 추적 결과가 성립하지 않는다. 뒤쪽 절반(371~553행)은 gc-sections·TLS·hex 변환 같은 개요 나열이다. 대상 독자와 전제가 없다. |
| F | 6 | 569행 다음 장 예고 'Ch 6 — 트레이스 (RTT / ITM / SWO / ETM / Semihosting)'는 seriesOrder 6 chapter06-trace.md와 맞다. 573행 Ch 4 J-Link, 574행 Ch 6 Trace, 575행 dwarf-elf ch01도 대상 파일을 열어 라벨이 맞는 것을 확인했다. 진단 1~4 소제목(296·333·349·360행)이 긴 MAP 절을 나눈다. 다만 전제 지식 안내가 없고, 내용이 거의 같은 modern-recipes part3-04·3-10으로 가는 링크가 없으며, 577행 ARMv7-M ARM에는 링크도 절 번호도 없다. |
| G | 2 | 본문 출처는 576행 GNU LD manual 루트 링크(판 없음)와 577행 링크 없는 'ARMv7-M Architecture Reference Manual'뿐이고 어느 주장(LOADADDR·NOLOAD·MSPLIM·UsageFault)의 근거인지 표시가 없다. 대상 칩은 102행 startup_stm32f4xx와 404행 STM32F4로 짐작만 할 수 있고 reference manual 판·툴체인 버전은 없다(245행 13.2.0은 예시 map 경로 안의 문자열). 487~494행 MSPLIM은 ARMv8-M 기능인데 나머지는 F4(Cortex-M4)를 전제로 해 환경이 섞여 있다. |

uncertainties:
- 487행: MSPLIM/PSPLIM을 'ARM CoreSight'의 기능이라 했는데, 기억으로는 ARMv8-M 아키텍처 레지스터다. ARMv8-M ARM으로 확인하지 않았다.
- 494행: MSPLIM 위반 시 UsageFault(STKOF)가 난다는 설명은 Main Extension 유무에 따라 다를 수 있다.
- 534행: --add-gnu-debuglink(531행)로 분리해 놓고 'GDB가 build-id로 자동 매칭'한다고 했다. 기억으로는 debuglink는 파일명+CRC 방식이다. GDB 매뉴얼로 확인하지 않았다.
- 53행: 플래그 L을 'exidx'라 설명했는데 readelf의 L은 SHF_INFO_LINK로 기억한다.
- 31행: .isr_vector 플래그가 WAX(쓰기 가능)인데 flash 벡터 섹션 플래그는 보통 A나 AX다.
- 459행: RTOS task별 변수가 .tdata/.tbss 메커니즘이라는 주장은 구현마다 다르고 근거가 없다.
- 99행: 벡터 테이블 첫 entry 이름 'MSP_initial'은 CMSIS/ST 심볼(_estack 등)과 다르다.
- 308~310행 awk 파이프라인이 260~275행 형식의 map에서 의도대로 동작하는지 실행해 보지 않았다.
- 404행 CCM 64KB, 417행 'CCRAM은 DMA 불가'는 STM32F4 RM으로 확인하지 않았다.

병합 대상(점수 구간 참고): `embedded/modern-recipes/part3-10-map-file-analysis.md`(MAP 해독, 이 글 224~294행), `part3-04-linker-script-basics.md`(링커 스크립트·startup, 97~222행), `tools/debugging/dwarf-elf/chapter01-elf-overview.md`(섹션/세그먼트, 21~70행). 다음 조치는 보강이다. 먼저 예시 출력의 내부 모순 7건을 한 빌드에서 뽑은 실제 readelf·map·size 출력으로 바꾸고 환경(칩·툴체인 버전)을 적는다. 겹치는 개념 절은 위 글로 링크하고 줄인 뒤 '디버거 관점 진단'(296~369행)을 중심으로 차별화한다. 펌웨어 메모리 문제 진단이라는 독립 검색 의도가 있어 바로 병합하지는 않는다.

### `embedded/chapter06-trace.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글이 100·475행에 직접 링크한 ARM semihosting 명세(ARM-software/abi-aa semihosting.rst, release 2025Q4, 2026-01-23 발행)를 열었다. 명세 553~575행 연산 목록과 739·941·643행 절 제목에서 SYS_EXIT = 0x18, SYS_HEAPINFO = 0x16, SYS_ELAPSED = 0x30이다.
- 글 96행: SYS_EXIT를 0x0c로 적었다(명세상 0x0C는 SYS_FLEN).
- 글 97행: SYS_HEAPINFO를 0x12로 적었다(명세상 0x12는 SYS_SYSTEM).
- 글 98행: SYS_ELAPSED를 0x13으로 적었다(명세상 0x13은 SYS_ERRNO).
같은 표의 0x01~0x07(89~95행)과 29행 M-profile `BKPT #0xAB`/0xBEAB(명세 331행)는 맞다. git log(387d7b79, 35baac92, 0a9dd7bc, 28524a9d, be973200, ac24bb76, 400892d7, 35e57912)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 것은 다섯 방식을 핀·속도·펌웨어 부하·디버거 부하로 나눈 표(19~25행), 상황별 추천 표(389~398행), RTT down 채널 셸 예(421~450행), RTT/UART 폴백 패턴(404~413행)이다. ITM 초기화·putchar(110~139행), tpiu 명령(156행), 코어 클럭 함정(180~182행), ETM 하드웨어 설명(333~336행)은 같은 시리즈 chapter02와 거의 같아 고유 가치로 세지 않았다. 표의 '빠름'·'매우 빠름'(22~24행)은 수치가 없고, 311·313행 처리량, 79행 '수십 ms', 356행 '$1000+'는 출처·환경이 없다. 실패 사례·측정이 없어 13 이상은 주지 않았다. |
| B | 11 | 방식마다 펌웨어 측 → 호스트 측 → 한계 순서(27~385행)와 비교 표(389~398행)·정리(454~463행)로 기본 흐름은 있다. 그러나 semihosting 시스템 콜 표(87~98행)의 세 행이 명세와 다르고, ITM 절은 SWO 핀 대체 기능·DBGMCU 설정 없이 110~131행만 있어 출력이 나오는지 판단할 수 없으며, ETM 절은 명령 두 줄(341~342행)뿐이고, 407행 `JLINK_CONNECTED`는 정의가 없다. 정확성 불확실이 열려 있어 AP-C-24로 B ≤ 13이고, 확인된 오류 때문에 하나 더 내렸다. |
| C | 6 | OpenOCD·J-Link 명령(50·56~58·156~159·172~175·266~275행)과 레지스터 코드(110~139행)가 있으나 대상 MCU가 없고(56행 `-device STM32...`), 156·173행 168000000과 341행 STM32F767ZI가 다른 칩을 전제한다. 예상 출력이 없고, 311·313행 처리량, 79행 '수십 ms', 351행 'ETB 4KB ~ 1MB', 252행 '~3KB'는 출처·환경 없는 수치라 C ≤ 8. 405~413행은 정의 없는 식별자로 그대로 컴파일되지 않고(AP-C-35), 87~98행 표대로 SYS_EXIT 0x0c를 부르면 SYS_FLEN이 실행되므로 4~7 구간. |
| D | 9 | 같은 시리즈 chapter02-jtag-swd-coresight.md — 179·338~339행 `tpiu config internal /tmp/swo.log uart off 168000000 2000000`·`itm port 0 on` = 이 글 156·159행, 327~331행 itm_putchar = 134~139행, 176·342행 코어 클럭 함정 = 180~182행, 344~356행 ETM = 327~336행. chapter04-jlink.md 222~254행 RTT 절(236~237행 = 259~260행, 244~245행 = 246·288행), 275행 JTraceExe = 341~342행. chapter05-elf-map.md(겹침 없음), chapter07-rtos-troubleshooting.md(153행 SEGGER_RTT_printf 한 번). 다른 시리즈: rtos/practical-internals/part2-11-tracing-observability.md(122~126·82·141~143행), performance-engineering/part5-07-baremetal-profiling.md(129~136행), modern-recipes/part10-11-logging-system.md(105~131행), part10-05-uart-not-printing.md(180~189행), qemu-embedded/chapter14-semihosting.md(draft, 68~77행 = 87~98행). ITM/SWO·ETM은 chapter02, RTT는 chapter04와 예제 단위로 반복되어 5~9 구간. 다섯 방식 비교·선택 표와 셸 예만 이 글에 있다. |
| E | 7 | 제목의 다섯 키워드를 모두 다룬다(Semihosting 27행, ITM 102행, SWO 151~176·203~207행, RTT 213행, ETM 327행). 제목의 '선택'은 389~398행 표가 답한다. description의 '코드 예제'는 ETM에 없어(341~342행 명령뿐) 6~8 구간 안에서 감점했다. |
| F | 6 | 번호 붙은 절(1~5, 27~360행)이 19~25행 표의 행과 대응한다. 467행 'Ch 7 — RTOS-aware 디버깅'은 seriesOrder 7 chapter07-rtos-troubleshooting.md와 맞지만 안내의 'MMU'는 그 글에 없다(MPU만 228행). 471행 chapter04, 472행 chapter07, 473행 performance-engineering/part5-07 라벨은 대상 제목과 맞다. 이전 편(chapter05) 링크와 내용이 가장 겹치는 chapter02 링크가 없고, 전제 지식 안내가 없으며, 안내 일부가 대상과 맞지 않아 7은 주지 않았다. |
| G | 2 | 본문 100행에 ARM Semihosting 명세 링크가 87~98행 표 바로 뒤에 있지만 그 표의 세 행(96~98행)이 링크한 명세와 다르다. 474~476행 SEGGER RTT 페이지·ARMv7-M ARM은 절 없이 'latest'·'Appendix'만 적었고 477행 newlib은 링크가 없다. 버전 표기는 325행 'OpenOCD 0.11+' 하나뿐이고 J-Link·RTT 판, 대상 MCU가 없다. |

uncertainties:
- 407행 `SEGGER_RTT_HasData(0)`을 연결 여부 판정으로 썼다. down buffer 데이터 유무를 보는 API라면 판정이 아니다. SEGGER_RTT.h로 확인하지 않았다. `JLINK_CONNECTED`는 글 안에 정의가 없다.
- 126행 `ITM_TCR_TraceBusID_Msk`를 그대로 OR하면 TraceBusID 필드 전체가 1이 된다. CMSIS·ARMv7-M ARM으로 확인하지 않았다. 125행 주석 'stim port 0 enable'과 128행 TER = 0xFFFFFFFF도 표현이 어긋난다.
- 156행 `tpiu config internal … uart off <clk> <baud>`가 현재 OpenOCD(`tpiu create`/`configure` 방식)에서 동작하는지 확인하지 않았다(chapter02 179·338행도 같은 문법).
- 334·341행 'SWO 한 핀(1bit)으로 ETM trace'와 `-tracesink uart`: Cortex-M에서 SWO로 ETM 스트림을 낼 수 있는지, 해당 옵션이 SEGGER 도구에 있는지 미확인. chapter04 275행은 같은 명령에 `-tracesink SWO`를 쓴다.
- 311행 '~1 MB/s', 313행 '~수십 KB/s', 79행 '수십 ms', 205행 QFN-32 SWO, 351행 'ETB 4KB ~ 1MB', 356행 '$1000+', 252행 '~3KB'는 출처·환경 없는 수치다.
- 333행 'ETM은 M3/M4 옵션, M7+ 일반적 탑재'와 211·396행 'M0/M0+는 ITM 없음'은 ARMv6-M/ARMv7-M 문서로 확인하지 않았다.
- 415행은 'stack 사용량 최적화'의 근거로 코드 크기를 든다. 표현 문제라 오류 확인에 넣지 않았다.
- 292행 NO_BLOCK_SKIP이 기본 모드라는 진술은 SEGGER_RTT_Conf.h 기본값으로 확인하지 않았다.

병합 대상(점수 구간 참고): ITM/SWO·ETM 절은 `chapter02-jtag-swd-coresight.md` 172~179·317~356행, RTT 절은 `chapter04-jlink.md` 222~254행과 겹친다. 다만 다섯 방식 비교·선택(19~25·389~398행)은 이 글에만 있고 chapter04 224행·chapter05 569행이 이 글을 정본으로 가리키므로 다음 조치는 보강이다. 96~98행 시스템 콜 번호를 명세대로(SYS_EXIT 0x18, SYS_HEAPINFO 0x16, SYS_ELAPSED 0x30) 고치고, chapter02와 겹치는 ITM·ETM 기본 설명은 링크로 줄이고, 대상 MCU·probe·도구 판과 기대 출력을 정하고, 출처 없는 수치는 1차 자료로 확인하거나 지우고, 405~413행 폴백 코드를 정의된 API로 고친다.

### `embedded/chapter07-rtos-troubleshooting.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1).
- 183행 "[12:8] BFSR (BusFault):"는 BFSR가 CFSR의 bit 12~8이라고 적는다.
- 184행은 같은 BFSR 목록에 "[15] BFARVALID — BFAR 유효"를 넣는다.
12:8 범위의 필드에 bit 15가 들어갈 수 없으므로 두 진술은 동시에 참일 수 없다. 같은 글 191~192행 MMFSR "[7:0]"과 "[7] MMARVALID"는 서로 맞아 단순 표기 습관이 아니다. git 이력의 1차 자료 대조 기록은 a82eb9d0의 하위 커밋 "FreeRTOS computes the stack high water mark"(FreeRTOS-Kernel main tasks.c 121·1835·6470~6483행) 하나로 78행 한 문장만 대조했다. 0a9dd7bc·be973200·ac24bb76 등 나머지는 slug·메타·제목 변경이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 내용은 78행 HWM 계산 방식(0xA5 fill 패턴을 셈, a82eb9d0으로 대조됨), 363~372행 Boot 안 됨 진단 순서, 255~266행 MPU NULL 가드 정도다. 29~40행 지원 RTOS 목록, 109~115행 fault 종류 표, 174~197행 CFSR 비트 목록, 380~384행 RDP 표는 공식 문서를 요약한 카탈로그이고, 절마다 한두 문장이라 선택 기준이나 실패 사례가 없다. 앵커 part1-04(A 10)와 깊이가 비슷하고 범위는 넓어 11. |
| B | 9 | RTOS-aware → Hardfault → MPU → stack overflow → DMA 캐시 → 신호 무결성 → boot → RDP 순서로 나열하지만 코드가 여러 곳에서 끊긴다. 86~99행 GDB 스크립트는 96행 "..."에서 끝나 97행 `free`가 정의되지 않는다. 243~244행 MPU 영역 1은 "..."로 크기·AP를 비웠고, 206행 decode_cfsr와 436행 main도 "..."다. 183행 BFSR 범위 모순이 열려 있어 AP-C-24에 따라 13 이하이고, 한계(411~415행)는 있지만 결과·전제가 빠져 5~9 구간. |
| C | 6 | 실행 가능한 명령이 있다(25~26행 OpenOCD `-rtos`, 45~46행 JLinkGDBServer, 167행 addr2line, 343~347행 reset_config, 389~392행 RDP 해제, 358행 ST-Link 펌웨어 업데이트). 그러나 65~72행 `info threads` 출력과 168~169행 addr2line 출력은 보드·빌드·도구 버전 없는 예시다. 325행 ">15cm", 329행 "외부 10kΩ", 351행 "0.1µF + 10µF"는 출처·환경 없는 수치라 C ≤ 8이다. 통과·실패가 갈리는 검증 절차가 없어 4~7 구간. |
| D | 7 | 같은 시리즈 chapter06-trace.md·chapter08-cxl-link-debug.md는 주제가 달라 겹치지 않는다. 같은 시리즈 chapter03-openocd.md 394~403행 RTOS-aware 절(`configure -rtos FreeRTOS/auto`, info threads, 지원 RTOS 목록)이 이 글 21~40행과 거의 같다. 다른 시리즈: src/content/blog/embedded/modern-recipes/part10-04-hardfault-analysis.md가 `tst lr,#4` SP 선택(63~70행), CFSR 비트 표(106~125행), addr2line(137~140행), DISDEFWBUF(196행), NVRAM 저장(201행~)으로 이 글 123~170·172~208·215~220·417~440행과 같은 질문에 같은 순서로 답한다. src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md 37·82~96·291행이 이 글 274~303행과 겹친다. 이 글만의 역할은 신호 무결성·연결 트러블슈팅(321~372행)과 RDP 해제(374~409행) 정도라 5~9 구간. |
| E | 5 | 제목은 "Task·Queue·Stack 분석"인데 Queue는 70행 `xQueueReceive` 출력 한 줄뿐이고 queue 분석 절이 없다. 제목이 "분석"을 약속하지만 본문은 항목 나열 수준이라 E 주석에 따라 3~5점이다. description(5행)의 Hardfault·MPU·신호 무결성·보안 lock은 다루고, Zephyr는 39행 목록 한 줄뿐이다. |
| F | 4 | 13행이 이 글을 "이 시리즈의 마지막 장"이라 하고 442~452행 "정리 (시리즈 전체)"는 Ch1~7만 적는데, 같은 디렉터리에 seriesOrder 8 chapter08-cxl-link-debug.md와 9 chapter09-cxl-device-troubleshoot.md가 draft: false로 공개돼 있다. 다음 편(seriesOrder 8) 안내가 없고 시리즈 범위 안내가 틀려 5 이하다. 226행 링크 라벨은 "CMSIS 5"인데 URL은 CMSIS_6이다. 456~461행 Ch1~6 라벨은 대상 제목과 맞다. 긴 글에 전제 지식 안내가 없다. |
| G | 2 | 468~471행에 ARM 문서·FreeRTOS·Zephyr·CMSIS 링크가 있지만 본문 주장과 연결되지 않는다(174~197행 CFSR 비트, 380~384행 RDP 표, 389~392행 OpenOCD 명령에 출처 없음). 본문 안 출처는 226행 하나인데 라벨(CMSIS 5)과 URL(CMSIS_6)이 다르다. FreeRTOS·OpenOCD·CMSIS 버전과 대상 MCU가 없고 45행 STM32F407, 307행 M7, 287행 M33이 섞인다. |

uncertainties:
- 115행 "DebugFault"를 fault 종류로 적었는데 ARMv7-M의 DebugMonitor 예외·HFSR DEBUGEVT와의 구분을 1차 자료로 확인하지 않았다.
- 283행 "`1`은 magic word만": FreeRTOS method 1은 SP 범위 검사, method 2가 끝 패턴 검사라는 기억과 다르다. FreeRTOS 문서로 확인하지 않았다.
- 174~181행 UFSR 범위 머리글([31:16])이 빠져 있다. 183행 BFSR 범위는 modern-recipes part10-04 109행 [15:8]과도 다르다(다른 글과의 모순은 판정 근거가 아님).
- 366행 IDCODE 검출을 `info reset`으로 본다는 명령이 OpenOCD에 있는지 미확인.
- 390~392행 `stm32f4x unlock 0`·`option_write 0 0xaa 0xff` 인자와 순서를 OpenOCD 문서로 확인하지 않았다.
- 468행 ddi0337은 Cortex-M3 TRM인데 라벨은 "Cortex-M3/M4 Programming Manual"이다.
- 58행 `KEEP(*(.rtos_meta*))` 섹션 이름과 56행 "디버그 빌드면 자동"의 근거 미확인.
- 300행 HWM 단위(words)와 97행 GDB 스크립트의 bytes 단위가 달라 독자가 혼동할 수 있다(측정 대상이 달라 모순은 아님).

병합 대상(점수 구간 참고): Hardfault 절(103~226·417~440행)은 `src/content/blog/embedded/modern-recipes/part10-04-hardfault-analysis.md`, stack overflow 절(268~303행)은 `src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md`, RTOS-aware 설정(21~40행)은 같은 시리즈 `chapter03-openocd.md` 394~403행과 겹친다. 다음 조치는 보강이다. 먼저 183행 BFSR 범위를 ARMv7-M ARM으로 고치고, 이 글의 독립 역할인 연결 트러블슈팅(321~372행)·RDP 해제(374~409행)를 중심으로 키우며 겹치는 절은 해당 글 링크로 줄인다. 13행·442~461행 시리즈 안내를 Ch8~9 포함으로 갱신한다.

### `embedded/chapter08-cxl-link-debug.md` — 53점, 병합 검토

confidence: 중간

factcheck: 검증됨. 커밋 815be859가 lspci DVSEC·LnkCap 출력을 pciutils ls-ecaps.c·ls-caps.c·lib/header.h @ master, dmesg 문자열을 torvalds/linux drivers/cxl/pci.c @ master, Summit T516을 Teledyne LeCroy 제품 페이지, Keysight U4154A를 fact sheet 5990-9444EN과 대조하고 출처를 커밋 본문에 적었다. 커밋 5b031eb6은 `CXL [0502]` 클래스를 pciutils pci.ids와 대조했다. LTSSM 표(27~41행)·Flex Bus 협상(58행)은 규격 대조 기록이 없어 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 15·112행 층 구분(PHY·LTSSM·Flex Bus·DVSEC·CEDT·드라이버)과 96~99행 증상→층 매핑(lspci 부재=L0 미도달, /sys/bus/cxl 비면 CEDT·cxl_acpi, dmesg "Device DVSEC not present"=cxl_pci)이 고유 기여다. 27~41행 LTSSM 표는 PCIe 일반 내용이고, 43행은 상태 읽는 법을 'reference manual에서 확인한 값으로 읽습니다'로 미뤄 핵심 수단이 비었다. 47·115행 '마지막 무기' 반복. 6~12 구간 상단. |
| B | 11 | 13~17행 문제 제기 → 19~43행 LTSSM → 45~58행 analyzer → 60~90행 호스트 명령 → 92~99행 함정 → 101~108행 체크리스트 → 110~115행 정리로 흐름은 완결됐다. 그러나 description(5행)의 cxl-cli는 107행 한 줄뿐, analyzer 절은 캡처 항목 3줄(56~58행)뿐이고 판독법이 없으며, Flex Bus 협상 실패(PCIe로만 붙는 경우) 증상·확인법이 없다. 114행 'lspci → cxl-cli → dmesg' 순서는 본문 62~90행(lspci → /sys/bus/cxl → dmesg·lsmod)과 다르다. 열린 불확실이 있어 AP-C-24로 B ≤ 13. |
| C | 8 | 62~90행에 명령과 예상 출력, 67·74·82·87행에 실패 시 해석 주석이 있고 출력 형식은 pciutils와 대조됐다(815be859). 하지만 커널·플랫폼·디바이스 환경이 없고, 출력은 정상 예시 한 벌뿐이며 실패 시 실제 관찰(폭 축소 LnkSta, 빈 /sys/bus/cxl, dmesg 로그)이 없다. 107행 `cxl list -RT`는 출력이 없다. 측정·실패 기록 부재로 8. |
| D | 9 | 비교: (1) 같은 시리즈 chapter07-rtos-troubleshooting.md(겹침 없음), chapter09-cxl-device-troubleshoot.md(RAS·poison, 링크 이후 단계로 역할 구분), chapter18-highspeed-link-bringup.md(draft) 15·127·182행이 LTSSM 진단을 이 글에 위임. (2) embedded/hardware/pcie/chapter09-physical-layer.md 19~45행 LTSSM 상태·타임라인 표 ↔ 이 글 27~34행. (3) pcie/chapter16-troubleshooting.md 19~32·34~46행 ↔ 이 글 36~41·96~98·103~104행. (4) tools/debugging/kernel/chapter08-cxl-driver-debug.md 101·104행 ↔ 이 글 99·97행. (5) modern-recipes/part11-15-pcie-to-cxl.md 75~81행 lspci -nn·DVSEC grep ↔ 이 글 62~80행. CXL 층별 진단 순서를 한 장에 묶은 역할은 있으나 구성 요소 대부분이 반복되어 5~9 구간 상단. |
| E | 6 | 제목(2행) 'LTSSM 상태'는 19~43행에서 다루지만 실제 읽는 법은 43행에서 미룬다. 'Protocol Analyzer 활용'은 49~58행에 제품 한 행과 캡처 항목 세 줄뿐이고 트리거·해석 등 활용법이 없다. description(5행)의 cxl-cli는 107행 한 줄. 제목 키워드 하나를 거의 다루지 않아 6. |
| F | 5 | 119행 다음 장 예고(Ch 9 RAS·poison·media error)는 seriesOrder 9 chapter09-cxl-device-troubleshoot.md 제목과 맞다. 123행 Ch 2는 chapter02-jtag-swd-coresight.md(seriesOrder 2) 제목과 맞으나 주제 연관이 약하고, 124행 Bootloader Ch 34·125행 HBM Ch 9는 대상 seriesOrder·제목과 맞다. 126행 'Modern Embedded Recipes Ch 149'는 대상 part11-15-pcie-to-cxl.md의 seriesOrder가 150이라 라벨 오류 → F ≤ 5. 25행 TODO 주석이 남아 있다. |
| G | 2 | 본문 출처는 99행 `drivers/cxl/pci.c` 파일명 하나뿐이고 커널 버전이 없다. 27~41행 LTSSM·58행 Flex Bus에 PCIe Base Spec·CXL Spec 판 인용이 없다. 51행 Summit T516 제품 페이지 링크·pciutils 버전이 없다. 커밋 본문의 출처는 G에 반영하지 않았다. |

uncertainties:
- 27~41행 LTSSM 상태·원인 매핑은 PCIe Base Spec과 대조 기록이 없다(815be859는 lspci·dmesg·제품만 대조).
- 58행 Flex Bus 모드 협상이 modified TS1/TS2로 이뤄진다는 서술의 CXL Spec 판·절 미확인.
- 67·96·103행 'lspci에 안 보이면 L0 미도달' 단정. pcie/chapter16-troubleshooting.md 26~32행은 BIOS slot 비활성·bus 번호 충돌 등 다른 원인도 든다(다른 글과의 차이라 오류 확인 아님).
- 98행 'LinkSta "Train+"'는 필드명 LnkSta와 다르고, 70행 grep은 Train 플래그 줄을 출력하지 않는다(815be859 본문). 104행 'LnkSta로 Recovery 반복 판단' 방법 미제시.
- 15행 '최소 5가지 원인 후보'는 본문에 다섯 개로 나열되지 않는다(112행은 여섯 층 나열, 개수 표기 문제).
- 82행 'CXL 호환 디바이스 아니거나 firmware 문제'와 105행 '없으면 CXL 미지원 디바이스'의 해석 범위가 다르다(모순 수준은 아님).
- 107행 `cxl list -RT` 옵션 의미 미확인.

병합 대상: LTSSM 표·LnkSta 부분은 `src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md`(19~45행)·`pcie/chapter16-troubleshooting.md`(시나리오 1·2), CXL 드라이버 함정은 `src/content/blog/tools/debugging/kernel/chapter08-cxl-driver-debug.md`(101·104행). 다음 조치는 보강이다. 'CXL 링크가 어느 층에서 막혔나'라는 독립 검색 의도가 있고 chapter18(draft) 15·127·182행이 LTSSM 진단을 이 글에 위임하므로 병합보다 차별화 보강이 맞다. 일반 LTSSM 표는 PCIe Ch 9 링크로 줄이고 Flex Bus 협상 실패 증상, cxl-cli 출력 해석, analyzer 캡처 판독을 1차 자료와 함께 채운다. 126행 라벨을 seriesOrder에 맞춘다.

### `embedded/chapter09-cxl-device-troubleshoot.md` — 60점, 보강

confidence: 중간

factcheck: 검증됨. 커밋 2b646ec1 "fix(content): Embedded Debugging Ch 9 — real cxl-cli commands/opcodes, Event Log handling, poison ABI" 본문에 opcode(0x4200·0x0100·0x0101·0x4300·0x0103), cxl-cli 명령·옵션, sysfs/debugfs 경로, tracepoint 필드, Event Log 이름을 대조한 출처가 있다. 커널 쪽은 torvalds/linux drivers/cxl/cxlmem.h·pci.c·core/trace.h·core/mbox.c, Documentation/ABI/testing/sysfs-bus-cxl·debugfs-cxl @ master, ndctl 쪽은 pmem/ndctl cxl/cxl.c, Documentation/cxl/cxl-list.txt·cxl-monitor.txt·cxl-clear-media-poison.txt·cxl-inject-media-poison.txt @ main이다. 틀린 항목은 고치고 근거 없는 항목은 지웠다는 기록도 있다. 평가 중 1차 자료를 직접 열지는 않았고, 원문 안에서 서로 모순되는 두 위치는 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글에만 있는 내용은 세 곳이다. 143~145행은 cxl_event_config()가 host bridge native_cxl_error를 보고 이벤트를 OS가 처리할지 펌웨어가 처리할지 가른다고 설명한다. 149~155행 함정 표는 pci.c의 실제 dmesg 문자열(152·153행)로 증상을 나눈다. 103행은 memdev로 조회할 때와 region으로 조회할 때 offset 기준이 다르다는 점과 libtracefs 빌드 전제를 짚는다. 반면 health JSON(37~68행)과 media_errors JSON(83~100행)은 ndctl 문서 예시(34·80행)를 옮긴 것이고 필드 해석이 없다. 172행 '장기 추적해 디바이스 교체를 판단'에는 판단 기준이 없다. 13~19 구간 아래쪽, 앵커 part12-10(18)보다 낮다. |
| B | 12 | 13~17행 문제 정의 → Event Log(19~30행) → health(32~76행) → poison(78~110행) → sysfs/debugfs(112~120행) → bpftrace(122~141행) → 처리 주체(143~145행) → 함정(147~155행) → 워크플로(157~164행) → 정리(166~172행)로 흐름이 이어진다. health 필드(44~65행)를 읽는 법, poison을 찾은 뒤의 조치, 제목의 RAS 이벤트 레코드 내용(general media·DRAM 등)이 없어 10~15 구간이다. 정확성 불확실이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 9 | 실제 명령과 옵션(37·74~75·83·108행), 빌드 전제(103행 -Dlibtracefs=enabled), 그대로 돌릴 수 있는 bpftrace 스크립트(126~141행), 증상을 가르는 dmesg 문자열(152~153행)이 있다. 그러나 출력은 직접 실행한 결과가 아니라 ndctl 문서 예시다(34·80행). 커널·ndctl 버전과 장비 환경이 없고 합격·실패 관찰을 나눈 확인 절차도 없다. 3-1의 '절차만 있으면 C ≤ 9'와 AP-C-24를 적용했다. 출처 없는 구체 수치는 없어 C ≤ 8 상한은 해당하지 않는다. |
| D | 9 | 같은 시리즈 chapter08-cxl-link-debug.md(119행에서 이 글을 예고, 겹침 없음)와 chapter10-silicon-bringup-method.md(draft, 주제 무관)를 봤다. 다른 시리즈: memory/chapter06-cxl-memory-diagnostics.md는 부제가 같고(2행) Event Log 4종 표(57~64행 ↔ 23~28행), -H/-L/monitor(43~50행 ↔ 37·83·74행), 워크플로(97~102행 ↔ 159~164행), 장기 추적 정리(110행 ↔ 172행)가 겹치지만 53·93행에서 상세를 이 글로 넘긴다. embedded/hardware/cxl/chapter15-ras-performance.md는 Event Log 표(38~43행), cxl list·monitor·AER bpftrace(130~145행 ↔ 37·83·74·126~141행), 장기 지표 표(151~157행 ↔ 164·172행)가 겹친다. postmortem/chapter05-cxl-device-postmortem.md는 21·102행에서 언급만, kernel/chapter09-drivers-cxl-walkthrough.md는 116행에서 cxl_event_config()를 표 한 줄로 다룬다. 같은 표·명령·결론이 반복되어 5~9 구간이고, 이 글이 가장 상세해 병합 대상은 아니다. |
| E | 7 | 제목(2행)의 'Poison List·Media Error 추적'은 78~110행, description(5행)의 '진단 흐름'은 157~164행이 이행한다. 'RAS 이벤트'는 Event Log의 종류(19~30행)와 수집 경로(71~76·143~145행)만 다루고 레코드가 어떤 고장을 뜻하는지는 다루지 않으며, bpftrace(124행)도 Event Log 레코드가 아니라 AER tracepoint를 센다. 키워드 하나의 부분 미이행이라 6~8 구간 안에서 감점했다. |
| F | 6 | 15행에서 Ch 8 링크로 전제(링크 계층)를 밝히고, 157~164행 워크플로가 앞 절들을 순서대로 묶는다. 관련 항목 180~183행 대상 4개(chapter08-cxl-link-debug, kernel/chapter08-cxl-driver-debug, memory/chapter06-cxl-memory-diagnostics, postmortem/chapter05-cxl-device-postmortem)는 모두 존재하고 라벨이 제목과 맞으며 draft:false다. seriesOrder 10(chapter10-silicon-bringup-method.md)은 draft:true이고 176행은 '시리즈의 CXL 챕터는 여기까지'라고만 적어 모순되지 않는다. 다만 176행은 Kernel Ch 8~9와 Memory Ch 6~7을 링크 없이 산문으로만 안내한다(kernel/chapter09·memory/chapter07은 실제로 있음). audit:reading·폰 폭 렌더는 확인하지 않아 6. |
| G | 3 | 본문에 주장과 묶인 1차 출처 위치가 여럿 있다: 21·124행 drivers/cxl/core/trace.h, 30·145행 drivers/cxl/pci.c, 34행 ndctl Documentation/cxl/cxl-list.txt, 80행 CXL 3.1 Table 8-140, 114행 Documentation/ABI/testing/sysfs-bus-cxl·debugfs-cxl. 그러나 링크가 없고, 118행 v6.4는 인터페이스가 들어온 버전일 뿐 대조한 커널·ndctl 버전이나 날짜는 본문에 없다. 커밋 2b646ec1의 master/main 기준은 독자에게 보이지 않는다. |

uncertainties:
- 80행 'CXL 3.1 Table 8-140': 커밋 2b646ec1의 출처 목록에 CXL spec이 없다. 표 번호를 spec으로 확인하지 않았다.
- 118행 trigger_poison_list '(v6.4)': ABI 문서의 KernelVersion 값과 같은지 직접 열어 보지 않았다.
- 119행 inject_poison '64바이트 poison 주입': debugfs-cxl 문구와 직접 대조하지 않았다.
- 126~141행 bpftrace: memdev가 __string(data_loc) 필드인데 str(args->memdev)가 현재 bpftrace 버전에서 그대로 동작하는지 확인하지 않았다.
- 153행 'FW still in control…' 경로의 반환값 -EBUSY: 커밋은 pci.c에서 문자열만 가져왔다고 적었고 반환값은 확인하지 않았다.
- 151행 '`cxl monitor`에 이벤트가 안 나옴 ← native_cxl_error 꺼짐': AER·poison trace event는 Event Log 처리와 별개로 나올 수 있다는 의심이 있지만 기억에 기댄 것이다.
- 대조 기준이 날짜 없는 master/main이다. 이후 upstream에서 cxl_event_config, cxl_mem_get_event_records 이름이 바뀌었는지는 audit:upstream으로 확인해야 한다.

### `performance-engineering/00-preface.md` — 42점, 보강

confidence: 중간

factcheck: 미검증. git log -- 00-preface.md 커밋(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, 3d56a230 번역투 수정·공개, fa6eb0c8 편수 갱신, a2635240 Part 확장, 469b8b74 최초 작성 등) 가운데 본문 주장을 1차 자료와 대조한 커밋은 없다. 글 안에서 동시에 참일 수 없는 기술 주장도 없다. 편수 불일치는 허브 표기 문제라 F에서 다룬다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 이 글만의 관점은 29~43행 하나다. Systems Performance가 서버/Linux 중심이라 bare-metal·RTOS·임베디드 도구를 다루지 않는다는 차별화 주장과 39~43행 임베디드 제약 목록이다. 181~197행 핵심 원칙 4개는 원칙마다 한 문장(185·189·193·197행)뿐이고, 201~210행 지표 표와 함께 성능 입문서라면 어디에나 있는 일반론이다. 6~12 구간. |
| B | 8 | 허브 역할(목차·편수·읽는 순서)로 봤다. 62행은 '총 6개 Part, 53개 글'이라고 하지만 디렉터리에는 preface를 빼고 56편이 공개돼 있다(part3-12 seriesOrder 54, part5-11 55, part6-05 56; draft 필드가 없는 글도 content config 기본값 false라 공개). 104행 Part 3 '(11개)'는 실제 12편, 143행 Part 5 '(10개)'는 11편, 162행 Part 6 '(4개)'는 5편이고, 이 세 글은 72~171행 목차 표에 없다. 목차 표 행에 링크가 없고, 175~179행 학습 로드맵은 세 줄짜리 Part 나열이다. 동기(14~43), 대상 독자(45~58), 사전 지식(212~217)은 있다. |
| C | 3 | 실행·검증 절차가 없다. 201~210행 표의 측정 방법 칸은 'PMU counter', '카운터', 'instrumentation', 'PMU, 벤치마크'처럼 이름만 적었고 명령·환경·예상 결과가 없다. 197행 '관측 지표 → 원인 후보 → 검증 실험'도 원칙만 있다. 0~3 구간. |
| D | 10 | 비교한 글: 같은 시리즈 part1-01-methodology.md, part1-03-measurement.md, 다른 시리즈 허브 embedded/embedded-cpp/00-preface.md, embedded/modern-recipes/00-preface.md. (1) H2 뼈대가 같다: 이 글 14·45·60·175·181·212·219·244행이 embedded-cpp 14·29·43·136·142·203·210·229행과 순서·제목까지 같고 modern-recipes 28·38·297·345·375행도 같은 틀이다. (2) 195~197행 '관측 → 가설 → 검증'은 part1-01 70행(72·83·87행 Step 1~3)을 줄인 것이고, 189행 'p99, max, jitter'는 part1-01 81행과 겹친다. (3) 201~205행 지표 표는 part1-03 17·58·123행을 한 줄씩 미리 적은 것이다. 허브 역할은 구별되므로 10~14 구간 하단. |
| E | 6 | 제목 '시리즈 소개'는 본문(14~257행)이 이행한다. 다만 5행 description의 '임베디드 시스템 성능 분석의 모든 것'은 과장이고, 'profiling 도구 활용까지'는 149~158행 목차 표에 한 줄씩 있을 뿐이다. 대상 독자(47~58행)가 분명해서 6~8 구간 하단. |
| F | 4 | 257행 다음 글 링크는 seriesOrder 1 part1-01-methodology.md(3행 slug)와 맞다. 그러나 허브 편수 표기가 틀렸다. 62행은 53편이라고 하지만 공개 글은 56편이고 104·143·162행 Part별 편수도 다르다(rubric 3-1: 허브 편수 표기 오류는 F 감점, 틀린 안내는 5 이하). 179행 '멀티코어/동시성' 경로의 'Part 3-09/10'은 118~119행 표에서 Power vs Performance·Thermal Throttling을 가리켜 경로 라벨과 맞지 않는다. 72~171행 목차 표에는 링크가 없다. |
| G | 2 | 219~242행 레퍼런스에 서적 4권(222~225행, Systems Performance 2nd ed와 H&P 6th ed는 판 표기 있음)과 외부 링크 7개(228~236행)가 있지만 본문 주장에 연결된 인용은 없다. 239~242행 '임베디드 특화'는 이름만 있고 링크·버전이 없으며, 31~35행의 Systems Performance 평가도 책의 장·절을 가리키지 않는다. |

uncertainties:
- 35행 '임베디드 특화 도구(ARM DS-5, Trace32, Lauterbach)'는 Trace32와 Lauterbach를 별개 도구처럼 나열했는데 240행은 'Lauterbach Trace32'라는 한 제품으로 적었다. 나열 중복이라 오류 확인으로 보지 않았다.
- 31~34행 Systems Performance 범위 주장('Bare-metal이나 RTOS는 다루지 않음')은 원서로 확인하지 않았다.
- 120행 'CXL 2.0/3.1, Neoverse V2'가 part3-11 본문 범위와 맞는지는 대상 글을 열어 보지 않았다.
- 179행 'Part 3-09/10'이 Part 4-09/10(Cache Coherency·SMP)의 오기인지는 작성 의도를 확인하지 않았다.

다음 조치(허브라 병합 검토 대신 보강): 62·104·143·162행 편수를 실제 공개 글(56편)에 맞추고, part3-12·part5-11·part6-05를 목차 표에 넣고, 목차 표 각 행에 글 링크를 단다. 179행 동시성 경로의 'Part 3-09/10'을 바로잡고 description에서 '모든 것' 과장을 뺀다.

### `performance-engineering/part1-01-methodology.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), fec6fe94(text 코드블록 정리), 3d56a230(번역투 수정·공개)과 그 이전 본문·다이어그램 커밋뿐이고, 1차 자료(Gregg USE 문서, Arm PMU/DWT 명세 등)와 대조한 커밋이 없다. 원문 안 모순도 없다: 167행 10%×(1-1/100)=9.9%는 '9% 개선'과 맞고, 179행 '상위 65%'는 128·129행 40%+25%와 맞으며, 81행 'p99·max 중요'와 108행 'percentile과 max'도 일치한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | USE(25~41행)·RED(43~53행) 정의는 Gregg·Wilkie 원 자료의 요약이다. 이 글만의 것은 USE를 CPU·RAM·Flash·Bus·Cache·DMA·ISR·Mutex에 옮긴 표(57~66행)와 임베디드 병목 빈도 순위(126~135행)인데, 순위의 40%·25%·15% 등은 출처·조사 범위가 없다. 19행 '80% 개발자', 159행 '80%는 틀립니다'도 근거 없는 수치다. Step 2·3(83~96행)은 한 문장씩이라 해석·실패 사례가 없다. 앵커 part6-09(A 10)보다 USE 표 하나만큼 낫다. |
| B | 9 | 개념 → 사이클 → 함정 → 정리 흐름은 있지만 사이클 절(70~96행)은 코드 두 조각과 세 문장이다. 93행 `read_pmu(L1D_CACHE_REFILL)`은 정의·설정 절차가 없고, 한 증상을 57~66행 USE 표로 좁혀 가는 사례가 없어 '어떻게 좁히는가'에 답하지 않는다. 39행 'E=많음 → 다른 곳(디스크·메모리)'은 CPU 오류 지표와 결론의 관계를 설명하지 않는다. 전제·한계가 빠져 5~9 구간. |
| C | 4 | DWT 측정 조각(74~79행)은 DEMCR TRCENA·CYCCNT enable 절차와 `log_max` 정의가 없다. 91~94행 PMU 코드는 의사 함수 한 줄이다. 대상 코어·보드·결과가 없다. 102~106행 지연 표(10/50/500 ms), 122행 'N=100', 128~133행 백분율은 출처·측정 환경 없는 수치라 C ≤ 8이고, 실행 조건·예상 결과가 없어 4~7 구간 하단. 앵커 part6-09(C 4)와 같은 수준. |
| D | 9 | 비교한 글: 같은 시리즈 part1-02-metrics.md, part1-04-statistics.md, part1-06-benchmark.md, part1-07-modeling.md, part1-08-profiling-overview.md, 00-preface.md; 다른 시리즈 systems/csapp/ch05.md(210행 '측정 먼저'), embedded/bsp/chapter15-boot-time-optimization.md(15행 '추측이 아니라 측정'). 겹침: '평균만 본다'(100~108행) ↔ part1-04 15·184~186행, part1-02 137·230~232행; 'Single Run·N=100'(120~122행) ↔ part1-06 15·81행; Roofline 미리보기(137~143행) ↔ part1-07 53~63행; 도구 분류 표(147~153행) ↔ part1-08 124~125·263행. USE/RED와 임베디드 USE 표(25~68행)는 src/content/blog 전체에서 이 글에만 있다(grep 'USE 메서드'). 하단 절반이 인접 글 반복이라 5~9 구간. |
| E | 6 | 제목은 'Measure → Analyze → Optimize 사이클'인데 본문 사이클은 '측정 → 가설 → 검증'(15·70~96행)이라 단계 이름이 다르고 Optimize는 96행 '해결책을 적용합니다' 한 구절뿐이다. description의 'USE·RED 메서드, 임베디드 적용'은 25~68행이 이행한다. 6~8 구간 하단. |
| F | 7 | 181행 다음 편 안내 '성능 지표 정의'는 seriesOrder 2 part1-02-metrics.md 제목과 맞다. 185행 1-02 링크, 186행 '1-07: 성능 모델링 (Amdahl, Roofline)'은 part1-07-modeling.md(seriesOrder 7) 제목과 맞다. 본문 139행 '1-07에서 다룹니다', 145행 '1-08에서 자세히'가 실제 해당 글을 가리키는 글 고유 안내다. 전제 지식 안내가 없어 9 이상은 아니다. 앵커 part7-05(F 7)와 같은 수준. |
| G | 2 | 187행 Gregg 'Systems Performance' 책 링크 하나가 USE 절과 연결되는 유일한 출처이고 판·절 표기가 없다. RED 메서드(43행)·163행 Knuth 인용은 출처가 없고, 93행 PMU 이벤트는 대상 아키텍처·명세 판이 없다. 128~133행 빈도 수치의 근거도 없다. |

uncertainties:
- 139행 'min(peak compute, memory bandwidth)'는 두 항의 단위가 달라 Roofline 식(min(peak, BW×OI))과 맞지 않아 보인다. part1-07 55~57행은 OI를 쓴다. Williams et al. 2009로 확인하지 않았다.
- 122행 '최소 N=100회'와 part1-04-statistics.md 163·190행 'p99에는 최소 N=1000'이 다르다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 128~133행 임베디드 병목 빈도(40/25/15/10/5/5%), 19행 '80% 개발자', 159행 '80%는 틀립니다'는 출처 없는 수치다.
- 38~39행 'U=50%, S=10', 'S=0, E=많음 → 다른 곳' 진단 논리가 Gregg USE 문서 설명과 맞는지 미확인.
- 93행 `L1D_CACHE_REFILL` 이벤트 이름과 74행 DWT(Cortex-M)가 같은 대상 코어를 전제하는지 미확인.
- 163행 Knuth 인용의 원문 문맥 미확인.

병합 대상: 병합 대상 없음. 이 글은 허브가 아니고(허브는 00-preface.md), USE/RED와 임베디드 USE 표(25~68행)는 시리즈 안에서 이 글에만 있어 통째로 합칠 대상이 없다. 다음 조치는 보강이다. 함정 절(100~122행)·Roofline 미리보기(137~143행)·도구 표(147~153행)처럼 part1-02·04·06·07·08과 겹치는 부분은 링크로 줄이고, 한 증상을 USE 표로 좁혀 가는 사례와 USE·RED 1차 출처를 넣어 방법론 글로서 독립 역할을 세운다. 출처 없는 백분율(19·128~133·159행)은 1차 자료로 확인하지 못하면 지운다.

### `performance-engineering/part1-02-metrics.md` — 40점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에는 42ebbcbb(stub), f3283f25(본문 작성), 845231cf(그림), 3d56a230(번역투 수정·공개), 4e66cbfc(수식 KaTeX 변환), a746e269·49f2a443·e85d7684·68525f0c(코드 블록 산문 정리), ac24bb76(제목 변경), be973200(topics), 0a9dd7bc(slug 고정)뿐이고 1차 자료 대조 기록이 없다. 원문 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(80행 수열과 83행 6 µs는 1.003−0.997=0.006 ms로 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | Latency·Throughput·Utilization 정의(19~45행), hard/firm/soft 표(107~111행), percentile 표(117~124행)는 성능 입문 자료의 표준 목록이다. jitter 예(80·83행)와 deadline 표의 Firm·Soft 예(110·111행)는 practical-internals/part1-10-realtime-analysis.md 39·50·51행과 같다. 이 글만의 것은 Service time vs Response time 구분(65~72행)과 time source 표(195~201행) 정도이고 둘 다 정의 수준이다. 63행 '80% 한계', 145·236행 '70-80%가 안전 한계'는 도출 없이 단정만 있고, 49행 '보통 trade-off거나 직교 관계입니다'는 일반론이다. 앵커 part6-09(A 10)보다 고유 예제가 적어 8. |
| B | 9 | 정의 → 상호 관계(47~63행) → service/response(65~72행) → jitter·deadline(74~113행) → percentile·long tail(115~139행) → 추가 지표(147~191행) → time source·히스토그램 코드(193~226행) → 실수(228~244행) → 정리(246~253행) 흐름은 있다. 그러나 63행은 Little's Law(59행 L=λW)에서 바로 'utilization 100% 근접 시 W→∞'를 끌어내는데 L=λW에는 utilization이 없어 연결이 빠졌다. 130~135행은 히스토그램을 bullet 네 줄로 바꿔 분포 모양을 읽을 수 없고 137행 '평균 10 ms, p99 100 ms, max 1 s'를 뒷받침하지 못한다. 지표 선택 기준이라는 결론이 없어 5~9 구간. |
| C | 5 | jitter 측정 코드(89~99행)와 log2 히스토그램 코드(205~225행)는 있으나 대상 MCU·FreeRTOS 버전·클록이 없고 예상 출력이 없다. 96행 `xLastWake * CYCLES_PER_TICK`은 CYCCNT 초기화·wrap 처리 없이 비교한다. DMIPS(174~176행), CoreMark(186~188행), cache hit rate(167행), IPC 해석표(155~157행)는 출처·측정 환경 없는 구체 수치라 C ≤ 8. 관찰 결과나 검증 절차가 없어 4~7 구간에서 5. |
| D | 6 | 비교한 글: 같은 시리즈 part1-01-methodology.md, part1-03-measurement.md, part1-04-statistics.md, part1-05-realtime.md, part1-06-benchmark.md, 다른 시리즈 rtos/practical-internals/part1-10-realtime-analysis.md. 겹침: 78~83행 jitter 예 ↔ practical-internals 1-10 39행(같은 수열·같은 6 µs), 107~111행 hard/firm/soft 표 ↔ 같은 글 47~51행(Hard 예만 '브레이크' vs '자동차 ESC'); 205~225행 히스토그램 코드 ↔ part1-04 83~98행; 117~126행 percentile 표 ↔ part1-04 33~42행; 139행 long tail 원인 ↔ part1-04 139~151행; 186~187행 CoreMark ↔ part1-06 109~110행, 169~179행 DMIPS ↔ part1-06 118~128행; 195~201행 time source ↔ part1-03 58행 이후; 89~99행 jitter 코드 ↔ part1-05 60~77행. 고유 역할은 지표 정의와 Service/Response 구분(17~72행)뿐이라 5~9 구간. |
| E | 5 | 제목 '성능 지표 정의 — Latency·Throughput·Utilization 분석'은 '분석'을 약속하지만 본문은 정의와 표 나열 수준이다(19~45·147~191행). E 주석에 따라 3~5 구간. 제목 키워드 세 개와 description의 Jitter·Deadline(74~113행), Service time vs Response time(65~72행)은 모두 다뤄 이 구간 상단 5. |
| F | 6 | 255행 다음 편 안내는 seriesOrder 3 part1-03-measurement.md 제목과 맞다. 259~261행 라벨(1-01·1-03·1-04)은 대상 파일 제목·seriesOrder와 맞다. 그러나 130~135행 히스토그램이 bullet로 깨져 읽히지 않고, 전제 지식 안내나 긴 코드의 단계 구분이 없으며, jitter·deadline을 이어 다루는 part1-05로의 연결도 없다. 가독성 결함 때문에 7은 주지 않았다. |
| G | 1 | 본문에 출처 링크가 없다. 183행 'EEMBC가 만든'은 이름뿐이고 CoreMark 점수 페이지·버전이 없으며, 174~176·186~188행 수치에 측정 조건(컴파일러·옵션)이 없다. 57~59행 Little's Law에 인용이 없고, 89~99행 FreeRTOS·DWT 코드에 커널 버전·대상 코어 표기가 없다. 앵커 part6-09(G 1)와 같은 수준. |

uncertainties:
- 61·63행: W를 '평균 대기 시간'이라 했지만 Little's Law의 W는 보통 시스템 체류 시간(대기+처리)이다. 'U→100%면 W→∞'는 M/M/1 같은 별도 모델의 결론이다. 1차 자료로 확인하지 않았다.
- 175행 'Cortex-M4 @168 MHz 350 DMIPS'는 part1-06-benchmark.md 124행 'Cortex-M4 1.25 DMIPS/MHz'(168 MHz면 약 210)와 맞지 않는다. 글 간 모순이라 Arm 자료로 정해야 한다.
- 188행 'RISC-V SiFive E31: 150 CoreMark'는 part1-06-benchmark.md 113행 'SiFive E31 @ 320 MHz 1500'과 10배 차이가 나고 클록 표기도 없다.
- 186~187행 CoreMark 수치(M0+ @50 MHz 100, M4F @168 MHz 850)는 출처가 없다.
- 214·223행: idx = 32 - __clz(us)는 us=1을 bucket 1에 넣는데 print_hist 라벨이 한 칸 어긋나 보이고, bucket 63에서 `1<<63`(int)이 정의되지 않은 동작이다. __clz 의미를 컴파일러 문서로 확인해야 해 오류 확인으로 올리지 않았다.
- 95~97행: 32-bit CYCCNT(wrap)와 `xLastWake * CYCLES_PER_TICK`의 차이는 CYCCNT를 tick 0에 맞춰 리셋하지 않으면 의미가 없다. 전제 조건 미확인.
- 139행 'RAS 도구로 추적'은 long tail 지연 추적 도구로 보기 어렵다.
- 167행 hit rate 범위와 '임베디드(1-2 KB L1)'는 출처 없는 수치다.
- 200행 'GPIO + 로직 분석기 1 ns' 정밀도는 분석기 샘플링 속도에 달린 값인데 장비 조건이 없다.

병합 대상: percentile·long tail·히스토그램 코드(115~139·203~226행)는 `part1-04-statistics.md`, jitter·deadline(74~113행)은 `part1-05-realtime.md`, DMIPS·CoreMark(169~191행)는 `part1-06-benchmark.md`, time source 표(193~201행)는 `part1-03-measurement.md`에 이미 같은 내용이 있다. 남는 고유 부분(17~72행)으로 '성능 지표 정의'라는 독립 검색 의도는 있다. 다음 조치는 보강이다. 겹치는 절을 해당 글 링크로 줄이고, utilization과 queueing 지연의 관계(63·145행 80% 한계)를 queueing 1차 자료로 도출하거나 지우고, 지표 선택 기준을 결론으로 세운다. 보강 뒤에도 고유 분량이 정의 몇 단락뿐이면 `part1-01-methodology.md`에 합치는 방안을 다시 본다.

### `performance-engineering/part1-03-measurement.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1).
- 184~188행 `struct trace_record`는 uint32_t(4)+uint16_t(2)+uint16_t(2)=8바이트(패딩 없음)이므로 1000개는 8,000바이트(약 8 KB, 193행 마스크 때문에 TRACE_SIZE가 2의 거듭제곱이면 1024개 8 KB)다.
- 200행은 "1000개를 모아도 5 KB"라고 적었다.
같은 글의 코드와 산문이 동시에 참일 수 없다. git log(42ebbcbb stub, f3283f25 본문, 845231cf 다이어그램, 3d56a230 번역투 수정, ac24bb76 제목 변경, be973200 topics, 0a9dd7bc slug)에는 1차 자료와 대조한 fact-check 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 15·260행의 wall-clock·cycle·instruction 구분이 글의 틀이지만 각 절(DWT 58~75행, clock 표 101~107행, RDTSC 113~121행, PMU event 목록 135~139행)은 공식 문서·입문서에 흔한 내용이다. 이 글만의 것은 overhead 표(173~179행)와 lightweight trace 매크로(183~198행) 정도인데 표 수치에 출처가 없다. 무엇을 잴 때 어떤 방법을 고르는지 선택 기준이 없다. 앵커 part1-04(A 10)와 같은 수준. |
| B | 9 | 측정 방법 여덟 가지를 절마다 코드 한 조각과 한두 문장으로 훑는다. 121·252행은 rdtscp와 cpuid/barrier가 필요하다고만 하고 코드가 없다. 51~53행 `read_pmu`는 `start`가 정의되지 않은 조각이다. 128행 주석은 EL1이라고 밝히지만, 262행이 Linux에서 PMU를 쓰라고 하면서 사용자 공간 접근 조건(PMUSERENR)을 빠뜨렸다. 75행은 wraparound만 말하고 처리 방법이 없고, 87행 SysTick 누적 계산도 코드가 없다. 200행 산술 오류가 열려 있다. 5~9 구간. |
| C | 5 | 실행 환경(MCU·보드·커널·컴파일러 버전)이 없다. 175~179행 overhead 표(1 cycle, 2-4 cycle, ~30 ns), 200행 trace 5 cycle, 204행 '수 MB/s'는 출처·환경 없는 수치라 C ≤ 8. 측정 절차와 예상 관찰이 있는 검증 단계가 없고 160~165행 latency 예시는 `ISR_ENTRY:` 레이블 형태 의사 코드라 그대로 돌릴 수 없다. 4~7 구간. |
| D | 7 | 같은 시리즈 part5-07-baremetal-profiling.md와 크게 겹친다: DWT init 64~66행 ↔ 5-07 64~66행(같은 3줄), 75행 168 MHz 약 25초 wrap ↔ 5-07 84행, Cortex-M0 SysTick 77~87행 ↔ 5-07 100~121행, ITM 219~222행 ↔ 5-07 123~145행, SystemView 202~213행 ↔ 5-07 153~172행. PGO 225~238행은 part1-08-profiling-overview.md 136~149행(140·146행 같은 gcc 명령)과 거의 같다. PMU event·counter 수 135~141행은 part2-10-pmu.md 44·46·199~203행과 겹친다. 다른 시리즈 modern-recipes/part4-06-systick-timer.md(DWT 절), rtos/practical-internals/part2-10-scheduler-latency.md(CYCCNT init·측정)도 같은 주제다. 인접 글 part1-02(지표 정의)·part1-04(분포 분석)와는 역할이 갈린다. 본문 대부분이 뒤 편의 축약이라 5~9 구간. |
| E | 6 | 제목의 Wall-Clock·CPU Cycle·Instruction Count는 17~56행, description의 DWT·PMU·clock_gettime·GPIO·Overhead는 58~200행에서 모두 다룬다. 다만 225~238행 PGO는 측정이 아니라 최적화 기법이라 범위를 벗어나고, 독자가 얻을 결론(어떤 상황에 어떤 방법)이 258~264행 정리에도 없다. 6~8 구간 하단. |
| F | 6 | 266행 다음 편 안내(통계적 분석)는 seriesOrder 4 part1-04-statistics.md와 맞다. 270~272행 관련 항목 라벨은 part1-04, part2-10 'PMU·HPM 하드웨어 카운터 분석', part5-07 'Bare-metal 프로파일링'과 맞고 번호도 파일명과 같다. 전제 지식 안내나 본문 절에서 5-07·2-10으로 깊이를 넘기는 안내가 없어 7은 주지 않았다. |
| G | 1 | 본문 외부 출처 링크 0개. 60·79·125·217행 코어별 기능 주장(Cortex-M3+ DWT, ARMv6-M DWT 없음, Cortex-M55+ PMU, ETM)과 135~139행 event ID에 ARM ARM·TRM 인용이 없다. CMSIS·커널·gcc 버전 표기도 없다. |

uncertainties:
- 35행 'CPU Cycle은 IRQ나 idle은 제외'와 44행 'CYCCNT는 context switch의 영향을 받지 않습니다': CYCCNT는 free-running이라 구간 안 ISR·context switch cycle도 셀 것으로 보이나 ARMv7-M ARM으로 확인하지 않았다. 242~244행 함정 설명도 같은 전제에 기댄다.
- 145행 '가장 비침습적'·155행 'overhead가 0'과 175~176행 표(DWT read 1 cycle < GPIO toggle 2-4 cycle)가 어긋나 보인다. 155행이 '외부 계측기 쪽'을 뜻했는지 모호해 오류 확인에 넣지 않았다.
- 179행 표 'Trace ring buffer 수십 cycle'과 200행 '각 trace가 5 cycle'이 같은 ring buffer 방식에 다른 값을 준다. 181행 'Lightweight'가 별도 경량판을 뜻할 수 있어 오류 확인에는 넣지 않았다.
- 125행 'Cortex-A와 Cortex-M55+에 PMU', 141행 'counter 보통 4-6개', 217행 'Cortex-M3+의 ETM'은 TRM으로 확인하지 않았다.
- 222행 ITM '1 cycle, non-intrusive'는 FIFO 대기(part5-07 130행 while 대기)를 고려하지 않은 수치일 수 있다.
- 177행 clock_gettime ~30 ns, 204행 J-Link '수 MB/s'(part5-07 172행은 ~1 MB/s, 다른 글과의 모순)는 출처·환경 없는 수치다.
- 190·193행 `trace_idx++`는 volatile int 증가라 ISR·task 동시 호출 시 원자적이지 않다. 단일 컨텍스트 전제인지 글이 밝히지 않았다.

병합 대상(점수 구간 참고): Cortex-M 절(58~87·202~223행)은 `part5-07-baremetal-profiling.md`, PGO 절(225~238행)은 `part1-08-profiling-overview.md`, PMU 절(123~141행)은 `part2-10-pmu.md`에 이미 더 자세히 있다. 다음 조치는 먼저 200행 '5 KB'를 8 KB로 고치거나 지우는 것이다. 그 뒤 1-03은 무엇을 재는지에 따라 어떤 시계를 쓰는지 선택 기준만 남기고 각 절은 해당 글로 링크하는 차별화 보강을 우선 검토한다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋이 없음 (8편).** Embedded Debugging ch04·ch05·ch06·ch07(ch07은 78행 한 문장만 a82eb9d0으로 대조)과 Performance Engineering 00-preface·part1-01·part1-02·part1-03 모두 git log에 slug·메타·제목·코드 블록 정리 커밋뿐이다. 검증됨은 CXL 두 장(ch08 815be859, ch09 2b646ec1)뿐이다. 두 시리즈를 `/fact-check-round` 대상으로 올릴 후보다.
- **본문 주장에 붙은 1차 출처·버전이 없음 (10편 전부, G 1~3).** 출처가 관련 항목·레퍼런스 목록에만 있고 주장과 연결되지 않는다(ch04 422~424행, ch05 576~577행, ch06 474~477행, ch07 468~471행, 00-preface 219~242행, part1-01 187행). 본문 출처가 있어도 버전·링크가 없다(ch08 99행 파일명만, ch09 21·30·34·114·124·145행 경로만). part1-02·part1-03은 본문 외부 링크가 0개다. ch06 100행은 링크한 명세가 바로 앞 표를 반박한다.
- **출처·환경 없는 구체 수치로 C ≤ 8 상한 (7편).** ch04 184~187·224·252행(속도), ch05 377·444행, ch06 79·311·313·351·356행, ch07 325·329·351행, part1-01 19·102~106·128~133·159행, part1-02 63·145·167·174~176·186~188행, part1-03 175~179·200·204행. 대상 MCU·probe·툴체인 버전도 없거나 섞여 있다(ch05 F4 전제 + 487~494행 ARMv8-M MSPLIM, ch06 168 MHz vs STM32F767ZI, ch07 45행 STM32F407·287행 M33·307행 M7).
- **글 간 수치 불일치 (5편 관련, 다른 글과의 모순이라 오류 확인 아님).** RTT 처리량(ch04 224행 '100 KB/s 이상', ch06 311행 '~1 MB/s', modern-recipes part10-11 124행 '수 MB/s', practical-internals part2-11 231행 '수십 Mbps'), RTT 코드 크기(ch04 240행 '100 KB 미만' vs ch06 252행 '~3KB'), J-Link 처리량(part1-03 204행 '수 MB/s' vs part5-07 172행 '~1 MB/s'), 권장 반복 횟수(part1-01 122행 N=100 vs part1-04 163·190행 N=1000), DMIPS·CoreMark(part1-02 175·188행 vs part1-06 124·113행). 1차 자료로 한 번에 정해 반대쪽을 고친다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 10편 전부 D 6~10).** ch04 ↔ gdb-lldb ch08 490~522·656~680행·ch06, ch05 ↔ modern-recipes part3-03·3-04·3-05·3-10, ch06 ↔ ch02 172~179·317~356행·ch04 222~254행, ch07 ↔ ch03 394~403행·modern-recipes part10-04·practical-internals part4-06, ch08 ↔ pcie ch09·ch16·kernel ch08, ch09 ↔ memory ch06·hardware/cxl ch15, part1-02 ↔ practical-internals part1-10·part1-04·part1-06, part1-03 ↔ part5-07·part1-08·part2-10. ITM putchar 조각은 ch06 134~139행, ch02 327~331행, practical-internals part2-11 122~126행, part5-07 129~136행, modern-recipes part10-11 110~112행 다섯 곳에 있고 FIFO 검사 조건(`& 1` vs `== 0`)이 갈린다. 정본을 정하고 나머지는 링크로 줄일 대상이다.
- **시리즈 안내가 대상과 맞지 않음 (4편).** ch07 13행 '이 시리즈의 마지막 장'·442~461행 Ch1~7 정리(seriesOrder 8·9 공개), ch06 467행 다음 편 안내의 'MMU'(chapter07에 없음), ch08 126행 'Modern Embedded Recipes Ch 149'(대상 seriesOrder 150, 커밋 0ec69ea9 본문도 'Ch 149'), 00-preface 62·104·143·162행 편수(53편 vs 공개 56편, part3-12·part5-11·part6-05 목차 누락). ch04 224행 '[Ch 6 trace 장]'은 URL이 없어 렌더되지 않는다. 시리즈에 장을 추가한 뒤 이전 글·허브 안내를 갱신하지 않은 패턴이다.
- **공통 H2 꼬리 뼈대 (10편 전부).** Embedded Debugging은 '## 정리 / ## 다음 장 예고 / ## 관련 항목'(ch04 403·414·418행, ch05 567·571행 등), Performance Engineering 본문은 '한 줄 요약 → … → 자주 하는 실수 → 정리 → 관련 항목'(part1-01 13·155·173·183행, part1-03 13·240·258·268행), 허브는 embedded-cpp·modern-recipes 허브와 같은 H2 순서다(00-preface 14·45·60·175·181·212·219·244행). 각 글에 고유 절이 있어 P0는 아니지만 루브릭 9절 scaled content 수치 기록 대상이다.
- **손으로 만든 예시 출력·끊긴 코드 (4편).** ch05 readelf·map·nm·size 출력이 서로 맞지 않고(오류 확인 7건), ch07 86~99·206·243~244·436행이 "..."로 끊기며, ch06 405~413행은 정의 없는 식별자를 쓰고, part1-03 51~53·160~165행은 정의 없는 변수·레이블 의사 코드다. 실제 빌드·실행 출력으로 바꾸지 못하면 예시임을 밝혀야 한다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 4편부터 고친다. ch06 96~98행 semihosting 번호를 명세대로(0x18·0x16·0x30) 고치고 틀린 매핑을 `data/known-falsehoods.yaml` 후보로 검토한다. ch05는 내부 모순 7건을 한 빌드의 실제 readelf·map·size 출력으로 바꾼다. ch07 183행 BFSR 범위를 ARMv7-M ARM으로 고친다. part1-03 200행 '5 KB'를 8 KB로 고치거나 지운다. 각 수정 커밋에 대조한 출처를 적는다.
- 내비게이션 오류(ch07 시리즈 안내, ch06 467행 'MMU', ch08 126행 'Ch 149', ch04 224행 링크, 00-preface 편수·목차)를 한 번에 고친다. 다시 채점할 때 F가 바로 반영된다.
- 병합 검토 4편(ch04·ch08·part1-01·part1-02)과 보강 2편(ch09, 00-preface)은 모두 보강(차별화)이다. 먼저 중복 정본을 정한다: J-Link(ch04 ↔ gdb-lldb ch08), RTT·ITM·ETM(ch06 ↔ ch02·ch04), LTSSM(ch08 ↔ pcie ch09), CXL RAS(ch09 ↔ memory ch06·hardware/cxl ch15), 측정·지표(part1-02·part1-03 ↔ part1-04~08·part5-07).
- Embedded Debugging과 Performance Engineering을 `/fact-check-round` 대상으로 올려 출처 없는 수치(속도·처리량·DMIPS·CoreMark·overhead)를 1차 자료로 확인하거나 지운다. 측정 기록이 없으면 수치를 새로 만들지 않는다.
- 글 간 수치 불일치 다섯 묶음(RTT 처리량·크기, J-Link 처리량, 권장 N, DMIPS·CoreMark)을 1차 자료로 한 번에 정한 뒤 반대쪽 글을 고친다.
