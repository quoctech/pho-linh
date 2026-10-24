# PHỐ LINH — Nam hệ Kim — Tách frame độc lập WebP (V2)

Bộ frame runtime mới từ `kim1` và `kim2`, thay thế toàn bộ sprite Kim cũ.

- 24 logical rows giữ nguyên contract của battle và skin preview.
- 18 animation vật lý, tổng cộng 108 frame WebP mới.
- Các trạng thái trùng hoặc không có animation riêng dùng alias tới frame tương thích.
- `frames-manifest.json` là manifest canonical của runtime.

Bản V2 sửa lại theo đúng yêu cầu: **tách frame bằng khoảng trắng / ranh giới thực tế trước**, sau đó mới crop.

## Quy trình xử lý

1. Đọc từng strip đã cắt theo dòng.
2. Dò **6 cụm frame thực tế theo trục X** bằng phân bố pixel alpha.
3. Tạo **6 segment độc lập** trước, để frame trước không còn dính frame sau.
4. Crop alpha bên trong từng segment độc lập.
5. Lấy frame lớn nhất trong cùng dòng làm chuẩn kích thước.
6. Đặt lại tất cả frame lên canvas cùng cỡ và xuất WebP.

## Output

- `frames_webp/`: 144 frame độc lập
- `spaced_segments_webp/`: segment gốc đã tách riêng theo khoảng trắng
- `equal_spaced_strips_webp/`: strip mới, frame độc lập và cách nhau xa
- `pho_linh_male_kim_frames_manifest.json`
- `README.md`

- Gap giữa các frame trong strip mới: **80px**
- Tổng strip: **24**
- Tổng frame riêng: **144**

## Ví dụ manifest

```json
{
  "index": 1,
  "id": "idle",
  "label": "Idle / đứng chờ",
  "sourceStrip": "rows_webp/01_idle.webp",
  "sourceStripSize": {
    "w": 1122,
    "h": 233
  },
  "detectedColumnBounds": [
    0,
    181,
    389,
    559,
    756,
    938,
    1122
  ],
  "detectedCentersX": [
    100.37297057682717,
    302.97862320757713,
    482.58971397139715,
    665.2355268863834,
    846.5638324060853,
    1032.9723287671234
  ],
  "frameCount": 6,
  "equalFrameSize": {
    "w": 186,
    "h": 231
  },
  "independentSegmentGap": 80,
  "equalSpacedStripFile": "equal_spaced_strips_webp/01_idle_equal_spaced.webp",
  "equalSpacedStripSize": {
    "w": 1516,
    "h": 231
  },
  "rawSeparatedSegmentsFolder": "spaced_segments_webp/01_idle",
  "frames": [
    {
      "index": 1,
      "name": "idle_01",
      "file": "frames_webp/01_idle/01_idle_01.webp",
      "equalCanvas": {
        "w": 186,
        "h": 231
      },
      "sourceXBounds": {
        "x0": 0,
        "x1": 181
      },
      "cropBoxInsideSeparatedSegment": {
        "left": 10,
        "top": 4,
        "right": 181,
        "bottom": 233
      },
      "pastePosition": {
        "x": 7,
        "y": 2
      }
    },
    {
      "index": 2,
      "name": "idle_02",
      "file": "frames_webp/01_idle/01_idle_02.webp",
      "equalCanvas": {
        "w": 186,
        "h": 231
      },
      "sourceXBounds": {
        "x0": 181,
        "x1": 389
      },
      "cropBoxInsideSeparatedSegment": {
        "left": 22,
        "top": 3,
        "right": 208,
        "bottom": 233
      },
      "pastePosition": {
        "x": 0,
        "y": 1
      }
    }
  ]
}
```
