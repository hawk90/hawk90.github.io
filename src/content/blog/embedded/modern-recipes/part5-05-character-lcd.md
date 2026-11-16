---
title: "Character LCD 제어 — HD44780·4-bit Mode·Custom Char"
slug: "embedded/modern-recipes/part5-05-character-lcd"
date: 2026-04-14T09:53:00
description: "4/8-bit 모드·command·custom character·timing 준수."
series: "Modern Embedded Recipes"
seriesOrder: 53
tags: [recipes, peripheral, lcd]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"HD44780은 E의 하강 edge마다 4 bit를 받아, 두 번에 한 byte를 처리합니다."** 4-bit mode는 전원 직후 정해진 순서의 function set으로만 들어가고, 명령마다 실행 시간을 기다려야 합니다.

## 어떤 상황에서 쓰나

문자 몇 줄만 보여 주면 되는 전압계, 온도계, 제어 panel의 상태 표시에 HD44780 호환 controller를 단 16×2 character LCD를 씁니다. 화면 내용을 controller의 DDRAM이 들고 있어, MCU는 바뀐 글자만 보내면 됩니다.

이 글은 STM32F407 GPIO 6개로 4-bit interface를 만들고, 초기화 순서, 커서 위치, custom character, PCF8574 I2C 확장기 경로를 다룹니다. 수치는 Hitachi HD44780U datasheet(ADE-207-272(Z))와 TI PCF8574 datasheet(SCPS068K)에서 가져왔습니다. 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, 같은 코드를 host에서 GPIO·시간을 흉내 낸 harness로 돌려 E edge 순서와 대기 시간을 datasheet 값과 대조했습니다. LCD 모듈로 한 측정은 없습니다.

## 핵심 개념

### MCU와 연결하는 신호

HD44780U datasheet의 pin function 표 기준입니다. 모듈의 핀 번호, 전원, contrast(VO), backlight 배선은 모듈 datasheet를 따릅니다.

| 신호 | 방향 | datasheet 설명 |
|---|---|---|
| RS | 입력 | 0: instruction register(쓰기) / busy flag·address counter(읽기), 1: data register |
| R/W | 입력 | 0: Write, 1: Read |
| E | 입력 | "Starts data read/write." |
| DB4–DB7 | 입출력 | 상위 4 bit. DB7은 busy flag로도 읽힘 |
| DB0–DB3 | 입출력 | "These pins are not used during 4-bit operation." |

### 4-bit mode 배선

이 글의 코드가 가정하는 배선입니다. R/W를 GND에 묶어 쓰기만 하므로 busy flag를 읽지 않고, 대신 datasheet의 실행 시간만큼 기다립니다.

| STM32F407 | LCD |
|---|---|
| PA0 | RS |
| PA1 | E |
| PB0–PB3 | DB4–DB7 |
| GND | R/W |

MCU 쪽 신호선은 RS, E, DB4–DB7의 6개입니다. VCC 4.5 ~ 5.5 V에서 E·RS·DB 입력의 high 기준 VIH1은 최소 2.2 V이므로, 쓰기만 하는 이 배선에서는 3.3 V GPIO 출력이 그 기준을 넘습니다. R/W = 1로 읽으면 LCD가 DB를 구동하므로 그때는 MCU 핀의 전압 허용 범위를 따로 봐야 합니다.

### Bus timing

datasheet의 쓰기 AC characteristics(Figure 25)입니다.

| 항목 | 기호 | VCC 2.7 ~ 4.5 V | VCC 4.5 ~ 5.5 V |
|---|---|---|---|
| Enable cycle time | tcycE | 1000 ns 이상 | 500 ns 이상 |
| Enable pulse width (high) | PWEH | 450 ns 이상 | 230 ns 이상 |
| Address set-up (RS, R/W → E) | tAS | 60 ns 이상 | 40 ns 이상 |
| Data set-up | tDSW | 195 ns 이상 | 80 ns 이상 |
| Data hold | tH | 10 ns 이상 | 10 ns 이상 |

아래 코드는 RS·data를 놓고 1 µs, E high 1 µs, E low 1 µs를 기다려 두 전압 범위의 최소값을 모두 넘깁니다.

### 명령 실행 시간

Table 6의 실행 시간은 "f cp or f OSC is 270 kHz"일 때의 최대값입니다.

| 명령 | 실행 시간 (270 kHz) |
|---|---|
| Return home | 1.52 ms |
| Entry mode set, Display on/off, Cursor/display shift, Function set, Set CGRAM/DDRAM address, Write data | 37 µs |
| Clear display | 표에 값이 없음 |

datasheet는 clock이 바뀌면 시간도 바뀐다며 250 kHz 예로 "37 µs × 270/250 = 40 µs"를 듭니다. 아래 코드는 명령마다 50 µs를 기다리는데, 같은 비례식으로 37 µs × 270/f ≤ 50 µs가 되는 f ≥ 199.8 kHz까지 덮습니다. Clear display는 표에 시간이 비어 있어 Return home의 1.52 ms보다 긴 2 ms를 기다립니다.

### 4-bit 초기화 순서

datasheet의 "Initializing by Instruction"(4-bit interface)은 이렇습니다. 이 단계에서는 "BF cannot be checked before this instruction."입니다.

1. 전원 후 대기: VCC가 4.5 V에 오른 뒤 15 ms 이상, 2.7 V 기준이면 40 ms 이상
2. `0011` (Function set, 8-bit) 후 4.1 ms 이상
3. `0011` 후 100 µs 이상
4. `0011`
5. `0010` (4-bit로 전환)
6. 이후는 4 bit씩 두 번: Function set(N, F), Display off, Display clear, Entry mode set

1~5는 nibble 하나씩, 6부터는 상위 nibble·하위 nibble 두 번으로 한 명령을 보냅니다.

### DDRAM 주소

datasheet는 2-line 표시에서 "00H to 27H for the first line, and 40H to 67H for the second line"이라고 합니다. 16×2 모듈은 각 줄의 앞 16칸(0x00–0x0F, 0x40–0x4F)이 보입니다. 커서를 row R, col C로 옮기는 명령은 `0x80 | ((R ? 0x40 : 0x00) + C)`입니다.

### CGRAM — custom character

CGRAM은 64 byte이고, 5 × 8 dot 글자 8개(character code 0x00–0x07)를 둡니다. character code의 bit 0–2가 CGRAM 주소 bit 3–5가 되므로 글자 N의 M번째 줄은 CGRAM 주소 N × 8 + M입니다. 한 줄의 bit 4가 왼쪽 dot입니다. 8번째 줄은 커서 줄과 OR되므로 datasheet는 이 줄을 0으로 두라고 합니다.

## 코드 예제

`delay_us_dwt()`·`dwt_init()`·`delay_ms()`는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer), `gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 것입니다. `CPU_HZ`는 [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup)의 168 MHz입니다.

### 1. 4-bit interface driver

```c
#define CPU_HZ       168000000u

// PA0=RS, PA1=E, PB0-3=D4-D7
#define LCD_RS_PORT  GPIOA
#define LCD_RS_PIN   0
#define LCD_E_PORT   GPIOA
#define LCD_E_PIN    1
#define LCD_D_PORT   GPIOB
#define LCD_D_SHIFT  0   // D4 = PB0

static void lcd_write4(uint8_t nibble) {
    LCD_D_PORT->BSRR = (0xFu << (LCD_D_SHIFT + 16))     // clear
                     | ((nibble & 0xFu) << LCD_D_SHIFT); // set
    delay_us_dwt(1, CPU_HZ);                  // tAS >= 60 ns, tDSW >= 195 ns
    LCD_E_PORT->BSRR = (1u << LCD_E_PIN);    // E high
    delay_us_dwt(1, CPU_HZ);                  // PWEH >= 450 ns
    LCD_E_PORT->BSRR = (1u << (LCD_E_PIN + 16));   // E low: latch
    delay_us_dwt(1, CPU_HZ);                  // tH, tcycE >= 1000 ns
}

static void lcd_send(uint8_t byte, int rs) {
    if (rs) LCD_RS_PORT->BSRR = (1u << LCD_RS_PIN);
    else    LCD_RS_PORT->BSRR = (1u << (LCD_RS_PIN + 16));

    lcd_write4(byte >> 4);
    lcd_write4(byte & 0xFu);

    delay_us_dwt(50, CPU_HZ);   // 37 us at 270 kHz
}

void lcd_cmd(uint8_t cmd)  { lcd_send(cmd, 0); }
void lcd_data(uint8_t data) { lcd_send(data, 1); }
```

### 2. Init sequence

```c
void lcd_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN;
    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    for (int i = 0; i < 4; i++)
        gpio_init(GPIOB, i, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    LCD_RS_PORT->BSRR = (1u << (LCD_RS_PIN + 16));   // RS = 0
    LCD_E_PORT->BSRR  = (1u << (LCD_E_PIN + 16));    // E = 0

    delay_ms(50);                   // > 40 ms after VCC reaches 2.7 V

    lcd_write4(0x3); delay_ms(5);   // > 4.1 ms
    lcd_write4(0x3); delay_us_dwt(150, CPU_HZ);   // > 100 us
    lcd_write4(0x3); delay_us_dwt(50, CPU_HZ);
    lcd_write4(0x2); delay_us_dwt(50, CPU_HZ);    // now 4-bit

    lcd_cmd(0x28);                  // function set: 4-bit, 2 lines, 5x8
    lcd_cmd(0x08);                  // display off
    lcd_cmd(0x01); delay_ms(2);     // display clear
    lcd_cmd(0x06);                  // entry mode: increment, no shift
    lcd_cmd(0x0C);                  // display on, cursor off
}

void lcd_clear(void) {
    lcd_cmd(0x01);
    delay_ms(2);
}

void lcd_goto(uint8_t row, uint8_t col) {
    uint8_t addr = (row ? 0x40 : 0x00) + col;
    lcd_cmd(0x80 | addr);
}

void lcd_print(const char *s) {
    while (*s) lcd_data((uint8_t)*s++);
}
```

### 3. Custom character

```c
void lcd_define_char(uint8_t code, const uint8_t pattern[8]) {
    lcd_cmd(0x40 | (code * 8));   // set CGRAM address
    for (int i = 0; i < 8; i++)
        lcd_data(pattern[i]);
    lcd_cmd(0x80);                // back to DDRAM
}

const uint8_t heart[8] = {
    0x00, 0x0A, 0x1F, 0x1F,
    0x1F, 0x0E, 0x04, 0x00,       // 8th line kept 0 (cursor line)
};

void demo(void) {
    lcd_define_char(0, heart);
    lcd_clear();
    lcd_goto(0, 0);
    lcd_print("Hello LCD ");
    lcd_data(0);                  // CGRAM character 0
}
```

`lcd_define_char()` 뒤의 `lcd_cmd(0x80)`은 주소 카운터를 다시 DDRAM으로 돌립니다. 이 명령 없이 `lcd_data()`를 부르면 글자가 화면이 아니라 CGRAM에 써집니다.

### 4. PCF8574 I2C 확장기 경로

PCF8574는 I2C로 받은 byte를 P0–P7 8개 핀에 그대로 내는 I/O expander입니다. LCD에 붙이는 확장기 보드는 P 핀과 LCD 신호의 연결이 보드마다 다르므로, 아래 코드는 이 연결을 가정합니다: P0 = RS, P1 = R/W, P2 = E, P3 = backlight 제어, P4–P7 = DB4–DB7.

7-bit 주소는 datasheet 7.3.3 Address Reference 표대로 A2·A1·A0 핀에 따라 0x20(LLL) ~ 0x27(HHH)입니다.

```c
#define LCD_I2C_ADDR  0x27          // PCF8574 with A2=A1=A0=H

static uint8_t bl = 0x08;           // P3: backlight on

static void lcd_i2c_write4(uint8_t nibble_hi, int rs) {
    uint8_t v = (uint8_t)((nibble_hi & 0xF0u) | bl | (rs ? 0x01u : 0u));
    v |= 0x04;                      // E high (P2)
    i2c_write(LCD_I2C_ADDR, &v, 1);
    v &= (uint8_t)~0x04u;           // E low: latch
    i2c_write(LCD_I2C_ADDR, &v, 1);
}

void lcd_send_i2c(uint8_t byte, int rs) {
    lcd_i2c_write4(byte & 0xF0u, rs);
    lcd_i2c_write4((uint8_t)(byte << 4), rs);
    delay_us_dwt(50, CPU_HZ);
}
```

`i2c_write()`는 [4-09](/blog/embedded/modern-recipes/part4-09-i2c-driver)의 것입니다. PCF8574의 fSCL 최대값은 100 kHz이고, 주소 byte와 data byte 하나를 쓰는 데 start·stop을 빼고도 18 clock, 즉 180 µs가 걸립니다. E를 올린 쓰기와 내린 쓰기 사이가 이미 그만큼 벌어지므로 GPIO 경로처럼 1 µs 대기를 넣지 않았습니다. 초기화는 GPIO 경로의 `lcd_init()`과 같은 순서를, 1~5단계는 `lcd_i2c_write4(0x30, 0)`처럼 nibble 하나로 보냅니다.

## 측정 / 동작 확인

### host에서 E edge 순서 확인

LCD 없이 driver가 datasheet 순서대로 nibble을 내는지 보기 위해, 1~3절 코드를 host에서 돌렸습니다. harness는 GPIO `BSRR` 쓰기를 함수 호출로 바꿔 핀 상태를 기록하고, `delay_us_dwt()`·`delay_ms()`는 가상 시간을 더합니다. E 하강 edge마다 RS와 DB4–DB7을 읽어 HD44780 쪽에서 본 명령으로 풀고, 직전 명령 이후 지난 시간을 함께 찍습니다.

```c
/* lcd_host.c */
#include <stdint.h>
#include <stdio.h>

typedef struct { uint32_t odr; } port_t;
static port_t PA, PB;
#define GPIOA (&PA)
#define GPIOB (&PB)
#define BSRR_WRITE(p, v) bsrr((p), (v))
static double now_us;
static int e_prev, nib_hi = -1, four_bit;
static double last_cmd_us;

static void hd44780_edge(void) {
    int rs = PA.odr & 1, nib = PB.odr & 0xF;
    if (!four_bit) {
        printf("%9.1f us  +%8.1f  nibble 0x%X (8-bit function set%s)\n",
               now_us, now_us - last_cmd_us, nib, nib == 2 ? " -> 4-bit" : "");
        if (nib == 2) four_bit = 1;
        last_cmd_us = now_us;
        return;
    }
    if (nib_hi < 0) { nib_hi = nib; return; }
    printf("%9.1f us  +%8.1f  RS=%d 0x%02X\n",
           now_us, now_us - last_cmd_us, rs, (nib_hi << 4) | nib);
    nib_hi = -1;
    last_cmd_us = now_us;
}

static void bsrr(port_t *p, uint32_t v) {
    p->odr &= ~(v >> 16);           /* BR first: BS wins if both set */
    p->odr |= v & 0xFFFF;
    int e = PA.odr >> 1 & 1;
    if (e_prev && !e) hd44780_edge();
    e_prev = e;
}

void delay_us_dwt(uint32_t us, uint32_t hz) { (void)hz; now_us += us; }
void delay_ms(uint32_t ms) { now_us += ms * 1000.0; }

/* the post's code is pasted here with "X->BSRR = v;" rewritten to
   BSRR_WRITE(X, v); and the RCC, gpio_init and its for-loop lines
   removed */
#include "lcd_post.inc"

int main(void) {
    lcd_init();
    demo();
    return 0;
}
```

```bash
clang -O2 -Wall -o lcd_host lcd_host.c && ./lcd_host
```

```text
  50002.0 us  + 50002.0  nibble 0x3 (8-bit function set)
  55005.0 us  +  5003.0  nibble 0x3 (8-bit function set)
  55158.0 us  +   153.0  nibble 0x3 (8-bit function set)
  55211.0 us  +    53.0  nibble 0x2 (8-bit function set -> 4-bit)
  55267.0 us  +    56.0  RS=0 0x28
  55323.0 us  +    56.0  RS=0 0x08
  55379.0 us  +    56.0  RS=0 0x01
  57435.0 us  +  2056.0  RS=0 0x06
  57491.0 us  +    56.0  RS=0 0x0C
  57547.0 us  +    56.0  RS=0 0x40
  57603.0 us  +    56.0  RS=1 0x00
  57659.0 us  +    56.0  RS=1 0x0A
  57715.0 us  +    56.0  RS=1 0x1F
  57771.0 us  +    56.0  RS=1 0x1F
  57827.0 us  +    56.0  RS=1 0x1F
  57883.0 us  +    56.0  RS=1 0x0E
  57939.0 us  +    56.0  RS=1 0x04
  57995.0 us  +    56.0  RS=1 0x00
  58051.0 us  +    56.0  RS=0 0x80
  58107.0 us  +    56.0  RS=0 0x01
  60163.0 us  +  2056.0  RS=0 0x80
  60219.0 us  +    56.0  RS=1 0x48
  60275.0 us  +    56.0  RS=1 0x65
  60331.0 us  +    56.0  RS=1 0x6C
  60387.0 us  +    56.0  RS=1 0x6C
  60443.0 us  +    56.0  RS=1 0x6F
  60499.0 us  +    56.0  RS=1 0x20
  60555.0 us  +    56.0  RS=1 0x4C
  60611.0 us  +    56.0  RS=1 0x43
  60667.0 us  +    56.0  RS=1 0x44
  60723.0 us  +    56.0  RS=1 0x20
  60779.0 us  +    56.0  RS=1 0x00
```

시간은 E 하강 edge 기준입니다. 첫 `0011`이 50002 µs(> 40 ms), 다음 두 간격이 5003 µs(> 4.1 ms)와 153 µs(> 100 µs)이고, 4-bit 전환 뒤 명령 간격은 56 µs(nibble 두 번 6 µs + 대기 50 µs)로 37 µs를 넘습니다. Clear display(0x01) 다음 명령까지는 2056 µs입니다. CGRAM 주소 0x40 뒤로 heart 8 byte가, 0x80·0x01·0x80 뒤로 "Hello LCD "와 0x00이 나갑니다.

### 보드에서

글자가 안 보이면 먼저 모듈의 VO(contrast) 전압을 바꿔 봅니다. 그다음 scope로 E와 DB4–DB7을 보면, 위 log처럼 초기화에서 E 펄스 4개, 이후 명령마다 2개가 나와야 합니다.

## 자주 보는 함정

> ⚠️ 전원 직후 대기 부족

datasheet의 power-on 대기는 VCC가 4.5 V에 오른 뒤 15 ms, 2.7 V 기준이면 40 ms 이상입니다. 이 대기는 LCD의 VCC 기준이므로, MCU reset과 LCD 전원 상승 시점이 다르면 그 차이만큼 더 기다립니다.

> ⚠️ 4-bit 전환 전에 두 nibble로 보냄

1~5단계는 controller가 아직 8-bit interface로 동작하는 구간이라 nibble 하나가 명령 하나입니다. 여기서 `lcd_cmd(0x33)`처럼 두 nibble을 보내면 순서가 어긋납니다.

> ⚠️ CGRAM에 쓴 뒤 DDRAM 주소를 다시 안 잡음

주소 카운터가 CGRAM을 가리킨 채로 `lcd_data()`를 부르면 글자가 CGRAM에 써집니다. 3절처럼 `0x80` 등으로 DDRAM 주소를 다시 지정합니다.

> ⚠️ R/W를 GND에 묶지 않음

R/W가 1이면 LCD가 DB를 출력으로 구동합니다. 쓰기만 하는 배선은 R/W를 GND에 묶습니다.

> ⚠️ 한글 표시

HD44780U의 CGROM은 5 × 8 dot 글자 208개와 5 × 10 dot 글자 32개이고, ROM code A00은 "Japanese standard font", A02는 "European standard font"입니다. 한글 글꼴은 ROM에 없고, 사용자 글자는 CGRAM의 8개뿐이므로 한글 문장을 보이려면 graphic display가 필요합니다.

## 정리

- MCU 신호는 **RS, E, DB4–DB7의 6개**, R/W는 GND.
- 초기화는 **`0011` 세 번(15/40 ms, 4.1 ms, 100 µs 대기) → `0010`** 다음부터 4 bit씩 두 번.
- 명령 실행은 **270 kHz에서 37 µs, Return home 1.52 ms**. 코드는 50 µs와 2 ms를 기다림.
- 2-line DDRAM은 **0x00·0x40**에서 시작, CGRAM 글자는 **8개**.
- PCF8574 경로는 주소 **0x20–0x27**, SCL **100 kHz 이하**.

다음 편은 **SPI OLED (SSD1306)**입니다. 128×64 graphic display, framebuffer, page mode를 다룹니다.

## 관련 항목

- [4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-06: SPI OLED (SSD1306)](/blog/embedded/modern-recipes/part5-06-spi-oled)
- [5-07: TFT 디스플레이](/blog/embedded/modern-recipes/part5-07-tft-display)
