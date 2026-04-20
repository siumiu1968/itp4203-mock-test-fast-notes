package com.example.mocktestanswer

import android.net.Uri
import android.os.Bundle
import android.widget.EditText
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton

class InsertActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var etName: EditText
    private lateinit var etDescription: EditText
    private lateinit var imageView: ImageView
    private lateinit var btnSelectImage: MaterialButton
    private lateinit var btnCancel: MaterialButton
    private lateinit var btnSave: MaterialButton
    private var selectedImageUri: Uri? = null

    // Open the system image picker and preview the selected image.
    private val imagePicker =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) {
                selectedImageUri = uri
                imageView.setImageURI(uri)
                imageView.visibility = ImageView.VISIBLE
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
        btnCancel = findViewById(R.id.btnCancel)
        btnSave = findViewById(R.id.btnSave)

        btnSelectImage.setOnClickListener {
            imagePicker.launch("image/*")
        }

        btnCancel.setOnClickListener {
            finish()
        }

        btnSave.setOnClickListener {
            saveCamera()
        }
    }

    // Save a new camera record and return to the start page.
    private fun saveCamera() {
        val name = etName.text.toString().trim()
        val description = etDescription.text.toString().trim()

        if (name.isEmpty()) {
            Toast.makeText(this, "Please enter camera name", Toast.LENGTH_SHORT).show()
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
