# 공개 글 AdSense 평가 — 루프 33

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-33.md) · [재검토 기록](double-check-loop-33.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter08-dllp.md` | 9 | 10 | 3 | 10 | 7 | 7 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter09-physical-layer.md` | 9 | 9 | 4 | 10 | 6 | 7 | 1 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter10-linux-basics.md` | 10 | 10 | 6 | 10 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter11-linux-dma.md` | 10 | 9 | 5 | 11 | 7 | 7 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter12-virtualization-1.md` | 9 | 9 | 6 | 9 | 7 | 6 | 1 | **47** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter13-virtualization-2.md` | 9 | 8 | 4 | 11 | 7 | 7 | 2 | **48** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter14-linux-operations.md` | 9 | 8 | 4 | 10 | 7 | 4 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter15-tools.md` | 9 | 8 | 5 | 8 | 7 | 6 | 2 | **45** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter16-troubleshooting.md` | 9 | 8 | 4 | 9 | 6 | 5 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter17-performance.md` | 10 | 9 | 5 | 10 | 7 | 5 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 452 → 재검토 468. 신규 오류 확인: DLL8 ReplayRolloverUE, DMA11 ATSID, Tools15 MPS설정/AERcounter·inject경로를공식자료로직접확인. PHY9의Config/L0 FCinit은단계/완료경계가분리되지않아기존내부error확정을철회하고불확실로둔다. 축약제목/다른표현이실제로다루는내용이면F감점근거에서제외했다.

### `chapter08-dllp.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter08-dllp.md`
url: `/blog/embedded/hardware/pcie/chapter08-dllp`

score_status: 잠정 · score: 47 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 128행deprecated대148행가능성은단정강도차이로추가error아님.DLLPframing/ACK/Gen6협상/같은FLIT범위미대조.65행ReplayRolloverUE분류만공식고정판헤더와직접대조.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 19~95행ACK/credit지도를만드나표준입문형이고실측/실패선택기준없어9유지. |
| B | 10 | 종류→wrapper→replay→FC→CRC→FLIT→함정완료.65행UE분류는공식Correctable과달라B10유지. |
| C | 3 | 152행lspci한줄외재현절차없고67행수십~수백KB무출처.C≤8보다낮은실행부재구간3유지. |
| D | 10 | 110~116행↔chapter01-fundamentals.md106~117행FLIT표,57~65행↔chapter07-error-handling.md131~141행replay같은결론.반면44~95행ACK/creditFC가전담이라D9→10. |
| E | 7 | 2·5행DLLP/ACK/FC/FLIT을19~130행모두다루고계층구분을설명하여6→7. |
| F | 7 | 170행next공개order9PHY.라벨Encoding은실제대상104~112행에있고LTSSM/equalization/SKP후행설명도포함되어옛제목SerDes와글자차이만으로감점하지않음.174~177행2/7/PHY9/CXL9공개및주제대응.17행전제/65행경계안내가고유하여5→7. |
| G | 1 | 181행공통정책외claim별표준판/링크없어1유지. |

전문 읽기: 1~181행. SHA-256: `fa1cdf43913fe1221ee463c8102587437301c8def98f3ec449edbaaf2a9fc2bb`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter09-physical-layer.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md`
url: `/blog/embedded/hardware/pcie/chapter09-physical-layer`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 기존26행Config의FCInit대48·184행L0후FCInit은시작/완료단계중복가능성·실제LTSSM/DLL경계확인이필요하므로확정error철회. SerDes세부·TS/EQ/RT/FTS/encoding은primary미대조.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 21~112행LTSSM/orderedset/EQ/encoding표의입문재구성중심9유지. |
| B | 9 | 기본상태→timeline→TS→EQ→lane→SKP→encoding→recovery흐름완료.26/48행FC시점불명확과SerDes본문부족으로9유지.B≤13. |
| C | 4 | 124행lspci로RT를보라는지시외실제장비/레지스터/trace/예상판정없음.50/136/155행무출처시간/C≤8,4유지. |
| D | 10 | 104~112행↔chapter01-fundamentals.md94~104행encoding표/문장,28~31행↔chapter06-power-management.md33~39행Lstate반복.이글LTSSM/EQ가독립이라D9→10. |
| E | 6 | 2행SerDes는단락설명없이15행언급정도이나LTSSM/EQ/encoding본문은충분.부분미이행6유지. |
| F | 7 | 178행next공개order10Linux등록/driver/resource후행설명맞음.182~184행1/PM6/DLL8공개대응.17행세대전제와timeline설명고유구조로7유지. |
| G | 1 | 188행정책외PHY자료/보드/표준판출처없어1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~188행. SHA-256: `21ac7d1684c08a4944f53a9834570e06706a6bef23bea1c83ff0687cbe2e09e9`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter10-linux-basics.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md`
url: `/blog/embedded/hardware/pcie/chapter10-linux-basics`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 41행u8bus와45행pointerbus표·pci_dev배열/driver_data·95행IRQ할당·ACPIHPET/_OST·bindpriority는공식headers/API미대조.언어기억으로새오류확정안함.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 23~28행enumeration에서95~102행probe생명주기로이어지고sysfs를묶지만일반kernel입문수준10유지. |
| B | 10 | boot→dev/driver→matching→lifecycle→sysfs→ACPI→portdrv완료.61~76행probe/remove는미정의이며실제resource오류관찰없어10유지.B≤13. |
| C | 6 | 30행rescan·61~76행등록코드있으나build/완성probe/결과없음.명령/절차C≤9중6유지. |
| D | 10 | 110~123행↔chapter15-tools.md98~112행sysfs표거의동일;95~102행probe순서↔현행Recipes part11-03-pcie-bar.md89~112행,98행iomap↔chapter04-bar-mmio.md134~139행공통.전체Linuxlifecycle역할D10유지. |
| E | 7 | 2·5행enumeration/driver/sysfs/ACPI를각대응절로이행해7유지. |
| F | 7 | 186행next공개order11DMA/ATS/PRI/PASID실제본문과맞음.190~193행3/4/5/7공개대상과pci_iomap/IRQ/errorcallback설명대응.17행3/4전제와생명주기단계가고유하여7유지. |
| G | 2 | kernel소스파일/PCIAPI이름과ACPI명칭은있으나고정판·공식조항링크없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~197행. SHA-256: `7e74829776fb2c4bf40928a249429739accacbf259b07e31994fb2d5e36b4391`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter11-linux-dma.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter11-linux-dma.md`
url: `/blog/embedded/hardware/pcie/chapter11-linux-dma`

score_status: 잠정 · score: 51 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: cache방향/ARMcoherency·PASID/SVM·IOMMUFD도입판·swiotlb는공식미대조.96행ATSID0x0026은v6.12pci_regs.h의0x0F와달라신규error확인.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 19~56행두DMA모델에서IOMMU/SVM/userspace로이어지는입문설명으로10유지. |
| B | 9 | 모델→coherency→IOMMU/group→ATS/PRI/PASID→IOMMUFD완료.5행scatter-gather약속은39행한줄이고ATSlookup값오류.9유지.B≤13. |
| C | 5 | 26~37·159~164행mapping/mask조각있지만완료관찰/실패cleanup/장치환경없음.재현성5유지.C≤9. |
| D | 11 | 78~86행↔chapter12-virtualization-1.md108~121행group/ACS같은명령/결론.26~37·52~56행↔현행Recipes part8-04-dma-allocator.md38~68행DMA모델은같지만Recipes방향표는구체동작을채우지않아동일설명복제로안봄.핵심DMA/SVM전담으로10→11. |
| E | 7 | 2·5행DMA/IOMMU/ATS/PRI/PASID/IOMMUFD가19~155행전개.누락scatter-gather를감안해6→7의기본이행구간. |
| F | 7 | 202행next공개order12PF/VF/VFIO/DPDK/SPDK맞음.206~210행BAR4의VF/IRQ5의IR/virt13/confio와cosim8DMAshim실제대상30~80행대응.17행IR전제와두모델구분고유구조로6→7. |
| G | 2 | 6.6+판/소스명칭은있으나공식DMA/ATS/IOMMUFD출처링크없어2유지. |

전문 읽기: 1~214행. SHA-256: `7f219a318bcdca72220765972c1fe52b1b86677e6ed0566f810b5d444181a51a`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter12-virtualization-1.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter12-virtualization-1.md`
url: `/blog/embedded/hardware/pcie/chapter12-virtualization-1`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: VFIOioctl·ACS요건·VFreset·vfio-user/mdev격리·제품지원은kernel/벤더판미대조.35~37행grep출력불일치는UnixBRE의의미확인없이새error확정안함.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 21~55행PF/VF제약에서VFIO/DPDK/SPDK를묶지만카탈로그형이고고유측정없어9유지. |
| B | 9 | PF/VF→VFIO→QEMU→ACS→PMD→mdev→reset완료.짧은ioctl에viability/권한전제와실패관찰빠져9유지.B≤13. |
| C | 6 | 34~37·72~76·137~143행명령있으나device/IOMMU상태/예상성공실패없음.절차C≤9범위6유지. |
| D | 9 | 72~76행↔현행Recipes part7-11-uio-vfio.md122~128행open/container/ioctl동일;137·143행↔그글157~158행devbind/l3fwd유사.108~121행ACS↔chapter11-linux-dma.md78~86행공통.비공개draft예제는중복근거에서제외하여8→9. |
| E | 7 | 2·5행passthrough/SRIOV/VFIO/PMD모두각절이행.구체적사용흐름도있어6→7. |
| F | 6 | 226행next공개order13vIOMMU/SIOV/VirtIO/ConfIO내용맞음.230~232행BAR4/DMA11/virt13공개및VFstride/group설명대응.184~188행2열헤더에FLR3칸으로표흐름결함,17행전제외길잡이약해6유지. |
| G | 1 | 234행공통정책외구체VFIO/SRIOV판/조항출처없어1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~236행. SHA-256: `106784f6e25d32d02b1fdec5052783625e36c603548e93236fecd51a88accc77`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter13-virtualization-2.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter13-virtualization-2.md`
url: `/blog/embedded/hardware/pcie/chapter13-virtualization-2`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: PRI와dirtytracking관계·IDXDflags·H100CCIDE/TDISP최초/MI300A·양산예측미대조.124대205행PRI나159대197행상용표현은기능범위가달라내부오류아님.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 19~169행vIOMMU/SIOV/VirtIO/confIO기술지도는있지만대부분짧은표,고유분석9유지. |
| B | 8 | guesttranslation→ADI→virtqueue→vDPA→migration→신뢰완료이나핵심첫상용/보장주장이원출처없고사용명령전제빈약해8유지.B≤13. |
| C | 4 | 65~74·110~115행설정조각외예상출력/플랫폼조건없음.52행수천ADI·양산연도등무출처로C≤8,4유지. |
| D | 11 | 130~175행IDE/TDISP/SPDM↔embedded-security chapter11-pcie-cxl-ide.md15~42행및CXL chapter14-security.md15~48행보안구성주제공통이나이글19~128행guest2stage/ADI/virtqueue/vDPA가주된독립질문.10→11. |
| E | 7 | 2·5행키워드전부19~175행대응절있고vIOMMU2stage/ADI비교로이유를설명해6→7. |
| F | 7 | 211행next공개order14운영AER/ARI내용맞음.215~217행DMA11/virt12/CXLsecurity14공개라벨/후행내용대응.17행전제와2stage표로경로가있어7유지. |
| G | 2 | DMTFDSP0274/OASISVirtIO판은있으나고정공식link·최초사례원자료없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~221행. SHA-256: `f59c32d64100b42ca457fba6788d50d5a9cf731ead769915df9d8ab05bf7439a`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter14-linux-operations.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter14-linux-operations.md`
url: `/blog/embedded/hardware/pcie/chapter14-linux-operations`

score_status: 잠정 · score: 43 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: ARI필요VF경계>8대>7은주소배정/offset조건공식미대조라추가error아님.120행기존8-bit=8functions와ARI8-bit=256functions의같은폭산술은내부불일치로유지.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 21~102행운영흐름과hotplug/ARI를묶지만일반Linux기능표/짧은callback위주9유지. |
| B | 8 | 추가/제거→callback→DPC→ARI→EEH→상호작용완료.120행동일8bit폭의function공간을8/256으로다르게정의해8유지. |
| C | 4 | 87~102행callback조각과42행lspci만있고실제hotplug/event/recovery관찰없음.56행수백ms~수s무출처C≤8,4유지. |
| D | 10 | 71~76·87~102행↔chapter07-error-handling.md82~105행동일callback내용;176행hotplugcap/BIOS↔chapter16-troubleshooting.md102~111행공통.운영시퀀스/ARI전담으로D10유지. |
| E | 7 | 2·5행hotplug/AER/DPC/ARI모두21~170행직접대응하여6→7. |
| F | 4 | 206행next공개order15tools내용맞음.210~211행Error7/Linux10portdrv공개대응.212행virt12후행SRIOV·ARI중ARI는그글에없어오안내.21~24행2열표3칸문제도있어4유지. |
| G | 1 | 216행정책외PCI/pciehp고정판·실험출처없어1유지. |

전문 읽기: 1~216행. SHA-256: `1c1a9992a309a33d1f17bcee5aa1addf88ad2419c8f6e710188c2629cec66fa8`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter15-tools.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter15-tools.md`
url: `/blog/embedded/hardware/pcie/chapter15-tools`

score_status: 잠정 · score: 45 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: lspci-x/-xxx/-xxxx·AERenable값·dpc-test/vendor명칭/가격등미대조.76행0x2810MPS256및129~135행counter경로/164행inject경로만공식대조해신규error확인.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 19~184행광범위도구지도를두나대부분명령/제품기능소개라9유지. |
| B | 8 | capdump→raw/BAR→sysfs/debugfs→log/inject→결정트리완료.76행틀린MPS값과129~135행잘못된counter경로가실제사용을막아8유지. |
| C | 5 | 75~79행write와164행inject에실행불일치확인되어6→5.실제실행환경/수집결과없고가격무출처C≤8. |
| D | 8 | 100~110행sysfs↔chapter10-linux-basics.md110~123행표거의동일;196~203행tree↔chapter16-troubleshooting.md164~173행;76행setpci값↔chapter17-performance.md50행문자그대로중복.D8유지. |
| E | 7 | 2·5행도구목록약속은19~184행모두이행하며집계/명령해설있어6→7.모든옵션약속은검증부족. |
| F | 6 | 241행next공개order16시나리오/decisiontree실내용맞음.245~248행Config3/Error7/Trouble16/Register18공개라벨/비트reference설명맞음.17행Ch1~14범위링크가Ch1한개지만시리즈진입점으로기능,고유단계연결약해6유지. |
| G | 2 | pcimemrepo문자표기/소스명칭있으나툴판/claim별공식문서연결없어2유지. |

전문 읽기: 1~252행. SHA-256: `dee7a4a613ae42d45d0ea6482a4c54b2b63a196574ba079112aca26cfae9ea94`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter16-troubleshooting.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md`
url: `/blog/embedded/hardware/pcie/chapter16-troubleshooting`

score_status: 잠정 · score: 42 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 96행force_floppy...옵션은이검토에서kernelparameters원문전체를독립확인못해error핵심근거에서유보.23행BREpipe/API·ReplayTimer조정등미대조.63·171·200행AERcounter위치오류는공식ABI로확인.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 19~159행10증상분류는있으나각원인/해결이한줄목록이고고유실패사례없어9유지. |
| B | 8 | 10시나리오→도구→결정트리완료.실제관찰값/조건/원인배제기준없고AER1단계경로잘못되어8유지. |
| C | 4 | 37·51·118·132행lspci지시있지만로그/환경/재현사례없음.63·171행counter명령잘못되어4유지.C≤9. |
| D | 9 | 164~173행tree↔chapter15-tools.md194~203행동일workflow;88~100행ACS↔chapter12-virtualization-1.md119~121행;109~110행hotplug↔chapter14-linux-operations.md176행;122~124행MPS/ASPM↔chapter17-performance.md33~40·141~150행공통.D9유지. |
| E | 6 | 2·5행실무시나리오북이라10패턴별단계를제공하나실제case관찰/원인확정과정없음.순수제목미이행3~5로묶기보다기본시나리오질문일부이행6. |
| F | 5 | 207행next공개order17성능측정/tuning글맞고211~214행7/14/15/17공개대응.21~23등증상pseudo표10곳separator없고169~170행코드pipe셀분리로읽기흐름결함5유지. |
| G | 1 | 218행공통정책만구체진단명령/Kernel판출처없어1유지. |

전문 읽기: 1~218행. SHA-256: `2f283d9566fbfc6a53e92b15315bb375630c7ce5b64e40561e72bbc377c7d897`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `chapter17-performance.md`

source_file: `src/content/blog/embedded/hardware/pcie/chapter17-performance.md`
url: `/blog/embedded/hardware/pcie/chapter17-performance`

score_status: 잠정 · score: 47 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: Gen6/7효율/70~90%/1.5~3배/NUMA손실/DDIOns·NVMeRead방향미대조.86대213행왕복2배차이는요약축약가능성으로추가error아님.50행register값만공식헤더대조.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 33~86행MPS/MRRS와105~117행NUMApinning을연결하나무출처효과표중심10유지. |
| B | 9 | 대역폭→payload/read→latency→NUMA/attrs/PM/P2P→측정도구완료.50행MPS256설정은실제mask계산과다르고실측벤치해석없어9유지. |
| C | 5 | 50·69행setpci,112~115행NUMA명령있지만측정계획/결과/장비없음.15·31·110·176행무출처비율/ns로C≤8,5유지. |
| D | 10 | 33~117·141~150행튜닝항목↔chapter16-troubleshooting.md116~129행동일목록;50행↔chapter15-tools.md75~76행같은오류;130~137행attrs↔chapter02-tlp.md108~115행반복.장치별성능선택질문은남아9→10. |
| E | 7 | 2·5행성능의각축을19~184행에설명하고계산식/제어명령도있어6→7.실측없음은C에반영. |
| F | 5 | 222행next공개order18Config/cap/MSI/AER비트reference실제대상내용맞음.226~228행1/2/PM6공개대응.229행DMA11후행P2PDMA는그글에없어5상한유지. |
| G | 1 | 233행정책외측정환경/벤더원자료/claim별공식출처없어1유지. |

전문 읽기: 1~233행. SHA-256: `91c2fbc3bfe74aafe12eb89cba7967954c2c6e5e29750b9a5b369365f6ff2d98`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 1차자료 대조 — 2026-10-19

[Linux v6.12 pci_regs.h](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/pci_regs.h)의 PCI_ERR_COR_REP_ROLL/REP_TIMER를확인해DLL8 65행UE분류를대조했다. PCI_EXT_CAP_ID_ATS=0x0F이므로DMA11 96행0x0026과다르다. DeviceControl PAYLOADmask0x00e0/256B0x0020,READRQmask0x7000/512B0x2000/4096B0x5000을확인했다. 따라서0x2810&0x00e0=0(MPS128),0x2810&0x7000=0x2000(MRRS512)이고Tools15 76행·Performance17 50행MPS256주석은틀리다.69행0x5810MRRS4096은맞는다.

[공식 AER HOWTO](https://docs.kernel.org/PCI/pcieaer-howto.html)의 AER Statistics/Counters는sysfs속성임을명시하고Softwareerrorinjection은/dev/aer_inject와userspacetool을설명한다. [공식 ABI 목록의 AER 항목](https://docs.kernel.org/admin-guide/abi-testing-files.html#abi-file-testing-sysfs-bus-pci-devices-aer)은/sys/bus/pci/devices/<dev>/aer_dev_correctable·fatal·nonfatal경로를명시한다. Tools15 129~135·164행과Troubleshooting16 63·171·200행의debugfs경로를이자료와대조했다. kernelparameters전체미확인이나머지API까지검증됐다는뜻은아니다.
