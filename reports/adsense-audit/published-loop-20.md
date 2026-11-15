# 공개 글 AdSense 평가 — 루프 20

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-20.md) · [재검토 기록](double-check-loop-20.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-18. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

짧은 파일명은 src/content/blog/embedded/performance-engineering/ 기준이다. Recipes=embedded/modern-recipes/, RTOS=embedded/rtos/practical-internals/, BSP=embedded/bsp/, CXL=embedded/hardware/cxl/이다. F의 실제 slug/title/order/public과 라벨 뒤 설명까지 대조했다. draft 키가 없는 3-11/4-03/4-04도 공개이며 false로 임의 수정하지 않았다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-06-interrupt-storm.md` | 10 | 9 | 5 | 9 | 6 | 6 | 1 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-07-mmio.md` | 9 | 9 | 4 | 6 | 5 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-08-peripheral-clock.md` | 8 | 8 | 5 | 7 | 5 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-09-power-vs-performance.md` | 9 | 9 | 5 | 8 | 6 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-10-thermal.md` | 8 | 7 | 5 | 7 | 5 | 4 | 1 | **37** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part3-11-cxl-interconnect.md` | 11 | 11 | 7 | 7 | 5 | 4 | 3 | **48** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-01-concurrency-basics.md` | 9 | 8 | 4 | 6 | 6 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-02-false-sharing.md` | 10 | 10 | 6 | 6 | 6 | 6 | 2 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-03-lock-contention.md` | 11 | 11 | 6 | 10 | 6 | 6 | 1 | **51** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-04-spinlock.md` | 10 | 11 | 5 | 5 | 5 | 6 | 1 | **43** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 435 → 새 합계 435; 평균 43.5 → 43.5. A~G 점수는 아래 독립 원문 관찰과 대역 비교 결과 기존과 동의했다. Thermal의 내부 TDP/SDP 충돌은 유지했다. CXL은 4c77e2bf의 사양·연구 대조 기록을 확인했지만, 현재 측정 코드의 환산·초기화까지 검증한 기록이 아니므로 검증됨을 철회하여 미검증으로 둔다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| part3-06-interrupt-storm.md | 46 | 46 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-07-mmio.md | 40 | 40 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-08-peripheral-clock.md | 40 | 40 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-09-power-vs-performance.md | 44 | 44 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-10-thermal.md | 37 | 37 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-11-cxl-interconnect.md | 48 | 48 | 0 | 점수 유지; 검증됨→미검증. 역사 커밋의 사양/연구 대조와 현재 구체 코드의 검증 범위를 구분. |
| part4-01-concurrency-basics.md | 40 | 40 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-02-false-sharing.md | 46 | 46 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-03-lock-contention.md | 51 | 51 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-04-spinlock.md | 43 | 43 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### `part3-06-interrupt-storm.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-06-interrupt-storm.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-06-interrupt-storm`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 19행 Ethernet framing 포함 최대 pps,49행 mask/unmask 이후 재호출,100행 coalesce default,133행60Mpps,138행busy_poll,163~166행ICMP/XDP시점,232행priority 설명은 공식자료·target 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 19~26행 IRQ 빈도/점유율·170~176행10ms예산은 구체 계산이다. 나머지는 NAPI/coalescing/polling/affinity 목록이며 기법 선택은 얕아10. |
| B | 9 | 30~196행 대응 기법과198~241행 함정/결론까지 완결. 실제 storm 진단·기법 조합과49행 reenable 동작 해석이 부족해9,B≤13. |
| C | 5 | 109/146/153행 ethtool·affinity 명령이 있다.24/100/133행 수치는 환경/출처 없어 C≤8, NIC 가상 레지스터·결과 부재로5. |
| D | 9 | 30~49/180~196/85~133행 ↔ part3-05 79~108/123~141/156~167행 defer/BASEPRI/storm.30~49/72~76행 ↔ RTOS part1-05-interrupts-rtos 140~163행 NAPI mask/poll.대응모음 역할은 남으나 중복 상당9. |
| E | 6 | 2·5행 NAPI/polling/coalescing는51~141행에 있고 rate-limit은163행 한줄이라 부분미이행6. |
| F | 6 | 243~248행 nextMMIO/order25 및3-05/order23·3-07/order25의 title/slug/공개 확인. 기본 연결6; 내부 길잡이 부족. |
| G | 1 | NAPI/busy_poll/XDP/kernel·HAL판과수치출처를본문에연결하지않았다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part3-05 및RTOS part1-05 storm절과 중복. 독립 interrupt storm 검색의도로 보강: IRQ 증가율·ISR 점유와 선택조건을 실제 관찰로 연결.


### `part3-07-mmio.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-07-mmio.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-07-mmio`

score_status: 잠정 · score: 40 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 31/38행 nGnRE/nGnRnE,25/155행Device speculation,98행codecache동기화,148행bit-band범위,201행access폭,223행M7/MMIO cacheability는 공식ARM/kernel미검증. 조건 차이를 오류로 단정하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 21~27행memorytype·66~86행volatile/barrier·127~143행BSRR/bitband는표준입문.48~58행transaction32→4와169~176행posted flush가추가가치이나비용분석은없어9. |
| B | 9 | 17~242행폭넓은매핑/순서/RMW/API설명.플랫폼전제와매핑선택결론이없고기술불확실B≤13;9. |
| C | 4 | 36~41행Linux·92~94행STM32·115~119행asm이같은재현환경으로묶이지않았다.58행8배미출처C≤8;4. |
| D | 6 | 64~78/107~130행 ↔ 현재Recipes part4-02-mmio-access25~50/158~171행volatile·RMW/BSRR.90~105/178~191행 ↔ Recipes part2-10-memory-barrier59~83행DSB/clock/DMA.160~176행 ↔ Recipes part11-09-pcie-streaming120~142행posted/nonposted.핵심정확성목록이여러전용글과겹쳐6. |
| E | 5 | 2행 접근성능키워드는다루지만본문은정확성중심이고58행단정비율외성능비교없다.3~5상단5. |
| F | 6 | 253~258행nextPeripheral Clock/order26 및3-06/order24·3-08/order26title/slug/공개정상.기본6. |
| G | 1 | ARM판·kernel버전·PCIe규칙의본문1차출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: Recipes part4-02/part2-10/part11-09와절별중복후보.독립MMIO성능의도로매핑별지연/처리량과posted flush관찰을보강.


### `part3-08-peripheral-clock.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-08-peripheral-clock.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-08-peripheral-clock`

score_status: 잠정 · score: 40 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 17행H743대상과139/143/158행RCC심볼,66행BRR필드,34행reset시clock일반화,90행CCF자동disable,146행RTC우회,182~184행전류/wakeup공식자료미검증.100us/수십us는근사로오류확정안함.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 8 | 63~76행UART오차·119~134행voltage/frequency순서가고유예.나머지RCC/CCF/DVFS/sleep/tool은짧은소개라8. |
| B | 8 | PLL은138~146행lockwait뿐M/N/P출력계산이없고RTC우회방법도없다.절별목록으로전제/결과부족8,B≤13. |
| C | 5 | 44~76행SPI/UART산술은재계산가능.182~184행모드전류·141행locktime미출처/환경C≤8;보드코드재현없어5. |
| D | 7 | 97~115/186~207행 ↔ part3-09 19~26/54~82/142~175행DVFS/sleep/powertop반복.17~40/136~146행 ↔ 현재Recipes part4-04-clock-setup112~149/202~204행PLLRDY/ENR/DSB.165~184행 ↔ 현재Recipes part4-11-low-power-modes31~47행Sleep/Stop/Standby질문.현재Recipes수치와구별해내용중복만7. |
| E | 5 | 2·5행divider/gating/DVFS는본문이행,PLL은lock대기만있고분석대비개요라5. |
| F | 6 | 245~250행nextPower vs Performance/order27,3-07/order25·3-09/order27라벨/title/slug/공개정상.기본6. |
| G | 1 | RM/HAL/kernel/ESP-IDF판·수치출처없다.81행헤더경로만으로주장을검증할수없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: DVFS/sleep/tool은part3-09와중복후보.분주선택·baud오차라는독립의도로H743조건과PLL계산부터보강.


### `part3-09-power-vs-performance.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-09-power-vs-performance`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 39행sweet spot·50행race-to-idle적용조건,74행ondemand·216행기본governor,92~95행Snapdragon,147행ESP32전류,154행thermal온도·195~199행powerbudget공식/실측미검증.108mJvs100mJ는조건부주장이라오류게이트아님.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 19~39행CMOS/DVFS·54~86행governor·127~175행idle/tool은일반목록.45~48행에너지비교는구체적이나출처/SoC없어9. |
| B | 9 | DVFS→idle→heterogeneous→측정→함정흐름은완결.50행유리조건을예제에서유도하지못하며governor설명일부한줄9,B≤13. |
| C | 5 | 111~117/135~138/166~189행명령은있다.59/67/79행경로생략·DVFS/ESP32/온도/시간미출처C≤8;5. |
| D | 8 | 19~26/54~82/142~175행 ↔ part3-08 97~116/186~207행DVFS/sleep/tool.152~160/222~228행 ↔ part3-10 111~121/195~203행thermal/hotplug.54~86/123~140행 ↔ BSP chapter13-power-management181~275행idle/governor.고유race-to-idle비교는남아8. |
| E | 6 | 2·5행DVFS/race-to-idle/big.LITTLE/hotplug/측정절은모두있다.선택조건/실험없는trade-off라6. |
| F | 6 | 239~244행nextThermal/order28 및3-08/order26·3-10/order28라벨과대상title/slug/공개정상.기본6. |
| G | 1 | 본문수치의SoC·kernel/ESP-IDF판·1차자료연결없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part3-08 DVFS와part3-10thermal절중복후보.독립에너지전략의도로idle전력·부하길이별역전조건을보강.


### `part3-10-thermal.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-10-thermal.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-10-thermal`

score_status: 잠정 · score: 37 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P1 138~139/146행SDP평균·경부하정의와232행SDPpeak직접충돌.P0미발견.

uncertainties: 72~74행trip type,48행STM32보정온도,109행DAPA,143~146행Intel power,152~183행SoC/우주/coldboot수치는미검증.서로다른예시trip개수를내부오류로추가하지않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 8 | 19~26/52~90/125~141행온도등급/sysfs/cooling/TDP는개요.161~183/218~225행우주/coldboot/RT관점은있으나한두문장으로8. |
| B | 7 | 138~146행정의와232행정리의실제기술개념충돌.여러예시의조건/결과설명도부족하여7,B≤13. |
| C | 5 | 52~90행sysfs와45행ADC식이있지만보드/kernel/보정값/기대결과없다.38/152~159/207행수치미출처C≤8;5. |
| D | 7 | 52~67/81~90행 ↔ BSP chapter14-thermal-watchdog91~113행sysfs,19~26행 ↔ 같은글76~85행grade개요.111~121/197~203행 ↔ part3-09 109~121/152~160/222~228행hotplug/thermalbenchmark.표의값을같다고하지않고질문·구조중복으로7. |
| E | 5 | 2·5행Junction/trip/cooling/우주키워드는있으나분석을약속하고개념/명령목록중심5. |
| F | 4 | 236행Toolchain & Profiling은실제order29CXL과다르며241행4-01 Compiler는실제order30Concurrency와다르다.240행3-09는정상.상한≤5로4. |
| G | 1 | RM/kernel판·DAPA출처·Intel/우주/온도수치의주장별자료없다. |

게이트 재판정: 139행SDP=일반workload평균,146행idle+light예와232행SDP=peak는같은용어정의를반대로쓴직접모순.오류확인유지.외부표준의올바른정의전체를검증했다는뜻아님.

병합 대상·다음 조치: BSP chapter14 thermal개요와부분중복후보.우선SDP정의충돌/다음편안내조치,독립thermal선택·지속성능관찰로보강.


### `part3-11-cxl-interconnect.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-11-cxl-interconnect.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-11-cxl-interconnect`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0미발견;174행다음편안내오류.기존사양대조커밋은존재하나새코드실행검증은없다.

uncertainties: 114~125행 pointer-chain 초기화/실행, tick을 ns로 출력하는 코드와128행 환산 안내의 간극이 열려 있다. 28~33행 발표표와22/65행 수TB 규모도 이번 독립 대조를 마치지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 73~84행RD-V2구성·134행68B flit·149행opcode설명이구체추가가치.세대/프로토콜/type기본소개비중과직접잽니다결론으로11. |
| B | 11 | 18~171행문제→세프로토콜→RD-V2→지연/대역→함정흐름완결.92~98행출력없고pointerchase초기화/환산코드가완성되지않았으며TBD한계있어11,B≤13. |
| C | 7 | 104~110행Sun et al.,MICRO2023/Sapphire Rapids지연표는출처/환경이있다.114~128행자체절차는기대값/실행없이tick환산필요라절차뿐C≤9,실전예7. |
| D | 7 | 104~110/161~163행 ↔ part3-12-cxl-mem-latency40~46/94~100행동일지연비율·raw64GB/s함정.141~155행 ↔ CXL chapter07-cxl-cache40~60/104~128행RdShared/SnpInv/false-sharing흐름반복.RD-V2고유역할은남지만개관중복7. |
| E | 5 | 2·5행AI대역확장분석대비20행AI동기·130~135행대역절은raw와측정권고뿐이다.프로토콜본문은충실하나제목결과5. |
| F | 4 | 174행차세대SoC트렌드는실제다음order30Concurrency와다르다.파일명3-12도현재order54CXL지연이다.178~181행네라벨은실제title/slug/public주제와대응하나잘못된next로4. |
| G | 3 | 73/104/134/149행RD-V2/MICRO2023/CXL3.1조항이주장에붙는다.문서번호/하이퍼링크·실행환경이빠져3. |

게이트 재판정: 4c77e2bf 커밋 본문의 CXL3.1§4.2/§11.5/D2H·H2D표, Arm102759_0000_03, Sun et al.MICRO2023(arXiv2303.15375) 사양·연구 대조 기록은 직접 확인했다. 그러나 이 기록은 현재114~128행 코드 환산/초기화/실행 검증을 덮지 않는다. 부분 검증을 글 전체 검증됨으로 확장하지 않아 미검증으로 변경한다. 특정 counter 주파수·target 실행 없이 출력 단위를 새 오류로 단정하지 않았다.

병합 대상·다음 조치: part3-12지연표·CXL chapter07기본protocol과중복후보.독립RD-V2성능도입으로보강,174행후속안내와pointerchase단위/초기화부터해결.


### `part4-01-concurrency-basics.md`

source_file: `src/content/blog/embedded/performance-engineering/part4-01-concurrency-basics.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-01-concurrency-basics`

score_status: 잠정 · score: 40 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 93/96행ARM보장·DMB완료의미,141/155행C11order설명,163~164행SC비용,218행100배·262행발생빈도미검증.언어/ISA기억으로오류확정안함.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 15~65행concurrency/race/atomic·117~179행order/barrier·222~233행ABA는입문목록.별도관찰/결론보다일반소개라9. |
| B | 8 | 넓은범위이나193~205행SPSC는push만,ABA해법은이름뿐.정확성불확실B≤13내에서8. |
| C | 4 | 193~205행T/CAPACITY/buf미정의·ABA의사코드·target/예상출력없다.163~164/218행수치미출처C≤8,4. |
| D | 6 | 117~126/130~141/171~179행 ↔ part4-08-memory-ordering24~37/48~63/94~107행order/release/barrier.193~205/220~233행 ↔ part4-07-lock-free194~223/110~143행SPSC/ABA.209~218행 ↔ part4-02 15~37행false-sharing.전담후속의핵심을입문에서반복하여6. |
| E | 6 | 2·5행Race/Memory Model은상당본문이나concurrency/parallelism은그림/문장하나이고SPSC/ABA까지확장6. |
| F | 6 | 276~281행nextFalseSharing/order31및3-10/order28·4-02/order31라벨대상정상.3-10이직전글이아니어도관련라벨자체는맞으므로오류감점안함.기본6. |
| G | 1 | RobPike출전·ARM/Intel/표준조항·cycle출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part4-08memorymodel·part4-07ABA/SPSC와중복후보.허브예외대상아님;RTOS/SMP경로비교라는도입역할로보강.


### `part4-02-false-sharing.md`

source_file: `src/content/blog/embedded/performance-engineering/part4-02-false-sharing.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-02-false-sharing`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 199행배열정렬과원소배치,77/80/231행코드컴파일,115행interference상수,182행c2c버전,196/202행kernel/Zephyr배치·276~280행stack정렬미검증.10~100배속에14배는포함되어모순아님.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 17~61행MESI/pingpong·94~115행padding·172~180행c2c는일반입문.204~236행read/write선택과true-sharing분리가추가되나기준/관찰약해10. |
| B | 10 | 기제→측정→padding→패턴→도구→함정완결.65~81행good/thread/timer구현없고199행정렬해법의조건미완이라10,B≤13. |
| C | 6 | 84~90행A72실측은compiler/OS/affinity/실행명령없어C≤8.코드의good측정이없고10M/for문은재현조각이므로6. |
| D | 6 | 104~115/170~182/252~289행 ↔ 현재Recipes part9-09 75~87/169~180/206~238행상수/c2c/alignas함정반복.148~155/240~248행 ↔ part2-07 184~198행SPSCpadding.고유MESI/true-sharing도Recipes에상당포함되어6. |
| E | 6 | 2·5행pingpong/padding/측정본문은있으나진단report를읽어원인line을선택하는사례없어6. |
| F | 6 | 300~305행nextLockContention/order32·4-01/order30·4-03/order32title/slug/public정상.기본6. |
| G | 2 | C++17/kernel4.10/FreeRTOS11/A72등버전/환경기재가있어Build앵커처럼2.본문외부출처는없으며특정주장검증과연결안됨. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: Recipes part9-09와전반중복후보.독립diagnosis의도를살리려면bad/good실험과c2c report해석으로보강.


### `part4-03-lock-contention.md`

source_file: `src/content/blog/embedded/performance-engineering/part4-03-lock-contention.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-03-lock-contention`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 44~64행perf/ftracekernel설정/출력,71~82행RTOS통계,149행JDKstriping,169행30%기준,193행ISRtrylock,239행alignedread,252~260행실측환경공식/target미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 53~55행누적wait먼저선택·100~108행convoy/unfairtradeoff·205~213행brakeloop가독자구조.문턱/실측은미출처여서11. |
| B | 11 | 지표→도구→모델→회피→사례→실측흐름은완결.커널설정·실제trace/RTOS화면해석이빠져11,B≤13. |
| C | 6 | 44~64행명령/출력예는있다.252~260행A72/100threads외method/lock판미기재C≤8.환경재현약해6. |
| D | 10 | 44~55행 ↔ part6-03-case-lock-contention59~70행perf lock및누적wait질문.86~96행 ↔ part1-07-modeling19~38행Amdahl.171~187행 ↔ part4-04 24~38/part4-05 18행hold와wait전략.정의/측정전담은구별되어10. |
| E | 6 | 2·5행wait/hold/convoy/측정은대응하지만명령두줄과짧은설명으로선택사례부족6. |
| F | 6 | 273~279행nextSpinlock/order33와4-02/order31·4-04/order33·4-05/order34title/slug/public정상.후행busy-wait설명도본문대응.기본6. |
| G | 1 | perf/ftrace/RTOS판·USL/JDK/실측의주장별출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: 병합대상없음.독립lock측정레퍼런스로보강;part6-03사례연결,실측환경과출력필드검증부터진행.


### `part4-04-spinlock.md`

source_file: `src/content/blog/embedded/performance-engineering/part4-04-spinlock.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-04-spinlock`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 121~138행MCSatomic형/함수이름,58~67행barrier,143행qspinlock판/아키텍처,174행Cortex-M구성,202행adaptive정책·212행YIELD동작미검증.85행invalidate한번과148행N수신은같은broadcast로양립가능.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 71~143행TTAS/ticket/MCS는교과서패턴.26~38행손익과256~264행대기표는있지만실측출처없어10. |
| B | 11 | 문제→구현→kernel/Zephyr→adaptive→함정→측정완결.121~138행MCS정확성·측정표의mutex비교근거부족으로11,B≤13. |
| C | 5 | 256~264행A72표는lock종류/벤치/클록/반복없어C≤8.설명용코드만있고종류별측정/예상출력없어5. |
| D | 5 | 71~87/89~111/113~143행 ↔ RTOS part4-08-spinlock-smp96~118/145~170/174~219행TTAS/ticket/MCS흐름과구현반복.24~38행 ↔ 현재Recipes part9-07 22~46행spin/sleep판단,187~202행 ↔ part4-05 63~78행adaptive.고유측정표/Zephyr만남아5. |
| E | 5 | 2·5행성능분석/scalability에비해147~153행개념비교와종류를구분하지않는실측표다.키워드는있으나결과약해5. |
| F | 6 | 277~283행nextMutex/order34와4-03/order32·4-05/order34·RTOS3-01 Critical Section의title/slug/public대조정상.후행futex/PI도4-05에있다.기본6. |
| G | 1 | 본문외부1차출처·MCS원논문·kernel/벤치환경없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: RTOS part4-08과구현중복후보.성능독립의도로공식구현/종류별코어수측정을보강하고비교없는표의선택단정을검증.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part3-06-interrupt-storm.md | 1~248행 | 2367ece2ff31f406de053a064e097d3987e6e843a2dadc324627a1776514b10c |
| part3-07-mmio.md | 1~258행 | bcb3977bb6a66d196ae3937dd2e56a8d7921bddf502d87faa4abe413280c4edf |
| part3-08-peripheral-clock.md | 1~250행 | a8d952558ada0536b66635c9484c83b0d8eb1f7e4feb3c7791d3c1cf4a62ef06 |
| part3-09-power-vs-performance.md | 1~244행 | 00e396c094ef195c52164ecb8db57bb441b2fe1a154bad41d945720698e5f2ca |
| part3-10-thermal.md | 1~241행 | 05f886da4223d43fadfb1b304f0c8b96200eab3edc439e5c1afb47b3e800cf7d |
| part3-11-cxl-interconnect.md | 1~181행 | ae86339c1ff7e8543dde371384d1ca3bb6453435cba06414763a3d1c57b6c62e |
| part4-01-concurrency-basics.md | 1~281행 | b85699a37d3ae4ac34c63cf6542166dc7304d690cbfe4c69bd8d4c83c6a2a3e2 |
| part4-02-false-sharing.md | 1~305행 | 0aaef7e04d4577b7cd7780fc2a870e8efdf5b2776294631f1a1760f165d6e0d2 |
| part4-03-lock-contention.md | 1~279행 | a2b47eadc074a1fa942b8bc4171fb31a78e92e0e6f141f21467da946c9df860a |
| part4-04-spinlock.md | 1~283행 | 6575d841c00f169705337efd3be9bf675b4681600484b33ae8962834cd9b84aa |
