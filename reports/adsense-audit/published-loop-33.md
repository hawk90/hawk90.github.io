# 공개 글 AdSense 평가 — 루프 33

> 대상: 공개 글 10편 (PCIe Deep Dive `seriesOrder` 8~17)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른세 번째 루프다. 대상은 `src/content/blog/embedded/hardware/pcie/`의 chapter08~chapter17 10편(PCIe Deep Dive `seriesOrder` 8~17)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter08-dllp.md` | 9 | 10 | 3 | 9 | 6 | 5 | 1 | **43** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `chapter09-physical-layer.md` | 9 | 9 | 4 | 9 | 6 | 7 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `chapter10-linux-basics.md` | 10 | 10 | 6 | 10 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `chapter11-linux-dma.md` | 10 | 9 | 5 | 10 | 6 | 6 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter12-virtualization-1.md` | 9 | 9 | 6 | 8 | 6 | 6 | 1 | **45** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `chapter13-virtualization-2.md` | 9 | 8 | 4 | 10 | 6 | 7 | 2 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `chapter14-linux-operations.md` | 9 | 8 | 4 | 10 | 6 | 4 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `chapter15-tools.md` | 9 | 8 | 6 | 8 | 6 | 6 | 2 | **45** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `chapter16-troubleshooting.md` | 9 | 8 | 4 | 9 | 5 | 5 | 1 | **41** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `chapter17-performance.md` | 10 | 9 | 5 | 9 | 6 | 5 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |

평균 45.2점(10편, 합 452점), 범위 41~52점이다. 판정은 우선 조치 4편(ch09·ch14·ch16·ch17), 병합 검토 6편(ch08·ch10·ch11·ch12·ch13·ch15)이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)다. 오류 확인은 4건이다. ch09·ch14는 원문 내부 모순으로, ch16은 Linux `Documentation/admin-guide/kernel-parameters.txt`와 `Documentation/ABI/testing/sysfs-bus-pci-devices-aer`를, ch17은 `include/uapi/linux/pci_regs.h`를 직접 열어 판정했다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`, Ch 1 176행 '시리즈 자료 출처 안내' 앵커까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다. 시리즈 공통 H2 뼈대와 Ch 2~18 일괄 확장 커밋(bd3aed87)은 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter08-dllp.md` | 44 | 43 | -1 | 없음 |
| `chapter09-physical-layer.md` | 46 | 45 | -1 | 없음 |
| `chapter10-linux-basics.md` | 52 | 52 | 0 | 없음 |
| `chapter11-linux-dma.md` | 48 | 48 | 0 | 없음 |
| `chapter12-virtualization-1.md` | 46 | 45 | -1 | 없음 |
| `chapter13-virtualization-2.md` | 46 | 46 | 0 | 없음 |
| `chapter14-linux-operations.md` | 42 | 42 | 0 | 없음 |
| `chapter15-tools.md` | 45 | 45 | 0 | 없음 |
| `chapter16-troubleshooting.md` | 42 | 41 | -1 | 없음 |
| `chapter17-performance.md` | 45 | 45 | 0 | 없음 |

- 판정을 바꾼 글: chapter16-troubleshooting은 평가자가 미검증·병합 검토로 냈으나 더블 체크에서 1차 자료를 열어 오류 확인·우선 조치로 올렸다. C도 5에서 4로 내렸다(핵심 진단 명령 두 곳이 1차 자료와 맞지 않아 따라 하면 실패한다).
- 추가한 오류 확인(ch16): 96행 'ACS bits 비활성화 \| `pci=force_floppy_to_high_dma=Off`'. torvalds/linux master(24a19b95) `Documentation/admin-guide/kernel-parameters.txt`의 pci= 옵션 목록(5038행~)에 이 옵션이 없고, ACS 관련 옵션은 5255행 `disable_acs_redir=`, 5264행 `config_acs=`뿐이다.
- 추가한 오류 확인(ch16): 63·171·200행 AER 카운터 경로 `/sys/kernel/debug/pci/<BDF>/aer_dev_correctable`·`aer_*`. 같은 커밋의 `Documentation/ABI/testing/sysfs-bus-pci-devices-aer` 12·33·63행은 `aer_dev_correctable`·`aer_dev_fatal`·`aer_dev_nonfatal`을 `/sys/bus/pci/devices/<dev>/` 아래에 둔다. chapter15-tools.md 129~135행에도 같은 경로가 있다.
- 기각한 오류 확인: 없음.
- chapter08 F 6 -> 5: 평가자가 170행 다음 편 라벨 부제('Encoding')가 Ch 9 실제 제목('SerDes', Ch 9 2행)과 다르다고 스스로 적고도 6점을 줬다. 라벨이 대상과 다르면 F ≤ 5라 상한 초과(AP-C-24)로 1점 내렸다.
- chapter09 D 10 -> 9: chapter16-troubleshooting.md 36~42·50~55행(LnkSta 확인, EQ 실패 downgrade)과 tools/debugging/embedded/chapter18-highspeed-link-bringup.md 15·118~123행(SerDes·CTLE/DFE·EQ)을 비교 대상에 추가했다. 고유 기여가 더 줄었다.
- chapter12 D 9 -> 8: 평가자가 '다른 글에 없다'고 본 SR-IOV 활성·mdev·reset 종류가 tools/emulation/qemu-fpga-driver ch09~11(draft)에 있다. 공개 중복은 아니지만 고유하다는 근거가 약해졌다. merge_note도 'PF/VF 제약 표(48~55행)만 이 글에 있다'로 고쳤다.
- chapter14 factcheck 근거 정리: 오류 확인의 주 근거를 120행 '8-bit function (8 function/device)' 대 'ARI: 전체 8-bit → 256 function/device' 산술 모순으로 두고, VF 문턱(124·146행 >8 대 188·200행 >7)은 문턱 표현 차이일 수 있어 보조 근거로 낮췄다. 판정은 유지.
- chapter17 근거 보정: pci_regs.h의 NOSNOOP_EN은 평가자가 적은 532행이 아니라 528행이다. 50행 주석과 값이 맞지 않는다는 판정은 그대로 성립한다. Ch 16 시나리오 8 범위를 116~129행으로 바로잡았다.
- 근거 보강(점수 영향 없음): chapter10 C에 72·73행 my_probe·my_remove 미정의, D에 qemu-fake-device·qemu-fpga-driver가 draft라 공개 중복에서 뺀다는 점. chapter11 F의 Ch 4 대조 위치를 chapter04 5·15행으로 바꿨고 23행 대 47행 'Coherent DMA' 표기 충돌을 uncertainties로 추가. chapter13 C에 110행 '<hw-id>' placeholder. chapter15 D에 Ch17 50행·Ch10 168행 반복.
- 부풀림 판정은 10편 모두 없음이다. 최종 합계는 1차보다 4점 낮다(456 -> 452).

## 글별 근거

### `chapter08-dllp.md` — 43점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, bd3aed87 Ch 2-18 확장·게이트와 빌드 통과만 기록, 400892d7 linter 일괄, 55e250f2 날짜 정규화)에 PCIe Base Spec·PCI-SIG 자료와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 128행 'deprecated (Gen 7부터)'와 148행 'Gen 7부터 FLIT 전용 가능성 큼'은 단정과 추정의 충돌이지만 둘 다 참일 수 있어 오류 확인이 아니라 불확실로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | DLLP 종류 표(21~28행), TLP wrapping 표(34~40행), credit 6종 표(73~80행), LCRC/ECRC 표(99~102행)는 입문서 수준 목록을 이탤릭 단편으로 옮긴 것이다. 글 고유 해석은 142~144행 'FC는 buffer overrun 방지만, priority는 TC/VC', 134행 'DLLP 손상은 재전송 없이 다음 UpdateFC가 회복' 정도다. 118행 FLIT 도입 이유는 수치 없는 단정이고 148행 '가능성 큼', 152행 '모두 의심'은 판단 기준 없는 완곡 표현이다. 앵커 part6-09(A 10)보다 한 단계 아래. |
| B | 10 | DLLP → wrapping → ACK/NAK → replay → FC → FC init → CRC → FLIT → 함정 → 정리 흐름은 끝까지 간다(19~166행). DLLP 6 byte(30행)의 필드 배치, ACK 병합과 AckNak latency timer, Replay Timer 값(140행 'Gen·payload size 따라 결정'뿐), credit 단위, REPLAY_NUM 한계(65행), FLIT mode에서 DLLP 위치(116행 한 칸)가 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 3 | 재현 절차·관찰 결과가 없다. 유일한 명령인 152행 `lspci -vv \| grep "AER.*Cor"`은 기대 출력과 '빈번한 CE'의 기준이 없다. 67행 'Gen 4·5 replay buffer 수십~수백 KB'는 출처·환경 없는 수치라 C ≤ 8. 156행 'vendor-specific'으로 끝나 자기 장치의 credit 확인 방법도 없다. |
| D | 9 | 같은 시리즈 `chapter01-fundamentals.md` 106~117행 FLIT 비교 표가 이 글 110~116행과 행·값이 거의 같고 이 글은 FC 행만 더했다. 130행 'CXL 3.x·UCIe 2.0이 FLIT mode 채택'은 Ch 1 117행과 같은 문장이다. 인접 글 `chapter07-error-handling.md` 131~141행 Replay·Replay Timer가 이 글 57~65·150~152행과 겹친다. `chapter09-physical-layer.md`는 LTSSM·EQ·SKP 중심이라 역할이 갈린다. 다른 시리즈 `cxl/chapter09-flit-format.md` 54~90행이 FLIT를 더 자세히 다뤄 106~130행은 하위 중복이다. ACK/NAK·credit FC(44~95행)는 시리즈에서 이 글만 다룬다. |
| E | 6 | 제목 키워드 DLLP·ACK/NAK·Flow Control·FLIT Mode와 description의 replay buffer·LCRC가 각각 절을 가진다(19·44·57·69·97·106행). 각 절이 표 하나와 한두 줄이고 독자가 얻을 결과(replay·credit 문제 진단법)가 분명하지 않다. |
| F | 5 | 170행 다음 편 링크 대상은 seriesOrder 9 `chapter09-physical-layer.md`가 맞지만 라벨 'Ch 9: Physical Layer — LTSSM·Equalization·Encoding'이 실제 제목 '…·SerDes'(Ch 9 2행)와 달라 F ≤ 5. 175행 Ch 7 'Replay Number Rollover'(Ch 7 138·165행), 177행 CXL Ch 9 Flit Format, 181행 앵커(Ch 1 176행)는 맞다. 17행 Ch 2 전제, 65행 Ch 7 지시는 글 고유 안내지만 상한 때문에 5점. |
| G | 1 | 본문에 1차 출처가 없다. PCIe Base Spec 판·§ 번호, PCI-SIG 자료, Linux `drivers/pci` 위치 모두 없다. 179~181행은 Ch 1 footer로 넘기는데 그 절은 시리즈 공통 자료 유형 안내라 DLLP 6 byte·LCRC 범위·FLIT 256 B 주장과 연결되지 않는다. |

uncertainties:
- 30·161행 'DLLP 6 byte (header + payload + 16-bit CRC)': non-flit DLLP 필드 구성과 framing 포함 여부를 spec으로 확인하지 않았다.
- 51행 'NAK (마지막 정상 seq)'와 53행 'NAK 이후 TLP 모두 재전송': AckNak_Seq_Num 의미와 맞는지 미확인.
- 67행 'Gen 4·5 link replay buffer 수십~수백 KB'는 출처 없는 수치.
- 95행 'FC Init 실패면 LTSSM에 재진입'이 spec 동작과 맞는지 미확인.
- 104행 'Switch가 TLP transform하지 않으니 ECRC가 multi-hop 무결성 보장'의 인과 서술 미확인.
- 116행 'FLIT mode에서 FC는 FLIT header에 포함'이 flit 안 DLLP 배치와 맞는지 미확인.
- 118행 'PAM4·128b/130b의 한계': 128b/130b를 이유로 든 근거 없음.
- 128행 'deprecated (Gen 7부터)'(단정)와 148행 'FLIT 전용 가능성 큼'(추정)이 어긋난다. PCIe 7.0 spec 대조 필요.
- 148행 'Gen 6 device가 NRZ legacy mode와 FLIT mode 둘 다 지원': flit mode가 낮은 rate에서도 쓰이는지 미확인.
- 17행 'DLL이 … priority를 책임'과 144행 'priority/QoS는 별도 TC'의 계층 귀속(TC/VC가 TL 개념인지) 미확인.
- 152행 `lspci -vv | grep "AER.*Cor"`이 실제 lspci 출력(CESta 등)과 맞는 패턴인지 미확인.

병합 대상: 병합 대상 없음. 다음 조치는 보강이다. ACK/NAK·replay buffer·credit FC·FC init(44~95행)은 시리즈에서 이 글만 다루는 DLL 장이다. FLIT 절(106~130행)은 Ch 1 106~117행 표의 반복이고 CXL Ch 9 54~90행보다 얕으므로 줄이고 두 글로 링크한다. DLLP 필드 배치, ACK coalescing·Replay Timer, credit 단위, REPLAY_NUM 한계, flit mode에서 DLLP 위치를 PCIe Base Spec § 번호와 함께 채우고, 67행 수치는 지우거나 TBD로 둔다. 170행 다음 편 라벨을 Ch 9 실제 제목에 맞춘다.

### `chapter09-physical-layer.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 26행 LTSSM 표는 FC Init을 Configuration state의 동작으로 적는다("Configuration | Lane reversal·polarity·link width 결정, FC Init"). 48행 타임라인 표는 "5 | L0 | Active — DLL이 FC Init"이라 하고 184행 관련 항목도 "FC Init이 L0 도달 후"라 적는다. FC Init이 일어나는 state에 대한 두 구체 진술이 동시에 참일 수 없다. git log(0a9dd7bc slug 고정, be973200 topic metadata, bd3aed87 콘텐츠 확장, 400892d7 linter 일괄)에 1차 자료 대조 커밋이 없어 이 모순이 없어도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | LTSSM 표(21~33행), 타임라인(41~48행), TS1 symbol 표(56~64행), EQ phase 표(72~77행), SKP 표(96~100행)가 표 하나에 한두 줄 설명으로 끝나 입문 자료의 표준 목록 수준이다. 104~112행 Encoding 절은 제목부터 '(재확인)'이고 chapter01 94~104행과 같은 내용이다. 이 글만의 관점은 149~151행(EQ 실패 downgrade)과 161~163행(PAM4와 NRZ Gen 5 symbol rate 비교) 정도인데 149~151행은 chapter16 50~55행에도 있다. 79·141행은 구체 기준 없는 일반론이다. |
| B | 9 | 목차는 넓지만 절마다 표 하나와 한두 줄이다. 45행 타임라인은 Polling.Configuration을 쓰는데 21~33행 표에는 그 하위 state가 없다. 72~77행 EQ phase는 포트 역할별 동작 없이 'DSP가 best EQ 검색'으로 끝난다. 137~141행 디버깅 절은 'LTSSM 상태 추적 어려움'으로 끝난다. 26/48행 모순과 24·26·45행 협상 위치 불일치가 열려 있어 B ≤ 13 상한(AP-C-24)에도 걸린다. |
| C | 4 | 실행 가능한 명령은 124행 `lspci -vv \| grep "LnkSta:"` 한 줄뿐이고 'RT (Recovery Time)' 필드의 예상 출력이 없다. 50행 '수십 ms', 98행 '수천 symbol마다', 135행 '50~500 FTS', 159행 '수 ns 수준'은 출처·환경 없는 수치라 C ≤ 8. 재현 절차·관찰 결과·합격 기준이 없다. |
| D | 9 | 같은 시리즈: chapter01 94~104행 Encoding 표와 이 글 104~112행이 표·문장까지 거의 같고, 161~163행은 chapter01 142~144행과 같은 질문이다. chapter06 33~39행 L state 표와 28~31행이 겹친다. chapter16 36~42·50~55행이 124·149~151행을 증상→단계로 더 구체적으로 다룬다. 다른 시리즈: tools/debugging/embedded/chapter08-cxl-link-debug.md 19~41행이 LTSSM 멈춘 state별 의심 원인표를 갖고 있고, chapter18-highspeed-link-bringup.md 15·118~123행이 이 글이 제목에 걸고 다루지 않은 SerDes·CTLE·DFE를 다룬다. bootloader/chapter34-pcie-enumeration.md 31행은 한 줄 언급이다. |
| E | 6 | 제목(2행) 'LTSSM·Equalization·SerDes' 중 SerDes는 15·167행에 단어로만 나오고 CDR·serializer·CTLE/DFE 절이 없다. description(5행)의 LTSSM 11 state·timeline·4-phase EQ·TS1/TS2·SKP·encoding은 21·41·72·56·96·106행 표로 이행된다. 제목 키워드 하나 미이행. |
| F | 7 | 178행 다음 편은 chapter10-linux-basics.md(seriesOrder 10)와 맞다. 182행 Ch 1(chapter01 94행), 183행 Ch 6(chapter06 33~39행), 184행 Ch 8(chapter08 84행) 라벨이 대상 내용과 맞고 188행 앵커는 chapter01 176행에 있다. 17행이 Ch 1을 전제로 짚는다. 템플릿 요소는 가산하지 않았고 절 사이 안내가 약하다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 188행은 Ch 1 footer로 넘길 뿐이고 PCIe Base Specification 판·커널 버전·pciutils 버전이 없다. 139행 'Teledyne LeCroy 등'은 제품명, 141행 'pcie_aer.c'는 경로·버전 없는 파일명이다. |

uncertainties:
- 21~33행 '11 State' 표가 Polling.Active·Polling.Compliance를 따로 세고 Loopback을 뺐다. spec top-level state 목록과 대조하지 않았다.
- 168행 정리는 'LTSSM 11 state'라 하고 10개를 나열한다(개수 표기 실수, 오류 확인 대상 아님).
- 24·26·45행: link rate·width 협상 위치를 Polling.Active / Configuration / Polling.Configuration으로 다르게 적는다. '협상'과 '결정'의 구분이 모호해 오류 확인으로 올리지 않았다.
- 112행 'PAM4는 symbol rate 절반에 bit rate 2배'와 163행 'Gen 6은 Gen 5와 symbol rate 같음, bit rate 2배'는 비교 기준이 달라 모순으로 단정하지 않았다.
- 94행 SKP를 clock compensation용이라 하면서 102행은 '8b/10b는 DC balance를 위해 SKP 빈도 높음'이라 적는다. 용도 연결이 의심스럽다.
- 110행 Gen 6·7 overhead '1.5% + FEC'와 chapter17 29행 'PAM4+FEC ~3%'가 다르다. FLIT mode에서 128b/130b 미사용이라 1.5% 표기 의심.
- 124행 LnkSta에 'RT (Recovery Time)' 필드가 있는지 미확인. chapter15 48행 예시 출력에는 없다.
- 135행 '50~500 FTS': 61행은 N_FTS를 한 symbol로 적는데 8비트 값으로 500을 담을 수 있는지 미확인.
- 141행 'pcie_aer.c'는 Linux 소스 drivers/pci/pcie/aer.c와 이름이 다를 수 있다.
- 74~77행 EQ Phase 0~3 동작이 spec의 DSP/USP 역할 정의와 맞는지 미확인.

점수 구간 메모(병합 검토 구간): 병합 대상 없음. Physical Layer·LTSSM은 시리즈 안에서 이 글만 다루는 주제다. 다음 조치는 보강이다(26/48행 FC Init 위치를 PCIe Base Spec으로 정리, 104~112행 encoding 절은 chapter01 94~104행 링크로 축소, SerDes 절을 쓰거나 chapter18-highspeed-link-bringup.md로 연결하고 제목에서 SerDes를 뺄지 결정).

### `chapter10-linux-basics.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc URL slug 고정, be973200 topic 메타데이터, bd3aed87 Ch 2-18 확장·게이트와 빌드 통과만 기록, 400892d7 linter 일괄, 55e250f2 날짜 정규화)에 struct 멤버·API·sysfs 경로·ACPI 테이블을 Linux drivers/pci 소스, include/linux/pci.h, ACPI 명세와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 본문 대부분이 커널 문서·헤더에 있는 목록을 표로 옮긴 것이다: pci_dev 멤버(34~46행), pci_driver 멤버(52~59행), 매칭 매크로(82~87행), probe 단계(93~102행), sysfs(110~123행), portdrv service(142~148행). 산문은 *강조* 조각이라(30·136·150행) 해석이 드러나지 않는다. 이 글만의 것은 '자주 하는 실수' 다섯 개(154~172행)인데 89행 'bind priority에 따라 결정', 172행 '비동기 cleanup 패턴 흔함'은 메커니즘·출처가 없다. 앵커 part6-09(A 10)와 같은 수준. |
| B | 10 | 부팅 enumeration(21~30행) → struct → 등록 코드(61~76행) → 매칭 → probe/remove(91~104행) → sysfs → ACPI → portdrv → 실수 → 정리(174~182행)로 흐름은 끝까지 간다. probe 순서는 표뿐이고 오류 되감기가 없으며, 102행 '역순 cleanup'은 대응 함수를, 104행 '별도 errno'는 값을 적지 않았다. 41·45행 bus 멤버, 134행 HPET, 89·164행 bind priority 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 등록 코드 조각(61~76행)과 명령(30행 rescan, 89·122행 bind/unbind, 125행 lspci -t/-vv)이 있다. 72·73행 my_probe·my_remove가 정의되지 않아 조각 그대로는 빌드되지 않고, 명령의 예상 출력·커널 버전·실행 환경이 없다. 104행 'dmesg \| grep <drv>로 각 단계 결과 추적'은 무엇이 보여야 하는지 없다. 앵커 part1-04(C 6)와 같다. |
| D | 10 | 비교: 같은 시리즈 chapter09, chapter11(겹침 적음), chapter04, chapter15, 다른 시리즈 modern-recipes/part11-03-pcie-bar.md, part11-09-pcie-streaming.md. sysfs 표 110~123행이 chapter15 98~112행 표와 항목이 거의 같다. probe 순서 95~98행이 part11-03 89~112행 my_probe 코드, part11-09 64~74행과 겹친다. 98행 pci_iomap 설명이 chapter04 134~139행과 같다. 23~28행 boot enumeration은 part11-03 75~85행과 주제가 겹치나 Linux 쪽(pci_scan_root_bus, MCFG) 관점이다. qemu-fake-device/chapter08-linux-driver.md, qemu-fpga-driver/chapter03-qemu-fake-fpga.md는 draft라 공개 중복에서 뺐다. |
| E | 7 | 제목 키워드 Enumeration(19~30행), Driver Model(50~104행), sysfs(106~125행)를 모두 다룬다. description(5행)의 'ACPI 통합'은 127~136행 표 네 줄뿐이고 134행 항목은 내용이 의심스럽다. 17행이 '본격적으로 분해'를 약속하지만 각 절이 표 수준이다. |
| F | 7 | 186행 다음 편 'Ch 11: DMA·IOMMU — ATS·PRI·PASID·IOMMUFD'는 chapter11-linux-dma.md(seriesOrder 11)와 맞다. 관련 항목 190~193행의 Ch 3·4·5·7은 각 대상 파일 제목·seriesOrder와 맞고, 덧붙인 키워드(pci_iomap, pci_alloc_irq_vectors, pci_error_handlers)도 대상 내용과 맞다. 본문 상호참조 58행(Ch 7), 99행(Ch 5), 131행(Ch 3)도 맞다. 17행이 전제 지식(Ch 3·4)을 밝힌다. |
| G | 2 | 25행 pci-acpi.c, 48행 drivers/pci/probe.c, 150행 drivers/pci/pcie/portdrv.c처럼 소스 파일을 주장과 연결하지만 커널 버전·링크가 없다. 148행 bwctrl처럼 최근 커널에만 있는 서비스를 쓰면서 기준 버전을 밝히지 않는다. 195~197행은 Ch 1 footer 위임이다. 앵커 part7-05(G 2)와 비슷하다. |

uncertainties:
- 41행 'u8 bus·devfn'과 45행 'struct pci_bus *bus'가 같은 struct에 bus 멤버를 둘 둔다. include/linux/pci.h 대조 필요(기억으로는 devfn은 unsigned int이고 bus 번호는 bus->number).
- 42행 'struct resource resource[6]'이 실제 배열 크기(DEVICE_COUNT_RESOURCE, ROM·bridge window 포함)와 맞는지 미확인.
- 57행 pci_driver의 suspend·resume 콜백이 현재 권장 경로인지(dev_pm_ops로 옮겨졌는지) 미확인.
- 89행 'bind priority에 따라 결정', 164행 'generic driver(예: nouveau)가 priority 낮은 매칭': driver core에 그런 우선순위 메커니즘이 있는지, nouveau를 generic driver로 볼 수 있는지 미확인.
- 95행 pci_enable_device가 'IRQ 할당'까지 하는지 미확인.
- 134행 'HOTPLUG (HPET·_OST)': HPET는 타이머 테이블로 알고 있어 ACPI 명세 확인 필요.
- 87행 ACPI _HID·_CID를 pci_driver id_table과 같은 층위의 매칭 패턴으로 적은 것이 맞는지 미확인.
- 30행 'Re-enumeration은 hot-plug·VFIO에서 일어남'에서 VFIO 근거 미확인.

병합 대상: 병합 대상 없음. 'Linux PCI driver model·probe 생명주기'라는 독립 검색 의도가 있고 겹치는 글은 각각 일부만 겹친다(sysfs 표는 chapter15 98~112행, probe 코드는 modern-recipes/part11-03-pcie-bar.md 89~112행). 다음 조치는 보강이다: sysfs 표는 chapter15로 넘기고 링크만 남긴다. probe/remove를 오류 되감기까지 포함한 코드로 쓴다. 커널 버전과 drivers/pci 소스 위치를 본문에 단다. uncertainties의 멤버·ACPI·bind priority 주장은 1차 자료로 확인해 고치거나 지운다.

### `chapter11-linux-dma.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(de653395 관련 링크 추가, 0a9dd7bc slug 고정, be973200 topic 메타데이터, bd3aed87 Ch 2-18 확장, 077d5525 링크 경로 수정, 400892d7 linter 일괄, 55e250f2 날짜 정규화) 어느 커밋도 97행 ATS Cap ID, 113행 PASID 20-bit, 145·155행 IOMMUFD 6.6+, 52~56행 방향별 cache 동작을 커널 소스·PCIe spec과 대조한 기록이 아니다. 평가 중 1차 자료를 열지 않았고, 23행 대 47행은 해석이 갈려 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 본문 대부분이 개념 표다: DMA 모델(21~24행), IOMMU 기능·벤더(60~74행), ATS·PRI·PASID(92~118행), SVM 5단계(124~130행). 이 글만의 판단은 178~180행(ATS가 있어도 page table·invalidation은 host)과 186~188행(IOMMUFD 점진 이행) 정도다. 172행 '느릴 수 있음', 143행 '대부분 현대 64-bit device는 swiotlb 미사용'은 근거 없는 일반론이고 132행 Grace Hopper·Sapphire Rapids는 이름 나열뿐이다. 앵커 part1-04(A 10) 수준. |
| B | 9 | DMA API(19행) → cache → IOMMU → group → ATS → PRI → PASID → SVM → swiotlb → IOMMUFD → mask → 실수(168행)로 끝까지 가지만 절마다 표 하나와 한두 문장이다. description(5행)의 scatter-gather는 40행 한 문장이고 `dma_map_sg` 코드가 없다. 34~37행 streaming 예제에 `dma_mapping_error` 검사가 없고 `dma_sync_*`는 언급되지 않는다. IOMMUFD(149~155행)는 객체 표뿐이다. 불확실 목록이 열려 있어 B ≤ 13. |
| C | 5 | 코드는 26~37행 coherent·streaming, 159~164행 DMA mask 두 조각뿐이고 커널 버전·아키텍처·장치 표기가 없다. 86행 `/sys/kernel/iommu_groups/`·`lspci -vv \| grep ACS`는 예상 출력·판정 기준이 없다. 97행 '큰 latency 절약', 143행 'Performance overhead 큼'은 수치도 출처도 없다. |
| D | 10 | 비교: 같은 시리즈 chapter10, chapter12, chapter13, chapter02, chapter19, 다른 시리즈 modern-recipes/part8-04-dma-allocator.md. 78~86행 IOMMU Group·ACS가 ch12 108~121행 ACS 절과 같은 주장·같은 명령이다. 26~37행 코드와 52~56행 방향 표가 part8-04 38~68행과 같은 구성이다(part8-04가 더 보수적). ch2 148~157행 ATS·PRI·PASID 표가 88~120행의 요약이고 157행에서 이 글로 넘긴다. ch13은 vIOMMU·S-IOV·IDE(19·45·148행)로 역할이 갈린다. |
| E | 6 | 제목(2행) 키워드 Coherent·Streaming·ATS·PRI·PASID·IOMMUFD는 19·88·99·111·145행에 절이 있으나 각각 표 하나 수준이다. description의 scatter-gather는 40행 한 문장, SVM은 122~132행 표뿐이다. |
| F | 6 | 202행 다음 편은 chapter12-virtualization-1.md(seriesOrder 12)로 맞다. 206행 Ch 4 'SR-IOV VF BAR'(chapter04 5·15행), 207행 Ch 5 'Interrupt Remapping'(chapter05 88행), 209행 Ch 13(chapter13 19·45·148·161행), 210행 driver-cosim chapter08(80행 `dma_map_single` shim) 모두 맞다. 17행이 Ch 5와의 연결을 밝힌다. 나머지는 시리즈 템플릿이고 전제 지식 안내가 없다. |
| G | 2 | 본문 안 1차 출처 링크가 없다. 214행 Ch 1 footer(chapter01 176~183행)는 일반 목록이라 97행 ATS Cap ID 0x0026, 113행 PASID 20-bit, 145·155행 IOMMUFD 6.6+와 연결되지 않는다. 버전 표기는 'kernel 6.6+'(15·145·155·188행)뿐. 앵커 part7-05(G 2) 수준. |

uncertainties:
- 97행 'ATS Extended Cap (0x0026)': ch3 137행도 0x0026, ch18 271행은 0x000F를 ACS로 적는다. 기억으로는 ATS=0x000F, ACS=0x000D다. PCIe Base Spec Extended Capability ID 표로 확인 필요(1차 자료 미확인이라 오류 확인에 넣지 않음).
- 23행은 Coherent DMA가 'cache coherency 자동'이라 하고 47행은 같은 'Coherent DMA' 열에서 ARM을 '비coherent — driver가 cache flush'로 적는다. 47행 열을 하드웨어 snoop 여부로 읽으면 모순이 아니라 해석이 갈린다.
- 176행 'Unmap이 cache invalidate trigger'는 54행 TO_DEVICE unmap 'nothing'과 방향별로만 맞다.
- 15·145·155·188행 IOMMUFD 'kernel 6.6+': 최초 merge 버전과 VFIO cdev 도입 버전을 커널 git으로 확인하지 않았다.
- 56행 BIDIRECTIONAL, 54행 TO_DEVICE unmap 'nothing'은 `arch_sync_dma_for_*` 구현과 대조하지 않았다.
- 47행 'ARM (no SMMU CCI)'는 coherency가 interconnect와 `dma-coherent` DT 속성에 달렸다는 설명과 어긋날 수 있다.
- 113행 PASID 20-bit, 132행 SVM 사례, 155행 '/dev/vfio/devices/vfioN'·'모두 IOMMUFD 위에서 통합'은 1차 자료 미확인.
- 136행 swiotlb 설명에 confidential VM bounce 용도가 없다. 출처 없이 감점하지 않음.

병합 대상: 병합 대상 없음(글 전체 기준). ch2 157·202행, ch10 186행, ch12 17·231행, ch13 215행, ch19 13·103행이 이 글로 IOMMU·ATS·PRI·PASID 설명을 넘기므로 시리즈 안 독립 역할이 있다. 다음 조치는 보강이다: IOMMU Group·ACS(78~86행)는 ch12 108~121행과 한 곳으로 모으고, `dma_map_sg`·`dma_mapping_error`·`dma_sync_*` 코드를 추가해 part8-04와 구별되는 PCIe 드라이버 관점을 세우고, ATS Cap ID·PASID 폭·IOMMUFD 도입 버전·방향별 cache 동작을 커널 소스·spec과 대조해 출처를 단다.

### `chapter12-virtualization-1.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log --follow(0a9dd7bc slug 고정, be973200 topic 메타데이터, bd3aed87 Ch 2-18 확장·게이트와 빌드 통과만 기록, 077d5525 링크 경로 수정, f5225bb5 rename·재구성)에 VFIO ioctl 순서·VF BDF·ACS 비트·reset 종류를 PCIe Base Spec·Linux drivers/vfio·DPDK 문서와 대조한 커밋이 없다. 로컬 Linux clone이 없어 1차 자료를 열지 못했고 내부 모순도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | SR-IOV PF/VF 표(23~28행), VFIO 4계층 표(63~68행), ACS 비트 표(112~117행), DPDK·SPDK 요소 표(127~133·152~157행)는 용어 정의 목록이다. 글의 해석은 SR-IOV와 mdev의 isolation·flexibility 대비(180행), FLR 미지원 시 secondary bus reset이 같은 bus의 다른 device에 영향을 준다는 설명(190행) 정도다. 159행 '큰 우위', 196행 '데이터시트 확인 필요', 204행 '확인'은 일반 표현이다. |
| B | 9 | SR-IOV → VFIO → QEMU → ACS → DPDK → SPDK → mdev → reset → 함정 → 정리로 끝까지 가지만 절마다 표 하나와 한두 줄이다. VFIO 코드(70~77행)는 GET_DEVICE_FD에서 끝나고 BAR mmap·DMA 매핑은 79행에서 말로만 언급한다. SPDK 절(148~159행)에는 명령·코드가 없다. 186행은 헤더(184행) 2칸에 3칸이다. ARI 전제, IOMMU 활성 커널 파라미터가 빠졌다. B ≤ 13 상한도 걸린다. |
| C | 6 | sriov_numvfs(33~41행), qemu vfio-pci(99~101행), dpdk-devbind·nr_hugepages·l3fwd(137~143행) 명령은 있으나 커널·QEMU·DPDK 버전, 대상 NIC, 예상 출력이 없다. 37~40행 VF BDF 예는 First VF Offset·VF Stride 전제를 밝히지 않는다. 44행 '64+ VF', 159행 '큰 우위'는 출처·환경 없는 수치·비교라 C ≤ 8. |
| D | 8 | 72~76행 VFIO open/ioctl 순서가 modern-recipes/part7-11-uio-vfio.md 122~128행과 같은 호출·순서이고 137·143행 dpdk-devbind·l3fwd가 part7-11 157~158행과 거의 같다. ACS 절(110~121행)과 206~208행이 chapter11 76~86행, chapter19 56~74행, chapter16 88~100행과 같은 설명이다. 44행은 chapter04 122행과 같은 문장이다. sriov_numvfs(34행), SR-IOV vs mdev(173~180행), reset 표(184~190행)는 qemu-fpga-driver ch11 37·68~79행, ch10 106~113행(draft)과 같다. PF/VF 제약 표(48~55행)만 다른 글에 없고 chapter13이 이 글을 전제로 한다. |
| E | 6 | 제목의 Pass-through·SR-IOV·VFIO·DPDK·SPDK와 description의 ACS·FLR이 모두 절로 있다(19·59·81·108·123·148·182행). SPDK는 표와 두 문장(150~159행)뿐이고 독자가 얻는 결과가 정해져 있지 않다. |
| F | 6 | 226행 다음 편은 seriesOrder 13 chapter13-virtualization-2.md 2행 제목과 일치한다. 230행 Ch 4 'VF BAR stride'(chapter04 111~120행), 231행 Ch 11 'IOMMU group·ATS'(chapter11 76·88행)도 맞고 236행 앵커는 chapter01 176행에 있다. 17행이 Ch 11 전제를 밝힌다. 83~95행은 흐름도를 ```text 블록에 그린 ASCII 다이어그램(§6 위반 후보)이고 184~188행 표가 칸 수 불일치로 깨진다. |
| G | 1 | 본문에 주장과 연결된 1차 출처 링크가 없다. 234~236행은 Ch 1 footer 위임이다. 커널·QEMU·DPDK·SPDK 버전과 대상 NIC/NVMe 모델이 없고 200행 `vfio_iommu_type1_dma_map`, 159행 벤더 목록, 169행 vfio-user 채택 주장도 출처가 없다. 앵커 part6-09(G 1)와 같은 수준. |

uncertainties:
- 44행 'one NIC이 64+ VF로 분할': chapter14 188행은 NumVFs > 7이면 ARI가 필요하다는데 이 글에는 ARI 전제가 없다.
- 37~40행: PF 01:00.0의 VF가 01:10.0부터 등록된다는 예는 First VF Offset·VF Stride에 따라 달라진다. 특정 device 출력인지 미확인.
- 53행 'VF Reset은 FLR만', 54행 'PF의 ACS 정책 적용', 212행 'PF 비활성하면 모든 VF 동작 안 함'은 PCIe Base Spec SR-IOV 장으로 확인하지 않았다.
- 200행 `vfio_iommu_type1_dma_map`을 권한 검증 지점처럼 쓰지만 part7-11 141행은 같은 이름을 uapi struct로 쓴다. drivers/vfio/vfio_iommu_type1.c로 확인하지 못했다.
- 137행은 01:00.0 하나만 vfio-pci에 bind하는데 143행 l3fwd는 portmask 0x3과 port 1 config를 준다. DPDK 문서를 열지 않은 기억 기반이라 오류로 올리지 않았다.
- 159행 Lightbits·Pavilion·NetApp이 SPDK 기반이라는 주장, 169행 'vfio-user를 SPDK가 활발 채택'은 출처 없음.
- 186행 reset 표 셋째 칸 '우선'이 렌더에서 사라지는지 빌드 HTML로 확인하지 않았다.

병합 대상: 병합 대상 없음(글 전체 기준). VFIO·DPDK 절(59~79·123~146행)은 modern-recipes/part7-11-uio-vfio.md 122~158행과 코드·명령이 거의 같고, ACS 절(108~121행)은 chapter11 76~86행·chapter19 56~74행과 겹친다. qemu-fpga-driver ch10·ch11은 draft라 지금 병합 대상이 아니다. 다음 조치는 보강(차별화)이다: VFIO 사용 코드는 part7-11로 링크하고 줄이며, ACS는 chapter11·19로 넘기고, SR-IOV 활성 조건(ARI, First VF Offset·VF Stride, TotalVFs 한계)과 VF 할당·FLR 흐름을 PCIe Base Spec SR-IOV 장, Linux Documentation/PCI/pci-iov-howto, drivers/vfio 출처와 버전을 붙여 채운다. qemu-fpga-driver를 발행할 때 ch10·ch11과의 역할 구분을 다시 본다.

### `chapter13-virtualization-2.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(bd3aed87 Ch 13-14 신규 작성, 'Passes publish gate'만 기록, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 spec·datasheet·upstream과 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 내부 모순도 찾지 못했다(124행과 205행 PRI dirty tracking은 서로 일치, 159행 IDE 첫 상용과 197행 TDISP 서술도 직접 충돌은 아님).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 본문 대부분이 용어·한 줄 설명 표다(23~34·38~41·49~61·78~94·100~103·122~126·134~169행). vIOMMU 구현 4종(31~34행), VirtIO device 목록(87~94행)은 정의 나열이고 선택 기준이 없다. 이 글만의 관점은 SR-IOV 대 S-IOV 비교 표(49~55행), 'IDE만으로 부족, 3개 모두 필요'(193행), vDPA가 live migration에 유리한 이유 한 문장(128행) 정도다. 43행 '완전 가상화', 114행 '장점 결합', 185행 'bare-metal에 근접'은 근거 없는 단정이다. |
| B | 8 | vIOMMU→2-stage→S-IOV→VirtIO→vDPA→live migration→Confidential I/O→실수→정리 흐름(19~207행)은 있으나 절마다 표 하나와 한두 문장이다. 2-stage translation(36~43행)은 IOTLB·성능 비용이 없고, live migration(116~128행)은 표 3줄로 끝난다. TDISP(161~171행)는 5단계 표뿐이고 CMA-SPDM(173~175행)은 한 문장이다. B ≤ 13 상한도 걸린다. 앵커 part6-09(B 8)과 비슷하다. |
| C | 4 | 명령 예는 accel-config WQ 구성(65~72행)과 vhost-vdpa 바인딩(107~112행) 두 개인데 커널·accel-config 버전·하드웨어가 없고 예상 출력도 없다. 110행 '<hw-id>', 111행 '-device virtio-net,netdev=type=vhost-vdpa,...'는 placeholder라 그대로 실행할 수 없다. 53행 '64~256 VF', 197행 '2027~2028' 등 수치에 출처가 없어 C ≤ 8. |
| D | 10 | 비교: 같은 시리즈 chapter12, chapter14, chapter11, 다른 시리즈 cxl/chapter14-security.md, embedded-security/chapter11-pcie-cxl-ide.md·chapter12-spdm-cma.md·chapter13-cxl-tee.md(모두 공개). 60행 'Mediated VFIO'는 ch12 171~180행 mdev 절과, 124행 PRI는 ch11 99~109행과 겹친다. Confidential I/O 절(130~175행)은 embedded-security ch11 41~50행(Link vs Selective IDE, spec 절 인용), ch13 83~85행(TSM 구현)이 더 깊다. vIOMMU·S-IOV·VirtIO·vDPA(19~128행)는 공개 글 중 이 글에만 있다. ch14는 겹치지 않는다. |
| E | 6 | 제목(2행)의 vIOMMU·Scalable IOV·VirtIO·IDE·TDISP와 description(5행)의 vDPA·live migration·CMA-SPDM이 19·45·74·96·116·148·161·173행 절로 모두 나온다. TDISP(161~171행)와 CMA-SPDM(173~175행)은 표 하나·한 문장이라 부분 미이행이다. |
| F | 7 | 211행 다음 편 'Ch 14: Linux Operations'는 seriesOrder 14 chapter14-linux-operations.md와 맞다. 215행 Ch 11, 216행 Ch 12, 217행 CXL Ch 14 라벨이 대상 title과 일치하고 221행 앵커는 chapter01 176행에 있다. 17행이 Ch 12 전제를 밝힌다. IDE·TDISP를 더 깊게 다룬 embedded-security ch11~13 링크가 없다. |
| G | 2 | 본문 출처는 175행 'DMTF DSP0274', 80행 'VirtIO 1.x … (OASIS)', 63행 `drivers/dma/idxd/` 경로뿐이고 링크·판·커널 버전이 없다. 159·197·207행 NVIDIA H100 CC·AMD MI300A 사례에 출처가 없다. 221행은 Ch 1 footer 위임이다. |

uncertainties:
- 124·205행 'Dirty page tracking (PRI)': ch11 99~109행은 PRI를 page fault 요청으로 설명한다. PCIe spec·VFIO migration 문서로 확인하지 않았다.
- 159·197·207행 'NVIDIA H100 CC가 IDE 첫 상용 사례', 'AMD MI300A도 IDE 지원': 출처 없음.
- 171행 'Intel TDX-IO·AMD SEV-TIO·ARM CCA-IO의 공통 spec': embedded-security ch13 85행은 'Intel TDX Connect'라는 명칭을 쓰고 mainline 구현은 AMD SEV-TIO뿐이라 적는다.
- 163~169행 TDISP 단계 순서를 TDISP ECN으로 확인하지 않았다.
- 154·157행 Selective IDE '특정 TLP만 암호화', 'Stream cipher': embedded-security ch11 47~48행은 RID·주소 범위 기반 stream으로 설명한다. spec 미대조.
- 53행 SR-IOV 'Scale 64~256 VF'는 TotalVFs 필드 상한과 다를 수 있다.
- 63·181행 'Intel IDXD가 S-IOV 첫 상용 사례', 70행 '--pasid-enable' 옵션 존재: accel-config 문서·idxd upstream 미확인.
- 111행 QEMU 옵션 형식이 QEMU 문서의 -netdev type=vhost-vdpa 형식과 다르게 보인다.
- 17·130·197행 '2025~2026의 차세대', '2026의 새 영역', '2027~2028': 날짜 앵커·예측 문장, audit:staleness 대상 후보.

병합 대상: 부분 병합 후보로 Confidential I/O 절(130~175행)을 embedded-security/chapter11-pcie-cxl-ide.md·chapter12-spdm-cma.md·chapter13-cxl-tee.md와 cxl/chapter14-security.md로 넘겨 요약 몇 줄과 링크로 줄인다. 글 전체를 합칠 대상은 없다. vIOMMU·S-IOV·VirtIO·vDPA(19~128행)는 공개 글 중 이 글에만 있어 다음 조치는 보강이다: VirtIO spec·S-IOV spec·Linux idxd·vdpa 소스·accel-config·QEMU 문서와 대조, 명령 예에 환경·예상 출력 추가, 110·111행 placeholder 정리, 124행 PRI 용어 정리.

### `chapter14-linux-operations.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. (1) 120행 한 문장 안에서 "기존: *8-bit function (8 function/device)*"와 "ARI: *전체 8-bit를 function*으로 — *256 function/device*"를 함께 쓴다. 같은 8-bit 필드가 8개와 256개를 동시에 낼 수 없어 산술이 성립하지 않는다(기존 field 폭 표기가 틀린 쪽). (2) 보조 근거: ARI가 필요한 VF 수 문턱을 124행 "SR-IOV with N>8 VF | ARI 필수"와 146행 "ARI 필요 (>8)"는 8 초과로, 188행 "NumVFs > 7에 ARI 필요"와 200행 "NumVFs > 7 필수"는 7 초과로 적었다. 문턱 표현 차이일 수 있어 보조로만 둔다. git log(bd3aed87 신규 작성·게이트와 빌드 통과만 기록, be973200 topic 메타데이터, 0a9dd7bc URL 고정, 3232b1be 태그 정규화)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 본문 대부분이 Hot-plug 종류·드라이버(21~30행), Slot register(36~40행), 추가 시퀀스(46~54행), callback·return 값(71~85행), EEH(134~138행)를 짧은 표로 나열한 것이다. 이 글만의 것은 DPC·AER 결합 표(109~114행), ARI·SR-IOV 결합(144~148행), pciehp·SR-IOV 상호작용(154~158행), 자주 하는 실수 다섯 개(174~192행)인데 모두 한두 문장이다. 56행 '보통 수백 ms ~ 수 s', 150행 'NIC vendor가 ARI 활성 펌웨어 권장'은 출처 없는 일반론이다. |
| B | 8 | 제목의 네 주제와 EEH를 모두 건드리지만 절마다 표 하나와 한 문장이다. 87~102행 코드는 my_slot_reset 안에서 선언하지 않은 dev를 쓰고(100행) pci_error_handlers 등록·mmio_enabled·resume 구현이 없다. 112행 '같은 port의 모든 device 영향 \| 보통 DPC는 단일 device port에 적용'은 시나리오와 동작 칸이 맞지 않는다. 15행은 '4-callback chain'이라며 세 개만 들고 198행에서야 네 개를 든다. 내부 모순이 열려 있어 B ≤ 13. |
| C | 4 | 실행 가능한 것은 42행 `lspci -vv \| grep -A 5 "SltCap"`, 128행 `lspci -vv \| grep "ARI Cap"` 두 명령뿐이고 예상 출력·커널 버전·플랫폼이 없다. 56행 수치는 출처·환경 없어 C ≤ 8. 116행 '`dpcgo`·debug script로 manual trigger 가능'은 절차가 없다. 87~102행 코드는 100행 dev 미선언으로 그대로 컴파일되지 않는다(AP-C-35). |
| D | 10 | 비교: 같은 시리즈 chapter07, chapter10, chapter13, chapter15, chapter16, 다른 시리즈 cxl/chapter11-linux-driver.md. 71~76행 callback 표와 87~102행 코드는 Ch 7 82~105행과 같은 내용이고, 130~140행 EEH는 Ch 7 143~145행과 같다. 176행 'BIOS에서 Hot-plug enable 별도'는 Ch 16 102~111행 시나리오 7과 겹친다. Ch 10 138~150행 portdrv는 165행과 이어질 뿐이고 CXL Ch 11 211~220행은 역할이 다르다. 17행이 Ch 7=개념, 이 글=운영이라 밝히고 hot-plug 시퀀스·ARI·pciehp/SR-IOV 절은 고유하다. |
| E | 6 | title(2행)의 Hot-plug·AER Recovery·DPC·ARI와 description(5행) 키워드가 19~65, 67~103, 105~116, 118~128·142~148, 130~140행 절로 대응한다. 'Linux Operations'가 약속하는 운영 절차는 42·128행 grep 두 줄뿐이고, description의 'ARI 256+ function'은 본문 15·120·200행의 '256 function/device'와 맞지 않는다. |
| F | 4 | 206행 다음 편 Ch 15 Tools는 chapter15-tools.md seriesOrder 15와 맞다. 210행 Ch 7, 211행 Ch 10 'pcie-portdrv'(Ch 10 138~150행)는 맞지만 212행 Ch 12 'SR-IOV·ARI'는 chapter12에 ARI가 한 번도 나오지 않아(grep -w ARI 0건) 라벨이 대상과 다르다 → F ≤ 5. 21~24행 표는 헤더 2열인데 24행이 3칸이라 'enterprise blade·CXL device'가 렌더에서 빠진다. 전제 지식 안내는 17행 Ch 7 언급뿐이다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 116행 `drivers/pci/pcie/dpc.c` 경로만 있고 커널 버전이 없다. PCIe Base Spec 판·절, 커널 Documentation(PCI/pci-error-recovery 등) 인용이 없다. 216행은 Ch 1 footer 위임이다. |

uncertainties:
- 116행 `dpcgo` 도구의 존재 미확인(Ch 15 173행은 `drivers/pci/pcie/dpc-test.c`라고 다르게 적음, 이 경로도 미확인).
- 125행 'NVMe multi-controller ARI로 128 controller'는 출처 없는 수치.
- 157행 'Hot-plug 진행 중 SR-IOV 활성 — atomicity 보장, pciehp lock'을 커널 소스로 확인하지 않았다.
- 180행 'pci_error_handlers 등록 안 한 driver는 … device offline 또는 OS panic' 동작을 drivers/pci/pcie/err.c로 확인하지 않았다.
- 192행 'NVMe는 transfer 진행 중 surprise removal도 안전' 근거 없음.
- 140행 'POWER는 EEH + AER'의 AER 병용 여부 미확인.
- 124행 'N>8 필수'와 188행 'NumVFs > 7 필요'의 실제 문턱은 PCIe Base Spec ARI 절로 확인 필요.
- 63·164~168행 surprise removal 경로와 pciehp 실제 처리 경로 일치 여부 미확인.

점수 구간 메모(병합 검토 구간): 병합 대상 후보는 chapter07-error-handling.md(71~102·130~140행의 callback 표·코드·EEH가 Ch 7 82~105·143~145행과 중복)다. hot-plug 시퀀스·ARI·pciehp/SR-IOV 절은 Ch 7에 없는 독립 주제라 다음 조치는 보강이다: 120행 기존 field 폭과 VF 문턱(>7 대 >8)을 PCIe Base Spec ARI 절로 바로잡고, 중복된 callback 표·EEH는 Ch 7로 링크하고 그 자리를 운영 절차(sysfs·dmesg 관찰, 커널 버전)로 채우며, 212행 라벨을 고친다.

### `chapter15-tools.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(f5225bb5 18편 재구성·rename, 077d5525 깨진 링크 수정, bd3aed87 Ch 2-18 확장, be973200 topic metadata, 0a9dd7bc slug 고정)에 lspci 옵션·setpci 값·sysfs/debugfs 경로·aer_inject 사용법을 pciutils man page·PCIe Base Spec·Linux drivers/pci와 대조한 커밋이 없다. 재검토에서도 1차 자료를 열지 못했다(man lspci 없음, 로컬 upstream clone 없음). 129~135행 debugfs AER 경로는 chapter16 평가에서 ABI 문서와 다르다고 확인됐지만, 이 글의 판정은 이 글을 평가하며 연 자료로만 내므로 미검증으로 두고 uncertainties와 다음 조치에 넘긴다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | lspci 옵션 표(23~34행), setpci 표(65~69행), sysfs 표(100~112행), debugfs 표(129~135행), dmesg 패턴 표(141~148행)는 옵션·경로 목록이다. 작성자 해석은 lspci -vv에서 볼 곳 세 줄(56~59행)과 '자주 하는 실수' 다섯 항목(209~227행) 정도다. 82행 'race 가능. 디버깅·연구용', 223행 '통계적 RAS 누적 → analyzer trigger가 일반 워크플로'는 근거 없는 단정이다. 앵커 part7-05(9)와 같은 수준. |
| B | 8 | 도구마다 표 하나와 한두 줄 설명이 반복되고 흐름을 묶는 것은 15행 요약, 결정 트리(196~203행), 정리(231~237행)뿐이다. 76·79행 setpci 예는 어떤 비트를 왜 쓰는지 설명이 없다. 156~169행 aer-inject는 커널 config·권한 전제가 없고 173행 dpc-test는 한 줄이다. 177~184행 analyzer 표는 '분야' 열에 성격이 다른 값을 섞었다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 복사해 쓸 수 있는 명령(71~80, 88~94, 114~123, 150~152, 160~169행)은 있으나 커널·pciutils 버전·장치가 없다. 기대 출력은 38~54행 lspci 예시 하나이고 '...'로 잘려 실제 캡처인지 알 수 없다. 184행 'Cost 수천만 원'은 출처 없는 수치라 C ≤ 8. 성공·실패 관찰을 가르는 검증 절차가 없다. |
| D | 8 | 같은 시리즈: chapter10 106~123행 sysfs 표가 이 글 100~110행 항목을 거의 그대로 갖고 있고 이 글이 더한 것은 power/control·power/wakeup(111~112행)뿐이다. Ch10 168행 'manual setpci는 device hang 위험'도 209~211행과 같다. chapter16 164~173행 결정 트리와 시나리오 1단계(37·51·118·132행)가 196~203행과 겹친다. chapter17 50행이 76행과 같은 'setpci … CAP_EXP+8.W=0x2810 # MaxPayload 256'을 반복한다. chapter14는 206행에서 이 글로 넘겨 역할이 갈린다. 다른 시리즈 tools/debugging/embedded/chapter08-cxl-link-debug.md 64~96행은 CXL 링크 진단이라 질문이 다르다. |
| E | 6 | 제목 키워드 lspci(19~59행), setpci(61~82행), pcimem(84~96행), protocol analyzer(175~184행)와 description의 debugfs(125~137행)가 모두 있다. protocol analyzer는 표 네 행과 한 문장뿐이고, description의 'lspci 전체 옵션'은 23~34행 10개 옵션뿐이라 과장이다. |
| F | 6 | 241행 다음 편 Ch 16은 seriesOrder 16 chapter16-troubleshooting.md와 맞다. 관련 항목 245행 Ch3, 246행 Ch7, 247행 Ch16, 248행 Ch18(Device Control 비트 표 128~140행) 모두 라벨과 대상이 일치한다. 205행 결정 트리에서 Ch16으로 넘기는 것도 맞다. 17행 '[Ch 1~14]' 링크는 Ch1로만 가고 전제 지식 안내가 없으며 15·82·96·154·184행처럼 기울임 조각 문장이 많아 흐름이 끊긴다. |
| G | 2 | 본문 출처는 86행 pcimem 저장소 URL, 158행 drivers/pci/pcie/aer_inject.c, 173행 drivers/pci/pcie/dpc-test.c 경로뿐이고 커널·pciutils 버전·대조 날짜가 없다. PCIe Base Spec 절, lspci man page, 커널 Documentation/PCI 링크도 없다. 252행은 Ch1 footer 위임이다. 앵커 part7-05(2)와 같은 수준. |

uncertainties:
- 28~30행 -x '256 byte', -xxx '4 KB', -xxxx '4 KB + capability 분해': 기억으로는 -x 64바이트, -xxx 256바이트, -xxxx 4096바이트이고 capability 분해 옵션이 아니다. man page를 열지 못했다.
- 76행 주석 'MaxPayload 256'과 값 0x2810이 어긋난다. Ch18 133행 인코딩으로 보면 0x2810은 MPS 128B, MRRS 512B다. 이 글을 평가하며 1차 자료를 열지 않았으므로 오류 확인으로 올리지 않았다. chapter17 50행의 같은 값은 pci_regs.h로 오류 확인됐다.
- 79행 ECAP_AER+18.L=0x00000007을 'AER capability enable'로 설명. 오프셋 0x18 레지스터 비트 의미·쓰기 가능 여부 미확인.
- 131~135행 aer_dev_correctable/fatal/nonfatal을 debugfs 아래에 두었다. chapter16 평가에서 연 ABI 문서는 sysfs `/sys/bus/pci/devices/<dev>/` 아래에 둔다. debugfs pci/<BDF>/dpc 항목 존재도 미확인.
- 165행 aer_inject를 /sys/kernel/debug/pci/aer_inject에 echo로 쓴다고 적었다. 기억으로는 /dev/aer_inject 문자 장치와 aer-inject 사용자 도구. 미확인.
- 173행 drivers/pci/pcie/dpc-test.c 존재 미확인.
- 182행 'pcie-tlp-injector', 192행 'mlnx_perf·intel_iommu_dump' 실존 미확인.
- 184행 'Cost 수천만 원' 출처 없음.
- 215행 VFIO 장치에서 lspci -vv 제한, 219행 'AER.*MaskSta' grep 패턴(lspci는 UEMsk/CEMsk 표기로 기억) 미확인.
- 147~148행 'Link is up/down' 메시지를 LTSSM L0 진입·이탈과 1:1로 대응시킨 것 미확인.

병합 대상: 부분 병합 후보로 sysfs 표(98~123행)는 `src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md` 106~123행으로, 결정 트리(194~205행)는 `src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md` 164~173행으로 합칠 수 있다. 'PCIe 디버깅 도구 사용법'이라는 독립 검색 의도가 있어 글 전체 병합은 하지 않는다. 다음 조치는 보강이다: 겹치는 표는 Ch10·Ch16 링크로 줄이고, 76행 setpci 값을 Device Control 레지스터로 대조해 비트 계산을 쓰고(chapter17 50행과 함께), 129~135행 AER 경로를 ABI 문서 기준으로 고치고, 환경을 밝힌 실제 lspci -vv 캡처와 aer-inject 전제를 채운다.

### `chapter16-troubleshooting.md` — 41점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료를 직접 열어 충돌을 확인한 2건. (1) 96행 'ACS bits 비활성화 | `pci=force_floppy_to_high_dma=Off`' — torvalds/linux master(24a19b95) `Documentation/admin-guide/kernel-parameters.txt`의 pci= 옵션 목록(5038행~)에 이 옵션이 없고 ACS 관련 옵션은 5255행 `disable_acs_redir=`, 5264행 `config_acs=`뿐이다. (2) 63·171·200행 AER 카운터 경로 `/sys/kernel/debug/pci/<BDF>/aer_dev_correctable`·`aer_*` — 같은 커밋의 `Documentation/ABI/testing/sysfs-bus-pci-devices-aer` 12·33·63행은 `aer_dev_correctable`·`aer_dev_fatal`·`aer_dev_nonfatal`을 `/sys/bus/pci/devices/<dev>/` 아래에 둔다. git log(f5225bb5 재구성, 077d5525 링크 수정, bd3aed87 내용 확장·게이트 통과, be973200 topics, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 10개 시나리오(19~153행)를 '증상·1단계·원인→해결'로 묶은 구성은 이 글 고유지만 칸이 대부분 2~5단어다(44행 'PCB·card 결함 \| RMA', 149행 'PSU 자체 부족 \| 더 큰 PSU'). 원인이 여럿일 때 어느 관찰로 가르는지, 실제 로그·사례가 없다. 72행 'frequent CE는 임박 fault 신호', 153행 'GPU·HPC accelerator에서 흔함'은 근거 없는 일반론이다. |
| B | 8 | 시나리오 10개와 결정 트리(164~173행), 실수 절(175~195행)로 흐름은 있으나 각 시나리오가 원인 후보 목록으로 끝나고 진단 명령의 정상·비정상 출력이 없다. 129행 제목·5행 description의 'lane reversal'은 134~139행 표에 내용이 없다. 96행 존재하지 않는 커널 파라미터, 63·171행 잘못된 AER 경로가 확인되어 B ≤ 13 아래에서 5~9 구간이다. |
| C | 4 | 명령은 31행 rescan, 63행 aer 카운터, 111행 modprobe pciehp, 118행 MaxPayload grep 등이 있지만 커널 버전·플랫폼·예상 출력이 없다. 63·171행 경로는 ABI 문서와 다르고 96행 파라미터는 kernel-parameters.txt에 없어 핵심 진단 두 곳(CE storm·IOMMU group)이 따라 하면 실패한다. 23행 `grep -i "pci\|link"`는 -E 없이 BRE라 의도대로 매치되지 않을 수 있다(170행은 -E 사용). 122행 'default 128'은 출처 없음. |
| D | 9 | 비교: 같은 시리즈 chapter15, chapter17, chapter12, chapter14, 다른 시리즈 tools/debugging/embedded/chapter08-cxl-link-debug.md. 164~173행 결정 트리와 105·118행 1단계 명령이 Ch15 194~203행의 `dmesg \| grep pciehp`·MaxPayload·MaxReadReq `lspci -vv` grep와 문자 그대로 같다. 63행 AER 경로는 Ch15 129~135행 debugfs 표와 같다. 88~100행 ACS·override는 Ch12 119~121행, 109~110행 Hot-Plug Capable·BIOS enable은 Ch14 176행, 122·124행 MPS·ASPM은 Ch17 33~40·141~150행과 겹친다. 증상 중심 케이스북 역할은 구별된다. |
| E | 5 | 2행 '실무 시나리오북'은 실무 진단을 약속하나 본문은 원인 목록 표 수준이고 사례·로그가 없다. 5행 description의 10개 키워드 중 'lane reversal'은 129행 제목에만 있고 내용이 없다. |
| F | 5 | 207행 다음 편 Ch 17은 seriesOrder 17 chapter17-performance.md와 맞고 211~214행 관련 항목 라벨도 대상 제목(Ch7·Ch14·Ch15)과 맞다. 그러나 시나리오마다 있는 '증상/1단계' 표 10곳(21~23, 36~38, 50~51, 62~63, 76~77, 90~91, 104~105, 117~118, 131~132, 143~144행)에 구분선 행이 없어 GFM 표로 렌더되지 않는다. 169·170행은 코드 스팬 안 `\|`가 셀을 나눈다. 글 고유 안내는 17행 Ch15 연결뿐. |
| G | 1 | 본문에 주장과 묶인 1차 출처·버전이 없다. 216~218행은 Ch 1 footer 위임이다. 커널 버전, sysfs/debugfs 경로의 기준 문서(Documentation/ABI), PCIe Base Spec 절 번호가 없다. |

uncertainties:
- 23행 `dmesg | grep -i "pci|link"`: GNU grep BRE에서는 `|`가 리터럴이라 alternation이 되지 않는다고 보지만 실행 확인은 하지 않았다.
- debugfs `/sys/kernel/debug/pci/`에 config·devices·dpc 같은 항목이 있는지(Ch15 129~135행 표 전체)는 커널 소스로 확인하지 못했다. AER 카운터 위치만 ABI 문서로 확인했다.
- 70행 'Replay Timer 조정', 83행 'PRI handler 결함', 86행 'FLR → secondary bus reset → power cycle' 순서, 122행 'default 128'의 근거 미확인.
- 표 구분선 누락 10곳의 실제 렌더 결과는 빌드 HTML로 보지 않았다(GFM 규칙으로 판단).
- 다른 시리즈 비교(chapter08-cxl-link-debug.md 70~74·104행)는 평가자 인용을 따랐고 직접 열지 않았다.

점수 구간 메모(병합 검토 구간): 오류 확인으로 우선 조치가 먼저다. 96행을 kernel-parameters.txt 기준(`pci=disable_acs_redir=`/`config_acs=`, ACS 강제 해제가 격리를 약화시킨다는 점 포함)으로 고치거나 지우고, 63·171·200행 AER 경로를 `/sys/bus/pci/devices/<BDF>/aer_dev_*`로 고친다(Ch15 129~135행도 같이). 병합 대상 후보는 chapter15-tools.md 194~203행 결정 트리와의 중복이며 Ch15 쪽 트리를 이 글 링크로 줄이는 방향이 낫다. 'PCIe 트러블슈팅'은 독립 검색 의도가 있어 다음 조치는 보강이다: 시나리오별 판별 관찰(정상·비정상 lspci/dmesg 출력), 커널 버전·ABI 출처, lane reversal 내용, 표 구분선 10곳 복구.

### `chapter17-performance.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료: 로컬 linux clone의 `include/uapi/linux/pci_regs.h` 512행 PCI_EXP_DEVCTL 0x08, 517행 RELAX_EN 0x0010, 518행 PAYLOAD 0x00e0, 519행 PAYLOAD_128B 0x0000, 520행 PAYLOAD_256B 0x0020, 528행 NOSNOOP_EN 0x0800, 529행 READRQ 0x7000, 532행 READRQ_512B 0x2000, 535행 READRQ_4096B 0x5000. 이 글 50행 `setpci -s 01:00.0 CAP_EXP+8.W=0x2810  # MaxPayload 256`은 0x2810 & 0x00e0 = 0이라 MPS 필드가 128 byte이고, 0x2810 & 0x7000 = 0x2000이라 실제로 바뀌는 것은 MRRS 512 byte다. 주석 'MaxPayload 256'과 값이 맞지 않는다. 69행 0x5810(MRRS 4096)은 자료와 맞는다. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, bd3aed87 내용 확장, 077d5525 링크 수정, f5225bb5 재구성)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Gen별 BW 표(21~27행), MPS overhead 표(35~41행), Posted/Non-Posted 표(121~126행), RO·NS 표(134~137행)는 입문 자료 수준의 표준 목록이다. 이 글만의 해석은 43행 '최소값으로 협상', 72행 MPS/MRRS 구분, 189~207행 자주 하는 실수 다섯 개 정도이고 각각 한두 줄이다. 15행 '1.5~3배', 31행 '70~90%', 107행 '5~30% 손실', 173행 '200~300 ns 절감'은 출처·환경 없는 주장이다. 195행 'workload 따라 다른 optimum'으로 선택 기준이 일반론에서 끝난다. |
| B | 9 | BW → MPS → MRRS → latency → coalescing → NUMA → Posted 비율 → RO/NS → ASPM → P2P → DDIO → 측정 도구 → 실수 → 정리로 항목은 갖췄으나 절마다 표 하나와 한두 문장이다. 86행 latency 공식은 수치 대입이 없고 213행 정리에서 '2 ×'가 빠졌다. 162행 p2pdma 경로가 '...'로 생략됐다. 177~185행 측정 도구 표는 이름만 있다. 57행 MRRS 정의, 15행 1.5~3배 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 45~51·64~70·109~115행 명령과 98행 ethtool 예가 있으나 실행 환경·예상 출력이 없다. 50행 setpci 값은 pci_regs.h 기준 MPS 256이 아니라 MRRS 512를 설정해 따라 하면 글과 다른 결과가 난다. 15·31·107·173행 수치에 출처·환경이 없어 C ≤ 8. 관찰 가능한 검증 절차가 없다. |
| D | 9 | 같은 시리즈: Ch 16 `chapter16-troubleshooting.md` 116~129행 '시나리오 8 — 성능 미달' 표(MaxPayload·MaxReadReq·ASPM L1·NUMA·coalescing)가 이 글 33~117·141~150행 tuning 항목과 같은 목록이다. Ch 15 `chapter15-tools.md` 75~76행이 50행과 같은 값·같은 오류다. Ch 2 `chapter02-tlp.md` 108~115행 NS·RO Attribute 표가 130~137행과 같은 내용이다. Ch 18은 reference 역할이라 겹침이 적다. 다른 시리즈 CXL `chapter15-ras-performance.md`, Embedded Performance Engineering `part3-07-mmio.md`는 관점이 다르고 NVMe `chapter15-performance.md`는 평가자 기준 draft로 제외했다. |
| E | 6 | 제목 'Performance — Bandwidth·Latency·Tuning'과 description(5행) 키워드가 19~173행에 절로 모두 있다. 'Tuning'은 측정 → 변경 → 재측정 흐름 없이 50·69·98·114행 명령 한 줄씩이고, 'latency breakdown'은 86행 공식에 수치 대입이 없다. |
| F | 5 | 17행 Ch 16 이전 맥락, 222행 다음 편 Ch 18은 seriesOrder 18 `chapter18-register-maps.md`와 맞다. 226행 Ch 1, 227행 Ch 2(108~115행), 228행 Ch 6 ASPM 라벨은 맞다. 229행 'Ch 11: DMA·IOMMU — P2P DMA'는 `chapter11-linux-dma.md`에 p2p·peer가 한 번도 나오지 않아 라벨이 대상과 다르다 → F ≤ 5. 233행은 Ch 1 176행 앵커로 정상 연결. |
| G | 1 | 본문에 1차 출처 링크·판·절이 없다. 233행은 Ch 1 footer 위임이다. PCIe Base Spec 판, 커널 버전, Intel PCM·DDIO 문서, 측정 환경 표기가 없고 107·173행 수치에 출처가 없다. |

uncertainties:
- 57행 'MRRS = outbound Memory Read TLP의 max payload': Memory Read 요청 TLP에는 payload가 없고 MRRS는 요청 Length 상한이다. Base Spec 원문은 열지 않았다.
- 15행 'tuning이 throughput 1.5~3배': 35~41행 overhead 표(12.5% → 0.4%)만으로는 약 1.14배라 근거가 맞지 않는다.
- 86행 'Latency = 2 × (hop count × hop latency) + endpoint'와 213행 'hop count × hop latency + endpoint'가 다르다. 정리 쪽 축약으로 보여 오류 확인으로 올리지 않았다.
- 31·81~82·107·148·173행 수치는 출처·환경 없는 수치다.
- 26~27행 Gen 6·7 effective ~63·~126 Gb/s를 PCI-SIG 자료로 확인하지 않았다.
- 183행 'intel-pmu-tools'가 PCIe BW counter를 제공하는지, 117행 8-socket 예는 미확인.
- NVMe `chapter15-performance.md`의 draft 여부는 평가자 기록을 따랐고 직접 열지 않았다.
- pci_regs.h는 로컬 clone 시점 파일이다. Device Control 비트 배치는 spec 고정이라 버전 영향이 없다고 보았다.

점수 구간 메모(병합 검토 구간): 병합 대상 후보는 `src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md`(116~129행 성능 미달 시나리오)이나 성능 종합이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 먼저 50행 setpci 값을 pci_regs.h 기준으로 고치고(MPS 256 = 0x0020 비트를 세운 값, 예: 0x2830, 또는 주석을 MRRS 512로 정정) Ch 15 75~76행의 같은 오류도 함께 고친다. 이후 15·31·107·173행 수치에 출처·환경을 붙이거나 삭제/TBD 처리하고 229행 Ch 11 라벨을 고친다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)으로 PCIe Deep Dive 안에서 반복되는 문제다.

- 출처를 Ch 1 footer로 넘기는 '시리즈 자료 출처 안내' 절: 이번 10편 모두(ch08 179~181행, ch09 188행, ch10 195~197행, ch11 214행, ch12 234~236행, ch13 221행, ch14 216행, ch15 252행, ch16 216~218행, ch17 233행). footer(chapter01 176~183행)는 일반 자료 목록이라 글별 주장과 연결되지 않고, G가 10편 모두 1~2점이다. grep으로 보면 시리즈 19편 중 17편에 'Ch 1 footer' 문구가 있다.
- 1차 자료 대조 커밋 없음: 10편 모두 git log가 slug 고정·topic 메타·bd3aed87 Ch 2-18 일괄 확장(게이트·빌드 통과만 기록)·linter·날짜 정규화뿐이다. '검증됨' 0편, 오류 확인 4편(ch09·ch14·ch16·ch17). 시리즈 전체가 `/fact-check-round` 대상이다.
- 공통 H2 뼈대 '한 줄 요약 → 표 위주 절 → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목 → 시리즈 자료 출처 안내': ch08 13·136·158·168·172·179행, ch09 13·143·165·176·180·186행, ch11 13·168·190·200·204·212행, ch12 13·192·214·224·228·234행, ch13 13·177·199·209·213·219행, ch14 13·172·194·204·208·214행, ch15 13·207·229·239·243·250행, ch17 13·187·209·220·224·231행. 사이트 단위 scaled content 점검(9절 게이트)에 수치로 넘긴다.
- 표와 *기울임* 단편 위주 문체: ch08 15·30·42·55행, ch10 30·136·150행, ch11 15·40·97·120·143·172행, ch12 15·44·57·79·119·190행, ch15 15·82·96·154·184·211·215행. 절마다 표 하나와 한두 줄이라 A·B가 10편 모두 8~10점이다. §1·§2 톤 검사 대상.
- 링크 라벨이 대상과 다름: ch08 170행 다음 편 'Encoding'(Ch 9 실제 제목은 'SerDes'), ch14 212행 Ch 12 'SR-IOV·ARI'(Ch 12에 ARI 0건), ch17 229행 Ch 11 'P2P DMA'(Ch 11에 P2P 없음), ch19 103행 Ch 11 'TPH·ACS의 무대'(ch11 평가 때 확인). 시리즈 전체 관련 항목 라벨 대조가 필요하다.
- 허브 편수 표기: chapter01-fundamentals.md 17행은 시리즈를 '18편'이라 적지만 디렉터리에는 draft:false인 chapter01~19 19편이 있다(ch08·ch10·ch11·ch12·ch13·ch14·ch15·ch16·ch17 평가에서 기록). F 감점은 Ch 1 평가 때 반영한다.
- ACS·IOMMU group·ACS override 설명 중복: ch11 78~86행, ch12 108~121·206~208행, ch16 88~100행, ch19 56~74행(같은 `lspci … | grep ACS`). 한 곳으로 모으고 나머지는 링크로 바꾼다.
- lspci·sysfs 진단 표와 명령 중복: `lspci -vv | grep "LnkSta"`가 ch09 124행, ch15 199행, ch16 37·51·132·169행에, sysfs 표가 ch10 110~123행과 ch15 100~110행에, 결정 트리가 ch15 194~203행과 ch16 164~173행에 반복된다. 장 사이 역할 분담이 필요하다.
- 표 렌더 깨짐: ch12 184~188행(헤더 2칸에 3칸), ch14 21~24행(같은 문제), ch16 '증상/1단계' 표 10곳 구분선 누락과 169·170행 코드 스팬 안 `|`, ch15 199·202·203행 코드 스팬 안 `|`. `audit:reading`으로 빌드 HTML 확인 필요.
- 출처 없는 수치와 환경 없는 명령: 10편 모두 C가 3~6점이고 C ≤ 8 상한에 걸리는 수치(ch08 67행, ch09 50·98·135·159행, ch12 44행, ch13 53행, ch14 56행, ch15 184행, ch17 15·31·107·173행 등)가 있다. 커널·pciutils 버전과 예상 출력이 있는 글이 없다.

2편에 걸친 같은 오류(3편 미만이지만 같이 고쳐야 하는 것):

- `CAP_EXP+8.W=0x2810  # MaxPayload 256`: ch15 75~76행, ch17 50행. ch17에서 pci_regs.h로 오류 확인. known-falsehoods 등재 후보.
- debugfs AER 경로 `/sys/kernel/debug/pci/<BDF>/aer_dev_*`: ch15 129~135행, ch16 63·171·200행. ch16에서 ABI 문서로 오류 확인. known-falsehoods 등재 후보.

## 다음 조치

이 루프에서는 원문을 고치지 않았다. 아래는 다음 수정 루프의 순서다.

- 우선 조치 4편부터: ch16(96행 커널 파라미터, 63·171·200행 AER 경로), ch17(50행 setpci 값, Ch 15 75~76행 같이), ch14(120행 function 번호 폭, 124·146·188·200행 VF 문턱을 PCIe Base Spec ARI 절로 통일), ch09(26·48행 FC Init 위치를 spec으로 정리). 같은 오류가 있는 ch15 129~135행·75~76행도 함께 고친다.
- 오류 확인 2건(0x2810 'MaxPayload 256', debugfs `aer_dev_*` 경로)은 `data/known-falsehoods.yaml` 등재를 검토한다.
- 병합 검토 6편은 모두 '병합 대상 없음' 또는 부분 병합이고 다음 조치는 보강이다: ch13 Confidential I/O 절은 embedded-security ch11~13·cxl ch14로, ch15 sysfs 표·결정 트리는 ch10·ch16으로, ch12 VFIO·DPDK 코드는 modern-recipes part7-11로, ch08 FLIT 절은 ch01·cxl ch09로 줄인다.
- 시리즈 단위: PCIe Deep Dive 전체를 `/fact-check-round` 대상으로 올리고, 본문 주장마다 PCIe Base Spec 절·커널 버전·소스 경로를 붙인다. 관련 항목 라벨과 다음 편 라벨을 전 장에서 대조하고, chapter01 17행 '18편'을 고친다.
- 표 렌더 문제(ch12·ch14·ch15·ch16)와 ch12 83~95행 ASCII 흐름도는 `audit:reading`·`detect-ascii-diagrams.sh`로 확인한 뒤 수정 루프에 넣는다.
- `score_status`는 10편 모두 잠정이다. 수정 후 재평가 루프에서 확정한다.
