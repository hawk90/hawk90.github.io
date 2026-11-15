# 공개 글 독립 재채점 — 루프 11

평가일 2026-10-19. 루브릭 v1.2·anchors·antipatterns 적용, HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. Luna 초벌 없이 Sol이 대상10편 원문 전문·아래 D 양쪽 구간·F 링크 전체 행(후행 설명 포함) 및 실제 title/slug/seriesOrder/draft를 확인했다. 본문·기존보고서·사용자 변경은 수정하지 않았다. 전편 score_status=잠정, confidence=중간.

표 cxl=`src/content/blog/embedded/hardware/cxl/`,driver-cosim=`src/content/blog/tools/emulation/driver-cosim/`이다. D/F의같은시리즈chapter는각경로기준. Security=`src/content/blog/embedded/embedded-security/`,Memory=`src/content/blog/tools/debugging/memory/`,Embedded Debug=`src/content/blog/tools/debugging/embedded/`,Performance=`src/content/blog/embedded/performance-engineering/`;그외QEMU시리즈는`src/content/blog/tools/emulation/`하위다. Recipes는D비교에허용한다. anchor_ref는루프15에서실제읽은git10550ca1의옛Recipes part1-04-uart-hardware.md(UART49)/part6-09-isr-api.md(ISR40)/part7-05-kernel-build.md(Build50)전문으로현재개선본/Part12rename와구분한다.

[공통 게이트](double-check-gates-2026-10-18.md)의check/build/links/sitemap/ads/anchors/reading통과를인용하며기술정확성·모바일육안확인으로간주하지않는다. 기존보고서ba9f7104이후대상diff없음. 비교글변경효과로점수변경한항목없다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `cxl/chapter14-security.md` | 12 | 13 | 3 | 5 | 7 | 7 | 4 | 51 | 검증됨 | 병합 검토 |
| `cxl/chapter15-ras-performance.md` | 14 | 12 | 7 | 10 | 7 | 5 | 4 | 59 | 검증됨 | 병합 검토 |
| `driver-cosim/chapter01-why-cosim.md` | 12 | 12 | 3 | 12 | 7 | 4 | 1 | 51 | 미검증 | 보강 |
| `driver-cosim/chapter02-dpi-c-basics.md` | 10 | 11 | 5 | 9 | 7 | 5 | 1 | 48 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter03-verilator.md` | 11 | 12 | 6 | 10 | 5 | 5 | 1 | 50 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter04-cocotb.md` | 10 | 10 | 6 | 10 | 5 | 5 | 1 | 47 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter05-systemc-tlm.md` | 10 | 9 | 4 | 13 | 5 | 5 | 1 | 47 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter06-bfm.md` | 11 | 10 | 5 | 10 | 5 | 5 | 1 | 47 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter07-uvm-c-model.md` | 12 | 11 | 5 | 13 | 7 | 4 | 1 | 53 | 오류 확인 | 우선 조치 |
| `driver-cosim/chapter08-end-to-end.md` | 13 | 11 | 6 | 10 | 6 | 5 | 1 | 52 | 오류 확인 | 우선 조치 |

합계505, 평균50.5, 범위47~59. 이전505와같다. 우선조치7편·병합검토2편·보강1편. 검증됨2·오류확인7·미검증1. 기존오류4유지,신규오류3(Verilator/BFM/UVM). 총점동의10/10·판정동의7/10. 모든열린불확실에B≤13을적용했다.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `cxl/chapter14-security.md` | 51 | 51 | 0 | 병합 검토 | 병합 검토 | A~G동의 |
| `cxl/chapter15-ras-performance.md` | 59 | 59 | 0 | 병합 검토 | 병합 검토 | A~G동의 |
| `driver-cosim/chapter01-why-cosim.md` | 51 | 51 | 0 | 보강 | 보강 | A~G동의 |
| `driver-cosim/chapter02-dpi-c-basics.md` | 48 | 48 | 0 | 우선 조치 | 우선 조치 | A~G동의;기존오류근거보강/범위교정 |
| `driver-cosim/chapter03-verilator.md` | 50 | 50 | 0 | 병합 검토 | 우선 조치 | A~G동의;공식자료로신규오류게이트 |
| `driver-cosim/chapter04-cocotb.md` | 47 | 47 | 0 | 우선 조치 | 우선 조치 | A~G동의;기존오류근거보강/범위교정 |
| `driver-cosim/chapter05-systemc-tlm.md` | 47 | 47 | 0 | 우선 조치 | 우선 조치 | A~G동의;기존오류근거보강/범위교정 |
| `driver-cosim/chapter06-bfm.md` | 47 | 47 | 0 | 병합 검토 | 우선 조치 | A~G동의;공식자료로신규오류게이트 |
| `driver-cosim/chapter07-uvm-c-model.md` | 53 | 53 | 0 | 병합 검토 | 우선 조치 | A~G동의;공식자료로신규오류게이트 |
| `driver-cosim/chapter08-end-to-end.md` | 52 | 52 | 0 | 우선 조치 | 우선 조치 | A~G동의;기존오류근거보강/범위교정 |

## 정확성 게이트의 1차 자료

- ch02 헤더명과 ch06 export task 반환형: [Verilator Connecting / DPI Example](https://verilator.org/guide/latest/connecting.html#dpi-example)의 Vour__Dpi.h 생성/extern void export 예를 확인했다. 헤더명 오류는 유지하고 void 자체를 오류로 의심한 부분은 기각한다.
- ch03: [Verilator v5.040 languages.rst / Time](https://raw.githubusercontent.com/verilator/verilator/v5.040/docs/guide/languages.rst)의100~127행 --timing 지원과컴파일러조건을대조했다. 버전/옵션에따른제한과무조건‘wait/#delay거부’는다르다.현재latest만으로과거판오류라고하지않고고정5.x판으로검증했다.
- ch04: [cocotb Timing Model / End of Time Step](https://docs.cocotb.org/en/stable/timing_model.html#end-of-time-step)에서 ReadOnly는현재timestep평가종료후값을읽는단계임을확인했다.인터넷문서는2.1개발표시여서버전범위는남기되현재모든cycle에한cycle추가지연필수라는본문일반규칙의반례가된다.
- ch05: [OSCI TLM2.0 LRM](https://www.accellera.org/images/downloads/standards/systemc/TLM_2_0_LRM.pdf) §8.2.7(b~f),printedp117/PDFindex126의effective local time비감소및annotation/실시간/양쪽허용을직접읽었다.‘둘다필수’규칙오류로근거를교체했으며코드생략자체는오류근거에서뺐다.
- ch06: [Arm IHI0022H AXI spec](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf) §A1.2.1(independentchannels),§A3.3.1(A3-46/PDFindex45)에서AW/W개별수락을확인했다.본문80행의동시READY기다림이독립완료를기억하지못한다는반례는그규칙과원코드에대한추론이다.실제SVsimulator실행은아니다.
- ch07: [AMD UG900 2022.1 Open Arrays in DPI](https://docs.amd.com/r/2022.1-English/ug900-vivado-logic-simulation/Open-Arrays-in-DPI)의SVint[]입력/출력→Copenarrayhandle예와accessAPI규칙을직접읽었다.본문에는별도DPI변환래퍼가없어rawpointer알고리즘의직접ABI가맞지않는다.단순언어기억을오류확인근거로쓰지않았다.
- ch08: clang++C++17추출프로브로cur0b0101의두ISR호출확인.한비트라는주석이실제코드와다르다.전체RTL/driver실행·cycle성능측정은하지않았다.

Luna 초벌은없다. 기존A~G의실제인용을원문대조후채택하되CXL14의읽지않은LLM역사앵커비교는UART/ISR로교체했다. 기존SystemC‘내부모순’확정은기각하고공식규칙오류로바꿨다.IRQ루프개수·헤더명은출력/공식문서로보강했다.03/06/07미검증유지는새1차근거때문에기각한다.관련링크의옛제목재서술·권고/발전경로차이·서로다른예시포트만으로신규내부오류를만들지않는다.

## 글별 근거

### chapter14-security.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter14-security.md`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 추가확인된기술P1없음.

검증됨. a0eeea28(PR #59) 안의 커밋 "fix(content): fact-check CXL Ch 14 (security) against CXL 3.1 §11 and Linux"가 CXL 3.1 spec §11.1~11.5와 개정 이력, CXL 3.2 press release, Linux v7.3-rc6 `drivers/pci/tsm.c`·`include/linux/pci-tsm.h`·`drivers/crypto/ccp/sev-dev-tsm.c`를 출처로 적고 TSP 범위·TDISP 관계·TSP target 상태·CXL.cachemem IDE·SPDM session과 IDE 키 관계를 주장별로 고쳤다. e2aa6b02(#61)는 footer 출처 줄만 고친 커밋이다. 직접읽은a0eeea28개별기록의판/절/Linux소스대조를루브릭3-1로승계. e2aa6b02footer정리는새검증으로세지않음.

uncertainties:
- 78~79행 Aggregation Flit Count(Containment 68B 5·256B 2, Skid 68B 128·256B 32)를 CXL 3.1 §11.3.5 원문으로 확인하지 않았다. fact-check 커밋에 개별 수치 언급이 없다.
- 68행 보호 안 되는 필드 목록과 69행 CRC→복호화 순서를 spec으로 대조하지 않았다.
- 46행은 'TSP는 SPDM 1.2 이상 요구'의 근거를 §11.5.2로, ES Ch 13 32행은 §11.5.3.2로 적었다. 다른 글과의 불일치라 오류 확인이 아니다.
- 101행 '3.2 발표문은 Trusted Security Protocol이라고도 씀'은 CXL 3.2 press release 문구를 직접 보지 않았다.
- 131행 '커널 주석은 PCIe r7.0 §11로 인용', 136행 `sev-dev-tio.*` 파일 존재는 v7.3-rc6 소스로 확인하지 않았다(ES Ch 13 83행은 `sev-dev-tsm.c`만 적음).
- 125행 ERROR → CONFIG_UNLOCKED 전이를 '자동으로'라고 적었는데 ES Ch 13 55행에는 없다. §11.5.4.8 원문 미확인.
- 시리즈 이름은 CXL 4.0인데 4.0의 보안(TSP·IDE) 변경 사항을 이 글에 넣어야 하는지 정하지 못했다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 본문 대부분이 CXL 3.1 §11을 표로 다시 정리한 것이다: 위협 범위(23~28행), CXL.io IDE(56~60행), CXL.cachemem IDE(64~72행), CXL_IDE_KM 3단계(89~93행), TSP 범위(107~113행), target 상태(121~125행). 작성자 해석은 30행 '경로 위 switch도 TCB에 들어감', 97행 'session은 IDE 키를 나르는 통로', 115행 '3.1 TSP는 fabric 보안이 아니라 직접 연결 메모리의 confidential computing' 정도다. 자기 계산·선택 기준·실패 사례가 없어 6~12 구간 상단. UART/ISR의추가가치10보다상세하지만고유분석이약해12. |
| B | 13 | 위협 → 구성 요소 → SPDM → IDE → 키 설정 → TSP → TDISP·Linux → 함정 → 정리(19~170행)가 끝까지 가고 description의 '무엇을 지키고 어떻게 맞물리는지'에 답한다. SPDM 흐름은 44행에서 다른 글로 넘기고, 146행의 'TSP의 메모리 암호화·접근 제어'는 본문 어디에서도 설명하지 않으며, 72행 키 갱신은 절차가 없다. 78~79행·46행 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 3 | 코드·명령·관찰 결과·검증 절차가 없다. 66행 256-bit 키, 78~79행 Aggregation Flit Count는 spec 절 번호를 달았지만 독자가 실행하거나 관찰할 수단이 없고, 135~136행 Linux 소스 경로도 나열뿐이다. 예제 자체가 없어 0~3 구간 상단(앵커 part6-09는 코드가 있어 4). 같은 주제의 ES Ch 13 63~76행에는 sysfs tsm/connect·bound 명령이 있다. |
| D | 5 | 같은시리즈chapter13-switching-fabric.md69~100행은FM제어,chapter15-ras-performance.md19~45행은RAS로역할다름. 다른시리즈Security chapter11-pcie-cxl-ide.md67~86·111~113행 ↔ 이글89~97·71~81·160~162행 키관리/refresh/Containment/Skid·오해문장 반복. Security chapter13-cxl-tee.md25~32·51~57·80~85·103~109행 ↔34~40·107~125·133~138·152~158행 TSP/TSM/오해 중복.64~70행 보호필드와23~28행위협범위만추가해5유지. |
| E | 7 | 제목의 IDE·SPDM·TSP·CXL TEE와 description의 키워드를 42~140행이 모두 다룬다. SPDM은 44행에서 흐름을 다른 글로 넘기고 46행 전송 경로만 적어 부분 이행이다. 시리즈 이름 'CXL 4.0 Internals'에 비해 본문은 3.1 §11 기준(15행)이고 4.0 보안 변화가 없다. |
| F | 7 | 17·178행 Ch 13, 174행 다음 편 'Ch 15: RAS·Performance·Compliance'는 seriesOrder 15 글 제목과 같다. 179~181행 라벨은 ES Ch 11·12·13 제목과 맞고, 46행 Ch 6(DOE 절 73행), 185행 Ch 1 앵커(Ch 1 167행 heading)도 맞다. 44·83·140행이 절마다 상세 글을 짚는다. 전제 지식 안내가 없고 audit:reading·모바일 확인을 하지 않아 8 이하. 실제 대상 title/order/draft 재대조. 오번호는기술 factcheck 오류로전이하지않음. |
| G | 4 | 주장마다 판 번호 있는 1차 출처가 붙는다: CXL 3.1 §11.1(21·146행), §11.2(54행), §11.3·11.3.5(64·74·162행), §11.4(46·87·150행), §11.5.x(101·105·119·154행, Figure 11-30), DMTF DSP0274(36·44행), NIST SP 800-38D(66행), Linux v7.3-rc6 파일 경로(131~138행), 185행 자료 목록. 외부 URL·대조 날짜가 없어 5점은 아니다. |

병합 대상: Security chapter11/13 공통표정본. 다음 조치: 독립질문과역할분담을유지하며 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter15-ras-performance.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter15-ras-performance.md`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 추가확인된기술P1없음.

검증됨. a0eeea28(PR #59) 안의 'fix(content): fact-check CXL Ch 15 (RAS, performance) against CXL 3.1, ndctl, Linux'가 CVME 정의·카운터 단위, Late Poison 위치(§4.3.6.3), opcode 4200h/0100h/4300h, Table 13-1·13-2, poison source 다섯 종·64 B 단위를 CXL 3.1 spec §4.3.6.3·§12~14·Table 1-1, ndctl Documentation/cxl, Linux v7.3-rc6 `drivers/cxl`(cxlmem.h, trace.h, mce.c)과 대조하고 출처를 커밋 본문에 남겼다. 이후 e2aa6b02는 출처 각주(218행)만 정리했다. 직접읽은a0eeea28개별기록의판/절/Linux소스대조를루브릭3-1로승계. e2aa6b02footer정리는새검증으로세지않음.

uncertainties:
- 83~87행 '총 대역폭' 16 GT/s x16 = 32 GB/s, 64 GT/s = 128 GB/s가 한 방향인지 양방향 합인지 표가 밝히지 않는다. spec Table 13-1 원문과 대조하지 않았다.
- 36행은 Event Log 커널 상수 위치를 `drivers/cxl/cxlmem.h`로, Memory Diagnostics Ch 6 57행·Embedded Debugging Ch 9 21행은 `drivers/cxl/core/trace.h`로 적었다. 다른 글과의 모순이라 v7.3-rc6 소스로 정한다.
- 126행 '2023년 4월 이후 compliance 이벤트 9회, Integrators List CXL 1.1 30개·CXL 2.0 30개'는 웨비나(2025-12) 슬라이드 원문을 보지 않았다.
- 109행 'v7.3-rc6 mainline과 QEMU master에 CHMU 코드 없음'은 시점 의존 진술이다(audit:staleness 대상). 111행은 출처 없는 전망이다.
- 89행 'CXL.cache·CXL.mem에서 60~90% 효율'의 spec 원문 조건을 확인하지 않았다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 spec Table 12-1을 CXL.io와 CXL.cache·mem으로 나눈 RAS 표(23~30행), Late Poison을 링크 계층 메커니즘으로 설명한 63행, CVME 임계값 카운터 단위 표(69~73행), Table 13-2 지연 목표와 측정 조건(91~99행), '자주 하는 실수' 네 개(161~175행)다. 대부분 spec·ndctl 문서 항목을 표로 옮긴 요약이고 작성자 해석은 101·175행 정도다. 111행 'CHMU가 티어링을 측정으로 돌리는 토대'는 109행에서 구현이 없다고 한 기능에 대한 출처 없는 전망이다. 13~19 구간 하단. |
| B | 12 | RAS → Event Log → Poison → CVME → 성능 → CHMU → Compliance → 운용 명령 → 지표 → 실수 → 정리(19~185행)로 흐름은 끝까지 간다. description(5행)이 약속한 viral은 28행 표 한 칸과 179행 정리뿐이고, Compliance 절(113~126행)은 절 번호 표와 이벤트 횟수 한 문장이라 시험 내용을 알 수 없다. CHMU 절(105~111행)은 발표문 한 줄과 '구현 없음'뿐이다. 83~87·36행 불확실이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 7 | 130~145행에 `cxl list -H/-L`, `cxl monitor`, bpftrace 명령이 있고 147행이 -L은 libtracefs 빌드에서만 된다는 조건을 적었다. 출력 예·기대 관찰·실행 환경(커널·ndctl 버전, 실 디바이스 또는 QEMU)이 없다. 85~98행 수치는 spec 권고 목표이지 측정 결과가 아니고 실측은 101행에서 다른 글로 넘긴다. 관찰 결과가 없어 C ≥ 10 불가, 4~7 구간 상단. |
| D | 10 | 같은시리즈chapter11-linux-driver.md206~228행 ↔ 이글32행은링크로역할분담.다른시리즈Memory chapter06-cxl-memory-diagnostics.md37~66행 ↔36~45·130~147행 health/poison/monitor/event표반복.Embedded Debug chapter09-cxl-device-troubleshoot.md19~30·122~142행 ↔36~45·140~144행 enum/bpftrace공유.이글63·69~73·91~99·115~126행 LatePoison/CVME/권고지연/Compliance는정본구분되어10유지. |
| E | 7 | 제목 'RAS·Performance·Compliance'와 description 키워드가 34·47·65·79·113·128행 절과 대체로 맞는다. viral은 28행 표 한 칸뿐이고 'compliance 시험'은 115~126행 절 번호 표라 시험 내용을 다루지 않아 6~8 구간에서 감점. |
| F | 5 | 시리즈 마지막 글이라 199~206행이 다른 시리즈 안내를 준다. 204행 'Modern Embedded Recipes Ch 149~151'은 실제 CXL 글 seriesOrder 150~152(part11-15·11-16·11-17)와 번호가 다르고, 206행 '4개 디버깅 시리즈의 CXL 추가 챕터들'은 링크가 없어 F ≤ 5. 201행 HBM Ch 9, 202행 Perf Eng Ch 54~56, 203행 Security Ch 11~13, 205행 Bootloader Ch 34~36, 210~214행 관련 항목 다섯 개는 맞다. 191~195행 회고 표는 템플릿 성격이라 가점 근거가 아니다. 실제 대상 title/order/draft 재대조. 오번호는기술 factcheck 오류로전이하지않음. |
| G | 4 | spec §12 Table 12-1(21행), §4.3.6.3(63·163행), Table 1-1(67행), Table 13-2(91행), §3.3.4(103행), §14.x(117~124행), `drivers/cxl/cxlmem.h`·`core/trace.h`(36·45·51행), v7.3-rc6(109행), ndctl cxl-list 문서(147행), 218행 출처 목록이 주장에 붙어 있다. 외부 링크가 없고 126행 웨비나 수치는 문서 위치가 없어 5점은 아니다. |

병합 대상: Memory chapter06/Embedded Debug chapter09 운용명령정본. 다음 조치: 독립질문과역할분담을유지하며 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter01-why-cosim.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter01-why-cosim.md`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 추가확인된기술P1없음.

미검증. git log(0a9dd7bc slug 고정, be973200 topics 메타, fa55144d 내부 링크 일괄 수정, ac24bb76 제목 변경·날짜 정규화, e2ea90c6 발행 전환, 1b4c227e outline 확장, 400892d7 linter, e2738341 번역체 다듬기·WIP 묶음)에 IEEE 1800·Verilator 문서·비용 자료 같은 1차 자료와 대조한 커밋이 없다.

uncertainties:
- 81행 '수십~수백 cycle/s'와 92·96행 'Hz~kHz'는 ch08 232~235행 'Verilator 1,000~200,000 cycle/sec'와 크게 어긋난다. 다른 글과의 모순이라 오류 확인에 넣지 않았다.
- 41~47행 수정 비용 배수(1×/3×/30×/1,000×/10,000×)의 출처를 확인하지 않았다.
- 49행 마스크 수정·re-tape-out 비용은 공정 노드가 없고 1차 자료로 확인하지 않았다.
- 112행 Tenstorrent·Tachyum·SambaNova의 cosim 환경 '공개·반공개'는 근거가 없다.
- 114행 Chipyard·OpenTitan·SiFive Freedom의 Verilator cosim 기본 흐름은 각 저장소 문서로 확인하지 않았다.
- 115행 DO-178C/ISO 26262 조기 검증 사례 '증가'는 출처가 없다.
- 32행 'Xilinx VCU/U250'은 보드 이름 표기(VCU118 등)가 불완전하다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 정리는 QEMU·cosim 비교 표의 '가장 잘 잡는 버그' 행(84행)과 'cosim에서 큰 버그, FPGA에서 long-running stress' 분담(102행) 정도다. 나머지는 pre-silicon 검증 입문의 표준 논지다. 수정 비용 배수 표(41~47행), 49행 마스크 비용, 112행 Tenstorrent·Tachyum·SambaNova 사례, 115행 'DO-178C/ISO-26262 사례가 늘고 있습니다', 117행 '로드맵 3년을 보면 명확히 흑자'는 근거 없는 단정이라 분석으로 인정하지 않았다. 앵커 part1-04(A 10)보다 비교 관점이 조금 더 있어 12. |
| B | 12 | 문제(17~35행) → 비용 표(37~49행) → 정의·구성 요소(51~68행) → QEMU·FPGA·post-silicon 비교(70~106행) → 업계 사용(108~117행) → 로드맵(119~134행) → 정리(136~143행)로 흐름은 완결된다. 한계는 92·96행 '느리다(Hz~kHz)'뿐이고 아날로그·PHY, 큰 RTL 시뮬레이션 시간, 모델·shim 유지 비용이 없다. 117행 '1인-월' 도입 비용도 근거 없이 끝난다. |
| C | 3 | 코드·명령·실행 환경이 없다. 비용 배수(41~47행), 'tape-out 이후 6~12개월'(31행), 'FPGA 합성 수십 분~시간'(90행), cosim 속도 '수십~수백 cycle/s'(81행)·'Hz~kHz'(92·96행), 마스크 비용(49행)은 출처·측정 환경 없는 수치라 C ≤ 8이고, 재현 절차·관찰 결과가 없어 0~3 구간이다. |
| D | 12 | 같은시리즈chapter08-end-to-end.md238~245·249~262행 ↔ 이글78~102·123~132행 도구선택/로드맵반복. chapter02-dpi-c-basics.md13~27행 ↔58행은정의요약뿐.다른시리즈qemu-fake-device/chapter01-overview.md13~38행 및 qemu-fpga-driver/chapter01-fpga-driver-challenge.md13~43행은보드없이driver개발/도구분담주제일부공유하지만모두draft.공개중복에동일가중치로세지않고도입역할인정해12. |
| E | 7 | 제목(2행)과 description(5행)을 17~35행(푸는 문제), 70~106행(다른 방법과의 차이)이 이행한다. 과장은 없다. 독자는 19행 'driver 팀'으로 암시만 되고 독자가 얻는 결과물(도입 판단 기준 등)이 구체적이지 않다. |
| F | 4 | 147행next예고및151행실제chapter02/order2/title기본DPI주제일치.152~153행링크없는QEMU Fake Device/FPGA Driver는실제qemu-fake-device/chapter01-overview.md·qemu-fpga-driver/chapter01-fpga-driver-challenge.md가draft.154행CXL Spec Full Review는실제CXL 4.0 Internals이름과달라찾기어렵다.허브표123~132행장별링크도없어4. |
| G | 1 | 본문에 출처 링크가 없다. 58행 'SystemVerilog LRM 표준'은 IEEE 1800 판이 없고, 비용 표(41~47행)·업계 사례(112~115행)·속도 수치(81·92행)에 근거가 없으며 Verilator·QEMU 버전 표기도 없다. |

병합 대상: chapter08의로드맵/도구선택표. 다음 조치: 독립질문과역할분담을유지하며 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter02-dpi-c-basics.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics.md`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

217행Vtop_dpi.h와226·232행Vtop__Dpi.h의불일치를Verilator공식Connecting/DPI Example의 Vour__Dpi.h 생성규칙과대조해전자가오자임을확인했다.

uncertainties:
- 244행 '4-state vector를 다루는 거의 모든 함수가 context를 요구'는 IEEE 1800 Annex H와 대조하지 않았다.
- 71~74행 '`task`: C 함수가 simulation 시간 진행시킬 수 있음'은 imported task가 export task를 통해서만 시간을 소비하는지 LRM으로 확인하지 않았다.
- 247행 'Verilator는 single-thread'는 `--threads` 지원과 버전에 따라 틀릴 수 있다(미확인).
- 218행 VCS `-debug_access+all`이 DPI 빌드 옵션인지, 221행 Icarus `-tdll`·'DPI-C 일부 지원'은 도구 문서로 확인하지 않았다.
- 115행 'simulator가 pure 함수 호출 결과를 캐시할 수도 있음', 118행 무qualifier 함수 의미는 LRM과 대조하지 않았다.
- 126행 '자주 쓰는 것은 기본과 context'와 253행 'context가 가장 흔히 씁니다'는 강조가 다르다(오류 확인 아님).
- 217·256행 '가장 빠름'은 측정·출처가 없다.
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | import/export(29~104행), pure/context(106~126행), data type 표(132~145행)는 IEEE 1800 DPI 절과 입문 자료에 흔한 목록이다. 이 글만의 것은 76행 register write를 0-time `function`으로 모델링, 204~209행 MMIO·IRQ·scenario별 호출 패턴, 171행 packed→byte buffer 변환을 BFM에 캡슐화 정도다. 13행 '세부 사항은 vendor마다 조금씩 다르지만', 247행 '멀티스레드 simulator는 주의'는 구체 기준 없는 일반론이다. 앵커 part6-09(A 10)와 비슷하다. |
| B | 11 | 정의(17행) → import(29행) → export(78행) → qualifier(106행) → type(128행) → lifecycle(173행) → simulator(211행) → 함정(240행) → 정리(249행) 흐름은 갖췄다. 코드가 정의 없는 `driver_mmio_read`(57행)·`driver_dma_write`(167행)에 기대고, 160~168행은 `memcpy`·`uint8_t`를 쓰면서 `<string.h>`·`<stdint.h>`가 없다. 143행 `svBitVecVal[N/32]`은 N이 32의 배수가 아닐 때를 다루지 않는다. 245행 '4 ≠ 16/4가 아니라 128/32 = 4'는 16/4도 4라 문장이 꼬였고, 65행 `mmio_write`는 코드의 함수 이름과 다르다. AP-C-24상 B ≤ 13. |
| C | 5 | simulator 버전·실행 결과가 없다. 223행 `verilator --cc top.sv --exe main.cpp driver.c`가 유일한 명령인데 make·실행 단계와 예상 출력이 없다. 215~221행 빌드 옵션과 217·256행 '가장 빠름'은 출처·버전 없는 주장이고 217행 헤더 경로는 226행과 어긋난다. 코드 조각은 정의 안 된 함수 때문에 그대로 링크되지 않는다(57·61·96~100·167·181~199행). 4~7 구간. |
| D | 9 | chapter03-verilator.md127~163·31~45행 ↔ 이글33~62·223~237행 DPI import/driver함수/생성헤더반복. chapter06-bfm.md71~73·105~117행 ↔78~104행 export는응용이어서반복위험낮음.다른시리즈qemu-internals/chapter13-tcg-deep.md13~37행은binarytranslation이라표준DPI문법과역할다르고draft.이글106~171행 qualifier/type목적은남으나기본코드중복으로9. |
| E | 7 | 제목과 description 'Import·export·data type'(5행)이 29·78·128행 절과 대응하고 과장이 없다. 15행이 약속한 'simulator별 세부 차이'는 211~238행 표 하나와 Verilator 예뿐이라 VCS·Questa·Xcelium은 옵션 한 칸씩이다. |
| F | 5 | 260행nextVerilator는chapter03/order3이고264~265행실제링크chapter01/order1·chapter03/order3주제맞음.옛제목이짧게재서술된것만으로기술오류는아니다.266행후행functional비교는QOM대상qemu-internals/chapter02-qom-deep-dive.mdtitle/description과연결되나draft이며링크도없어5상한유지. |
| G | 1 | 13행 'SystemVerilog LRM(IEEE 1800)'만 이름이 나오고 판·절(Annex H 등)·링크가 없다. 215~221행 simulator 표에 버전도 출처도 없다. |

병합 대상: chapter03의DPI기본빌드. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter03-verilator.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter03-verilator.md`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

222행wait/#delay거부및27·281행합성subset만지원단정을Verilator v5.040 공식languages.rst Time100~127행과대조했다.--timing은delay/event/wait/fork를지원하고C++20coroutine조건을명시한다.옵션없는빌드가실패한다는사실과도구가지원하지않는다는주장은다르므로미검증→오류확인.

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
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | RTL → C++ 흐름(33~45행), eval() 설명(68행), VCD/FST 표(201~204행)는 Verilator 입문 자료 수준이다. 이 글만의 것은 DPI 함수를 driver 함수로 위임하는 harness(147~164행), driver 파일까지 넣은 빌드 명령(169행), 실패 시 FST를 artifact로 올리는 CI 예(245~269행), testbench를 C++로 옮기라는 227행 정도다. 24행 '상용 대비 2~5× 빠름', 236행 NVIDIA 사례는 출처가 없고 216행 선택 기준은 한 줄 일반론이다. |
| B | 12 | 문제(17~27행) → 모델(29~68행) → 최소 예제(70~121행) → DPI 결합(123~174행) → timing(176~195행) → waveform·coverage(197~216행) → 한계(218~227행) → 생태계(229~239행) → CI(241~271행) → 정리(273~281행)로 기본 흐름은 완성됐다. 53~59행 Vtop.h 포트와 133행 module top 포트 불일치, 189행 `dut->cpu_write_req`, 222행 '#delay 거부'와 5.x `--timing`, 259행 `--trace-fst`와 87행 `VerilatedVcdC` 등 불확실이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 6 | 빌드 명령(115~119·168~172행), main.cpp(74~111행), CI yaml(245~269행)은 있지만 Verilator 버전·OS·컴파일러와 예상 출력이 없다. 24행 '2~5×', 271행 '5분 안에'는 출처·환경 없는 수치라 C ≤ 8. 133행 module top에는 cpu_write_req가 없는데 189행이 쓰고, 131행 `c_irq_inject`는 SV에서 부르지 않으며, 262행 `--scenario`는 main이 읽지 않는다. 예제를 합쳐 그대로 돌릴 수 없어 4~7 구간. |
| D | 10 | chapter02-dpi-c-basics.md213~237행 ↔ 이글33~45·147~172행 생성헤더/빌드중복; chapter08-end-to-end.md38~50·180~205행 ↔241~269행 빌드/실패artifact중복. chapter04-cocotb.md55~64행은Verilator백엔드만소비.다른시리즈qemu-internals/chapter13-tcg-deep.md13~37행은번역블록으로RTL→C++생성과다르며draft라공개중복으로세지않음.10유지. |
| E | 5 | 제목(2행)은 'Verilator 분석'을 약속하지만 본문은 모델·빌드·DPI·한계 입문 수준이라 3~5 구간이다. description(5행) '가장 빠른 simulator'는 24행의 출처 없는 '2~5×'에만 기댄다. |
| F | 5 | 285행nextCocoTB는chapter04/order4이며Pythoncoroutine/pytest내용일치.289~290행chapter02/order2·chapter04/order4title대조.291~292행QEMU TCG/qemu-fpga-driver 가짜FPGA는링크없는관련항목이며qemu-internals/chapter13-tcg-deep.md와qemu-fpga-driver/chapter03-qemu-fake-fpga.md는draft.5. |
| G | 1 | Verilator 매뉴얼·저장소·IEEE 1800 출처가 없다. 버전 표기는 27행 'newer 버전(5.x)'뿐이고 212행 옵션의 기준 버전도 없다. 23행 라이선스, 233~237행 사용처에도 출처가 없다. |

병합 대상: chapter08의CI/빌드공통절. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter04-cocotb.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter04-cocotb.md`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

106/239행기존모순만인용하지않고공식cocotb Timing Model의EndofTimeStep/ReadOnly와대조했다.현재timestep의HDL평가가끝난값을읽을수있으므로‘한cycle뒤에만볼수있다’는239행일반단정이잘못됨을확인했다.

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
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 관점은 driver C 코드를 cocotb에 붙이는 두 방법, ctypes(132~159행)와 DPI-C(161~174행)의 비교와 176~178행 선택 기준 정도다. 문제 정의(19~25행), awaitable·signal proxy(76~106행), 함정(238~241행)은 cocotb 입문 수준이다. 13행 '생산성을 *수배*'는 출처 없는 일반론이고, 방법 1의 hook 연결은 155~156행 주석, 159행 LD_PRELOAD 우회는 한 문장이다. 앵커 part1-04(A 10)와 같은 구간. |
| B | 10 | 문제 → 동작 → 최소 예제 → API → bus driver → driver 결합 → pytest → coverage → 함정 → 정리 흐름은 끝까지 간다. 핵심 질문(130행)의 방법 1 코드는 153행 `# ...`로 handshake를 생략하고, `mmio_write` 안의 `dut`는 정의되지 않았으며(149~152행), driver를 hook에 연결하는 코드가 없다(155~156행). 171행 `await dut.driver_init_task()`의 원리 설명도 없다. 106·239행 모순까지 열려 있어 AP-C-24상 B ≤ 13. |
| C | 6 | Makefile(55~64행), `make`(67행), pytest runner(184~206행)는 있다. cocotb·Verilator 버전과 실행 환경이 없고 예상 출력은 70행 '결과를 print합니다'뿐이다. 70행 'test.py를 실행'은 61행 `MODULE = test_basic`과 다르다. 149~153행 `dut` 미정의와 `# ...`, 200행 `+scenario`를 166~174행 test_driver.py가 읽지 않음, 229행 생략 때문에 그대로 돌지 않는다. 4~7 구간. |
| D | 10 | chapter06-bfm.md229~247·198~205행 ↔ 이글112~126·247행 AxiMaster write/read/assert/라이브러리반복. chapter08-end-to-end.md135~173행 ↔180~212행 pytest환경반복이나fixture/driverAPI가다르다.다른시리즈qemu-fake-device/chapter10-test-automation.mdtitle/description의CI/QEMU는draft이며PythonRTLAPI와다른질문.이글76~106·132~178행 coroutine/driver결합역할로10. |
| E | 5 | 제목 2행은 'CocoTB 분석'을 약속하지만 본문은 API 소개와 짧은 코드 조각 수준이다. description 5행 '— productivity gain.'의 근거는 13행 '평이 일반화'와 247행 '*분 단위*로 구축'이라는 출처 없는 문장뿐이다. |
| F | 5 | 255행nextSystemC는chapter05/order5이며VP131~139행에서실제Linux부팅개념을설명한다.259~260행chapter03/order3·chapter05/order5title맞음.261행후행pytest통합은qemu-fake-device/chapter10-test-automation.mddescriptionCI/QEMU와연결되지만draft/링크없어5.미구현코드를실제실행완결로보지않음. |
| G | 1 | cocotb 공식 문서·cocotbext-axi·cocotb-coverage 저장소 링크가 없다. 버전 표기는 182행 'cocotb 1.7부터' 하나이고 출처가 없다. Verilator 버전도 없다. |

병합 대상: chapter06의AxiMaster 예. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter05-systemc-tlm.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm.md`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

155~167행코드에wait가보이지않는다는것만으로내부모순확정한기존근거는기각한다(tick_rtl내부미정의).별도로200행delay증가후wait둘다필수라는규칙을TLM2.0 LRM§8.2.7(f),printedp117/PDFp127과대조해오류확인한다.시간주석증가또는시뮬레이션시간진행또는둘다허용되며매호출무조건wait요구가아니다.

uncertainties:
- 200행 규칙 자체가 TLM-2.0 LT 규칙(delay는 주석, wait는 선택)과 맞는지 IEEE 1666-2011로 확인하지 않았다. 모순은 원문 내부 근거로 확정했지만 어느 쪽이 틀렸는지는 미확정이다.
- 137행 'CPU 모델은 보통 QEMU의 TCG를 SystemC TLM bridge로 감싸 씁니다. ARM의 Fast Models가 이 패턴의 표준 도구'와 179행(Fast Models = Arm Cortex ISS)·181행(QEMU SystemC bridge = Xilinx/AMD)이 다른 것을 가리키는 것으로 읽힌다. Arm 문서로 확인해야 해서 오류 확인으로 올리지 않았다.
- 203행 'SC_THREAD 두 개가 같은 신호에 동시 접근하면 깨짐'은 sc_signal evaluate-update·다중 writer 검사 동작 미확인.
- 202행 data_ptr host endian 규칙의 범위(IEEE 1666 endianness 절) 미확인.
- 182행 Imperas riscvOVPsim 제공사(Synopsys), 183행 OSCI Reference(Accellera) 표기 미확인.
- 13·26·69행 속도 수치는 출처가 없다. 13행과 26행 범위는 겹쳐 모순은 아니다.
- 145~168행 예가 read 명령을 처리하지 않고 모두 TLM_OK_RESPONSE를 돌려주는 것이 스케치 의도인지 미확인.
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | SC_MODULE·SC_THREAD 어휘(30~37행), LT/AT 표(67~70행), generic payload 코드(104~120행), b_transport·nb_transport 설명(124~129행)은 SystemC/TLM 입문 목록이다. 이 글만의 것은 일부 register만 Verilator RTL로 보내는 mixed-abstraction 예(145~171행)와 NPU pre-RTL 5단계(189~196행)인데 둘 다 실제 근거 없는 스케치다. 129행 '대부분의 driver 검증은 b_transport로 충분', 185행 'de facto 표준'은 단정이다. |
| B | 9 | 문제(17~26행) → SystemC(28~59행) → TLM 2.0(61~120행) → transport(122~129행) → VP(131~139행) → mixed(141~171행) → 도구(173~185행) → 함정(198~203행) → 정리 흐름은 있다. VP 절은 어떤 CPU 모델로 Linux를 올리는지 없고, AT/nb_transport(127행)는 예가 없으며, 145~168행 예는 read 처리와 `tick_rtl`·`is_critical_path_register` 정의가 빠졌다. 200행 필수대기 규칙은 공식TLM규칙과어긋나며위게이트에서검증했다. 5~9 구간. |
| C | 4 | 코드 조각(41~57·78~120·145~168행)은 있지만 SystemC 버전·빌드 명령·sc_main·실행 결과가 없다. 13행 'Hz~kHz'·'천 배 빠른', 26행 '수 시간~수일'·'몇 분 안에', 69행 'MHz~GHz'는 출처·환경 없는 수치라 C ≤ 8. 4~7 구간 하단, 앵커 part6-09(C 4)와 같다. |
| D | 13 | chapter04-cocotb.md161~178행 ↔ 이글141~171행은모델을섞는다는상위목적뿐이고API가다름; chapter06-bfm.md56~119행은signalhandshake로TLMtransaction과층이다름. chapter08-end-to-end.md238~245행은도구선택표한줄.다른시리즈qemu-internals/chapter13-tcg-deep.md13~37행은CPUfastmodel배경만연결되며TLMsocket/transport를설명하지않고draft다.공개TLM정본역할로13. |
| E | 5 | 제목 'SystemC TLM 분석 — … 빠른 검증'은 '분석'과 '빠른'을 약속하지만 본문은 어휘·개념 소개(28~129행)이고 속도 측정이 없다. description 'high-speed virtual platform'은 131~139행과 맞지만 VP 구성·실행 방법이 없다. |
| F | 5 | 217행nextBFM은chapter06/order6이며library194~207/timing209~227행실재.221~222행chapter04/order4·chapter06/order6title맞음.223~224행후행fastfunctionalCPU/VP비교는qemu-internals/chapter13-tcg-deep.md와qemu-embedded/chapter02-arm-virt.md의내용방향에맞으나둘다draft/링크없어5. |
| G | 1 | 출처 링크가 없다. 63행 'IEEE 1666'은 판(연도)이 없고, SystemC/TLM 라이브러리 버전, 177~183행 도구 표의 출처·버전도 없다. |

병합 대상: 병합대상없음;TLM정본보강. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter06-bfm.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter06-bfm.md`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

80행AWREADY&&WREADY동시대기는Arm IHI0022H§A1.2.1/A3.3.1의독립채널/개별handshake규칙과대조했다.AW만먼저수락된경우AWVALID가유지되어같은주소가재수락될수있고두READY가교대로오면대기종료하지못한다.각채널완료를따로기억하지않는최소골격은정상AXI-Lite상대에대해정확하지않아미검증→오류확인.

uncertainties:
- 80행 `@(posedge clk iff (awready && wready))`: AWREADY와 WREADY가 다른 사이클에 오면 AW 채널이 다시 전송되거나 hang할 수 있다. AXI 사양으로 확인하지 않았다.
- 72~73·105~106행: export task의 C 쪽 반환형은 보통 int인데 void로 선언했다. IEEE 1800 원문 미확인.
- 189행: 리눅스 `writel`은 보통 inline/매크로라 LD_PRELOAD로 가로챌 심볼이 없을 수 있다.
- 246행 `AxiRam.wait_for_write(0x2000, 64)` API 존재를 upstream으로 확인하지 않았다.
- 201행 'verilator-axi-bfm' 라이브러리의 존재·위치 미확인.
- 31행 '이 12줄짜리 handshake'는 27~29행 3단계 목록과 개수가 맞지 않는다(산문 개수 표기).
- 227행 '5분짜리 cosim'은 출처·환경이 없다.
- 218행 주석 '4-byte burst write'와 221행 property가 burst 길이를 보지 않는다.
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.
- 105~106행export task의void반환형만을오류로보지않는다.Verilator공식Connecting/DPI Example은export task publicSetBool을extern void로생성하는예를직접제시한다.일반LRM/다른simulatorABI는별도확인필요.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | BFM 정의(13행), 분류 표(43~47행), AXI-Lite master task(60~99행)는 검증 입문 수준이다. 이 글만의 것은 driver를 BFM에 붙이는 세 단계 표(186~190행: 직접 호출/LD_PRELOAD/mmap+SIGSEGV)와 C slave callback으로 fake_ram을 내보이는 구성(125~153행)이다. 192행 발전경로와258행 충분성권고는서로모순은아니지만선택조건이약하고, 207행 'cocotbext-* 시리즈가 사실상 표준'은 근거 없는 단정이다. |
| B | 10 | 문제(19~37행) → 분류 → master(56~119행) → slave(121~153행) → monitor(155~180행) → 결합 패턴(182~192행) → 라이브러리(194~207행) → timing checker(209~227행) → cocotb(229~249행) → 정리(251~260행) 흐름은 끝까지 간다. slave 예(125~151행)는 `pending_burst` 선언이 없고 `len`·`size`를 저장만 하며 read burst·범위 검사가 없다. 213~214행 T_setup·T_hold는 정의만 있고 함정·한계 절이 없다. 10~15 구간 하단. |
| C | 5 | simulator·버전, 빌드 명령, 예상 출력이 없다. C 하네스(103~117행)는 `uint32_t`를 쓰면서 `<stdint.h>`가 없고, slave 코드(125~151행)는 `pending_burst`·`bfm_slave_send_b` 정의가 없다. cocotb 예(233~247행)는 `@cocotb.test()`(236행)를 쓰면서 `import cocotb`가 없다. 227행 '5분짜리 cosim'은 출처 없는 수치라 C ≤ 8, 관찰 결과가 없어 4~7 구간. |
| D | 10 | chapter04-cocotb.md112~124·126·159행 ↔ 이글233~247·37·189행 AxiMaster/LD_PRELOAD 반복; chapter08-end-to-end.md68~76행 ↔105~116행 read/write래퍼 반복.다른시리즈PCIe chapter02-tlp.md13~37행 ↔ 이글45·201행TLP단위는배경일뿐;qemu-fpga-driver/chapter04-axi-pcie-bridge.md는draft라공개중복제외. master/slave/monitor질문은별도로10. |
| E | 5 | 제목 'C로 구현하는 Bus Functional Model'인데 master(60~99행), monitor(162~178행), timing checker(217~225행)는 SystemVerilog이고 C는 DPI 래퍼(103~117행)와 slave callback(125~151행)뿐이다. 50행 'AXI4 Master BFM (C, DPI)'도 구현은 SV 모듈이다. tags의 pcie·ahb(8행)는 표 칸뿐이다. 3~5 구간. |
| F | 5 | 264행nextUVM은chapter07/order7·36~113행reference공유내용맞음.268~270행chapter05/order5·chapter07/order7·PCIe chapter02/order2 실제title일치.270행후행‘cocotbext-pcie 같은 BFM이 다루는 TLP단위구조’는PCIe13~37행이행.271~272행registerbank/bridge대상qemu-fake-device/chapter13-register-bank.md·qemu-fpga-driver/chapter04-axi-pcie-bridge.md는draft/링크없어5. |
| G | 1 | AXI 사양 판(ARM IHI 0022), IEEE 1800 DPI 절, cocotbext-axi 버전·저장소, 201행 verilator-axi-bfm 위치가 모두 없다. |

병합 대상: chapter04의Python AXI예와chapter08의MMIO래퍼. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter07-uvm-c-model.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model.md`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

74~80행SVopenarray A[]/B[]/C[]를58행C rawpointer int16_t*/int32_t*에그대로연결하면서같은C함수라설명한다.AMD UG900 2022.1 Open Arrays in DPI는import int[]예를const svOpenArrayHandle로매핑하고API를통해데이터접근한다고정의한다.헤더/변환래퍼가없어직접rawpointer시그니처와ABI호환되지않으므로미검증→오류확인.83행int[]/shortint[]타입추가의심은별도미검증.

uncertainties:
- 75~78행 `input shortint A[]`(open array) import와 58행 C 시그니처 `const int16_t *A`의 호환 여부 미확인. ch02 145행은 open array를 `svOpenArrayHandle`로 매핑한다고 적어 어긋난다(다른 글과의 모순이라 오류 확인 아님).
- 83·86행 `int A[]`를 `shortint A[]` import에 넘기는 것이 SV 타입 규칙상 허용되는지 미확인.
- 103~108행 driver 예의 `...` 인자와 미선언 A·B·C·M·N·K.
- 19행 'Cadence/Synopsys/Mentor 모든 상용 simulator가 지원'(Mentor는 현재 Siemens 명칭, 기억 기반), 135행 성능 주장은 출처·환경이 없다.
- 164행 `any_negative` 미정의.
- 위정확성게이트로확인한해당의문은오류확인으로이동했다.나머지API/타입/속도/업계사례는열린불확실이며B≤13유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분: 검증·driver fallback·컴파일러 verifier 세 곳이 같은 C reference를 import한다는 문제 설정(36~42행), Reference Model/Scoreboard 대조 표(119~125행), reference 안에서 path를 기록해 coverage로 바꾸는 예(158~169행), '검증을 통과시키려고 reference를 비틀면 driver도 바뀐다'는 trade-off(175행), 적용 범위를 좁히는 179행. UVM 컴포넌트 표(21~30행)는 입문 수준이고 133~136·207~210행은 출처·사례 없는 일반론이다. 실패 사례가 없어 13점에 못 미친다. |
| B | 11 | 문제(34~42행) → 그림(48행) → C·SV·driver 코드(54~111행) → 비교 표(119~125행) → C 선택 이유(131~138행) → coverage(156~169행) → trade-off(171~179행) → layout(185~203행) → 함정(207~210행) → 정리 흐름은 완결된다. 75~78행 open array 선언과 58행 포인터 시그니처의 매핑, C 라이브러리를 simulator에 링크하는 빌드 단계, 169행 cov→covergroup 변환이 빠졌다. AP-C-24상 B ≤ 13. openarray ABI는단순설명누락보다직접연결결함임을공식자료로확인해오류게이트를추가했다. |
| C | 5 | simulator·버전, DPI 라이브러리 컴파일 명령, 실행 로그·기대 출력이 없다. driver 예(103~110행)는 `...` 인자로 A·B·C·M·N·K가 선언되지 않았고, coverage 예(160~166행)는 `any_negative` 정의 없이 165행 '// ... 알고리즘'으로 비웠다. 135행 'SV simulator에서보다 빠름'은 수치·환경이 없다. 4~7 구간. |
| D | 13 | chapter02-dpi-c-basics.md132~145행 ↔ 이글74~80행 타입/import표준일부공유하지만ch02는문법,이글36~42·119~125·171~179행 공유·책임판단이다. chapter08-end-to-end.md26·45행은reference결과소비뿐.다른시리즈Khorikov chapter11-anti-patterns.md13~60행은private메서드테스트로DPI공유알고리즘과다르며draft.13유지. |
| E | 7 | 제목의 'DUT와 황금 모델 비교'는 82~94행 scoreboard 코드와 97행이 이행하고, description 'driver와 공유'(5행)는 99~113행과 맞는다. '통합'이 약속하는 DPI 연결·빌드 절차는 74~80행 선언 하나뿐이다. |
| F | 4 | 222~224행next통합환경은chapter08/order8·Step1~5내용과맞음.228~229행chapter06/order6·chapter08/order8title일치.230행GoF item21-strategy.md알고리즘교체주제는맞으나draft/링크없음.231행Khorikov chapter11-anti-patterns.md는draft이며본문13~60행/description이duplicatedreference를이행하지않음.4유지. |
| G | 1 | 출처 링크 0건. 19행 'Accellera 표준'은 UVM 버전·IEEE 1800.2 판 없이 이름만, 136행 '표준 ABI'도 IEEE 1800 절 인용이 없다. simulator·컴파일러 버전 표기도 없다. |

병합 대상: 병합대상없음;C모델공유정본보강. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.

### chapter08-end-to-end.md

source_file: `src/content/blog/tools/emulation/driver-cosim/chapter08-end-to-end.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; P1 위 기술오류 확인.

108행가장낮은setbit주석과109~111행모든setbit ISR루프불일치는원문두위치에더해macOS clang++-std=c++17로원루프를독립추출/ISR만printf대체해확인했다.cur=5/prev=0에서isr(0) isr(2)두번출력.프로브/private/tmp/adsense-loop11-irq.cpp.전체Verilator/driver통합실행은아니다.

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

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 가상 NPU Aristos-1 요건(17~30행)을 smoke 5분·nightly 1시간으로 나누는 통합 청사진, `COSIM_BUILD` 분기로 같은 driver 소스를 .ko와 cosim 양쪽에 빌드하는 shim(60~87행), RTL irq를 polling해 ISR을 부르는 thread(93~133행), 시나리오별 도구 배치 표(239~245행)는 이 글만의 조립 관점이라 13~19 구간 하단. Verilator 빌드·CI·pytest는 앞 장을 묶은 것이고, 성능 표(230~235행)와 247행 '다른 도구가 못 따라옵니다'는 출처·측정이 없다. |
| B | 11 | RTL 빌드 → shim → IRQ injection → pytest → CI → 성능 한계 → 도구 선택까지 흐름은 끝까지 간다(38~247행). main.cpp의 시나리오 수신이 '(구현 생략)'(124~125행)이라 main은 thread를 띄운 직후 종료하고(122~128행), shim은 80행 '등도 shim'으로 끝나며, nightly job Install·Build는 '...'(213~214행)이다. 142행 `ctypes.CDLL`로 --exe 실행 파일을 여는 방식도 설명이 없다. 10~15 구간 하단. |
| C | 6 | verilator 명령(41~48행), CI yaml(177~222행), pytest mark 분리 명령(168~171행)은 있으나 대상 RTL이 가상 칩이고 main·shim이 생략돼 재현할 수 없다. 기대 관찰은 148·159행 rc==0, 155행 ID 값뿐이다. 230~235행 cycle/s 수치는 출처·환경 없는 수치라 C ≤ 8, 실행 결과가 없어 4~7 구간. |
| D | 10 | chapter03-verilator.md168~172·241~270행 ↔ 이글41~48·177~205행 빌드/CI반복; chapter04-cocotb.md180~212행 ↔168~173행pytest반복; chapter01-why-cosim.md123~132행 ↔253~262행로드맵중복.다른시리즈PCIe chapter11-linux-dma.md192~210행은DMA모델정리와이글안내한줄뿐이고cosimshim60~87행과독립질문.10유지. |
| E | 6 | 제목·description이 Step 1~5(38~224행)와 같은 질문을 향한다. '실전'을 내걸었지만 대상은 가상 NPU(17행)이고 실행 결과가 없으며, description의 DPI-C는 shim의 extern `bfm_read`/`bfm_write`(69·74행)로만 등장하고 SV 쪽 import/export 연결이 없다. 6~8 하단. |
| F | 5 | 공개마지막장맞음(ch09~16draft확인).288~289행chapter07/order7·chapter01/order1title맞음.292행Performance part1-01-methodology.mdorder1측정/가설/검증13~42행맞음.293행PCIe chapter11-linux-dma.mdorder11후행dma_map_single의실커널일은DMA모델설명과맞음.290~291행QEMU testautomation/FPGA VFIO기초대상chapter10-test-automation.md·chapter09-vfio-basics.md는draft/링크없어5. |
| G | 1 | 주장과 연결된 1차 출처 링크가 없다. 282~284행은 Verilator manual, Spear 책, OpenTitan/Chipyard 저장소를 이름만 대고 링크·버전이 없다. Verilator·cocotb 버전, 230~235행 측정 환경도 없다. |

병합 대상: chapter03/04의빌드·pytest·CI. 다음 조치: 확인된오류를먼저정정하고 열린불확실을판고정공식자료/실행으로닫고실행가능환경·예상관찰·출처링크를보강한다.비공개/오번호관련항목도정리한다.
