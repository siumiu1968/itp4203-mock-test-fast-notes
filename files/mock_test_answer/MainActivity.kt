package com.example.mocktestanswer

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MainActivity : AppCompatActivity() {

    private lateinit var db: AppDatabase
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: CameraAdapter
    private lateinit var fabInsert: FloatingActionButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        db = AppDatabase.getDatabase(this)

        recyclerView = findViewById(R.id.recyclerView)
        fabInsert = findViewById(R.id.fabInsert)

        adapter = CameraAdapter(emptyList()) { camera ->
            val intent = Intent(this, DetailsActivity::class.java)
            intent.putExtra("camera_id", camera.id)
            startActivity(intent)
        }

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        fabInsert.setOnClickListener {
            startActivity(Intent(this, InsertActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        loadCameraList()
    }

    // Load all data from Room and refresh the start page.
    private fun loadCameraList() {
        val cameraList = db.cameraDao().getAllCameras()
        adapter.updateData(cameraList)
    }
}
