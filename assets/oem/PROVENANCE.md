# OEM assets

Extracted 2026-08-19 from the official Windows installer
`AULA_F75_Setup_v2.0_20240509/AULA F75 Setup v2.0 20240509.exe`
(the header of which is "Inno Setup Setup Data (5.3.3) (u)") using `innoextract`.

`KB.ini` layouts come from `app/Dev/kb/<variant>/KB.ini`:

| variant | VID:PID            | wireless VID:PID |
|---------|--------------------|------------------|
| 1       | 258A:010C          | 3554:FA09        |
| F75KR   | 258A:010C          | 3554:FA09        |
| wired   | 258A:010C          | none             |

`[KEY]` entry format (F75 `1` variant), one line per key:
`K<n>=x,y,w,h, <pageByte>, <windowsVk>, 0x00, <matrixIndex>`

`[FN1]` entry format:
`K<n>=0x09,0x01,<0xHHHHHHHH>` where the 32-bit value packs
HID usage page (high 16 bits) | usage id (low 16 bits).

These files are the source of truth for the F75 key map (matrix index,
geometry, defaults) and are not modified by the app.