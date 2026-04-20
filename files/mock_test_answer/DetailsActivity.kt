package com.example.mocktestanswer

import android.net.Uri
import android.os.Bundle
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton

class DetailsActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var imageView: ImageView
    private lateinit var tvTitle: TextView
    private lateinit var tvDescription: TextView
    private lateinit var btnBack: MaterialButton

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
            bindCamera(cameraId)
        }

        btnBack.setOnClickListener {
            finish()
        }
    }

    // Load one camera record and show it on the details page.
    private fun bindCamera(cameraId: String) {
        val camera = db.cameraDao().getCameraById(cameraId) ?: return

        tvTitle.text = camera.name
        tvDescription.text = "Description: ${camera.descriptions}"

        if (camera.imagePath.isNotEmpty()) {
            imageView.setImageURI(Uri.parse(camera.imagePath))
        }
    }
}
