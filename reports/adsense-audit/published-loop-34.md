# 공개 글 AdSense 평가 — 루프 34

> 대상: 공개 글 10편 (PCIe Deep Dive `seriesOrder` 18~19, Postmortem Debugging `seriesOrder` 1~6, Practical RTOS Internals `seriesOrder` 0~1)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른네 번째 루프다. 대상은 `src/content/blog/embedded/hardware/pcie/`의 chapter18·chapter19(PCIe Deep Dive 마지막 두 편), `src/content/blog/tools/debugging/postmortem/`의 chapter01~chapter06(Postmortem Debugging 전체), `src/content/blog/embedded/rtos/practical-internals/`의 00-preface·part1-01(Practical RTOS Internals 허브와 첫 글)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `pcie/chapter18-register-maps.md` | 7 | 10 | 5 | 10 | 7 | 4 | 2 | **45** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `pcie/chapter19-advanced-features.md` | 11 | 9 | 6 | 10 | 6 | 5 | 3 | **50** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `postmortem/chapter01-core-generation.md` | 12 | 11 | 7 | 5 | 5 | 5 | 2 | **47** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `postmortem/chapter02-elf-core-format.md` | 11 | 12 | 6 | 8 | 7 | 5 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `postmortem/chapter03-gdb-core-analysis.md` | 13 | 13 | 7 | 9 | 7 | 4 | 2 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `postmortem/chapter04-debuginfod-minidump-automation.md` | 9 | 10 | 6 | 5 | 6 | 4 | 2 | **42** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `postmortem/chapter05-cxl-device-postmortem.md` | 16 | 12 | 8 | 10 | 7 | 7 | 3 | **63** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `postmortem/chapter06-cxl-fabric-postmortem.md` | 10 | 9 | 4 | 12 | 5 | 6 | 1 | **47** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `practical-internals/00-preface.md` | 12 | 13 | 3 | 12 | 7 | 6 | 2 | **55** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md` |
| `practical-internals/part1-01-why-rtos.md` | 10 | 9 | 4 | 9 | 6 | 7 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |

평균 50.1점(10편, 합 501점), 범위 42~63점이다. 판정은 우선 조치 3편, 병합 검토 5편, 보강 2편이고 유지·검증 대기·제외 검토는 없다. 점수 구간으로는 postmortem ch05(63점)만 보강(60~79)이고 나머지 9편은 병합 검토(40~59)다. 00-preface는 overview 허용 시리즈의 허브(seriesOrder 0)라 루브릭 5절에 따라 보강으로 두었다. 오류 확인은 3건이다. postmortem ch02는 Linux `include/uapi/asm-generic/siginfo.h`를 직접 열어 확인한 1차 자료 근거이고, postmortem ch01(PR_SET_DUMPABLE 조건)과 part1-01(1.8 ms 작업과 1 ms 주기)은 원문 내부 모순이다. '검증됨'은 postmortem ch05 1편뿐이다(06018beb가 drivers/cxl·mmzone.h·drgn helpers와 대조). P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다. postmortem ch01~ch04가 gdb-lldb ch07·dwarf-elf ch06과 문단 단위로 겹치는 것과 CXL 장 일괄 생성(23ed6256) 뼈대는 같은 사이트 안 중복이라 글 단위 P0가 아니라 D 감점과 시리즈 단위 점검으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `pcie/chapter18-register-maps.md` | 45 | 45 | 0 | 없음 |
| `pcie/chapter19-advanced-features.md` | 49 | 50 | +1 | 없음 |
| `postmortem/chapter01-core-generation.md` | 50 | 47 | -3 | 없음 |
| `postmortem/chapter02-elf-core-format.md` | 51 | 51 | 0 | 없음 |
| `postmortem/chapter03-gdb-core-analysis.md` | 55 | 55 | 0 | 없음 |
| `postmortem/chapter04-debuginfod-minidump-automation.md` | 42 | 42 | 0 | 없음 |
| `postmortem/chapter05-cxl-device-postmortem.md` | 63 | 63 | 0 | 없음 |
| `postmortem/chapter06-cxl-fabric-postmortem.md` | 47 | 47 | 0 | 없음 |
| `practical-internals/00-preface.md` | 57 | 55 | -2 | 없음 |
| `practical-internals/part1-01-why-rtos.md` | 47 | 46 | -1 | 없음 |

- 추가한 오류 확인(postmortem ch01): 26행은 생성 조건을 'PR_SET_DUMPABLE 플래그 = 1'로 못박는데, 259행 'prctl(PR_SET_DUMPABLE, 2); // suidsafe — root만 dump 읽기', 264행 'suid_dumpable=2로 root만 읽을 수 있는 core 생성 허용', 325행 체크리스트 'PR_SET_DUMPABLE 0 아닌가?'는 값 2에서도 core가 생긴다고 한다. dumpable=2에서 두 진술은 동시에 참일 수 없다(루브릭 3-1 내부 모순). factcheck 미검증→오류 확인, 판정 병합 검토→우선 조치, B 12→11, F 6→5(허브 역할 결손), G 3→2(416~419행은 관련 항목 목록), 합계 50→47.
- 추가한 오류 확인(postmortem ch02): 평가자가 기억이라며 uncertainties에 둔 si_code 값을 Linux `include/uapi/asm-generic/siginfo.h`(torvalds/linux master)를 열어 확인했다. 185~186행 SEGV_BNDERR 6·SEGV_PKUERR 7은 헤더의 3·4와, 200~201행 ILL_PRVOPC 7·ILL_PRVREG 8은 헤더의 5·6과 다르다. factcheck 미검증→오류 확인, 판정 병합 검토→우선 조치. 점수는 그대로 51.
- 추가한 오류 확인(part1-01): 23~25행 작업 시간(read_sensors 1 ms + compute_pid 0.5 ms + update_actuators 0.3 ms = 1.8 ms)을 74~80행 pid_task가 한 주기에 모두 실행하는데 79행 주석 '1 ms 정확 주기'와 90행 'PID는 정확히 1 ms 주기로 실행'이라고 단정한다. 단일 코어에서 산술적으로 동시에 참일 수 없다. 평가자는 vTaskDelay 의미만 uncertainties에 두었다. 판정 병합 검토→우선 조치, B 10→9, 합계 47→46.
- 기각한 오류 확인은 없다. postmortem ch03 127행 si_code 6·7은 같은 값이 ch02에서 1차 자료로 틀렸다고 확인됐지만, ch03 평가 중에는 헤더를 열지 못해 uncertainties에 두었다(ch02 근거로 정정 대상에는 포함). postmortem ch06 138행과 193행의 drgn helper 서술은 'mainline'이 drgn인지 커널인지 모호해 내부 모순으로 확정하지 않았다.
- pcie ch19 F 4→5: 102행 'Ch 9 — Lane Margining의 맥락'은 물리 계층 장을 가리키는 맥락 표현이라 틀린 라벨로 보지 않았다. 남은 결함(다음 편 안내 없음, 46행 Ch 17 BDP 안내 불일치)으로 상한 5. 합계 49→50.
- 00-preface B 14→13, G 3→2: 평가자는 155·157·159·161행 정확성 불확실을 연 채 B 14를 줬는데 AP-C-24는 예외 없이 B ≤ 13이다. 레퍼런스(203~216행)는 어떤 주장에도 묶이지 않아 G 2. 합계 57→55, 허브 예외로 보강 유지.
- postmortem ch04 B 근거에서 평가자의 'AP-C-24에 따라 B ≤ 13' 표현을 뺐다. 그 글에는 해당 상한이 걸리지 않고 10점은 구간 기준만으로 설명된다.
- postmortem ch06 factcheck_basis: 평가자가 적은 생성 커밋 0ec69ea9는 이 파일 git log에 없고 23ed6256(stub 15편 채움)이다. 판정 영향 없음.
- 줄 번호 보정(점수 영향 없음): pcie ch18 D(part11-03 21~41행, Ch7 43~51행), postmortem ch02 D(chapter03 ILL_PRVOPC 130행, gdb-lldb ch07 265~266행, chapter04 build-id 19~38행), postmortem ch04 D(dwarf-elf ch06 157~160행, gdb-lldb ch07 385~388·393행), postmortem ch05 D(kernel ch08 102·105행, 78~91행), postmortem ch06 D(cxl ch13 71행·91~98행), 00-preface D(part1-01 18~27·39행), part1-01 D(part5-05 26~35행).
- 부풀림 판정은 10편 모두 없음이다. pcie ch19 +1은 F 라벨 판정 기준을 바로잡은 것이고, 나머지는 1차와 같거나 낮다.

## 글별 근거

### `pcie/chapter18-register-maps.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log --follow 결과는 55e250f2·633a3178·400892d7(일괄 정리), f5225bb5(restructure), 077d5525(링크 수정), bd3aed87(내용 확장), be973200(topic 메타데이터), 83899a96(중복 절 정리, Ch3 back-link 추가), 0a9dd7bc(slug 고정)이다. 비트 layout·오프셋을 PCIe Base Spec이나 pci_regs.h와 대조했다는 커밋이 없고, 0a9dd7bc의 'Verified'는 빌드된 URL 수 비교라 사실 검증이 아니다. 원문 안 대조: 333~339행 상수(PCI_EXP_DEVCTL 8, PAYLOAD 0x00e0, LNKSTA_CLS 0x000f 등)가 54·55·107·133·145·154·159·251행과 맞고, 310~323행 ECAM 산술과 165~166행 Header Log 오프셋도 서로 맞아 내부 모순은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 7 | 19~306행 대부분이 오프셋·비트 이름 표이고, 27·29·33~42행은 '설명' 칸이 비어 있다. 이 글만의 것은 상수-값 짝 표(329~339행)와 ECAM 단위별 크기 표(318~323행) 정도다. 15행이 'setpci·driver 코드 작성 시 빠른 lookup'과 '진단·tuning'을 내걸지만 어떤 증상에서 어떤 비트를 보는지는 없다. 앵커 part1-04(A 10)보다 해석이 적어 6~12 구간 하단. |
| B | 10 | description(5행)이 이름 댄 절은 모두 있다(19·79·100·154·203·225·251·271·292행). 비트까지 푼 것은 Command·Status·Device Control·Link Status·AER UE/CE·MSI/MSI-X·ACS·LTR뿐이고, Link Control·Link Capabilities·Device Capabilities·Bridge Control(98행)·SR-IOV Control/Status(257~258행)·AER Capabilities·Control(164행)은 오프셋만 있다. Status 표(66~77행)는 bit 9~10을 뺀다. 343~345행 '18편 회고'는 공개된 Ch19와 맞지 않는다. 212행 MSI Mask 오프셋 의문이 열려 있어 AP-C-24 상한 안에서 10. |
| C | 5 | 실행·검증 절차가 없다. 15행이 setpci 용도를 약속하지만 setpci·lspci로 실제 값을 읽어 표와 대조하는 예, LnkSta 값 디코딩 예가 없다. 재현 가능한 것은 ECAM 식(310~316행)과 상수 표(329~339행)뿐이다. 표만 있는 경우의 C ≤ 9 상한보다 낮은 4~7 구간. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter03-config-space.md`, `chapter05-interrupts.md`, `chapter07-error-handling.md`, `chapter17-performance.md`, `chapter19-advanced-features.md`, 다른 시리즈 `modern-recipes/part11-03-pcie-bar.md`. Type 0 표 19~47행 ↔ Ch3 39~59행 ↔ part11-03 21~41행, Type 1 79~98행 ↔ Ch3 61~76행, ECAM 식 310~316행 ↔ Ch3 168행, MSI-X Table Entry 242~249행 ↔ Ch5 63~69행, AER 156~167행 ↔ Ch7 43~51행, ACS 271~290행 ↔ Ch19 56행 절. Ch17과는 겹침 없음. 비트 단위 lookup이라 역할은 구별되지만(83899a96이 의도된 중복으로 남김) 공통 표 반복으로 10~14 하단. |
| E | 7 | 제목(2행)과 description(5행)의 capability 목록이 본문 절과 1:1로 대응한다. 그러나 '주요 비트 layout'에 비해 SR-IOV(251~269행)·PCIe Cap 하위 레지스터 다수(100~122행)는 오프셋 표뿐이고, 15행이 내건 '진단·tuning' 연결이 없다. |
| F | 4 | 레지스터별 H2·H3(19~325행) lookup 구조는 좋다. 관련 항목 370~374행 5개는 대상을 열어 라벨이 맞음을 확인했다. 그러나 다음 편 안내가 없고(Ch17 220~222행은 Ch18을 안내함), 343~364행은 이 글을 18편 시리즈의 마지막으로 적는데 seriesOrder 19 `chapter19-advanced-features.md`(draft: false)가 있다. 잘못된 시리즈 안내라 F ≤ 5. 17행 'Ch 1~17' 링크는 Ch1 한 편으로만 가고, 366행은 내부 스크립트 이름(audit-upstream-freshness.py)을 독자에게 노출한다. |
| G | 2 | 15·378행이 PCIe Base 6.1 §7과 `include/uapi/linux/pci_regs.h`를 이름 대지만 표마다 spec 절이나 커널 버전·태그가 없고 링크도 없다. 378행은 Ch1 footer로 넘긴다. 366행 '2025~2026 datacenter'는 근거 없는 날짜 앵커. |

uncertainties:
- 212행 MSI Mask Bits를 +0x10 고정으로 적었으나 32-bit MSI(Data +0x08)에서는 +0x0C일 수 있다. 기억 기반이라 오류 확인으로 올리지 않았다. 211행은 Data만 두 경우로 나눴다.
- 169~188행 UE 비트 목록이 bit 25에서 끝난다. 최신 spec의 bit 26 이후 누락 여부 미확인.
- 145행 '0110=64GT'와 147행 bit 10 'Undefined'는 PCIe 6.x spec과 대조하지 않았다.
- 329~339행 상수 값을 현재 pci_regs.h와 대조하지 못했다(로컬 clone 없음). 본문 표와는 서로 맞는다.
- 251행 SR-IOV 0x0010, 271행 ACS 0x000F, 292행 LTR 0x0018 Extended ID는 1차 자료 미대조.
- Status 표(66~77행) bit 9~10(DEVSEL timing) 생략이 의도인지 미확인.

병합 대상: 후보는 `src/content/blog/embedded/hardware/pcie/chapter03-config-space.md`(Type 0/1 header·ECAM 겹침). 다음 조치는 보강이다. Ch3·Ch5·Ch7은 비트 단위 표를 갖지 않아 'PCIe 레지스터 비트 reference'라는 별도 검색 의도가 있으므로, 병합보다 setpci/lspci 출력 디코딩 예, 비트별 진단 연결, 표별 spec 절·pci_regs.h 커널 버전 표기, 오프셋만 있는 SR-IOV·Link Control·Device Capabilities 비트 보완이 낫다. 343~366행 '18편 회고'를 Ch19 공개 상태에 맞게 고치고 Ch19 다음 편 안내를 넣는다.

### `pcie/chapter19-advanced-features.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. 내용 커밋은 11151caf(초안, 'All web-verified (pcilmr(8), kernel TPH docs, Rambus/Synopsys, VFIO)')와 48b62e3b(발행, 'all web-verified') 두 개다. 출처 이름은 있으나 어떤 주장을 어느 자료와 대조했는지 기록이 없고, 256→768(17·44·92행), 16 GT/s 필수(21행), L0p 리타이머 필수(87행), 도입 버전(19·40·48·56·76행) 같은 spec 주장은 PCIe Base Spec이 아니라 벤더 블로그 근거로 적혀 있다. be973200·0a9dd7bc는 메타데이터 커밋이다. 평가 중 pcilmr(8) man page를 열려 했으나 접속 실패(ECONNREFUSED)로 1차 자료 대조는 하지 못했고, 글 안에서 동시에 참일 수 없는 두 기술 진술은 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 다섯 기능을 2~4문단씩 정의하는 spec 요약형이다(19~87행). 이 글만의 것은 `pcilmr` 실행 예(30~36행), IOMMU group 나열 루프와 ACS 확인 명령(64~72행), `pcie_acs_override` 경고(74행) 정도다. 10-bit Tag(40~46행)·TPH(48~54행)·L0p(76~87행)는 정의와 효과만 있고 언제 켜는지, 켜졌는지 어떻게 보는지가 없다. 74행 '신중해야 합니다', 87행 '전력 효율을 크게 끌어올립니다'는 근거 없는 일반론이다. |
| B | 9 | 기능별 정의→효과→정리(89~95행) 흐름은 있다. 10-bit Tag는 46행 '둘 다 지원할 때만 켜지며'로 끝나 Linux에서 켜는·확인하는 방법이 없고, TPH는 54행에 문서 경로만 있으며, L0p는 상태 확인 방법이 없다(76~87행). Lane Margining도 결과 해석이 없다(30~38행). 정확성 불확실이 열려 있어 B ≤ 13이고, 결과·한계가 여러 곳 빠져 5~9 구간. |
| C | 6 | 실행 명령은 32·35행 `pcilmr`, 66~68행 iommu_groups 루프, 71행 `lspci -vvv | grep` 뿐이고 실행 환경과 예상 출력이 없다. 35행 주석 'receiver 번호·step 지정'과 달리 명령에는 그런 인자가 없어 32행과 사실상 같은 명령으로 보인다. 44행 '대역폭이 outstanding 수에 묶입니다'는 계산 없이 주장만 있고, 256·768(42·44행)은 본문 출처가 없다(C ≤ 8). 측정·실패 관찰이 없어 4~7 구간. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter02-tlp.md`, `chapter11-linux-dma.md`, `chapter12-virtualization-1.md`, `chapter17-performance.md`, `chapter18-register-maps.md`, 다른 시리즈 `tools/emulation/qemu-fpga-driver/chapter09-vfio-basics.md`, `embedded/hardware/cxl/chapter10-arb-mux.md`. ACS 절(56~74행): 62행 'ACS 없으면 한 group'은 ch11 76~86행 표·ch12 108~119행과 같고, 71행 확인 명령은 ch11 86행·ch12 121행, 74행 override 경고는 ch12 121행과 같다. ACS 비트는 ch18 271~292행, IOMMU group 확인은 qemu-fpga-driver ch09 31~39행과 겹친다. TPH(48~54행)는 ch17 164~173행 DDIO 절과 주제가 겹치는데 서로 링크하지 않는다. Lane Margining·10-bit Tag는 저장소 안에 다른 글이 없고, L0p는 cxl ch10 87~95행이 CXL ALMP 관점이라 중복은 아니다. 10~14 아래쪽. |
| E | 6 | 제목의 다섯 기능은 모두 절이 있다(19·40·48·56·76행). description의 '실무 관점'은 Lane Margining(30~36행)·ACS(64~72행)에만 명령이 있고 10-bit Tag·TPH·L0p는 개념 설명뿐이라 부분 이행이다. |
| F | 5 | seriesOrder 19는 pcie 디렉터리 마지막 글인데(STORYBOARD.md는 draft: true) 89~107행에 다음 편 안내도 시리즈 마무리도 없다 → F ≤ 6. 46행은 'Ch 17 Performance의 bandwidth-delay product 논의'로 안내하지만 chapter17-performance.md 본문에 BDP·outstanding·tag 논의가 없다 → F ≤ 5. 관련 항목 99~104행 라벨은 대상 제목과 맞고, 102행 'Lane Margining의 맥락'은 물리 계층 장을 가리키는 맥락 표현이라 틀린 라벨로 보지 않는다. 38행 Ch 16 안내도 ch16 38·58행과 맞는다. |
| G | 3 | 54행이 `docs.kernel.org/PCI/tph`를 TPH 활성화 주장에 직접 연결하고, 105~106행에 pcilmr(8) man page와 커널 TPH 문서가 있다. 107행 Rambus는 벤더 블로그다. spec 주장(21·44·80·85·87행)에 PCIe Base Spec 판·절 인용이 없고 pciutils·커널 버전 표기도 없다. |

uncertainties:
- 17·44·92행 10-bit Tag 'outstanding 256→768'은 chapter02-tlp.md 78행 'Extended Tag로 256·1024 tag'와 다르다. 다른 글과의 모순이라 오류 확인에 넣지 않았고 PCIe Base Spec으로 확인하지 않았다.
- 42행 '기존 8-bit Tag는 256개'는 기본 5-bit(32개)와 Extended Tag 8-bit 구분이 빠졌다(ch02 78행은 기본 32 tag). spec 미확인.
- 35행 `pcilmr --margin 3d:00.0`의 주석 'receiver 번호·step 지정'과 인자가 맞지 않고, margin 모드가 기본이면 32행과 같은 명령이다. man page 접속 실패로 확인하지 못했다.
- 21행 '16 GT/s 이상 모든 포트(리타이머 포함)에 필수', 87행 'L0p는 리타이머에는 필수'는 벤더 블로그 근거로 보이며 spec 미확인.
- 48행 TPH 'PCIe 3.1+', 56행 ACS 'PCIe 2.0+' 도입 버전은 ECN 시점과 다를 수 있다. spec 미확인.
- 85행 L0p 협상 'Configuration.Complete 단계' 서술과 cxl ch10 89행 'PCIe는 Link Management DLLP를 쓴다'의 관계를 spec으로 확인하지 않았다(다른 글과의 관계라 오류 확인 아님).
- 74행 `pcie_acs_override`는 메인라인 파라미터가 아닌 외부 패치로 알려져 있으나 커널 문서로 확인하지 않았다(ch12 121행은 'ACS override patch'라고 적음).

병합 대상: 병합 대상 없음. Lane Margining·10-bit Tag는 저장소 안에 다룬 글이 없고(grep 결과 ch19뿐), L0p도 PCIe 쪽 집이 없다. 다음 조치는 보강이다. ACS 절(56~74행)은 ch11 76~86행·ch12 108~121행과 거의 같으므로 줄이고 ch12로 링크한다. TPH(48~54행)는 ch17 DDIO 절(164~173행)과 서로 연결한다. 10-bit Tag·TPH·L0p의 Linux 확인 방법, pcilmr 출력 예와 환경(35행 주석 수정 포함), spec 판·절 인용, 46행 Ch 17 안내 수정, 시리즈 마지막 편 안내를 넣는다.

### `postmortem/chapter01-core-generation.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 26행은 생성 조건을 '**PR_SET_DUMPABLE** 플래그 = 1'로 못박는데, 259행은 'prctl(PR_SET_DUMPABLE, 2); // suidsafe — root만 dump 읽기'로 값 2에서도 core가 만들어진다고 하고, 264행은 'suid_dumpable=2로 root만 읽을 수 있는 core 생성 허용', 325행 체크리스트는 'PR_SET_DUMPABLE 0 아닌가?'로 0이 아니면 된다고 한다. dumpable=2인 프로세스에 대해 26행(core 없음)과 259·264·325행(core 생성)은 둘 다 참일 수 없다. git log(0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그, be973200 topic 메타데이터, ac24bb76 제목 변경·날짜 정규화 등)에는 man 5 core·man 2 prctl·커널 문서와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 시그널별 흔한 원인 표(34~45행), core_pattern 서식 지정자 표(127~142행), 컨테이너 %p/%P 설명(146~153행), 7항목 체크리스트와 강제 SIGSEGV 테스트(320~351행), 대형 프로세스 core 생성 시간과 gcore·사후 압축 대안(372~383행)이다. 생성 조건(21~26행), PR_SET_DUMPABLE(256~264행), coredumpctl(209~239행), ASan 옵션(357~364행)은 man page 수준 정리이고 gdb-lldb/chapter07-core-dump.md 24~38·164~202·385~392행과 같다. 제목이 말한 커널 dump 경로 분석은 없다. 316행 'GNU libc 일부 버전', 396행 '추적 어려울 수 있음'처럼 근거 없이 끝나는 문장도 있다. |
| B | 11 | 조건(21~28행) → 시그널(30~56행) → ulimit·systemd(58~94행) → core_pattern·파이프(96~170행) → systemd-coredump(172~252행) → dumpable(254~271행) → coredump_filter(273~316행) → 체크리스트(318~351행) → ASan·대형 프로세스·fork(353~396행) → 정리(398~407행) 흐름은 갖췄다. 그러나 정확성 불확실이 열려 있어(168행 core_pipe_limit, 316행 COREDUMP_FILTER 등) B ≤ 13이고, 26행 'dumpable = 1' 조건이 259·264·325행과 모순되어 tldr(18행)·정리(400·405행)의 핵심 틀이 흔들린다. 383행 'file-backed 제외해 크기 ↓'는 296·298행 '기본값이 이미 file-backed 제외'와 해법으로서 맞지 않는다. 75~76행 limits.conf 설정이 코드 블록 밖이다. |
| C | 7 | 재현 가능한 명령과 기대 출력이 있다: ulimit 확인(60~67행), systemctl show LimitCORE(91~94행), coredumpctl info 출력 예(217~230행), 강제 SIGSEGV 테스트와 '(core dumped)' 유무 판정(330~344행). 실행 환경(배포판·커널·systemd 버전)이 없고 출처 없는 수치(200행 JournalSizeMax=767M, 368행 shadow 1/8·'수 GB', 374행 10GB+ '분 단위')가 있어 C ≤ 8. 336~341행은 같은 명령을 두 번 실행해 OK/BAD가 갈리는데 BAD의 조건이 없어 1점 더 뺐다. |
| D | 5 | 다른 시리즈 비교: `tools/debugging/gdb-lldb/chapter07-core-dump.md`. 생성 조건 21~26행 ↔ ch07 24~31행, PR_SET_DUMPABLE·suid_dumpable=2 254~264행 ↔ ch07 34~38행(문장 거의 동일), LimitCORE 84~89행 ↔ ch07 50·62행, '/var/crash/core.%e.%p' 110행 ↔ ch07 77행, %p/%P 146~151행 ↔ ch07 96행, 파이프 핸들러 함정 155~161행 ↔ ch07 98~100행, coredumpctl 209~239행 ↔ ch07 164~202행, coredump_filter 0x33 277~308행 ↔ ch07 299~312행, ASan 357~364행 ↔ ch07 385~392행, 정리 400행 ↔ ch07 418행. 같은 시리즈: 'sudo gcore -o /tmp/core <pid>'가 이 글 380행, chapter02 378행, chapter04 328행에 반복되고, chapter03 43~49행 coredumpctl debug가 233~239행과 겹친다. 이 글만의 것은 시그널 표·서식 지정자 표·coredump.conf·체크리스트 정도라 5~9 구간 하단. |
| E | 5 | 제목(2행)은 'kernel의 dump path 분석'을 약속하지만 본문은 ulimit·core_pattern·systemd-coredump·coredump_filter 같은 사용자 공간 설정·명령 정리이고 커널 내부 경로(시그널 처리→core writer)는 다루지 않는다. 루브릭 E('분석' 약속 대비 개념·설정 소개 수준이면 3~5)를 적용했다. description(5행) 항목은 58~271행에서 이행한다. |
| F | 5 | 411행 다음 장 예고(ELF core, PT_NOTE·NT_PRSTATUS·NT_FILE)는 seriesOrder 2 `chapter02-elf-core-format.md`와 맞고, 415행 라벨과 355행 Sanitizer 링크(sanitizers/chapter02-asan-ubsan.md)도 대상과 맞는다. 그러나 시리즈 첫 글로 도입을 겸하면서(15행) 루브릭 5절이 허브에 요구하는 목차 링크·편수(6편)·읽는 순서가 없다. 같은 주제의 gdb-lldb ch07로 가는 링크도 없고 75~76행이 코드 블록 밖이다. 409~419행 예고·관련 항목은 템플릿이라 가점 근거가 아니다. |
| G | 2 | 본문에서 주장과 묶인 1차 출처는 32행 'man 7 signal의 Default action 열' 하나다. 416~419행 man 5 core·man 8 systemd-coredump·man 1 coredumpctl·kernel.org sysctl 문서는 글 끝 관련 항목이라 특정 주장에 묶이지 않는다. 커널·systemd·glibc·ASan 버전 표기가 없고 kernel.org 링크는 'latest'다. |

uncertainties:
- 점수 구간은 병합 검토(47)다. 오류 확인이 없었다면 시리즈 첫 글이 도입을 겸하므로(15행, 시리즈에 overview 없음) 루브릭 5절 허브 예외로 보강에 둘 글이다(published-loop-01 bootloader ch01 선례). 병합 방향 후보는 gdb-lldb/chapter07-core-dump.md의 생성·설정 절과 역할 분담.
- 168행 core_pipe_limit '기본 0 = 무제한'과 '사용 시 1 이상으로', 161행 '시간 제한 있음'의 관계를 kernel sysctl 문서로 확인하지 않았다.
- 259행 prctl(PR_SET_DUMPABLE, 2)를 prctl이 받는지(man 2 prctl) 확인하지 않았다. 오류 확인은 26행과의 내부 모순으로만 판정했다.
- 316행 COREDUMP_FILTER 환경 변수를 glibc가 적용한다는 주장 출처 없음.
- 153행 컨테이너 안 자체 core_pattern 가능 여부(namespace별인지) 미확인.
- 174행 Ubuntu 22.04+ 표준, 198~202행 coredump.conf 값이 기본값인지, 188행 '자동 만료' 주체 미확인.
- 284~296행 coredump_filter 비트 표(7·8번)와 0x33 해석을 man 5 core로 대조하지 않았다(0x33=bits 0,1,4,5 산술 자체는 맞다).
- 138행 %e 15바이트, 41·44~45행 SIGSYS 31·SIGXCPU 24·SIGXFSZ 25 번호의 아키텍처 의존성 미확인.
- 368~370행 ASan shadow·coredump_dump_full_shadow 설명과 'core_filter' 용어, 396행 vfork 콜스택 설명 출처 없음.
- 75~76행 limits.conf 줄의 렌더링(목록 변환 여부)은 빌드 HTML로 확인하지 않았다.

### `postmortem/chapter02-elf-core-format.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료: Linux `include/uapi/asm-generic/siginfo.h`(torvalds/linux master, raw.githubusercontent.com에서 열어 확인). 185행 '6 (SEGV_BNDERR)'·186행 '7 (SEGV_PKUERR)'는 헤더 '#define SEGV_BNDERR 3'·'#define SEGV_PKUERR 4'와 다르고, 200행 '7 (ILL_PRVOPC)'·201행 '8 (ILL_PRVREG)'는 헤더 '#define ILL_PRVOPC 5'·'#define ILL_PRVREG 6'과 다르다(헤더에서 7은 ILL_COPROC, 8은 ILL_BADSTK). BUS 190~193행과 SEGV 1·2, ILL 1~3은 맞다. 같은 대조에서 65~80행 n_type 값은 `include/uapi/linux/elf.h`와 모두 맞았다(73행 NT_FPREGSET은 glibc 이름, 헤더는 NT_PRFPREG). git log는 0a9dd7bc(slug 고정), 68525f0c(코드 블록 산문 이동), 28524a9d(언어 태그) 등 서식 커밋뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 n_type 값과 owner를 붙인 NT_* 표(65~80행), 스레드별 노트 묶음(82행), PT_LOAD의 FileSiz<MemSiz·FileSiz=0 해석(292~305행), GDB core 로딩 의사 코드(309~347행)다. 나머지는 구조체 나열(88~104·131~146·207~217행)과 readelf 출력이고, 필드가 왜 중요한지는 127·149·278행 한 줄 설명뿐이다. 402~437행 Mach-O·.ips·minidump는 소개 수준이다. 6~12 구간 상단. |
| B | 12 | 도입(13행) → 전체 구조(19~43행) → 노트별 절(45~278행) → PT_LOAD(280~305행) → GDB 로딩(307~347행) → build-id·gcore·minicore(349~400행) → 다른 포맷(402~437행) → 정리(439~450행)로 흐름은 끝까지 간다. 13행이 약속한 '부분 core 표현'은 292~305행뿐이고, 309~345행 의사 코드는 216행 paths 배열과 entries 대응을 설명하지 않는다. 정확성 불확실(NT_FILE 오프셋 단위, 예시 주소 불일치)이 열려 있어 B ≤ 13. |
| C | 6 | readelf -h/-l/-n 명령과 예시 출력(25~41·111~125·151~158·222~237·254~276·296~303행), gdb print $_siginfo(173~177행), gcore(377~381행)가 있다. 커널·binutils·GDB 버전이 없고, 38~39·298~300행은 .text를 0x400000에 두는데 226~233행 NT_FILE과 261·266행 AT_PHDR·AT_ENTRY는 같은 server를 0x555555554000대에 둔다. 428행 'full core의 1/1000', 391행 '수십 GB'는 출처·환경 없는 수치라 C ≤ 8이고, 예시 출력끼리 맞지 않아 4~7 구간. |
| D | 8 | 비교한 글: `postmortem/chapter01-core-generation.md`, `chapter03-gdb-core-analysis.md`, `chapter04-debuginfod-minidump-automation.md`, `gdb-lldb/chapter07-core-dump.md`, `dwarf-elf/chapter01-elf-overview.md`. (1) gdb-lldb ch07 102~160행이 이 글 13~43행(같은 readelf -l 출력 NOTE 0x478/0x2a30, LOAD 0x400000·0x401000), 65~80행(그 글 128~136행), 113·153·224·256행 노트 크기(그 글 144~155행)와 같고, 그 글 261~266행 SIGSEGV si_code 표가 이 글 181~186행과 같다(틀린 6·7 값까지). (2) chapter03 115~133행 siginfo 출력·si_code 해독이 이 글 173~201행과 겹친다. (3) chapter04 217~239행 minidump('core의 1/1000', 239행)가 이 글 424~437행과 겹친다. (4) dwarf-elf ch01은 일반 ELF NOTE만 다뤄 역할이 다르다. 5~9 구간. |
| E | 7 | 제목의 NT_PRSTATUS(84~127행)·NT_PRPSINFO(129~158행)·NT_FILE(205~241행), description의 PT_NOTE/PT_LOAD(45~82·280~305행)·NT_AUXV(243~278행)를 다룬다. 제목 범위는 ELF core인데 402~437행은 Mach-O·.ips·minidump로 넓히고, '분해'라는 약속에 비해 노트 바이트 배치는 57~58행 정렬 규칙 외에 hex 수준으로 분해하지 않는다. |
| F | 5 | 454행 'Ch 3 — GDB로 core 분석'은 seriesOrder 3 `chapter03-gdb-core-analysis.md`와 맞다. 458~460행 링크 대상(chapter01, chapter03, dwarf-elf/chapter01-elf-overview)을 열어 라벨이 맞음을 확인했다. 그러나 371행 '자세히는 다음 장'(build-id)은 chapter03에 build-id 내용이 없고 chapter04 19~38행이 다룬다. 다음 편 안내가 틀려 F ≤ 5. 전제 지식 안내 없음. |
| G | 2 | 본문 출처는 461행 'man 5 core, man 5 elf'(링크 없음), 462행 2015년 개인 블로그(2차), 398행 minicoredumper 제품 페이지뿐이다. 65~80행 n_type, 88~104행 elf_prstatus, 181~201행 si_code가 어느 헤더·커널 버전 기준인지 없고 readelf·GDB 버전도 없다. |

uncertainties:
- 207~217·226~233행 NT_FILE file_offset: 커널 fs/binfmt_elf.c fill_files_note 주석은 'long page_size -- units for file_ofs'이고 m->pgoff를 쓴다(1차 자료 확인). 214행은 단위를 말하지 않아 직접 모순은 아니지만, 228·230·232행 0x2000·0x6000·0x8000을 readelf가 page 단위 원값으로 찍는지 바이트로 환산하는지는 binutils를 열어 보지 않았다.
- 38~39·298~300행(.text 0x400000)과 226~233·261·266행(같은 server 0x555555554000대), 122행 rip 0x5555555a3b12(server 매핑 끝 0x55555555d000 밖): 같은 core라고 글이 명시하지 않아 오류 확인에 넣지 않았다.
- 292행 'FileSiz < MemSiz이면 나머지는 zero (.bss)': core PT_LOAD에서 이 해석이 맞는지 미확인.
- 394행 '오픈 도구 별 없음'과 398행 minicoredumper 링크가 어긋난다. 라이선스·배포 형태 미확인.
- 109행 x86-64 elf_gregset_t = unsigned long[27]은 arch/x86 헤더로 확인하지 않았다.
- 428행 minidump 'full core의 1/1000', 415행 .ips 'JSON 또는 텍스트'는 출처 없는 주장이다.

### `postmortem/chapter03-gdb-core-analysis.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 68525f0c(코드 펜스 속 산문 이동), 28524a9d(언어 태그), be973200(topic 메타), ac24bb76(제목 변경), 49f2a443(라벨 목록 변환), 400892d7(린터), 09a00a29(stub 배포), 35e57912(디렉터리 이름 변경)이다. si_code 값·GDB 명령 동작을 GDB 매뉴얼이나 Linux siginfo.h와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 못해(로컬에 /usr/include/asm-generic 없음) 오류 확인은 주지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 작성자의 해석이 들어간 부분은 '자주 만나는 패턴' 8개(254~403행)다. 0x4141…를 "AAAAAAAA"로 읽는 법(279~289행), 스택 dump 끝의 0x0a로 gets/strcpy를 의심하는 추론(301~309행), mutex `__owner`로 락 그래프를 그리는 법(326~332행), si_code+si_addr 조합별 진단 표(137~145행)가 여기에 든다. 열기·bt·info threads·set print(15~111, 405~418행)는 GDB 입문 목록이다. 진단도 '추정 가능'(186행), '의심'(287·309행) 수준에서 끝나 13~19 구간 하단. |
| B | 13 | 열기(15~53행) → 첫 명령(55~111행) → siginfo(113~153행) → 프레임 이동(155~186행) → 메타 정보(188~221행) → 변수 검사(223~252행) → 패턴(254~403행) → pretty-printer·Python(420~469행) → 정리(471~480행)로 갖춰져 있다. 다만 37행 SIGSEGV와 38·61행 `__throw_length_error`가 한 사례로 묶여 있고, 117~121행 si_addr=0xdeadbeef도 같은 사례에 붙어 있다. 정확성 의문이 열려 있어 B ≤ 13. 데드락 패턴(311~332행)은 그래프를 실제로 그리지 않고 끝난다. |
| C | 7 | 명령과 예시 출력은 많다(59~111, 190~221, 436~467행). 그러나 GDB·glibc·커널 버전과 재현용 crash 프로그램이 없고, 출력도 `0x00005555...`처럼 잘라 쓴 예시다. 37행 SIGSEGV와 38행 throw_length_error, 38행 stdexcept.cc와 74행 stdexcept_msg.cc, 86행 '(unsigned)-1'과 186행 '(size_t)-1'이 맞지 않는다. 패턴마다 정상·실패 관찰 대조가 없다. C ≤ 8과 AP-C-24를 적용했다. |
| D | 9 | 비교한 글: 같은 시리즈 `postmortem/chapter02-elf-core-format.md`·`chapter04-debuginfod-minidump-automation.md`, 다른 시리즈 `gdb-lldb/chapter07-core-dump.md`·`concurrency/chapter04-deadlock-race-methodology.md`·`gdb-extension/chapter02-commands-events.md`. (1) 18·61~64행 열기 명령과 bt 4프레임이 gdb-lldb ch07 217~225행과 글자까지 같다. (2) 116~127행 `$_siginfo` 출력과 SEGV si_code 목록이 gdb-lldb ch07 254~266행, postmortem ch02 174~186행과 같다. (3) 43~53행 coredumpctl이 gdb-lldb ch07 164~168행 이하와 같다. (4) 326~332행 `__owner` 그래프가 concurrency ch04 55~63·390행과 겹친다. (5) 436~467행 gdb.Command가 gdb-extension ch02 15~23행과 같은 패턴이다. 8가지 crash 패턴 카탈로그(254~403행)는 다른 글에 없어 5~9 구간 상단. |
| E | 7 | 제목의 backtrace(57~86행), info threads(88~111행), py 활용(434~469행)과 description의 siginfo 해독(113~153행), 콜스택·변수 검사(155~252행), 자주 만나는 패턴(254~403행)이 모두 있다. 대상 독자와 풀려는 구체 문제는 13행 '실전 흐름' 소개뿐이라 9점 이상은 주지 않았다. |
| F | 4 | 484행 다음 장 예고는 'Ch 4 (마지막)'인데 같은 디렉터리에 seriesOrder 5(`chapter05-cxl-device-postmortem.md`)와 6(`chapter06-cxl-fabric-postmortem.md`)이 draft:false로 있다. 492행 라벨 'Sanitizers Ch 1: AddressSanitizer'는 seriesOrder 2 `sanitizers/chapter02-asan-ubsan.md`('ASan과 UBSan 실전 설정')로 가고, Ch 1은 chapter01-intro.md('Sanitizer 종류 비교')다. 491행은 대상 파일이 있는데도 링크가 없다. 488·489행 라벨은 맞다. 틀린 관련 라벨이 있어 F ≤ 5. |
| G | 2 | 본문 출처는 관련 항목 490행 GDB 매뉴얼 'Files' 절 링크 하나뿐이고 특정 주장과 연결돼 있지 않다. 127~133행 si_code 번호와 137~145행 진단 표에 siginfo.h나 sigaction(2) 같은 출처가 없다. 버전은 74·427행 경로(c++/11, libstdc++.so.6.0.32)에서 간접적으로만 보인다. |

uncertainties:
- 127행 SEGV_BNDERR=6, SEGV_PKUERR=7: 기억으로는 asm-generic/siginfo.h에서 3·4다. 이 글 평가 중에는 1차 자료를 열지 못해 오류 확인으로 올리지 않았다(같은 루프 postmortem ch02 더블 체크에서 헤더로 3·4가 확인됨). gdb-lldb ch07 265~266행에도 같은 값이 있다.
- 37~38행: SIGSEGV로 끝났다는 줄과 #0 `std::__throw_length_error`가 한 사례로 나온다. 처리되지 않은 예외는 보통 abort(SIGABRT)로 끝나고, 61~64행 bt에도 abort 프레임이 없다. 117~121행 si_addr=0xdeadbeef도 이 사례와 연결되지 않는다.
- 86행 '18446744073709551615 (= (unsigned)-1)': 2^64-1이고 x86_64(35행)에서 unsigned int -1은 4294967295다. 186행은 같은 값을 '(size_t)-1'로 적었다. 언어 규칙 판단이 필요해 오류 확인으로 올리지 않았다.
- 263~275행 패턴 1: NULL 객체에 가상 함수를 부르면 vptr를 읽는 순간(offset 0) fault가 나야 하는데 si_addr=0x10을 'NULL + 멤버 offset'으로 설명했다. 1차 자료 미확인.
- 159~160행 `frame 2` 다음 `bt`가 #2 한 줄만 출력하는 것은 실제 GDB 동작과 다를 수 있다. 175행 '사망 상태'는 비유다.
- 232행 `print arr@10`: 기억으로는 GDB 문법이 `arr[0]@10` 또는 `*arr@10`이다. 매뉴얼 미확인.
- 219행 'info proc mappings가 NT_FILE 노트에서 옴'과 213~214행 Perms 열: NT_FILE에는 권한 정보가 없는 것으로 기억한다. 미확인.
- 385행 `bt -5`를 '가장 오래된 5개'라고 한 설명과 363~365행 frame 1의 `*obj` 출력은 확인하지 않았다.

병합 대상: 후보는 `src/content/blog/tools/debugging/gdb-lldb/chapter07-core-dump.md`다. 이 글의 열기·bt·siginfo·coredumpctl 절이 그 글 217~266행, 164~168행과 같은 예제다. 다만 crash 패턴 카탈로그(254~403행)는 다른 글에 없고 'core 증상별 진단'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 15~153행은 gdb-lldb ch07·postmortem ch02 링크로 줄이고, 패턴 절은 재현 가능한 crash 예제·실제 GDB 출력·버전을 붙여 키운다. si_code 값은 siginfo.h와 대조하고, 484행 '마지막'과 491·492행 관련 항목을 고친다.

### `postmortem/chapter04-debuginfod-minidump-automation.md` — 42점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타데이터), ac24bb76(제목 변경·날짜 정규화) 등 형식 커밋뿐이다. elfutils/debuginfod 문서, Breakpad, ASan 옵션 같은 1차 자료와 대조한 커밋은 없다. 평가 중 1차 자료를 열지 않았고, 원문만으로 동시에 참일 수 없는 기술 진술 쌍도 찾지 못했다. 13·447행 '마지막 장'·'4장'은 내비게이션 결함이라 F에서 감점했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | build-id·별도 debuginfo·debuginfod 서버 표·minidump 구조(19~173·217~269행)는 도구 사용법 나열이고 dwarf-elf ch06과 거의 같은 문장이다. 이 글 고유 부분은 postmortem.sh(177~213행), coredump 디렉터리 감시 systemd path unit(369~385행), 콜스택 해시로 Slack 스레드를 묶는 발상(405~411행)이다. debuginfod와 minidump를 언제 고르는지 같은 선택 기준이 없고 161행 'game changer', 296행 '운영 환경 자체 사용에 좋음'처럼 평가만 있다. 6~12 구간. |
| B | 10 | build-id(19행) → 별도 debuginfo(40행) → debuginfod(96행) → 자동 스크립트(175행) → minidump(217행) → SaaS(271행) → CI·production(344행) → 정리(445~461행)까지 흐름은 끝난다. 그러나 Breakpad 예(225~230행)는 `ExceptionHandler eh(...)` 한 줄뿐이고, 298~300행 Backtrace·Bugsnag 절은 두 문장, 391~415·422~441행 Python 예는 `...`로 끝나는 조각이다. 정확성 의문(21·120·124·353·356행)이 열려 있다. 10~15 구간 하단. |
| C | 6 | 명령은 있다(44~48행 objcopy, 79~82행 build-id 경로, 165~171행 debuginfod-find, 307·316행 ASAN_OPTIONS). 출력은 106~108·257~267행처럼 `[...]`, `0x...`로 지운 예시이고 elfutils·GDB·Breakpad 버전과 배포판이 없다. 120행 '기본 1 GB 한도', 239행 '수 MB. core의 1/1000', 285행 '월 수천 달러', 335행 '수초 정지'는 출처·환경 없는 수치라 C ≤ 8. 353행 `|| true` 뒤 356행 `if: failure()`는 분석 step이 도는지 의심되고, 215·365행 'PR 코멘트'에 대응하는 step이 없다. 406행 join, 411행 미정의 `signature_to_ts`, 432행 import 없는 `struct`는 그대로 돌지 않는다. |
| D | 5 | 비교한 글: 같은 시리즈 `postmortem/chapter02-elf-core-format.md`, `chapter03-gdb-core-analysis.md`, `chapter05-cxl-device-postmortem.md`, 다른 시리즈 `dwarf-elf/chapter06-split-dwarf-tools.md`, `gdb-lldb/chapter07-core-dump.md`, `sanitizers/chapter02-asan-ubsan.md`. (1) dwarf-elf ch06: 30~33행 `ld --build-id=` = ch06 157~160행, 36행 = ch06 163행, 40~54·65~84행 = ch06 124~143행, 140행 DEBUGINFOD_URLS = ch06 170행, 116~117행 = ch06 187~188행, 148행 = ch06 197행, 158행 = ch06 201행, 161행 'game changer' = ch06 204행, 166~170행 = ch06 177~179행. (2) gdb-lldb ch07: 217~269행 minidump = ch07 364~378행, 307~311행 ASAN_OPTIONS = ch07 385~388행, 316·319행 = ch07 393행, 161행 = ch07 297행. (3) postmortem ch02 373~378·424~437행 = 이 글 323~335·217~285행. 자동화 스크립트·path unit만 독자 역할이라 5~9 구간 하단. |
| E | 6 | 제목과 description의 build-id 자동 매칭, Breakpad/crashpad minidump, CI 자동 사후 분석은 19·96·217·344행 절로 다룬다. '파이프라인'은 build→index→수집→분석의 연결을 약속하지만 본문은 도구 절을 나열하고 456~461행 6줄 체크리스트로 끝난다. gcore·eu-stack(323~342행), pyelftools(417~443행)는 제목 범위 밖이다. |
| F | 4 | 13행 '이 시리즈의 마지막 장', 447행 '4장으로 … 전체 생명주기'라고 쓰지만 `chapter05-cxl-device-postmortem.md`(seriesOrder 5)·`chapter06-cxl-fabric-postmortem.md`(seriesOrder 6)가 draft: false로 공개돼 있다. 다음 편 안내가 틀려 F ≤ 5. 465~467행 Ch1~3 라벨과 476행 dwarf-elf ch06 라벨은 대상과 맞는다. 477행 'Concurrency Debugging'은 링크 없는 항목이고, 478행 Embedded Debugging은 RSP 프로토콜 글로 가서 관련이 약하다. 304행 Sanitizer 링크는 맞다. |
| G | 2 | 본문 223행에 Breakpad·crashpad 저장소 링크가 있고 469~475행에 sourceware debuginfod 문서·Breakpad·crashpad·Sentry가 있다. 그러나 120행 캐시 한도, 111행 Range 부분 다운로드, 316행 `coredump_dump_full_shadow` 같은 구체 주장에는 출처가 없고 elfutils·GDB·Breakpad 버전·확인 날짜가 없다. |

uncertainties:
- 21행 '해시로 만든 32바이트 (SHA-1 기본)': SHA-1 digest 길이와 맞는지 GNU ld 문서로 확인하지 않았다.
- 120행 '기본 1 GB 한도'와 124행 `DEBUGINFOD_MAXSIZE=10G`: 이 환경변수가 캐시 크기 한도인지 elfutils 문서로 확인하지 않았다.
- 111행 'Range 부분 다운로드'를 debuginfod 클라이언트 동작으로 확인하지 않았다.
- 148행 `debuginfod -F /opt/builds ... /opt/builds`와 151행 '-F — 인덱싱할 디렉터리': -F가 디렉터리 인자를 받는 옵션인지 미확인.
- 353행 `./test_runner || true` 뒤 356행 `if: failure()`: 앞 step이 항상 성공하면 분석 step이 돌지 않는다는 의심(GitHub Actions 문서 미확인). 365행 'PR 코멘트'는 코드에 해당 step이 없다.
- 406행 `"|".join(...)` TypeError 가능성, 411행 `signature_to_ts` 미정의, 432행 `struct` 미import, 393행 `import gdb` 스크립트를 GDB 밖에서 실행하는 방법 설명 없음.
- 316행 `coredump_dump_full_shadow` 옵션 이름과 319행 'shadow가 원본 1/8'은 sanitizer 문서로 확인하지 않았다.
- 239행 'core의 1/1000', 285행 '월 수천 달러', 335행 '수초 정지'는 출처·환경 없는 수치.
- 289행 Sentry self-hosted의 minidump 처리 지원, 132~134행 Ubuntu·Debian·Arch debuginfod URL의 현재 유효성 미확인.

병합 대상: 후보는 `src/content/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools.md`(build-id·별도 debuginfo·debuginfod 절이 124~204행과 거의 같음)와 `src/content/blog/tools/debugging/gdb-lldb/chapter07-core-dump.md`(minidump·ASan core 절 364~393행). 다음 조치는 보강이다. '수집한 core를 자동으로 분석·그룹화하는 파이프라인'은 두 대상과 다른 검색 의도라 병합보다 차별화가 낫다. debuginfod·build-id 기본 설명은 dwarf-elf ch06 링크로 줄이고, postmortem.sh·systemd path unit·CI·그룹화 절을 1차 자료로 대조해 실행 가능한 형태로 만든다. 13·447행 '마지막 장' 문구와 445~467행 정리·관련 항목에 ch05·06을 반영한다.

### `postmortem/chapter05-cxl-device-postmortem.md` — 63점, 보강

confidence: 중간

factcheck: 검증됨. 커밋 06018beb "fix(content): Postmortem Debugging Ch 5 — replace invented drgn/mailbox-log analysis with verifiable walk". 본문의 cxl_config_state 다섯 값, CXL_REGION_F_NEEDS_RESET, node_spanned_pages 의미, pci.c·core/ras.c format 문자열, drgn에 CXL helper 없음을 torvalds/linux drivers/cxl/{pci.c,core/ras.c,core/port.c,core/region.c,cxl.h,cxlmem.h}, include/linux/mmzone.h, mm/numa.c @ master와 osandov/drgn helpers/linux/{device,nodemask}.py @ main에 대조했고 틀린 항목·삭제 항목을 커밋 본문에 적었다. 23ed6256은 출처 없는 qualify 커밋이라 근거에서 뺐다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | 21행은 poison list·event log가 디바이스 쪽에 있어 vmcore에 남지 않는다고 postmortem의 한계를 가른다. 42행은 cxl_config_state에 오류 값이 없다는 점과 NEEDS_RESET의 뜻을 짚는다. 57행은 present와 spanned를 구분하고 'CXL 노드가 없거나 present 0이면 crash 전 메모리가 내려간 단서'라는 판단 기준을 준다. 70~76행은 실제 format 문자열과 출처 파일을 묶은 표다. 다만 27~40행 drgn 순회는 kernel/chapter08-cxl-driver-debug.md 78~91행과 거의 같고, 실제 장애 사례나 78행 순서 판별의 예가 없어 20점대는 주지 않는다. |
| B | 12 | 13~21행(왜 다른가) → 23~42행(drgn) → 44~57행(NUMA) → 59~78행(kernel log) → 80~87행(함정) → 89~95행(체크리스트) → 97~102행(정리) 흐름은 완성됐다. 그러나 17행·description(5행)이 약속한 decoder의 'commit 단계, 매핑된 HPA 범위'는 42행에서 device_type 이름 나열뿐이고 읽는 코드가 없다. 92행 체크리스트의 decoder·memdev 검사도 코드가 없고, 78행 메시지 순서 판별은 예가 없다. 52행 node_data 의존 등 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 28행 drgn 실행 줄, 29~39행 region 순회, 48~55행 노드 페이지 수, 63~66행 crash log grep으로 절차는 재현 가능하다. 그러나 커널·drgn 버전과 환경이 없고 정상/실패 출력 예가 하나도 없다(06018beb에서 허구 출력을 지운 뒤 대체 출력 없음). 절차만 있으므로 C ≤ 9, 72행 '2초'는 버전 없이 소스 파일명만 있어 C ≤ 8. 87행 'PCI 레벨에서 끝남'도 근거 없는 추론이다. |
| D | 10 | 같은 시리즈 인접 글: `chapter04-debuginfod-minidump-automation.md`(유저 공간 Build-ID·debuginfod, 19·40·65행 절 — 겹침 없음), `chapter06-cxl-fabric-postmortem.md`(15행에서 이 글을 단일 호스트 편으로 받고 multi-host로 넘어감). 다른 시리즈: `kernel/chapter08-cxl-driver-debug.md`는 이 글 25~40행 bus_for_each_dev 순회·container_of(cxl_region)·params.state 출력이 그쪽 76~91행과 거의 같고, 42행 device_type 목록이 그쪽 94행, 72행 mailbox timeout이 그쪽 70·102행, 74~75행 frozen 처리가 그쪽 105행과 겹친다. `kernel/chapter06-crash-drgn.md`는 crash log 일반 사용(111~112행)만 겹친다. `memory/chapter06-cxl-memory-diagnostics.md`는 cxl list -L·poison(41~50행)을 살아 있는 시스템에서 다루고 이 글 21행이 그쪽으로 넘겨 역할이 갈린다. vmcore 관점 NUMA 복원·로그 표·한계 구분은 이 글 고유. |
| E | 7 | 제목의 Device State·Kernel Log·NUMA 토폴로지가 23~42행, 59~78행, 44~57행 절과 대응하고, 06018beb에서 'Mailbox Log'를 빼 과장이 줄었다. 다만 description(5행)의 'decoder 상태 복원'은 42행 이름 나열뿐이고 '분석 흐름'의 결론(78행)에 예가 없다. 대상 독자 명시 없음. |
| F | 7 | 106행 'Ch 6 — CXL Fabric Postmortem'은 seriesOrder 6 `chapter06-cxl-fabric-postmortem.md`(draft:false)와 맞다. 110~114행 관련 항목 5개(postmortem ch01·ch03, kernel ch06·ch08, memory ch06)를 열어 라벨·title·draft:false를 확인했다. 89~95행 체크리스트가 절 순서와 대응한다. 전제 지식(kdump 설정, crash/drgn 기본) 안내가 없고 렌더 확인을 안 해 9 이상은 주지 않는다. 템플릿 요소는 점수 근거로 쓰지 않았다. |
| G | 3 | 본문 출처는 25행 drivers/cxl/core/port.c, 42행 drivers/cxl/cxl.h, 57행 include/linux/mmzone.h, 70~76행 표의 pci.c·core/ras.c 출처 칸으로 주장에 묶여 있다. 그러나 링크·커널 버전·drgn 버전이 없어 대조 시점을 독자가 알 수 없다. 06018beb 대조 기록은 factcheck에만 반영했다. |

uncertainties:
- 52행 prog["node_data"][nid]: node_data 전역 배열이 모든 아키텍처에서 같은 이름·형태로 있는지 1차 자료로 확인하지 않았다.
- 42행 CXL_REGION_F_NEEDS_RESET bit 1과 cxl_config_state 다섯 값은 06018beb가 master 기준으로 대조했지만 버전 표기가 없어 이후 upstream 변경 여부는 미확인.
- 72행 '2초'(CXL_MAILBOX_TIMEOUT_MS)는 커밋 본문에 개별 대조 기록이 없다. kernel/chapter08-cxl-driver-debug.md 102행과는 일치한다.
- 85행 'cxl_bus_type 심볼을 못 찾음 = cxl_core debuginfo 미로드'는 cxl_core가 모듈로 빌드된 구성에만 해당하는지 미확인.
- 87행 'AER 메시지는 있는데 cxl 메시지 없음 = PCI 레벨에서 끝남'은 소스 근거가 없는 추론이다.

### `postmortem/chapter06-cxl-fabric-postmortem.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. 1c1077df는 32행 CFMWS 표 행 하나만 Linux include/acpi/actbl1.h와 CXL 3.1 glossary로 대조했다. 같은 커밋 본문에 "FM is out-of-band" 줄(19행)은 CXL Ch 4에서 고친 주장(c38b4429)을 되풀이한다고 적혀 있고 디버깅 시리즈 라운드로 미뤄졌다. 그래서 글 전체를 대조한 커밋으로 볼 수 없다. 23ed6256은 drgn helper 문장을 완곡하게 바꾼 qualify 커밋이라 검증으로 치지 않는다. 1차 자료를 열어 확인한 오류는 없고, 원문 안에서 두 진술이 동시에 참일 수 없는 경우도 확정하지 못했다(138행과 193행은 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글에만 있는 것은 fabric 장애를 Switch failure·LD 충돌·Cache invalidation 폭증·FM failure 네 시나리오로 나눈 틀(63~121행)이다. 시나리오마다 증상 3줄과 분석 4줄이 전부이고 실제 로그·이벤트 레코드·명령은 없다. 106행 '일반 해결: cache line padding 또는 NUMA-local 할당'과 120행 'failover 동작 검증'은 일반론이다. Correlation 도구 표(144~151행)는 Lustre·Ceph·Jaeger 이름 나열이고 CXL 적용은 151행 '유사한 접근' 한 문장뿐이다. 125행 '개념적 예시 — 실 helper API는 drgn 및 kernel 버전 의존'은 구체 주장을 완곡 표현으로 바꾼 것이다. anchor part6-09와 같은 수준. |
| B | 9 | 도입(13~21행) → 자료 목록(23~35행) → 시간 정렬(37~61행) → 시나리오 4개 → drgn → 모범 사례 → 체크리스트 → 함정 → 정리 순서는 갖췄다. 그러나 FM log와 LD 할당 이력을 어떤 인터페이스로 뽑는지 없다(88·173행에 FM API·이벤트 레코드 언급 없음). 61행 'PROC TIME과 RTC를 비교해 공통 timeline에 매핑'에 방법이 없고, 133행 `walk_cxl_logical_devices`는 정의되지 않은 함수다. 19·113·193행 불확실이 열려 있어 B ≤ 13이고, 빈 곳이 많아 5~9 구간. |
| C | 4 | 재현할 수 있는 절차가 없다. 50~59행 crash 출력은 환경·버전 없이 `ptime`·`sys` 출력 조각이고 58행은 'DATE: ...'로 비어 있다. 127~136행 drgn 코드는 정의 없는 walker를 부르는 개념 코드다. 43~45행 시간 source 정확도(NTP 1~10 ms, PTP µs, GPS ns)는 출처·환경 없는 수치라 C ≤ 8. 측정·실패 사례·관찰 결과가 없어 4~7 구간 하단. |
| D | 12 | (1) 같은 시리즈 `chapter05-cxl-device-postmortem.md`는 단일 호스트 vmcore에서 `bus_for_each_dev`로 cxl_region을 도는 실행 코드(Ch5 25~40행)를 다룬다. 이 글은 multi-host 상관 분석이라 질문이 다르지만, drgn helper 이야기(123~138행)는 Ch5 25행과 겹치고 Ch5는 범용 helper로 해결하는데 이 글은 정의 없는 walker를 쓴다. (2) `embedded/hardware/cxl/chapter13-switching-fabric.md`는 FM·bind/unbind의 spec 메커니즘(71행 §7.6.1, 91~98행 §7.6.6)을 다룬다. 이 글 19·108~121행 FM 서술과 주제가 같지만 Ch13은 동작 정의, 이 글은 장애 분석이다. (3) `hbm/chapter12-cxl-pooling-fabric.md`와는 17~21행 도입만 겹친다. (4) BISnp·ping-pong(95~106행)은 `cxl/chapter03-coherency-model.md` 58~74행, `cxl/chapter07-cxl-cache.md` 126행과 개념이 겹친다. 시리즈 안 역할이 구별되어 10~14 구간. |
| E | 5 | 제목은 'Multi-Host Pool 장애 추적', description(5행)은 'Fabric Manager log·LD 상태·cross-host correlation'을 약속한다. 본문은 셋을 언급하지만 FM log 형식과 LD 상태 확인 방법이 없다(29·88행은 이름만). correlation은 61행 한 문장과 144~151행 도구 이름 표뿐이다. '추적' 약속에 비해 개념·체크리스트 수준이라 3~5점. |
| F | 6 | 15·217행 Ch5, 215행 Ch1, 216행 Ch4는 같은 디렉터리 seriesOrder 5·1·4 글이고 라벨이 제목과 맞다. 218행 kernel/chapter06-crash-drgn, 219행 kernel/chapter09-drivers-cxl-walkthrough, 220행 hbm/chapter12-cxl-pooling-fabric도 제목과 맞는다. 이 글은 시리즈 마지막 편이고(디렉터리에 6개 파일), 209행 시리즈 요약은 1~6편 순서와 맞는다. 그러나 211행 '기존 다른 시리즈의 CXL 챕터로 자연 연결'은 특정 글을 가리키지 않아 6 이하. H2 목차·함정 표는 템플릿이라 가점 근거로 쓰지 않았다. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. CXL은 5행 'CXL 2.0/3.x'로만 적었고 spec 절 번호가 없다. drgn·crash·커널 버전은 193행 'kernel 6.5+'뿐이고 근거가 없다. 1c1077df의 actbl1.h·CXL 3.1 대조는 커밋 본문에만 있다. |

uncertainties:
- 19행 'FM이 out-of-band로 관리', 113행 'FM 다운 시 기존 할당은 정상 동작': c38b4429와 cxl/chapter13-switching-fabric.md 71·135행은 CXL 3.1 §7.6.1에 따라 FM을 형태가 자유로운 논리적 프로세스로 고쳤다. 1c1077df도 이 줄을 미해결로 남겼다. 다른 글과의 모순이고 spec을 직접 열지 않아 오류 확인에 넣지 않았다.
- 138행 'CXL fabric용 drgn helper는 mainline에 아직 없음'과 203행 'mainline 추가 진행 중'은 193행 'drgn에 cxl helper 없음 → kernel 6.5+ 필요'와 긴장 관계다. drgn helper는 커널이 아니라 drgn 저장소에 있고 'mainline'이 무엇을 가리키는지 모호해 내부 모순으로 확정하지 않았다. Ch5 25행은 'drgn/helpers/linux/에 CXL 전용 helper가 없다'고 적었다.
- 52행 `crash> ptime` 명령과 53행 'PROC TIME' 출력 형식이 crash 유틸리티에 실제로 있는지 확인하지 않았다.
- 100행은 snoop 빈도를 bpftrace로 재야 보인다고 하는데 103행은 각 host vmcore에서 BISnp 메시지 count를 센다고 한다. vmcore에 BISnp 카운트가 남는지 미확인.
- 43~45행 NTP 1~10 ms·PTP µs·GPS PPS ns 정확도는 출처 없는 수치다.
- 149행 'LWP (Lustre Workload Profiler)'가 실재하는 도구인지 확인하지 않았다.
- 30행 'FM database'와 118행 'FM process core dump'는 FM을 호스트 프로세스로 전제한다. spec상의 FM 형태와 맞는지 미확인.

병합 대상: 후보는 `src/content/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem.md`다. Ch5에 'multi-host·fabric으로 넓힐 때' 절을 넣고 이 글의 시간 정렬(37~61행)과 시나리오 4개(63~121행)만 옮기며, drgn 절(123~138행)은 Ch5 25~40행 실행 코드와 맞지 않으므로 버린다. 다음 조치는 보강이다. 'multi-host CXL 장애 분석'은 Ch5와 검색 의도가 다르다. FM API 이벤트 레코드와 bind/unbind 이력(cxl/chapter13 91~98행, §7.6.6)으로 LD 할당 이력을 뽑는 절차를 넣고, 19·113행 FM out-of-band 서술을 CXL 3.1 §7.6.1로 대조해 고치면 독립 글로 남길 수 있다. 보강이 어려우면 Ch5로 병합한다.

### `practical-internals/00-preface.md` — 55점, 보강

confidence: 중간

factcheck: 미검증. git log -- 00-preface.md는 0a9dd7bc(slug 고정), be973200(topics 메타), ac24bb76(제목 개명), 85a2d46f(번역투 수정·발행), 2bb21c78(7편 추가 + '시의성 갱신': ThreadX 2024-01 기증, Zephyr 3.7+ → 4.0 LTS, mbed 2026-07 EOL, PREEMPT_RT 6.12 문구 추가, 커밋 본문에 출처 없음), 09a00a29(stub 일괄), 94fc6153이다. 1차 자료(Zephyr 릴리스 정책, FreeRTOS 릴리스, kernel.org 등)와 대조했다고 출처를 남긴 커밋이 없다. 로컬에 Zephyr·FreeRTOS upstream clone이 없어 이번 검토에서도 1차 자료를 열지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 허브만의 내용은 핵심 질문 5개(173~177행), 소스 분석 순서 5단계(185~189행: API entry → 자료구조 → critical section 경계 → scheduler decision point → 아키텍처 어셈블리)와 191행 'xTaskCreate()·k_sem_take()에서 list·bitmap·stack frame까지 내려간다'는 방향, 분석 대상 RTOS 표(152~159행)다. 도입(14~29행), 대상 독자(31~43행), 목표(218~227행)는 다른 overview 허브와 같은 틀의 일반론이다. 분석 순서도 실제 함수 하나를 따라가 보이지 않아 6~12 구간 상단. |
| B | 13 | 허브로서 목적(14~29행), 독자(31~43행), Part별 52편 목차(53~146행), 대상 RTOS·버전(150~161행), 로드맵(163~167행), 사전 지식(193~198행), 레퍼런스(200~216행), 목표(218~227행)를 갖췄고, 47행 '총 5개 Part, 52개 글'과 Part별 편수(53·72·92·112·134행)는 실제 파일 수와 맞는다. 그러나 목차 표(57~146행)에 글 링크가 없고, 161행 mbed OS '2026년 7월 EOL로 … 제외됩니다'는 평가일 기준 지난 날짜를 미래형으로 쓴다. 155행 'Zephyr 4.0 LTS' 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 3 | 실행·검증할 절차나 결과가 없다. 16~18행 xTaskCreate 한 줄은 도입용이고, 185~189행 분석 순서는 대상 파일·함수·관찰 결과가 없는 절차 목록이다(절차만 있으면 C ≤ 9). 152~159행 버전 표(FreeRTOS 11.2, Zephyr 4.0 LTS, ThreadX 6.4, NuttX 12.x, Linux 6.12+)는 출처 없는 구체 값이다(C ≤ 8). 상한보다 내용 자체가 0~3 구간이다. |
| D | 12 | 같은 시리즈 인접 글 `part1-01-why-rtos.md`는 super-loop 코드(18~27행)와 6.8 ms 계산(39행)으로 시작해, 허브 도입(14~29행)과 예제·결론이 겹치지 않는다. 다른 시리즈 같은 주제 `rtos/freertos-mastering/chapter01-distribution.md`는 draft:true(12행)라 공개 중복이 아니다. 반복은 허브 뼈대다. 이 글 H2(14·31·45·163·169·193·200·218행)가 `embedded-cpp/00-preface.md`(14·29·43·136·160·203·210·229행)와 순서·제목이 같고 `performance-engineering/00-preface.md`(14·45·60·175·212·219·244행)와도 대부분 같다. 시리즈 안 역할은 분명해 10~14 구간, 공통 뼈대로 감점. |
| E | 7 | 제목(2행) '실시간 커널 내부 분석 시리즈 소개'와 본문이 맞는다. description(5행)의 '소스 코드 수준에서 분석합니다'는 시리즈 전체의 약속이고 이 글에는 181~191행 방법 설명뿐이다. 29행은 'FreeRTOS, Zephyr, RT-Thread'를 분석한다고 하지만 152~159행 표와 145~146행은 NuttX·PREEMPT_RT까지 넣어 범위 서술이 조금 어긋난다. |
| F | 6 | 231행 다음 글 링크는 `part1-01-why-rtos.md`(seriesOrder 1)를 가리키고 라벨 'Part 1-01: RTOS가 필요한 이유'와 맞는다. 목차 행 라벨(61행 1-03, 101행 3-04, 108행 3-11, 145행 5-06, 146행 5-07)은 실제 파일 제목과 맞는다. 로드맵(165~167행)과 사전 지식(193~198행)은 고유 구조다. 그러나 허브인데 52개 목차 행(57~146행)과 로드맵의 'Part 5-01' 등에 링크가 하나도 없어 루브릭 5절의 허브 역할(목차 링크)을 못 한다. audit:reading·폰 폭 렌더는 보지 않았다. |
| G | 2 | 서적 4권(203~206행), upstream 저장소 3개(209~211행, 태그·버전 없음), 공식 문서 3개(214~216행)가 목록으로만 있다. 버전 표(152~159행)와 161행 mbed EOL, 157행 ThreadX 기증 날짜, 159행 PREEMPT_RT 날짜 어느 칸에도 출처가 붙지 않는다. G는 주장에 연결된 본문 1차 출처만 세므로 2~3 구간 하단. |

uncertainties:
- 155행 'Zephyr 4.0 LTS': Zephyr LTS 지정 버전이 4.0인지 1차 자료(Zephyr 릴리스 정책)로 확인하지 못했다. 기억으로는 LTS가 3.7이라는 의심이 있다. 2bb21c78 커밋 본문은 '3.7+ → 4.0 LTS'로 바꿨다고만 적었다.
- 154행 FreeRTOS '11.2'가 시리즈 본문이 실제로 인용하는 버전 태그인지 확인하지 않았다.
- 157행 ThreadX '6.4'·'2024-01 Eclipse Foundation 기증', 159행 PREEMPT_RT '2024-09 mainline merge(6.12)'의 날짜·버전은 출처가 없다.
- 161행 'Arm mbed OS는 2026년 7월 EOL로 … 제외됩니다': 날짜 출처가 없고 평가일 기준 지난 날짜를 미래형으로 썼다(staleness 후보).
- 108행 'FreeRTOS 10+ lock-free SPSC'에서 stream buffer를 lock-free라고 부르는 표현이 FreeRTOS 문서와 맞는지 확인하지 않았다.
- 145·158행 NuttX의 'NASA Ingenuity' 사용 주장과 '12.x'는 출처가 없다.
- 29행 분석 대상 세 RTOS와 152~159·145~146행의 여섯 대상 차이는 기술 주장의 모순이 아니라 범위 서술 불일치로만 적는다.

### `practical-internals/part1-01-why-rtos.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 23~25행은 read_sensors 1 ms, compute_pid 0.5 ms, update_actuators 0.3 ms라고 적고, 74~80행 pid_task는 세 함수를 한 주기에 모두 부른다(합 1.8 ms). 그런데 79행 주석 '1 ms 정확 주기'와 90행 'PID는 정확히 1 ms 주기로 실행되고'는 1.8 ms 작업이 1 ms마다 끝난다는 뜻이라 단일 코어에서 글이 밝힌 작업 시간과 동시에 참일 수 없다(vTaskDelay 의미와 무관한 산술). 같은 이유로 42행 '1 kHz PID'를 RTOS 전환이 해결한다는 결론도 성립하지 않는다. git log(0a9dd7bc slug 고정, be973200 topics, ac24bb76 제목·날짜, 85a2d46f 번역투 수정·공개, 845231cf 다이어그램, 2bb21c78 시의성 갱신(출처 없음), f5e1d8d3 본문, 42ebbcbb stub)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 고유한 부분은 슈퍼루프 한 사이클을 1+0.5+0.3+5=6.8 ms로 계산하고(40행) 1 kHz PID 불가를 보이는 것(42행), 같은 예제로 비동기화(46~57행)·ISR 분리(59~69행)·RTOS(71~90행)를 잇는 구조다. 3가지 핵심 가치(92~109행), Hard/Soft 표(113~118행), RTOS vs Linux 표(124~132행), RTOS 목록 표(147~155행)는 입문 자료의 표준 목록이고 출처가 없다. 120행 '수학적으로 deadline 만족을 증명할 수 있습니다'는 방법 없이 단정한다. 앵커 part1-04(A 10)와 같은 수준. |
| B | 9 | 문제(38~42행) → 대안 셋(44~90행) → 핵심 가치(92~109행) → hard/soft(111~120행) → Linux 비교(122~134행) → 안 써야 할 때(136~143행) → 정리(167~172행)로 흐름은 끝까지 간다. 그러나 중심 예제 결론(90행 '정확히 1 ms 주기')이 23~25행 작업 시간(합 1.8 ms)과 모순되고, RTOS 예제(73~88행)에 task 생성·우선순위 설정이 없어 90행 'log는 남는 시간에만'이 어떻게 성립하는지 보이지 않는다. 대안 (1)(2)는 한 문장씩(57·69행)으로 기각하고 139~140·172행 기준 수치는 근거가 없다. 5~9 구간 상단. |
| C | 4 | 코드 조각(19~29, 48~54, 61~66, 73~88행)은 있으나 대상 MCU·RTOS 버전·tick rate가 없고 예상 결과·측정 절차가 없다. 23~26행 작업 시간, 127~129행 footprint·boot time·scheduler latency, 139~140행 '≥ 100 ms'·'≤ 4 KB SRAM'은 출처·환경 없는 수치라 C ≤ 8이고, 79행 '1 ms 정확 주기'를 확인할 방법(GPIO 토글·트레이스)도 없어 4~7 구간 하단. |
| D | 9 | (1) 다른 시리즈 `modern-recipes/part6-01-rtos-decision.md` — 같은 질문(super-loop vs RTOS). 이 글 19~29행 슈퍼루프·73~88행 RTOS 전환 코드가 6-01 47~58·87~103행 진행과 같고, 136~143행 '안 써야 할 때'가 6-01 26~31행 표·150~158행 LED blink 함정·187행 정리와 겹친다. 6-01은 blocking primitive 관점, 이 글은 직렬화 시간 계산 관점이다. (2) 같은 시리즈 `part1-10-realtime-analysis.md` — 113~118행 Hard/Soft 표가 1-10 47~51·221~232행과 같은 예를 반복. (3) `part5-05-selection-guide.md` — 147~155행 RTOS 표가 5-05 26~35행 비교 표의 축소판. (4) `part5-07-preempt-rt-linux.md` — 134행 PREEMPT_RT 6.12 문단이 5-07 14·20·31행과 같다. (5) 인접 `part1-02-task-thread.md`는 겹침 없음, 허브 00-preface.md 59행은 이 글을 한 줄로 소개. 5~9 구간 상단. |
| E | 6 | title 후반 '일반 OS와의 결정적 차이'는 122~134행 표 하나와 문단 하나로만 답하고, 본문 대부분(17~120행)은 슈퍼루프 대비 RTOS다. description의 실시간성 확보를 보이는 90행 결론이 23~25행과 모순이고 120행 'RTOS는 hard real-time을 보장'은 과장 성격이라 6~8 구간 하단. |
| F | 7 | 174행 다음 편 안내 'Task와 Thread 개념 — TCB, 상태 머신, 생명 주기'는 seriesOrder 2 `part1-02-task-thread.md`와 맞다. 178행(1-02)·179행(1-10 '실시간성 분석 — Latency·Jitter·Deadline·WCET·RMA') 라벨과 대상을 열어 일치를 확인했다. 157~165행 '이 시리즈에서'가 Part 1 묶음을 실제 파일 순서와 맞게 안내한다. 174행 안내에 링크가 없고 Part 2·허브 00-preface 링크와 전제 지식 안내가 없어 8 이상은 아님. |
| G | 1 | 본문에 출처 링크가 하나도 없고 FreeRTOS·Zephyr 버전 표기도 없다. 134행 'Linux 6.12 mainline merge', 152행 'ThreadX 2024-01 오픈소스화·EPL-2.0·DO-178B', 127~129행 수치 모두 1차 자료 연결이 없다. |

uncertainties:
- 79·90행: vTaskDelay(1)은 상대 지연이고 인자가 tick 단위라 configTICK_RATE_HZ=1000일 때만 1 tick = 1 ms이며, 고정 주기에는 vTaskDelayUntil이 필요해 보인다. FreeRTOS 문서로 확인하지 않았다(오류 확인 근거는 이와 별개인 1.8 ms vs 1 ms 산술).
- 145행 제목 '흔한 RTOS 4종'인데 표에는 7개(149~155행)가 있다(산문 개수 표기 실수).
- 152행 Eclipse ThreadX 라이선스 'EPL-2.0'은 part5-05-selection-guide.md 30·99행의 'MIT'와 다르다(글 간 모순, 1차 자료 미확인). 같은 행 'DO-178B'와 5-05 30행 'IEC 61508·ISO 26262'의 차이도 미확인.
- 129행 PREEMPT_RT 'scheduler latency < 100 µs'는 part5-07-preempt-rt-linux.md 112·117·130행의 'worst 100-300 µs'와 다르다(글 간 모순, 미확인).
- 134행 '2024년 9월 Linux 6.12에 mainline merge'는 merge window 시점 표현으로 보이며 6.12 릴리스 일자와 구분 필요 여부 미확인.
- 131행 Linux 'MMU 요구: 필수'는 nommu Linux 구성 존재 여부와 관련해 미확인.
- 100행 '0-31 (또는 0-255)', '높은 게 항상 먼저'는 RTOS별 숫자 방향 차이(예: Zephyr) 미확인.
- 127~129행 footprint·boot time·latency, 139~140행 '≥ 100 ms'·'≤ 4 KB SRAM', 172행 '5+ task 또는 deadline < 10ms'는 출처·환경 없는 수치.
- 120행 'RTOS는 hard real-time을 보장합니다'는 WCET·스케줄 가능성 분석이 필요하다는 part1-10 253·257행과 결이 다르다(글 간 표현 차이).
- 점수 구간(병합 검토)상 병합 후보는 modern-recipes/part6-01-rtos-decision.md이나 시리즈·독자층이 다르고 'RTOS가 필요한 이유'라는 독립 검색 의도가 있어, 오류 수정 뒤에는 차별화 보강(5-05·1-10과 겹치는 표는 링크로 축소, 예제를 xTaskCreate·우선순위·vTaskDelayUntil과 측정 절차로 완결)이 맞아 보인다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- git 이력에 1차 자료 대조 커밋 없음: 10편 중 9편이 '검증됨'이 아니다. 예외는 postmortem ch05(06018beb)뿐이다. pcie ch19의 'all web-verified'(11151caf·48b62e3b), postmortem ch06의 1c1077df(32행 한 줄 대조), 00-preface·part1-01의 2bb21c78 '시의성 갱신'은 주장별 출처가 없어 인정되지 않는다. Postmortem ch01~04·ch06, PCIe ch18·19, Practical RTOS Internals는 `/fact-check-round`를 거치지 않았다.
- 본문 1차 출처·버전 표기 없음: G가 1점 2편(postmortem ch06, part1-01), 2점 6편(pcie ch18, postmortem ch01~04, 00-preface), 3점 2편(pcie ch19, postmortem ch05)이다. 출처가 글 끝 목록에만 모이거나(pcie ch18 376~381, postmortem ch01 416~419, ch02 461~462, ch03 490, ch04 469~475, 00-preface 203~216행) 아예 없다(postmortem ch06, part1-01). 10편 모두 C ≤ 8 상한 사유(출처·환경 없는 수치)가 있다.
- 시리즈 끝·편수 표기 충돌: pcie ch18 343~364행 '18편' 마무리 vs 공개된 ch19, pcie ch19 89~107행 마무리 없음, postmortem ch03 484행 'Ch 4 (마지막)', ch04 13·447행 '마지막 장'·'4장' vs 공개된 ch05·06, postmortem ch06 211행 구체 다음 글 없음. 5편에서 F가 4~6에 묶였다.
- '다음 장'·관련 항목 라벨 오류: pcie ch19 46행(Ch 17 BDP 논의 없음), postmortem ch02 371행(build-id '다음 장'은 ch04 19~38행), ch03 492행('Sanitizers Ch 1'이 chapter02)·491행(링크 없음), ch04 477행(링크 없음)·478행(무관한 RSP 글).
- si_code 값 오류의 확산: SEGV_BNDERR=6·SEGV_PKUERR=7(헤더는 3·4)이 postmortem ch02 185~186행, ch03 127행, gdb-lldb ch07 265~266행에 같다. ILL_PRVOPC/PRVREG는 ch02 200~201행이 7·8(틀림), ch03 130행이 5·6(맞음). `data/known-falsehoods.yaml` 등재 후보다.
- Postmortem과 다른 디버깅 시리즈의 문단 단위 중복: postmortem ch01(gdb-lldb ch07 24~100·164~202·299~312·385~392행), ch02(gdb-lldb ch07 102~160·261~266행), ch03(gdb-lldb ch07 164~168·217~266행), ch04(dwarf-elf ch06 124~204행, gdb-lldb ch07 364~393행). D가 5~9에 묶였다. 'sudo gcore -o /tmp/core <pid>'도 ch01 380, ch02 378, ch04 328행에 세 번 나온다. Postmortem·GDB and LLDB·DWARF-ELF의 정본 분담이 필요하다.
- 손으로 만든 예시 출력과 예시 간 불일치: postmortem ch02(0x400000 vs 0x555555554000대, 122행 rip), ch03(37~38행 SIGSEGV와 throw_length_error, 38·74행 파일명, 86·186행), ch04(106~108·257~267행 `[...]`), ch06(58행 'DATE: ...'), part1-01(23~25행 vs 79·90행). part1-01은 이것이 오류 확인으로 이어졌다.
- CXL 장 일괄 생성 뼈대와 drgn helper 문구: 23ed6256이 9개 시리즈 stub 15편을 채우며 같은 `| 증상 | 원인 |` 함정 표와 '왜 다른가 → 시나리오 → 체크리스트 → 정리' 뼈대를 넣었다(postmortem ch05 80·97·104·108행, ch06 183~196행, kernel/chapter08-cxl-driver-debug.md 96·107·115·119행, memory/chapter06-cxl-memory-diagnostics.md 82·104·112·116행). drgn CXL helper 서술은 postmortem ch05 84·99행, ch06 138·193·203행, kernel ch08·ch09가 서로 어긋난다.
- ACS·IOMMU group 설명 반복: pcie ch11 76~86행, ch12 108~121행, ch18 271~292행, ch19 56~74행, qemu-fpga-driver ch09 31~39행. 정본 하나를 두고 링크로 바꿔야 한다.
- RTOS 비교 사실 중복과 값 불일치: part1-01 129·147~155행, part5-05 26~35·99행, part5-07 112~130행, 00-preface 152~159행(ThreadX EPL-2.0 vs MIT, PREEMPT_RT <100 µs vs 100-300 µs). 2bb21c78의 출처 없는 갱신이 여러 글에 들어갔다.
- overview 허용 시리즈 허브의 공통 뼈대와 목차 링크 부재: 00-preface H2(14·31·45·163·169·193·200·218행)가 embedded-cpp/00-preface.md·performance-engineering/00-preface.md와 같은 순서·제목이고, 00-preface 57~146행 목차에 링크가 없다. postmortem ch01도 시리즈 첫 글이면서 목차·편수가 없다.
- 날짜·버전 앵커 산문: pcie ch18 366행 '2025~2026 datacenter', 00-preface 161행 '2026년 7월 EOL … 제외됩니다'(이미 지난 날짜), part1-01 134·152행, postmortem ch06 193행 'kernel 6.5+'. `audit:staleness` 대상이다.

## 다음 조치

- 우선 조치(3편, 오류 확인): postmortem ch02 185~186·200~201행 si_code 값을 siginfo.h 기준(SEGV_BNDERR 3, SEGV_PKUERR 4, ILL_PRVOPC 5, ILL_PRVREG 6)으로 고치고, 같은 값이 있는 postmortem ch03 127행과 gdb-lldb ch07 265~266행을 함께 고친 뒤 `data/known-falsehoods.yaml` 등재를 검토한다. postmortem ch01 26행 dumpable 조건을 259·264·325행과 man 2 prctl·man 5 core 기준으로 맞춘다. part1-01 23~25·79·90행 예제 수치와 주기를 맞추고 vTaskDelayUntil 사용 여부를 FreeRTOS 문서로 확인한다.
- 시리즈 끝·다음 편 표기를 실제 seriesOrder에 맞춘다: pcie ch18 343~366행과 ch19 마무리, postmortem ch03 484행·ch04 13·447행(ch05·06 반영), postmortem ch02 371행, ch03 491·492행, ch04 477·478행, pcie ch19 46행.
- 병합 검토(5편): postmortem ch03·ch04는 gdb-lldb ch07·dwarf-elf ch06과 겹치는 앞부분을 링크로 줄이고 crash 패턴·자동화 파이프라인으로 차별화 보강한다. postmortem ch06은 FM 절차 보강을 먼저 시도하고 어려우면 ch05로 병합한다. pcie ch18·ch19는 병합 대상 없음 또는 차별화 보강(비트 디코딩 예, 기능별 Linux 확인 방법, spec 절 인용)으로 간다.
- 보강(2편): postmortem ch05는 커널·drgn 버전과 실제 출력 예, decoder 복원 코드를 붙인다. 00-preface는 목차 52행에 링크를 달고 버전 표 출처와 161행 mbed 문장을 정리한다.
- Postmortem Debugging, PCIe ch18·19, Practical RTOS Internals를 `/fact-check-round` 대상으로 올리고, Postmortem·GDB and LLDB·DWARF-ELF의 정본 분담과 CXL 일괄 생성 장(23ed6256)의 drgn helper 문구를 시리즈 단위로 정한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
