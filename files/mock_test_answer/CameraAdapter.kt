package com.example.mocktestanswer

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

    // Create one row view for the RecyclerView list.
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CameraViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_camera, parent, false)
        return CameraViewHolder(view)
    }

    // Bind one camera name into one list row.
    override fun onBindViewHolder(holder: CameraViewHolder, position: Int) {
        val item = cameraList[position]
        holder.tvName.text = item.name
        holder.itemView.setOnClickListener {
            onItemClick(item)
        }
    }

    // Tell RecyclerView the total number of rows.
    override fun getItemCount(): Int = cameraList.size

    // Refresh the list after data is changed.
    fun updateData(newList: List<Camera>) {
        cameraList = newList
        notifyDataSetChanged()
    }
}
