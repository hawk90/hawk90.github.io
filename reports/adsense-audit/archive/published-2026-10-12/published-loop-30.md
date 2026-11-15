# 공개 글 AdSense 평가 — 루프 30

> 대상: 공개 글 10편 (Industrial Ethernet 심화 `seriesOrder` 6~12, Kernel Debugging `seriesOrder` 1~3)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른 번째 루프다. 대상은 `src/content/blog/embedded/protocols/industrial-ethernet/`의 chapter06~chapter12(PROFINET·TSN·POWERLINK·리눅스 실시간·비교) 7편과 `src/content/blog/tools/debugging/kernel/`의 chapter01~chapter03 3편이다. 시리즈가 둘이라 표의 파일명 앞에 시리즈 디렉터리(`industrial-ethernet/`, `kernel/`)를 붙였다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `industrial-ethernet/chapter06-profinet.md` | 13 | 11 | 5 | 9 | 5 | 4 | 2 | **49** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `industrial-ethernet/chapter07-profinet-io.md` | 12 | 10 | 5 | 9 | 6 | 7 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter08-tsn.md` | 11 | 10 | 4 | 10 | 5 | 7 | 2 | **49** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `industrial-ethernet/chapter09-tsn-scheduling.md` | 15 | 13 | 7 | 10 | 6 | 6 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `industrial-ethernet/chapter10-powerlink.md` | 13 | 12 | 6 | 12 | 7 | 6 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter11-linux-realtime.md` | 14 | 12 | 7 | 10 | 7 | 5 | 2 | **57** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `industrial-ethernet/chapter12-comparison.md` | 13 | 12 | 4 | 10 | 7 | 4 | 1 | **51** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `kernel/chapter01-user-kernel-boundary.md` | 8 | 9 | 6 | 9 | 6 | 4 | 2 | **44** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `kernel/chapter02-printk-dmesg.md` | 10 | 11 | 7 | 11 | 5 | 5 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `kernel/chapter03-ftrace-tracepoints.md` | 10 | 10 | 7 | 9 | 5 | 5 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 51.7점(10편, 합 517점), 범위 44~59점이다. 판정은 우선 조치 5편, 병합 검토 5편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, 오류 확인 5건(industrial-ethernet ch07·ch09·ch10·ch11, kernel ch02) 때문에 5편이 우선 조치로 올라갔다. 오류 확인 5건은 모두 원문 내부 모순·산술 불일치이고, 1차 자료를 열어 확인한 오류는 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다(ch11의 7d14b1b8, ch10의 7b6639ad는 출처 없는 완화이거나 연도 한 건 대조라 검증으로 치지 않았다). P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. ch12의 실명 기업·공장 채택 단정(125~264행)은 P0가 아니라 정책 확인 필요 항목으로 남겼다. Industrial Ethernet 12편을 한 커밋(80cb602e)으로 쓴 이력과 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `industrial-ethernet/chapter06-profinet.md` | 50 | 49 | -1 | 없음 |
| `industrial-ethernet/chapter07-profinet-io.md` | 52 | 51 | -1 | 없음 |
| `industrial-ethernet/chapter08-tsn.md` | 50 | 49 | -1 | 없음 |
| `industrial-ethernet/chapter09-tsn-scheduling.md` | 60 | 59 | -1 | 없음 |
| `industrial-ethernet/chapter10-powerlink.md` | 58 | 58 | 0 | 없음 |
| `industrial-ethernet/chapter11-linux-realtime.md` | 57 | 57 | 0 | 없음 |
| `industrial-ethernet/chapter12-comparison.md` | 52 | 51 | -1 | 없음 |
| `kernel/chapter01-user-kernel-boundary.md` | 44 | 44 | 0 | 없음 |
| `kernel/chapter02-printk-dmesg.md` | 52 | 51 | -1 | 없음 |
| `kernel/chapter03-ftrace-tracepoints.md` | 49 | 48 | -1 | 없음 |

- 추가한 오류 확인(판정 변경): ch09는 1차 평가에서 미검증·보강이었다. 평가자가 uncertainties에 둔 guard band 위치 모순을 글 자신의 전제만으로 성립하는 내부 모순으로 보고 factcheck로 올렸다. 58행 guard band(8,800~10,000ns)는 CDT 뒤에 있고 60행 BE 게이트는 1,000,000ns(다음 사이클 CDT 시작)까지 열려 있는데, 63행은 이 guard band가 BE 프레임의 다음 사이클 CDT 침범을 막는다고 쓴다. 두 번째로 30행은 gPTP·MRP·LLDP를 PCP 4에 두는데 52~60행 GCL은 Q4를 한 번도 열지 않아 103행이 전제한 gPTP 프레임이 나갈 수 없다. 판정은 보강 → 우선 조치.
- 추가한 오류 확인 근거(판정 유지): ch07에 두 건을 더했다. 213행 GSDML 주석 'MinDeviceInterval × 31.25µs = 1 ms minimum cycle'(205행 ET 200SP)과 94행 'ET 200SP … IRT를 켜면 250µs까지'가 같은 기기의 최소 사이클로 충돌한다. 134행 '0xC000~F7FF vendor specific'에 135·136행 표준 index(0xE000~E0FF, 0xE040)가 들어가 127행 '표준 index' 소개와 충돌한다. B 11→10.
- 추가한 오류 확인 근거(판정 유지): kernel ch02 286행 '메시지 안 보임 | console_loglevel < message level'이 96행 '이 미만 level만 console로'와 동시에 참일 수 없다. 58행과 같은 모순 묶음이다.
- 기각한 오류 확인: 없다.
- E 상한 적용(AP-C-24): 제목이 '분석·추적·활용'을 약속하는데 본문이 개념·명령 소개 수준인 4편을 6→5로 내렸다(ch06, ch08, kernel ch02, kernel ch03). 루브릭 E 3~5 구간 규칙이다.
- ch09 F 7→6: 372행 다음 편 부제 '오픈소스 산업 이더넷의 정수'가 chapter10의 현재 제목('POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜')과 다르다. 대상 번호는 맞아 5 이하로는 내리지 않았다.
- ch12 D 11→10: 평가자가 비교하지 않은 chapter08 216~227행 'OPC UA over TSN'이 이 글 183~199행과 같은 결론이다.
- kernel ch03 B: 212~232행 TRACE_EVENT가 '그대로 빌드되지 않는다'는 감점은 1차 자료 없이 쓴 메커니즘 단정이라(AP-C-31) 불확실 목록으로 옮겼다. 점수 10은 13행 약속을 푸는 예가 없다는 근거로 유지했다.
- ch06 B 근거의 'AP-C-24에 따라 B ≤ 13'은 루브릭 본문에 없는 상한이라 근거에서 뺐다(점수 영향 없음).
- merge_note 보완: ch11과 ch09는 평가자가 병합 대상을 비웠거나 보강으로 적어, 점수 구간이 병합 검토인 데 맞춰 '병합 대상 없음 + 다음 조치 보강'과 이유를 채웠다.
- 줄 번호 보정(점수 영향 없음): ch06 D(ch07 25~29·198~218·213행), ch07 D(ch06 81~91행), ch08(125·153·121행, ch11 252~258행), ch09 D(ch08 107행), ch10 D(ch02 177~183행), ch11 D(part5-07 232~248행, part7-13 95~104행), ch12 D(ch10 295~301행), kernel ch01 D(ch05 122~125행 내용 정정, ch07 131~139·199~210행, dwarf-elf ch06 165~181행), kernel ch02 D(part7-06 129~145행), kernel ch03 D(ch02 234~244행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `industrial-ethernet/chapter06-profinet.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- chapter06-profinet.md: 80cb602e(최초 작성), 03cf0d79(TikZ 전환), ac24bb76(제목 변경), d0b645f6(audit-suspect-claims 도입 커밋에서 대우조선 사례를 '공개 자료 한정' 문구로 일반화한 완화), be973200·0a9dd7bc(메타데이터·slug 고정). PROFINET 사양·IEC 61158/61784-2·GSDML schema·Siemens 매뉴얼과 대조했다는 커밋이 없다. d0b645f6은 출처 없는 완화라 검증으로 치지 않는다. 글 안에서 동시에 참일 수 없는 두 진술은 찾지 못했고, 167행 32 × 31.25 μs = 1 ms 산술은 맞다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 부분은 175~184행 PROFINET CC-C와 EtherCAT 비교 표, 59~61행 스위치 큐 정책(strict priority·WRR)과 hop별 jitter로 RT cycle 하한을 설명한 대목, 164~169행 GSDML 속성 풀이와 MinDeviceInterval 1 ms 환산, 204~222행 오해 다섯 가지다. 반면 25~29행 PROFIBUS 연혁 표, 85~89행 역할 표는 입문 수준이다. 77행 'NP-hard 문제에 가까워', 61행 '~수 μs jitter'는 근거 없는 단정이고, 200행 '공개 자료 한정적이라 spec 카탈로그 확인 권장'은 구체 주장을 완곡 표현으로 대신한 일반론이다. 앵커 part6-09(A 10)보다 비교·해석이 많아 13~19 구간 하단. |
| B | 11 | PROFIBUS 계보(21~33) → CC 3등급(35~49) → RT(51~61) → IRT(63~79) → 역할(81~95) → GSDML(97~171) → EtherCAT 비교(173~186) → 실수(202~222) → 정리(224~233)로 기본 흐름은 완성된다. 42행 CC-B 차이를 '+ diagnostic' 한 칸으로만 적고 본문 설명이 없다. 67~75행 IRT 스케줄 의사코드의 t=0·50·110·200에 단위가 없다. 49행 '빨간 단계'와 74행 'green phase'를 정의하지 않는다. 95행 '주기 PDO'는 EtherCAT·CANopen 용어를 그대로 썼다. 10~15 구간 하단. |
| C | 5 | 실행·관찰 절차가 없다(Wireshark 캡처, TIA Portal 설정 단계, 측정 결과 없음). 101~162행 GSDML은 구조 예시이고 실제 파일·버전 출처가 없다. 61행 'hop마다 ~수 μs jitter', 190행 'PROFINET RT(약 10 ms cycle)', 206행 '4 hop 망에서 worst-case 10 ms가 일반적', 39~43행 '전형적 cycle' 열, 184행 한국 업체 채택은 출처·환경 없는 수치·사실이라 루브릭 3-1에 따라 C ≤ 8이고, 재현 예제가 없어 4~7 구간 중간. |
| D | 9 | 비교한 글: 같은 시리즈 chapter01·02·05·07·12, 다른 시리즈 embedded-serial/chapter09-rs232-rs485.md, can-bus/chapter01-overview.md. (1) 85~89행 역할 표가 ch07 25~29행 표와 같고, 101~167행 GSDML(VendorID 0x002A, DeviceID 0x0301, ET 200SP, DAP_1, MinDeviceInterval 32 = 1 ms)이 ch07 198~218행(213행 같은 환산 주석)과 같다. (2) chapter12 23~32행 비교 표와 107행 'Siemens가 들어와 있으면 PROFINET이 기본'이 이 글 175~186행 결론과 같다. 232행 '한국 공장 gateway 공존'은 ch01 155행, ch12 305행과 같은 문장이다. (3) ch01 91·106행, ch02 194행은 한 줄 요약이라 침범하지 않는다. 고유 역할은 CC/RT/IRT 메커니즘(35~79행)이나 본문 절반 가까이가 ch07·ch12와 반복돼 5~9 구간. |
| E | 5 | 제목 키워드 'RT·IRT 클래스와 실시간 등급'은 35~79행이 다룬다. 그러나 제목이 '분석'을 약속하는데 RT jitter 누적(61행)·IRT 스케줄(67~77행)을 계산이나 근거 없이 단정하는 개념 소개 수준이라 루브릭 E 규칙상 5 이하다. description 'Siemens 표준 산업 이더넷 — RT vs IRT.'는 17행 'Siemens/PI' 설명과 결이 다르고, 본문의 3분의 1(81~171행 역할·GSDML)은 제목·description 범위 밖이다. |
| F | 4 | 235행 '이 글로 시리즈의 1차 분량이 끝납니다. 후속 시리즈에서 EtherNet/IP·POWERLINK·SERCOS III·TSN'은 틀렸다. 같은 디렉터리 seriesOrder 7은 chapter07-profinet-io.md이고 TSN(ch08·09), POWERLINK(ch10)도 같은 시리즈에 있다. 243행 라벨 'Modern Embedded Recipes Part 4.6: IRQ affinity'는 part7-13-irq-affinity.md(seriesOrder 87)로 가 번호가 틀렸다. 다음 글 ch07로 가는 링크도 없다. 239~242행은 라벨과 대상이 맞는다. 다음 편 안내·관련 링크 라벨 오류로 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | 244~245행 PI 홈페이지와 Siemens 매뉴얼 목록 링크는 최상위·목록 수준이라 특정 주장과 연결되지 않는다. PROFINET 사양 버전, IEC 61158/61784-2 번호, GSDML schema 버전(108행 ProfileRevision 1.20, 125행 PNIO_Version V2.31의 근거)이 본문에 없다. 53행 EtherType 0x8892, 57행 PCP=6, 43·79행 31.25 μs에도 출처가 없다. |

uncertainties:
- 218행 'DCP는 IPv4 multicast'는 chapter07 39행 'DCP는 IP 위가 아니라 Ethernet 위, EtherType 0x8892에 frame type 0xFEFE multicast'와 충돌한다. 글 사이 모순이라 오류 확인에 넣지 않았고 PROFINET 사양으로 확인해야 한다.
- 41~43행 CC-A 'Unsynchronized RT', CC-B 'Synchronized RT + PTP' 구분과 '전형적 cycle'(100 ms, 10~100 ms)이 PI conformance class 정의와 맞는지, 45행 CC-C를 'time-aware shaper'(802.1Qbv 용어)로 부른 것이 맞는지 확인하지 않았다.
- 27~29행 PROFIBUS DP 1989, PA 1995, PROFINET 2003은 출처 없는 연도다.
- 65행 'SCALANCE X-200IRT', 214행 'MOXA EDS-G508A'가 PROFINET IRT 인증 스위치인지 확인하지 않았다.
- 184행 'LS ELECTRIC, 두산 일부 / 현대중공업, 협동로봇'은 출처 없는 업체 사례이며 200행 '공개 자료 한정'과 결이 다르다.
- 181~182행 EtherCAT 최소 cycle 12.5 μs, 슬레이브 65535(이론)는 ETG 자료로 확인하지 않았다.
- 61행 RT hop당 '~수 μs'와 206행 '4 hop worst-case 10 ms 일반적', 190행 'RT 약 10 ms cycle'은 규모 차이가 크지만 jitter와 cycle 하한이라 동시에 거짓이라고 단정할 수 없어 보류했다.
- 190행은 '복수 프로토콜 지원 제품'의 예로 PROFINET·EtherNet/IP를 들고 결론은 'PROFINET·EtherCAT 공존'으로 이어져 논리가 맞지 않는다.
- 108행 ProfileRevision 1.20, 125행 PNIO_Version V2.31, 133·146행 주문번호 6ES7155-6AU01-0BN0·6ES7131-6BF00-0CA0가 실제 GSDML·제품과 맞는지 확인하지 않았다.
- 222행 'PI가 PROFINET over TSN profile을 공식 발표'는 출처와 시점이 없다.
- 95행 '주기 PDO'는 PROFINET 용어(IO data/cyclic IO)가 아닐 수 있다.

병합 대상: `src/content/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io.md`. 이 글 Application 모델 절(81~95행)과 GSDML 절(97~171행)이 ch07 21~33행·194~222행과 겹친다. 다만 'PROFINET RT·IRT와 conformance class'는 독립 검색 의도가 있어 글 전체를 합치지 않는다. 다음 조치는 보강이다. 역할 표·GSDML 예제는 ch07로 옮기거나 ch07 링크로 줄이고, 이 글은 CC-A/B/C 정의와 RT·IRT 프레임·스케줄을 1차 자료(PI 사양, IEC 61784-2)와 대조해 차별화한다. ch12 비교 표와 겹치는 175~186행도 줄인다. 235행 끝맺음과 243행 라벨은 ch07을 가리키도록 고친다.

### `industrial-ethernet/chapter07-profinet-io.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 내부 모순(루브릭 3-1). (1) 108행 "두 사이클이 연속으로 빠지면 connection lost로 간주"와 178행 "PROFINET은 3사이클 missed가 곧 fault이므로 cycle ≥ 70ms"는 끊김 판정 사이클 수(2와 3)가 다르다. 178행의 70ms(200ms/3) 계산도 3사이클 전제에 기댄다. (2) 94행 "ET 200SP 기본 사이클은 1ms입니다. IRT를 켜면 250µs까지"와 251행(IRT 없이 1ms가 기본)은 236행 "CC-A·CC-B는 RT만 지원하고 최소 사이클이 보통 4~8ms입니다. CC-C로 올려야 … 1ms·500µs·250µs가 메뉴에 나옵니다"와 동시에 참일 수 없다. (3) 213행 GSDML 주석 "MinDeviceInterval × 31.25µs = 1 ms minimum cycle"(205행 ET 200SP)과 94행 "ET 200SP … IRT를 켜면 250µs까지"가 같은 기기의 최소 사이클에서 충돌한다. (4) 134행 "0xC000~F7FF vendor specific" 범위에 135·136행 표준 index(0xE000~E0FF ExpectedSubmodule, 0xE040 Diagnostic data)가 들어가 있고, 127행은 이 표를 "PROFINET이 정의한 표준 index"라고 소개한다. git log(09a00a29 stub 생성, 400892d7 린터, 80cb602e 시리즈 12편 일괄 작성, 33c20b23 다이어그램, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 내용은 '자주 하는 실수' 다섯 사례(226~244행: VLAN 0 priority tag, GSDML 중복 import, CC-C 메뉴, Shared Device 슬롯 owner, 비-MRP 노드의 MAC 테이블 flush), DCP Wireshark 출력 예(49~60행), 17행의 발견→이름→연결→사이클 흐름이다. 역할 표(25~29행), CR 표(70~74행), I&M index 표(129~136행), 벤더 표(184~190행)는 입문 자료에 흔한 목록이고 출처가 없다. 228·236·240행은 '확인합니다'로 끝나 판단 기준이 구체적이지 않다. 앵커 part1-04(A=10)보다 실패 사례는 구체적이지만 13점 이상의 독자 분석은 아니다. |
| B | 10 | 흐름(21~255행)은 역할→DCP→AR/CR→IOCR→RecordData→Alarm→MRP→stack vendor→GSDML→실수→정리 순으로 빠짐이 없다. 그러나 끊김 판정(108·178행), RT 1ms 가능 여부(94·251행과 236행), ET 200SP 최소 사이클(213·94행), index 분류(134·135~136행)가 글 안에서 맞지 않아 '몇 사이클이 빠지면 끊기는가', 'RT로 1ms가 되는가'에 독자가 답을 얻지 못한다. AR 절(76~80행)은 RPC 단계 설명을 다이어그램에 맡기고 본문은 두 문장뿐이다. |
| C | 5 | Wireshark DCP 출력(49~60행)과 GSDML XML(198~218행)은 있지만 캡처 환경, 펌웨어, TIA Portal 버전이 없다. 200행 VendorID 0x002A/DeviceID 0x0301도 출처가 없다. 94행 250µs·125µs, 178행 200ms·70ms, 236행 4~8ms는 출처·환경 없는 수치라 C ≤ 8. 재현 절차와 기대 관찰이 없고, 실수 절은 증상→원인 서술만 있다. 213행 주석 수치는 94행과 모순된다. 앵커 part1-04(C=6)보다 낮은 5. |
| D | 9 | 비교한 글: 같은 시리즈 chapter06-profinet.md(6), chapter08-tsn.md(8), chapter12-comparison.md(12). 다른 시리즈 can-bus/chapter01-overview.md, can-bus/chapter12-debugging.md, embedded-serial/chapter09-rs232-rs485.md는 지나가는 언급이다. 겹침: 21~31행 역할 표가 ch06 81~91행 표와 거의 같고, 194~222행 GSDML 절(213행 MinDeviceInterval=32 → 1ms)은 ch06 97~171행(167행 같은 계산)과 반복된다. 234~236행 'CC-C로 올려야 1ms'는 ch06 204~206행과 같은 내용이다. 이 글에만 있는 부분은 DCP·AR/CR·IOCR APDU·RecordData index·Alarm·MRP(35~178행)이다. MRP는 ch08 155행, ch09 30행에 한 줄씩 나올 뿐이다. 5~9 구간 상단. |
| E | 6 | description(5행)의 AR·CR·DCP·alarm·MRP는 모두 절이 있다(35·64·140·160행). 제목의 'Controller·Device·Supervisor 역할 추적' 가운데 Supervisor는 역할 표(29행)와 31행 한 문장뿐이다. '추적'에 해당하는 것은 Wireshark 조각 하나(49~60행)라 제목의 약속은 일부만 지켰다. |
| F | 7 | 257행 다음 편 'Ch 8: TSN'은 seriesOrder 8 chapter08-tsn.md(제목 'TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요')와 맞는다. 관련 항목 261행(chapter06), 262행(chapter08), 263행(chapter05-ethercat-master)의 대상 제목을 열어 라벨과 맞는 것을 확인했다. 19행이 이전 장과의 관계를 밝히고 17행 흐름이 절 순서와 대응한다. 263행 Ch 5는 내용상 관련이 약하고 audit:reading·폰 폭은 확인하지 않아 7. |
| G | 2 | 본문 출처는 264행 IEC 61158-6-10 링크와 162행 IEC 62439-2 명칭뿐이다. 둘 다 판과 절 번호가 없고 본문 주장(86·146행 FrameID, 129~136행 index, 178행 MRP 200ms)에 연결되지 않는다. TIA Portal, ET 200SP 펌웨어, Wireshark 버전 표기도 없다. 앵커 part7-05(G=2)와 같은 수준. |

uncertainties:
- 146~147행 Alarm FrameID 0xC008/0xC009는 86행이 RT class 1 cyclic 범위로 적은 0xC000~0xFAFF 안에 들어간다. 기억으로는 alarm FrameID가 0xFC01/0xFE01이지만 IEC 61158-6-10으로 확인하지 않았다.
- 39행 'DCP는 Ethernet 위'와 ch06 218행 'DCP는 IPv4 multicast'가 서로 다르다. 다른 글과의 모순이라 1차 자료로 정한다.
- 76행 'UDP 49152 포트로 DCE-RPC', 39행 frame type 0xFEFE, 129~136행 index 값은 1차 자료와 대조하지 않았다.
- 178행 MRP 복구 200ms '표준', 236행 CC-A·CC-B 최소 사이클 4~8ms는 출처가 없다.
- 199행 GSDML 루트 요소 DeviceProfile(ch06 103행은 ISO15745Profile)과 200행 VendorID 0x002A가 Siemens 값인지 확인하지 않았다.
- 186~190행 벤더 표의 제품 특성(TI AM6x 'Linux + Cortex-R5F 듀얼' 등)은 확인하지 않았다.
- 264행 IEC webstore publication/61107이 61158-6-10을 가리키는지 열어 보지 않았다.

병합 대상: 판정은 오류 확인에 따른 우선 조치다. 점수 구간(병합 검토) 기준 후보는 `chapter06-profinet.md`(역할 표, GSDML, CC-C 1ms 항목이 겹침). 다음 조치는 보강이다. DCP·AR/CR·IOCR·RecordData·Alarm·MRP는 ch06에 없는 독립 주제라, 병합보다 108/178행, 94/236행, 213/94행, 134/136행 모순을 1차 자료(IEC 61158-6-10, IEC 62439-2, ET 200SP 매뉴얼·GSDML)로 바로잡고 ch06과 겹치는 역할 표·GSDML 절을 ch06 링크로 줄이는 편이 낫다.

### `industrial-ethernet/chapter08-tsn.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- chapter08-tsn.md는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경·날짜 정규화) 등 메타·구조 커밋뿐이고 IEEE 802.1 표준·802.3br·NIC 데이터시트와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 원문 안에서 동시에 참일 수 없는 두 기술 진술도 없다. 86~90행 게이트 그림과 96~102행 GCL 비트마스크가 맞고, 107행 1538B≈12µs(1Gbps에서 12.3µs)도 산술상 맞으며, 125행 '최대 1µs 이내(64B fragment 시간)'는 64B≈0.5µs이므로 1µs 상한과 모순되지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 35~46행 표준 매핑 표와 50~196행 표준별 설명은 TSN 입문 자료의 표준 목록 순서를 따른다. 이 글만의 것은 86~102행 Qbv 게이트 그림과 그에 맞춘 GCL 예(5개 엔트리), 107행 '1538바이트 프레임이 1Gbps에서 약 12µs'로 Qbu 필요성을 잇는 흐름, 231~245행 실수 사례(I210에 Qbv 설정, Qbv만 켜고 jitter, FRER history window)다. 192~194행 설정 모델 '사용처', 227행 '공장 전체의 통합 계층으로 자리잡고 있습니다'는 출처 없는 단정이다. 46행 Qbz는 '(less relevant for industrial)'뿐이다. 앵커 part1-04(10)와 같은 개념 정리 수준이나 Qbv→Qbu 연결이 조금 낫다. |
| B | 10 | 도입(15~31행) → 매핑 표(35~46행) → AS·Qbv·Qbu·Qci·CB·Qcc 절(50~196행) → 하드웨어(198~214행) → OPC UA(216~227행) → 실수(229~245행) → 정리(247~256행)로 기본 흐름은 있다. 45행 Qch(CQF)는 표 한 칸뿐이라 5행 description '9개 표준을 한 자리에'와 어긋난다. Qci(133~137행)는 gate/meter 파라미터가 없고, FRER history window 산정은 245행 한 문장뿐이다. 10~15 구간 하단. |
| C | 4 | 실행 가능한 명령이 없다. 212행은 'Linux 6+에서 tc-taprio로 Qbv를 설정할 수 있어'라고만 하고 명령이 없다. 94~103행 GCL과 163~186행 YANG은 '(simplified)' 의사 표기다. 202~210행 제품 표의 지원 표준·가격($20·$15·$300·$500), 125행 '최대 1µs', 37행 'sub-µs'는 출처·환경 없는 수치라 C ≤ 8이고, 관찰 결과·검증 절차가 없어 4~7 구간 하단. 앵커 part6-09(4)와 같은 수준. |
| D | 10 | 다음 편 chapter09-tsn-scheduling.md와 역할은 구별된다(이 글 19행 '각 표준이 무엇을 책임지는지', ch09 17행 '실제로 스케줄을 짜는 작업'). 그러나 163~186행 YANG 예와 ch09 175~200행이 stream-id 접두 00-1B-1B, MAC 01-80-C2-00-00-0E, PCP 7, VLAN 100, interval 1/1000, max-frame-size 256까지 같고, 52~67행 gPTP 설명은 ch09 101~125행과 겹친다. 이전 편 chapter07은 PROFINET IO 모델이라 겹치지 않는다. chapter02 76~90행 PTP 표는 Delay_Req 기반이라 이 글의 Pdelay 설명과 구별된다. chapter11 252~258행(I210/I225/LS1028A)이 이 글 204~214·231~233행과 같고, chapter12 183행 이후 OPC UA over TSN 절이 216~227행과 겹친다. chapter01 111·154행은 한 줄 소개다. 다른 시리즈: 802.1Qbv·gPTP·802.1AS grep 결과 industrial-ethernet 밖에는 draft인 avionics/digital-avionics-handbook/chapter05-buses.md뿐이다. |
| E | 5 | 제목(2행) 'TSN 표준 분석 — … 개요'와 description(5행) '9개 표준을 한 자리에'가 33~196행과 같은 주제를 향한다. 그러나 '분석'을 약속하는데 본문은 표준별 개념 소개 수준이고(루브릭 E 3~5), description의 9개 중 Qch(45행)·Qbz(46행)는 표 한 칸뿐이다. 3~5 구간 상단. |
| F | 7 | 258행 다음 편 안내 'Ch 9: TSN 스케줄링 — Qbv·Qbu·gPTP 깊이 있는 설정'은 seriesOrder 9 chapter09-tsn-scheduling.md와 대상이 맞다. 관련 항목 262행(ch07), 263행(ch09), 264행(ch02) 라벨이 대상 제목·내용과 맞다. 19행이 이 장과 Ch9의 역할 분담을 설명하는 글 고유 안내이고, 그림 3개(123·139·149행)가 Qbu·Qci·FRER 절을 받친다. 258행은 링크 없는 텍스트이고 52행 gPTP 설명에서 ch02 PTP 절을 전제로 가리키지 않는다. |
| G | 2 | 본문 출처는 265행 IEEE 802.1 TSN Task Group 링크 하나다. 38행 802.1AS-2020, 135행 802.1CB-2018처럼 판 표기가 일부 있으나 153행 R-TAG EtherType 0xF1C1, 121행 fragment 크기, 204~210행 제품별 지원 표준에 1차 출처·데이터시트가 없다. 200행 '2024~2026년 기준'은 날짜 앵커일 뿐이다. |

uncertainties:
- 17행 '약 9개의 부속 표준'과 35~46행 표 10행(802.3br·802.1AS-2020 포함)이 맞지 않는다. 산문 개수 표기라 오류 확인에 넣지 않았다.
- 125행 '최대 1µs 이내(64B fragment 시간)'와 ch09 63행 '64B(약 0.5µs)'의 수치 차이는 802.3br 최악 비선점 구간으로 확인해야 한다.
- 121행 '최소 64바이트(+ 4 mCRC) 단위'의 mCRC 포함 여부를 확인하지 않았다.
- 153행 R-TAG EtherType 0xF1C1, 16bit sequence는 802.1CB로 확인하지 않았다.
- 166행 stream-id 주석 'MAC + VLAN'이 802.1Qcc stream ID 구성(MAC + 16bit unique ID)과 맞는지 확인하지 않았다.
- 171행 destination MAC 01-80-C2-00-00-0E는 link-local 예약 주소로 기억되며 stream 목적지 예로 적절한지 확인하지 않았다.
- 192~194행 설정 모델별 사용처 단정은 출처가 없다.
- 204~210행 제품별 TSN 지원 표준(I225/I226의 Qbu, Cisco IE 4000의 Qci, AM6442 범위)과 가격은 데이터시트로 확인하지 않았다.
- 212행 'Linux 6+'에서 taprio 사용 가능이 taprio 도입 커널 버전과 맞는지 확인하지 않았다.
- 237행 'priority1을 명시적으로 낮춰'는 BMCA에서 낮은 값이 우선이라 의도가 반대로 읽힐 수 있다.
- 218행 OPC UA FLC Companion Spec 명칭·범위를 확인하지 않았다.

병합 대상: `src/content/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling.md`(이 글 163~186행 YANG ↔ ch09 175~200행, 52~67행 gPTP ↔ ch09 101~125행). 'TSN 표준 개요'는 ch09의 스케줄 설계와 다른 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. YANG 예는 ch09로 넘기고 링크로 대체, 하드웨어 표(202~214행)는 ch11 252~258행과 정리, OPC UA 절(216~227행)은 ch12 183행 이후와 역할을 나누고, 남는 자리에 Qch·Qci 파라미터와 표준별 1차 출처(판·절)를 붙인다. 제목의 '분석'은 본문 수준에 맞게 조정하거나 본문에 분석을 더한다.

### `industrial-ethernet/chapter09-tsn-scheduling.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(0a9dd7bc, be973200, ac24bb76, 49f2a443, 80cb602e, 400892d7, 09a00a29)에는 1차 자료 대조 커밋이 없고, 오류 확인은 글 안의 모순으로 정했다. (1) 63행은 58행 guard band(offset 8,800~10,000ns)가 '큰 BE 프레임이 다음 사이클의 CDT 슬롯을 침범'하지 못하게 한다고 쓰고, 63행·329행은 슬롯 경계에서 송신 중인 BE 프레임이 다음 슬롯을 침범한다는 것을 전제로 둔다. 그런데 60행 BE 게이트(00001111)는 750,000ns부터 1,000,000ns, 곧 다음 사이클 CDT 슬롯(54행 offset 0)이 시작하는 순간까지 열려 있고, 58행 guard band 앞에는 CDT(Q7)만 있어 막을 BE 프레임이 없다. (2) 30행은 gPTP·MRP·LLDP를 PCP 4에 두고, 52~60행 GCL은 Q7=CDT(PCP 7), Q6·Q5=Class A·B(PCP 6·5)로 대응시키면서 게이트 비트 10000000/00000000/01100000/00001111이 Q4를 한 번도 열지 않아, 103행이 GCL 동작의 전제로 둔 gPTP 프레임이 이 포트로 나갈 수 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 45행 256B 송신 시간 계산을 54~57행 2,200ns 슬롯과 63행 8.8µs 합계로 잇는다. 99행 base-time 일치 지적, 154행 ptp4l→phc2sys→taprio 사슬, 233~259행 MILP 정식화, 267~296행 list scheduling 의사코드와 2-tier 구성은 이 글에만 있다. 다만 주장마다 출처가 없다. 23행 '산업 환경의 표준 분류'는 어느 profile인지 밝히지 않고, 300~321행 도구 표와 Marvell CLI는 근거가 없다. 핵심 예제인 GCL(52~60행)에 내부 모순이 있어 앵커 part12-10(18점)보다 낮다. |
| B | 13 | traffic class(21행) → GCL(36행) → taprio(67행) → gPTP(101행) → CNC YANG(167행) → ILP(227행) → 휴리스틱(263행) → 도구(298행) → 실수(325행) → 정리(361행)로 완결된다. 34행은 Class A·B를 CBS로 처리한다고 하지만 CBS 설정(idleslope 등)이 없고, 제목의 Qbu는 설정 절이 없다. 내부 모순 둘(58·60·63행, 30·59~60행)과 열린 불확실(86행 txtime-delay, 355행)이 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 76~87행 taprio 명령과 92~97행 필드 설명, 134~146행 ptp4l gPTP 설정, 151행 phc2sys, 340~349행 ethtool -T 출력은 재현할 수 있다. 그러나 커널·linuxptp·iproute2 버전과 NIC 펌웨어 같은 실행 환경과 측정 결과가 없다. 158~163행 동기 정확도 표(±100ns, ±500ns, ±10ns), 259행 '수십 초 / 수 시간', 333행 hop당 1µs는 출처·환경 없는 수치라 C ≤ 8. 핵심 예제 GCL이 글 자신의 guard band 설명과 맞지 않아 1점 더 뺐다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter08-tsn.md(8), chapter10-powerlink.md(10), chapter02-realtime-requirements.md, chapter11-linux-realtime.md, 다른 시리즈 digital-avionics-handbook/chapter05-buses.md(draft, 333행 한 줄). 175~198행 talker YANG은 ch08 163~185행과 MAC 01:80:c2:00:00:0e, PCP 7, VLAN 100, interval 1/1000, max-frame-size 256, status 필드까지 같다. 105~109행 gPTP 3단계는 ch08 56~67행을 되풀이한다. 63·329행 guard band 12.3µs는 ch08 107·241행과 같다. 69행 'I225 + Linux 6+ taprio'는 ch08 212행과 같다. 351행 I210/I225는 ch08 233행, ch11 253행과 겹친다. 129행 ptp4l 실행은 ch02 135~145행과 겹치지만 이 글은 gPTP 설정 파일을 다룬다. GCL 산술, taprio 옵션, ILP·list scheduling은 다른 글에 없다. ch10과는 겹치지 않는다. |
| E | 6 | 제목은 'Qbv·Qbu·gPTP 동기화 분석'을 약속한다. Qbv(36~99행)와 gPTP(101~165행)는 다룬다. Qbu는 34행 한 구절과 63·329행 '64B(약 0.5µs)'로만 나오고 설정·동작 설명이 없어 제목 키워드 하나가 부분 미이행이다. description의 GCL 설계, ILP, 실제 도구, CNC YANG은 본문 절과 대응한다. |
| F | 6 | 372행 다음 편 안내는 seriesOrder 10 chapter10-powerlink.md를 가리켜 번호와 대상은 맞다. 다만 부제 '오픈소스 산업 이더넷의 정수'는 ac24bb76 이후 현재 제목 'POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜'과 다르다. 376행(chapter08), 377행(chapter10), 378행(chapter11) 관련 항목은 번호·주제가 맞다. 17행이 이전 장을 전제로 밝히고 19행이 수동 설계와 CNC 합성 두 갈래를 안내한다. |
| G | 2 | 본문 출처는 379~380행 IEEE 802.1Qbv-2015, 802.1AS-2020 링크 두 개뿐이고 어느 주장에도 연결되지 않는다. 69행 'Linux 6+' 말고는 커널·linuxptp·iproute2 버전이 없다. 85~86행 taprio 옵션과 134~146행 ptp4l 설정 키에 man page나 kernel Documentation 근거가 없다. 158~163행 정확도 표와 300~307행 도구 표에도 출처가 없다. |

uncertainties:
- 85~86행: taprio의 txtime-delay는 txtime-assist 모드(flags 0x1)에서만 허용되는 것으로 기억한다. flags 0x2(full offload)와 함께 주면 거부될 수 있다. net/sched/sch_taprio.c로 확인하지 않았다.
- 73~74·87행: BASE를 date +%s(UTC epoch)로 계산하고 clockid는 CLOCK_TAI로 준다. 99행 '정확한 1초 경계' 설명과 기준 시계가 다르다. 154행은 taprio가 'system 시계 기반'이라 하지만 87행은 CLOCK_TAI, 85행은 full offload다.
- 353~355행: 소제목은 '동작 안 함'인데 본문은 '뒤로 미뤄 시작'과 'immediate error'를 함께 쓴다. 커널 동작으로 확인해야 한다.
- 28~29행: Class A 75%·Class B 25%를 대역 배분처럼 쓴다. 802.1Q/802.1BA의 SR class 예약 상한(75%)과 다를 수 있다.
- 125·351행: I225 'PHY timestamp', I210 '부분 지원'은 ch08 233행 'I210은 802.1AS만', ch11 253행 'PTP + Qav'와 표현이 다르다. 인텔 데이터시트로 확인하지 않았다.
- 158~163행 정확도 수치, 259행 CPLEX·Gurobi 소요 시간, 333행 hop당 1µs는 출처와 환경이 없다.
- 300~321행: Cisco CCC의 CNC 기능, Marvell TSN CLI 문법, NXP TSN-Configurator, iCNet의 실재를 확인하지 않았다. hallucination 후보다.
- 19행 '4~8 노드'와 169행 '10대 미만'은 수동 설계 한계를 다르게 적는다(산문 수치 차이).
- 379~380행 IEEE 표준 페이지 URL(6068, 7121)이 해당 표준을 가리키는지 열어 보지 않았다.
- 오류 확인 (2)는 52~60행 표의 Q7=PCP 7, Q6·Q5=PCP 6·5 대응을 연장한 판단이다. 76~78행 taprio 예처럼 map으로 PCP를 다른 큐에 모으면 성립하지 않으므로, 수정할 때 PCP→큐 매핑을 명시해야 한다.

병합 대상: 병합 대상 없음. ch08과 YANG 예(ch09 175~198행 / ch08 163~185행)가 겹치지만 GCL 산술과 taprio·ILP·list scheduling은 이 글에만 있어 역할이 다르다. 판정은 우선 조치이고, 다음 조치는 보강이다. 먼저 오류 확인 두 건을 고친다(guard band를 BE 구간 뒤, 다음 사이클 CDT 앞으로 옮기거나 Qbu 전제를 명시하고, Q4 network control 게이트를 연다). 그 뒤 Qbu 절, CBS 설정, 출처와 버전을 보강한다.

### `industrial-ethernet/chapter10-powerlink.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 두 위치). 126행 "각 CN에 1~240 사이의 NodeID를 할당합니다. NodeID 240(F0)이 MN입니다"는 한 문장 안에서 CN 범위 1~240과 MN=240이 겹친다. 42행 "CN … 최대 240대"도 MN이 240을 쓰면(126·198행 'MN node F0') 성립할 수 없다(CN은 최대 239대). git log: 80cb602e 작성, 7b6639ad는 'EtherCAT보다 5년 먼저'→2년 연도 한 건만 Beckhoff 보도자료와 대조했고, 슬롯 타이밍·message type·openSAFETY 필드·openPOWERLINK API를 1차 자료와 대조한 커밋은 없다(49f2a443·ac24bb76·be973200·0a9dd7bc는 형식 변경).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 100 Mbps 최소 프레임 6.7 µs로 32노드 isochronous 구간 ~442 µs를 계산한 부분(88~98행, 64×6.7+2×6.7로 산술은 맞음)과 노드 수·사이클 trade-off 결론(98행), multiplexed slot·PRC 개선책(102~104행), 수신 측 black channel 검증 순서 의사코드(246~266행), '자주 하는 실수' 다섯 개(305~332행)다. MN/CN·프레임 표(39~72행)는 EPSG 개요 수준이다. 15행 '유일한 옵션', 23행 '유일한 특징', 343행 '유일한 조합'은 근거 없는 단정이고, 15·343행 'EtherCAT급 사이클'은 같은 글 27·30행 표(EtherCAT 50µs~, POWERLINK 200µs~)와도 어긋나는 과장이다. 106행 '200µs + 32 CN 보장', 155행 'sub-µs'도 출처가 없다. 앵커 part1-04(10)보다 계산·검증 순서가 구체적이라 13. |
| B | 12 | 왜 POWERLINK인가(21행) → MN/CN(35행) → 사이클(48행) → 타이밍 계산(86행) → 프레임(108행) → openPOWERLINK·openCONFIGURATOR(130·180행) → OpenSAFETY(212행) → 같은 케이블 예(270~287행) → 표준 매핑(291행) → 실수(305행) → 정리(334~343행)로 기본 흐름은 완성됐다. 159~176행 openPOWERLINK API, 140행 cmake 옵션, 185행 CLI 인자, 235~242행 safety 필드가 미확인이라 AP-C-24에 따라 13 이하이고, 42·126행 내부 모순이 있어 12. |
| C | 6 | clone·cmake 명령(134~142행), NIC 설정(311~314행), PDO 매핑 예(198~208행)는 있으나 openPOWERLINK 버전·커널·NIC 같은 실행 환경과 예상 결과가 없다. 88~98행은 최소 프레임 크기에서 유도한 산술뿐이고, 27~31행 비교표 사이클 값, 106행 '200µs + 32 CN', 155행 'sub-µs', 307행 'jitter 100µs', 328행 '200µs → 400µs'는 출처·측정 환경 없는 수치라 C ≤ 8. 실패 사례(305~332행)도 관찰 방법·전후 결과가 없어 6. |
| D | 12 | 비교한 글: 인접 chapter09-tsn-scheduling.md(주제 겹침 없음), chapter11-linux-realtime.md(17·364행에서 openPOWERLINK·B&R APROL 이름만 언급). chapter02-realtime-requirements.md 177~183행이 SoC·PReq·PRes·Async 사이클을 SVG와 함께 요약해 이 글 48~82행과 겹치고, chapter01-overview.md 85행도 isochronous+async 구분을 반복한다. chapter12-comparison.md 33·90행 openSAFETY SIL 3 행이 이 글 291~303행 매핑 표·340행과 겹친다. 다른 시리즈: src/content/blog 전체 grep에서 industrial-ethernet 밖에 POWERLINK·openSAFETY를 다룬 글이 없다. 겹침은 요약 수준이고 이 글이 시리즈 유일한 POWERLINK 본문이다. |
| E | 7 | 제목 'POWERLINK과 OpenSAFETY 분석'과 description의 'slot polling으로 1ms 결정성'은 86~106행(타이밍), 212~303행(OpenSAFETY)이 이행한다. 부제 '산업 안전 통신 프로토콜'은 POWERLINK 부분(21~210행)이 안전이 아니라 결정성 이야기라 범위가 섞이고, 15·343행 '유일한' 단정이 있어 9 이상은 아니다. |
| F | 6 | 345행 다음 편 안내 'Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT으로 마스터 만들기'는 seriesOrder 11 chapter11-linux-realtime.md(제목 '리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영')와 내용이 맞는다. 349~351행 관련 링크 라벨도 대상 chapter09·chapter11·chapter03과 맞다. 전제 지식 안내가 없고 사이클·프레임·black channel·실용 예 그림이 ```text ASCII 블록(52~62, 112~124, 218~229, 274~285행)이라 모바일 가독성이 떨어진다. |
| G | 2 | 본문 출처는 135행 openPOWERLINK GitHub URL과 352~353행 EPSG 홈페이지·IEC webstore 링크뿐이다. 118~123행 message type 값, 126행 NodeID 범위, 235~242행 safety 필드가 어느 사양 절에서 왔는지 연결이 없고 openPOWERLINK 버전·EPSG DS 301 판·IEC 61784-3 파트 번호가 없다. 19·291행 'EN 50325-5'도 출처가 없다. |

uncertainties:
- 42행 'CN 최대 240대'·126행 NodeID 범위는 EPSG DS 301로 CN NodeID 범위(1~239로 알려짐)를 확인해 고쳐야 한다. chapter12-comparison.md의 노드 수 표기도 같은 확인이 필요하다.
- 110행 EtherType 0x88AB와 118~123행 message type 값(SoC 0x01, PReq 0x03, PRes 0x04, SoA 0x05, ASnd 0x06)은 EPSG DS 301과 대조하지 않았다.
- 161~175행 oplk_readPdo/oplk_writePdo와 178행 'PRes 송신 직전' 호출 시점, 140행 cmake 옵션, 185행 openconfigurator-cli 인자가 upstream에 있는지 확인하지 않았다.
- 132행 'LGPL/BSD', 'EPSG가 직접 유지'가 openPOWERLINK 실제 라이선스·관리 주체와 맞는지 확인하지 않았다.
- 149·153·155행 edrv NIC 목록, 'PRU/ENET', Zynq 설계와 PRU를 함께 쓴 155행 설명을 확인하지 않았다.
- 205~208행 TPDO 0x1800/RPDO 0x1400을 매핑 대상처럼 적었는데 CANopen 계열에서 매핑 객체는 0x1A00/0x1600으로 알려져 있다. 사양 대조가 필요하다.
- 235~242행 openSAFETY 필드 길이와 244행 CRC 설명이 openSAFETY 프레임(두 sub-frame 각각 CRC) 구조와 맞는지 확인하지 않았다. 242행 'CRC8 / CRC16'과 244행 'CRC16(또는 CRC32)' 표기가 다르다.
- 19·291행 'EN 50325-5'가 openSAFETY 표준 번호인지 확인하지 않았다(IEC 61784-3-13으로 알려짐).
- 295~301행 표 머리 'OpenSAFETY profile name' 아래에 FSoE·PROFIsafe를 넣어 다른 safety 프로토콜을 openSAFETY 프로파일처럼 보이게 한다. 293행 'OpenSAFETY가 다른 산업 이더넷 위에도 올라갑니다'와 함께 EtherCAT·Sercos 매핑 근거 확인이 필요하다.
- 44행 '표준 hub·스위치 어느 것에서도 결정성 보장'은 스위치 지연·jitter 조건이 빠졌을 수 있다.
- 312~313행 txqueuelen 0, ethtool ufo off 권고는 출처·커널 버전이 없다.
- 27~31행 비교표 사이클 값과 106행 '200µs+32 CN'은 출처가 없다. chapter01-overview.md 108행은 POWERLINK 사이클을 100 μs로 적어 30행 '200µs~'와 다르다(다른 글과의 모순, 1차 자료로 결정).

병합 대상: 병합 대상 없음. 시리즈 유일한 POWERLINK·openSAFETY 본문이라 점수 구간(병합 검토)과 별개로 다음 조치는 보강이다. 판정은 오류 확인에 따른 우선 조치이며, 42·126행 NodeID 범위를 EPSG DS 301로 먼저 고친다.

### `industrial-ethernet/chapter11-linux-realtime.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 153행 주석 "RT 코어 (cpu 2)에 200,000 사이클, 250µs 간격으로"와 154행 명령 `-i 250 -n -D 1h`는 함께 참일 수 없다. 1시간 ÷ 250µs = 14,400,000 사이클이고 160행 예시 출력도 `C:14400000`이다(200,000 사이클이면 50초). git log에서 사실 대조에 가장 가까운 커밋 7d14b1b8 "Fact-check CCA and PREEMPT_RT guidance"는 본문에 1차 출처 이름이 없고, diff도 49~51행 한 단락(PREEMPT_RT 설명 완화, '2026년 현재' 앵커 제거)만 바꿨다. 오류가 없었어도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | vanilla(37~45행, Max 3421) → PREEMPT_RT(81~90행, Max 87) → isolation(159~165행, Max 18)으로 cyclictest 결과를 단계마다 잇고, grub cmdline 한 줄(105~107행)과 옵션 해설(112~116행), NIC 튜닝 묶음(185~247행), ethercat.conf(290~295행), softPLC 표(360~366행)가 있다. 330행 `ecrt_master_slave_config(..., 0, 1, 0x00000002, 0x07d83052)`는 311행 슬레이브 1(EL2008)과 맞물려 구체적이다. 다만 cyclictest 수치 셋은 출처·하드웨어 없는 '전형적 결과'(157행)이고, 25~33행·96~100행 표는 PREEMPT_RT 입문 자료에 흔한 목록이며, 404행 '거의 항상' 같은 근거 없는 단정이 있다. 13~19 구간 아래쪽. |
| B | 12 | 19행의 4단계 예고(PREEMPT_RT → CPU isolation → NIC → IgH)가 47·92·181·271행 H2 순서대로 이어진다. 빈 곳: 331행 `// ... PDO mapping ...`으로 핵심 생략, 338행 `running` 선언·종료 처리 없음, 63행이 EVL을 추천하지만 설정 절차 없음, 413행 'I225 LaunchTime TSN 지원'은 255행 한 문단과 392행뿐이고 taprio/etf 명령이 없다. 293행 igb/I225, 315행 `ec_master_open`, 242행 `napi_busy_read` 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 명령은 재현 가능하게 적혀 있다(105~107행 grub, 152~155행·171~177행 cyclictest+hackbench, 213~236행 ethtool, 275~286행 IgH 빌드). 그러나 40·85·160행 Max 3421/87/18µs와 179행 '50µs 이하면 production-ready'는 CPU·보드·커널 config 없는 구체 수치라 C ≤ 8. 내부 불일치(153행 '200,000 사이클' vs 154행 `-D 1h`, 412행 '1시간 이상 hackbench 부하 중' vs 176행 `-D 30m`)로 1점 더 낮췄다. 합격·실패 관찰 표는 없다. |
| D | 10 | 비교한 글: 인접 chapter10-powerlink.md(겹침 없음)·chapter12-comparison.md(역할 다름), 같은 시리즈 chapter05-ethercat-master.md, 다른 시리즈 rtos/practical-internals/part5-07-preempt-rt-linux.md, modern-recipes/part7-13-irq-affinity.md. (1) 317~351행 IgH 루프가 ch05 225~245행과 같은 ecrt_request_master → create_domain → slave_config → receive/process/queue/send 뼈대다(product code만 다름). (2) 47~64행 mainline·Xenomai 4/EVL 선택과 96~146행 isolcpus·nohz_full·rcu_nocbs·chrt·mlockall이 part5-07 24~31행, 122~171행, 232~248행과 겹친다. (3) 189~207행 smp_affinity 설정이 part7-13 95~104행과 겹친다. NIC offload·ring·coalescing(209~247행), I210/I225·LS1028A(251~269행), ethercat.conf(290~295행), softPLC(356~368행)는 이 글에만 있다. |
| E | 7 | 제목 'PREEMPT_RT·EtherCAT Master 운영'은 47~90행·271~354행에서, description의 'PREEMPT_RT mainline·CPU isolation·NIC tuning·IgH'는 각 H2에서 다룬다. 그러나 description '굴리는 모든 단계'는 과장이다(331행 PDO mapping 생략, DC 동기화 없음). 약속하지 않은 softPLC 절(356~368행)도 있다. |
| F | 5 | 417행 다음 편 'Ch 12: 비교 분석 — 프로토콜 선택 가이드'는 seriesOrder 12 chapter12-comparison.md와 맞는다. 421행(ch05), 422행, 423행(part5-07) 라벨도 맞다. 하지만 424행 'Modern Embedded Recipes Part 4-06: IRQ affinity tuning'은 part7-13-irq-affinity.md(seriesOrder 87)로 가고, 실제 part4-06은 part4-06-systick-timer.md다. 틀린 라벨 규칙으로 F ≤ 5. |
| G | 2 | 본문 버전 표기는 38행 'vanilla 6.6', 51·53행 'Linux 6.12 LTS', 83행 `6.12.0-rt`다. 출처는 425~426행 IgH GitLab·PREEMPT_RT wiki 링크 둘뿐이고 본문 주장과 연결되지 않는다. IgH 태그, ethtool·커널 문서, 측정 하드웨어가 없다. |

uncertainties:
- 282·293행: `igb`를 'Intel I210/I225 전용'이라 적었으나 I225는 리눅스에서 igc 드라이버를 쓰는 것으로 기억한다. IgH 소스로 확인하지 않았다.
- 315행 산문은 `ec_master_open` API라고 하지만 317~351행 코드는 `ecrt_*`만 쓴다. `ecrt.h`로 확인하지 않았다.
- 242행 `napi_busy_read`라는 인터페이스의 존재를 확인하지 않았다(`SO_BUSY_POLL`과 sysctl `net.core.busy_read`의 혼동 가능).
- 94행 '한 자릿수 µs까지 떨어집니다'와 160·165행 Max 18µs의 관계가 모호하다(Avg 4를 뜻했는지 불명).
- 15행 'PREEMPT_RT 한 줄로 끝나지 않고 전부 갖춰야 100µs jitter'와 85·90행 'PREEMPT_RT만으로 Max 87µs'가 긴장 관계다. 수치가 예시라 오류로 확정하지 않았다.
- 115행 `processor.max_cstate=1` 'wakeup latency 0', 99행 nohz_full '인터럽트 0'은 커널 문서로 확인하지 않았다.
- 54행 Xenomai 3 'Linux 5.x까지 active maintenance', 56행 RTAI unmaintained, 253행 'TSN(Qbv/Qbu)는 I225부터'는 1차 자료로 확인하지 않았다.
- 40·85·160행 cyclictest 출력(PID 1234·5678)이 실제 측정인지 확인할 수 없다.
- 364·366행 B&R APROL·TwinCAT/BSD 설명, 415행 'softPLC 모두 PREEMPT_RT 기반'은 벤더 자료로 확인하지 않았다.
- 214행 `ufo off`가 현재 ethtool·커널에서 유효한 feature 이름인지 확인하지 않았다.

병합 대상: 병합 대상 없음. 점수 구간(40~59)은 병합 검토지만 NIC 튜닝·ethercat.conf·softPLC가 이 글에만 있어 흡수할 글이 없다. 판정은 오류 확인에 따른 우선 조치이고 다음 조치는 보강이다. 153행 주석을 `-D 1h`(14,400,000 사이클)와 맞추고, 412행을 176행과 일치시키고, 424행 라벨을 part7-13 제목으로 고치고, cyclictest 수치에 측정 환경을 붙이거나 '예시'로 명시하고, 317~351행은 ch05 링크로 줄이는 방안을 검토한다.

### `industrial-ethernet/chapter12-comparison.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일: 0a9dd7bc(slug 고정), be973200(topic 메타데이터), ac24bb76(제목 변경·날짜 정규화)와 그 이전 작성·정리 커밋뿐이다. 표의 cycle·노드 수·칩 단가, safety 인증 수준, 기업 채택 사례를 ETG·PI·ODVA·EPSG 사양이나 IEEE 802.1 표준과 대조한 커밋이 없다. 원문 안에서 두 진술이 동시에 참일 수 없는 수치·산술 모순은 찾지 못했다(94·306행 '모두 SIL 3'와 92행 TSN 행은 '모두'의 범위가 불분명해 uncertainties로 둔다).

P0 메모: P0는 없다. 다만 125·140·154·162·168·181·197행과 205~264행이 실명 기업·공장(두산, 현대중공업, 현대자동차 울산, 기아 화성, 삼성전자 평택 P3, SK하이닉스 청주, LG디스플레이 파주 P9, LG화학, 코오롱, POSCO 광양, LG에너지솔루션)의 망 채택을 출처 없이 단정한다. 사실이 아니면 '거짓 주장'에 해당할 수 있어 정책 확인 필요로 남긴다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 시나리오 6개를 요구 조건 → 표준으로 대응시킨 절(111~181행), 질문 다섯 개짜리 선택 흐름(266~295행), 칩 단가보다 시스템 총비용으로 보라는 79행 관점이다. 23~36행 비교표와 98~105행 vendor 표는 각 단체 소개 자료 수준의 목록이다. 이 글만의 결론인 한국 공장 묶음 패턴(201~264행)은 출처 없는 실명 단정이라 판단 근거로 쓰기 어렵고, 295행 '9할의 케이스를 가립니다'도 근거가 없다. 13~19 구간 하단. |
| B | 12 | 비교표(23~36행) → 차원별 비교(42~107행) → 시나리오(111~181행) → OPC UA over TSN(183~199행) → 현장 패턴(201~264행) → 선택 흐름(266~295행) → 정리(297~306행)로 기본 흐름은 완성됐다. 293행 Q5 NO 분기가 '(재검토 필요)'로 끝나 흐름이 닫히지 않는다. 277행 Q2는 'cycle ≤ 250 μs면 EtherCAT, 아니면 POWERLINK·PROFINET IRT'로 나누지만 26행 표는 IRT 31.25 μs, POWERLINK 100 μs이고 117행은 250 μs 요구에 IRT를 후보로 넣어 분기 기준이 설명되지 않는다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 4 | 실행·측정 절차가 없다. 26행 최소 cycle, 35행 최대 노드, 71~77행 칩 단가($2~5, $5~15, $10~30 등)는 출처·기준 시점 없는 구체 수치라 C ≤ 8. 115~123·131~138·174~179행 '요구 매칭' 블록은 추론 메모이고 측정·관찰 결과가 아니다. 113·129·144·166행 시나리오 수치는 가정한 요구 사항이다. 266~295행 선택 흐름은 판단 절차일 뿐 검증 가능한 결과가 없다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter11-linux-realtime.md(직전 편), chapter01-overview.md, chapter08-tsn.md, chapter10-powerlink.md. 다른 시리즈는 can-bus/chapter01-overview.md·chapter12-debugging.md, embedded-serial/chapter09-rs232-rs485.md가 PROFINET을 한 번씩만 언급하며 draft라 겹치지 않는다. 겹침: 23~36행 비교표의 거버넌스·최소 cycle(12.5·31.25·1 ms·100·31.25 μs)이 ch01 103~109행 '5대 표준 — 한눈 비교'와 같다. 183~199행 OPC UA over TSN은 ch08 216~227행과 같은 결론이고 ch01 140~142행과도 주제가 같다. 85~94행 safety 표는 ch10 295~301행과 겹친다. ch11과는 겹치지 않는다. 시나리오별 선택 흐름(111~181·266~295행)은 이 글에만 있다. |
| E | 7 | title(EtherCAT·PROFINET·POWERLINK·TSN 선택)과 description(6개 표준, 시나리오별 선택 가이드, 한국 산업 현장 적용 사례)의 약속을 21~295행이 모두 다룬다. description의 '한국 산업 현장 적용 사례'(201~264행)는 출처 없는 단정 목록이고 대상 독자도 명시하지 않아 9점 이상은 아니다. |
| F | 4 | seriesOrder 12, 디렉터리 마지막 파일이라 다음 글은 없고 314~319행이 다음 시리즈를 안내한다. 323~328행 시리즈 내부 6개와 329행 part5-07은 제목과 맞다. 330행 'Modern Embedded Recipes Part 4.6: IRQ affinity'는 part7-13-irq-affinity.md(seriesOrder 87)로 가 번호가 틀렸다. 332행 'DO-178C Ch 1'은 링크가 없고, 319행이 추천한 embedded/aerospace-standards/do-178c/ 12편은 모두 draft: true다. 316행 'Practical RTOS Internals — Part 5 Linux RT'는 실제 Part 5가 part5-01~06(FreeRTOS·Zephyr·RT-Thread·포팅·선택·NuttX)이고 PREEMPT_RT는 part5-07 한 편뿐이다. 317행 'Buildroot로 시작하는 임베디드 Linux'의 실제 시리즈명은 'Buildroot Practical'이다. 틀린 링크 규칙으로 5 이하. |
| G | 1 | 본문 출처는 333~336행 단체 홈페이지 네 개(ETG·PI·ODVA·OPC Foundation)뿐이고 특정 주장에 연결되지 않는다. 92행 802.1CB, 87~91행 IEC 61508 SIL 3, 178행 802.1Qbv·802.1AS는 표준 번호만 있고 판·절이 없다. 71~77행 칩 가격, 26·35행 사양 수치, 기업 사례에 출처·기준 시점이 없다. |

uncertainties:
- 125·140·154·162·168·181·197행, 205~264행: 실명 기업·공장의 망 채택 단정에 출처가 없다. chapter01-overview.md 113행은 회사·라인별 채택 현황은 공개 자료가 한정적이라고 적어 서로 어긋난다(정책 확인 필요).
- 91행은 SERCOS III safety를 CIP Safety로 적고, chapter10-powerlink.md 301행은 'OpenSAFETY on Sercos'를 적는다. 다른 글과의 모순이라 1차 자료로 정해야 한다.
- 25행 SERCOS III 거버넌스를 'Bosch Rexroth'로 적었다. 사양 관리 단체(sercos international) 여부를 확인하지 않았다.
- 94·306행 '모두 SIL 3'와 33·92행 TSN 행(FRER, 'safety 자체는 application 책임')이 함께 참인지 '모두'의 범위가 불분명하다.
- 26행 최소 cycle, 35행 최대 노드(65535·~250·240·254)를 사양 문서와 대조하지 않았다.
- 71~77행 칩 단가에 출처·기준 시점이 없다. 72행 'PROFINET CC-A $1~3'은 칩이 아닌 NIC PHY 기준이라 비교 축이 다르다.
- 162행 '한국 진출 미국계 식품업체(Coca-Cola, Pepsi, Nestle)'에서 Nestle은 스위스 기업으로 알고 있으나 확인하지 않았다.
- 319행 DO-178C 시리즈가 'SIL 3의 인증 절차'를 푼다고 적었다. DO-178C는 SIL이 아닌 DAL 체계로 알고 있으나(같은 시리즈 파일명 chapter02-dal-and-objectives.md) 1차 자료로 확인하지 않았다.
- 236·248행 '화성 공정: PROFIBUS PA'가 배터리 라인과 제철 압연 라인에 같은 문구로 반복된다. 제철소 '화성 공정'의 근거가 없다.
- 144·148행 ±100 ns 카메라 동기를 '모든 표준 가능'이라 했지만 27행 EtherNet/IP jitter는 '수~수십 μs'다. 동기 정밀도와 cycle jitter의 구분이 글에 없다.
- 102행 Rockwell과 Allen-Bradley 병기, 224행 CC-Link IE는 비교 대상 밖이고 근거가 없다.
- 181·199·287행 '향후 5~10년', '10년 이상', '설비 수명 15~20년'은 출처 없는 예측·수치다.

병합 대상: 병합 대상 없음. 23~36행 비교표가 chapter01-overview.md 103~109행과, 183~199행이 chapter08-tsn.md 216~227행과, 85~94행 safety 표가 chapter10-powerlink.md 295~301행과 일부 겹치지만, '시나리오별 프로토콜 선택'은 시리즈에서 이 글만 답하는 독립 검색 의도라 다음 조치는 보강이다. (1) 201~264행과 125·140·154·162·168·181·197행 실명 기업 사례는 공개 자료로 확인하거나 삭제한다. (2) 26·35·71~77행 수치는 사양 문서로 확인하거나 TBD로 둔다. (3) 91행 SERCOS III safety를 ch10 301행과 1차 자료로 맞춘다. (4) 330행 라벨, 316·317·319행 다음 시리즈 안내, 332행 무링크 항목을 실제 공개 글에 맞춘다. (5) 277행 Q2 분기 기준과 293행 Q5 NO 분기를 닫는다.

### `kernel/chapter01-user-kernel-boundary.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 6건(2907896a 신규 작성, c99833a1 callout 변환, 400892d7 linter 일괄 수정, ac24bb76 제목 변경, be973200 topic 메타데이터, 0a9dd7bc slug 고정) 중 1차 자료와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 글 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 본문 대부분이 표준 목록을 표로 옮긴 것이다: /proc 파일 표(62~76행), kallsyms type 목록(91~96행), taint 비트 표(159~175행), sysrq 키 목록(188~194행). 이 글만의 관점은 34행 'bootstrap 문제'와 48행 '일상은 printk + ftrace + bpftrace' 정도이고 근거·사례가 없다. 227행 kpatch로 '디버그 빌드를 라이브로 swap'도 설명 없는 한 문장이다. 6~12 구간 하단. |
| B | 9 | 경계 비교(21~32행) → 도구 표(36~48행) → /proc(50~98행) → 심볼·debug info(100~124행) → 모듈 → taint → sysrq → addr2line → 함정 → 정리 흐름은 있으나 절마다 명령 한두 개와 한 문장이다. 15행이 약속한 '왜 어렵나'는 23~32행 표와 34행 한 문장뿐이다. 76행 '(Ch에서 다룸)'은 장 번호가 빠진 미완성 표기다. 정확성 불확실(183행 G 해석, 98·233행 kptr_restrict)이 열려 있어 AP-C-24에 따라 B ≤ 13이고, 한계 설명이 빠져 5~9 구간. |
| C | 6 | 명령과 예시 출력(81~89행 kallsyms, 104~113행 readelf, 128~141행 lsmod·modinfo, 203~212행 addr2line)은 있으나 커널 버전·배포판·아키텍처 같은 실행 환경이 없다. 82행 주소, 131~133행 모듈 크기, 205·211행 mm/memory.c:1234·5678은 출처·환경 없는 구체 값이라 C ≤ 8. 합격·실패 관찰이 갈리는 검증 절차가 없고, 231~237행 함정 표도 원인 한 줄씩이다. |
| D | 9 | 같은 시리즈: 150~183행 taint 절이 chapter07-panic-oops.md 108~119행 Tainted 절과 같은 `Tainted: G W OE` 예(이 글 180행 / ch07 111행)와 해석을 반복한다. 199~214행 addr2line on vmlinux는 ch07 131~139행·199~210행(addr2line, decode_stacktrace.sh)과 겹친다. 194행 sysrq `c`는 chapter06-crash-drgn.md 56행과 같은 명령이고, 185~197행 sysrq 절은 chapter05-kdb-kgdb.md 122~125행(sysrq `g`로 kgdb 진입)과 일부 겹친다. 234행 printk 한 줄은 다음 편 chapter02-printk-dmesg.md 예고(263행)라 역할이 구분된다. 다른 시리즈: 239~249행 debuginfod 절은 dwarf-elf/chapter06-split-dwarf-tools.md 165~181행과 같은 DEBUGINFOD_URLS 예(244행 / 170행)다. tools/strace-tracing은 draft라 비교에서 뺐다. |
| E | 6 | 제목 '리눅스 커널 디버깅 개론 — User/Kernel 경계와 도구 선택'(2행), description '/proc, kallsyms, kernel debug info'(5행)는 21~124행에서 다룬다. '도구 선택'은 38~46행 표의 '사용·위험도' 칸과 48행 한 문장뿐이라 증상별 선택 기준이 없다. 6~8 구간 하단. |
| F | 4 | 263행 다음 장 예고 'Ch 2 — printk + dmesg + dynamic_debug'는 seriesOrder 2 chapter02-printk-dmesg.md와 맞고 267행 링크도 같은 파일이다. 268행 'DWARF and ELF Internals'는 dwarf-elf/chapter01-elf-overview.md로 맞다. 그러나 269행 'strace / tracing 시리즈'는 링크 없는 관련 항목이고 대상 tools/strace-tracing(chapter01-tracing-overview.md 9행 draft: true)은 공개 페이지가 없다. 241행 라벨 'debuginfod 시리즈'는 별도 시리즈가 아니라 DWARF and ELF Internals 6장을 가리킨다. 76행 '(Ch에서 다룸)'은 장 번호가 빠졌다. 링크 없는 관련 항목·라벨 불일치 규칙으로 5 이하. |
| G | 2 | 본문 1차 출처는 270행 kernel.org dev-tools 색인, 271행 man 5 proc, 272행 sysrq.rst다. sysrq.rst는 185~197행과 연결되지만 taint 비트 표(159~175행)에는 tainted-kernels.rst 같은 출처가 없고, 커널 버전·배포판 표기도 없다(180행 5.15.0은 로그 예일 뿐). |

uncertainties:
- 183행 'Tainted: G W OE = proprietary + warning + out-of-tree'와 161행 'G/P proprietary 모듈 로드'는 chapter07-panic-oops.md 114행 'G — proprietary 모듈 안 로드'와 다르다(다른 글과의 모순이라 오류 확인 아님). E(unsigned 모듈)는 이 글 taint 표에 없다. tainted-kernels.rst로 확인하지 않았다.
- 171행 비트 12 'I — tainted via ad-hoc'의 정확한 의미를 확인하지 않았다.
- 98행 'sudo로 봐야 실제 주소'와 233행 'kptr_restrict=2 (보안 기본). sudo 또는 root로': kptr_restrict=2에서 root도 가려지는지, 2가 기본값인지 sysctl 문서로 확인하지 않았다.
- 82행 kallsyms 예에서 do_fork는 ffffffff8108c130인데 204~210행 addr2line은 0xffffffff8108c1a0(do_fork+0x70 범위)을 handle_pte_fault로 푼다. 같은 시스템이라는 명시가 없어(KASLR, 98행) 오류 확인으로 올리지 않았으나 예시 값이 서로 맞지 않는다.
- 81~82행 do_fork 심볼은 최신 커널에서 이름이 바뀌었을 가능성이 있다(기억 기반). 커널 버전 미표기.
- 121행 Ubuntu 패키지 이름 linux-image-$(uname -r)-dbg가 실제(-dbgsym 등)와 맞는지 확인하지 않았다.
- 36행 제목 '다섯 가지 방법'인데 표는 일곱 행(40~46행), 254행 정리도 '5가지 무기'다(개수 표기 실수).
- 249행 'CoreOS, AWS 환경에서 표준 경로'는 출처 없는 주장이다.
- 29·44행 'kgdb/kdb (별 머신 필요)': kdb는 로컬 콘솔에서도 쓰이는지 확인하지 않았다.
- 197·258행 'Magic SysRq는 hang 상태의 유일한 응답 경로'는 출처 없는 단정이다.

병합 대상: 병합 대상 없음(글 전체를 흡수할 단일 글이 없다). 부분 중복은 taint(150~183행)·addr2line(199~214행)이 chapter07-panic-oops.md 108~119·131~210행과, debuginfod(239~249행)가 dwarf-elf/chapter06-split-dwarf-tools.md 165~181행과 겹치는 정도다. 시리즈 첫 글로 도입 역할(15행)이 있으나 장 목록 링크가 없어 허브 예외(루브릭 5절)는 적용하지 않았다. 다음 조치는 보강이다. 중복 절은 ch07·dwarf-elf ch06 링크로 줄이고, 제목의 '도구 선택'에 맞는 증상→도구 기준을 채우고, 커널 버전을 밝히고 taint 표를 tainted-kernels.rst로 확인한다.

### `kernel/chapter02-printk-dmesg.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 내부 모순(루브릭 3-1). 58행 "*console*은 console_loglevel 이하만 표시"와 96행 "*현재 console_loglevel* — 이 미만 level만 console로"는 같은 규칙을 이하/미만으로 달리 적어 동시에 참일 수 없다. 이 차이가 다른 진술과도 충돌한다. 85행 예시 "4 4 1 7"(현재 4)에 96행 '미만'을 적용하면 level 4는 콘솔에 안 나오는데 39행 표는 KERN_WARNING을 '콘솔 출력 (기본) ✓'로 적었다. 89행 "echo 8 … 콘솔에 모든 메시지 출력"과 91~92행 "dmesg -n 7도 같은 효과"는 96행 규칙 아래에서 KERN_DEBUG(7, 42행) 출력 여부가 달라 같은 효과가 아니다. 286행 함정 표 "메시지 안 보임 | console_loglevel < message level"도 '같으면 보임'을 뜻해 58행과는 맞고 96행과는 어긋난다. git log(0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그, be973200 topic 메타데이터, ac24bb76 제목 개편 등)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | printk 매크로(21~27행), log level 표(33~44행), dmesg 옵션(62~71행), dynamic_debug control 문법·플래그(155~194행)는 커널 문서 printk-basics·dynamic-debug-howto를 요약한 수준이다. 이 글만의 부분은 함정 표(284~292행)와 driver probe 디버깅 흐름(294~328행)인데, 흐름 예도 dev_info/dev_dbg/dev_err 세 줄과 가상 출력이라 분석·선택 기준이 약하다. 13행 '대부분의 커널 버그가 printk 한 줄로 잡힙니다', 209행 '매우 강력'은 근거 없는 단정이다. 앵커 part1-04(10)와 같은 개념 요약 구간. |
| B | 11 | log level(31~52행) → 출력 경로(54~58행) → dmesg(60~78행) → console loglevel(80~99행) → 변형 매크로(118~147행) → dynamic_debug(149~209행) → ratelimit(211~232행) → trace_printk(234~251행) → 부팅 콘솔(253~266행) → journalctl(268~280행) → 함정(282~292행) → 예제(294~328행) → 정리(330~339행)로 흐름은 완성됐다. 그러나 콘솔 출력 규칙이 58·96·39·286행에서 어긋나 '메시지가 왜 콘솔에 안 보이나'(286행)에 일관된 답을 주지 못하고, 163행 '=_p 활성+stack'은 186~194행 플래그 표에 stack 플래그가 없어 설명이 끊긴다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | 명령 예(62~71, 82~93, 167~182, 272~277행)와 기대 출력(85, 157~159, 312~328행)은 있으나 커널 버전·배포판·하드웨어 환경이 없고, 316·325~327행 출력은 실행 기록이 아닌 예시다. 73행 '보통 16-17', 223행 '기본 10초에 10회', 236행 'us~ms 단위 비용'은 출처·측정 환경 없는 수치라 C ≤ 8. 측정·실패 관찰 기록이 없어 4~7 구간. |
| D | 11 | 같은 시리즈: chapter01-user-kernel-boundary.md 40~41행(printk+dmesg, dynamic_debug 한 줄 소개)과 234행('printk 출력 안 보임 → dmesg -n 7 또는 /proc/sys/kernel/printk')이 이 글 89~92행과 겹친다. chapter03-ftrace-tracepoints.md는 trace_printk 언급이 없어 이 글 234~251행과 겹치지 않는다. chapter07-panic-oops.md 85행 WARN_ON 설명은 이 글 134~147·292행과 일부 겹친다. 다른 시리즈: embedded/modern-recipes/part7-06-kernel-module.md 129~145행(pr_* level 값 주석, dmesg -wH·--level=err,warn, echo 8 > /proc/sys/kernel/printk, pr_debug 조건)이 이 글 33~42·62~66·89·151행과 거의 같다(공개 글). tools/emulation/qemu-fake-device/chapter09-debugging.md, systems/linux-drivers/ldd3-modern/chapter04-debugging.md, tools/strace-tracing/chapter09-ftrace.md는 draft다. 시리즈 안 printk·dynamic_debug 전담 글이라 역할은 구별된다. |
| E | 5 | 제목 키워드 printk·dmesg·dynamic_debug는 19~52행, 60~78행, 149~209행에서 다룬다. description의 ring buffer는 73~78행 크기 설정뿐이다. 제목이 '분석 — 커널 로그 추적', description이 '커널 로깅의 모든 것'을 약속하는데 본문은 명령·매크로 참조 목록과 가상 출력 예 수준이라 루브릭 E 3~5 조항을 적용했다. |
| F | 5 | 343행 다음 장 예고 'Ch 3 — ftrace + tracepoints'는 seriesOrder 3 chapter03-ftrace-tracepoints.md와 맞고, 347행 Ch 1, 348행 Ch 3 링크도 대상과 맞는다. 그러나 349행 'strace-tracing Ch 9: ftrace'는 링크 없는 관련 항목이고 대상 tools/strace-tracing/chapter09-ftrace.md는 draft: true다. 링크 없는 관련 항목 규칙으로 5 이하. 251행 'Ch 3에서 자세히'는 맞는 안내지만 전제 지식 안내는 없다. |
| G | 2 | 350·351행에 kernel.org printk-basics, dynamic-debug-howto 링크가 있으나 'latest' 문서이고 본문 주장(223행 ratelimit 기본값, 73행 LOG_BUF_SHIFT, 96행 console_loglevel 규칙)과 연결되지 않는다. 대상 커널 버전은 105행 예시 출력의 '6.5.0'뿐이다. |

uncertainties:
- 76~77행 `/sys/kernel/debug/log_buf_len` 경로가 실제로 있는지 1차 자료로 확인하지 않았다.
- 223행 printk_ratelimited 기본값 '10초에 10회'는 include/linux/ratelimit_types.h의 DEFAULT_RATELIMIT_INTERVAL·BURST와 대조하지 않았다(기억상 5초 간격일 수 있음).
- 163행 '=_p 활성+stack': dynamic_debug에 stack 플래그가 있는지, '_' 의미가 194행 '+_ 모두 끔'과 맞는지 dynamic-debug-howto로 확인하지 않았다.
- 290행 'pr_debug 출력 안 됨 → CONFIG_DYNAMIC_DEBUG_CORE 필요'와 289행 CONFIG_DYNAMIC_DEBUG 구분, DEBUG 매크로 경로 누락 여부를 확인하지 않았다.
- 259·288·339행 earlyprintk 설명과 최신 커널의 earlycon 권장 여부를 확인하지 않았다.
- 321행은 +pfl(m 플래그 없음)로 켰는데 326행 출력에 'my_driver:' 모듈명 prefix가 있고, 316·325행 dev_info 출력은 'driver device:' prefix 형식과 다를 수 있다. dev_* prefix 규칙을 알아야 판단되므로 오류 확인에 넣지 않았다.
- 280행 'journald는 디스크 영구 저장, 부팅 간 보존'은 Storage 설정에 따라 다를 수 있다.
- 236행 printk 비용 'us~ms'는 출처·측정이 없다.

병합 대상: 판정은 오류 확인에 따른 우선 조치다. 병합 대상 없음 — 시리즈 안 printk·dynamic_debug 전담 글이고 part7-06-kernel-module.md는 모듈 기초 글이라 흡수 대상이 아니다. 다음 조치는 보강이다(58·96·39·92·286행의 콘솔 출력 규칙을 1차 자료로 하나로 통일, 349행 링크 정리, 73·223·236행 수치 출처 확보 또는 삭제).

### `kernel/chapter03-ftrace-tracepoints.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일: 387d7b79(Performance Engineering과 교차 링크), 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타데이터), ac24bb76(제목 변경·날짜 정규화), 400892d7(linter 일괄 수정), c99833a1(callout 변환), 2907896a(최초 작성). 본문 주장을 Documentation/trace/ftrace.rst나 커널 소스와 대조했다는 커밋이 없다. 로컬에 linux clone(~/Workspaces/code-review-sources/linux)도 없어 평가 중 1차 자료를 열지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | function·function_graph·filter·event·kprobe·trace-cmd 절(60~135행, 146~179행, 243~258행, 310~328행)은 tracefs 파일에 echo하는 기본 사용법을 순서대로 옮긴 것이다. 이 글에만 있는 것은 TRACE_EVENT 자체 tracepoint 예(212~241행), vmcore에서 ring buffer를 꺼내는 절(349~362행), ftrace·eBPF 비교 표(368~378행), 함정 표(393~400행)다. 산문은 '콜그래프가 그대로'(107행), '수천 개. 카테고리별 grouped'(165행) 같은 명사형 조각이다. 13행이 내건 hot path 버그·호출 출처·latency spike를 실제 사례로 푸는 절이 없다. |
| B | 10 | tracefs 진입(19행)부터 tracer, filter, PID, event, 자체 tracepoint, kprobe, latency tracer, trace-cmd, KernelShark, buffer, vmcore, 부팅 옵션, 함정, 정리(402~412행)까지 흐름은 끝까지 간다. 절마다 명령 한 블록과 한두 줄 설명뿐이고, 13행이 약속한 '어디서 호출됐는지 모르는 함수'를 처음부터 끝까지 추적한 예가 없다. 212~232행 TRACE_EVENT 빌드 가능 여부는 1차 자료로 확인하지 않아 감점 근거로 쓰지 않았다(AP-C-31). 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 명령과 예시 출력(62~84행, 90~105행, 266~283행)은 있지만 커널 버전·아키텍처·배포판이 없다. 71행 '12345/678901', 132행 '67890', 299·303행 '1234 us'는 자리 채움 값이고, 28·29행에 `trace`가 두 번 나오는 ls 출력은 실측일 수 없다. 343행 'buffer_size_kb 기본 1408 KB per CPU'는 출처·환경 없는 수치라 C ≤ 8. 합격·실패 관찰을 가르는 검증 절차가 없다. |
| D | 9 | 같은 시리즈 인접 글: chapter02-printk-dmesg.md는 234~244행에서 trace_printk만 짧게 다뤄 겹침이 작다. chapter04-ebpf-kernel.md는 bpftrace·BCC·verifier(19~403행) 중심이라 이 글 364~378행 비교 표와 역할이 갈린다. 다른 시리즈: embedded/performance-engineering/part5-03-ftrace.md와 상당히 겹친다. tracefs(19~38행 ↔ part5-03 24~49행), function tracer(60~86행 ↔ 51~76행), set_graph_function do_sys_open 그래프(264~283행 ↔ 77~102행, 81·89·94행 같은 예), irqsoff(292~308행 ↔ 103~135행), event enable(167~179행 ↔ 136~161행), trace-cmd(310~332행 ↔ 162~179행), kprobe `p:my_open do_sys_open filename=+0(%si):string`(253행 ↔ 185행, 같은 명령). 이 글만의 부분은 format 파일(187~206행), TRACE_EVENT(208~241행), vmcore 추출(349~362행), 부팅 옵션(380~389행)이다. tools/strace-tracing/chapter09-ftrace.md는 draft라 비교에서 뺐다. 5~9 구간 상단. |
| E | 5 | 제목 '활용 — 커널 함수 호출 트레이싱'과 description의 네 키워드(함수 단위 trace, 이벤트 trace, 정적 tracepoint, function graph)는 60·88·146·208행에서 다룬다. 그러나 제목이 '활용'·'트레이싱'을 약속하고 13행이 세 문제를 내걸었는데 본문은 도구 명령 목록이라 독자가 얻는 디버깅 결과가 불명확하다. 루브릭 E 3~5 구간. |
| F | 5 | 다음 장 안내(416행 'Ch 4 — eBPF / bpftrace')는 seriesOrder 4 chapter04-ebpf-kernel.md와 맞다. 420행 Ch 2, 421행 Ch 4 링크도 맞다. 422행 Performance Engineering 링크는 part5-03-ftrace.md로 가고 라벨의 overhead 절이 그 글 192행에 있다. 그러나 423행 'strace-tracing Ch 9: ftrace'는 링크 없는 관련 항목이고 대상은 draft다. 262행 'strace-tracing 시리즈 참고'도 링크가 없다. 링크 없는 관련 항목 규칙으로 5 이하. |
| G | 2 | 424~426행에 ftrace.rst(latest), trace-cmd GitHub, Brendan Gregg 페이지 링크가 있으나 글 끝에 모여 있고 135행(-mfentry nop 패딩), 241행(비활성 시 NOP 비용), 343행(기본 버퍼 크기) 같은 본문 주장과 연결되지 않는다. 커널·trace-cmd 버전 표기가 없고 260행만 x86-64 레지스터라고 밝힌다. |

uncertainties:
- 22~30행 ls 출력에 `trace`가 28·29행 두 번 나오고 `sysprof`가 있다. 손으로 만든 출력으로 보인다. ftrace 동작에 대한 주장이 아니라 출력 모양 결함이라 오류 확인으로 올리지 않았다.
- 298행 `cat trace_max_latency` vs 26행 목록의 `tracing_max_latency`: 목록이 '...'로 끝나 엄밀한 내부 모순은 아니다. ftrace.rst로 확인해야 한다.
- 44행 available_tracers 출력에 irqsoff·preemptoff가 없는데 295행에서 irqsoff를 쓴다. 커널 설정 차이로 설명될 수 있어 모순으로 보지 않았다.
- 225행 `__assign_str(name, name)`: 최근 커널에서 인자가 하나로 바뀌었다는 기억이 있으나 확인하지 않았다.
- 212~236행: TRACE_SYSTEM·CREATE_TRACE_POINTS 누락과 `events/my_event/enable` 경로(169·250행의 events/<system>/<event>/ 형태와 다름)를 include/trace/define_trace.h로 확인하지 않았다.
- 340행 `> free_buffer`의 실제 동작(파일을 닫을 때 해제)을 확인하지 않았다.
- 343행 'buffer_size_kb 기본 1408 KB per CPU'는 출처가 없다.
- 355행 crash `trace dump`의 확장 모듈 필요 여부, 359행 `trace-cmd extract -i vmcore` 지원 여부를 확인하지 않았다.
- 135행 'nop 5바이트'·'call _ftrace'는 x86 기준이고 심볼(`__fentry__`/`ftrace_caller`)과 맞는지 확인하지 않았다.
- 54~58행 `mmiotrace`·`branch` tracer의 현행 커널 존재 여부를 확인하지 않았다.

병합 대상: 후보는 `src/content/blog/embedded/performance-engineering/part5-03-ftrace.md`. tracefs·function·function_graph·irqsoff·event·trace-cmd·kprobe 절이 같은 예(do_sys_open 그래프, p:my_open kprobe)로 겹친다. 다만 이 글은 디버깅(호출 출처·버그 추적), part5-03은 성능(overhead·latency)이라 검색 의도가 독립적이므로 다음 조치는 병합이 아니라 보강(차별화)이다. 겹치는 tracer 절은 줄이고 part5-03으로 연결한다. TRACE_EVENT·format 파일·vmcore 추출·부팅 옵션처럼 이 글에만 있는 절을 실제 버그 추적 사례 하나로 묶어 키운다. 커널 버전을 명시하고 자리 채움 출력은 실측으로 바꾸거나 예시라고 표시한다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: Industrial Ethernet은 '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → (다음 편은) → 관련 항목'이 이번 7편 모두에 있다(예: ch06 13·202·224·237행, ch07 13·224·246·259행, ch08 13·229·247·260행, ch09 13·325·361·374행, ch10 13·305·334·347행, ch11 13·370·406·419행). 12편 전체가 한 커밋 80cb602e로 작성됐다. Kernel Debugging도 '함정 / 정리 / 다음 장 예고 / 관련 항목'(ch01 229·251·261·265행, ch03 402·414·418행, ch04 414·424·428행)이 같다. 9절 scaled content 기록 대상이다.
- 다른 시리즈 옛 번호 라벨: 'Modern Embedded Recipes Part 4.6/4-06: IRQ affinity'가 실제로는 part7-13-irq-affinity.md(seriesOrder 87)로 간다. industrial-ethernet ch06 243행, ch11 424행, ch12 330행(그리고 ch01 165행). 같은 시리즈 다음 편 부제도 ac24bb76 제목 변경 전 이름이 남았다(ch09 372행, ch08 258행, ch12 327행). 한 번에 고칠 대상이다.
- 링크 없는 관련 항목(draft 대상): Kernel Debugging ch01 269행, ch02 349행, ch03 262·423행이 draft인 tools/strace-tracing을 링크 없이 가리킨다. ch12 332행 'DO-178C Ch 1'도 무링크이고 대상 12편이 draft다. 4편에서 F ≤ 5가 걸렸다.
- '분석·활용·추적'을 약속하는 제목과 개념 소개 수준 본문: ch06·ch08·kernel ch02·kernel ch03 네 편이 루브릭 E 3~5 상한에 걸렸다. ch07('역할 추적')·ch09('Qbu')도 제목 일부를 이행하지 않는다.
- 시리즈 안 예제·절 중복: PROFINET 역할 표·GSDML(ch06 85~171행 ↔ ch07 21~31·194~222행), TSN YANG(ch08 163~186행 ↔ ch09 175~198행), I210/I225 하드웨어(ch08 204~214·231~233행, ch09 351행, ch11 252~258행), OPC UA over TSN(ch08 216~227행 ↔ ch12 183~199행), 비교표(ch01 103~109행 ↔ ch12 23~36행, ch06 175~186행), safety 표(ch10 295~301행 ↔ ch12 85~94행). Kernel Debugging은 시리즈 밖 글과 겹친다(ch01 ↔ dwarf-elf ch06, ch02 ↔ modern-recipes part7-06, ch03 ↔ performance-engineering part5-03).
- 시리즈 안 수치·서술 모순(다른 글과의 모순이라 오류 확인은 아님): RT 사이클 하한(ch07 94·251행 RT 1ms, ch12 134행 RT 4ms, ch07 236행·ch06 61·206행 수 ms), DCP 전송 계층(ch06 218행 IPv4 multicast ↔ ch07 39행 L2 0x8892), POWERLINK 사이클(ch01 108행 100 μs ↔ ch10 30행 200 μs~), SERCOS III safety(ch12 91행 CIP Safety ↔ ch10 301행 OpenSAFETY), I210 TSN 지원 표현(ch08 233행, ch09 351행, ch11 253행), taint G 해석(kernel ch01 161·183행 ↔ ch07 114행). 1차 자료로 정본을 정한다.
- 출처 없는 한국 기업·공장 사례: ch01 113·155행, ch06 184·190·200·232행, ch12 125~264행과 305행. ch01 113행 '공개 자료 한정'과 ch12의 실명 단정이 어긋난다. 정책 확인 필요 항목이다.
- 출처·환경 없는 구체 수치와 예시 출력: 10편 모두 C ≤ 8 상한이 걸렸다(ch06 39~43·61·206행, ch07 94·178·236행, ch08 125·202~210행, ch09 158~163행, ch10 27~31·106행, ch11 40·85·160행, ch12 26·35·71~77행, kernel ch01 82·131~133행, ch02 73·223행, ch03 71·132·343행). Kernel Debugging 3편은 기준 커널 버전도 없다.
- 본문 1차 출처·버전 표기 없음: 10편 모두 G가 1~2점이다. 관련 항목 끝에 단체·표준 홈페이지 링크만 두고 본문 주장과 연결하지 않는다(ch06 244~245행, ch07 264행, ch08 265행, ch09 379~380행, ch10 352~353행, ch11 425~426행, ch12 333~336행).
- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. 두 시리즈 모두 `/fact-check-round`를 거치지 않았다.
- 내부 모순·산술 불일치: ch07(108·178행 외 3건), ch09(58·60·63행, 30·52~60행), ch10(42·126행), ch11(153·154행), kernel ch02(58·96·286행). 80cb602e 일괄 작성 글에서 4편이 원문만으로 오류가 확인됐다. 같은 커밋의 나머지 장도 수치를 전수 검산해야 한다.

## 다음 조치

- 우선 조치(5편, 오류 확인): ch07 108/178행·94/236행·213/94행·134/135~136행, ch09 58·60·63행 guard band 위치와 30·52~60행 Q4 게이트, ch10 42·126행 NodeID 범위, ch11 153·154행 사이클 수와 412/176행 시간, kernel ch02 58·96·286행 console_loglevel 규칙을 먼저 1차 자료(IEC 61158-6-10, IEEE 802.1Qbv, EPSG DS 301, cyclictest 문서, kernel printk 문서)로 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 링크·라벨 일괄 정리: ch06 235행 끝맺음과 243행, ch11 424행, ch12 330행 IRQ affinity 라벨, ch09 372행·ch08 258행 다음 편 부제, ch12 316·317·319·332행 다음 시리즈 안내, kernel ch01 241·269행, ch02 349행, ch03 262·423행 무링크 항목.
- 병합 검토(5편): ch06은 역할 표·GSDML을 ch07로 넘기고 CC/RT/IRT를 차별화한다. ch08은 YANG·하드웨어·OPC UA 절을 ch09·ch11·ch12와 나누고 Qch·Qci를 채운다. ch12는 실명 기업 사례 확인·삭제(정책 확인 필요)와 수치 출처를 먼저 처리한다. kernel ch01은 장 목록을 갖춘 지도 역할로 줄이고 '도구 선택' 기준을 채운다. kernel ch03은 performance-engineering part5-03과 차별화(버그 추적 사례)가 가능한지 먼저 정한다.
- Industrial Ethernet 심화와 Kernel Debugging을 `/fact-check-round` 대상으로 올리고, 시리즈 안 모순 수치(RT 사이클, DCP, POWERLINK 사이클, SERCOS safety, taint G)는 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
