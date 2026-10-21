# 공개 글 AdSense 평가 — 루프 11

> 대상: 공개 글 10편 (CXL 4.0 Internals `seriesOrder` 14~15, Driver-RTL Co-simulation `seriesOrder` 1~8)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 11번째 루프다. 대상은 `src/content/blog/embedded/hardware/cxl/`의 `chapter14-security.md`·`chapter15-ras-performance.md` 2편과 `src/content/blog/tools/emulation/driver-cosim/`의 `chapter01-why-cosim.md`~`chapter08-end-to-end.md` 8편이고 모두 공개 글이다. 두 시리즈가 섞여 있어 파일 이름 앞에 시리즈 디렉터리(`cxl/`, `driver-cosim/`)를 붙였다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `cxl/chapter14-security.md` | 12 | 13 | 3 | 5 | 7 | 7 | 4 | **51** | 검증됨 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `cxl/chapter15-ras-performance.md` | 14 | 12 | 7 | 10 | 7 | 5 | 4 | **59** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `driver-cosim/chapter01-why-cosim.md` | 12 | 12 | 3 | 12 | 7 | 4 | 1 | **51** | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `driver-cosim/chapter02-dpi-c-basics.md` | 10 | 11 | 5 | 9 | 7 | 5 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `driver-cosim/chapter03-verilator.md` | 11 | 12 | 6 | 10 | 5 | 5 | 1 | **50** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `driver-cosim/chapter04-cocotb.md` | 10 | 10 | 6 | 10 | 5 | 5 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `driver-cosim/chapter05-systemc-tlm.md` | 10 | 9 | 4 | 13 | 5 | 5 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `driver-cosim/chapter06-bfm.md` | 11 | 10 | 5 | 10 | 5 | 5 | 1 | **47** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `driver-cosim/chapter07-uvm-c-model.md` | 12 | 11 | 5 | 13 | 7 | 4 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `driver-cosim/chapter08-end-to-end.md` | 13 | 11 | 6 | 10 | 6 | 5 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 50.5점(10편 합 505), 범위 47~59점이다. 판정은 병합 검토 5편(cxl ch14·ch15, driver-cosim ch03·ch06·ch07), 우선 조치 4편(driver-cosim ch02·ch04·ch05·ch08), 보강 1편(driver-cosim ch01)이다. 10편 모두 점수 구간은 병합 검토(40~59)이고, ch01은 시리즈 첫 글이 도입을 겸해 허브 예외로 보강에 뒀다. 80점 이상 글은 없다. `factcheck: 검증됨`은 CXL 2편(a0eeea28, PR #59의 fact-check 커밋)이고, driver-cosim 8편은 1차 자료 대조 커밋이 없다. 오류 확인은 4편(driver-cosim ch02·ch04·ch05·ch08)이고 모두 원문 내부 모순(루브릭 3-1)이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft` 상태까지이고, 렌더링·광고 배치·모바일 표시는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `cxl/chapter14-security.md` | 52 | 51 | -1 | 없음 |
| `cxl/chapter15-ras-performance.md` | 59 | 59 | 0 | 없음 |
| `driver-cosim/chapter01-why-cosim.md` | 51 | 51 | 0 | 없음 |
| `driver-cosim/chapter02-dpi-c-basics.md` | 48 | 48 | 0 | 없음 |
| `driver-cosim/chapter03-verilator.md` | 50 | 50 | 0 | 없음 |
| `driver-cosim/chapter04-cocotb.md` | 47 | 47 | 0 | 없음 |
| `driver-cosim/chapter05-systemc-tlm.md` | 47 | 47 | 0 | 없음 |
| `driver-cosim/chapter06-bfm.md` | 47 | 47 | 0 | 없음 |
| `driver-cosim/chapter07-uvm-c-model.md` | 53 | 53 | 0 | 없음 |
| `driver-cosim/chapter08-end-to-end.md` | 52 | 52 | 0 | 없음 |

1차 합 506에서 최종 505로 1점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 없음. 1차에서 오류 확인이던 ch02(217행 vs 226·232행 헤더 파일명)·ch04(106행 vs 239행 ReadOnly)·ch08(108행 주석 vs 109~111행 루프)은 원문을 다시 읽어 그대로 성립한다.
- 추가한 오류 확인: 1건. driver-cosim ch05 200행 함정 규칙('b_transport는 delay를 늘리고 wait 해야 정상, 안 그러면 무한 호출') vs 155~167행 핵심 패턴 target b_transport(delay·wait 없이 TLM_OK_RESPONSE, 171행 '이로써 … 절충이 가능합니다'). 판정이 병합 검토 → 우선 조치로 바뀌었다.
- 점수 변경: cxl ch14 C 4→3. 코드·명령·예제가 하나도 없어(19~170행) 루브릭 C 0~3 구간이고, 코드가 있던 앵커 part6-09(C 4)보다 낮게 뒀다. 나머지 9편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: cxl ch14 D에 72행 키 갱신 ↔ ES Ch 11 75행, 107~115·152~154행 TSP 범위 ↔ ES Ch 13 57행 겹침을 더했고 ES Ch 13 Linux 표를 80~85행으로 고쳤다. driver-cosim ch01 D의 비교 글 경로를 `tools/debugging/embedded/chapter10-silicon-bringup-method.md`(draft)로 바로잡았다. ch02 D는 '다른 시리즈 DPI-C 글 없음'을 qemu-fpga-driver ch03·qemu-riscv ch08·qemu-internals ch03(모두 draft)으로 고쳤다. ch04 C는 '199행 test_driver 코드 없음'을 '200행 +scenario를 166~174행 test_driver.py가 읽지 않음'으로 고쳤다. ch07 F는 'Khorikov 디렉터리 없음'을 'chapter11-anti-patterns.md는 있으나 draft이고 라벨 내용과 다름'으로 고쳤다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목·draft 상태와 대조했다. 감점 원인은 링크 없는 관련 항목이 draft 글이나 없는 글을 가리키는 것(driver-cosim 8편 전부), 틀린 장 번호(cxl ch15 204행), 옛 제목 라벨(driver-cosim ch02 264~265행)이다.

## 글별 근거

### `cxl/chapter14-security.md` — 51점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(PR #59) 안의 커밋 "fix(content): fact-check CXL Ch 14 (security) against CXL 3.1 §11 and Linux"가 CXL 3.1 spec §11.1~11.5와 개정 이력, CXL 3.2 press release, Linux v7.3-rc6 `drivers/pci/tsm.c`·`include/linux/pci-tsm.h`·`drivers/crypto/ccp/sev-dev-tsm.c`를 출처로 적고 TSP 범위·TDISP 관계·TSP target 상태·CXL.cachemem IDE·SPDM session과 IDE 키 관계를 주장별로 고쳤다. e2aa6b02(#61)는 footer 출처 줄만 고친 커밋이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 본문 대부분이 CXL 3.1 §11을 표로 다시 정리한 것이다: 위협 범위(23~28행), CXL.io IDE(56~60행), CXL.cachemem IDE(64~72행), CXL_IDE_KM 3단계(89~93행), TSP 범위(107~113행), target 상태(121~125행). 작성자 해석은 30행 '경로 위 switch도 TCB에 들어감', 97행 'session은 IDE 키를 나르는 통로', 115행 '3.1 TSP는 fabric 보안이 아니라 직접 연결 메모리의 confidential computing' 정도다. 자기 계산·선택 기준·실패 사례가 없어 6~12 구간 상단(앵커 part12-10의 KV cache 직접 계산 222~232행과 비교). |
| B | 13 | 위협 → 구성 요소 → SPDM → IDE → 키 설정 → TSP → TDISP·Linux → 함정 → 정리(19~170행)가 끝까지 가고 description의 '무엇을 지키고 어떻게 맞물리는지'에 답한다. SPDM 흐름은 44행에서 다른 글로 넘기고, 146행의 'TSP의 메모리 암호화·접근 제어'는 본문 어디에서도 설명하지 않으며, 72행 키 갱신은 절차가 없다. 78~79행·46행 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 3 | 코드·명령·관찰 결과·검증 절차가 없다. 66행 256-bit 키, 78~79행 Aggregation Flit Count는 spec 절 번호를 달았지만 독자가 실행하거나 관찰할 수단이 없고, 135~136행 Linux 소스 경로도 나열뿐이다. 예제 자체가 없어 0~3 구간 상단(앵커 part6-09는 코드가 있어 4). 같은 주제의 ES Ch 13 63~76행에는 sysfs tsm/connect·bound 명령이 있다. |
| D | 5 | 비교한 글: 같은 시리즈 `chapter13-switching-fabric.md`·`chapter15-ras-performance.md`(겹침 없음), 다른 시리즈 `embedded-security/chapter11-pcie-cxl-ide.md`·`chapter12-spdm-cma.md`·`chapter13-cxl-tee.md`. 겹침: 89~97행 CXL_IDE_KM 표와 '통로' 문장 ↔ ES Ch 11 67~73행, 72행 ↔ ES Ch 11 75행, 76~81·71행 ↔ ES Ch 11 81~84·86행, 160~162행 ↔ ES Ch 11 111~113행(같은 문장), 34~40행 ↔ ES Ch 13 25~30행, 121~125행 ↔ ES Ch 13 51~55행, 107~115·152~154행 ↔ ES Ch 13 57·107~109행, 156~158행 ↔ ES Ch 13 103~105행, 133~138행 ↔ ES Ch 13 80~85행. 이 글에만 있는 것은 23~28행 위협 범위 표, 64~70행 CXL.cachemem IDE 상세, 78~79행 집계 flit 수, 107~113행 TSP 포함·제외 표 형식 정도라 5~9 구간 하단. |
| E | 7 | 제목의 IDE·SPDM·TSP·CXL TEE와 description의 키워드를 42~140행이 모두 다룬다. SPDM은 44행에서 흐름을 다른 글로 넘기고 46행 전송 경로만 적어 부분 이행이다. 시리즈 이름 'CXL 4.0 Internals'에 비해 본문은 3.1 §11 기준(15행)이고 4.0 보안 변화가 없다. |
| F | 7 | 17·178행 Ch 13, 174행 다음 편 'Ch 15: RAS·Performance·Compliance'는 seriesOrder 15 글 제목과 같다. 179~181행 라벨은 ES Ch 11·12·13 제목과 맞고, 46행 Ch 6(DOE 절 73행), 185행 Ch 1 앵커(Ch 1 167행 heading)도 맞다. 44·83·140행이 절마다 상세 글을 짚는다. 전제 지식 안내가 없고 audit:reading·모바일 확인을 하지 않아 8 이하. |
| G | 4 | 주장마다 판 번호 있는 1차 출처가 붙는다: CXL 3.1 §11.1(21·146행), §11.2(54행), §11.3·11.3.5(64·74·162행), §11.4(46·87·150행), §11.5.x(101·105·119·154행, Figure 11-30), DMTF DSP0274(36·44행), NIST SP 800-38D(66행), Linux v7.3-rc6 파일 경로(131~138행), 185행 자료 목록. 외부 URL·대조 날짜가 없어 5점은 아니다. |

uncertainties:
- 78~79행 Aggregation Flit Count(Containment 68B 5·256B 2, Skid 68B 128·256B 32)를 CXL 3.1 §11.3.5 원문으로 확인하지 않았다. fact-check 커밋에 개별 수치 언급이 없다.
- 68행 보호 안 되는 필드 목록과 69행 CRC→복호화 순서를 spec으로 대조하지 않았다.
- 46행은 'TSP는 SPDM 1.2 이상 요구'의 근거를 §11.5.2로, ES Ch 13 32행은 §11.5.3.2로 적었다. 다른 글과의 불일치라 오류 확인이 아니다.
- 101행 '3.2 발표문은 Trusted Security Protocol이라고도 씀'은 CXL 3.2 press release 문구를 직접 보지 않았다.
- 131행 '커널 주석은 PCIe r7.0 §11로 인용', 136행 `sev-dev-tio.*` 파일 존재는 v7.3-rc6 소스로 확인하지 않았다(ES Ch 13 83행은 `sev-dev-tsm.c`만 적음).
- 125행 ERROR → CONFIG_UNLOCKED 전이를 '자동으로'라고 적었는데 ES Ch 13 55행에는 없다. §11.5.4.8 원문 미확인.
- 시리즈 이름은 CXL 4.0인데 4.0의 보안(TSP·IDE) 변경 사항을 이 글에 넣어야 하는지 정하지 못했다.

병합 대상: 후보는 `src/content/blog/embedded/embedded-security/chapter11-pcie-cxl-ide.md`(IDE·CXL_IDE_KM·Containment/Skid·PCRC 부분)와 `chapter13-cxl-tee.md`(구성 요소·TSP 상태·TSP 범위·TDISP·Linux TSM 부분)다. 다음 조치는 보강(차별화)이다. 'CXL 보안'은 CXL 시리즈 안에서 독립 검색 의도가 있어 루브릭 5절 '차별화 보강'을 적용한다. 23~28행 위협 범위, 64~70·78~79행 CXL.cachemem IDE 상세, 107~113행 TSP 포함·제외 표는 남기고, ES와 문장이 같은 89~97·121~127·133~138·152~162행은 요약 한 줄과 링크로 줄이는 쪽을 검토한다.

### `cxl/chapter15-ras-performance.md` — 59점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(PR #59) 안의 'fix(content): fact-check CXL Ch 15 (RAS, performance) against CXL 3.1, ndctl, Linux'가 CVME 정의·카운터 단위, Late Poison 위치(§4.3.6.3), opcode 4200h/0100h/4300h, Table 13-1·13-2, poison source 다섯 종·64 B 단위를 CXL 3.1 spec §4.3.6.3·§12~14·Table 1-1, ndctl Documentation/cxl, Linux v7.3-rc6 `drivers/cxl`(cxlmem.h, trace.h, mce.c)과 대조하고 출처를 커밋 본문에 남겼다. 이후 e2aa6b02는 출처 각주(218행)만 정리했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 spec Table 12-1을 CXL.io와 CXL.cache·mem으로 나눈 RAS 표(23~30행), Late Poison을 링크 계층 메커니즘으로 설명한 63행, CVME 임계값 카운터 단위 표(69~73행), Table 13-2 지연 목표와 측정 조건(91~99행), '자주 하는 실수' 네 개(161~175행)다. 대부분 spec·ndctl 문서 항목을 표로 옮긴 요약이고 작성자 해석은 101·175행 정도다. 111행 'CHMU가 티어링을 측정으로 돌리는 토대'는 109행에서 구현이 없다고 한 기능에 대한 출처 없는 전망이다. 13~19 구간 하단. |
| B | 12 | RAS → Event Log → Poison → CVME → 성능 → CHMU → Compliance → 운용 명령 → 지표 → 실수 → 정리(19~185행)로 흐름은 끝까지 간다. description(5행)이 약속한 viral은 28행 표 한 칸과 179행 정리뿐이고, Compliance 절(113~126행)은 절 번호 표와 이벤트 횟수 한 문장이라 시험 내용을 알 수 없다. CHMU 절(105~111행)은 발표문 한 줄과 '구현 없음'뿐이다. 83~87·36행 불확실이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 7 | 130~145행에 `cxl list -H/-L`, `cxl monitor`, bpftrace 명령이 있고 147행이 -L은 libtracefs 빌드에서만 된다는 조건을 적었다. 출력 예·기대 관찰·실행 환경(커널·ndctl 버전, 실 디바이스 또는 QEMU)이 없다. 85~98행 수치는 spec 권고 목표이지 측정 결과가 아니고 실측은 101행에서 다른 글로 넘긴다. 관찰 결과가 없어 C ≥ 10 불가, 4~7 구간 상단. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter14-security.md`(겹침 없음), `chapter11-linux-driver.md`(212·220행 cxl_error_detected — 이 글 32행은 링크만), `chapter08-cxl-mem.md`(190행 MICRO 2023 — 이 글 101행은 링크만). 다른 시리즈 `tools/debugging/memory/chapter06-cxl-memory-diagnostics.md` 37~66행이 이 글 36~45·130~147행과 거의 같고, `tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md` 19~30·122~142행이 36~45·140~144행과 겹치며, `performance-engineering/part5-11-cxl-profiling-tools.md`의 opcode 목록도 같다. RAS 표(23~30행), Late Poison(63행), CVME(69~73행), §13 지연 목표(91~99행), Compliance(115~126행)는 다른 글에 없어 10~14 구간 하단. |
| E | 7 | 제목 'RAS·Performance·Compliance'와 description 키워드가 34·47·65·79·113·128행 절과 대체로 맞는다. viral은 28행 표 한 칸뿐이고 'compliance 시험'은 115~126행 절 번호 표라 시험 내용을 다루지 않아 6~8 구간에서 감점. |
| F | 5 | 시리즈 마지막 글이라 199~206행이 다른 시리즈 안내를 준다. 204행 'Modern Embedded Recipes Ch 149~151'은 실제 CXL 글 seriesOrder 150~152(part11-15·11-16·11-17)와 번호가 다르고, 206행 '4개 디버깅 시리즈의 CXL 추가 챕터들'은 링크가 없어 F ≤ 5. 201행 HBM Ch 9, 202행 Perf Eng Ch 54~56, 203행 Security Ch 11~13, 205행 Bootloader Ch 34~36, 210~214행 관련 항목 다섯 개는 맞다. 191~195행 회고 표는 템플릿 성격이라 가점 근거가 아니다. |
| G | 4 | spec §12 Table 12-1(21행), §4.3.6.3(63·163행), Table 1-1(67행), Table 13-2(91행), §3.3.4(103행), §14.x(117~124행), `drivers/cxl/cxlmem.h`·`core/trace.h`(36·45·51행), v7.3-rc6(109행), ndctl cxl-list 문서(147행), 218행 출처 목록이 주장에 붙어 있다. 외부 링크가 없고 126행 웨비나 수치는 문서 위치가 없어 5점은 아니다. |

uncertainties:
- 83~87행 '총 대역폭' 16 GT/s x16 = 32 GB/s, 64 GT/s = 128 GB/s가 한 방향인지 양방향 합인지 표가 밝히지 않는다. spec Table 13-1 원문과 대조하지 않았다.
- 36행은 Event Log 커널 상수 위치를 `drivers/cxl/cxlmem.h`로, Memory Diagnostics Ch 6 57행·Embedded Debugging Ch 9 21행은 `drivers/cxl/core/trace.h`로 적었다. 다른 글과의 모순이라 v7.3-rc6 소스로 정한다.
- 126행 '2023년 4월 이후 compliance 이벤트 9회, Integrators List CXL 1.1 30개·CXL 2.0 30개'는 웨비나(2025-12) 슬라이드 원문을 보지 않았다.
- 109행 'v7.3-rc6 mainline과 QEMU master에 CHMU 코드 없음'은 시점 의존 진술이다(audit:staleness 대상). 111행은 출처 없는 전망이다.
- 89행 'CXL.cache·CXL.mem에서 60~90% 효율'의 spec 원문 조건을 확인하지 않았다.

병합 대상: 병합 대상 없음. 다음 조치: 보강. 운용 명령·Event Log 절(36~45·128~157행)은 Memory Diagnostics Ch 6(37~66행)·Embedded Debugging Ch 9(19~30·122~142행)와 겹치지만, spec 기준 RAS 표·Late Poison·CVME 임계값·§13 지연 목표·Compliance는 독립 검색 의도를 가진다. 겹치는 운용 절은 디버깅 글 링크로 줄이고, viral(§12.4)과 compliance 시험 내용(§14)을 1차 자료로 채우며, 204행 번호(149~151 → 150~152)와 206행 링크 없는 항목을 고친다.

### `driver-cosim/chapter01-why-cosim.md` — 51점, 보강

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topics 메타, fa55144d 내부 링크 일괄 수정, ac24bb76 제목 변경·날짜 정규화, e2ea90c6 발행 전환, 1b4c227e outline 확장, 400892d7 linter, e2738341 번역체 다듬기·WIP 묶음)에 IEEE 1800·Verilator 문서·비용 자료 같은 1차 자료와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 정리는 QEMU·cosim 비교 표의 '가장 잘 잡는 버그' 행(84행)과 'cosim에서 큰 버그, FPGA에서 long-running stress' 분담(102행) 정도다. 나머지는 pre-silicon 검증 입문의 표준 논지다. 수정 비용 배수 표(41~47행), 49행 마스크 비용, 112행 Tenstorrent·Tachyum·SambaNova 사례, 115행 'DO-178C/ISO-26262 사례가 늘고 있습니다', 117행 '로드맵 3년을 보면 명확히 흑자'는 근거 없는 단정이라 분석으로 인정하지 않았다. 앵커 part1-04(A 10)보다 비교 관점이 조금 더 있어 12. |
| B | 12 | 문제(17~35행) → 비용 표(37~49행) → 정의·구성 요소(51~68행) → QEMU·FPGA·post-silicon 비교(70~106행) → 업계 사용(108~117행) → 로드맵(119~134행) → 정리(136~143행)로 흐름은 완결된다. 한계는 92·96행 '느리다(Hz~kHz)'뿐이고 아날로그·PHY, 큰 RTL 시뮬레이션 시간, 모델·shim 유지 비용이 없다. 117행 '1인-월' 도입 비용도 근거 없이 끝난다. |
| C | 3 | 코드·명령·실행 환경이 없다. 비용 배수(41~47행), 'tape-out 이후 6~12개월'(31행), 'FPGA 합성 수십 분~시간'(90행), cosim 속도 '수십~수백 cycle/s'(81행)·'Hz~kHz'(92·96행), 마스크 비용(49행)은 출처·측정 환경 없는 수치라 C ≤ 8이고, 재현 절차·관찰 결과가 없어 0~3 구간이다. |
| D | 12 | 이전 편 없음(seriesOrder 1). 다음 편 `chapter02-dpi-c-basics.md` 13~27행이 DPI-C 정의를 다루고 이 글은 58행 한 문장이라 역할이 갈린다. 겹침은 `chapter08-end-to-end.md`에 있다: 78~102행 ↔ ch08 238~245행 '시나리오 → 권장 도구' 표, 123~132행 로드맵 ↔ ch08 249~262행 '시리즈 마무리' 표. 다른 시리즈 `qemu-fpga-driver/chapter01-fpga-driver-challenge.md`, `qemu-fake-device/chapter01-overview.md`, `tools/debugging/embedded/chapter10-silicon-bringup-method.md`는 모두 draft라 공개 중복이 없고, `pcie/chapter11-linux-dma.md`는 210행 링크 한 줄뿐이다. |
| E | 7 | 제목(2행)과 description(5행)을 17~35행(푸는 문제), 70~106행(다른 방법과의 차이)이 이행한다. 과장은 없다. 독자는 19행 'driver 팀'으로 암시만 되고 독자가 얻는 결과물(도입 판단 기준 등)이 구체적이지 않다. |
| F | 4 | 147행 다음 장 안내(DPI-C)와 151행 링크는 seriesOrder 2 `chapter02-dpi-c-basics.md`와 맞다. 152행 'QEMU Fake Device Driver'·153행 'FPGA Driver via QEMU+VFIO'는 링크 없는 텍스트이고 대상 시리즈가 전부 draft다. 154행 'CXL 4.0 Spec Full Review'라는 글·시리즈는 없고 실제 이름은 'CXL 4.0 Internals'다. 틀린 관련 항목이라 F ≤ 5, 로드맵 표(123~132행)에 장별 링크가 없어 허브 역할도 약하다. |
| G | 1 | 본문에 출처 링크가 없다. 58행 'SystemVerilog LRM 표준'은 IEEE 1800 판이 없고, 비용 표(41~47행)·업계 사례(112~115행)·속도 수치(81·92행)에 근거가 없으며 Verilator·QEMU 버전 표기도 없다. |

uncertainties:
- 81행 '수십~수백 cycle/s'와 92·96행 'Hz~kHz'는 ch08 232~235행 'Verilator 1,000~200,000 cycle/sec'와 크게 어긋난다. 다른 글과의 모순이라 오류 확인에 넣지 않았다.
- 41~47행 수정 비용 배수(1×/3×/30×/1,000×/10,000×)의 출처를 확인하지 않았다.
- 49행 마스크 수정·re-tape-out 비용은 공정 노드가 없고 1차 자료로 확인하지 않았다.
- 112행 Tenstorrent·Tachyum·SambaNova의 cosim 환경 '공개·반공개'는 근거가 없다.
- 114행 Chipyard·OpenTitan·SiFive Freedom의 Verilator cosim 기본 흐름은 각 저장소 문서로 확인하지 않았다.
- 115행 DO-178C/ISO 26262 조기 검증 사례 '증가'는 출처가 없다.
- 32행 'Xilinx VCU/U250'은 보드 이름 표기(VCU118 등)가 불완전하다.

병합 대상: 점수 구간은 병합 검토(51점)지만 시리즈에 overview·preface가 없고 이 글이 도입을 겸해(123~132행 로드맵, 147행 다음 장 안내) 허브 예외로 보강에 뒀다. 보강 방향은 수치 출처 확인 또는 삭제, 로드맵 표에 장별 링크, 152~154행 관련 항목 정리다.

### `driver-cosim/chapter02-dpi-c-basics.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 217행 Simulator 표는 Verilator의 'C 헤더 위치'를 `obj_dir/Vtop_dpi.h`로 적었는데, 226행은 같은 `verilator --cc` 빌드(223행)가 만드는 DPI import/export 시그니처 헤더를 `obj_dir/Vtop__Dpi.h`라 하고 232행 코드도 `#include "Vtop__Dpi.h"`를 쓴다. 같은 빌드가 만드는 같은 헤더의 파일명이 두 가지일 수 없다. git log(1b4c227e outline 확장, e2ea90c6 일괄 발행, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에는 1차 자료 대조 커밋도 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | import/export(29~104행), pure/context(106~126행), data type 표(132~145행)는 IEEE 1800 DPI 절과 입문 자료에 흔한 목록이다. 이 글만의 것은 76행 register write를 0-time `function`으로 모델링, 204~209행 MMIO·IRQ·scenario별 호출 패턴, 171행 packed→byte buffer 변환을 BFM에 캡슐화 정도다. 13행 '세부 사항은 vendor마다 조금씩 다르지만', 247행 '멀티스레드 simulator는 주의'는 구체 기준 없는 일반론이다. 앵커 part6-09(A 10)와 비슷하다. |
| B | 11 | 정의(17행) → import(29행) → export(78행) → qualifier(106행) → type(128행) → lifecycle(173행) → simulator(211행) → 함정(240행) → 정리(249행) 흐름은 갖췄다. 코드가 정의 없는 `driver_mmio_read`(57행)·`driver_dma_write`(167행)에 기대고, 160~168행은 `memcpy`·`uint8_t`를 쓰면서 `<string.h>`·`<stdint.h>`가 없다. 143행 `svBitVecVal[N/32]`은 N이 32의 배수가 아닐 때를 다루지 않는다. 245행 '4 ≠ 16/4가 아니라 128/32 = 4'는 16/4도 4라 문장이 꼬였고, 65행 `mmio_write`는 코드의 함수 이름과 다르다. AP-C-24상 B ≤ 13. |
| C | 5 | simulator 버전·실행 결과가 없다. 223행 `verilator --cc top.sv --exe main.cpp driver.c`가 유일한 명령인데 make·실행 단계와 예상 출력이 없다. 215~221행 빌드 옵션과 217·256행 '가장 빠름'은 출처·버전 없는 주장이고 217행 헤더 경로는 226행과 어긋난다. 코드 조각은 정의 안 된 함수 때문에 그대로 링크되지 않는다(57·61·96~100·167·181~199행). 4~7 구간. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter01-why-cosim.md`, `chapter03-verilator.md`, `chapter04-cocotb.md`, `chapter06-bfm.md`, `chapter07-uvm-c-model.md`. 다른 시리즈 `qemu-fpga-driver/chapter03-qemu-fake-fpga.md`, `qemu-riscv/chapter08-custom-device.md`, `qemu-internals/chapter03-memory-model.md`는 DPI-C를 언급하지만 모두 draft다. 겹침: 33~62행 `c_read_mmio`/`c_write_mmio` import 예 ↔ ch03 127~163행(함수명·시그니처까지 거의 같음), 223~237행 Verilator 생성 파일과 `Vtop__Dpi.h` ↔ ch03 31~45·149행. ch01 58·64행은 한 줄, ch06 71~73행·ch07 72~75행은 용도가 달라 겹침이 작다. qualifier·data type 매핑(106~171행)은 이 글에만 있어 5~9 구간 상단. |
| E | 7 | 제목과 description 'Import·export·data type'(5행)이 29·78·128행 절과 대응하고 과장이 없다. 15행이 약속한 'simulator별 세부 차이'는 211~238행 표 하나와 Verilator 예뿐이라 VCS·Questa·Xcelium은 옵션 한 칸씩이다. |
| F | 5 | 260행 다음 장 예고(Verilator)는 seriesOrder 3 `chapter03-verilator.md`와 맞다. 264·265행 라벨은 옛 제목이다(실제 ch01 'Pre-Silicon Driver Verification — …', ch03 'Verilator 분석 — …'). 266행 'QEMU Internals — QOM Deep Dive'는 링크 없는 관련 항목이고 대상 `qemu-internals/chapter02-qom-deep-dive.md`는 draft라 F ≤ 5. |
| G | 1 | 13행 'SystemVerilog LRM(IEEE 1800)'만 이름이 나오고 판·절(Annex H 등)·링크가 없다. 215~221행 simulator 표에 버전도 출처도 없다. |

uncertainties:
- 244행 '4-state vector를 다루는 거의 모든 함수가 context를 요구'는 IEEE 1800 Annex H와 대조하지 않았다.
- 71~74행 '`task`: C 함수가 simulation 시간 진행시킬 수 있음'은 imported task가 export task를 통해서만 시간을 소비하는지 LRM으로 확인하지 않았다.
- 247행 'Verilator는 single-thread'는 `--threads` 지원과 버전에 따라 틀릴 수 있다(미확인).
- 218행 VCS `-debug_access+all`이 DPI 빌드 옵션인지, 221행 Icarus `-tdll`·'DPI-C 일부 지원'은 도구 문서로 확인하지 않았다.
- 115행 'simulator가 pure 함수 호출 결과를 캐시할 수도 있음', 118행 무qualifier 함수 의미는 LRM과 대조하지 않았다.
- 126행 '자주 쓰는 것은 기본과 context'와 253행 'context가 가장 흔히 씁니다'는 강조가 다르다(오류 확인 아님).
- 217·256행 '가장 빠름'은 측정·출처가 없다.

병합 대상: 판정은 오류 확인으로 우선 조치. 점수 구간(병합 검토) 기준 부분 병합 후보는 같은 시리즈 `chapter03-verilator.md`다(33~62행 import 예와 223~237행 Verilator 절이 ch03 127~163·31~45·149행과 겹침). qualifier·data type 매핑(106~171행)은 ch03에 없고 'DPI-C 기초'라는 독립 검색 의도가 있어 다음 조치는 보강이다. 217행 헤더 파일명을 Verilator 문서로 확인해 고치고, ch03과 겹치는 절은 링크로 줄이고, IEEE 1800 판·절과 simulator 버전을 본문에 적는다.

### `driver-cosim/chapter03-verilator.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, e2ea90c6 발행, 1b4c227e 8편 일괄 확장, 400892d7 linter, e2738341 번역체 묶음)에 Verilator 매뉴얼·저장소·IEEE 1800과 대조한 커밋이 없다. 내부 모순 후보(133행 포트 vs 189행 `dut->cpu_write_req`, 100행 주석 vs 101행 루프, 174행 vs 195행 호출 방향)는 같은 top.sv를 전제한다는 진술이 없거나 산문 개수 실수 수준이라 '동시에 참일 수 없음'을 확정하지 못해 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | RTL → C++ 흐름(33~45행), eval() 설명(68행), VCD/FST 표(201~204행)는 Verilator 입문 자료 수준이다. 이 글만의 것은 DPI 함수를 driver 함수로 위임하는 harness(147~164행), driver 파일까지 넣은 빌드 명령(169행), 실패 시 FST를 artifact로 올리는 CI 예(245~269행), testbench를 C++로 옮기라는 227행 정도다. 24행 '상용 대비 2~5× 빠름', 236행 NVIDIA 사례는 출처가 없고 216행 선택 기준은 한 줄 일반론이다. |
| B | 12 | 문제(17~27행) → 모델(29~68행) → 최소 예제(70~121행) → DPI 결합(123~174행) → timing(176~195행) → waveform·coverage(197~216행) → 한계(218~227행) → 생태계(229~239행) → CI(241~271행) → 정리(273~281행)로 기본 흐름은 완성됐다. 53~59행 Vtop.h 포트와 133행 module top 포트 불일치, 189행 `dut->cpu_write_req`, 222행 '#delay 거부'와 5.x `--timing`, 259행 `--trace-fst`와 87행 `VerilatedVcdC` 등 불확실이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 6 | 빌드 명령(115~119·168~172행), main.cpp(74~111행), CI yaml(245~269행)은 있지만 Verilator 버전·OS·컴파일러와 예상 출력이 없다. 24행 '2~5×', 271행 '5분 안에'는 출처·환경 없는 수치라 C ≤ 8. 133행 module top에는 cpu_write_req가 없는데 189행이 쓰고, 131행 `c_irq_inject`는 SV에서 부르지 않으며, 262행 `--scenario`는 main이 읽지 않는다. 예제를 합쳐 그대로 돌릴 수 없어 4~7 구간. |
| D | 10 | 같은 시리즈 `chapter02-dpi-c-basics.md` 213~237행이 이 글 33~45·147~159·168~172행과, `chapter08-end-to-end.md` 38~50·180~205행(빌드, 실패 시 *.fst upload)이 245~269행과 겹친다. `chapter10-waveform-debug.md` 64행은 이 글 206행을 받아 심화해 역할이 갈리고, `chapter11-sva-coverage.md` 101·109·136행이 212~214행을 다시 설명한다. `chapter01-why-cosim.md` 114행이 233~237행과 반복된다. 인접 `chapter04-cocotb.md`는 Verilator를 백엔드로만 쓴다(57·191·241행). 다른 시리즈에서 Verilator를 언급하는 글은 `avionics/launch-vehicle-flight-sw/chapter05-fpga-sw-interface.md` 290행 한 줄(draft)뿐이다. |
| E | 5 | 제목(2행)은 'Verilator 분석'을 약속하지만 본문은 모델·빌드·DPI·한계 입문 수준이라 3~5 구간이다. description(5행) '가장 빠른 simulator'는 24행의 출처 없는 '2~5×'에만 기댄다. |
| F | 5 | 285행 다음 장(CocoTB)은 seriesOrder 4와 맞고 289·290행 라벨도 대상 제목과 맞다. 291행 'QEMU Internals — TCG Deep', 292행 'FPGA Driver via QEMU+VFIO — QEMU Fake FPGA'는 링크 없는 관련 항목이라 F ≤ 5. 15행은 이 글의 전제 지식(Ch 2 DPI-C)을 밝히지 않는다. |
| G | 1 | Verilator 매뉴얼·저장소·IEEE 1800 출처가 없다. 버전 표기는 27행 'newer 버전(5.x)'뿐이고 212행 옵션의 기준 버전도 없다. 23행 라이선스, 233~237행 사용처에도 출처가 없다. |

uncertainties:
- 53~59행 Vtop.h는 cpu_addr·cpu_write_req 등을 포트로 보이는데 133행 module top은 clk·rst·irq만 선언하고 189행은 `dut->cpu_write_req`를 쓴다. 두 예제가 다른 top.sv를 전제하는지 밝히지 않아 오류 확인으로 올리지 않았다. 174행 cpu_write_req와 136행 write_req도 이름이 다르다.
- 131행 `c_irq_inject`를 import하지만 SV에서 호출하지 않고 irq는 output이다.
- 174행(RTL write pulse → my_driver_write)과 195행('driver 쪽에서 mmio_write를 부르면 … tick으로 RTL을 진행')은 호출 방향이 반대로 읽힌다.
- 100행 주석 '100 cycle'인데 101행 루프는 98 cycle이다(reset 2 cycle 포함 시 100). 개수 표기 실수 수준.
- 113행 '빌드는 한 줄'인데 명령은 세 줄(116~118행)이고 276행은 '5줄짜리'라 한다.
- 259행 CI는 `--trace-fst`로 빌드하고 268행 '*.fst'를 올리지만 보인 main.cpp는 87·89행에서 `VerilatedVcdC`로 wave.vcd를 쓴다.
- 222행 'wait, #delay 거부', 178행 '2-state evaluation'이 Verilator 5.x `--timing`과 맞는지 매뉴얼로 확인하지 않았다.
- 23행 라이선스 'GPLv3 + LGPLv3'는 저장소 LICENSE로 확인하지 않았다.
- 24행 '2~5×', 271행 '5분', 236·237행 NVIDIA·SiFive 사용 주장은 출처가 없다.
- 212~214행 coverage 옵션·assertion 지원 범위·covergroup '미지원'은 매뉴얼로 확인하지 않았다.

병합 대상: 병합 대상 없음. 시리즈에서 유일한 Verilator 전용 글이고 독립 검색 의도가 있어 다음 조치는 보강이다. ch02 213~237행 Verilator 빌드 설명과 ch08 180~205행 CI 예를 이 글로 모으거나 참조만 남기고, Verilator 버전·매뉴얼 출처와 실행 환경·예상 출력을 넣고, 133행 top.sv를 53~59·189행과 맞춘 하나의 예제로 정리하고, 291~292행은 링크를 걸거나 지운다.

### `driver-cosim/chapter04-cocotb.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 106행은 "신호 쓰기는 다음 evaluation까지 반영되지 않음. 즉 같은 cycle 안에 여러 signal을 set한 뒤 `await ReadOnly()` 또는 `await RisingEdge(clk)`로 진행시켜야 변화가 propagate됩니다"라고 해 ReadOnly를 기다리면 쓴 값이 보인다고 설명한다. 239행은 "같은 cycle 안에서 set한 신호는 *이번* `ReadOnly`에서 못 봅니다. 한 cycle 뒤에 읽어야 합니다"라고 한다. 같은 cycle에서 쓴 값이 그 cycle의 ReadOnly에서 보이는지에 대한 두 진술이 반대라 둘 다 참일 수 없다. git log(0a9dd7bc, be973200, ac24bb76, 7c1617d7 TikZ, e2ea90c6 발행, 1b4c227e 확장)에는 1차 자료 대조 커밋도 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 관점은 driver C 코드를 cocotb에 붙이는 두 방법, ctypes(132~159행)와 DPI-C(161~174행)의 비교와 176~178행 선택 기준 정도다. 문제 정의(19~25행), awaitable·signal proxy(76~106행), 함정(238~241행)은 cocotb 입문 수준이다. 13행 '생산성을 *수배*'는 출처 없는 일반론이고, 방법 1의 hook 연결은 155~156행 주석, 159행 LD_PRELOAD 우회는 한 문장이다. 앵커 part1-04(A 10)와 같은 구간. |
| B | 10 | 문제 → 동작 → 최소 예제 → API → bus driver → driver 결합 → pytest → coverage → 함정 → 정리 흐름은 끝까지 간다. 핵심 질문(130행)의 방법 1 코드는 153행 `# ...`로 handshake를 생략하고, `mmio_write` 안의 `dut`는 정의되지 않았으며(149~152행), driver를 hook에 연결하는 코드가 없다(155~156행). 171행 `await dut.driver_init_task()`의 원리 설명도 없다. 106·239행 모순까지 열려 있어 AP-C-24상 B ≤ 13. |
| C | 6 | Makefile(55~64행), `make`(67행), pytest runner(184~206행)는 있다. cocotb·Verilator 버전과 실행 환경이 없고 예상 출력은 70행 '결과를 print합니다'뿐이다. 70행 'test.py를 실행'은 61행 `MODULE = test_basic`과 다르다. 149~153행 `dut` 미정의와 `# ...`, 200행 `+scenario`를 166~174행 test_driver.py가 읽지 않음, 229행 생략 때문에 그대로 돌지 않는다. 4~7 구간. |
| D | 10 | `chapter06-bfm.md` 229~247행의 `AxiMaster` → write → read → assert 흐름이 이 글 112~124행과 같고(ch06은 AxiRam·DMA monitor를 더함), ch06 198~205행 cocotbext 라이브러리 표가 126·247행과 겹친다. `chapter03-verilator.md`는 15·214·285·290행에서 이 글을 가리키기만 하고, `chapter05-systemc-tlm.md`는 221행 링크뿐, `chapter08-end-to-end.md`는 195행 pip install과 258행 표 한 줄이다. 다른 시리즈 qemu-fake-device chapter10 '테스트 자동화'는 draft다. cocotb 기본 API와 driver C 결합은 공개 글 중 이 글에만 있어 10~14 구간 하단. |
| E | 5 | 제목 2행은 'CocoTB 분석'을 약속하지만 본문은 API 소개와 짧은 코드 조각 수준이다. description 5행 '— productivity gain.'의 근거는 13행 '평이 일반화'와 247행 '*분 단위*로 구축'이라는 출처 없는 문장뿐이다. |
| F | 5 | 255행 다음 장(SystemC TLM)은 seriesOrder 5와 맞고 259·260행 라벨도 대상 제목과 맞다. 261행 'QEMU Fake Device Driver — Test Automation — pytest 통합 패턴'은 링크 없는 관련 항목이고 대상(qemu-fake-device chapter10, 'Ch 10: 테스트 자동화')은 draft라 F ≤ 5. 전제 지식(ch03 빌드 파이프라인) 안내가 없다. |
| G | 1 | cocotb 공식 문서·cocotbext-axi·cocotb-coverage 저장소 링크가 없다. 버전 표기는 182행 'cocotb 1.7부터' 하나이고 출처가 없다. Verilator 버전도 없다. |

uncertainties:
- 37행 '5줄짜리 testbench'인데 39~51행 코드는 11줄이다(산문 개수 표기).
- 70행 'test.py'와 61행 `MODULE = test_basic`이 다르다(표기 실수로 봄).
- 182행 'cocotb 1.7부터 runner API'와 187행 `from cocotb.runner import get_runner`: 도입 버전과 cocotb 2.x 모듈 경로(`cocotb_tools.runner`)를 확인하지 않았다.
- 47·82·172행 `Timer(..., units="ns")`, 100행 `.value.binstr`가 cocotb 2.x에서 바뀌었는지 미확인.
- 84행 `await Event(name="my_event")`가 `.wait()` 없이 가능한지 미확인.
- 171행 `await dut.driver_init_task()`로 SV task를 호출할 수 있는지 미확인(기억으로는 VPI가 task 호출을 지원하지 않음).
- 106행과 239행 중 어느 쪽이 맞는지는 cocotb 문서로 정한다.
- 70행 '실패하면 … waveform이 함께 남습니다'가 trace 옵션 없이 성립하는지 미확인.
- 221행 `CoverPoint`의 `bins` 사용법, 231행 `export_to_xml` API 이름 미확인.
- 241행 'Icarus는 GPL 친화적', 'Verilator는 4-state·일부 SVA 제한'은 출처가 없다.

병합 대상: 우선 조치가 먼저다. 106행과 239행의 ReadOnly 모순을 cocotb 공식 문서로 정한 뒤 한쪽을 고친다. 점수 구간은 병합 검토이고, 부분 병합 후보는 `chapter06-bfm.md`다(이 글 112~124행 ↔ ch06 229~247행). 글 전체 병합 대상은 없고 cocotb 기본 API와 driver C 결합은 이 글만 다루는 질문이라 다음 조치는 보강이다. 방법 1 hook 연결 코드를 완성하고, cocotb·Verilator 버전을 고정하고, 1차 출처를 붙인다.

### `driver-cosim/chapter05-systemc-tlm.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(코드와 같은 글이 밝힌 규칙)이다. 200행은 "인자로 받은 sc_time delay를 증가시킨 후 wait 해야 정상. 안 그러면 progress 0인 무한 호출"이라고 b_transport 구현 규칙을 단정한다. 같은 글이 '핵심 패턴'(143행)으로 내놓고 171행에서 "이로써 … 절충이 가능합니다"라고 결론 낸 target b_transport(155~167행)는 delay를 건드리지 않고 wait도 하지 않은 채 TLM_OK_RESPONSE만 돌려준다. 200행이 참이면 145~168행 패턴은 글 스스로의 기준으로 비정상 구현이고, 145~171행이 참이면 200행 규칙이 틀렸다. git log(0a9dd7bc·be973200·ac24bb76·7c1617d7·e2ea90c6·1b4c227e·400892d7·e2738341)에는 1차 자료 대조 커밋이 없다. 어느 쪽이 맞는지는 IEEE 1666-2011 TLM-2.0 LT·temporal decoupling 절로 정한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | SC_MODULE·SC_THREAD 어휘(30~37행), LT/AT 표(67~70행), generic payload 코드(104~120행), b_transport·nb_transport 설명(124~129행)은 SystemC/TLM 입문 목록이다. 이 글만의 것은 일부 register만 Verilator RTL로 보내는 mixed-abstraction 예(145~171행)와 NPU pre-RTL 5단계(189~196행)인데 둘 다 실제 근거 없는 스케치다. 129행 '대부분의 driver 검증은 b_transport로 충분', 185행 'de facto 표준'은 단정이다. |
| B | 9 | 문제(17~26행) → SystemC(28~59행) → TLM 2.0(61~120행) → transport(122~129행) → VP(131~139행) → mixed(141~171행) → 도구(173~185행) → 함정(198~203행) → 정리 흐름은 있다. VP 절은 어떤 CPU 모델로 Linux를 올리는지 없고, AT/nb_transport(127행)는 예가 없으며, 145~168행 예는 read 처리와 `tick_rtl`·`is_critical_path_register` 정의가 빠졌다. 155~167행이 200행 규칙과 모순된다. 5~9 구간. |
| C | 4 | 코드 조각(41~57·78~120·145~168행)은 있지만 SystemC 버전·빌드 명령·sc_main·실행 결과가 없다. 13행 'Hz~kHz'·'천 배 빠른', 26행 '수 시간~수일'·'몇 분 안에', 69행 'MHz~GHz'는 출처·환경 없는 수치라 C ≤ 8. 4~7 구간 하단, 앵커 part6-09(C 4)와 같다. |
| D | 13 | 인접 `chapter04-cocotb.md`·`chapter06-bfm.md`는 주제가 달라 본문이 겹치지 않는다. `chapter01-why-cosim.md` 33·129행, `chapter08-end-to-end.md` 244·259·264행은 이 글을 표 한 줄로 가리킨다. `chapter09-presilicon-platform-map.md` 75행과 `chapter14-virtual-platform-hybrid.md`(172행에서 이 글 링크)는 draft다. 다른 시리즈에서 SystemC를 언급한 글은 `do-178c/chapter05-software-design.md` 566행(draft, 한 줄)뿐이고 나머지 검색 결과는 SystemCoreClock 같은 무관 식별자다. 공개 글 중 SystemC TLM 글은 이 글 하나이고 H2 뼈대만 ch04·06과 같아 10~14 구간. |
| E | 5 | 제목 'SystemC TLM 분석 — … 빠른 검증'은 '분석'과 '빠른'을 약속하지만 본문은 어휘·개념 소개(28~129행)이고 속도 측정이 없다. description 'high-speed virtual platform'은 131~139행과 맞지만 VP 구성·실행 방법이 없다. |
| F | 5 | 217행 다음 장(BFM)은 seriesOrder 6 `chapter06-bfm.md`(194행 BFM 라이브러리, 209행 timing checker)와 맞고 221·222행 링크 라벨도 맞다. 223~224행 'QEMU Internals — TCG Deep', 'QEMU Embedded — ARM virt'는 링크 없는 관련 항목이고 대상(`qemu-internals/chapter13-tcg-deep.md`, `qemu-embedded/chapter02-arm-virt.md`)은 draft라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 1 | 출처 링크가 없다. 63행 'IEEE 1666'은 판(연도)이 없고, SystemC/TLM 라이브러리 버전, 177~183행 도구 표의 출처·버전도 없다. |

uncertainties:
- 200행 규칙 자체가 TLM-2.0 LT 규칙(delay는 주석, wait는 선택)과 맞는지 IEEE 1666-2011로 확인하지 않았다. 모순은 원문 내부 근거로 확정했지만 어느 쪽이 틀렸는지는 미확정이다.
- 137행 'CPU 모델은 보통 QEMU의 TCG를 SystemC TLM bridge로 감싸 씁니다. ARM의 Fast Models가 이 패턴의 표준 도구'와 179행(Fast Models = Arm Cortex ISS)·181행(QEMU SystemC bridge = Xilinx/AMD)이 다른 것을 가리키는 것으로 읽힌다. Arm 문서로 확인해야 해서 오류 확인으로 올리지 않았다.
- 203행 'SC_THREAD 두 개가 같은 신호에 동시 접근하면 깨짐'은 sc_signal evaluate-update·다중 writer 검사 동작 미확인.
- 202행 data_ptr host endian 규칙의 범위(IEEE 1666 endianness 절) 미확인.
- 182행 Imperas riscvOVPsim 제공사(Synopsys), 183행 OSCI Reference(Accellera) 표기 미확인.
- 13·26·69행 속도 수치는 출처가 없다. 13행과 26행 범위는 겹쳐 모순은 아니다.
- 145~168행 예가 read 명령을 처리하지 않고 모두 TLM_OK_RESPONSE를 돌려주는 것이 스케치 의도인지 미확인.

병합 대상: 병합 대상 없음. 공개 글 중 SystemC TLM을 다루는 글은 이 글뿐이라 독립 검색 의도가 있다. 판정은 오류 확인으로 우선 조치이고, 먼저 200행 규칙과 155~167행 target 코드의 모순을 IEEE 1666-2011로 판정해 틀린 쪽을 고친다. 다음 조치는 보강: IEEE 1666-2011·SystemC/TLM 버전 출처, sc_main·빌드 명령·예상 출력이 있는 최소 LT initiator/target 예, 13·26·69행 수치의 출처 확인 또는 삭제, 223~224행 관련 항목 정리.

### `driver-cosim/chapter06-bfm.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(e2738341 번역체+WIP 묶음, 400892d7 linter, 1b4c227e outline 확장, e2ea90c6 발행, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정, de653395 PCIe TLP 관련 링크 추가)에 AMBA AXI 사양(ARM IHI 0022)·IEEE 1800 DPI 절·cocotbext-axi upstream과 대조한 기록이 없다. de653395는 링크 방향과 문구만 다룬다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | BFM 정의(13행), 분류 표(43~47행), AXI-Lite master task(60~99행)는 검증 입문 수준이다. 이 글만의 것은 driver를 BFM에 붙이는 세 단계 표(186~190행: 직접 호출/LD_PRELOAD/mmap+SIGSEGV)와 C slave callback으로 fake_ram을 내보이는 구성(125~153행)이다. 192행 '대부분 A → C 방향으로 발전'과 258행 '대부분은 A로 충분'이 선택 기준 없이 다른 결론을 말하고, 207행 'cocotbext-* 시리즈가 사실상 표준'은 근거 없는 단정이다. |
| B | 10 | 문제(19~37행) → 분류 → master(56~119행) → slave(121~153행) → monitor(155~180행) → 결합 패턴(182~192행) → 라이브러리(194~207행) → timing checker(209~227행) → cocotb(229~249행) → 정리(251~260행) 흐름은 끝까지 간다. slave 예(125~151행)는 `pending_burst` 선언이 없고 `len`·`size`를 저장만 하며 read burst·범위 검사가 없다. 213~214행 T_setup·T_hold는 정의만 있고 함정·한계 절이 없다. 10~15 구간 하단. |
| C | 5 | simulator·버전, 빌드 명령, 예상 출력이 없다. C 하네스(103~117행)는 `uint32_t`를 쓰면서 `<stdint.h>`가 없고, slave 코드(125~151행)는 `pending_burst`·`bfm_slave_send_b` 정의가 없다. cocotb 예(233~247행)는 `@cocotb.test()`(236행)를 쓰면서 `import cocotb`가 없다. 227행 '5분짜리 cosim'은 출처 없는 수치라 C ≤ 8, 관찰 결과가 없어 4~7 구간. |
| D | 10 | 비교 글: 같은 시리즈 `chapter02-dpi-c-basics.md`, `chapter04-cocotb.md`, `chapter05-systemc-tlm.md`, `chapter07-uvm-c-model.md`, `chapter08-end-to-end.md`, 다른 시리즈 `qemu-fpga-driver/chapter02-fpga-architecture.md`(207행)·`chapter04-axi-pcie-bridge.md`(221행)(둘 다 draft, 링크만). 겹침: 233~247행 cocotbext-axi 예 ↔ ch04 112~124행, 37·249행 설명 ↔ ch04 126행, 189행 LD_PRELOAD ↔ ch04 159행, 105~116행 extern 래퍼 ↔ ch08 68~76행 shim. 72~73행 export는 ch02 78행의 응용이다. master/slave/monitor·결합 패턴은 이 글 고유라 10~14 하단. |
| E | 5 | 제목 'C로 구현하는 Bus Functional Model'인데 master(60~99행), monitor(162~178행), timing checker(217~225행)는 SystemVerilog이고 C는 DPI 래퍼(103~117행)와 slave callback(125~151행)뿐이다. 50행 'AXI4 Master BFM (C, DPI)'도 구현은 SV 모듈이다. tags의 pcie·ahb(8행)는 표 칸뿐이다. 3~5 구간. |
| F | 5 | 264행 다음 장(UVM C reference model)은 seriesOrder 7과 맞고 268~270행 라벨(Ch 5, Ch 7, PCIe Ch 2 TLP)도 맞다. 271행 'QEMU Fake Device — Register Bank', 272행 'FPGA Driver — AXI/PCIe Bridge'는 링크 없는 관련 항목이고 대응 파일이 draft라 F ≤ 5. 전제 지식(ch02 DPI-C) 안내가 없다. |
| G | 1 | AXI 사양 판(ARM IHI 0022), IEEE 1800 DPI 절, cocotbext-axi 버전·저장소, 201행 verilator-axi-bfm 위치가 모두 없다. |

uncertainties:
- 80행 `@(posedge clk iff (awready && wready))`: AWREADY와 WREADY가 다른 사이클에 오면 AW 채널이 다시 전송되거나 hang할 수 있다. AXI 사양으로 확인하지 않았다.
- 72~73·105~106행: export task의 C 쪽 반환형은 보통 int인데 void로 선언했다. IEEE 1800 원문 미확인.
- 189행: 리눅스 `writel`은 보통 inline/매크로라 LD_PRELOAD로 가로챌 심볼이 없을 수 있다.
- 246행 `AxiRam.wait_for_write(0x2000, 64)` API 존재를 upstream으로 확인하지 않았다.
- 201행 'verilator-axi-bfm' 라이브러리의 존재·위치 미확인.
- 31행 '이 12줄짜리 handshake'는 27~29행 3단계 목록과 개수가 맞지 않는다(산문 개수 표기).
- 227행 '5분짜리 cosim'은 출처·환경이 없다.
- 218행 주석 '4-byte burst write'와 221행 property가 burst 길이를 보지 않는다.

병합 대상: 병합 대상 없음. ch04 112~124행과 233~247행, ch08 68~76행과 105~116행이 겹치지만, BFM은 ch05 217행 예고와 ch08 260행 목차가 독립 장으로 가리키는 별도 검색 의도라 루브릭 5절 '차별화 보강'을 따른다. 다음 조치: 보강. cocotb 절을 ch04 링크로 줄이고, 'C로 구현'에 맞게 C slave(`pending_burst` 선언·send_b·read burst)를 컴파일 가능한 형태로 채우고, AXI 사양·IEEE 1800·cocotbext-axi 버전을 본문 출처로 달고, 271~272행 관련 항목을 정리한다.

### `driver-cosim/chapter07-uvm-c-model.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, 7c1617d7 TikZ, e2ea90c6 발행, 1b4c227e outline 확장 등)에 IEEE 1800(DPI-C)·IEEE 1800.2(UVM)나 simulator 문서와 대조한 fact-check 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분: 검증·driver fallback·컴파일러 verifier 세 곳이 같은 C reference를 import한다는 문제 설정(36~42행), Reference Model/Scoreboard 대조 표(119~125행), reference 안에서 path를 기록해 coverage로 바꾸는 예(158~169행), '검증을 통과시키려고 reference를 비틀면 driver도 바뀐다'는 trade-off(175행), 적용 범위를 좁히는 179행. UVM 컴포넌트 표(21~30행)는 입문 수준이고 133~136·207~210행은 출처·사례 없는 일반론이다. 실패 사례가 없어 13점에 못 미친다. |
| B | 11 | 문제(34~42행) → 그림(48행) → C·SV·driver 코드(54~111행) → 비교 표(119~125행) → C 선택 이유(131~138행) → coverage(156~169행) → trade-off(171~179행) → layout(185~203행) → 함정(207~210행) → 정리 흐름은 완결된다. 75~78행 open array 선언과 58행 포인터 시그니처의 매핑, C 라이브러리를 simulator에 링크하는 빌드 단계, 169행 cov→covergroup 변환이 빠졌다. AP-C-24상 B ≤ 13. |
| C | 5 | simulator·버전, DPI 라이브러리 컴파일 명령, 실행 로그·기대 출력이 없다. driver 예(103~110행)는 `...` 인자로 A·B·C·M·N·K가 선언되지 않았고, coverage 예(160~166행)는 `any_negative` 정의 없이 165행 '// ... 알고리즘'으로 비웠다. 135행 'SV simulator에서보다 빠름'은 수치·환경이 없다. 4~7 구간. |
| D | 13 | `chapter06-bfm.md` 264행은 이 글을 예고만 하고 겹침이 없다. `chapter08-end-to-end.md` 26·45행은 이 글 185~203행 layout의 결과를 소비할 뿐이다. `chapter02-dpi-c-basics.md` 29~37·145행과 이 글 74~80행 import 선언이 일부 겹치지만 ch02는 문법, 이 글은 공유 패턴이다. 다른 시리즈에서 uvm·scoreboard·'single source of truth'·DPI-C·reference model로 검색한 글(`embedded/buildroot/chapter12-kernel-customize.md` 외 draft 5편, `ml/foundations/murphy-ml2/chapter35-rl.md`)은 같은 주제가 아니다. |
| E | 7 | 제목의 'DUT와 황금 모델 비교'는 82~94행 scoreboard 코드와 97행이 이행하고, description 'driver와 공유'(5행)는 99~113행과 맞는다. '통합'이 약속하는 DPI 연결·빌드 절차는 74~80행 선언 하나뿐이다. |
| F | 4 | 222~224행 다음 장 예고는 seriesOrder 8 `chapter08-end-to-end.md`와 맞고 228·229행 라벨도 맞다. 230행 'GoF Design Patterns — Strategy'는 `programming/design/gof-design-patterns/item21-strategy.md`가 draft이고, 231행 'Khorikov Unit Testing — Anti-Patterns'는 `programming/engineering/khorikov-unit-testing/chapter11-anti-patterns.md`가 있으나 draft이며 description이 라벨의 'duplicated reference 안티패턴'을 다루지 않는다. 링크 없는 관련 항목이 비공개·내용 불일치 글을 가리켜 F ≤ 5, 두 항목이고 전제 지식 안내도 없어 4. |
| G | 1 | 출처 링크 0건. 19행 'Accellera 표준'은 UVM 버전·IEEE 1800.2 판 없이 이름만, 136행 '표준 ABI'도 IEEE 1800 절 인용이 없다. simulator·컴파일러 버전 표기도 없다. |

uncertainties:
- 75~78행 `input shortint A[]`(open array) import와 58행 C 시그니처 `const int16_t *A`의 호환 여부 미확인. ch02 145행은 open array를 `svOpenArrayHandle`로 매핑한다고 적어 어긋난다(다른 글과의 모순이라 오류 확인 아님).
- 83·86행 `int A[]`를 `shortint A[]` import에 넘기는 것이 SV 타입 규칙상 허용되는지 미확인.
- 103~108행 driver 예의 `...` 인자와 미선언 A·B·C·M·N·K.
- 19행 'Cadence/Synopsys/Mentor 모든 상용 simulator가 지원'(Mentor는 현재 Siemens 명칭, 기억 기반), 135행 성능 주장은 출처·환경이 없다.
- 164행 `any_negative` 미정의.

병합 대상: 병합 대상 없음. `chapter08-end-to-end.md`는 matmul_ref를 결과로 쓸 뿐 패턴 설명이 없고 'UVM C reference model'은 독립 검색 의도가 있다. 다음 조치는 보강: DPI-C 배열 전달과 C 시그니처를 맞춘 동작하는 예, 라이브러리 빌드·실행 명령과 기대 출력(mismatch 로그 포함), IEEE 1800/1800.2 출처, 230·231행 관련 항목을 공개 글로 바꾸거나 삭제.

### `driver-cosim/chapter08-end-to-end.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(코드 vs 같은 코드 블록의 동작 설명)이다. 108행 주석 "rising edge → 가장 낮은 set bit를 vector로"는 set bit 하나(가장 낮은 것)만 vector로 넘긴다고 적었지만, 109~111행은 i=0..3을 모두 돌며 set된 bit마다 `aristos1_isr(i)`를 부른다. irq=0b0101이면 주석대로는 isr(0) 한 번, 코드대로는 isr(0)·isr(2) 두 번이라 동시에 참일 수 없다. 언어·API 의미 지식 없이 루프 구조만으로 판단되는 주장이라 3-1 제외 대상이 아니다. git log(de653395 관련 링크 추가, 0a9dd7bc slug 고정 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 가상 NPU Aristos-1 요건(17~30행)을 smoke 5분·nightly 1시간으로 나누는 통합 청사진, `COSIM_BUILD` 분기로 같은 driver 소스를 .ko와 cosim 양쪽에 빌드하는 shim(60~87행), RTL irq를 polling해 ISR을 부르는 thread(93~133행), 시나리오별 도구 배치 표(239~245행)는 이 글만의 조립 관점이라 13~19 구간 하단. Verilator 빌드·CI·pytest는 앞 장을 묶은 것이고, 성능 표(230~235행)와 247행 '다른 도구가 못 따라옵니다'는 출처·측정이 없다. |
| B | 11 | RTL 빌드 → shim → IRQ injection → pytest → CI → 성능 한계 → 도구 선택까지 흐름은 끝까지 간다(38~247행). main.cpp의 시나리오 수신이 '(구현 생략)'(124~125행)이라 main은 thread를 띄운 직후 종료하고(122~128행), shim은 80행 '등도 shim'으로 끝나며, nightly job Install·Build는 '...'(213~214행)이다. 142행 `ctypes.CDLL`로 --exe 실행 파일을 여는 방식도 설명이 없다. 10~15 구간 하단. |
| C | 6 | verilator 명령(41~48행), CI yaml(177~222행), pytest mark 분리 명령(168~171행)은 있으나 대상 RTL이 가상 칩이고 main·shim이 생략돼 재현할 수 없다. 기대 관찰은 148·159행 rc==0, 155행 ID 값뿐이다. 230~235행 cycle/s 수치는 출처·환경 없는 수치라 C ≤ 8, 실행 결과가 없어 4~7 구간. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter07-uvm-c-model.md`(seriesOrder 9 `chapter09-presilicon-platform-map.md`는 draft), `chapter03-verilator.md`, `chapter04-cocotb.md`, `chapter01-why-cosim.md`. 다른 시리즈 공개 글 중 Verilator·cosim을 다루는 것은 `pcie/chapter11-linux-dma.md`(주제 다름)뿐이고 `qemu-fake-device/chapter10-test-automation.md`는 draft다. 겹침: 177~205행 smoke job ↔ ch03 241~270행, 41~48행 ↔ ch03 169~171행, 168~173행 ↔ ch04 180~212행, 253~262행 ↔ ch01 123~132행. shim·IRQ thread·도구 배치 표는 이 글에만 있다. |
| E | 6 | 제목·description이 Step 1~5(38~224행)와 같은 질문을 향한다. '실전'을 내걸었지만 대상은 가상 NPU(17행)이고 실행 결과가 없으며, description의 DPI-C는 shim의 extern `bfm_read`/`bfm_write`(69·74행)로만 등장하고 SV 쪽 import/export 연결이 없다. 6~8 하단. |
| F | 5 | Step 1~5 구분(38·56·89·135·175행)과 장별 요약 표(253~262행)는 고유 구조다. 278~284행 '시리즈 마무리'는 공개 기준으로 맞다(chapter09~16 모두 draft). 288·289·292·293행 라벨은 대상 제목과 맞는다. 290행 'QEMU Fake Device — Test Automation'·291행 'FPGA Driver via QEMU+VFIO — VFIO Basics'는 링크가 없고 대상이 draft라 F ≤ 5. |
| G | 1 | 주장과 연결된 1차 출처 링크가 없다. 282~284행은 Verilator manual, Spear 책, OpenTitan/Chipyard 저장소를 이름만 대고 링크·버전이 없다. Verilator·cocotb 버전, 230~235행 측정 환경도 없다. |

uncertainties:
- 164행 `driver.cosim_dma_loop(seconds=1800)`: ctypes 외부 함수가 키워드 인자를 받지 않는 것으로 알고 있으나 Python 문서로 확인하지 않았다.
- 142행 `ctypes.CDLL("./obj_dir/Varistos1_tb")`: --exe 실행 파일을 공유 라이브러리로 로드할 수 있는지 미확인. .so 빌드 절차가 없다.
- 106~107행 rising edge 검출(cur && !prev)은 irq 전체가 0에서 0이 아닌 값으로 바뀔 때만 동작해 다른 bit가 set된 동안 새 bit를 놓친다. 코드 결함 의심.
- 230~235행 cycle/sec 수치와 'VCS가 일반적으로 Verilator보다 느림'은 출처가 없다. ch01 81행 '수십~수백 cycle/s'와 어긋난다(다른 글과의 모순).
- 233행 '1 ms 시뮬레이션에 100ms~1s'는 1 MHz 클록일 때만 맞는데 클록을 밝히지 않았다.
- 243행 '1초 이상 stress는 FPGA'와 27·163~165행 30분 stress의 cosim nightly 배치가 벽시계·시뮬레이션 시간 구분 없이 적혀 있다.
- 274행 '큰 RTL에서 10k 미만'과 233행 '1,000~10,000'은 상한 표기 차이라 모순으로 보지 않았다.
- 209행 `runs-on: ubuntu-latest-4-cores`는 조직 larger runner 이름이어야 하는데 밝히지 않았다(GitHub 문서 미확인).
- 184행 cron '0 18 * * *' = 03:00 KST는 UTC+9 산술로 맞다.

병합 대상: 판정은 오류 확인으로 우선 조치. 점수 구간(병합 검토) 참고: 병합 대상 없음. 시리즈 통합 장이라 ch03 CI 예시와 겹치는 부분(177~205행 vs ch03 241~270행)만 정리하면 독립 역할이 남는다. 108행 주석·코드 불일치를 고친 뒤 다음 조치는 보강(생략된 main·shim 채우기, 성능 표 출처 확인 또는 TBD, 290·291행 무링크 항목 정리).

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다. CXL은 이 루프에 2편뿐이라 CXL 단독 문제는 3편 기준을 채우지 못해 마지막 항목에 참고로만 둔다.

- **1차 자료 대조 커밋 없음 (driver-cosim 8편 전부).** 1b4c227e가 outline을 한꺼번에 본문으로 확장했고 e2ea90c6이 일괄 발행했다. 이후 slug·topic·제목·TikZ·링크 일괄 커밋뿐이라 `factcheck: 검증됨`은 0편이고, 4편(ch02·ch04·ch05·ch08)은 원문 내부 모순으로 오류 확인이다. Driver-RTL Co-simulation은 `/fact-check-round` 대상이다.
- **본문 1차 출처·도구 버전 표기 없음 (driver-cosim 8편 전부, G 모두 1).** IEEE 1800 판·절 없음(ch01 58행, ch02 13행), IEEE 1666 판 없음(ch05 63행), UVM·IEEE 1800.2 없음(ch07 19·136행), Verilator 버전 없음(ch03 27행 '5.x'뿐), cocotb 버전은 ch04 182행 '1.7부터' 하나, ch08 282~284행은 자료 이름만. `data/upstream-tracking.yaml`에 Verilator·cocotb가 없어 ③⑥ 자동화가 이 시리즈를 보지 않는다.
- **링크 없는 관련 항목이 draft 글이나 없는 글을 가리킴 (driver-cosim 8편 전부, F 모두 ≤ 5).** ch01 152~154행(qemu-fake-device·qemu-fpga-driver draft, 없는 'CXL 4.0 Spec Full Review'), ch02 266행(qemu-internals ch02 draft), ch03 291~292행, ch04 261행(qemu-fake-device ch10 draft), ch05 223~224행(qemu-internals ch13·qemu-embedded ch02 draft), ch06 271~272행(qemu-fake-device ch13·qemu-fpga-driver ch04 draft), ch07 230~231행(GoF Strategy·Khorikov ch11 draft, 내용 불일치), ch08 290~291행. fa55144d 링크 일괄 정리에서 링크만 지우고 텍스트를 남긴 흔적으로 보인다. CXL ch15 206행도 같은 형태다.
- **코드 예제가 미정의 식별자·생략(`...`)으로 끝나 그대로 빌드·실행되지 않음 (driver-cosim 7편).** ch02 57·61·167행, ch03 131·189·262행, ch04 149~153·171·200·229행, ch05 145~168행(`tick_rtl`·`is_critical_path_register`), ch06 103~117·125~151·233~247행(include·`pending_burst`·`import cocotb` 누락), ch07 103~110·164행, ch08 80·124~125·213~214행. 실행 환경·예상 출력도 없어 C가 3~6에 머문다.
- **출처·측정 환경 없는 속도·생산성 수치 (driver-cosim 7편, C ≤ 8 반복).** ch01 41~49·81·90·92행, ch02 217·256행 '가장 빠름', ch03 24·271행, ch04 13·247행, ch05 13·26·69행, ch06 227행, ch08 230~235행. 같은 시리즈 안에서도 cosim 속도가 ch01 81·92·96행('수십~수백 cycle/s', 'Hz~kHz')과 ch08 232~235행('1,000~200,000 cycle/s')으로 어긋난다.
- **'X 분석' 제목에 개념 소개 본문 (driver-cosim 3편, E 5).** ch03 'Verilator 분석', ch04 'CocoTB 분석', ch05 'SystemC TLM 분석'. ac24bb76 일괄 rename에서 온 형식이다. ch06 'C로 구현하는'도 본문은 SV 중심이라 E 5다.
- **시리즈 안 예제·설명 반복 (driver-cosim 6편 관련, D 감점).** MMIO import 예 ch02 33~62행 ↔ ch03 127~163행, Verilator 빌드·생성 파일 ch02 213~237행 ↔ ch03 33~45행 ↔ ch08 38~50행, CI smoke job ch03 241~270행 ↔ ch08 177~205행, cocotbext-axi 예 ch04 112~126행 ↔ ch06 229~247행, extern bfm 래퍼 ch06 105~116행 ↔ ch08 68~76행, 도구 분담·장별 표 ch01 78~102·123~132행 ↔ ch08 238~245·249~262행. 한 곳을 정본으로 두고 나머지는 링크로 줄이는 정리가 필요하다.
- **같은 시리즈 글 사이 사실·표기 충돌 (driver-cosim 5편 관련).** DPI 헤더 이름(ch02 217행 `Vtop_dpi.h` vs ch02 226·232행·ch03 38·149행 `Vtop__Dpi.h`), covergroup 지원(ch03 214행 '미지원' vs ch11 109행 '제한적'), SVA `--assert` 옵션(ch03 213행 vs ch11 101행), open array 매핑(ch07 58·75~78행 vs ch02 145행 `svOpenArrayHandle`), cosim 속도(ch01 vs ch08). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 1차 자료로 한 번에 정한다.
- **공통 H2 뼈대 (driver-cosim 6편 이상 확인).** '어떤 문제를 푸는가 → … → 흔한 함정 → 정리 → 다음 장 예고 → 관련 항목'이 ch02(249·258·262행), ch03(273·283·287행), ch04(17·243·253·257행), ch05, ch06(17·251·262·266행), ch07(34·212·222·226행), ch08(268·278·286행)에 같은 순서로 있다. 본문 내용은 글별로 달라 scaled content 판정은 아니지만 루브릭 9절 사이트 지표 기록 대상이다.
- **편수 표기와 디렉터리 불일치 (driver-cosim 3편).** ch01 121·123~132행 '8장', ch08 13·251·280행 '마지막 장'인데 디렉터리에 seriesOrder 9~16(draft) 8편이 더 있다. ch02 264~265행 라벨도 ac24bb76 이전 옛 제목이다. 이후 장 공개 시 허브 로드맵·마무리 문구·관련 항목 라벨을 함께 고쳐야 한다.
- (참고, CXL 2편) 시리즈 이름 'CXL 4.0 Internals'와 실제 기준 문서(CXL 3.1, ch14 15·185행, ch15 218행)가 다르고, 운용 명령·Event Log·IDE·TSP 설명이 Embedded Security Ch 11·13, Memory Diagnostics Ch 6, Embedded Debugging Ch 9와 반복된다. ch15 204행 Recipes 장 번호(149~151, 실제 150~152)는 같은 안내 블록을 쓰는 다른 장에도 있는지 CXL 다음 루프에서 확인한다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 4편(driver-cosim ch02·ch04·ch05·ch08)은 각 모순을 1차 자료로 정한다. ch05는 200행 vs 155~167행을 IEEE 1666-2011 TLM-2.0 LT 절로, ch04는 106행 vs 239행을 cocotb trigger·write 스케줄링 문서로, ch02는 217행 헤더 이름을 Verilator 문서로, ch08은 108행 주석과 109~111행 루프 중 의도한 쪽을 정한다. 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 driver-cosim 8편의 링크 없는 관련 항목(공통 문제 목록)을 공개 글 링크로 바꾸거나 지우고, ch02 264~265행 옛 라벨을 고친다. F 감점 원인이라 다시 채점할 때 바로 반영된다.
- Driver-RTL Co-simulation `/fact-check-round`에서 시리즈 안 사실 충돌(DPI 헤더 이름, covergroup·`--assert`, open array 매핑, cosim 속도)과 열린 uncertainties(cocotb 2.x API, Verilator 라이선스·`--timing`, SV task 호출)를 한 번에 정한다. Verilator·cocotb를 `data/upstream-tracking.yaml`에 등록할지는 사용자가 결정한다.
- 병합 검토 5편 중 driver-cosim ch03·ch06·ch07은 병합 대상 없이 보강(반복 절을 정본 링크로 줄이고 버전·실행 환경·예상 출력을 채움)이고, CXL ch14는 Embedded Security Ch 11·13과의 차별화 보강, CXL ch15는 viral·compliance 절 보강과 204·206행 수정이다. ch01은 허브 예외 적용을 종합 검토에서 다시 확인한다.
- CXL 시리즈는 다음 루프에서 나머지 장을 채점할 때 시리즈 이름(4.0)과 기준 문서(3.1)의 범위 차이, 다른 시리즈와의 중복, 같은 안내 블록의 장 번호를 함께 본다.
