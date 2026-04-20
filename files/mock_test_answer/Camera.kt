package com.example.mocktestanswer

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
