package com.example.mocktestanswer

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface CameraDao {

    // Read all camera records for the start page.
    @Query("SELECT * FROM camera_table")
    fun getAllCameras(): List<Camera>

    // Read one camera record for the details page.
    @Query("SELECT * FROM camera_table WHERE id = :id LIMIT 1")
    fun getCameraById(id: String): Camera?

    // Insert one new camera record.
    @Insert
    fun insertCamera(camera: Camera)
}
