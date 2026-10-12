# 공개 글 AdSense 평가 — 루프 10

> 대상: 공개 글 10편 (CXL 4.0 Internals, `seriesOrder` 4~13)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열 번째 루프다. 대상은 `src/content/blog/embedded/hardware/cxl/`의 `chapter04-pooling-gfam.md`~`chapter13-switching-fabric.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter04-pooling-gfam.md` | 13 | 12 | 4 | 7 | 7 | 7 | 4 | **54** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter05-cxl-4-features.md` | 12 | 11 | 3 | 9 | 7 | 7 | 3 | **52** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `chapter06-cxl-io.md` | 14 | 12 | 7 | 11 | 7 | 7 | 4 | **62** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter07-cxl-cache.md` | 13 | 12 | 6 | 12 | 7 | 7 | 2 | **59** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter08-cxl-mem.md` | 14 | 13 | 8 | 9 | 7 | 7 | 3 | **61** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter09-flit-format.md` | 15 | 13 | 6 | 13 | 8 | 7 | 4 | **66** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part1-04-uart-hardware.md` |
| `chapter10-arb-mux.md` | 15 | 12 | 4 | 14 | 7 | 7 | 4 | **63** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md` |
| `chapter11-linux-driver.md` | 14 | 13 | 8 | 3 | 8 | 5 | 4 | **55** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter12-qemu-emulation.md` | 14 | 13 | 9 | 9 | 7 | 5 | 4 | **61** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter13-switching-fabric.md` | 15 | 13 | 5 | 10 | 7 | 7 | 4 | **61** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |

평균 59.4점(10편 합 594), 범위 52~66점이다. 판정은 보강 6편(ch06·08·09·10·12·13), 병합 검토 4편(ch04·05·07·11)이고 우선 조치·유지·검증 대기·제외 검토는 없다. 10편 모두 a0eeea28(Fact-check round 2, #59)에 CXL 3.1 spec·4.0 발표문·웨비나·mainline 커널·QEMU·ndctl·pciutils 대조 기록이 있어 `factcheck: 검증됨`이지만, 80점에 닿은 글이 없어 유지 판정은 없다. 병합 검토 4편은 모두 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. 오류 확인은 0건이다. 다른 글과의 충돌·기억에 근거한 의심은 uncertainties로만 남겼다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`, Ch 1 167행 `#시리즈-자료-출처-안내` 앵커까지이고, 렌더링·광고 배치·sitemap·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter04-pooling-gfam.md` | 54 | 54 | 0 | 없음 |
| `chapter05-cxl-4-features.md` | 53 | 52 | -1 | 없음 |
| `chapter06-cxl-io.md` | 62 | 62 | 0 | 없음 |
| `chapter07-cxl-cache.md` | 59 | 59 | 0 | 없음 |
| `chapter08-cxl-mem.md` | 61 | 61 | 0 | 없음 |
| `chapter09-flit-format.md` | 67 | 66 | -1 | 없음 |
| `chapter10-arb-mux.md` | 67 | 63 | -4 | 있음 |
| `chapter11-linux-driver.md` | 55 | 55 | 0 | 없음 |
| `chapter12-qemu-emulation.md` | 61 | 61 | 0 | 없음 |
| `chapter13-switching-fabric.md` | 61 | 61 | 0 | 없음 |

1차 합 600에서 최종 594로 6점 내려갔다. 판정이 바뀐 글은 없다. 부풀림(AP-C-24)은 ch10 1편이다.

- 기각한 오류 확인: 0건. 추가한 오류 확인: 0건. 1차·더블 체크 모두 원문 내부 모순이나 직접 연 1차 자료로 성립하는 오류를 찾지 못했다.
- ch10(부풀림): A 16→15(본문 대부분이 spec 표 23~28·55~67·77~81·101~105행을 옮김), B 13→12(133행 정리의 vLSM 목록이 59행 Active.PMNAK를 빠뜨리고 61행 예약 상태 L1.1~L1.3을 'L1.x'로 묶음, 36행 528-bit 설명 없음), C 6→4(예제·명령이 전혀 없어 4~7 구간 하단).
- ch05: D 10→9. 한 줄 요약(15행)·4.0 변경 표(21~26행)·정리(119~123행)가 Ch 1 66~73·136·151행과 거의 같은 문장이다.
- ch09: C 7→6. 코드·명령·관찰이 없고 124~129행 세대 혼합 표 수치는 출처·조건이 없어 앵커 part1-04(C 6)보다 높게 줄 근거가 없다.
- 근거 정정(점수 영향 없음): ch04 D 대응 줄(Ch 2 66~73·75~88행, HBM Ch 12 108행, Ch 13 50~65·69~71행), ch07 part4-09 MESI 표 26~31행, ch08 HBM Ch 9 28·40~42행, ch11 Kernel Debugging Ch 9 중복을 직접 계산(공백 제거 고유 206줄 중 138줄), ch12 grep으로 pxb-cxl·cxl_test 사용 글이 이 글과 Recipes part11-16뿐임을 확인.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점은 ch11 288행 'Recipes Ch 151'(대상 seriesOrder 152), ch12 196행 'Recipes Ch 150'(대상 seriesOrder 151) 두 건이다.

## 글별 근거

### `chapter04-pooling-gfam.md` — 54점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(#59) 안의 'fix(content): fact-check CXL Ch 4 against CXL 3.1 §2.4 and §7'이 HBR 풀이(용어집·§7), Coherency Domain ID 삭제, PBR 토폴로지(§7.7), FM 정의(§7.6.1), G-FAM(§2.4.3), Shared FAM 일관성(§2.4.4)을 규격과 대조해 고쳤다. 이후 e2aa6b02(출처 꼬리말)·b97ac869(Ch 13 앵커·문장)는 링크·출처 문구만 바꿨다. 130행 Azure M-series 문장은 커밋 본문에 출처가 없어 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 G-FAM 절(89~100행: SPID로 요청자 구분, GFD decoder의 HPA→DPA 변환, §2.4.3)과 규격 근거로 통념을 고친 '자주 하는 실수'(152~158행: FM 형태는 규격이 정하지 않음, PBR 토폴로지는 deadlock-free routing이면 됨 §7.7)다. 19~33행 3단계 표는 HBM Ch 12 49~62행과 같은 뼈대, 58~65행 LD 재할당 예는 Ch 2 66~73행과 같은 숫자다. 132~140행 Composability는 일반론, 162행 NVLink 항목은 근거 없는 단정이다. 13~19 구간 하단. |
| B | 12 | 2.0 switching(35~45행) → pooling(47~67행) → 3.0 fabric(69~87행) → G-FAM(89~100행) → PBR(102~111행) → FM(113~119행) → 사례·실수·정리(121~171행) 흐름은 완결됐다. G-FAM 표(93~98행)의 QoS는 한 줄이고 FM 세부·PBR deadlock 조건은 Ch 13으로 넘긴다. 67·76·113행은 FM을 'out-of-band control'로 부르는데 117행은 디바이스 안 state machine일 수도 있다고 해 범위가 흐리다. 130행 출처 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 4 | 실행·검증 절차가 없는 개념 글이다. sysfs·`cxl list`처럼 LD 할당을 관찰할 방법이 없고 58~65행 LD 표는 가상의 운영 예다. 127~128행 Pond(7%, 1~5%)·TPP(18%)는 논문은 밝혔으나 측정 환경이 없다. 4~7 구간 하단. |
| D | 7 | 비교한 글: 같은 시리즈 `chapter02-system-architecture.md`, `chapter13-switching-fabric.md`, `chapter05-cxl-4-features.md`, 다른 시리즈 `hbm/chapter12-cxl-pooling-fabric.md`. 58~65행 LD 예 ↔ Ch 2 66~73행, 82~85·150행 Shared FAM 일관성 ↔ Ch 2 75~88행, 102~111행 HBR/PBR·113~119행 FM ↔ Ch 13 50~65·69~71행, 19~33행 ↔ HBM Ch 12 49~62행, 127~128행 Pond·TPP ↔ HBM Ch 12 91·108·141~142행, 160~162행 NVLink ↔ HBM Ch 12 128~130행. 이 글만의 것은 G-FAM 절과 156~158행 정도. 5~9 구간. |
| E | 7 | 제목(2행)과 description(5행)의 pooling·fabric·GFAM을 47~67·69~87·89~100행이 다룬다. 과장은 없다. GFAM 절이 표 하나와 한 문장(100행)이라 제목 키워드 하나가 얇고, 대상 독자·구체 문제가 드러나지 않는다. |
| F | 7 | 175행 다음 편은 seriesOrder 5 `chapter05-cxl-4-features.md` 제목(2·7행)과 맞다. 179행 Ch 2, 180행 Ch 13, 181행 HBM Ch 12 라벨이 실제 제목과 맞다. 119행 `#fabric-manager`는 Ch 13 69행, 185행 앵커는 Ch 1 167행과 맞다. 17행이 전제를 밝히고 119행이 FM 세부를 Ch 13으로 보낸다. 렌더 확인을 안 해 9 이상은 아님. |
| G | 4 | 91행 CXL 3.1 §2.4.3, 117행 §7.6.1, 158행 §7.7을 주장에 붙였고, 127~128행 Pond·TPP는 학회·연도(ASPLOS 2023)를 밝혔다. 외부 링크가 없고 130행 Azure·Leo 문장은 출처가 없으며 150행 HDM-DB 2단계 write는 절 번호가 없다. |

uncertainties:
- 130행 'Azure M-series VM 프리뷰에서 CXL 메모리 확장 발표(Astera Labs Leo, 2025년 11월)': 커밋 본문과 185행 출처 목록에 근거가 없고 1차 발표문으로 확인하지 않았다.
- 67·76·113행 'out-of-band control'과 117행 '디바이스 안 state machine일 수도'의 관계를 §7.6.1로 확인하지 않았다.
- 26행 'multi-LD time-share', 49·55행 '시간 분할'은 LD 배정(공간 분할, 167행)에 가깝다. 규격 용어로 확인하지 않았다.
- 127~128행 Pond·TPP 수치는 논문 원문과 대조하지 않았다.
- 162행 NVLink 항목은 출처 없는 단정이다.

병합 대상: `chapter13-switching-fabric.md`(PBR·FM 102~119행)와 `chapter02-system-architecture.md`(58~65행 LD 예, 82~85행 Shared FAM이 이미 66~88행에 있음). 다만 'CXL pooling·GFAM'은 독립 검색 의도가 있고 Ch 2 75행·HBM Ch 12 62·132행이 이 글을 직접 가리키므로 다음 조치는 보강(차별화)이다. Ch 2와 같은 2 TB/4 LD 예와 Shared FAM 설명은 Ch 2 링크로 대체하고, HBM Ch 12와 겹치는 3단계 표·Pond/TPP·NVLink 항목은 한쪽으로 정리하며, G-FAM(GFD decoder·SPID·QoS)을 규격 절과 함께 넓힌다. 130행은 1차 출처를 붙이거나 삭제한다. URL·seriesOrder는 유지.

### `chapter05-cxl-4-features.md` — 52점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 5 against the CXL 4.0 release and webinar'가 Streamlined Port 정의, Bundled Port enumerate 방식, Host-initiated PPR(3.1 Perform Maintenance sPPR·hPPR), CVME 약어, 'zero added latency'를 고쳤고, 출처로 CXL 4.0 release(2025-11-18), 4.0 webinar slides(2025-12-03), CXL 3.1 spec(Flex Bus widths, Perform Maintenance, CVME)을 적었다. e2aa6b02는 footer 출처 문구 정리라 근거에 쓰지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 대부분 4.0 발표문·웨비나의 변경 목록을 옮긴 것이다(21~26행 변경 표, 62~71행 웨비나 표, 75행, 81~89행 RAS). 이 글만의 부분은 3.1과 4.0을 가르는 설명(44행 x2는 3.1까지 degraded mode 전용, 81·113~115행 sPPR·hPPR은 3.1에도 있고 4.0은 부팅 시 PPR bit만 더함), 109~111행 'Streamlined Port는 모드가 아니라 port 종류', 46~52행 lane별 원시 전송률 산술이다. 103행은 출처 없는 일반론. 6~12 구간 위쪽. |
| B | 11 | 128 GT/s(28~52행), Bundled·Streamlined Port(58~75행), RAS(77~89행), 호환성(38~40행), 오해(99~115행)까지 흐름은 갖췄다. 65행 SLD-B의 'B', 75행 UIO 정의, 67행 port 간 interleave 동작, 묶음 port 수 한계가 없다. description의 '효과'는 60행 한 문장뿐이고 91~97행 '안 한 것' 표는 26·40행 반복이다. 불확실이 열려 있어 B ≤ 13. |
| C | 3 | 코드·명령·검증 절차·관찰 결과가 없다. 구체 수치는 36·46~52행 원시 전송률뿐인데 128 GT/s에서 유도한 산술이라 C ≤ 9 상한에 걸리고, 그마저 Linux에서 link 속도·폭을 확인할 방법이 없다. 66~69행 Bundled Port의 소프트웨어 영향도 어디서 보이는지 없다. 0~3 구간. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter04-pooling-gfam.md`(다음 편 안내만), `chapter06-cxl-io.md`(17·108행이 이 글을 받음, 겹침 없음), `chapter01-cxl-position.md`, `chapter09-flit-format.md`, `chapter15-ras-performance.md`; 다른 시리즈 `pcie/chapter01-fundamentals.md` 88·130행, `hbm/chapter11-cxl-device-types.md` 133행, modern-recipes part11-16·17(링크만). Ch 1 66~71행 4.0 변경 표가 이 글 21~26·56·64·75·81~89행과, Ch 1 73행이 15·36·40행과, Ch 1 136·151행이 95~97·119~123행과 거의 같다. Ch 9 15·39·168행, Ch 15 75행도 일부 반복. 고유한 것은 62~71행 표와 113~115행. 5~9 구간의 9. |
| E | 7 | 제목의 '128 GT/s'(28~56행)·'Bundled Port'(58~75행), description의 Streamlined Port(73~75행)를 다룬다. description이 약속한 '효과'는 60행과 46~52행 표뿐이다. 제목에 없는 RAS(77~89행)가 본문 1/4쯤이나 '핵심 새 기능' 범위 안이다. 대상 독자 명시 없음. |
| F | 7 | 127행 다음 편 'Ch 6: CXL.io'는 seriesOrder 6 `chapter06-cxl-io.md` 제목과 같다. 131~134행 라벨(Ch 1·2·9·15)을 대상 파일 제목과 대조해 모두 맞다. 17행이 Ch 4와의 위치·기준 자료를 밝히고 40행이 flit 세부를 Ch 9로 넘긴다. 전제 지식 안내가 없다. |
| G | 3 | 17행이 4.0 발표문(2025-11-18)·웨비나(2025-12)를 기준으로 밝히고 36·44·60·62·81행이 발표·웨비나·3.1 규격을 주장에 붙인다. 링크나 절 번호가 본문에 하나도 없어 독자가 대조할 수 없다. a0eeea28의 대조 기록은 factcheck에만 반영했다. |

uncertainties:
- `chapter09-flit-format.md` 15·39·168행은 '4.0 웨비나가 128 GT/s에서도 FEC·CRC가 3.0과 같다'고 쓰는데, a0eeea28은 이 글에서 'FEC·CRC 동일'을 근거 없음으로 지웠다. 다른 글과의 모순이라 웨비나 원문으로 정해야 한다.
- `chapter01-cxl-position.md` 77행은 Bundled Port를 '한 port group으로 묶어 host에 노출'한다고 쓰고, 이 글 66·107행은 기존 소프트웨어가 각 port를 따로 enumerate한다고 쓴다.
- 65행 SLD-B의 'B' 의미를 웨비나로 확인하지 않았다.
- 36·46~52행 원시 전송률은 FLIT·FEC 오버헤드를 빼지 않은 값이라 실효 대역폭과 혼동될 수 있다.
- 15·23·56행 'retimer 최대 4개', 44행 '3.1까지 x2·x1은 degraded mode 전용'은 a0eeea28 기록에 의존했다.
- Ch 15 75행 'CVME granularity 제어'와 이 글 89행 'patrol scrub cycle의 granularity control'의 대상이 다르게 읽힌다.

병합 대상: 후보는 `chapter01-cxl-position.md` 66~73·77·136·151행(4.0 변경 요약). 다만 이 글은 'CXL 4.0 새 기능'이라는 독립 검색 의도가 있는 4.0 상세 장이라 Ch 1로 합치는 것은 맞지 않고, 다음 조치는 보강(차별화)이다. Ch 1의 4.0 상세 표를 줄여 이 글로 넘기고, 이 글에는 SLD-B·UIO 정의, Bundled Port interleave 동작(1차 자료가 있는 범위), Linux에서 link 속도·폭 확인 방법, 발표문·웨비나·3.1 spec 링크와 절 번호를 더한다. Ch 1 79행이 넘긴 '묶었을 때 무엇이 좋아지는지'를 출처로 답할 수 없으면 Ch 1 문장을 좁힌다.

### `chapter06-cxl-io.md` — 62점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 6 (CXL.io) against spec, kernel and pciutils'가 pciutils ls-ecaps.c(DVSEC·DOE 출력 형식), CXL 3.1 Table 8-3(DOE Type 0 Compliance·2 Table Access), pci.ids(class 0502), drivers/cxl/pci.c(class code 바인딩), sysfs-bus-cxl ABI, §3.3.2.1·§7.7.9·§11.4와 대조해 고치고 근거 없는 수치를 지웠다. e2aa6b02는 188행 꼬리말만 바꿨다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 83~88행이 3.1 표 8-3의 DOE Type을 Vendor 1E98h 아래로 정리하고, 92행은 lspci가 DOE 레지스터 상태만 보여 주고 지원 프로토콜 목록은 따로 조회해야 한다고 구분한다. 114~117행은 Direct P2P CXL.mem(§3.3.2.1)과 UIO Direct P2P to HDM(§7.7.9)을 나누고, 142행은 cxl_pci와 cxl_acpi 역할을 가른다. 158~164행 함정은 'P2P는 host overhead 0', 'DOE는 빠르다'를 반박한다. 23~29행 표·55~60행 흐름은 입문 수준이고 UIO(104~108행)는 두 문단. 13~19 구간 중간. |
| B | 12 | DVSEC(44~71행) → DOE(73~102행) → UIO(104~108행) → P2P(110~119행) → Linux(121~142행) → 함정(144~164행) → 정리(166~173행) 흐름은 완성됐다. 52행 DVSEC ID 설명이 66행 ID=0000을 풀지 못하고, DOE는 80행 한 줄, 92행 'DOE discovery로 따로 조회'는 방법이 없으며, UIO의 ordering 차이가 없다. 133·148행 불확실이 열려 있어 B ≤ 13. |
| C | 7 | lspci·sysfs 명령과 예상 출력(64~69·94~100·125~140행)이 있다. 디바이스·커널·pciutils 버전이 없고 128행 장치 ID는 [1234:5678] 자리표시자다. 측정·실패 관찰이 없어 3-1(C ≤ 8)과 AP-C-24를 적용, 4~7 구간 상단. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter05-cxl-4-features.md` 75행(108행과 한 문장), `chapter07-cxl-cache.md`(역할 다름), `chapter11-linux-driver.md` 74행; 다른 시리즈 `modern-recipes/part11-15-pcie-to-cxl.md` 74~87행(lspci·DVSEC·/sys/bus/cxl 블록이 이 글 125~135·64~67행과 거의 같음), `tools/debugging/embedded/chapter08-cxl-link-debug.md` 76~79행(같은 DVSEC 출력), `embedded-security/chapter12-spdm-cma.md` 71~84행(0001h DOE, 상보적), `pcie/chapter03-config-space.md` 145~155행(이 글로 넘김), `modern-recipes/part11-17` 46행. lspci 예 반복은 있으나 프로토콜 층에서 묶는 역할은 구별된다. |
| E | 7 | 제목의 PCIe 차이·DOE·DVSEC가 33~42·73~102·44~71행에서 이행된다. description이 한 줄이라 대상 독자·문제가 드러나지 않고, 제목에 없는 UIO·P2P(104~119행)가 상당 부분이며 73행 'Boutique Protocol Mailbox'는 설명이 없다. |
| F | 7 | 177행 다음 편이 seriesOrder 7 `chapter07-cxl-cache.md` 제목과 일치한다. 181행 Ch 2, 182행 Ch 14, 183행 Embedded Security Ch 12, 184행 Recipes 'Ch 149'(part11-15 seriesOrder 150, 그 시리즈의 seriesOrder−1 관례와 맞음)를 열어 대조했다. 87행 Ch 15 링크도 맞다. 181행 Ch 2는 왜 관련인지 설명이 없고 전제 지식 안내가 없다. |
| G | 4 | 83행 3.1 표 8-3, 116~117행 §3.3.2.1·§7.7.9, 137행 sysfs-bus-cxl ABI, 142행 drivers/cxl/pci.c, 62행 pciutils 해석을 주장에 붙였고 188행이 출처를 적는다. Linux·pciutils 버전과 대조 날짜가 본문에 없고 외부 링크도 없다. |

uncertainties:
- 133행 '(DVSEC 있어야 등록)'·148행 'DVSEC 없으면 CXL.cache·CXL.mem 활성화 못 함'은 `chapter11-linux-driver.md` 74행·`modern-recipes/part11-17-linux-cxl-driver.md` 46행('경고만 하고 CXL.mem 초기화를 건너뜀, probe는 계속')과 다르다. drivers/cxl/pci.c 로컬 clone이 없어 확인하지 않았다(다른 글과의 모순).
- 106행 'PBR fabric에서 UIO 요청자는 SPID로 구분'의 규격 위치 미확인.
- 15행 'CXL.io는 1.1부터 정의, 모든 디바이스에 필수'를 1.1 spec으로 확인하지 않았다.
- 66행 ID=0000이 CXL Device DVSEC인지 본문 설명이 없고 52행 ID 목록을 spec 표로 확인하지 않았다.
- 73행 'Boutique Protocol Mailbox' 이름의 출처가 없다.

### `chapter07-cxl-cache.md` — 59점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 7 (CXL.cache) against CXL 3.1'이 D2H opcode 목록(CLflushed·Invalidate 삭제, RdCurr~CacheFlushed·SnpData/SnpInv/SnpCur로 교체), MESI만 정의·GO 4-bit 인코딩, false sharing의 BISnp 오기, 지어낸 dmesg 출력 교체, 출처 없는 수치 삭제를 CXL 3.1·1.1 spec과 대조해 기록했다. e2aa6b02는 194행 footer만 수정.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 40~43행 채널별 opcode 표, 47~87행 read·write·snoop 단계 흐름, 128~133행 CXL.cache 특유의 ping-pong(D2H RdOwn ↔ H2D snoop) 표, 165~167행 'MOESI·MESIF는 규격에 없다' 구분이 이 글의 구조다. 흐름 표 대부분은 규격을 단계로 옮긴 수준이고, 116~122행 Type 2 시나리오와 122행 '자체 HBM이 있어'는 출처 없는 일반론, 155·171행은 기준 없는 완곡 문장이다. 13~19 구간 하단. |
| B | 12 | 동기(19~32행) → 메시지(34~45행) → 흐름(47~87행) → MESI(89~98행) → Type 1·2(100~122행) → false sharing(124~139행) → Linux(141~149행) → 실수·정리(151~179행)로 흐름은 완성. GO 응답 종류가 91·163행 '4-bit 인코딩'으로만 나오고 흐름 표(56·69행)는 'H2D Resp'뿐이며, Type 1 캐시 크기와 snoop filter 관계(Ch 2 33행)가 없다. 70행 정확성 의문이 열려 있어 B ≤ 13. |
| C | 6 | 실행할 것은 146~148행 `lspci -vvv` 한 번과 예시 출력뿐이고 디바이스·커널·pciutils 버전이 없다. 흐름 표(51~58·64~72·78~85행)는 관찰 절차가 아니고 false sharing(124~139행)에 perf c2c 같은 측정 방법이 없다. 앵커 part1-04(C 6)와 같은 수준. |
| D | 12 | 비교한 글: 같은 시리즈 `chapter06-cxl-io.md` 148행(이 글 143행과 한 문장), `chapter08-cxl-mem.md` 17행(반대 방향, 역할 구별), `chapter03-coherency-model.md` 36·61·68행, `chapter02-system-architecture.md` 33행(102행 atomic 예 반복); 다른 시리즈 `hbm/chapter11-cxl-device-types.md` 27·61행(같은 atomic 예), `performance-engineering/part4-09-cache-coherency.md` 26~31행 MESI 표 ↔ 93~98행, 89행 이하 false sharing ↔ 124~139·157~159행. 일반 설명은 겹치지만 D2H/H2D opcode 흐름은 이 글에만 있어 10~14 구간. |
| E | 7 | 제목의 'D2H·H2D 흐름과 coherency state'를 47~87행 흐름과 89~98행 상태 표가 이행한다. description(5행)이 대상 독자·결과를 말하지 않고 상태와 GO 인코딩의 연결은 91·163행 한 문장씩이다. |
| F | 7 | 183행 다음 편이 seriesOrder 8 `chapter08-cxl-mem.md`와 맞다. 187행 Ch 3, 188행 Ch 6, 189행 Ch 8, 190행 'Embedded Performance Engineering Ch 38'(part4-09, seriesOrder 38, `draft: false`)을 열어 모두 대조했다. 17행이 Ch 6과의 연결을 잡는다. 전제 지식(MESI) 안내가 없다. |
| G | 2 | 194행 footer가 3.1·1.1 spec을 들고 102·167행이 규격을 언급하지만, 절·표 번호·링크가 40행 opcode 목록, 91행 4-bit 인코딩 같은 본문 주장에 붙어 있지 않다. 146~148행 출력에 pciutils 버전이 없다. |

uncertainties:
- 70·177행 RdOwn fill 상태를 바로 'Modified'로 적었다. GO-E(또는 GO-M) 후 쓰기 시 M인지 CXL 3.1 §3.2로 확인하지 않았다.
- 84행 snoop 후 'Shared (또는 Invalid)'의 응답별 상태 전이 미확인.
- 147~148행 lspci 출력(Len=56, 'CXLCap: Cache+ IO+ Mem-')이 실제 pciutils 형식과 같은지 미확인.
- 122행 'Type 2는 자체 HBM이 있어'는 Type 2를 HBM으로 한정하는 일반화다(Ch 2 26행은 'HBM·DRAM').
- 143행 'Type 1은 /sys/bus/cxl/devices/에 메모리 장치로 등장하지 않는다'를 드라이버 소스로 확인하지 않았다.
- 15행 요약의 D2H Req 'read·write·invalidate'는 a0eeea28이 'Invalidate는 D2H opcode가 아니다'라고 지운 것과 긴장이 있다. 40행 목록(CLFlush 등)과 모순이라 단정할 수 없어 오류 확인에 넣지 않았다.
- 42행 'H2D Req'와 81·131행 'H2D Snoop' 용어 불일치.

병합 대상: 병합 대상 없음. Ch 8은 반대 방향 프로토콜이고 part4-09는 일반 MESI 글이라 D2H/H2D opcode 흐름을 받을 자리가 없으며, 'CXL.cache 동작'은 독립 검색 의도가 있다. 다음 조치는 보강: 흐름 표(56·69·83행)에 GO 응답 종류와 3.1 절 번호를 붙이고(G·B), 146~148행 출력의 장비·pciutils 버전을 밝히거나 QEMU Type 1/2로 재현 가능한 확인 절차를 두며(C), 114~122·155·171행 일반론을 규격 근거 문장으로 바꾸거나 지운다(A).

### `chapter08-cxl-mem.md` — 61점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 하위 커밋 'fact-check CXL Ch 8 (CXL.mem) against CXL 3.1 and ndctl'이 granularity 64 B→256 B~16 KB(커널 HDM 코드), create-region 문법(ndctl cxl-create-region.txt), 68B flit 구성(§4.2), 채널 6개·Type 3 HDM-DB(§3.3.2), Tag 정의(§3.3), 지연 수치를 Sun et al. MICRO 2023으로 교체했다. 출처 줄은 'CXL 3.1 spec §3.3, §3.3.2, §4.2; ndctl Documentation/cxl; ndctl cxl/json.c; Linux drivers/cxl; Sun et al., MICRO 2023'. e2aa6b02는 꼬리말 문구만 고쳤다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 100~109행 2-way interleave 표가 SPA 0x80000000~0x80000300을 디바이스 A/B와 DPA 0x0·0x100으로 풀고, 96~98행 단일 디바이스 매핑(2 GB)은 계산이 맞는다. 56~64·72~77행 흐름 표가 tag=42·43으로 응답 짝짓기를 보이고 66행은 응답 순서를 가정할 수 없다고 결론 낸다. 39·50·182행은 HDM-DB를 Type 2·3 모두 쓴다고 짚는다. 41~48행 채널 표·141~144행 flit 표는 규격 요약이고 121·186행은 수치 기준 없이 끝난다. 13~19 구간 중간. |
| B | 13 | load 경로(19~35행) → 채널(37~50행) → 흐름(52~81행) → HDM Decoder(83~109행) → granularity(111~129행) → BISnp(131~135행) → flit·credit(137~148행) → Linux region(150~172행) → 함정·정리(174~198행)로 끝까지 간다. 91행 다단 decoder 연결이 한 줄이고 43·45행 MemInv·Cmp-S/E/M은 표 칸에만 있다. 27·43·45·162행 불확실이 열려 있어 13. |
| C | 8 | 126~128행 `cxl create-region -m -d decoder0.1 -w 2 -g 1024 mem0 mem1`·`cxl list -R`, 152~170행 region 생성·daxctl·numactl과 159~162행 옵션 해설이 있다. 커널·ndctl 버전, 실제 디바이스/QEMU 여부, 실제 출력이 없고 128·169행은 예상 주석이다. 190행 1.35배~약 3배는 논문 출처는 있으나 측정 플랫폼이 본문에 없다. 절차만 있어 8. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter07-cxl-cache.md`, `chapter09-flit-format.md`, `chapter11-linux-driver.md`; 다른 시리즈 `hbm/chapter10-cxl-mem-protocol.md`, `hbm/chapter09-cxl-mem.md`, `performance-engineering/part3-12-cxl-mem-latency.md`. granularity 111~121·184~186행 ↔ HBM Ch 10 129~138·172~174행, 176~178행 ↔ HBM Ch 10 168~170행, 188~190행 Sun et al. ↔ HBM Ch 10 33·176~178행·EPE part3-12 36~46행, 79~81행 ↔ HBM Ch 10 45~55행, 21~35행 ↔ HBM Ch 9 28·40~42행. HBM Ch 10 140·142~152행이 메커니즘을 이 글로 위임하지만 함정 4개 중 3개와 granularity 결론이 반복된다. 5~9 구간 상단. |
| E | 7 | 제목 키워드 M2S·S2M(37~81행)과 HDM Decoder(83~129행)를 모두 다룬다. description(5행)은 정의 한 줄이라 독자가 얻는 것과 대상 독자를 말하지 않는다. |
| F | 7 | 202행 다음 편이 seriesOrder 9 `chapter09-flit-format.md` 제목과 일치한다. 206~209행 Ch 3, Ch 11, HBM·GDDR 심화 seriesOrder 10, Embedded Performance Engineering seriesOrder 54 라벨·번호가 모두 맞다. 17행이 Ch 7과의 방향 차이로 위치를 잡고 146·172행이 세부를 해당 장으로 넘긴다. 전제 지식 안내가 없다. |
| G | 3 | 39·66행 §3.3.2·§3.3이 판과 함께 붙고 190행에 Sun et al., MICRO 2023이 붙는다. 113행 '커널의 HDM decoder 코드'와 125~170행 cxl-cli 명령에 커널·ndctl 버전·파일 위치가 없고 143~144행에 절 번호가 없으며 링크된 1차 출처가 없다. 213행 꼬리말은 공통 문구라 근거 아님. |

uncertainties:
- 45행 S2M NDR의 Cmp-M을 §3.3 NDR opcode 목록과 대조하지 않았다.
- 162행 '-g 256: root decoder 설정과 맞아야 함'이 같아야 하는지 배수면 되는지 region.c로 확인하지 않았다.
- 27행 host 쪽 분기를 '메모리 컨트롤러 … (HDM Decoder)'로 적었는데 CFMWS/host bridge decoder 구조와 맞는지 미확인. a0eeea28이 지운 문장과는 다르다.
- 43행 MemRdData가 'read 요청' 의미 칸과 맞는지 미확인.
- 144행 '4.0의 128 GT/s도 사용'은 본문 출처가 없다.
- 190행 지연 배수의 측정 플랫폼(Sapphire Rapids, 디바이스 3종)은 EPE part3-12 36~46행에만 있다.

### `chapter09-flit-format.md` — 66점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 9 (flit format) against CXL 3.1 and 4.0'이 68B flit 구성(§4.2), 256B flit의 PCIe Flit mode·8 GT/s(§6.4.1.3.1), Latency-Optimized 반쪽 CRC(§6.2.3.1.2), 협상 1회 선택, credit 반환 위치(§4.2·§4.3.5), FEC 3-way interleaved ECC·Physical Layer retry buffer(§5.1.2.3)를 고치고 출처로 3.1 spec §4.2·§4.3.2·§4.3.5·§5.1.2.3·§6.2.3.1.x·§6.4.1.3, 4.0 press release(2025-11-18)·webinar(2025-12-03)를 적었다. e2aa6b02는 출처 각주만 바꿨다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 45~50행 68B 구성, 60~67행 Standard 256B 칸별 크기와 담당 계층, 77~80행 Latency-Optimized 반쪽 구성을 spec 절과 함께 정리하고 69행에서 68B LLR과 256B Physical Layer retry를 대비한다. 82행은 LOpt가 줄이는 것(accumulation latency, 좁은 링크일수록 이득)을, 84~88행은 CRC 세 경우를 표로 나눈다. 146~160행 오해 네 가지도 주제에 맞췄다. 대부분 spec 구조 재정리이고 고유 선택 기준·실패 사례·직접 계산이 없어 13~19 구간 아래쪽. |
| B | 13 | 정의(19~29행) → 비교(31~39행) → 구조(41~90행) → slot(92~106행) → 수신(108~118행) → 세대 혼합(120~131행) → credit(133~142행) → 오해·정리(144~169행)로 완결되고, description의 retry·credit은 52·69·88·156행과 133~142행이 답한다. CXL.io flit 구성은 94행 한 줄, 124~129행 표는 근거가 없다. 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 코드·명령·관찰 절차가 없다. 64~67행 칸 합(256), 79~80행 반쪽 합(128), 50행 528 bit는 글 안에서 맞고 69·82행 수치는 spec 절에 붙어 있다. 124~129행 128·64·32 GT/s는 출처·조건이 없어 C ≤ 8. 96~104행 slot 배치는 '개념적' 예로 관찰 방법(lspci·QEMU Ch 12·trace)이 없다. 앵커 part1-04(C 6) 수준. |
| D | 13 | 비교한 글: 같은 시리즈 `chapter08-cxl-mem.md` 137~146행(143행 68B 요약, 146행에서 이 글로 넘김), `chapter10-arb-mux.md` 34~36·83행(69행과 한 문장), `chapter05-cxl-4-features.md` 38~40행; 다른 시리즈 `pcie/chapter08-dllp.md` 106~130행, `pcie/chapter01-fundamentals.md` 106~117행(PCIe Gen6 FLIT 일반론, 29·56행과 맞닿음), `performance-engineering/part3-11-cxl-interconnect.md` 134행(68B 구성 §4.2 한 줄 반복). CXL 고유의 68B·H/G-Slot·CRD·LOpt(60~90행)는 이 글에만 있다. 10~14 구간. |
| E | 8 | 제목의 세 형식이 41·54·73행 절로 답해지고 description의 '구조와 retry·credit 처리'를 45~90·52·69·88·156·133~142행이 다룬다. 범위가 같고 과장이 없다. 대상 독자와 이 비교로 무엇을 결정하는지가 드러나지 않는다. |
| F | 7 | 173행 다음 편이 seriesOrder 10 `chapter10-arb-mux.md` 제목과 같다. 177~180행 Ch 5, Ch 8, Ch 10, `hbm/chapter04-gddr.md`(seriesOrder 4) 라벨이 맞고 184행 앵커는 Ch 1 167행에 있다. 17행이 Ch 8과의 관계를 밝히고 112~118행이 수신 단계를 나눈다. 전제 지식 안내가 없다. |
| G | 4 | 43행 3.1 §4.2, 56행 §6.4.1.3.1, 58행 §4.3.2 Figure 4-41, 69행 §6.4.1.3.3·§5.1.2.3, 71·106행 §6.2.3.1.1.1, 75·90·152행 §6.2.3.1.2, 139~140행 §4.2·§4.3.5가 주장 옆에 있고 39행이 4.0 웨비나 날짜를 밝힌다. 링크가 없고 124~129행 표, 52행, 160행은 출처 표기가 약하다. |

uncertainties:
- 124~129행 세대 혼합 표(4.0↔3.x '256B, 최대 64 GT/s', 4.0↔2.0 '68B, 최대 32 GT/s')는 본문·커밋 출처 목록에 근거 절이 없다.
- 52행 'PCIe 5.0까지 NRZ 링크에는 FEC가 없다'와 36·56행(256B는 8 GT/s 이상)·67행(FEC 6 B)을 함께 읽으면 8~32 GT/s 256B에서 FEC 적용 여부를 판단할 수 없다. 직접 충돌은 아니라 오류 확인에 넣지 않았다.
- 82행 'x4·64 GT/s에서 왕복 accumulation latency 8 ns': 256 B/32 GB/s는 한 방향 8 ns라 '왕복'의 뜻을 글만으로 가를 수 없다. §6.2.3.1.2 미대조.
- 148행 '256B flit은 64 GT/s 이상으로'가 56행 '8 GT/s 이상에서 씀'과 표현이 달라 오독 여지가 있다.
- 106행 Empty flit, 39행 웨비나 진술을 1차 자료로 확인하지 않았다.

### `chapter10-arb-mux.md` — 63점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 10 (ARB/MUX) against CXL 3.1 §5 and §8.2.5'가 계층 위치, 528-bit/256B flit 경계 중재(§5.3), 고정 우선순위 표 대신 WRR 가중치 레지스터(180h/1C0h, 기본값 0h, §8.2.5.4–5), vLSM 상태(Table 5-1), ALMP 용도와 alternate protocol negotiation(§6.4.1), Bypass(§5.2.1), L0p(§5.1.2.5)를 고쳤고 근거 없는 수치·지어낸 cxl monitor 출력·kprobe 예를 지웠다. e2aa6b02는 꼬리말 정리만 했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 고유한 해석은 71행(vLSM 결합: 한쪽 L1.0 + 다른 쪽 Active → Active), 83행(256B는 replay buffer가 Physical Layer라 Status Synchronization 불필요), 44~49행(기본값 0h인 WRR 레지스터로 '고정 우선순위는 spec에 없음'을 끌어냄), 113~127행(오해 네 가지를 spec 절로 반박)이다. 23~28·55~67·77~81·101~105행 표는 spec을 옮겨 적은 것이고 설계 선택 기준·실패 사례가 없다. 13~19 구간 하단에 가깝게. |
| B | 12 | 위치(19~32행) → 중재 단위(34~36행) → 정책·레지스터(38~49행) → vLSM(51~71행) → ALMP(73~85행) → L0p(87~95행) → 오류 레지스터(97~105행) → Linux(107~109행) → 실수·정리로 흐름은 완성된다. ALMP 형식, State Request→Status 왕복 예, Table 5-2 결합 규칙이 없다. 133행 정리의 vLSM 목록이 59행 Active.PMNAK를 빠뜨리고 61행 예약 L1.1~L1.3을 'L1.x'로 묶어 본문 표와 맞지 않고, 36행 '68B Flit mode의 528-bit flit 경계'는 설명이 없다. 불확실 상한(B ≤ 13)에서 1점 더 뺐다. |
| C | 4 | 실행·관찰할 예제·명령·코드가 없다. 44~47·101~105행 레지스터 offset·비트 필드는 구체적이지만 읽는 방법이 없고, 109행은 mainline drivers/cxl에 ARB/MUX 코드가 없다고 밝힌 뒤 '벤더 도구나 프로토콜 분석기가 필요'로 끝난다. 4~7 구간 하단. |
| D | 14 | 비교한 글: 같은 시리즈 `chapter09-flit-format.md` 71·106·115행(30행과 개념만 맞닿음), `chapter01-cxl-position.md` 97~106행(소개 후 이 글로 넘김), `chapter15-ras-performance.md` 121·194행(목차 언급), `chapter11-linux-driver.md`(겹침 없음); 다른 시리즈 `modern-recipes/part11-15-pcie-to-cxl.md` 54~66행(Flex Bus 시분할 일반론, vLSM·ALMP·레지스터 없음), `pcie/chapter19-advanced-features.md` 76~88행(PCIe L0p 자체, 보완 관계), `tools/debugging/embedded/chapter08-cxl-link-debug.md` 58행(85행과 한 줄). part11-15와 부분 겹침. |
| E | 7 | 제목 '세 프로토콜의 PHY 다중화'와 description을 19~49행이 이행한다. 15·49·127행은 중재가 CXL.io 대 CXL.cachemem 두 링크 계층 사이라고 설명해 제목의 '세' 틀이 결론을 흐린다. 대상 독자·문제가 없다. |
| F | 7 | 17행이 Ch 9와 이 장의 질문을 잇는다. 139행 다음 편이 seriesOrder 11 `chapter11-linux-driver.md` 제목과 일치하고 143~145행 Ch 5·9·11 라벨이 맞으며 149행 앵커도 Ch 1 167행과 맞다. Ch 5를 왜 보라는지 링크 옆에 없다. |
| G | 4 | 21행 §5.0 Figure 5-1, 32행 §5.0·§5.2.1, 36·40행 §5.3, 42행 §8.2.5, 53행 Table 5-1, 71행 Table 5-2, 79~81행 §5.1.2.x, 85행 §6.4.1, 89행 §5.1.2.5, 99행 §8.2.5.1~3, 119행 §8.2.5.4~5가 붙고 21·149행에 3.1, 109행에 검색 시점(2026-10)이 있다. 링크와 커널 버전이 없고 시리즈 제목 '4.0'과 근거 3.1의 차이를 밝히지 않는다. |

uncertainties:
- 46~47행 offset 180h·1C0h, bit 7:4, 49행 기본값 0h를 §8.2.5.4~5 원문으로 확인하지 않았다(a0eeea28 기록 의존).
- 103행 '00b = 1 ms'와 101~105행 offset 00h·04h·08h 미확인.
- 36행 '68B Flit mode에서 528-bit flit 경계'는 68B(544 bit)와 수치가 다르다. 64B+2B CRC에 2B protocol ID를 더한 것으로 기억하지만 §5.3 원문으로 확인하지 않아 오류로 올리지 않았다.
- 133행 'L1.x'가 예약 상태를 포함하는지, Active.PMNAK 누락이 의도인지 Table 5-1로 확인하지 않았다.
- 109행 'drivers/cxl에 ARB/MUX 코드 없음(2026-10 기준)'을 커널 소스로 다시 검색하지 않았다.
- CXL 4.0 spec에서 ARB/MUX 절이 바뀌었는지 확인하지 않았다.

### `chapter11-linux-driver.md` — 55점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 11 (Linux driver) against mainline v7.3-rc6'(PR 본문 294~319행)이 파일 수 33개, Makefile built-in 순서, struct 멤버, probe 순서, cxl_decoder_commit 실제 코드(20×1 ms), region 경로, mailbox 2*HZ polling, opcode 6개, cxl_error_detected, commit 되돌림을 소스로 고쳤고, PR 본문 475~477행은 'torvalds/linux 6c377d19d4a5(2026-10-08, v7.3-rc6)와 줄 단위 재검증'을 적었다. e2aa6b02(#61)는 출처 꼬리말만 바꿨다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 130~134행 '읽을 점'(번호 순서 commit과 -EBUSY, 1 ms 간격 최대 20회와 -EIO/-ETIMEDOUT, cxl_rwsem.region은 호출 쪽이 잡음), 42~50행 Makefile built-in 순서와 이유, 244~258행 오해 네 가지를 소스로 반박한다. 23~36·56~65·71~85·183~192행은 소스를 표로 옮긴 것이고, 해석도 Kernel Debugging Ch 9에 거의 그대로 있어 이 글만의 내용은 266~268행 Type 2 attach·headerlog 정도다. 13~19 구간 하단. |
| B | 13 | 구조(19~52행) → 자료구조(54~65행) → probe(67~87행) → HDM commit(89~134행) → region(136~151행) → mailbox(153~192행) → dax·kmem(194~204행) → RAS(206~228행) → lock(230~240행) → 오해·정리(242~279행)로 description의 경로를 끝까지 따라간다. 각 절이 함수 목록에서 멈추고 실패 시 dmesg·sysfs 상태가 거의 없다. v7.3-rc6 이후 drift 등 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 93~127행 cxl_decoder_commit, 157~172행 cxl_internal_send_cmd, 210~217행 cxl_error_handlers는 v7.3-rc6(15·21행) 발췌라 같은 버전에서 대조할 수 있고 133·178행 수치도 소스 위치가 있다. 실행 절차·관찰 결과가 없다. 87행은 ftrace를 다른 글로 넘기고 204행 daxctl·numactl은 기대 출력이 없다. 소스 읽기만 있어 8. |
| D | 3 | 비교한 글: 같은 시리즈 `chapter10-arb-mux.md`, `chapter12-qemu-emulation.md`(겹침 없음); 다른 시리즈 `tools/debugging/kernel/chapter09-drivers-cxl-walkthrough.md`는 공백 제거 고유 206줄 중 138줄이 같다(직접 계산). 42~52↔34~46행(Makefile 순서표), 56~65↔88~96행(struct표), 91~127↔120~135행 이후(cxl_decoder_commit), 272~279↔282~290행(정리)이 대응하고 Ch 9는 진입점 init·함정표를 더한 상위 집합이다. `modern-recipes/part11-17-linux-cxl-driver.md` 56·115~117행, `kernel/chapter08-cxl-driver-debug.md` 15·101·105행도 42~50·151·246·74·224~225행과 겹친다. 1~4 구간. |
| E | 8 | 제목과 description의 probe·region·mailbox를 67~87·136~151·153~192행이 이행하고 15·21행이 범위를 mainline v7.3-rc6로 못박는다. 17행이 Ch 8에서 잇는 질문을 세운다. 대상 독자와 읽은 뒤 할 일은 밝히지 않는다. |
| F | 5 | 283행 다음 편이 seriesOrder 12 `chapter12-qemu-emulation.md`와 맞고 287·289·290행(Ch 8, Kernel Debugging Ch 8·9)과 294행 앵커도 맞다. 그러나 288행 'Modern Embedded Recipes Ch 151'의 대상 `part11-17-linux-cxl-driver.md`는 seriesOrder 152(0~ 연속, gap·중복 없음)이고 제목도 다르다. 번호가 다른 라벨이라 F ≤ 5. |
| G | 4 | 15·21·262·294행에서 기준 버전(mainline v7.3-rc6, 2026-10-08)을 밝히고 91행 core/hdm.c, 155행 core/mbox.c, 175행 pci.c, 181행 cxlmem.h, 220행 core/ras.c, 268행 cxl.h 주석으로 소스 위치를 붙인다. 커밋 해시·elixir 링크가 본문에 없다. 270행 upstream tracking 언급은 독자용 출처가 아니라 제외. |

uncertainties:
- upstream(torvalds/linux 6c377d19d4a5)을 직접 열어 다시 대조하지 않았다. factcheck는 a0eeea28 기록에 근거한다.
- v7.3-rc6 이후 정식판에서 58~65행 struct 멤버, 71~85행 probe 순서, 178행 CXL_MAILBOX_TIMEOUT_MS, 38행 파일 수 33개가 바뀌었는지 미확인.
- 186~187행 0x0200 Get FW Info, 0x0201 Transfer FW는 커밋의 opcode 6개 수정 목록에 없어 대조 범위였는지 미확인.
- 288행 'Ch 151': Recipes 시리즈 안에서도 seriesOrder−1로 부르는 관례가 있어 사이트 표시 번호가 다를 가능성은 렌더링으로 확인하지 않았다. rubric대로 F ≤ 5 적용.

병합 대상: `src/content/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough.md`(이 글 42~240·272~279행의 표·코드·정리가 Ch 9 34~290행과 거의 같고 Ch 9가 상위 집합). 다음 조치는 보강: 코드 워크스루 정본을 Ch 9 한 곳에 두고, CXL 시리즈 흐름(Ch 10→11→12)상 Ch 11 자리는 남기되 Ch 8의 HDM decoder 필드와 setup_hw_decoder() 레지스터 쓰기를 맞대는 spec↔코드 대응, 266~268행 Type 2 attach처럼 이 시리즈 주제에 묶인 내용으로 차별화하고 중복 표·코드는 Ch 9 링크로 바꾼다. URL·seriesOrder 변경은 시리즈 전체 검토 뒤에.

### `chapter12-qemu-emulation.md` — 61점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 12 (QEMU) against QEMU master and ndctl'이 QEMU master f9587d4(2026-10-06)의 docs/system/devices/cxl.rst, hw/mem/cxl_type3.c, hw/cxl/cxl-host.c, hw/acpi/cxl.c, hw/pci-bridge/pci_expander_bridge.c와 Linux tools/testing/cxl, ndctl README·test를 출처로 버전 매트릭스, memdev=, pc 머신 오류 문구, FMW 256 MiB 규칙, lspci 8086:0d93, CHBS UID=bus_nr, cxl_test 절차, RAS 미구현 주장 8건을 고치고 출처 없는 출력·표를 지웠다. e2aa6b02는 꼬리말 출처 줄만 바꿨다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 23~31행 구성 요소→QEMU 장치·옵션 대응표, 33행 QMP 주입 명령 목록, 107~117행 CHBS UID가 `bus_nr`에서 온다는 설명과 `bus_nr=12`→UID 0x0C, 140행 'cxl_test는 드라이버 로직 반복, QEMU는 PCI 열거·CEDT·레지스터 경로'라는 선택 기준이 이 글의 구성이다. 45~79행 옵션·커널 설정과 152~178행 함정은 cxl.rst와 소스 오류 문구 요약이고 실패 사례·측정이 없다. 13~19 구간 아래쪽. |
| B | 13 | 도입(17행) → 제공 범위(19~33행) → 머신 옵션(35~51행) → Type 3(53~75행) → guest 확인(77~101행) → CEDT(103~117행) → cxl_test(119~140행) → 한계(142~148행) → 함정·정리(150~187행) 흐름은 완성됐다. 27행 switch, 31행 arm `virt`, 28·30행 Dynamic Capacity·HDM-DB는 예시 명령이 없고 101행은 출력 예를 ndctl 문서로 넘긴다. 79행 'Linux 5.18 기준'만 있고 92행 ram region에 필요한 guest 커널 버전이 없다. B ≤ 13. |
| C | 9 | 그대로 실행할 QEMU 명령(58~64행), guest 확인(83~98행), CEDT 덤프(113~114행), cxl_test 절차(125~130행)와 함정별 실제 오류 문구(159·167·175행)가 있다. 기대 관찰은 117행 UID 0x0C와 97~98행 '새 NUMA 노드' 정도이고 직접 돌린 출력·호스트·guest 커널 버전이 없다. 절차만 있어 C ≤ 9. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter11-linux-driver.md`(283행 한 줄 외 겹침 없음), `chapter13-switching-fabric.md`(QEMU 언급 0회); 다른 시리즈 `modern-recipes/part11-16-qemu-cxl-emulation.md`와 상당 부분 겹친다: 75·154 ↔ 65·107행, 83 ↔ 80·98행, 92~98 ↔ 92~95행, 121~130 ↔ 113~122행(문장·명령 거의 같음), 140 ↔ 125행, 146~148 ↔ 131~133행, 159·167 ↔ 106·108행. src/content/blog에서 pxb-cxl·cxl_test·cxl-type3를 쓰는 글은 이 두 편뿐(grep). 고유한 것은 23~33·103~117·133~138·172~178행. |
| E | 7 | 제목·description·15행 요약이 'QEMU 토폴로지 + cxl_test'를 향한다. 제목 '노트북에서 CXL 개발'은 드라이버를 고쳐 다시 올리는 루프를 약속하지만 반복 절차는 140행 한 문장이다. |
| F | 5 | 191행 다음 편이 seriesOrder 13 `chapter13-switching-fabric.md`와 맞고 17·195행 Ch 11 링크도 맞다. 196행 'Modern Embedded Recipes Ch 150'의 대상 `part11-16-qemu-cxl-emulation.md`는 seriesOrder 151이고 seriesOrder 150은 `part11-15-pcie-to-cxl.md`다(Recipes 0~152 gap·중복 없음). 시리즈 전체가 옛 번호 체계여도 글마다 감점하므로 F ≤ 5. |
| G | 4 | 15행에 기준 버전(QEMU master 11.1 개발판, 2026-10)을 밝히고 21행 cxl.rst, 79행 'QEMU 문서는 Linux 5.18 기준', 101행 cxl_type3.c·ndctl cxl-list, 105행 hw/acpi/cxl.c, 124행 ndctl README, 197행 공식 문서 링크를 주장에 붙였다. 소스 경로에 커밋·링크가 없고 ndctl·guest 커널 버전이 없다. |

uncertainties:
- 15행 'QEMU master(11.1 개발판, 2026-10)': 글 date(2026-05-16)와 기준 시점이 다르고 11.1 번호를 저장소로 확인하지 않았다.
- 79행 'Linux 5.18 기준' 목록의 CONFIG_CXL_REGION은 기억으로는 5.18 이후 도입이다. 1차 자료로 확인하지 않아 오류 확인에 넣지 않았다.
- 92행 ram region의 guest 커널 버전을 이 글은 말하지 않는다(Recipes part11-16 109행은 v6.3 이상).
- 28·30행 `num-dc-regions`·`hdm-db`·`x-256b-flit`·`back-invalidate=on` 속성 이름 미확인.
- 33행 QMP 명령 8개를 qapi/cxl.json으로 확인하지 않았다.
- 109행 CHBS Record Length 32, CXL Version 1 값 미확인.
- 51·159·167·175행 오류 문구의 현재 철자 미확인.
- 135~138행 cxl_test 모듈 표가 현재 tools/testing/cxl Kbuild와 맞는지 미확인.
- 178행 'QEMU 문서 예시는 12와 222' 미확인.
- 196행 'Ch 150' 라벨의 렌더링 번호는 빌드 결과로 확인하지 않았다.

### `chapter13-switching-fabric.md` — 61점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 13 (switching, FM) against CXL 3.1 §7'이 CXL 3.1 spec §2.7, §7.1~7.7, §8.2.9.9.9, §9.13.3, 개정 이력, CXL 3.2 발표문, 4.0 웨비나를 출처로 HBR 명칭·PBR 규칙·opcode 등을 고쳤다. e2aa6b02는 각주 문구 정리다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | VCS·vPPB·PPB·Multiple VCS 표(35~40행), FM이 필수가 되는 조건(45행), Bind/Unbind vPPB opcode와 hot-plug 흐름 표(95~98행), 'host는 hot-plug로 보고 CEDT는 바뀌지 않는다'(100·139행), DCD 추가·반납을 FM·디바이스·host로 나눈 표(115~121행), mesh 금지 오해 교정(67·129~131행)이 이 글의 구조다. 완곡 문장이 주장을 대신하지 않는다. 대부분 spec 요약이고 FM 배치 선택 기준·실패 사례가 없어 13~19 구간 중간. |
| B | 13 | 세대 표(23~29행) → switch 내부(31~48행) → HBR/PBR·deadlock(50~67행) → FM 형태·CCI(69~89행) → bind/unbind(91~100행) → DCD(102~121행) → 오해(123~139행) → 정리(141~147행)로 완결된다. 87행 Tunnel Management Command는 이름뿐이고 host OS가 hot-add된 LD·DC extent를 받는 쪽이 없다. 27·143행 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 재현 절차·명령·관찰 결과가 없다. 구체성은 spec 절(48·61·71·93·104·121행)과 opcode(97·98·117·121행)뿐이다. `chapter12-qemu-emulation.md` 28·33행이 `num-dc-regions`·`cxl-add-dynamic-capacity`를 소개하는데도 113~121행 DCD 흐름을 관찰하는 절차가 없다. 4~7 구간 하단. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter12-qemu-emulation.md`(DCD 언급 28·33행뿐), `chapter14-security.md`(겹침 없음), `chapter04-pooling-gfam.md`. Ch 4와 FM 정의(ch04 117 ↔ 71~78·135행), HBR/PBR(ch04 86·104~109 ↔ 52~55·127행), FM 형태 오해(ch04 152~154 ↔ 133~135행), PBR 토폴로지 오해(ch04 156~158 ↔ 129~131행)가 겹친다. ch04 119행이 FM 상세를 이 글로 넘겨 역할 분담은 있다. 다른 시리즈 `hbm/chapter12-cxl-pooling-fabric.md`, `tools/debugging/postmortem/chapter06-cxl-fabric-postmortem.md`는 역할이 다르다. |
| E | 7 | 제목 키워드가 23~29·31~48·69~89·91~100행에서 다뤄진다. description(5행)은 독자가 얻는 결과(bind 흐름, DCD 주체)를 드러내지 않고 분량이 큰 DCD(102~121행)가 제목·description에 없다. |
| F | 7 | 17행이 전제 글 Ch 4를 링크하고 범위를 구분한다. 151행 다음 편이 seriesOrder 14 `chapter14-security.md` 제목과 일치하고 155~158행 Ch 2, Ch 4, HBM Ch 12(seriesOrder 12), postmortem Ch 6(seriesOrder 6) 라벨이 맞으며 모두 `draft: false`다. 렌더 확인이 없어 9 이상 불가. |
| G | 4 | 33행 §7.1, 42행 §7.1.2, 48행 §7.3.3.1, 57행 §2.7, 61·131행 §7.7.5.1, 67행 Figure 7-44, 71·135행 §7.6.1, 80행 §7.6.2, 89행 §7.6.3·DSP0234·DSP0236, 93행 §7.6.6.5~6, 104행 §9.13.3, 121행 §8.2.9.9.9.4가 주장마다 붙는다. 판은 54행 '3.1 spec'과 162행 각주에만 있고 21·28·29행 3.2·4.0 내용은 발표문·웨비나 날짜가 본문에 없다. |

uncertainties:
- 27·143행 'CXL 3.1 … FM API 정의': Bind/Unbind vPPB 등 FM API는 2.0에 이미 있었다는 기억이 있으나 개정 이력 원문을 확인하지 않았다(기억 기반이라 오류 확인 아님).
- 26행 3.0 'PBR switch SW 관점(개요)'과 27행 3.1 'PBR fabric 디코딩·라우팅' 구분 미확인.
- 28행 3.2 항목(CHMU·PPR·TSP 확장), 29행 4.0 'retimer 최대 4개'를 발표문·웨비나로 대조하지 않았다.
- 97·98·117·121행 opcode(5201h·5202h·5604h·5605h·4803h)와 121행 §8.2.9.9.9.4는 a0eeea28 기록에 의존했다.
- 55행 '12-bit PID, fabric당 4096개'는 산술상 맞으나 spec 원문은 열지 않았다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **출처 꼬리말이 시리즈 공통 한 줄이고 본문 주장에 링크가 없음 (10편 전부).** e2aa6b02가 Ch 2~15에 '시리즈 자료 출처 안내' 한 줄 + Ch 1 167행 링크를 넣었다(ch04 185행, ch05 138행, ch06 188행, ch07 194행, ch08 213행, ch09 184행, ch10 149행, ch11 294행, ch12 201행, ch13 162행). 본문에는 spec 절 번호만 있고 spec·발표문·웨비나·소스 링크가 없어(ch12 197행만 예외) G가 10편 모두 2~4점이다. ch05·ch07은 절 번호조차 본문 주장에 붙지 않아 G 3·2.
- **시리즈 제목 'CXL 4.0 Internals'와 근거 판 CXL 3.1의 차이 (4편 이상).** ch10 21·149행, ch13 54·162행, ch09 43행 이하, ch08 39·66행이 3.1 절을 근거로 들고 e2aa6b02는 4.0 spec 문서를 쓰지 않았다고 밝힌다. 4.0 내용은 발표문·웨비나뿐이다(ch05 17행, ch09 39행, ch13 28~29행). 시리즈 도입의 '4.0 기준' 약속과 3.1 근거의 관계를 한 번에 정리해야 한다.
- **실행·관찰 절차가 없는 사양 해설 장 (6편).** ch04 C 4, ch05 C 3, ch07 C 6, ch09 C 6, ch10 C 4, ch13 C 5. a0eeea28이 지어낸 출력을 지운 뒤(ch07 dmesg, ch10 cxl monitor·kprobe) 대체 관찰 절차가 없다. ch12의 QEMU 명령(`x-256b-flit` 30행, `num-dc-regions`·QMP 28·33행)과 연결한 관찰 절차가 시리즈 수준 보강 후보다.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목 → 시리즈 자료 출처 안내'가 같은 순서다(예: ch04 13·142·164·173·177·183행, ch05 13·99·117·125·129·136행, ch08 13·174·192·200·204·211행, ch11 242·272·281·285·292행, ch12 13·150·180·189·193·199행). 각 글에 고유 절이 충분해 P0는 아니지만 루브릭 9절 scaled content 수치 기록 대상이다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 6편).** ch04 ↔ Ch 2·Ch 13·HBM Ch 12(LD 예, Shared FAM, PBR·FM, Pond·TPP), ch05 ↔ Ch 1 66~73·136·151행(4.0 변경 표·요약·정리), ch08 ↔ HBM Ch 10 129~138·168~178행(granularity·함정 3개), ch11 ↔ Kernel Debugging Ch 9(206줄 중 138줄 동일), ch12 ↔ Recipes part11-16(cxl_test·한계·함정), ch13 ↔ ch04(FM 정의·오해 두 개). lspci DVSEC 출력 블록도 ch06 66~67행·Recipes part11-15 84~85행·debugging ch08 78~80행·ch07 147~148행에 반복된다. 정본 한 곳을 정하는 시리즈 간 정리가 필요하다.
- **Recipes 'Ch N' 라벨이 seriesOrder보다 1 작음 (3편).** ch06 184행 'Ch 149'(seriesOrder 150), ch11 288행 'Ch 151'(seriesOrder 152), ch12 196행 'Ch 150'(seriesOrder 151). Recipes 시리즈 본문도 같은 번호를 쓴다(part11-15 135행, part11-16 19행, part11-17 169~170행). rubric F에 따라 ch11·ch12는 F 5로 감점됐고, ch06은 라벨이 seriesOrder−1 관례와는 맞아 감점하지 않았다. Recipes를 'Ch N'으로 가리키는 링크를 한 번에 정리해야 한다.
- **같은 사실의 장별 서술 충돌 (5편 관련, 다른 글과의 모순이라 오류 확인 아님).** FEC·CRC 동일(ch09 15·39·168행 vs a0eeea28의 ch05 삭제 판단), Bundled Port enumerate(ch01 77행 vs ch05 66·107행), DVSEC 부재 시 동작(ch06 133·148행 vs ch11 74행·Recipes part11-17 46행), ARB/MUX '세 프로토콜'(ch10 2행·ch09 173행·ch01 103·106행 vs ch10 15·49·127행 두 링크 계층), CVME granularity(ch15 75행 vs ch05 89행). 1차 자료(웨비나, drivers/cxl/pci.c, 3.1 §5)로 한 번에 정한다.
- **description이 한 문장 정의형 (5편 이상).** ch04·ch06·ch07·ch08·ch13 5행이 대상 독자·얻는 결과를 말하지 않아 E가 7에 머문다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치는 없다. 오류 확인 0건이므로 먼저 '같은 사실의 장별 서술 충돌' 다섯 건을 CXL 4.0 웨비나 원문, drivers/cxl/pci.c(버전 고정), CXL 3.1 §5로 한 번에 정한다. 정한 뒤 반대쪽 글을 고치고 출처를 적은 커밋을 남긴다.
- F 감점 원인인 Recipes 'Ch N' 라벨(ch11 288행, ch12 196행, 같은 관례의 ch06 184행)을 Recipes 쪽 번호 체계 결정과 함께 고친다. 다시 채점할 때 F가 바로 반영된다.
- 병합 검토 4편은 모두 다음 조치가 보강(차별화)이다. 중복 정본 결정이 먼저다: ch11 ↔ Kernel Debugging Ch 9(코드 워크스루 정본), ch05 ↔ Ch 1(4.0 상세 정본은 ch05), ch04 ↔ Ch 2·Ch 13·HBM Ch 12, ch07은 병합 대상 없이 GO 응답·절 번호·관찰 절차 보강.
- 시리즈 단위로 본문 주장 옆에 spec 판·절과 발표문·웨비나·소스 링크(커널·ndctl·QEMU 버전)를 붙이는 방식을 정한다. G가 10편 모두 4 이하인 공통 원인이다.
- 시리즈 제목 '4.0'과 근거 판 3.1의 관계는 사용자가 결정할 사항(시리즈 제목·도입 문구)이라 제안만 남긴다.
- C를 올릴 수 있는 관찰 절차는 ch12 QEMU 환경을 기준으로 ch07·ch09·ch13에 연결하는 방안을 검토한다. 측정·실행 기록이 없으면 수치를 새로 만들지 않는다.
