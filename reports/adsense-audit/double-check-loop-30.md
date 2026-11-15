# 공개 글 독립 재검토 — 루프 30

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter06-profinet.md` | 13 | 11 | 5 | 9 | 6 | 4 | 2 | 50 | 미검증 | 병합 검토 |
| `chapter07-profinet-io.md` | 12 | 10 | 5 | 10 | 7 | 7 | 2 | 53 | 오류 확인 | 우선 조치 |
| `chapter08-tsn.md` | 11 | 10 | 4 | 10 | 6 | 7 | 2 | 50 | 미검증 | 병합 검토 |
| `chapter09-tsn-scheduling.md` | 15 | 13 | 7 | 10 | 7 | 7 | 2 | 61 | 오류 확인 | 우선 조치 |
| `chapter10-powerlink.md` | 13 | 12 | 6 | 12 | 7 | 7 | 2 | 59 | 오류 확인 | 우선 조치 |
| `chapter11-linux-realtime.md` | 14 | 12 | 7 | 10 | 7 | 5 | 2 | 57 | 오류 확인 | 우선 조치 |
| `chapter12-comparison.md` | 13 | 12 | 4 | 10 | 7 | 4 | 1 | 51 | 미검증 | 병합 검토 |
| `chapter01-user-kernel-boundary.md` | 8 | 9 | 6 | 9 | 7 | 4 | 2 | 45 | 미검증 | 보강 |
| `chapter02-printk-dmesg.md` | 10 | 11 | 7 | 11 | 7 | 5 | 2 | 53 | 오류 확인 | 우선 조치 |
| `chapter03-ftrace-tracepoints.md` | 10 | 10 | 7 | 8 | 7 | 5 | 2 | 49 | 미검증 | 병합 검토 |

기존 합계 517 → 재검토 528. 오류 확인 5편 유지. E는 제목의 분석·추적 단어만으로 일괄 하향하지 않고 실제 설명·관찰 흐름을 보아 재판단했다. TSN9와POWERLINK10 F의 옛 부제 차이는 내용상 정상 연결이므로 감점을 철회했다. Kernel1은 첫 개론의 도구지도 허브 역할로 보강 예외를 적용했다.

### chapter06-profinet.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter06-profinet.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter06-profinet`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 41~45행CC정의,61/79/206행cycle/jitter,218행DCP/IP,65/214행switch인증은PI/제조사대조미완료. Ch7과다른DCP설명은시리즈간차이로만기록.

| 항목 | 근거 |
| --- | --- |
| A13 | 59~61행큐정책별한계,175~186행EtherCAT선택이있어단순연혁나열보다가치있음.A13유지. |
| B11 | 35~171행CC/RT/IRT→역할→GSDML흐름은끝남.42행diagnostic차이설명이표한칸이고67~75행스케줄단위와CC전제가부족하여11유지.B≤13. |
| C5 | 101~162행XML은실제파일/검증로그없고167행32×31.25=1000μs는산술뿐.39~43·61·190·206행무출처수치로C≤8;5유지. |
| D9 | 85~89·101~171행↔chapter07-profinet-io.md25~29·198~218행역할/GSDML 동일deviceID/interval;175~186행↔chapter12-comparison.md23~32행선택축반복.35~79행RT/IRT구분은독립역할이라9유지. |
| E6 | 제목자체가개요분석이고35~79행strictpriority와시간스케줄차이를설명하므로개념소개만이라는5를6으로조정.2·5행범위는본문과같다. |
| F4 | 235행1차분량종료/TSN·POWERLINK후속시리즈안내와달리공개order7~12가동일시리즈에있음.243행IRQPart4.6은공개order87.관련1/2/5/RTOS4제목주제는맞지만길찾기결함으로4유지. |
| G2 | 244~245행PI/Siemens공식홈·문서검색은있지만CC/사양주장의판·절과연결없음.2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~245행. SHA-256: `0a394701b1a6bdd33e6c19fb7fe7bd57e4b66fd0f4d4f3533d0c95d2f2ba95c0`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter07-profinet-io.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io`

score_status: 잠정 · score: 53 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 94·213행ET200SP최소주기는서로다른제품변형일가능성을배제못해추가오류확정안함.94행IRT250μs와236행CC-C메뉴250μs는같은방향이라그쌍자체는오류아님.표준index·MRP·DCP외부대조미완료.

| 항목 | 근거 |
| --- | --- |
| A12 | 35~178행발견→AR→cyclic/acyclic→redundancy가약어를한흐름에놓는다.고유실행관찰은없어12유지. |
| B10 | 35~222행발견부터등록까지완결이나108행연속2cycle실종과178행3cycle실종의보편fault기준이동시에성립못함.134행vendor범위에135~136행표준index가포함되는분류충돌도있어10유지. |
| C5 | 49~59행Wireshark형태와198~218행XML이있지만캡처명령/환경/파일검증없음.94·178·236행무출처주기상한C≤8;5유지. |
| D10 | 25~29행역할과198~218행ET200SP/GSDML은chapter06-profinet.md85~89·101~167행과중복.그러나35~178행DCP/AR/RecordData/Alarm/MRP전담이더커9→10. |
| E7 | 2·5행모델·역할추적을17행의발견→설정→연결흐름과35~178행이실제로푼다.실측없이도추적설명은있어6→7. |
| F7 | 257행next공개order8TSN및261~263행6/8/5실제slug/title대응. EtherCAT5는비교주제로연결되며없거나다른주제안내아님.17~19행전제/흐름이글고유길잡이라7유지. |
| G2 | 264행IECapplicationlayer링크있으나실제표준조항/장치판이없어2유지. |

전문 읽기: 1~264행. SHA-256: `6d690f778953e010b6a9a7a85c291f97a272ad027a480353897a53fd1f9fd1b4`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter08-tsn.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter08-tsn.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter08-tsn`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: AS2020hotstandby·Qbupreemption크기·Qci/FRER·NIC지원및가격미대조.표준개수9/10서술은산문개수차이로만기록하며오류게이트에넣지않음.

| 항목 | 근거 |
| --- | --- |
| A11 | 33~196행기능별toolkit매핑은유용하지만공식표준개요재구성이고200~214행카탈로그가주된추가부분.A11유지. |
| B10 | AS→Qbv→Qbu→Qci→CB→Qcc로완결.세부표준전제/가격·지원범위불확실과FRER실패관찰부재로10유지.B≤13. |
| C4 | 86~103행GCL그림과bitmask대응,107행1538×8/1e9=12.304μs확인.설정실행/패킷관찰없고200~214행무출처가격/사양으로C≤8;4유지. |
| D10 | 163~185행YAML↔chapter09-tsn-scheduling.md175~198행은MAC/PCP/VLAN/interval/frame-size공통이나stream-id/전체schema까지동일하진않음.52~67행↔그글105~125행gPTP기본설명반복.개요/스케줄역할분리로10유지. |
| E6 | 2행표준분석과개요를함께명시하고Qbv86~107행GCL·blocking시간과125행preemption효과를설명해5→6.본문약속은기능맵이며제품검증은별개. |
| F7 | 258행nextorder9공개,후속GCL설정/동기내용맞음.262~264행7/9/2slug/title도주제대응.19행이개요와다음심화를분명히분리하고툴킷별구조가고유하여7유지. |
| G2 | 265행IEEEtaskgroup공식링크만있고기능/제품주장에판·절연결없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~265행. SHA-256: `eeb469238595345780248ad03ba7ca36b401347bf9c7d1b6105f71e9d62c5964`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter09-tsn-scheduling.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling`

score_status: 잠정 · score: 61 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 69~97행taprioflags/clockid·105~153행ptp4l설정·도구목록·성능주장공식대조미완료.4stream을100μs안에송신한다는것은1ms사이클앞쪽에담는조건일수있어단독주기오류로올리지않음.

| 항목 | 근거 |
| --- | --- |
| A15 | 52~63행GCL과69~97행실제설정,ILP제약/휴리스틱을한문제로연결하여15유지. |
| B13 | 분류→GCL→Linux→gPTP→CNC→합성→함정으로범위완결.30행PCP4networkcontrol을정의하지만52~60행GCL은Q4를한번도열지않음. guardband8800~10000은BE750000~1000000뒤다음cycleCDT를보호할수없어13상한유지. |
| C7 | 69~97·129~153행명령/설정은구체적이나예상패킷/시각관찰없고무출처153/ILP시간·368행80%수치로C≤8.불일치GCL을실측증거로인정안해7유지. |
| D10 | 175~198행YAML↔chapter08-tsn.md163~185행PCP7/VLAN100/1ms/256B가겹침;105~125행↔그글52~67행gPTP,329행↔그글241행guardband.합성/스케줄설정은이글전담으로10유지. |
| E7 | 2·5행GCL·gPTP·ILP/CNC약속을각대응절이직접설명.정확성게이트와별도로검색의도는일치하여6→7. |
| F7 | 372행next공개order10은실제POWERLINK/OpenSAFETY글.오픈소스산업이더넷이라는부제는실제그글15~35·130~150행내용과맞아제목문자차이만으로감점안함.376~378행8/10/11공개주제맞고21~24행수동/합성분기가고유라6→7. |
| G2 | 379~380행IEEEQbv2015/AS2020링크는있으나Linux/벤더별판과수치근거없어2유지. |

전문 읽기: 1~380행. SHA-256: `07791f628ac42ee54b6edfaad544cd57a23bc3e5bae44a883cc01d6ceabc2aad`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter10-powerlink.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink`

score_status: 잠정 · score: 59 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: API·license·NodeID공식범위·OpenSAFETYCRC/SIL매핑·유일성주장원출처미대조.별도safetyPLC불필요대실제안전PLC공존은별도구성여부의문이라추가오류확정안함.

| 항목 | 근거 |
| --- | --- |
| A13 | 48~109행노드수별시간예산과210~303행blackchannel분리를도입해13유지. |
| B12 | 역할/사이클→프레임→stack→설정→safety→함정흐름완성.126행CN에1~240배정하면서같은행240을MN전용으로명시하고198행MN F0구성.같은식별공간역할이겹쳐12유지. |
| C6 | 95~101행32×6.7양방향+SoC/SoA≈442μs산술맞음.132~150행빌드있으나코드관찰/실제노드없고30~32·109행무출처cycle상한C≤8;6유지. |
| D12 | 48~82행cycle상세↔chapter02-realtime-requirements.md177~185행SoC/PReq/PRes요약;291~303행↔chapter12-comparison.md85~94행safety표.이글openPOWERLINK구현/blackchannel이주된역할이라12유지. |
| E7 | 2·5행POWERLINK/OpenSAFETY메커니즘을48~150·210~303행각각다뤄7유지.유일한옵션단정의정확성은별도검증필요. |
| F7 | 345행next공개order11LinuxRT/EtherCAT후행설명맞음.349~351행9/11/3공개및주제대응.95~109행노드예산과safety구분으로읽는목적이있어6→7. |
| G2 | 352~353행EPSG·IEC공식주소와132행repo는있으나stacktag·검증장비·주장별조항없어2유지. |

전문 읽기: 1~353행. SHA-256: `6ddadc492c90803878f782fe8ff712b6e14f597939e36b7df253011ac866f591`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter11-linux-realtime.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime`

score_status: 잠정 · score: 57 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 153행200000cycles대160행14400000cycles를핵심산술불일치로유지.176행30m와412행1h이상권고는권고를더강하게한것일수있어단독오류근거에서철회.PREEMPT_RT/NIC/IgH/API/production50μs원출처미대조.

| 항목 | 근거 |
| --- | --- |
| A14 | 19행네단계구성과153~247행isolation/IRQ/NIC관찰지점은있으나실측조건이부족해14유지. |
| B12 | RT→CPU→cyclictest→NIC→IgH→함정까지완료.153행200000회250μs면50초인데154행1h명령과160행14400000회.한측정의의도횟수가출력과불일치하여B12유지. |
| C7 | 154·176행cyclictest와189~247행튜닝명령은구체적.160행18μs결과는CPU/NIC/부하상세없고178행production50μs기준도무출처라C≤8;7유지. |
| D10 | 276~285·317~351행IgH↔chapter05-ethercat-master.md206~218·224~249행동일핵심루프.96~146행isolation/mlock↔RTOS part5-07-preempt-rt-linux.md232~248행공통.산업NIC운영전담이남아10유지. |
| E7 | 2·5행산업Linux운영을19행네단계와47~351행이대응.모든단계라는description은검증부족으로확정못하나범위는맞아7유지. |
| F5 | 417행next공개마지막order12비교선택글맞음.421~423행5/12/RTOS5-07공개내용대응.424행IRQPart4-06은실제Recipes7-13/order87로잘못되어5상한유지. |
| G2 | 425~426행IgH공식repo/RTwiki및6.12판표기는있으나벤치장비/실행repo고정판없어2유지. |

전문 읽기: 1~426행. SHA-256: `36127f91e0894b04d023f5737b67e83a23b7b7ff99c6dcb67ad98533ce2bb5d5`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter12-comparison.md

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter12-comparison`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 125~264행실명공장채택·pilot·가격·시장순위·94/306행SIL3범위미대조. TSN을포함하는모두의범위가애매하므로기술오류로확정하지않음.

| 항목 | 근거 |
| --- | --- |
| A13 | 117~181행시나리오별요구분해·268~296행질문분기가있으나실제채택사례출처없어13유지. |
| B12 | 비교축→6시나리오→지역사례→선택흐름→종결로완료.대부분선택의근거가무출처사양/채택단정이고안전예외부족해12유지. |
| C4 | 23~94행정량cycle/칩가격·125~264행채택주장은환경/출처없어C≤8.명령·실패관찰없는추천표중심으로4유지. |
| D10 | 23~36행↔chapter01-overview.md103~109행속도/시장표,183~199행↔chapter08-tsn.md216~227행OPCUA,85~94행↔chapter10-powerlink.md295~303행safety매핑반복.시나리오/생태계정리가남아10유지. |
| E7 | 2·5행표준선택/국내사례약속을117~296행이실제로다룸.출처불명인사례를범위누락으로바꾸진않아7유지. |
| F4 | 마지막공개order12종결맞음.323~329행1/5/6/8/10/11/RTOS5-07대응.330행IRQPart4.6는실제87,332행무링크DO178C와319행인증절차추천은draft글로진행못함.4유지. |
| G1 | 333~336행단체홈외에실명현장사례/표준조항/업데이트판출처없어1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~336행. SHA-256: `a847a40d211e7ffae3057489e895bc4bcb6ec219bcbae99499ee6ae93fe68983`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter01-user-kernel-boundary.md

source_file: `src/content/blog/tools/debugging/kernel/chapter01-user-kernel-boundary.md`
url: `/blog/tools/debugging/kernel/chapter01-user-kernel-boundary`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: taintbit/권한·kptr_restrict·sysrq·kgdb조건원출처미대조.82행do_fork주소와204행handle_pte_fault주소는같은build가명시되지않아직접모순으로삼지않음.46행다섯가지뒤7행은산문개수만.

| 항목 | 근거 |
| --- | --- |
| A8 | 23~49행도구지도와55~214행인터페이스예는일반공식입문재구성.독립사례없어8유지. |
| B9 | 경계/도구→proc→symbols→module→taint→sysrq→addr2line완료지만각도구제약/선택실험은짧고76행Ch누락.기본입문9유지.B≤13. |
| C6 | 80~85·106~123·185~210행명령/예상출력은있으나kernel판·실제vmlinuxbuild와KASLR전제가빠짐.실험성은UART앵커수준6유지.C절차상한9이하. |
| D9 | 150~183행taint↔chapter07-panic-oops.md108~119행,199~214행addr2line↔그글131~139·199~210행반복.239~249행debuginfod↔dwarf-elf/chapter06-split-dwarf-tools.md165~181행반복.도구개론역할로9유지. |
| E7 | 2행개론/경계/도구선택은23~49행표가직접답하고proc/kallsymsdescription도55~123행이행.분석약속으로볼필요없어6→7. |
| F4 | 263행next공개order2printk/dmesg/dynamicdebug범위맞음.267~268행kernel2/DWARF1공개대응.269행무링크strace추천시리즈는draft이고241행debuginfod시리즈명도실제DWARF6의한절이므로4유지. |
| G2 | 270~272행kernel공식debug/sysrq문서와manproc있지만taint/주소/권한별버전근거없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~272행. SHA-256: `ebea71d5f56ad9518a213de4538e12ff23f7f109bfcc2c60e7f2315d851a465a`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter02-printk-dmesg.md

source_file: `src/content/blog/tools/debugging/kernel/chapter02-printk-dmesg.md`
url: `/blog/tools/debugging/kernel/chapter02-printk-dmesg`

score_status: 잠정 · score: 53 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: BUG_ON/panic·dynamicdebugflag·ringbuffer경로·321~326행prefix예는공식API미대조.58이하/96미만은동일console조건의직접충돌로유지하고기억상오류를추가하지않음.

| 항목 | 근거 |
| --- | --- |
| A10 | 33~99행level과ringbuffer,151~244행dynamicdebug/rate,Driver예를엮지만일반입문수준10유지. |
| B11 | 로그기초→destination→toggle→rate→운영→driver완결.58행console_loglevel이하와96행미만은경계level출력이반대이며85행level4일때39행warning체크도96행과충돌.11유지. |
| C7 | 89~92행echo8대dmesg-n7은96행의미만규칙에서debug7포함여부가다름.예상로그있지만환경/driver재현조건과경계관찰없음.무출처ratelimit/비용으로C≤8;7유지. |
| D11 | 33~42·62~66·89·151행↔현행Recipes part7-06-kernel-module.md128~145행prlevel/dmesg/echo8공통.이글dynamicdebug및rate/console경계가전담이라11유지. |
| E7 | 2·5행커널로그추적을89~99·160~199·294~326행toggle/관찰흐름으로답한다.명령소개만이라5로내린것은낮아7. |
| F5 | 343행next공개order3ftrace/tracepoints실제내용맞음.347~348행kernel1/3공개대응.349행무링크strace-tracingCh9는draft라5상한유지. |
| G2 | 350~351행kernelprintk/dynamicdebug공식링크있으나특정kernel판/기술주장조항없어2유지. |

전문 읽기: 1~351행. SHA-256: `a54e31e7cabd83fb002eda13c984471c993869f400e60bf853cce85b86f16f95`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter03-ftrace-tracepoints.md

source_file: `src/content/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints.md`
url: `/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: TRACE_EVENT212~232행컴파일전제,tracefs파일명/trace-cmdvmcoreextract/5byteNOP/모든함수단정은공식자료미대조.파일목록의trace중복은표현문제이며API기억으로error확정안함.

| 항목 | 근거 |
| --- | --- |
| A10 | 60~179행도구흐름과264~283행graph/trigger가구체적이지만일반tracer사용법이며고유분석결과없어10유지. |
| B10 | 기본→filter→event→custom/kprobe→latency→wrapper→postmortem→함정완료.13행spike분석약속대실제원인해결사례는없고macro구축전제도빠져10유지.B≤13. |
| C7 | 264~283행do_sys_open필터뒤cat트리거/예상graph,310~332행record/report있으나kernel판·완성module없고값실측출처없어C≤8;7유지. |
| D8 | 19~38·60~86·167~179·253·264~283·292~308·310~332행↔performance-engineering/part5-03-ftrace.md24~49·51~76·136~161·185·77~102·103~135·162~179행직접비교.기본도구/명령/결론반복폭커9→8;customtracepoint설명역할은남음. |
| E7 | 2·5행호출트레이싱/functiongraph와event를60~241·264~283행명령과예상결과로다뤄단순개념소개만은아님.5→7. |
| F5 | 416행next공개order4eBPF/bpftrace범위맞음.420~422행kernel2/4/perfftrace공개및overhead설명대응.423행무링크strace-tracingCh9draft추천으로5상한유지. |
| G2 | 425~426행공식ftrace문서/trace-cmdrepo와424행전문가자료는있으나kernelversion/실제실행환경없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~426행. SHA-256: `75e92123a861562710be55c73cce34c4cd872be394fe48f7955f448c0eef8e18`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.
