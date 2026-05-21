---
title: "5-05: Character LCD (HD44780)"
date: 2026-05-14T05:00:00
description: "4/8-bit 모드·command·custom character·timing 준수."
series: "Modern Embedded Recipes"
seriesOrder: 53
tags: [recipes, peripheral, lcd]
draft: false
---

## 한 줄 요약

> **"30년 된 표준이 아직도 살아있습니다."** 16×2 character LCD = HD44780 chip. 4-bit mode 6 wire로 충분합니다.

## 어떤 상황에서 쓰나

문자만 표시하면 되는 *간단한 status display* — 전압계, 온도계, vending machine UI, 산업 제어 panel. SSD1306 OLED나 TFT가 더 예쁘지만 *HD44780은 가격 1-2달러*, *직관적 textual display*, *전원 OFF에도 마지막 문자 잔상이 없는* 장점이 있습니다.

이 글은 HD44780 4-bit interface로 STM32와 16×2 LCD를 연결하고, character 출력, custom character 정의까지 다룹니다.

## 핵심 개념

### HD44780 핀

| LCD 핀 | 역할 |
|---|---|
| 1 VSS | GND |
| 2 VDD | +5V |
| 3 VO | contrast (10k pot) |
| 4 RS | 0=command, 1=data |
| 5 RW | 0=write, 1=read (보통 GND로 묶음) |
| 6 E | enable (rising edge에서 latch) |
| 7-14 DB0-7 | data bus |
| 15 LED+ | backlight + (220Ω 직렬) |
| 16 LED- | backlight GND |

4-bit mode에서는 DB4-7만 사용. **DB0-3은 floating으로 두거나 GND.**

### 4-bit mode wiring

```text
MCU GPIO            LCD
─────────           ────
PA0 ────────────► RS
GND ────────────► RW    (write only)
PA1 ────────────► E
PB0-3 ──────────► DB4-7
GND ────────────► DB0-3
+5V + 10k pot ──► VO    (contrast)
```

총 6 wire (RS, E, DB4-7).

### Command vs Data

| RS | RW | 의미 |
|----|----|------|
| 0 | 0 | command write (clear, cursor move, ...) |
| 1 | 0 | character data write |
| 0 | 1 | busy flag read |
| 1 | 1 | data read (거의 안 씀) |

### Timing

**E low → high → low cycle:**

- E high ≥ 230 ns
- E low ≥ 500 ns
- data valid 80 ns before E falling

**Command execution:**

- Clear / Return Home: 1.52 ms
- Other commands:      37 µs

대부분의 command 후 *37 µs 대기*가 필요합니다. *clear*만 1.52 ms.

### DDRAM address layout (16×2)

```text
Line 1: 0x00 ~ 0x0F   (16 chars)
Line 2: 0x40 ~ 0x4F

Cursor → row R, col C:
  addr = (R ? 0x40 : 0x00) + C
  command: 0x80 | addr
```

### CGRAM — custom character

8 custom character (code 0x00~0x07)을 정의 가능. 각 character는 8 byte (5×8 pixel).

**'♥' character (code 0x01):**

- Row 0: 0b00000  (top)
- Row 1: 0b01010
- Row 2: 0b11111
- Row 3: 0b11111
- Row 4: 0b11111
- Row 5: 0b01110
- Row 6: 0b00100
- Row 7: 0b00000  (bottom)

CGRAM address 0x00~0x3F. character N의 byte M = address (N*8 + M).

## 코드 예제

### 1. 4-bit interface driver

```c
// PA0=RS, PA1=E, PB0-3=D4-D7
#define LCD_RS_PORT  GPIOA
#define LCD_RS_PIN   0
#define LCD_E_PORT   GPIOA
#define LCD_E_PIN    1
#define LCD_D_PORT   GPIOB
#define LCD_D_SHIFT  0   // D4 = PB0

static void lcd_write4(uint8_t nibble) {
    LCD_D_PORT->BSRR = (0xFu << (LCD_D_SHIFT + 16))     // clear
                     | ((nibble & 0xF) << LCD_D_SHIFT); // set

    LCD_E_PORT->BSRR = (1u << LCD_E_PIN);    // E high
    delay_us(1);                              // ≥ 230 ns
    LCD_E_PORT->BSRR = (1u << (LCD_E_PIN + 16));   // E low
    delay_us(1);                              // ≥ 500 ns
}

static void lcd_send(uint8_t byte, int rs) {
    if (rs) LCD_RS_PORT->BSRR = (1u << LCD_RS_PIN);
    else    LCD_RS_PORT->BSRR = (1u << (LCD_RS_PIN + 16));

    lcd_write4(byte >> 4);
    lcd_write4(byte & 0xF);

    delay_us(40);   // command execution time
}

void lcd_cmd(uint8_t cmd)  { lcd_send(cmd, 0); }
void lcd_data(uint8_t data) { lcd_send(data, 1); }
```

### 2. Init sequence

datasheet에 *정확한 sequence*가 있습니다. 따르지 않으면 *4-bit mode로 들어가지 않습니다*.

```c
void lcd_init(void) {
    // GPIO init (RS, E, D4-D7)
    gpio_init(GPIOA, 0, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    gpio_init(GPIOA, 1, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});
    for (int i = 0; i < 4; i++)
        gpio_init(GPIOB, i, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});

    delay_ms(50);                  // power-on wait > 40 ms

    // Function set sequence (8-bit mode first, then switch to 4-bit)
    lcd_write4(0x3); delay_ms(5);
    lcd_write4(0x3); delay_us(100);
    lcd_write4(0x3); delay_us(100);
    lcd_write4(0x2);                // switch to 4-bit

    lcd_cmd(0x28);                  // 4-bit, 2 line, 5x8 font
    lcd_cmd(0x0C);                  // display ON, cursor OFF
    lcd_cmd(0x01); delay_ms(2);     // clear
    lcd_cmd(0x06);                  // entry mode: cursor++, no shift
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
    while (*s) lcd_data(*s++);
}
```

### 3. Custom character

```c
void lcd_define_char(uint8_t code, const uint8_t pattern[8]) {
    lcd_cmd(0x40 | (code * 8));   // CGRAM address
    for (int i = 0; i < 8; i++)
        lcd_data(pattern[i]);
}

const uint8_t heart[8] = {
    0b00000, 0b01010, 0b11111, 0b11111,
    0b11111, 0b01110, 0b00100, 0b00000,
};

void demo(void) {
    lcd_define_char(0, heart);
    lcd_clear();
    lcd_goto(0, 0);
    lcd_print("Hello LCD ");
    lcd_data(0);                 // ♥
}
```

### 4. PCF8574 I2C backpack

요즘은 *I2C backpack PCB*를 LCD에 붙여 *2 wire*만 사용합니다.

**PCF8574 mapping (common):**

- P0 = RS
- P1 = RW (GND)
- P2 = E
- P3 = backlight
- P4-7 = D4-D7

```c
// I2C address 0x27 (typical)
#define LCD_I2C_ADDR  0x27

static uint8_t bl = 0x08;   // backlight bit (P3)

static void lcd_i2c_write(uint8_t nibble, int rs) {
    uint8_t v = (nibble & 0xF0) | bl | (rs ? 0x01 : 0) | 0x04;  // E high
    i2c_write(LCD_I2C_ADDR, &v, 1);
    delay_us(1);
    v &= ~0x04;                 // E low
    i2c_write(LCD_I2C_ADDR, &v, 1);
    delay_us(50);
}

void lcd_send_i2c(uint8_t byte, int rs) {
    lcd_i2c_write(byte & 0xF0, rs);
    lcd_i2c_write((byte << 4) & 0xF0, rs);
}
```

I2C는 *delay가 자동으로 ms 단위*라 timing이 더 여유롭습니다.

## 측정 / 동작 확인

LCD에 *"HELLO WORLD"*가 표시되면 success. 안 보이면 다음 순서로 확인:

1. **Contrast (VO)** — pot을 끝까지 돌려보기. 너무 어두우면 글자 안 보임.
2. **Backlight** — LED+/- 연결 확인.
3. **Init sequence** — 50ms power-on wait 누락 의심.
4. **Wire 순서** — D4-D7과 PB0-3 매칭.

스코프로 E 핀과 D4-D7을 보면 *byte 단위 transaction*이 보입니다.

E 핀은 명령마다 *두 번* 펄스를 만듭니다 — 상위 nibble 한 번 + 하위 nibble 한 번. 각 펄스의 high 구간 동안 D4–D7이 안정되어 있어야 LCD가 올바르게 latch 합니다.

## 자주 보는 함정

> ⚠️ 50ms power-on wait 누락

HD44780은 *power-on에 40 ms 이상의 self-init*이 필요. 너무 빨리 command 보내면 무시.

> ⚠️ 4-bit init sequence 잘못

8-bit 모드 3회 → 4-bit 모드 1회 → 4-bit function set. 한 단계라도 빼면 *random garbage*.

> ⚠️ Contrast pot 안 돌림

새 LCD는 VO가 default로 *너무 밝거나 어두워* 글자가 안 보입니다. 항상 *10k pot으로 조정*.

> ⚠️ RW를 안 묶음

floating RW가 read mode로 떠 *write가 안 됨*. GND에 연결.

> ⚠️ 5V LCD를 3.3V signal로 구동

데이터 핀 high threshold가 ~3.5V. 3.3V signal이면 high가 인식 안 될 수 있음. *level shifter* 또는 *I2C backpack* (3.3V tolerant) 사용.

> ⚠️ 한글·한자 표시 시도

HD44780 ROM은 ASCII + 일부 일본 katakana만. 한글은 *CGRAM 8개로 부족* — graphic LCD나 OLED가 필요.

## 정리

- HD44780 = 16×2 char LCD 표준. **4-bit mode 6 wire**로 충분.
- Init은 **정확한 sequence** (8-bit 3회 → 4-bit switch → function set).
- **Custom character** 8개 (CGRAM), 8 byte each.
- **PCF8574 I2C backpack**으로 2 wire 사용 가능.
- **Contrast (VO)** 조정이 첫 디버깅.

다음 편은 **SPI OLED (SSD1306)**입니다. 128×64 graphic display, framebuffer, page mode를 다룹니다.

## 관련 항목

- [4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [4-09: I2C 드라이버](/blog/embedded/modern-recipes/part4-09-i2c-driver)
- [5-06: SPI OLED (SSD1306)](/blog/embedded/modern-recipes/part5-06-spi-oled)
- [5-07: TFT 디스플레이](/blog/embedded/modern-recipes/part5-07-tft-display)
