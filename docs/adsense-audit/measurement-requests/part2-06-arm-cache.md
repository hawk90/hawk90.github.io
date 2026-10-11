# 작성자 측정 요청 — `part2-06-arm-cache.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 2 (최종 점수 74, 상태 `unresolved`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. L80-89 재현 실험을 실제 보드에서 실행: 완료 뒤 invalidate (2)를 뺐을 때 마지막 line이 0xAA로 남는지, (2)를 넣으면 받은 값이 나오는지

- **준비:** 작성자가 가진 Cortex-M7 보드 1종(예: STM32F7/H7 Nucleo·Discovery 등, 실제 보드명·MCU 품번 기록). SCB->CPUID 값(rNpN revision), D-cache 크기(CCSIDR 읽기: SCB->CCSIDR의 NumSets·Associativity), core clock, buffer가 놓인 메모리(AXI SRAM/SRAM1 등, 링커 맵의 rx_buffer 주소), 사용한 DMA 컨트롤러와 송신원(UART RX·SPI RX·memory-to-memory 중 무엇인지, peripheral-to-memory가 아니면 그렇다고 명시), CMSIS 버전(5.9.0인지), 컴파일러·버전·최적화 옵션
- **절차:** 1) rx_buffer 1024 B, aligned(32). 송신원은 0xAA와 구분되는 알려진 패턴(예: 0x00..0xFF 반복)을 보냄. 2) 본문 L82-86 그대로: memset 0xAA → (1) → dma_rx_start → 마지막 line read. 3) 변형 A: 완료 뒤 (2) 없이 rx_buffer[992..1023] 덤프. 변형 B: (2) 넣고 같은 범위 덤프. 4) 각 변형 최소 100회 반복, 마지막 line read가 DMA가 그 line을 쓰기 전에 실행됐는지 확인(예: read 직후 DMA의 남은 전송 수 레지스터(NDTR 등) 값을 함께 기록). 5) 비교용 변형 C: 의도적 read 없이 (2)만 뺀 상태로 같은 횟수 반복
- **기록할 것:** 변형별 표: 반복 횟수, 마지막 line이 0xAA로 남은 횟수, 다른 line 불일치 횟수, read 시점 NDTR 값 범위. 덤프 원문 1회분(hex). 변형 C에서 불일치가 0이어도 0으로 기록하고 'speculative linefill은 이 보드·이 조건에서 관찰되지 않음, 보장 아님'이라고 적음. 실험 날짜
- **글에 넣을 위치:** L89 바로 뒤에 '보드에서 확인 (보드명, 날짜)' 소단락: 환경 한 줄 + 변형별 결과 표 + 한계(보드 1종·반복 횟수). L89의 '나와야 합니다'는 관찰값으로 교체하고 L174 함정의 '증상은 ...' 문장이 이 표를 가리키게 함
- **오르는 항목:** C: 현재 '유도한 기대값'만 있어 C≤9 상한(3-1절)에 걸림. 관찰 결과·환경·한계가 들어가면 8~11 이상, 변형 C의 결과(관찰됨/안 됨)까지 있으면 환경 차이 기록으로 12 이상 근거. A: 다른 글에 없는 실측 재현

## 2. (1) clean+invalidate를 뺐을 때 dirty line eviction이 DMA 데이터를 덮어쓰는지 실측

- **준비:** 위와 같은 보드·DMA·buffer. D-cache 크기와 way 수(CCSIDR에서 읽은 값)로 같은 set에 매핑되는 conflict 주소 계산
- **절차:** 1) memset(rx_buffer, 0xAA) 후 (1) 없이 dma_rx_start. 2) DMA 진행 중 rx_buffer와 같은 set에 매핑되는 다른 cacheable 영역 주소를 way 수 이상 읽어 eviction 유도(stride = D-cache 크기 / way 수). 3) 완료 뒤 (2) 실행 후 덤프. 4) 대조군: (1)을 넣은 같은 절차. 각 100회 이상
- **기록할 것:** 조건별 반복 횟수, 0xAA로 오염된 line 수·위치, conflict read 시점의 NDTR. 사용한 stride·conflict 주소. 결과가 0이면 0 그대로
- **글에 넣을 위치:** L77 (1) 설명 뒤 또는 첫 번째 측정 소단락의 두 번째 표
- **오르는 항목:** C: (1)의 필요성이 TRM 인용만이 아닌 관찰 결과로 뒷받침됨(8~11, 실패 재현이면 12 이상 근거). A: 실패 사례 기록

## 3. 정렬 안 된 buffer에서 이웃 변수 손상(L106-109) 재현

- **준비:** 같은 보드. buffer를 aligned(32) 없이, 앞뒤 같은 line에 volatile 이웃 변수를 두는 구조체나 링커 배치(실제 주소를 맵 파일로 확인해 기록)
- **절차:** 1) 이웃 변수에 0x55를 써 dirty 상태로 둔 뒤 (1)(2) 순서로 DMA 수신 → 이웃 변수 값 확인. 2) DMA 도중 이웃 변수에 write → 완료 뒤 (2) → buffer 앞/뒤 byte와 이웃 변수 확인. 3) aligned(32) + 32의 배수 길이로 바꿔 같은 절차
- **기록할 것:** buffer 시작 주소·길이와 a mod 32, 조건별 이웃 변수 기대값/실제값, 손상된 buffer byte 범위, 반복 횟수
- **글에 넣을 위치:** 'Buffer 정렬' 절 L109 뒤 짧은 결과 표
- **오르는 항목:** C: 함정 절(L176-178)에 관찰 결과 추가. A: 독자적 실패 재현

## 4. maintenance 비용 대 non-cacheable 접근 비용 cycle 측정(L158-163 선택 기준에 수치 근거)

- **준비:** 같은 보드. DWT->CYCCNT 사용(DEMCR TRCENA, DWT_CTRL CYCCNTENA). core clock, buffer 메모리 종류와 bus(AXI SRAM 등), 컴파일러·최적화 옵션, I-cache on/off 기록. MPU region은 본문 L129-137 설정 그대로
- **절차:** 1) SCB_CleanInvalidateDCache_by_Addr, SCB_InvalidateDCache_by_Addr, SCB_CleanDCache_by_Addr를 1024 B(가능하면 256 B·4 KB도)로 각각 1000회 호출, 호출당 cycle 측정(dirty 상태/clean 상태 구분). 2) 1024 B를 byte 단위로 1회·4회 읽는 루프를 cacheable(maintenance 후) buffer와 non-cacheable region buffer에서 각각 측정. 3) 같은 실험을 word 단위 read로도
- **기록할 것:** 표: 동작, buffer 크기, 상태(dirty/clean), min/median/max cycle. 접근 패턴별 cacheable 대 non-cacheable cycle과 손익분기 반복 횟수. 측정 오버헤드(빈 측정 cycle) 기록
- **글에 넣을 위치:** '두 방법 중 고르기' 절 L160-163에 측정 표 추가, L163의 결론을 '이 보드에서 N회 이상 읽으면 cacheable이 유리'처럼 측정 범위를 적은 문장으로. 1차 출처 latency 없이 op 수로만 고른다는 지적(C/A L158-163) 해소
- **오르는 항목:** C: 실제 측정·트레이드오프 기록(12~15 구간 근거). A: 작성자 측정에 기반한 선택 기준(20~25 구간 '선택 기준이 뚜렷함')

## 5. MPU 설정 확인과 fault 경로 관찰(L146, L148)

- **준비:** 같은 보드, 디버거(probe·IDE 또는 OpenOCD/pyOCD 버전 기록)
- **절차:** 1) L129-137 설정 후 MPU->RNR=1, MPU->RASR·MPU->CTRL 읽기. 2) AP=000으로 바꾼 region에 접근해 fault 유발: ARM_MPU_Enable로 켠 경우와 MEMFAULTENA 없이 MPU->CTRL만 쓴 경우 각각 어느 handler로 가는지, SCB->CFSR·MMFAR·HFSR 값 기록
- **기록할 것:** RASR/CTRL 읽은 값(hex), 경우별 진입 handler, CFSR·MMFAR·HFSR 값
- **글에 넣을 위치:** L148 뒤 확인 결과 한두 줄, L146 문장 옆에 관찰 결과(escalation 조건 보완은 DUI 0646C 2.4.2 기준으로 별도 수정)
- **오르는 항목:** C: 확인 절차에 관찰 결과 추가(8~11 근거)

## 6. 코어 revision 기록과 DTCM DMA 도달 여부 확인(L167-168 중간 선택지의 전제)

- **준비:** 같은 보드. 칩 레퍼런스 매뉴얼의 bus matrix 그림(문서 번호·revision 기록)
- **절차:** 1) SCB->CPUID 읽어 Cortex-M7 rNpN 기록(Write-through 관련 erratum 적용 범위를 SDEN-1068427과 대조할 때 필요). 2) RM에서 사용 DMA가 DTCM/AHBS에 닿는지 확인 후, 닿으면 DTCM buffer로 maintenance 없이 수신해 데이터 일치 확인, 안 닿으면 전송 에러 플래그 값 기록
- **기록할 것:** CPUID 값, RM 문서 번호와 해당 그림/절, DTCM DMA 결과(일치/에러 플래그)
- **글에 넣을 위치:** '중간 선택지' 절 각 bullet 끝에 '이 보드(rNpN)에서 확인' 한 줄
- **오르는 항목:** C: 환경 차이(칩별 DMA 연결, 코어 revision) 기록. B/factcheck 보조
