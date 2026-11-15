# 공개 글 독립 재채점 — 루프 10

평가일 2026-10-19. 루브릭 v1.2·anchors·antipatterns 적용. 기준 HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. Luna 초벌 없이 Sol이 CXL Ch4~13 열 편 원문 전문과 아래 D 양쪽 구간, F 링크 전체 행의 후행 설명 및 실제 대상 title/slug/seriesOrder/draft를 직접 대조했다. 본문·기존보고서·사용자 변경은 수정하지 않았다. 전편 score_status=잠정, confidence=중간.

표의 파일은 `src/content/blog/embedded/hardware/cxl/` 기준이다. D/F의 같은 시리즈 chapter도 그 경로이며 HBM=`src/content/blog/embedded/hardware/hbm/`, PCIe=`src/content/blog/embedded/hardware/pcie/`, Recipes=`src/content/blog/embedded/modern-recipes/`, Performance=`src/content/blog/embedded/performance-engineering/`, Security=`src/content/blog/embedded/embedded-security/`, Kernel=`src/content/blog/tools/debugging/kernel/`, Postmortem=`src/content/blog/tools/debugging/postmortem/`다. 현재 Recipes는 D 비교에 허용된다. anchor_ref는 루프15에서 실제 읽은 `10550ca1:src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md` UART49, `part6-09-isr-api.md` ISR40, `part7-05-kernel-build.md` Build50의 과거 전문이다. 현재 개선본/Part12 rename와 구분한다.

대상과 D 재판정의 HBM chapter12/Recipes part11-16은 기존보고서 커밋 `ba9f7104` 이후 diff가 없다. 따라서 D4·D12 상승은 비교글 변경 효과가 아니라 기존 평가의 역할 분담 인정 범위를 교정한 것이다. [공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 통과를 인용하며 기술 사실 전체 검증·모바일 육안 확인으로 확대하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter04-pooling-gfam.md` | 13 | 12 | 4 | 9 | 7 | 7 | 4 | 56 | 검증됨 | 병합 검토 |
| `chapter05-cxl-4-features.md` | 12 | 11 | 3 | 9 | 7 | 7 | 3 | 52 | 검증됨 | 병합 검토 |
| `chapter06-cxl-io.md` | 14 | 12 | 7 | 11 | 7 | 5 | 4 | 60 | 검증됨 | 보강 |
| `chapter07-cxl-cache.md` | 13 | 12 | 6 | 12 | 7 | 7 | 2 | 59 | 검증됨 | 병합 검토 |
| `chapter08-cxl-mem.md` | 14 | 13 | 8 | 9 | 7 | 7 | 3 | 61 | 검증됨 | 보강 |
| `chapter09-flit-format.md` | 15 | 13 | 6 | 13 | 8 | 7 | 4 | 66 | 검증됨 | 보강 |
| `chapter10-arb-mux.md` | 15 | 12 | 4 | 14 | 7 | 7 | 4 | 63 | 검증됨 | 보강 |
| `chapter11-linux-driver.md` | 14 | 13 | 8 | 3 | 8 | 5 | 4 | 55 | 검증됨 | 병합 검토 |
| `chapter12-qemu-emulation.md` | 14 | 13 | 9 | 11 | 7 | 5 | 4 | 63 | 검증됨 | 보강 |
| `chapter13-switching-fabric.md` | 15 | 13 | 5 | 10 | 7 | 7 | 4 | 61 | 검증됨 | 보강 |

합계596, 평균59.6, 범위52~66. 이전594 대비+2. 보강6편·병합검토4편, 기술 오류확인0편. 총점동의7/10·판정동의10/10. 전편 잠정.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `chapter04-pooling-gfam.md` | 54 | 56 | +2 | 병합 검토 | 병합 검토 | D7→9: HBM위임·조달질문 인정 |
| `chapter05-cxl-4-features.md` | 52 | 52 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter06-cxl-io.md` | 62 | 60 | -2 | 보강 | 보강 | F7→5: Recipes149≠order150;기존상한불일치교정 |
| `chapter07-cxl-cache.md` | 59 | 59 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter08-cxl-mem.md` | 61 | 61 | +0 | 보강 | 보강 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter09-flit-format.md` | 66 | 66 | +0 | 보강 | 보강 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter10-arb-mux.md` | 63 | 63 | +0 | 보강 | 보강 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter11-linux-driver.md` | 55 | 55 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 근거 범위 재검토 |
| `chapter12-qemu-emulation.md` | 61 | 63 | +2 | 보강 | 보강 | D9→11: setup레시피와지원범위/CEDT역할분담인정 |
| `chapter13-switching-fabric.md` | 61 | 61 | +0 | 보강 | 보강 | A~G 점수 동의; 근거 범위 재검토 |

## 정확성 게이트와 채택·기각

`git show --format=%B --no-patch a0eeea28`에서 Ch4~13의 개별 fact-check 기록을 직접 읽었다. Ch4의3.1§2.4/7, Ch5의4.0발표2025-11-18/웨비나2025-12-03, Ch6의Table8-3/pciutils/pci.ids/Linux, Ch7의3.1/1.1 opcode/MESI, Ch8의3.1§3.3/4.2·ndctl·Sun2023, Ch9의§4.2/4.3/6.2/6.4·4.0웨비나, Ch10의§5/8.2.5, Ch11의torvalds/linux6c377d19d4a5(v7.3-rc6)·ndctl, Ch12의QEMU f9587d4(2026-10-06)·Linux tools/testing/cxl·ndctl, Ch13의3.1§7/9.13.3·DMTF/3.2발표/4.0웨비나가 수정 내용과 출처를 명시한다. 루브릭3-1의 기록 승계 조건에 따라 검증됨을 유지한다. e2aa6b02 footer정리는새팩트체크로세지않았다. 이번에 CXL3.1 PDF 전체를 다시 열거나 QEMU/Linux를 실행했다고 주장하지 않는다. 기록 밖 주장은 개별 uncertainties에 남긴다.

초벌 Luna 제안은 이 묶음에 없고 기존 published-loop-10의 정확한 A/B/C/E/G 인용을 전문과 대조해 채택했다. 기존 D4·D12의 부분 반복 자체는 채택하지만 역할 위임을 무시한 강한 중복 결론은 기각한다. 비교글 diff가 없어 기존 평가 재판정임을 명시한다. F6의 ‘seriesOrder−1 관례라 허용’은 같은 보고서 F11/F12와 기준이 달라 기각하고 세 편 모두 F≤5를 적용한다. 링크 라벨 문제를 기술 factcheck 오류로 전이하지 않는다.

FM의 out-of-band control과 구현 위치, 프로토콜3개와 링크인터페이스2개, 요약의 일부상태 생략, 제목에 DCD를 안 쓴 사실은 각각 다른 추상화·범위이므로 신규 내부오류로 확정하지 않는다. ch07 RdOwn/M 상태·ch08 opcode·ch09 방향별packing은 실제 규격 대조 전 오류확인이 아니다. B≤13, C의 출처/환경/실행 상한, F오번호상한을 적용했다.

## 글별 근거

### chapter04-pooling-gfam.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter04-pooling-gfam.md`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59) 안의 'fix(content): fact-check CXL Ch 4 against CXL 3.1 §2.4 and §7'이 HBR 풀이(용어집·§7), Coherency Domain ID 삭제, PBR 토폴로지(§7.7), FM 정의(§7.6.1), G-FAM(§2.4.3), Shared FAM 일관성(§2.4.4)을 규격과 대조해 고쳤다. 이후 e2aa6b02(출처 꼬리말)·b97ac869(Ch 13 앵커·문장)는 링크·출처 문구만 바꿨다. 130행 Azure M-series 문장은 커밋 본문에 출처가 없어 uncertainties로 둔다.

uncertainties:
- 130행 'Azure M-series VM 프리뷰에서 CXL 메모리 확장 발표(Astera Labs Leo, 2025년 11월)': 커밋 본문과 185행 출처 목록에 근거가 없고 1차 발표문으로 확인하지 않았다.
- 67·76·113행 'out-of-band control'과 117행 '디바이스 안 state machine일 수도'의 관계를 §7.6.1로 확인하지 않았다.
- 26행 'multi-LD time-share', 49·55행 '시간 분할'은 LD 배정(공간 분할, 167행)에 가깝다. 규격 용어로 확인하지 않았다.
- 127~128행 Pond·TPP 수치는 논문 원문과 대조하지 않았다.
- 162행 NVLink 항목은 출처 없는 단정이다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 G-FAM 절(89~100행: SPID로 요청자 구분, GFD decoder의 HPA→DPA 변환, §2.4.3)과 규격 근거로 통념을 고친 '자주 하는 실수'(152~158행: FM 형태는 규격이 정하지 않음, PBR 토폴로지는 deadlock-free routing이면 됨 §7.7)다. 19~33행 3단계 표는 HBM Ch 12 49~62행과 같은 뼈대, 58~65행 LD 재할당 예는 Ch 2 66~73행과 같은 숫자다. 132~140행 Composability는 일반론, 162행 NVLink 항목은 근거 없는 단정이다. 13~19 구간 하단. |
| B | 12 | 2.0 switching(35~45행) → pooling(47~67행) → 3.0 fabric(69~87행) → G-FAM(89~100행) → PBR(102~111행) → FM(113~119행) → 사례·실수·정리(121~171행) 흐름은 완결됐다. G-FAM 표(93~98행)의 QoS는 한 줄이고 FM 세부·PBR deadlock 조건은 Ch 13으로 넘긴다. 67·76·113행 control plane과 117행 구현 위치는 서로 다른 축이므로 모순으로 확정하지 않는다. 130행 출처 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 4 | 실행·검증 절차가 없는 개념 글이다. sysfs·`cxl list`처럼 LD 할당을 관찰할 방법이 없고 58~65행 LD 표는 가상의 운영 예다. 127~128행 Pond(7%, 1~5%)·TPP(18%)는 논문은 밝혔으나 측정 환경이 없다. 4~7 구간 하단. |
| D | 9 | chapter02-system-architecture.md66~88행 ↔ 이 글58~65·82~85행 LD/Shared FAM, chapter13-switching-fabric.md50~89행 ↔102~119행 PBR/FM 반복. 다른 시리즈 HBM chapter12-cxl-pooling-fabric.md49~62·91·108·128~142행 ↔19~33·127~128·160~162행은 세대표·연구·NVLink 결론이 겹친다. 다만 HBM19·62·132행은 coherency/FM 메커니즘을 이 글로 명시 위임하고21~45·66~108행은 용량 조달/hot-cold 판단이다. 원평가의 전면 중복 해석을 낮춰7→9, GFD/SPID89~100행의 독립성을 인정한다. |
| E | 7 | 제목(2행)과 description(5행)의 pooling·fabric·GFAM을 47~67·69~87·89~100행이 다룬다. 과장은 없다. GFAM 절이 표 하나와 한 문장(100행)이라 제목 키워드 하나가 얇고, 대상 독자·구체 문제가 드러나지 않는다. |
| F | 7 | 175행next chapter05 order5/title일치.179~181행chapter02/order2·chapter13/order13·HBM chapter12/order12 제목/공개상태 대조.180행 후행의 switch/FM통신은 ch13 35~48·69~100행이 실제 다룬다.119행#fabric-manager는 ch13 69행 heading,185행 출처 앵커는 ch01 167행 존재.17행 전제/119행 역할 위임으로7. |
| G | 4 | 91행 CXL 3.1 §2.4.3, 117행 §7.6.1, 158행 §7.7을 주장에 붙였고, 127~128행 Pond·TPP는 학회·연도(ASPLOS 2023)를 밝혔다. 외부 링크가 없고 130행 Azure·Leo 문장은 출처가 없으며 150행 HDM-DB 2단계 write는 절 번호가 없다. |

병합 대상: chapter02의LD/SharedFAM 및chapter13의PBR/FM 공통요약. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter05-cxl-4-features.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter05-cxl-4-features.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 5 against the CXL 4.0 release and webinar'가 Streamlined Port 정의, Bundled Port enumerate 방식, Host-initiated PPR(3.1 Perform Maintenance sPPR·hPPR), CVME 약어, 'zero added latency'를 고쳤고, 출처로 CXL 4.0 release(2025-11-18), 4.0 webinar slides(2025-12-03), CXL 3.1 spec(Flex Bus widths, Perform Maintenance, CVME)을 적었다. e2aa6b02는 footer 출처 문구 정리라 근거에 쓰지 않았다.

uncertainties:
- `chapter09-flit-format.md` 15·39·168행은 '4.0 웨비나가 128 GT/s에서도 FEC·CRC가 3.0과 같다'고 쓰는데, a0eeea28은 이 글에서 'FEC·CRC 동일'을 근거 없음으로 지웠다. 다른 글과의 모순이라 웨비나 원문으로 정해야 한다.
- `chapter01-cxl-position.md` 77행은 Bundled Port를 '한 port group으로 묶어 host에 노출'한다고 쓰고, 이 글 66·107행은 기존 소프트웨어가 각 port를 따로 enumerate한다고 쓴다.
- 65행 SLD-B의 'B' 의미를 웨비나로 확인하지 않았다.
- 36·46~52행 원시 전송률은 FLIT·FEC 오버헤드를 빼지 않은 값이라 실효 대역폭과 혼동될 수 있다.
- 15·23·56행 'retimer 최대 4개', 44행 '3.1까지 x2·x1은 degraded mode 전용'은 a0eeea28 기록에 의존했다.
- Ch 15 75행 'CVME granularity 제어'와 이 글 89행 'patrol scrub cycle의 granularity control'의 대상이 다르게 읽힌다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 대부분 4.0 발표문·웨비나의 변경 목록을 옮긴 것이다(21~26행 변경 표, 62~71행 웨비나 표, 75행, 81~89행 RAS). 이 글만의 부분은 3.1과 4.0을 가르는 설명(44행 x2는 3.1까지 degraded mode 전용, 81·113~115행 sPPR·hPPR은 3.1에도 있고 4.0은 부팅 시 PPR bit만 더함), 109~111행 'Streamlined Port는 모드가 아니라 port 종류', 46~52행 lane별 원시 전송률 산술이다. 103행은 출처 없는 일반론. 6~12 구간 위쪽. |
| B | 11 | 128 GT/s(28~52행), Bundled·Streamlined Port(58~75행), RAS(77~89행), 호환성(38~40행), 오해(99~115행)까지 흐름은 갖췄다. 65행 SLD-B의 'B', 75행 UIO 정의, 67행 port 간 interleave 동작, 묶음 port 수 한계가 없다. description의 '효과'는 60행 한 문장뿐이고 91~97행 '안 한 것' 표는 26·40행 반복이다. 불확실이 열려 있어 B ≤ 13. |
| C | 3 | 코드·명령·검증 절차·관찰 결과가 없다. 구체 수치는 36·46~52행 원시 전송률뿐인데 128 GT/s에서 유도한 산술이라 C ≤ 9 상한에 걸리고, 그마저 Linux에서 link 속도·폭을 확인할 방법이 없다. 66~69행 Bundled Port의 소프트웨어 영향도 어디서 보이는지 없다. 0~3 구간. |
| D | 9 | chapter01-cxl-position.md66~73·75~79행 ↔ 이 글21~26·38~40·58~75·81~89행에서 4.0 변경/Port/PPR 요약 반복. 같은 시리즈 chapter09-flit-format.md15·39행 ↔38~40행은 flit 유지 한 문장이다. 다른 시리즈 Recipes part11-15-pcie-to-cxl.md54~68행은 Flex Bus 일반론으로 이 글62~71행 enumerate/SLD-B 표와 다르다. 고유한 비교표가 있지만 요약층 중복이 커9 유지. |
| E | 7 | 제목의 '128 GT/s'(28~56행)·'Bundled Port'(58~75행), description의 Streamlined Port(73~75행)를 다룬다. description이 약속한 '효과'는 60행과 46~52행 표뿐이다. 제목에 없는 RAS(77~89행)가 본문 1/4쯤이나 '핵심 새 기능' 범위 안이다. 대상 독자 명시 없음. |
| F | 7 | 127행next chapter06 order6/title 및 DVSEC44~71·DOE73~102행 설명 일치.131~134행 chapter01/02/09/15는 실제title/order1/2/9/15이고 공개.17행 기준자료/이전편,40행flit세부 위임 맞음.렌더·독자전제 안내 부족으로7. |
| G | 3 | 17행이 4.0 발표문(2025-11-18)·웨비나(2025-12)를 기준으로 밝히고 36·44·60·62·81행이 발표·웨비나·3.1 규격을 주장에 붙인다. 링크나 절 번호가 본문에 하나도 없어 독자가 대조할 수 없다. a0eeea28의 대조 기록은 factcheck에만 반영했다. |

병합 대상: chapter01의4.0변경요약. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter06-cxl-io.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter06-cxl-io.md`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 6 (CXL.io) against spec, kernel and pciutils'가 pciutils ls-ecaps.c(DVSEC·DOE 출력 형식), CXL 3.1 Table 8-3(DOE Type 0 Compliance·2 Table Access), pci.ids(class 0502), drivers/cxl/pci.c(class code 바인딩), sysfs-bus-cxl ABI, §3.3.2.1·§7.7.9·§11.4와 대조해 고치고 근거 없는 수치를 지웠다. e2aa6b02는 188행 꼬리말만 바꿨다.

uncertainties:
- 133행 '(DVSEC 있어야 등록)'·148행 'DVSEC 없으면 CXL.cache·CXL.mem 활성화 못 함'은 `chapter11-linux-driver.md` 74행·`modern-recipes/part11-17-linux-cxl-driver.md` 46행('경고만 하고 CXL.mem 초기화를 건너뜀, probe는 계속')과 다르다. drivers/cxl/pci.c 로컬 clone이 없어 확인하지 않았다(다른 글과의 모순).
- 106행 'PBR fabric에서 UIO 요청자는 SPID로 구분'의 규격 위치 미확인.
- 15행 'CXL.io는 1.1부터 정의, 모든 디바이스에 필수'를 1.1 spec으로 확인하지 않았다.
- 66행 ID=0000이 CXL Device DVSEC인지 본문 설명이 없고 52행 ID 목록을 spec 표로 확인하지 않았다.
- 73행 'Boutique Protocol Mailbox' 이름의 출처가 없다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 83~88행이 3.1 표 8-3의 DOE Type을 Vendor 1E98h 아래로 정리하고, 92행은 lspci가 DOE 레지스터 상태만 보여 주고 지원 프로토콜 목록은 따로 조회해야 한다고 구분한다. 114~117행은 Direct P2P CXL.mem(§3.3.2.1)과 UIO Direct P2P to HDM(§7.7.9)을 나누고, 142행은 cxl_pci와 cxl_acpi 역할을 가른다. 158~164행 함정은 'P2P는 host overhead 0', 'DOE는 빠르다'를 반박한다. 23~29행 표·55~60행 흐름은 입문 수준이고 UIO(104~108행)는 두 문단. 13~19 구간 중간. |
| B | 12 | DVSEC(44~71행) → DOE(73~102행) → UIO(104~108행) → P2P(110~119행) → Linux(121~142행) → 함정(144~164행) → 정리(166~173행) 흐름은 완성됐다. 52행 DVSEC ID 설명이 66행 ID=0000을 풀지 못하고, DOE는 80행 한 줄, 92행 'DOE discovery로 따로 조회'는 방법이 없으며, UIO의 ordering 차이가 없다. 133·148행 불확실이 열려 있어 B ≤ 13. |
| C | 7 | lspci·sysfs 명령과 예상 출력(64~69·94~100·125~140행)이 있다. 디바이스·커널·pciutils 버전이 없고 128행 장치 ID는 [1234:5678] 자리표시자다. 측정·실패 관찰이 없어 3-1(C ≤ 8)과 AP-C-24를 적용, 4~7 구간 상단. |
| D | 11 | 같은 시리즈 chapter11-linux-driver.md71~85행 ↔ 이 글125~142행 PCI 발견/DVSEC/memdev의 일부 반복. 다른 시리즈 Recipes part11-15-pcie-to-cxl.md74~92행 ↔64~69·125~135행 lspci/CXLCap/sysfs 출력 반복. Embedded Security chapter12-spdm-cma.md71~86행 ↔75~102행은 DOE 일반 설명만 공유하며 PCI-SIG SPDM type과 CXL Vendor1E98 type은 상보적이다. 이 글83~88·114~119행 DOE type/P2P 경로 구분이 남아11. |
| E | 7 | 제목의 PCIe 차이·DOE·DVSEC가 33~42·73~102·44~71행에서 이행된다. description이 한 줄이라 대상 독자·문제가 드러나지 않고, 제목에 없는 UIO·P2P(104~119행)가 상당 부분이며 73행 'Boutique Protocol Mailbox'는 설명이 없다. |
| F | 5 | 177행next chapter07 order7·47~87행 메시지흐름 약속 이행.181~183행chapter02/order2·chapter14/order14·Security chapter12/order12 title대조.182행 후행 DOE 위 SPDM/IDE_KM은 ch14 85~97행의 PCIe DOE/MCTP secure session과 CXL_IDE_KM으로 이행.184행 Recipes part11-15-pcie-to-cxl.md 실제order150인데 Ch149라 오번호.같은 옛 관례를 ch11/12에는 감점하고 여기만 허용했던 기존평가를 교정해7→5. |
| G | 4 | 83행 3.1 표 8-3, 116~117행 §3.3.2.1·§7.7.9, 137행 sysfs-bus-cxl ABI, 142행 drivers/cxl/pci.c, 62행 pciutils 해석을 주장에 붙였고 188행이 출처를 적는다. Linux·pciutils 버전과 대조 날짜가 본문에 없고 외부 링크도 없다. |

병합 대상: 위 D 공통요약만 축약; 독립목적 유지. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. Recipes 장 번호 라벨 정정. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter07-cxl-cache.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter07-cxl-cache.md`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 7 (CXL.cache) against CXL 3.1'이 D2H opcode 목록(CLflushed·Invalidate 삭제, RdCurr~CacheFlushed·SnpData/SnpInv/SnpCur로 교체), MESI만 정의·GO 4-bit 인코딩, false sharing의 BISnp 오기, 지어낸 dmesg 출력 교체, 출처 없는 수치 삭제를 CXL 3.1·1.1 spec과 대조해 기록했다. e2aa6b02는 194행 footer만 수정.

uncertainties:
- 70·177행 RdOwn fill 상태를 바로 'Modified'로 적었다. GO-E(또는 GO-M) 후 쓰기 시 M인지 CXL 3.1 §3.2로 확인하지 않았다.
- 84행 snoop 후 'Shared (또는 Invalid)'의 응답별 상태 전이 미확인.
- 147~148행 lspci 출력(Len=56, 'CXLCap: Cache+ IO+ Mem-')이 실제 pciutils 형식과 같은지 미확인.
- 122행 'Type 2는 자체 HBM이 있어'는 Type 2를 HBM으로 한정하는 일반화다(Ch 2 26행은 'HBM·DRAM').
- 143행 'Type 1은 /sys/bus/cxl/devices/에 메모리 장치로 등장하지 않는다'를 드라이버 소스로 확인하지 않았다.
- 15행 요약의 D2H Req 'read·write·invalidate'는 a0eeea28이 'Invalidate는 D2H opcode가 아니다'라고 지운 것과 긴장이 있다. 40행 목록(CLFlush 등)과 모순이라 단정할 수 없어 오류 확인에 넣지 않았다.
- 42행 'H2D Req'와 81·131행 'H2D Snoop' 용어 불일치.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 40~43행 채널별 opcode 표, 47~87행 read·write·snoop 단계 흐름, 128~133행 CXL.cache 특유의 ping-pong(D2H RdOwn ↔ H2D snoop) 표, 165~167행 'MOESI·MESIF는 규격에 없다' 구분이 이 글의 구조다. 흐름 표 대부분은 규격을 단계로 옮긴 수준이고, 116~122행 Type 2 시나리오와 122행 '자체 HBM이 있어'는 출처 없는 일반론, 155·171행은 기준 없는 완곡 문장이다. 13~19 구간 하단. |
| B | 12 | 동기(19~32행) → 메시지(34~45행) → 흐름(47~87행) → MESI(89~98행) → Type 1·2(100~122행) → false sharing(124~139행) → Linux(141~149행) → 실수·정리(151~179행)로 흐름은 완성. GO 응답 종류가 91·163행 '4-bit 인코딩'으로만 나오고 흐름 표(56·69행)는 'H2D Resp'뿐이며, Type 1 캐시 크기와 snoop filter 관계(Ch 2 33행)가 없다. 70행 정확성 의문이 열려 있어 B ≤ 13. |
| C | 6 | 실행할 것은 146~148행 `lspci -vvv` 한 번과 예시 출력뿐이고 디바이스·커널·pciutils 버전이 없다. 흐름 표(51~58·64~72·78~85행)는 관찰 절차가 아니고 false sharing(124~139행)에 perf c2c 같은 측정 방법이 없다. 앵커 part1-04(C 6)와 같은 수준. |
| D | 12 | chapter03-coherency-model.md36~68행 ↔ 이 글47~98행 coherence 큰 그림은 반복하지만 D2H/H2D 요청 흐름의 세분화가 다르다. 다른 시리즈 Performance part4-09-cache-coherency.md26~31·89~104행 ↔93~98·124~139행 MESI/false sharing 중복. 해당 비교글은 CPU PMU·MOESI/Directory가 중심이고 이 글40~85행 opcode/흐름은 별도이므로12 유지. |
| E | 7 | 제목의 'D2H·H2D 흐름과 coherency state'를 47~87행 흐름과 89~98행 상태 표가 이행한다. description(5행)이 대상 독자·결과를 말하지 않고 상태와 GO 인코딩의 연결은 91·163행 한 문장씩이다. |
| F | 7 | 183행next chapter08 order8/title·37~129행 M2S/S2M/HDM 내용일치.187~189행chapter03/06/08 실제order3/6/8,190행Performance part4-09-cache-coherency.md order38/title맞고 공개.17행CXL.io와질문구분.렌더/MESI전제부족으로7. |
| G | 2 | 194행 footer가 3.1·1.1 spec을 들고 102·167행이 규격을 언급하지만, 절·표 번호·링크가 40행 opcode 목록, 91행 4-bit 인코딩 같은 본문 주장에 붙어 있지 않다. 146~148행 출력에 pciutils 버전이 없다. |

병합 대상: 병합대상없음;Performance MESI/false-sharing 정본으로연결. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter08-cxl-mem.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md`

score_status: 잠정 · score: 61 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 하위 커밋 'fact-check CXL Ch 8 (CXL.mem) against CXL 3.1 and ndctl'이 granularity 64 B→256 B~16 KB(커널 HDM 코드), create-region 문법(ndctl cxl-create-region.txt), 68B flit 구성(§4.2), 채널 6개·Type 3 HDM-DB(§3.3.2), Tag 정의(§3.3), 지연 수치를 Sun et al. MICRO 2023으로 교체했다. 출처 줄은 'CXL 3.1 spec §3.3, §3.3.2, §4.2; ndctl Documentation/cxl; ndctl cxl/json.c; Linux drivers/cxl; Sun et al., MICRO 2023'. e2aa6b02는 꼬리말 문구만 고쳤다.

uncertainties:
- 45행 S2M NDR의 Cmp-M을 §3.3 NDR opcode 목록과 대조하지 않았다.
- 162행 '-g 256: root decoder 설정과 맞아야 함'이 같아야 하는지 배수면 되는지 region.c로 확인하지 않았다.
- 27행 host 쪽 분기를 '메모리 컨트롤러 … (HDM Decoder)'로 적었는데 CFMWS/host bridge decoder 구조와 맞는지 미확인. a0eeea28이 지운 문장과는 다르다.
- 43행 MemRdData가 'read 요청' 의미 칸과 맞는지 미확인.
- 144행 '4.0의 128 GT/s도 사용'은 본문 출처가 없다.
- 190행 지연 배수의 측정 플랫폼(Sapphire Rapids, 디바이스 3종)은 EPE part3-12 36~46행에만 있다.
- 176행소제목cache miss마다트래픽과178행답변cache hit에는없음/miss때만의문답은표현정리가필요하다.별도기술결론이충돌한다고확정하지않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 100~109행 2-way interleave 표가 SPA 0x80000000~0x80000300을 디바이스 A/B와 DPA 0x0·0x100으로 풀고, 96~98행 단일 디바이스 매핑(2 GB)은 계산이 맞는다. 56~64·72~77행 흐름 표가 tag=42·43으로 응답 짝짓기를 보이고 66행은 응답 순서를 가정할 수 없다고 결론 낸다. 39·50·182행은 HDM-DB를 Type 2·3 모두 쓴다고 짚는다. 41~48행 채널 표·141~144행 flit 표는 규격 요약이고 121·186행은 수치 기준 없이 끝난다. 13~19 구간 중간. |
| B | 13 | load 경로(19~35행) → 채널(37~50행) → 흐름(52~81행) → HDM Decoder(83~109행) → granularity(111~129행) → BISnp(131~135행) → flit·credit(137~148행) → Linux region(150~172행) → 함정·정리(174~198행)로 끝까지 간다. 91행 다단 decoder 연결이 한 줄이고 43·45행 MemInv·Cmp-S/E/M은 표 칸에만 있다. 27·43·45·162행 불확실이 열려 있어 13. |
| C | 8 | 126~128행 `cxl create-region -m -d decoder0.1 -w 2 -g 1024 mem0 mem1`·`cxl list -R`, 152~170행 region 생성·daxctl·numactl과 159~162행 옵션 해설이 있다. 커널·ndctl 버전, 실제 디바이스/QEMU 여부, 실제 출력이 없고 128·169행은 예상 주석이다. 190행 1.35배~약 3배는 논문 출처는 있으나 측정 플랫폼이 본문에 없다. 절차만 있어 8. |
| D | 9 | chapter09-flit-format.md41~52행 ↔ 이 글137~146행 68B 포맷 요약; chapter11-linux-driver.md136~151행 ↔150~172행 region 절차는 사용자/커널 층 차이. 다른 시리즈 HBM chapter10-cxl-mem-protocol.md45~55·129~138·168~178행 ↔72~81·111~121·176~190행 partial write/granularity/함정 결론 반복. Performance part3-12-cxl-mem-latency.md36~46행 ↔190행 Sun 연구 수치 반복. HBM19·140~152행 위임으로 역할 차이가 있지만 반복 결론이 남아9. |
| E | 7 | 제목 키워드 M2S·S2M(37~81행)과 HDM Decoder(83~129행)를 모두 다룬다. description(5행)은 정의 한 줄이라 독자가 얻는 것과 대상 독자를 말하지 않는다. |
| F | 7 | 202행next chapter09 order9/title및포맷41~90행대응.206~209행chapter03/order3·chapter11/order11·HBM chapter10/order10·Performance part3-12-cxl-mem-latency.md/order54 title일치/공개.146·172행위임이실제flit구성/커널경로로이어짐.208행후행설명은없고 제목프로토콜분해는 HBM의왕복/credit설명과맞음.7. |
| G | 3 | 39·66행 §3.3.2·§3.3이 판과 함께 붙고 190행에 Sun et al., MICRO 2023이 붙는다. 113행 '커널의 HDM decoder 코드'와 125~170행 cxl-cli 명령에 커널·ndctl 버전·파일 위치가 없고 143~144행에 절 번호가 없으며 링크된 1차 출처가 없다. 213행 꼬리말은 공통 문구라 근거 아님. |

병합 대상: 위 D 공통요약만 축약; 독립목적 유지. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter09-flit-format.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter09-flit-format.md`

score_status: 잠정 · score: 66 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 9 (flit format) against CXL 3.1 and 4.0'이 68B flit 구성(§4.2), 256B flit의 PCIe Flit mode·8 GT/s(§6.4.1.3.1), Latency-Optimized 반쪽 CRC(§6.2.3.1.2), 협상 1회 선택, credit 반환 위치(§4.2·§4.3.5), FEC 3-way interleaved ECC·Physical Layer retry buffer(§5.1.2.3)를 고치고 출처로 3.1 spec §4.2·§4.3.2·§4.3.5·§5.1.2.3·§6.2.3.1.x·§6.4.1.3, 4.0 press release(2025-11-18)·webinar(2025-12-03)를 적었다. e2aa6b02는 출처 각주만 바꿨다.

uncertainties:
- 124~129행 세대 혼합 표(4.0↔3.x '256B, 최대 64 GT/s', 4.0↔2.0 '68B, 최대 32 GT/s')는 본문·커밋 출처 목록에 근거 절이 없다.
- 52행 'PCIe 5.0까지 NRZ 링크에는 FEC가 없다'와 36·56행(256B는 8 GT/s 이상)·67행(FEC 6 B)을 함께 읽으면 8~32 GT/s 256B에서 FEC 적용 여부를 판단할 수 없다. 직접 충돌은 아니라 오류 확인에 넣지 않았다.
- 82행 'x4·64 GT/s에서 왕복 accumulation latency 8 ns': 256 B/32 GB/s는 한 방향 8 ns라 '왕복'의 뜻을 글만으로 가를 수 없다. §6.2.3.1.2 미대조.
- 148행 '256B flit은 64 GT/s 이상으로'가 56행 '8 GT/s 이상에서 씀'과 표현이 달라 오독 여지가 있다.
- 106행 Empty flit, 39행 웨비나 진술을 1차 자료로 확인하지 않았다.
- 100~102행개념slot예의M2S Req/D2H Req/S2M DRS 방향혼합은규격의실제허용packing과대조전이므로신규오류로올리지않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 15 | 45~50행 68B 구성, 60~67행 Standard 256B 칸별 크기와 담당 계층, 77~80행 Latency-Optimized 반쪽 구성을 spec 절과 함께 정리하고 69행에서 68B LLR과 256B Physical Layer retry를 대비한다. 82행은 LOpt가 줄이는 것(accumulation latency, 좁은 링크일수록 이득)을, 84~88행은 CRC 세 경우를 표로 나눈다. 146~160행 오해 네 가지도 주제에 맞췄다. 대부분 spec 구조 재정리이고 고유 선택 기준·실패 사례·직접 계산이 없어 13~19 구간 아래쪽. |
| B | 13 | 정의(19~29행) → 비교(31~39행) → 구조(41~90행) → slot(92~106행) → 수신(108~118행) → 세대 혼합(120~131행) → credit(133~142행) → 오해·정리(144~169행)로 완결되고, description의 retry·credit은 52·69·88·156행과 133~142행이 답한다. CXL.io flit 구성은 94행 한 줄, 124~129행 표는 근거가 없다. 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 코드·명령·관찰 절차가 없다. 64~67행 칸 합(256), 79~80행 반쪽 합(128), 50행 528 bit는 글 안에서 맞고 69·82행 수치는 spec 절에 붙어 있다. 124~129행 128·64·32 GT/s는 출처·조건이 없어 C ≤ 8. 96~104행 slot 배치는 '개념적' 예로 관찰 방법(lspci·QEMU Ch 12·trace)이 없다. 앵커 part1-04(C 6) 수준. |
| D | 13 | chapter08-cxl-mem.md137~146행 ↔ 이 글41~52행은 68B 구성 요약; chapter10-arb-mux.md34~36·73~85행 ↔69·108~118행은 경계/retry 일반론. 다른 시리즈 PCIe chapter08-dllp.md106~130행 ↔29·54~71행 256B/CRC/FEC 일반론은 공유하나 CXL H/G-slot·CRD·LOpt60~90행은 설명하지 않는다. HBM chapter04-gddr.md66~103행은 PAM 신호 원리로 포맷과 역할 다르다.13 유지. |
| E | 8 | 제목의 세 형식이 41·54·73행 절로 답해지고 description의 '구조와 retry·credit 처리'를 45~90·52·69·88·156·133~142행이 다룬다. 범위가 같고 과장이 없다. 대상 독자와 이 비교로 무엇을 결정하는지가 드러나지 않는다. |
| F | 7 | 173행next chapter10 order10/title및19~49행PHY중재설명일치.177~180행chapter05/08/10·HBM chapter04-gddr.md order5/8/10/4 title일치.180행 후행PAM4/PAM3 signaling은HBM66~103행에서실제다룸.17행전장관계와184행ch01출처앵커맞음.렌더없어7. |
| G | 4 | 43행 3.1 §4.2, 56행 §6.4.1.3.1, 58행 §4.3.2 Figure 4-41, 69행 §6.4.1.3.3·§5.1.2.3, 71·106행 §6.2.3.1.1.1, 75·90·152행 §6.2.3.1.2, 139~140행 §4.2·§4.3.5가 주장 옆에 있고 39행이 4.0 웨비나 날짜를 밝힌다. 링크가 없고 124~129행 표, 52행, 160행은 출처 표기가 약하다. |

병합 대상: 위 D 공통요약만 축약; 독립목적 유지. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter10-arb-mux.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter10-arb-mux.md`

score_status: 잠정 · score: 63 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 10 (ARB/MUX) against CXL 3.1 §5 and §8.2.5'가 계층 위치, 528-bit/256B flit 경계 중재(§5.3), 고정 우선순위 표 대신 WRR 가중치 레지스터(180h/1C0h, 기본값 0h, §8.2.5.4–5), vLSM 상태(Table 5-1), ALMP 용도와 alternate protocol negotiation(§6.4.1), Bypass(§5.2.1), L0p(§5.1.2.5)를 고쳤고 근거 없는 수치·지어낸 cxl monitor 출력·kprobe 예를 지웠다. e2aa6b02는 꼬리말 정리만 했다.

uncertainties:
- 46~47행 offset 180h·1C0h, bit 7:4, 49행 기본값 0h를 §8.2.5.4~5 원문으로 확인하지 않았다(a0eeea28 기록 의존).
- 103행 '00b = 1 ms'와 101~105행 offset 00h·04h·08h 미확인.
- 36행 '68B Flit mode에서 528-bit flit 경계'는 68B(544 bit)와 수치가 다르다. 64B+2B CRC에 2B protocol ID를 더한 것으로 기억하지만 §5.3 원문으로 확인하지 않아 오류로 올리지 않았다.
- 133행 'L1.x'가 예약 상태를 포함하는지, Active.PMNAK 누락이 의도인지 Table 5-1로 확인하지 않았다.
- 109행 'drivers/cxl에 ARB/MUX 코드 없음(2026-10 기준)'을 커널 소스로 다시 검색하지 않았다.
- CXL 4.0 spec에서 ARB/MUX 절이 바뀌었는지 확인하지 않았다.
- 위528-bit 의문은Ch8/9의Protocol ID 2B를제외한66B link flit설명과양립한다.산술만보고오류확인하지않음.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 15 | 고유한 해석은 71행(vLSM 결합: 한쪽 L1.0 + 다른 쪽 Active → Active), 83행(256B는 replay buffer가 Physical Layer라 Status Synchronization 불필요), 44~49행(기본값 0h인 WRR 레지스터로 '고정 우선순위는 spec에 없음'을 끌어냄), 113~127행(오해 네 가지를 spec 절로 반박)이다. 23~28·55~67·77~81·101~105행 표는 spec을 옮겨 적은 것이고 설계 선택 기준·실패 사례가 없다. 13~19 구간 하단에 가깝게. |
| B | 12 | 위치19~32→중재34~49→vLSM51~71→ALMP73~85→L0p87~95→오류97~105→Linux107~109→실수/정리로 완결. ALMP 형식·request/status 왕복·Table5-2 상세 예가 부족하고36행528-bit의68B와관계 설명이 얇다.133행요약에서Active.PMNAK를생략한것만으로내부오류라하지않는다.미확인register조건이남아12. |
| C | 4 | 실행·관찰할 예제·명령·코드가 없다. 44~47·101~105행 레지스터 offset·비트 필드는 구체적이지만 읽는 방법이 없고, 109행은 mainline drivers/cxl에 ARB/MUX 코드가 없다고 밝힌 뒤 '벤더 도구나 프로토콜 분석기가 필요'로 끝난다. 4~7 구간 하단. |
| D | 14 | chapter01-cxl-position.md97~106행 ↔ 이 글19~32행 계층 지도만 겹치며 세부를 이 글로 넘긴다. chapter09-flit-format.md69·108~118행 ↔73~85행 replay 계층만 연결. 다른 시리즈 Recipes part11-15-pcie-to-cxl.md54~68행 ↔30~49행 시분할 개요뿐이고 PCIe chapter19-advanced-features.md76~88행 ↔87~95행은 PCIe L0p 일반 조건이다. 이 글44~49·53~71·77~85·99~105행 WRR/vLSM/ALMP/register가 독립적이라14. |
| E | 7 | 제목의 세 프로토콜 PHY 다중화는19~49행에서 CXL.io 대 CXL.cachemem 두 링크 인터페이스로 정확히 범위를 좁혀 설명한다.프로토콜 세 개와 인터페이스 두 개는 다른 계수축이므로 제목오류가 아니다.대상 독자/실무결정이 드러나지않아7. |
| F | 7 | 139행next chapter11 order11/title,후행 probe/region/mailbox는실제67~192행이행.143~145행chapter05/09/11 order5/9/11 제목·공개상태맞음.17행flit이후질문설정,149행ch01앵커존재.관련링크별선택이유부족해7. |
| G | 4 | 21행 §5.0 Figure 5-1, 32행 §5.0·§5.2.1, 36·40행 §5.3, 42행 §8.2.5, 53행 Table 5-1, 71행 Table 5-2, 79~81행 §5.1.2.x, 85행 §6.4.1, 89행 §5.1.2.5, 99행 §8.2.5.1~3, 119행 §8.2.5.4~5가 붙고 21·149행에 3.1, 109행에 검색 시점(2026-10)이 있다. 링크와 커널 버전이 없고 시리즈 제목 '4.0'과 근거 3.1의 차이를 밝히지 않는다. |

병합 대상: 위 D 공통요약만 축약; 독립목적 유지. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter11-linux-driver.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 11 (Linux driver) against mainline v7.3-rc6'(PR 본문 294~319행)이 파일 수 33개, Makefile built-in 순서, struct 멤버, probe 순서, cxl_decoder_commit 실제 코드(20×1 ms), region 경로, mailbox 2*HZ polling, opcode 6개, cxl_error_detected, commit 되돌림을 소스로 고쳤고, PR 본문 475~477행은 'torvalds/linux 6c377d19d4a5(2026-10-08, v7.3-rc6)와 줄 단위 재검증'을 적었다. e2aa6b02(#61)는 출처 꼬리말만 바꿨다.

uncertainties:
- upstream(torvalds/linux 6c377d19d4a5)을 직접 열어 다시 대조하지 않았다. factcheck는 a0eeea28 기록에 근거한다.
- v7.3-rc6 이후 정식판에서 58~65행 struct 멤버, 71~85행 probe 순서, 178행 CXL_MAILBOX_TIMEOUT_MS, 38행 파일 수 33개가 바뀌었는지 미확인.
- 186~187행 0x0200 Get FW Info, 0x0201 Transfer FW는 커밋의 opcode 6개 수정 목록에 없어 대조 범위였는지 미확인.
- 288행 'Ch 151': Recipes 시리즈 안에서도 seriesOrder−1로 부르는 관례가 있어 사이트 표시 번호가 다를 가능성은 렌더링으로 확인하지 않았다. rubric대로 F ≤ 5 적용.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 130~134행 '읽을 점'(번호 순서 commit과 -EBUSY, 1 ms 간격 최대 20회와 -EIO/-ETIMEDOUT, cxl_rwsem.region은 호출 쪽이 잡음), 42~50행 Makefile built-in 순서와 이유, 244~258행 오해 네 가지를 소스로 반박한다. 23~36·56~65·71~85·183~192행은 소스를 표로 옮긴 것이고, 해석도 Kernel Debugging Ch 9에 거의 그대로 있어 이 글만의 내용은 266~268행 Type 2 attach·headerlog 정도다. 13~19 구간 하단. |
| B | 13 | 구조(19~52행) → 자료구조(54~65행) → probe(67~87행) → HDM commit(89~134행) → region(136~151행) → mailbox(153~192행) → dax·kmem(194~204행) → RAS(206~228행) → lock(230~240행) → 오해·정리(242~279행)로 description의 경로를 끝까지 따라간다. 각 절이 함수 목록에서 멈추고 실패 시 dmesg·sysfs 상태가 거의 없다. v7.3-rc6 이후 drift 등 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 93~127행 cxl_decoder_commit, 157~172행 cxl_internal_send_cmd, 210~217행 cxl_error_handlers는 v7.3-rc6(15·21행) 발췌라 같은 버전에서 대조할 수 있고 133·178행 수치도 소스 위치가 있다. 실행 절차·관찰 결과가 없다. 87행은 ftrace를 다른 글로 넘기고 204행 daxctl·numactl은 기대 출력이 없다. 소스 읽기만 있어 8. |
| D | 3 | 다른 시리즈 Kernel chapter09-drivers-cxl-walkthrough.md34~46·88~116·120~174·176~221·239~264·282~290행 ↔ 이 글42~52·56~85·91~151·153~192·194~228·272~279행. Makefile/struct/probe/commit/mailbox/RAS/요약을 실제 양쪽에서 확인했고 코드·표·해석이 광범위하게 같다. Kernel은 init 함수49~84행을 더해 상위 집합에 가깝다. 같은 시리즈 chapter12-qemu-emulation.md77~101행 ↔204행은 환경 사용 층이라 상보적. 기존138/206 동일줄 수는 재계산하지 않고 정성 근거만으로3 유지. |
| E | 8 | 제목과 description의 probe·region·mailbox를 67~87·136~151·153~192행이 이행하고 15·21행이 범위를 mainline v7.3-rc6로 못박는다. 17행이 Ch 8에서 잇는 질문을 세운다. 대상 독자와 읽은 뒤 할 일은 밝히지 않는다. |
| F | 5 | 283행next chapter12 order12/title,후행QEMU/cxl_test는실제19~33·119~140행이행.287·289·290행chapter08/order8·Kernel chapter08/order8·chapter09/order9 title맞음.288행Recipes part11-17-linux-cxl-driver.md actualorder152인데Ch151오번호라5유지.단순기계링크통과를올바른번호로취급하지않음. |
| G | 4 | 15·21·262·294행에서 기준 버전(mainline v7.3-rc6, 2026-10-08)을 밝히고 91행 core/hdm.c, 155행 core/mbox.c, 175행 pci.c, 181행 cxlmem.h, 220행 core/ras.c, 268행 cxl.h 주석으로 소스 위치를 붙인다. 커밋 해시·elixir 링크가 본문에 없다. 270행 upstream tracking 언급은 독자용 출처가 아니라 제외. |

병합 대상: Kernel chapter09-drivers-cxl-walkthrough.md 코드정본. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. Recipes 장 번호 라벨 정정. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter12-qemu-emulation.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter12-qemu-emulation.md`

score_status: 잠정 · score: 63 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 12 (QEMU) against QEMU master and ndctl'이 QEMU master f9587d4(2026-10-06)의 docs/system/devices/cxl.rst, hw/mem/cxl_type3.c, hw/cxl/cxl-host.c, hw/acpi/cxl.c, hw/pci-bridge/pci_expander_bridge.c와 Linux tools/testing/cxl, ndctl README·test를 출처로 버전 매트릭스, memdev=, pc 머신 오류 문구, FMW 256 MiB 규칙, lspci 8086:0d93, CHBS UID=bus_nr, cxl_test 절차, RAS 미구현 주장 8건을 고치고 출처 없는 출력·표를 지웠다. e2aa6b02는 꼬리말 출처 줄만 바꿨다.

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

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 23~31행 구성 요소→QEMU 장치·옵션 대응표, 33행 QMP 주입 명령 목록, 107~117행 CHBS UID가 `bus_nr`에서 온다는 설명과 `bus_nr=12`→UID 0x0C, 140행 'cxl_test는 드라이버 로직 반복, QEMU는 PCI 열거·CEDT·레지스터 경로'라는 선택 기준이 이 글의 구성이다. 45~79행 옵션·커널 설정과 152~178행 함정은 cxl.rst와 소스 오류 문구 요약이고 실패 사례·측정이 없다. 13~19 구간 아래쪽. |
| B | 13 | 도입(17행) → 제공 범위(19~33행) → 머신 옵션(35~51행) → Type 3(53~75행) → guest 확인(77~101행) → CEDT(103~117행) → cxl_test(119~140행) → 한계(142~148행) → 함정·정리(150~187행) 흐름은 완성됐다. 27행 switch, 31행 arm `virt`, 28·30행 Dynamic Capacity·HDM-DB는 예시 명령이 없고 101행은 출력 예를 ndctl 문서로 넘긴다. 79행 'Linux 5.18 기준'만 있고 92행 ram region에 필요한 guest 커널 버전이 없다. B ≤ 13. |
| C | 9 | 그대로 실행할 QEMU 명령(58~64행), guest 확인(83~98행), CEDT 덤프(113~114행), cxl_test 절차(125~130행)와 함정별 실제 오류 문구(159·167·175행)가 있다. 기대 관찰은 117행 UID 0x0C와 97~98행 '새 NUMA 노드' 정도이고 직접 돌린 출력·호스트·guest 커널 버전이 없다. 절차만 있어 C ≤ 9. |
| D | 11 | 다른 시리즈 Recipes part11-16-qemu-cxl-emulation.md39~65·69~98·103~125·127~135행 ↔ 이 글53~75·77~101·119~140·142~178행에서 QEMU 옵션/guest/함정/cxl_test 일부 반복. 그러나 Recipes25~36행 준비물·붙여넣는 완결 명령은 이 글의23~33행 모델 범위·103~117행 CEDT·133~138행 mock 모듈 구조와 질문이 다르고 Recipes23·135행이 상세를 이 글로 위임한다. 같은 시리즈 chapter11-linux-driver.md283행 ↔ 이 글17행은 안내 관계. 원평가가 부분 반복에 비해 기능 분리를 덜 인정해9→11. |
| E | 7 | 제목·description·15행 요약이 'QEMU 토폴로지 + cxl_test'를 향한다. 제목 '노트북에서 CXL 개발'은 드라이버를 고쳐 다시 올리는 루프를 약속하지만 반복 절차는 140행 한 문장이다. |
| F | 5 | 191행next chapter13 order13/title및35~100행switch/FM이행.195행chapter11 order11/title맞음.196행Recipes part11-16-qemu-cxl-emulation.md실제order151인데Ch150오번호라5유지.후행‘환경을 세우는 절차와 처음 걸리는 함정’은대상39~109행이실제로이행하므로이부분은오안내가아님.197행공식QEMU문서링크존재와별개로실행환경확인은열림. |
| G | 4 | 15행에 기준 버전(QEMU master 11.1 개발판, 2026-10)을 밝히고 21행 cxl.rst, 79행 'QEMU 문서는 Linux 5.18 기준', 101행 cxl_type3.c·ndctl cxl-list, 105행 hw/acpi/cxl.c, 124행 ndctl README, 197행 공식 문서 링크를 주장에 붙였다. 소스 경로에 커밋·링크가 없고 ndctl·guest 커널 버전이 없다. |

병합 대상: Recipes part11-16의설치함정 공통블록. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. Recipes 장 번호 라벨 정정. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.

### chapter13-switching-fabric.md

source_file: `src/content/blog/embedded/hardware/cxl/chapter13-switching-fabric.md`

score_status: 잠정 · score: 61 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0 미발견; 확인된 기술 P1 없음.

검증됨. a0eeea28(#59)의 'fix(content): fact-check CXL Ch 13 (switching, FM) against CXL 3.1 §7'이 CXL 3.1 spec §2.7, §7.1~7.7, §8.2.9.9.9, §9.13.3, 개정 이력, CXL 3.2 발표문, 4.0 웨비나를 출처로 HBR 명칭·PBR 규칙·opcode 등을 고쳤다. e2aa6b02는 각주 문구 정리다.

uncertainties:
- 27·143행 'CXL 3.1 … FM API 정의': Bind/Unbind vPPB 등 FM API는 2.0에 이미 있었다는 기억이 있으나 개정 이력 원문을 확인하지 않았다(기억 기반이라 오류 확인 아님).
- 26행 3.0 'PBR switch SW 관점(개요)'과 27행 3.1 'PBR fabric 디코딩·라우팅' 구분 미확인.
- 28행 3.2 항목(CHMU·PPR·TSP 확장), 29행 4.0 'retimer 최대 4개'를 발표문·웨비나로 대조하지 않았다.
- 97·98·117·121행 opcode(5201h·5202h·5604h·5605h·4803h)와 121행 §8.2.9.9.9.4는 a0eeea28 기록에 의존했다.
- 55행 '12-bit PID, fabric당 4096개'는 산술상 맞으나 spec 원문은 열지 않았다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 15 | VCS·vPPB·PPB·Multiple VCS 표(35~40행), FM이 필수가 되는 조건(45행), Bind/Unbind vPPB opcode와 hot-plug 흐름 표(95~98행), 'host는 hot-plug로 보고 CEDT는 바뀌지 않는다'(100·139행), DCD 추가·반납을 FM·디바이스·host로 나눈 표(115~121행), mesh 금지 오해 교정(67·129~131행)이 이 글의 구조다. 완곡 문장이 주장을 대신하지 않는다. 대부분 spec 요약이고 FM 배치 선택 기준·실패 사례가 없어 13~19 구간 중간. |
| B | 13 | 세대 표(23~29행) → switch 내부(31~48행) → HBR/PBR·deadlock(50~67행) → FM 형태·CCI(69~89행) → bind/unbind(91~100행) → DCD(102~121행) → 오해(123~139행) → 정리(141~147행)로 완결된다. 87행 Tunnel Management Command는 이름뿐이고 host OS가 hot-add된 LD·DC extent를 받는 쪽이 없다. 27·143행 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 재현 절차·명령·관찰 결과가 없다. 구체성은 spec 절(48·61·71·93·104·121행)과 opcode(97·98·117·121행)뿐이다. `chapter12-qemu-emulation.md` 28·33행이 `num-dc-regions`·`cxl-add-dynamic-capacity`를 소개하는데도 113~121행 DCD 흐름을 관찰하는 절차가 없다. 4~7 구간 하단. |
| D | 10 | chapter04-pooling-gfam.md102~119·152~158행 ↔ 이 글50~89·129~135행 HBR/PBR/FM 정의·형태·mesh 오해 반복. ch04 119행은 FM 세부를 이 글로 위임하며 이 글35~48·95~121행 VCS/bind/DCD opcode는 고유하다. 다른 시리즈 HBM chapter12-cxl-pooling-fabric.md49~62·108~132행은 조달/용량, Postmortem chapter06-cxl-fabric-postmortem.md13~35행은 장애 로그 수집이라 이 글69~100행 FM 제어 절차와 역할이 다르다.10 유지. |
| E | 7 | 제목의 switching/2.0→3.x/FM은23~100행이 다룬다.DCD102~121행은fabric확장의문맥에맞고제목에없는단어라는이유만으로감점하지않는다.description5행이독자의구체적결과와전제를드러내지않아7. |
| F | 7 | 151행next chapter14 order14/title·후행SPDM/IDE/TSP는대상19~99행이행.155~158행chapter02/order2·chapter04/order4·HBM chapter12/order12·Postmortem chapter06/order6 실제title/공개상태맞음.17행전제/ch04와역할구분명시.렌더미확인으로7. |
| G | 4 | 33행 §7.1, 42행 §7.1.2, 48행 §7.3.3.1, 57행 §2.7, 61·131행 §7.7.5.1, 67행 Figure 7-44, 71·135행 §7.6.1, 80행 §7.6.2, 89행 §7.6.3·DSP0234·DSP0236, 93행 §7.6.6.5~6, 104행 §9.13.3, 121행 §8.2.9.9.9.4가 주장마다 붙는다. 판은 54행 '3.1 spec'과 162행 각주에만 있고 21·28·29행 3.2·4.0 내용은 발표문·웨비나 날짜가 본문에 없다. |

병합 대상: 위 D 공통요약만 축약; 독립목적 유지. 다음 조치: 독립 질문을 유지하며 위 불확실의 규격/실행 확인과 인라인 판·절·소스 링크 보강. 실행/측정 증거 없이 예상 수치를 추가하지 않는다.
