# Mock Test Full Answer

Updated on April 20, 2026.

## 1. 呢份答案點用

呢份係一個「最簡單、最穩陣、最接近 mock test 圖」嘅參考答案。

做法：

1. 你明天開一個新 project。
2. project 名改做 `Mock_Test_你的學號`。
3. Room 依照 Lab 4 加 dependency。
4. 然後跟住呢個資料夾嘅檔名抄入去。

## 2. 呢份答案點樣對應 mock test

### General Demands

1. 一開 app 就係 `MainActivity`。
2. 總共有 3 頁：
3. `MainActivity` = Start Page
4. `InsertActivity` = Insert Page
5. `DetailsActivity` = Details Page
6. Room database 名叫 `camera_database`
7. table 名叫 `camera_table`
8. `id` 用 `String` 存 UUID，符合題目「可改 data type if necessary」
9. 每個自寫 method 都有 comment

### Start Page

1. 右下角 `+` FAB 當 `Insert` button
2. RecyclerView 只顯示 camera name
3. 撳 item 去 details

### Insert Page

1. 標題置中 `Add New Camera`
2. `Name`
3. `Description (Optional)`
4. `Select Image`
5. 中間 image preview
6. 左下 `Cancel`
7. 右下 `Save`

### Details Page

1. 頂部大圖
2. 圖下大標題
3. 下面 description
4. 左下 `Back`

## 3. 分數理解

我重新檢查咗 `Mock Test.docx`。

標紅內容對應嘅其實係：

1. 元件有冇出現
2. 功能有冇做到
3. app 有冇 compile / run / 唔 crash
4. method comments 有冇寫

所以唔應該將注意力放喺：

1. button 一定喺右下角
2. 每條線一定同 wireframe 一模一樣
3. 每個 margin 要完全一樣

換句話講：

呢份答案重視「計分點齊」多過「對位一樣」。

## 4. 版面位置重點

你頭先補充咗一點好重要：

元件位置唔使 100% 跟足。

所以正確理解應該係：

1. 保持高相似度
2. 結構一致
3. 元件齊
4. 功能啱

唔需要 pixel-perfect。

呢份答案仍然刻意做成「接近 mock 圖」嘅樣，因為咁樣安全啲，但你明天如果拉位有少少差別，唔等於錯。

建議你跟以下大方向就夠：

1. Start Page 唔好加多餘 title
2. list item 靠左，簡單一行字
3. `+` 按鈕放右下
4. Insert Page 標題置中
5. 兩個輸入框 full width
6. `Select Image` 放輸入框下面靠左
7. image preview 放中間
8. `Cancel` 左下
9. `Save` 右下
10. Details Page 大圖放最上面 full width
11. `Back` 放左下

## 5. 依賴提醒

你明天最少要加到 Room：

1. `room-runtime`
2. `room-compiler`
3. `ksp`

最快方法：

1. 直接跟返你份 `Mobile Lab 4.docx`
2. 用同一套 Room 設定

## 6. Manifest 提醒

如果新增 activity 後冇自動入 manifest，就手動加：

```xml
<activity android:name=".InsertActivity" />
<activity android:name=".DetailsActivity" />
```

## 7. 最後提醒

1. Description 係 optional，所以 save 唔應該因為 description 空白而擋住。
2. 圖片可以唔揀，app 都唔應該 crash。
3. 如果時間唔夠，優先做功能正確。
