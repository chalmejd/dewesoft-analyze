# DewesoftAnalyze
Used to load and perform basic analysis on Dewesoft Files

Back end code located at: https://github.com/chalmejd-TEAM/dewesoft-analyze-server

### Current Functions:
---

#### Exponentially Weighted Mean:

Calculates the exponentially weighted mean of a load using the following formula:

$$ \overline{x}\_{ewm} = \sqrt[k]{\frac{1}{n}\sum_{i=1}^n x^k_i} = \sqrt[k]{\frac{x^k_1+x^k_2+...+x^k_i}{n}} $$

where:
$x = load$, $k = exponent$, and $n = cycles$

When running the program, select a .dxd file to load. A new checkbox lets you choose **bulk upload (folder)**; when enabled you can select a directory containing multiple .dxd files. The channel list is pulled from the first file and assumed to be the same across all files. You select your load and counter channels once, specify exponents (comma‑separated, e.g. `1, 2, 3, 4`), and the app will process each file in turn. Results are displayed per‑file.

Common Exponents used for Equivalent life calculations
- Bearings:
  - 3 (Cubic Mean): Ball Bearings
  - 3.33: Roller Bearings
- Gears (spur and helical from ISO 6336-6):
  - Surface Pitting:
    - 6.61: Case Carburized and Through Hardened
    - 5.709: Nitrided
    - 15.715: Nitro-carburized
  - Tooth Root:
    - 8.738: Case Carburized
    - 6.225: Through Hardened
    - 17.035: Nitrided
    - 84.003: Nitro-carburized

**Warning: Large data files can result in long processing times.**

