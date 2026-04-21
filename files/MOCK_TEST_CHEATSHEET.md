# Mock Test Cheatsheet

Updated on April 20, 2026.

## 1. 呢題最穩做法

我已經重新檢查過 `Mock Test.docx` 裡面標紅部分。

結論：

1. 標紅嘅主要係分數位
2. 真正計分重點係「元件有冇出現」同「功能有冇做到」
3. 唔需要死跟 button 一定喺右下角
4. 唔需要 pixel-perfect
5. 只要畫面結構合理、接近 wireframe、功能啱，就已經安全

用 3 個 Activity 去做：

1. `MainActivity` = Start Page
2. `InsertActivity` = Insert Page
3. `DetailsActivity` = Details Page

原因：

1. 最直接
2. 最容易 debug
3. 同 Mobile Lab 3 Part 1 最似

## 2. 最重要決定

### 2.1 `id` 唔好真係用 `UUID` type

題目話 `id` 係 UUID，但佢亦寫明可以改 data type if necessary。

考試最穩陣做法：

用 `String` 去存 UUID。

```kotlin
UUID.randomUUID().toString()
```

咁樣你唔使寫 Room type converter。

### 2.2 `imagePath` 存 `Uri.toString()`

即係：

```kotlin
selectedImageUri?.toString() ?: ""
```

之後 detail page 再：

```kotlin
imageView.setImageURI(Uri.parse(camera.imagePath))
```

## 3. 考試做題次序

1. 建 project
2. 加 Room dependency
3. 寫 `Camera.kt`
4. 寫 `CameraDao.kt`
5. 寫 `AppDatabase.kt`
6. 畫 `Start Page`
7. 寫 `CameraAdapter.kt`
8. 做 `InsertActivity`
9. 做 `DetailsActivity`
10. 最後 test flow

如果時間唔夠：

1. 功能先
2. 靚樣後

## 4. 必要檔案清單

1. `Camera.kt`
2. `CameraDao.kt`
3. `AppDatabase.kt`
4. `CameraAdapter.kt`
5. `MainActivity.kt`
6. `InsertActivity.kt`
7. `DetailsActivity.kt`
8. `activity_main.xml`
9. `activity_insert.xml`
10. `activity_details.xml`
11. `item_camera.xml`

## 5. 直接可抄骨架

### 5.1 `Camera.kt`

```kotlin
package com.example.mocktest

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "camera_table")
data class Camera(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val descriptions: String,
    val imagePath: String
)
```

### 5.2 `CameraDao.kt`

```kotlin
package com.example.mocktest

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface CameraDao {

    // Read all cameras for the start page list.
    @Query("SELECT * FROM camera_table")
    fun getAllCameras(): List<Camera>

    // Read one camera for the details page.
    @Query("SELECT * FROM camera_table WHERE id = :id LIMIT 1")
    fun getCameraById(id: String): Camera?

    // Insert one camera record.
    @Insert
    fun insertCamera(camera: Camera)
}
```

### 5.3 `AppDatabase.kt`

```kotlin
package com.example.mocktest

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [Camera::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun cameraDao(): CameraDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        // Create or return the single Room database instance.
        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "camera_database"
                )
                    .allowMainThreadQueries()
                    .build()

                INSTANCE = instance
                instance
            }
        }
    }
}
```

`allowMainThreadQueries()` 唔係 production 最好做法，但考試最省時間。

### 5.4 `CameraAdapter.kt`

```kotlin
package com.example.mocktest

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class CameraAdapter(
    private var cameraList: List<Camera>,
    private val onItemClick: (Camera) -> Unit
) : RecyclerView.Adapter<CameraAdapter.CameraViewHolder>() {

    class CameraViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvName: TextView = itemView.findViewById(R.id.tvName)
    }

    // Create one item view for RecyclerView.
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CameraViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_camera, parent, false)
        return CameraViewHolder(view)
    }

    // Put camera data into one item view.
    override fun onBindViewHolder(holder: CameraViewHolder, position: Int) {
        val item = cameraList[position]
        holder.tvName.text = item.name
        holder.itemView.setOnClickListener {
            onItemClick(item)
        }
    }

    // Tell RecyclerView how many rows it should show.
    override fun getItemCount(): Int = cameraList.size

    // Refresh the list after new data is loaded.
    fun updateData(newList: List<Camera>) {
        cameraList = newList
        notifyDataSetChanged()
    }
}
```

### 5.5 `MainActivity.kt`

```kotlin
package com.example.mocktest

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class MainActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: CameraAdapter
    private lateinit var btnInsert: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        db = AppDatabase.getDatabase(this)

        recyclerView = findViewById(R.id.recyclerView)
        btnInsert = findViewById(R.id.btnInsert)

        adapter = CameraAdapter(emptyList()) { camera ->
            val intent = Intent(this, DetailsActivity::class.java)
            intent.putExtra("camera_id", camera.id)
            startActivity(intent)
        }

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        btnInsert.setOnClickListener {
            startActivity(Intent(this, InsertActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    // Load all cameras and refresh the start page list.
    private fun loadData() {
        val allCameras = db.cameraDao().getAllCameras()
        adapter.updateData(allCameras)
    }
}
```

### 5.6 `InsertActivity.kt`

```kotlin
package com.example.mocktest

import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class InsertActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var etName: EditText
    private lateinit var etDescription: EditText
    private lateinit var imageView: ImageView
    private lateinit var btnSelectImage: Button
    private lateinit var btnSave: Button
    private lateinit var btnCancel: Button
    private var selectedImageUri: Uri? = null

    // Open system picker and return one image Uri.
    private val imagePicker =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) {
                selectedImageUri = uri
                imageView.setImageURI(uri)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_insert)

        db = AppDatabase.getDatabase(this)

        etName = findViewById(R.id.etName)
        etDescription = findViewById(R.id.etDescription)
        imageView = findViewById(R.id.imageView)
        btnSelectImage = findViewById(R.id.btnSelectImage)
        btnSave = findViewById(R.id.btnSave)
        btnCancel = findViewById(R.id.btnCancel)

        btnSelectImage.setOnClickListener {
            imagePicker.launch("image/*")
        }

        btnSave.setOnClickListener {
            saveCamera()
        }

        btnCancel.setOnClickListener {
            finish()
        }
    }

    // Validate input and save a new camera into Room.
    private fun saveCamera() {
        val name = etName.text.toString().trim()
        val description = etDescription.text.toString().trim()

        if (name.isEmpty() || description.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }

        val camera = Camera(
            name = name,
            descriptions = description,
            imagePath = selectedImageUri?.toString() ?: ""
        )

        db.cameraDao().insertCamera(camera)
        finish()
    }
}
```

### 5.7 `DetailsActivity.kt`

```kotlin
package com.example.mocktest

import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class DetailsActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var imageView: ImageView
    private lateinit var tvTitle: TextView
    private lateinit var tvDescription: TextView
    private lateinit var btnBack: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_details)

        db = AppDatabase.getDatabase(this)

        imageView = findViewById(R.id.imageView)
        tvTitle = findViewById(R.id.tvTitle)
        tvDescription = findViewById(R.id.tvDescription)
        btnBack = findViewById(R.id.btnBack)

        val cameraId = intent.getStringExtra("camera_id")
        if (cameraId != null) {
            showCamera(cameraId)
        }

        btnBack.setOnClickListener {
            finish()
        }
    }

    // Read one camera and bind its data to the details page.
    private fun showCamera(cameraId: String) {
        val camera = db.cameraDao().getCameraById(cameraId) ?: return

        tvTitle.text = camera.name
        tvDescription.text = camera.descriptions

        if (camera.imagePath.isNotEmpty()) {
            imageView.setImageURI(Uri.parse(camera.imagePath))
        }
    }
}
```

## 6. XML 最少要有咩 id

### 6.1 `activity_main.xml`

1. `btnInsert`
2. `recyclerView`

### 6.2 `item_camera.xml`

1. `tvName`

### 6.3 `activity_insert.xml`

1. `etName`
2. `etDescription`
3. `btnSelectImage`
4. `imageView`
5. `btnSave`
6. `btnCancel`

### 6.4 `activity_details.xml`

1. `imageView`
2. `tvTitle`
3. `tvDescription`
4. `btnBack`

## 7. Manifest / Gradle 記得

### 7.1 Room dependency

如果用 Version Catalog，大方向係：

1. `room-runtime`
2. `room-compiler`
3. `ksp`

如果你已經見過 course material，呢一小節只需要照 `Mobile Lab 4` 的 Room / KSP dependency 寫；UI、RecyclerView、Intent 分別返去睇 Lab 1、Lab 2、Lab 3。

### 7.2 額外 activity

如果 Android Studio 唔幫你自動加，就手動加：

```xml
<activity android:name=".InsertActivity" />
<activity android:name=".DetailsActivity" />
```

## 8. 臨場救命句

### 8.1 如果 RecyclerView 冇顯示

檢查：

1. XML 有冇 `RecyclerView`
2. 有冇 `layoutManager`
3. `adapter` 有冇 set
4. `getItemCount()` 有冇 return size

### 8.2 如果 Room 冇資料

檢查：

1. tableName 有冇打錯
2. DAO query 有冇打錯
3. 有冇真係 call `insert`
4. 返回首頁有冇 reload data

### 8.3 如果圖片冇顯示

檢查：

1. 有冇 `selectedImageUri = uri`
2. 有冇 `imageView.setImageURI(uri)`
3. save 時有冇存 `uri.toString()`
4. details 時有冇 `Uri.parse(...)`

## 9. 最後提醒

題目有 1 分係 method comment。

所以你每個自寫 method 上面加一行英文註解，穩陣攞分。

例如：

```kotlin
// Load all cameras and refresh the list.
private fun loadData() { ... }
```

## 10. 我重新核對後嘅真正計分點

### General

1. project name 符合格式 `Mock_Test_學號` `(0.1)`
2. app 一開去 Start Page `(0.1)`
3. app 有 3 頁：Start / Insert / Details `(0.3)`
4. 每個自寫 method 有 comment `(1)`
5. app compile 到、run 到、唔 crash `(3)`

### Start Page

1. 有 `Insert` button `(0.1)`
2. 有 camera list `(0.1)`
3. list 內容由 `camera_database` 顯示 `(2)`
4. 撳 `Insert` 去 Insert Page `(0.2)`
5. 撳 list item 去 Details Page `(1)`

### Insert Page

1. `Name` input with hint `(0.1)`
2. `Description` input with hint `(0.1)`
3. `Select Image` button `(0.1)`
4. `ImageView` `(0.1)`
5. `Save` button `(0.1)`
6. `Cancel` button `(0.1)`
7. Save 後資料成功插入，並喺 Start Page 見到 `(2)`
8. Save 後返回 Start Page `(0.2)`
9. 撳 `Select Image` 有 image picker，揀完圖會顯示喺 ImageView `(1)`

### Details Page

1. 有 `ImageView` `(0.1)`
2. 有 `Camera Title` `(0.1)`
3. 有 `Description` `(0.1)`
4. 有 `Back` button `(0.1)`
5. 可以顯示 `camera_database` 入面嘅資料 `(1)`
6. 撳 `Back` 返回 Start Page `(0.2)`
